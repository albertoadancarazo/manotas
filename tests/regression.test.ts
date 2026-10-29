import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { Script } from 'node:vm';
import worker from '../src/index';
import { createSession, hashPassword, verifyPassword } from '../src/auth';
import type { Env } from '../src/index';

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of fs.readdirSync('migrations').sort()) sqlite.exec(fs.readFileSync('migrations/' + file, 'utf8'));
  function prepare(sql: string) {
    let args: any[] = [];
    return {
      bind(...values: any[]) { args = values; return this; },
      async first() { return sqlite.prepare(sql).get(...args) ?? null; },
      async all() { return { results: sqlite.prepare(sql).all(...args), success: true }; },
      async run() { return sqlite.prepare(sql).run(...args); }
    };
  }
  const DB = { prepare, async batch(statements: any[]) {
    sqlite.exec('BEGIN');
    try { const result = []; for (const s of statements) result.push(await s.run()); sqlite.exec('COMMIT'); return result; }
    catch(e) { sqlite.exec('ROLLBACK'); throw e; }
  }};
  const objects = new Map<string, {data: ArrayBuffer; type: string}>();
  const env = { DB, JWT_SECRET:'regression-secret-32-characters-minimum',
    PHOTOS: {
      async put(key: string, data: ArrayBuffer, options: any) { objects.set(key, {data, type: options.httpMetadata.contentType}); },
      async get(key: string) { const o = objects.get(key); return o ? { body: o.data, httpMetadata: {contentType: o.type} } : null; }
    },
    ASSETS: {async fetch() { return new Response('demo', {status: 200}); }}
  } as unknown as Env;
  sqlite.exec(`INSERT INTO insurers(id,name) VALUES ('ins-a','A'),('ins-b','B');
    INSERT INTO users(id,name,email,role,insurer_id) VALUES ('admin','Admin','admin@test.local','ADMIN',NULL),('tech','Tech','tech@test.local','TECHNICIAN',NULL),('other','Other','other@test.local','TECHNICIAN',NULL),('ins','Ins','ins@test.local','INSURER','ins-a'),('foreign-ins','Foreign','foreign@test.local','INSURER','ins-b');
    INSERT INTO customers(id,name) VALUES ('customer','Customer');
    INSERT INTO vehicles(id,uuid,customer_id,plate,make,model) VALUES ('vehicle','vehicle-uuid','customer','1234ABC','Seat','Leon');
    INSERT INTO work_orders(id,uuid,vehicle_id,reference,assigned_technician,insurer_id,public_token,insurer_token) VALUES ('order','order-uuid','vehicle','OT-001','tech','ins-a','customer-token','insurer-token');`);
  async function cookie(id: string, role: string) { return (await createSession(env,{id,role})).cookie.split(';')[0]; }
  function request(path: string, cookie?: string, method = 'GET', body?: any) {
    const headers = new Headers(); if (cookie) headers.set('Cookie',cookie);
    if (body && !(body instanceof FormData)) headers.set('content-type','application/json');
    return worker.fetch(new Request('https://test.local'+path,{method,headers,body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined}),env);
  }
  return { env, sqlite, cookie, request, objects };
}

test('Argon2id password verification is portable and rejects invalid passwords',async()=>{
  const hash = await hashPassword('correct-password');
  assert.ok(hash.startsWith('$argon2id$'));
  assert.equal(await verifyPassword('correct-password',hash),true);
  assert.equal(await verifyPassword('wrong',hash),false);
  assert.equal(await verifyPassword('correct-password','malformed'),false);
});

test('sessions revoke on logout and disabled users lose access',async()=>{
  const f=fixture(), cookie=await f.cookie('tech','TECHNICIAN');
  assert.equal((await f.request('/api/auth/me',cookie)).status,200);
  assert.equal((await f.request('/api/auth/logout',cookie,'POST')).status,200);
  assert.equal((await f.request('/api/auth/me',cookie)).status,401);
  const fresh=await f.cookie('tech','TECHNICIAN');
  f.sqlite.exec("UPDATE users SET active = 0 WHERE id = 'tech'");
  assert.equal((await f.request('/api/auth/me',fresh)).status,401);
});

