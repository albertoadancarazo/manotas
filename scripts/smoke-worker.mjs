import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
fs.mkdirSync('.test-build',{recursive:true});
fs.writeFileSync('.test-build/smoke-auth.js',ts.transpileModule(fs.readFileSync('src/auth.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
const { hashPassword } = await import('../.test-build/smoke-auth.js');
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:fs.readFileSync('dist/index.js','utf8'),compatibilityDate:'2026-10-20',
 bindings:{JWT_SECRET:'local-smoke-secret-at-least-32-characters',PHOTO_STORAGE:process.env.MANOTAS_PHOTO_STORAGE || ''},d1Databases:['DB'],r2Buckets:['PHOTOS'],serviceBindings:{ASSETS:()=>new Response('demo')}}));
try {
 const db=await mf.getD1Database('DB');
 for(const file of fs.readdirSync('migrations').sort()) for(const sql of fs.readFileSync('migrations/'+file,'utf8').split(';').map(s=>s.trim()).filter(Boolean)) await db.prepare(sql).run();
 const hash=await hashPassword('smoke-test-password');
 await db.prepare("INSERT INTO users(id,name,email,password_hash,role) VALUES ('tech','Tech','smoke@test.local',?,'TECHNICIAN')").bind(hash).run();
 for(const sql of ["INSERT INTO customers(id,name) VALUES ('customer','Customer')","INSERT INTO vehicles(id,uuid,customer_id,plate) VALUES ('vehicle','vehicle-uuid','customer','1234ABC')","INSERT INTO work_orders(id,uuid,vehicle_id,reference,assigned_technician,public_token) VALUES ('order','order-uuid','vehicle','OT-001','tech','public-token')"]) await db.prepare(sql).run();
 assert.equal((await mf.dispatchFetch('https://test.local/api/health')).status,200);
 const login=await mf.dispatchFetch('https://test.local/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'smoke@test.local',password:'smoke-test-password'})});
 assert.equal(login.status,200,await login.clone().text());
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const qr=await mf.dispatchFetch('https://test.local/api/qr/generate',{method:'POST',headers:{Cookie:cookie,'content-type':'application/json'},body:JSON.stringify({workOrderId:'order',role:'customer'})});
 assert.equal(qr.status,200,await qr.clone().text());
 const {url}=await qr.json();assert.equal((await mf.dispatchFetch(url)).status,200);
 const form=new FormData();form.set('file',new File([new Uint8Array([255,216,255,217])],'photo.jpg',{type:'image/jpeg'}));form.set('workOrderId','order');form.set('category','CHAPA');
 const multipart = new Request('https://test.local/api/photos/upload',{method:'POST',headers:{Cookie:cookie},body:form});
 const upload=await mf.dispatchFetch(multipart.url,{method:'POST',headers:Object.fromEntries(multipart.headers),body:new Uint8Array(await multipart.arrayBuffer())});
 assert.equal(upload.status,201,await upload.clone().text());
 const photo=await upload.json(); const image=await mf.dispatchFetch('https://test.local/api/photos/'+photo.id+'/content',{headers:{Cookie:cookie}});
 assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/jpeg');
 console.log('Worker smoke passed: real workerd + D1 migrations + login + QR + '+(process.env.MANOTAS_PHOTO_STORAGE==='d1-test'?'D1 test storage':'R2')+' upload/read.');
} finally {await mf.dispose();}
