import { verifySession, hashPassword } from "../auth";
import { queries } from "../db/queries";
import { json } from "../utils/response";
import type { Env } from "../index";
import { generateUUID } from "../utils/crypto";

const adminDashboardTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - Talleres Manotas</title>
  <style>
    :root { --grafito: #1a1a1a; --marfil: #fdf6e3; --naranja: #ff6b00; --blanco: #ffffff; --gris-claro: #e8e8e8; --gris-medio: #999; --rojo: #dc2626; --verde: #16a34a; --azul: #2563eb; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Oxanium', system-ui, sans-serif; background: var(--marfil); color: var(--grafito); line-height: 1.5; min-height: 100vh; }
    .header { background: var(--grafito); color: var(--blanco); padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; font-stretch: condensed; }
    .nav { display: flex; gap: 8px; }
    .nav a { color: var(--gris-claro); text-decoration: none; padding: 8px 16px; border-radius: 4px; font-size: 14px; font-weight: 500; transition: all 0.2s; }
    .nav a:hover, .nav a.active { background: var(--naranja); color: var(--blanco); }
    .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat-card { background: var(--blanco); border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-label { font-size: 12px; font-weight: 600; color: var(--gris-medio); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .stat-value { font-size: 32px; font-weight: 700; color: var(--grafito); }
    .stat-value.naranja { color: var(--naranja); }
    .stat-value.verde { color: var(--verde); }
    .stat-value.azul { color: var(--azul); }
    .card { background: var(--blanco); border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 24px; }
    .card-header { padding: 16px 20px; border-bottom: 1px solid var(--gris-claro); display: flex; justify-content: space-between; align-items: center; }
    .card-title { font-size: 16px; font-weight: 600; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; min-height: 40px; transition: background 0.15s; }
    .btn-primary { background: var(--naranja); color: var(--blanco); }
    .btn-primary:hover { background: #e85d00; }
    .btn-secondary { background: var(--blanco); color: var(--grafito); border: 1px solid var(--gris-claro); }
    .btn-secondary:hover { background: var(--gris-claro); }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--gris-claro); font-size: 14px; }
    th { font-weight: 600; color: var(--gris-medio); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; background: #fafafa; }
    tr:hover td { background: #fdfdfd; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
    .badge-recibido { background: var(--azul); color: var(--blanco); }
    .badge-peritacion { background: var(--naranja); color: var(--blanco); }
    .badge-autorizado { background: var(--verde); color: var(--blanco); }
    .badge-piezas { background: #f59e0b; color: var(--blanco); }
    .badge-trabajo { background: #8b5cf6; color: var(--blanco); }
    .badge-listos { background: var(--verde); color: var(--blanco); }
    .badge-entregado { background: var(--gris-medio); color: var(--blanco); }
    .badge-bloqueado { background: var(--rojo); color: var(--blanco); }
    .role-admin { background: var(--azul); color: var(--blanco); }
    .role-tech { background: var(--naranja); color: var(--blanco); }
    .role-insurer { background: var(--verde); color: var(--blanco); }
    .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; font-weight: 500; }
    .form-group input, .form-group select { padding: 10px 12px; border: 1px solid var(--gris-claro); border-radius: 6px; font-size: 14px; background: var(--blanco); }
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; }
    .modal.show { display: flex; }
    .modal-content { background: var(--blanco); border-radius: 8px; padding: 24px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-title { font-size: 18px; font-weight: 600; }
    .modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gris-medio); line-height: 1; }
    @media (max-width: 768px) { .header { flex-direction: column; gap: 16px; } .nav { width: 100%; justify-content: center; } }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Oxanium:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <header class="header">
    <h1>Talleres Manotas - Dashboard</h1>
    <nav class="nav">
      <a href="/admin/dashboard" class="active">Dashboard</a>
      <a href="/admin/dashboard/orders">Órdenes</a>
      <a href="/admin/dashboard/users">Usuarios</a>
    </nav>
  </header>
  <div class="container">
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Órdenes</div><div class="stat-value" id="stat-total">—</div></div>
      <div class="stat-card"><div class="stat-label">Órdenes Activas</div><div class="stat-value naranja" id="stat-active">—</div></div>
      <div class="stat-card"><div class="stat-label">Usuarios</div><div class="stat-value azul" id="stat-users">—</div></div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Órdenes por Estado</div>
      </div>
      <table id="statusTable"><thead><tr><th>Estado</th><th>Cantidad</th></tr></thead><tbody></tbody></table>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Órdenes Recientes</span>
        <button class="btn btn-primary" onclick="openCreateOrderModal()">+ Nuevo Usuario</button>
      </div>
      <table id="ordersTable"><thead><tr><th>Referencia</th><th>Vehículo</th><th>Estado</th><th>Entrada</th><th>Entrega Est.</th><th>Técnico</th></tr></thead><tbody></tbody></table>
    </div>
  </div>
  <div class="modal" id="userModal"><div class="modal-content"><div class="modal-header"><span class="modal-title">Nuevo Usuario</span><button class="modal-close" onclick="closeModal('userModal')">&times;</button></div><form id="userForm" class="form-row"><div class="form-group"><label>Nombre</label><input type="text" name="name" required></div><div class="form-group"><label>Email</label><input type="email" name="email" required></div><div class="form-group"><label>Contraseña</label><input type="password" name="password" required minlength="8"></div><div class="form-group"><label>Rol</label><label>ID de aseguradora (solo rol aseguradora)</label><input type="text" name="insurerId"><select name="role" required><option value="TECHNICIAN">Técnico</option><option value="ADMIN">Admin</option><option value="INSURER">Aseguradora</option></select></div></form><div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;"><button type="button" class="btn btn-secondary" onclick="closeModal('userModal')">Cancelar</button><button type="submit" form="userForm" class="btn btn-primary">Crear</button></div></div></div>
  <script>function esc(value) { const span = document.createElement('span'); span.textContent = String(value ?? ''); return span.innerHTML.replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
    async function fetchData(url) { const res = await fetch(url, { credentials: 'include' }); if (!res.ok) throw new Error('Error: ' + res.status); return res.json(); }
    async function loadDashboard() {
      try {
        const [stats, statuses, orders] = await Promise.all([
          fetchData('/api/admin/stats'),
          fetchData('/api/admin/orders?status=all'),
          fetchData('/api/admin/orders')
        ]);
        document.getElementById('stat-total').textContent = stats.totalOrders;
        document.getElementById('stat-active').textContent = stats.activeOrders;
        document.getElementById('stat-users').textContent = stats.totalUsers;
        const tbody = document.querySelector('#statusTable tbody');
        tbody.innerHTML = stats.byStatus.map(s => \`<tr><td><span class="badge badge-\${esc(s.current_status.toLowerCase().replace('_', '-'))}">\${esc(s.current_status)}</span></td><td>\${s.count}</td></tr>\`).join('');
        const otbody = document.querySelector('#ordersTable tbody');
        otbody.innerHTML = orders.slice(0, 10).map(o => \`<tr><td>\${esc(o.reference)}</td><td>\${esc(o.plate)} \${esc(o.make)} \${esc(o.model)}</td><td><span class="badge badge-\${esc(o.current_status.toLowerCase().replace('_', '-'))}">\${esc(o.current_status)}</span></td><td>\${esc(o.entry_date)}</td><td>\${o.estimated_delivery_date || '—'}</td><td>\${o.assigned_technician || '—'}</td></tr>\`).join('');
      } catch (e) { console.error(e); }
    }
    function openCreateOrderModal() { document.getElementById('userModal').classList.add('show'); }
    function closeModal(id) { document.getElementById(id).classList.remove('show'); }
    document.getElementById('userForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(data) });
        if (!res.ok) throw new Error('Error creando usuario');
        closeModal('userModal');
        form.reset();
        loadDashboard();
      } catch (err) { alert('Error: ' + err.message); }
    });
    document.querySelector('.modal-close').onclick = () => closeModal('userModal');
    document.getElementById('userModal').onclick = (e) => { if (e.target === e.currentTarget) closeModal('userModal'); };
    loadDashboard();
  </script>
</body>
</html>`;

const ordersTemplate = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Órdenes - Dashboard</title><style>:root{--grafito:#1a1a1a;--marfil:#fdf6e3;--naranja:#ff6b00;--blanco:#ffffff;--gris-claro:#e8e8e8;--gris-medio:#999;--rojo:#dc2626;--verde:#16a34a;--azul:#2563eb;}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Oxanium',system-ui,sans-serif;background:var(--marfil);color:var(--grafito);line-height:1.5;min-height:100vh}.header{background:var(--grafito);color:var(--blanco);padding:16px 24px;display:flex;justify-content:space-between;align-items:center}.header h1{font-size:20px;font-weight:600;letter-spacing:-0.02em;font-stretch:condensed}.nav{display:flex;gap:8px}.nav a{color:var(--gris-claro);text-decoration:none;padding:8px 16px;border-radius:4px;font-size:14px;font-weight:500;transition:all 0.2s}.nav a:hover,.nav a.active{background:var(--naranja);color:var(--blanco)}.container{max-width:1200px;margin:0 auto;padding:24px}.card{background:var(--blanco);border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;margin-bottom:24px}.card-header{padding:16px 20px;border-bottom:1px solid var(--gris-claro);display:flex;justify-content:space-between;align-items:center}.card-title{font-size:16px;font-weight:600}.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;min-height:40px;transition:background 0.15s}.btn-primary{background:var(--naranja);color:var(--blanco)}.btn-primary:hover{background:#e85d00}.btn-secondary{background:var(--blanco);color:var(--grafito);border:1px solid var(--gris-claro)}.btn-secondary:hover{background:var(--gris-claro)}table{width:100%;border-collapse:collapse}th,td{padding:12px 16px;text-align:left;border-bottom:1px solid var(--gris-claro);font-size:14px}th{font-weight:600;color:var(--gris-medio);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;background:#fafafa}tr:hover td{background:#fdfdfd}.badge{display:inline-block;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px}.badge-recibido{background:var(--azul);color:var(--blanco)}.badge-peritacion{background:var(--naranja);color:var(--blanco)}.badge-autorizado{background:var(--verde);color:var(--blanco)}.badge-piezas{background:#f59e0b;color:var(--blanco)}.badge-trabajo{background:#8b5cf6;color:var(--blanco)}.badge-listos{background:var(--verde);color:var(--blanco)}.badge-entregado{background:var(--gris-medio);color:var(--blanco)}.badge-bloqueado{background:var(--rojo);color:var(--blanco)}.filter-row{display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap}.filter-group{display:flex;flex-direction:column;gap:4px}.filter-group label{font-size:12px;font-weight:500;color:var(--gris-medio)}.filter-group select,.filter-group input{padding:8px 12px;border:1px solid var(--gris-claro);border-radius:6px;font-size:14px;background:var(--blanco)}@media(max-width:768px){.header{flex-direction:column;gap:16px}.nav{width:100%;justify-content:center}table{font-size:12px}th,td{padding:8px}}</style><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Oxanium:wght@400;500;600;700&display=swap" rel="stylesheet"></head><body><header class="header"><h1>Talleres Manotas - Órdenes</h1><nav class="nav"><a href="/admin/dashboard">Dashboard</a><a href="/admin/dashboard/orders" class="active">Órdenes</a><a href="/admin/dashboard/users">Usuarios</a></nav></header><div class="container"><div class="card"><div class="card-header"><span class="card-title">Filtros</span></div><div class="card-body"><div class="filter-row"><div class="filter-group"><label>Estado</label><select id="filterStatus"><option value="">Todos</option><option value="RECEPCIONADO">Recepcionado</option><option value="PENDIENTE_PERITACION">Pte. Peritación</option><option value="PERITACION_REALIZADA">Peritación Realizada</option><option value="PENDIENTE_AUTORIZACION">Pte. Autorización</option><option value="AUTORIZADO">Autorizado</option><option value="PENDIENTE_PIEZAS">Pte. Piezas</option><option value="EN_DESMONTAJE">Desmontaje</option><option value="CHAPA">Chapa</option><option value="PREPARACION_PINTURA">Prep. Pintura</option><option value="PINTURA">Pintura</option><option value="MONTAJE">Montaje</option><option value="MECANICA">Mecánica</option><option value="CONTROL_CALIDAD">Control Calidad</option><option value="LIMPIEZA">Limpieza</option><option value="LISTO_PARA_ENTREGA">Listo Entrega</option><option value="ENTREGADO">Entregado</option></select></div><div class="filter-group"><label>Técnico</label><select id="filterTech"><option value="">Todos</option></select></div><div class="filter-group"><label>Buscar</label><input type="text" id="filterSearch" placeholder="Referencia, matrícula, cliente..."></div></div></div></div><div class="card"><div class="card-header"><span class="card-title">Listado de Órdenes</span></div><table><thead><tr><th>Referencia</th><th>Vehículo</th><th>Estado</th><th>Entrada</th><th>Entrega Est.</th><th>Técnico</th></tr></thead><tbody id="ordersBody"></tbody></table></div></div><script>function esc(value) { const span = document.createElement('span'); span.textContent = String(value ?? ''); return span.innerHTML.replaceAll('"','&quot;').replaceAll("'",'&#39;'); }async function fetchData(url){const res=await fetch(url,{credentials:'include'});if(!res.ok)throw new Error('Error: '+res.status);return res.json();}let allOrders=[];async function loadOrders(){try{const [orders,techs]=await Promise.all([fetchData('/api/admin/orders'),fetchData('/api/admin/users')]);allOrders=orders;const techSelect=document.getElementById('filterTech');techSelect.innerHTML='<option value="">Todos</option>'+techs.results.filter(u=>u.role==='TECHNICIAN').map(t=>\`<option value="\${t.id}">\${t.name}</option>\`).join('');renderOrders();}catch(e){console.error(e);}}function renderOrders(){let filtered=allOrders;const status=document.getElementById('filterStatus').value;const tech=document.getElementById('filterTech').value;const search=document.getElementById('filterSearch').value.toLowerCase();if(status)filtered=filtered.filter(o=>o.current_status===status);if(tech)filtered=filtered.filter(o=>o.assigned_technician===tech);if(search)filtered=filtered.filter(o=>o.reference.toLowerCase().includes(search)||o.plate.toLowerCase().includes(search)||o.make.toLowerCase().includes(search)||o.model.toLowerCase().includes(search));const tbody=document.getElementById('ordersBody');tbody.innerHTML=filtered.map(o=>\`<tr><td>\${esc(o.reference)}</td><td>\${esc(o.plate)} \${esc(o.make)} \${esc(o.model)}</td><td><span class="badge badge-\${o.current_status.toLowerCase().replace('_','-')}">\${esc(o.current_status)}</span></td><td>\${esc(o.entry_date)}</td><td>\${o.estimated_delivery_date||'—'}</td><td>\${o.assigned_technician||'—'}</td></tr>\`).join('');}document.getElementById('filterStatus').addEventListener('change',renderOrders);document.getElementById('filterTech').addEventListener('change',renderOrders);document.getElementById('filterSearch').addEventListener('input',renderOrders);loadOrders();</script></body></html>`;

const usersTemplate = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Usuarios - Dashboard</title><style>:root{--grafito:#1a1a1a;--marfil:#fdf6e3;--naranja:#ff6b00;--blanco:#ffffff;--gris-claro:#e8e8e8;--gris-medio:#999;--rojo:#dc2626;--verde:#16a34a;--azul:#2563eb;}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Oxanium',system-ui,sans-serif;background:var(--marfil);color:var(--grafito);line-height:1.5;min-height:100vh}.header{background:var(--grafito);color:var(--blanco);padding:16px 24px;display:flex;justify-content:space-between;align-items:center}.header h1{font-size:20px;font-weight:600;letter-spacing:-0.02em;font-stretch:condensed}.nav{display:flex;gap:8px}.nav a{color:var(--gris-claro);text-decoration:none;padding:8px 16px;border-radius:4px;font-size:14px;font-weight:500;transition:all 0.2s}.nav a:hover,.nav a.active{background:var(--naranja);color:var(--blanco)}.container{max-width:1200px;margin:0 auto;padding:24px}.card{background:var(--blanco);border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;margin-bottom:24px}.card-header{padding:16px 20px;border-bottom:1px solid var(--gris-claro);display:flex;justify-content:space-between;align-items:center}.card-title{font-size:16px;font-weight:600}.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;min-height:40px;transition:background 0.15s}.btn-primary{background:var(--naranja);color:var(--blanco)}.btn-primary:hover{background:#e85d00}.btn-secondary{background:var(--blanco);color:var(--grafito);border:1px solid var(--gris-claro)}.btn-secondary:hover{background:var(--gris-claro)}table{width:100%;border-collapse:collapse}th,td{padding:12px 16px;text-align:left;border-bottom:1px solid var(--gris-claro);font-size:14px}th{font-weight:600;color:var(--gris-medio);font-size:12px;text-transform:uppercase;letter-spacing:0.5px;background:#fafafa}tr:hover td{background:#fdfdfd}.badge{display:inline-block;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px}.role-admin{background:var(--azul);color:var(--blanco)}.role-tech{background:var(--naranja);color:var(--blanco)}.role-insurer{background:var(--verde);color:var(--blanco)}.form-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:16px}.form-group{display:flex;flex-direction:column;gap:6px}.form-group label{font-size:13px;font-weight:500}.form-group input,.form-group select{padding:10px 12px;border:1px solid var(--gris-claro);border-radius:6px;font-size:14px;background:var(--blanco)}.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center}.modal.show{display:flex}.modal-content{background:var(--blanco);border-radius:8px;padding:24px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto}.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.modal-title{font-size:18px;font-weight:600}.modal-close{background:none;border:none;font-size:24px;cursor:pointer;color:var(--gris-medio);line-height:1}@media(max-width:768px){.header{flex-direction:column;gap:16px}.nav{width:100%;justify-content:center}}</style><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Oxanium:wght@400;500;600;700&display=swap" rel="stylesheet"></head><body><header class="header"><h1>Talleres Manotas - Usuarios</h1><nav class="nav"><a href="/admin/dashboard">Dashboard</a><a href="/admin/dashboard/orders">Órdenes</a><a href="/admin/dashboard/users" class="active">Usuarios</a></nav></header><div class="container"><div class="card"><div class="card-header"><span class="card-title">Usuarios del Sistema</span><button class="btn btn-primary" onclick="openUserModal()">+ Nuevo Usuario</button></div><table><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Creado</th></tr></thead><tbody id="usersBody"></tbody></table></div></div><div class="modal" id="userModal"><div class="modal-content"><div class="modal-header"><span class="modal-title">Nuevo Usuario</span><button class="modal-close" onclick="closeModal('userModal')">&times;</button></div><form id="userForm" class="form-row"><div class="form-group"><label>Nombre</label><input type="text" name="name" required></div><div class="form-group"><label>Email</label><input type="email" name="email" required></div><div class="form-group"><label>Contraseña</label><input type="password" name="password" required minlength="8"></div><div class="form-group"><label>Rol</label><label>ID de aseguradora (solo rol aseguradora)</label><input type="text" name="insurerId"><select name="role" required><option value="TECHNICIAN">Técnico</option><option value="ADMIN">Admin</option><option value="INSURER">Aseguradora</option></select></div></form><div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;"><button type="button" class="btn btn-secondary" onclick="closeModal('userModal')">Cancelar</button><button type="submit" form="userForm" class="btn btn-primary">Crear</button></div></div></div><script>function esc(value) { const span = document.createElement('span'); span.textContent = String(value ?? ''); return span.innerHTML.replaceAll('"','&quot;').replaceAll("'",'&#39;'); }async function fetchData(url){const res=await fetch(url,{credentials:'include'});if(!res.ok)throw new Error('Error: '+res.status);return res.json();}async function loadUsers(){try{const users=await fetchData('/api/admin/users');const tbody=document.getElementById('usersBody');tbody.innerHTML=users.map(u=>\`<tr><td>\${esc(u.name)}</td><td>\${esc(u.email)}</td><td><span class="badge role-\${esc(u.role.toLowerCase())}">\${esc(u.role)}</span></td><td>\${u.active?'Activo':'Inactivo'}</td><td>\${new Date(u.created_at).toLocaleDateString('es-ES')}</td></tr>\`).join('');}catch(e){console.error(e);}}function openUserModal(){document.getElementById('userModal').classList.add('show');}function closeModal(id){document.getElementById(id).classList.remove('show');}document.getElementById('userForm').addEventListener('submit',async(e)=>{e.preventDefault();const form=e.target;const data=Object.fromEntries(new FormData(form).entries());try{const res=await fetch('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify(data)});if(!res.ok)throw new Error('Error creando usuario');closeModal('userModal');form.reset();loadUsers();}catch(err){alert('Error: '+err.message);}});document.querySelector('.modal-close').onclick=()=>closeModal('userModal');document.getElementById('userModal').onclick=(e)=>{if(e.target===e.currentTarget)closeModal('userModal');};loadUsers();</script></body></html>`;

async function requireAdminAuth(request: Request, env: Env) {
  const session = await verifySession(env, request);
  if (!session) return json({ error: 'unauthorized' }, 401);
  if (session.role !== 'ADMIN') return json({ error: 'forbidden' }, 403);
  return session;
}

function renderTemplate(template: string): string {
  return template;
}

export const adminDashboardRoutes = {
  async dashboard(request: Request, env: Env) {
    const auth = await requireAdminAuth(request, env);
    if (auth instanceof Response) return auth;
    return new Response(renderTemplate(adminDashboardTemplate), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
    });
  },

  async orders(request: Request, env: Env) {
    const auth = await requireAdminAuth(request, env);
    if (auth instanceof Response) return auth;
    return new Response(renderTemplate(ordersTemplate), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
    });
  },

  async users(request: Request, env: Env) {
    const auth = await requireAdminAuth(request, env);
    if (auth instanceof Response) return auth;
    return new Response(renderTemplate(usersTemplate), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
    });
  },

  async createUser(request: Request, env: Env) {
    const auth = await requireAdminAuth(request, env);
    if (auth instanceof Response) return auth;
    
    const body = await request.json() as { name: string; email: string; password: string; role: 'TECHNICIAN' | 'ADMIN' | 'INSURER'; insurerId?: string };
    const { name, email, password, role } = body;
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.includes('@') || typeof password !== 'string' || password.length < 8 || password.length > 1024 || !['ADMIN','TECHNICIAN','INSURER'].includes(role)) return json({ error: 'invalid_input' }, 400);
    
    if (role === 'INSURER') {
      if (!body.insurerId || !await env.DB.prepare('SELECT id FROM insurers WHERE id = ? AND active = 1').bind(body.insurerId).first()) return json({ error: 'valid_insurer_id_required' },400);
    }
    const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existing) return json({ error: 'email_exists' }, 409);
    
    const passwordHash = await hashPassword(password);
    const userId = generateUUID();
    
    await env.DB.prepare("INSERT INTO users (id, name, email, password_hash, role, active, insurer_id) VALUES (?, ?, ?, ?, ?, 1, ?)")
      .bind(userId, name, email, passwordHash, role, role === 'INSURER' ? body.insurerId : null).run();
    
    return json({ id: userId, name, email, role, active: 1 }, 201);
  }
};