test('QR URLs open the correct portal; token rotation invalidates old links',async()=>{
  const f=fixture(), cookie=await f.cookie('tech','TECHNICIAN');
  for(const role of ['customer','insurer','technician']) {
    const response=await f.request('/api/qr/generate',cookie,'POST',{workOrderId:'order',role});
    assert.equal(response.status,200);
    const data=await response.json() as any;
    assert.ok(data.qrDataUrl.startsWith('data:image/svg+xml;base64,'));
    const path=new URL(data.url).pathname;
    assert.ok(path.endsWith(role==='technician'?'order-uuid':data.token));
    assert.equal((await f.request(path,role==='technician'?cookie:undefined)).status,200);
  }
  assert.equal((await f.request('/seguimiento/customer-token')).status,404);
  assert.equal((await f.request('/aseguradora/insurer-token')).status,404);
});

test('technicians cannot read, change, photograph or generate QR for another technician order',async()=>{
  const f=fixture(), cookie=await f.cookie('other','TECHNICIAN');
  for(const [path,method,body] of [
    ['/api/technician/orders/order-uuid','GET',undefined],
    ['/taller/orden/order-uuid','GET',undefined],
    ['/api/technician/orders/order-uuid/events','POST',{newStatus:'PINTURA'}],
    ['/api/technician/orders/order-uuid','PATCH',{estimated_delivery_date:'2026-12-01'}],
    ['/api/qr/generate','POST',{workOrderId:'order',role:'customer'}],
    ['/api/technician/orders/order-uuid/pdf','GET',undefined]
  ] as const) assert.equal((await f.request(path,cookie,method,body)).status,403,path);
  assert.equal((await f.request('/api/technician/orders/order-uuid')).status,401);
});

test('status updates persist an event and current state atomically',async()=>{
  const f=fixture(), cookie=await f.cookie('tech','TECHNICIAN');
  const res=await f.request('/api/technician/orders/order-uuid/events',cookie,'POST',{newStatus:'PENDIENTE_PERITACION'});
  assert.equal(res.status,201);
  assert.equal(f.sqlite.prepare('SELECT current_status FROM work_orders').get()?.current_status,'PENDIENTE_PERITACION');
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM work_order_events').get()?.n,1);
  const tracking=await (await f.request('/api/public/tracking/customer-token')).json() as any;
  assert.equal(tracking.timeline.length,1);
  assert.equal(tracking.timeline[0].note_internal,undefined);
  assert.equal((await f.request('/api/technician/orders/order-uuid/events',cookie,'POST',{newStatus:'invalid'})).status,400);
});

test('private R2 photos obey token audience, order assignment, and token revocation',async()=>{
  const f=fixture(), cookie=await f.cookie('tech','TECHNICIAN');
  const form=new FormData();form.set('file',new File([new Uint8Array([255,216,255,217])],'photo.jpg',{type:'image/jpeg'}));form.set('workOrderId','order');form.set('category','CHAPA');
  const upload=await f.request('/api/photos/upload',cookie,'POST',form); assert.equal(upload.status,201);
  const photo=await upload.json() as any;
  const path='/api/photos/'+photo.id+'/content';
  assert.equal((await f.request(path,cookie)).headers.get('content-type'),'image/jpeg');
  assert.equal((await f.request(path+'?audience=customer&token=customer-token')).status,403);
  assert.equal((await f.request(path,await f.cookie('other','TECHNICIAN'))).status,403);
  f.sqlite.prepare("UPDATE photos SET visibility = 'CLIENT_VISIBLE' WHERE id = ?").run(photo.id);
  assert.equal((await f.request(path+'?audience=customer&token=customer-token')).status,200);
  assert.equal((await f.request(path+'?audience=insurer&token=insurer-token')).status,403);
  const signed=await (await f.request('/api/photos/'+photo.id+'/signed-url',cookie)).json() as any;
  assert.equal((await f.request(new URL(signed.signedUrl).pathname+new URL(signed.signedUrl).search,cookie)).status,200);
  f.sqlite.exec("UPDATE work_orders SET public_token = 'rotated'");
  assert.equal((await f.request(path+'?audience=customer&token=customer-token')).status,403);
});

test('insurer account mapping limits orders and PDF reports to its organization',async()=>{
  const f=fixture(), assigned=await f.cookie('ins','INSURER'), foreign=await f.cookie('foreign-ins','INSURER');
  const orders=await (await f.request('/api/insurer/orders',assigned)).json() as any[];
  assert.equal(orders.length,1);assert.equal(orders[0].public_token,undefined);
  const detail=await f.request('/api/insurer/orders/order-uuid',assigned);
  assert.equal(detail.status,200);assert.equal((await detail.json() as any).order.public_token,undefined);
  assert.equal((await f.request('/api/insurer/orders/order-uuid',foreign)).status,404);
  assert.equal((await f.request('/api/insurer/orders/order-uuid/pdf',foreign)).status,403);
  const report=await f.request('/aseguradora/insurer-token/pdf');
  assert.equal(report.status,200);assert.equal(report.headers.get('content-type'),'application/pdf');
  assert.ok((await report.text()).startsWith('%PDF-'));
});

test('public HTML escapes stored notes; malformed JSON and foreign origins are rejected',async()=>{
  const f=fixture(), cookie=await f.cookie('tech','TECHNICIAN');
  await f.request('/api/technician/orders/order-uuid/events',cookie,'POST',{newStatus:'CHAPA',notePublic:'<img src=x onerror=alert(1)>'});
  const html=await (await f.request('/seguimiento/customer-token')).text();
  assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img src=x'));
  const malformed=new Request('https://test.local/api/auth/login',{method:'POST',body:'{'});
  assert.equal((await worker.fetch(malformed,f.env)).status,400);
  const cross=new Request('https://test.local/api/auth/logout',{method:'POST',headers:{Origin:'https://foreign.local',Cookie:cookie}});
  assert.equal((await worker.fetch(cross,f.env)).status,403);
});

test('login, admin user creation and dashboard scripts work with real SQL results',async()=>{
  const f=fixture(), hash=await hashPassword('login-password');
  f.sqlite.prepare("UPDATE users SET password_hash = ? WHERE id = 'admin'").run(hash);
  const login=await f.request('/api/auth/login',undefined,'POST',{email:'admin@test.local',password:'login-password'});
  assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie')!.split(';')[0];
  const created=await f.request('/api/admin/users',cookie,'POST',{name:'Insurer user',email:'new@test.local',password:'new-password',role:'INSURER',insurerId:'ins-a'});
  assert.equal(created.status,201);
  assert.equal(f.sqlite.prepare("SELECT insurer_id FROM users WHERE email = 'new@test.local'").get()?.insurer_id,'ins-a');
  for(const path of ['/admin/dashboard','/admin/dashboard/orders','/admin/dashboard/users','/taller/orden/order-uuid']) {
    const html=await (await f.request(path,cookie)).text();
    for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) assert.doesNotThrow(()=>new Script(script[1]),path);
  }
  assert.ok(Array.isArray(await (await f.request('/api/admin/orders',cookie)).json()));
});

test('summary PDF handles historical events and upload rejects mismatched events and invalid visibility',async()=>{
  const f=fixture(), cookie=await f.cookie('tech','TECHNICIAN');
  await f.request('/api/technician/orders/order-uuid/events',cookie,'POST',{newStatus:'CHAPA',notePublic:'Reparacion en curso'});
  const pdf=await f.request('/api/technician/orders/order-uuid/pdf',cookie);
  assert.equal(pdf.status,200);assert.ok((await pdf.text()).startsWith('%PDF-'));
  for(const [field,value] of [['eventId','wrong-event'],['visibility','PUBLIC']]) {
    const form=new FormData();form.set('file',new File(['image'],'photo.jpg',{type:'image/jpeg'}));form.set('workOrderId','order');form.set('category','CHAPA');form.set(field,value);
    assert.equal((await f.request('/api/photos/upload',cookie,'POST',form)).status,400);
  }
});

test('staging D1 photo storage preserves bytes and applies the explicit 2 MB limit',async()=>{
  const f=fixture();f.env.PHOTO_STORAGE='d1-test';
  const cookie=await f.cookie('tech','TECHNICIAN');
  const bytes=new Uint8Array(70000).map((_,i)=>i%256);
  const form=new FormData();form.set('file',new File([bytes],'photo.jpg',{type:'image/jpeg'}));form.set('workOrderId','order');form.set('category','CHAPA');
  const uploaded=await f.request('/api/photos/upload',cookie,'POST',form);assert.equal(uploaded.status,201);
  const photo=await uploaded.json() as any;
  const response=await f.request('/api/photos/'+photo.id+'/content',cookie);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);
  const large=new FormData();large.set('file',new File([new Uint8Array(2*1024*1024+1)],'large.jpg',{type:'image/jpeg'}));large.set('workOrderId','order');large.set('category','CHAPA');
  assert.equal((await f.request('/api/photos/upload',cookie,'POST',large)).status,413);
});
