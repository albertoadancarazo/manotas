import { orderAccess, escapeHtml } from '../security';
import { verifySession } from "../auth";
import { queries } from "../db/queries";
import { json } from "../utils/response";
import type { Env } from "../index";

const mobileTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#ff6b00">
  <title>{{ORDER_REFERENCE}} - Talleres Manotas</title>
  <style>
    :root {
      --grafito: #1a1a1a;
      --marfil: #fdf6e3;
      --naranja: #ff6b00;
      --naranja-hover: #e85d00;
      --blanco: #ffffff;
      --gris-claro: #e8e8e8;
      --gris-medio: #999;
      --rojo: #dc2626;
      --verde: #16a34a;
      --azul: #2563eb;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--marfil);
      color: var(--grafito);
      line-height: 1.5;
      min-height: 100vh;
    }
    .header {
      background: var(--grafito);
      color: var(--blanco);
      padding: 16px;
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header h1 { font-size: 18px; font-weight: 600; letter-spacing: 0.5px; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .badge-recibido { background: var(--azul); color: var(--blanco); }
    .badge-peritacion { background: var(--naranja); color: var(--blanco); }
    .badge-autorizado { background: var(--verde); color: var(--blanco); }
    .badge-piezas { background: #f59e0b; color: var(--blanco); }
    .badge-trabajo { background: #8b5cf6; color: var(--blanco); }
    .badge-listos { background: var(--verde); color: var(--blanco); }
    .badge-entregado { background: var(--gris-medio); color: var(--blanco); }
    .badge-bloqueado { background: var(--rojo); color: var(--blanco); }
    .container { max-width: 100%; padding: 16px; }
    .card {
      background: var(--blanco);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 16px;
      overflow: hidden;
    }
    .card-header { padding: 16px; border-bottom: 1px solid var(--gris-claro); }
    .card-title { font-size: 14px; font-weight: 600; color: var(--gris-medio); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .card-value { font-size: 16px; color: var(--grafito); }
    .card-body { padding: 16px; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 24px;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      touch-action: manipulation;
      min-height: 48px;
      min-width: 48px;
      transition: background 0.15s, transform 0.05s;
    }
    .btn:active { transform: scale(0.98); }
    .btn-primary { background: var(--naranja); color: var(--blanco); width: 100%; }
    .btn-primary:hover { background: var(--naranja-hover); }
    .btn-primary:disabled { background: var(--gris-medio); cursor: not-allowed; }
    .btn-secondary { background: var(--blanco); color: var(--grafito); border: 1px solid var(--gris-claro); }
    .btn-secondary:hover { background: var(--gris-claro); }
    .btn-danger { background: var(--rojo); color: var(--blanco); }
    .status-flow { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .status-step {
      flex: 1;
      min-width: 120px;
      padding: 10px 12px;
      background: var(--gris-claro);
      border-radius: 6px;
      font-size: 12px;
      text-align: center;
      position: relative;
    }
    .status-step.current { background: var(--naranja); color: var(--blanco); font-weight: 600; }
    .status-step.completed { background: var(--verde); color: var(--blanco); }
    .status-step::after {
      content: '';
      position: absolute;
      top: 50%;
      right: -4px;
      width: 8px;
      height: 8px;
      background: var(--gris-claro);
      transform: translateY(-50%) rotate(45deg);
      z-index: -1;
    }
    .status-step:last-child::after { display: none; }
    .status-step.current::after { background: var(--naranja); }
    .status-step.completed::after { background: var(--verde); }
    .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; }
    .photo-item { position: relative; aspect-ratio: 4/3; border-radius: 6px; overflow: hidden; background: var(--gris-claro); }
    .photo-item img { width: 100%; height: 100%; object-fit: cover; }
    .photo-category { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: var(--blanco); font-size: 10px; padding: 2px 6px; text-align: center; }
    .timeline { display: flex; flex-direction: column; gap: 12px; }
    .timeline-item { display: flex; gap: 12px; }
    .timeline-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--naranja); margin-top: 4px; flex-shrink: 0; }
    .timeline-dot.completed { background: var(--verde); }
    .timeline-line { position: absolute; left: 5px; top: 24px; bottom: 0; width: 2px; background: var(--gris-claro); }
    .timeline-content { flex: 1; padding-top: 4px; }
    .timeline-time { font-size: 12px; color: var(--gris-medio); }
    .timeline-status { font-weight: 600; margin-top: 2px; }
    .timeline-note { font-size: 13px; color: var(--grafito); margin-top: 4px; white-space: pre-wrap; }
    .incidencia-form { display: flex; flex-direction: column; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 13px; font-weight: 500; }
    .form-group input, .form-group textarea, .form-group select {
      padding: 12px;
      border: 1px solid var(--gris-claro);
      border-radius: 6px;
      font-size: 16px;
      background: var(--blanco);
    }
    .form-group textarea { min-height: 80px; resize: vertical; }
    .hidden { display: none !important; }
    .loading { display: flex; align-items: center; justify-content: center; padding: 40px; color: var(--gris-medio); }
    .spinner { width: 24px; height: 24px; border: 2px solid var(--gris-claro); border-top-color: var(--naranja); border-radius: 50%; animation: spin 1s linear infinite; margin-right: 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(100px); background: var(--grafito); color: var(--blanco); padding: 12px 24px; border-radius: 6px; opacity: 0; transition: all 0.3s; z-index: 1000; }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    .toast.success { background: var(--verde); }
    .toast.error { background: var(--rojo); }
    @media (max-width: 480px) {
      .header h1 { font-size: 16px; }
      .btn { padding: 16px 24px; font-size: 17px; }
    }
  </style>
</head>
<body>
  <header class="header">
    <h1>{{VEHICLE_PLATE}} {{VEHICLE_MAKE}} {{VEHICLE_MODEL}}</h1>
    <span class="badge badge-{{STATUS_CLASS}}">{{STATUS_LABEL}}</span>
  </header>
  
  <div class="container">
    <div class="card">
      <div class="card-header">
        <div class="card-title">Orden de Trabajo</div>
        <div class="card-value">{{ORDER_REFERENCE}}</div>
      </div>
      <div class="card-body">
        <div class="card-title">Estado Actual</div>
        <div class="card-value">{{STATUS_LABEL}}</div>
        <div class="card-title" style="margin-top: 12px;">Entrada</div>
        <div class="card-value">{{ENTRY_DATE}}</div>
        <div class="card-title" style="margin-top: 12px;">Entrega Estimada</div>
        <div class="card-value">{{ESTIMATED_DELIVERY}}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Avanzar Estado</div>
      </div>
      <div class="card-body">
        <div class="status-flow" id="statusFlow"></div>
        <button class="btn btn-primary" id="nextStateBtn" disabled>
          Siguiente estado: <span id="nextStateLabel">—</span>
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Subir Fotos</div>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label>Categoría</label>
          <select id="photoCategory">
            <option value="damage">Daños</option>
            <option value="parts">Piezas</option>
            <option value="process">Proceso</option>
            <option value="final">Final</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div class="form-group">
          <label>Visibilidad</label>
          <select id="photoVisibility">
            <option value="INTERNAL_ONLY">Solo interno</option>
            <option value="CLIENT_VISIBLE">Visible al cliente</option>
            <option value="INSURER_VISIBLE">Visible a aseguradora</option>
            <option value="CLIENT_AND_INSURER">Cliente y aseguradora</option>
          </select>
        </div>
        <div class="form-group">
          <label>Foto</label>
          <input type="file" id="photoInput" accept="image/*" capture="environment">
        </div>
        <div class="photo-grid" id="photoPreview"></div>
        <button class="btn btn-primary" id="uploadBtn" style="margin-top: 12px;">Subir foto</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Incidencias</div>
      </div>
      <div class="card-body">
        <div class="incidencia-form">
          <div class="form-group">
            <label>Tipo</label>
            <select id="incidentType">
              <option value="waiting_parts">Espera recambios</option>
              <option value="waiting_insurer">Espera aseguradora</option>
              <option value="waiting_client">Espera cliente</option>
              <option value="rework">Retrabajo</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div class="form-group">
            <label>Descripción interna</label>
            <textarea id="incidentInternal" placeholder="Detalles para el taller..."></textarea>
          </div>
          <div class="form-group">
            <label>Descripción pública (cliente/aseguradora)</label>
            <textarea id="incidentPublic" placeholder="Visible para cliente/aseguradora..."></textarea>
          </div>
          <div class="form-group">
            <label>Retraso estimado (días)</label>
            <input type="number" id="incidentDelay" min="0" value="0">
          </div>
          <button class="btn btn-secondary" id="addIncidentBtn">Añadir incidencia</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Timeline</div>
      </div>
      <div class="card-body">
        <div class="timeline" id="timeline"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Fotos de la orden</div>
      </div>
      <div class="card-body">
        <div class="photo-grid" id="photosGrid"></div>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    function esc(value) { const span = document.createElement('span'); span.textContent = String(value ?? ''); return span.innerHTML.replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
    const ORDER_UUID = "{{ORDER_UUID}}";
    const API_BASE = "/api/technician/orders";
    
    const STATUS_ORDER = [
      { key: "RECEPCIONADO", label: "Recepcionado", class: "recibido" },
      { key: "PENDIENTE_PERITACION", label: "Pte. Peritación", class: "peritacion" },
      { key: "PERITACION_REALIZADA", label: "Peritación Realizada", class: "peritacion" },
      { key: "PENDIENTE_AUTORIZACION", label: "Pte. Autorización", class: "autorizado" },
      { key: "AUTORIZADO", label: "Autorizado", class: "autorizado" },
      { key: "PENDIENTE_PIEZAS", label: "Pte. Piezas", class: "piezas" },
      { key: "EN_DESMONTAJE", label: "Desmontaje", class: "trabajo" },
      { key: "CHAPA", label: "Chapa", class: "trabajo" },
      { key: "PREPARACION_PINTURA", label: "Prep. Pintura", class: "trabajo" },
      { key: "PINTURA", label: "Pintura", class: "trabajo" },
      { key: "MONTAJE", label: "Montaje", class: "trabajo" },
      { key: "MECANICA", label: "Mecánica", class: "trabajo" },
      { key: "CONTROL_CALIDAD", label: "Control Calidad", class: "trabajo" },
      { key: "LIMPIEZA", label: "Limpieza", class: "trabajo" },
      { key: "LISTO_PARA_ENTREGA", label: "Listo Entrega", class: "listos" },
      { key: "ENTREGADO", label: "Entregado", class: "entregado" }
    ];

    let currentOrder = null;

    function showToast(msg, type = '') {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.className = 'toast show ' + type;
      setTimeout(() => toast.classList.remove('show'), 3000);
    }

    async function fetchOrder() {
      try {
        const res = await fetch(\`\${API_BASE}/\${ORDER_UUID}\`, { credentials: 'include' });
        if (!res.ok) throw new Error('Error cargando orden');
        currentOrder = await res.json();
        renderOrder();
      } catch (e) {
        showToast('Error: ' + e.message, 'error');
      }
    }

    function renderOrder() {
      if (!currentOrder) return;
      const o = currentOrder.order || currentOrder;
      const currentIdx = STATUS_ORDER.findIndex(s => s.key === o.current_status);
      
      document.getElementById('statusFlow').innerHTML = STATUS_ORDER.map((s, i) => 
        \`<div class="status-step \${i < currentIdx ? 'completed' : i === currentIdx ? 'current' : ''}">\${s.label}</div>\`
      ).join('');

      const nextIdx = currentIdx + 1;
      const btn = document.getElementById('nextStateBtn');
      const label = document.getElementById('nextStateLabel');
      if (nextIdx < STATUS_ORDER.length) {
        btn.disabled = false;
        label.textContent = STATUS_ORDER[nextIdx].label;
        btn.dataset.nextStatus = STATUS_ORDER[nextIdx].key;
      } else {
        btn.disabled = true;
        label.textContent = 'Orden completada';
      }

      document.querySelector('.header h1').textContent = \`\${o.plate || ''} \${o.make || ''} \${o.model || ''}\`;
      document.querySelector('.badge').textContent = STATUS_ORDER[currentIdx]?.label || o.current_status;
      document.querySelector('.badge').className = 'badge badge-' + (STATUS_ORDER[currentIdx]?.class || 'recibido');
      document.querySelector('.card-value').textContent = o.reference || '—';
      document.querySelectorAll('.card-value')[1].textContent = STATUS_ORDER[currentIdx]?.label || o.current_status;
      document.querySelectorAll('.card-value')[2].textContent = o.entry_date || '—';
      document.querySelectorAll('.card-value')[3].textContent = o.estimated_delivery_date || '—';

      renderTimeline(currentOrder.events || []);
      renderPhotos(currentOrder.photos || []);
    }

    function renderTimeline(events) {
      const container = document.getElementById('timeline');
      if (!events.length) {
        container.innerHTML = '<p style="color:var(--gris-medio);text-align:center;padding:20px;">Sin eventos aún</p>';
        return;
      }
      container.innerHTML = events.map((e, i) => \`
        <div class="timeline-item" style="position:relative;">
          <div class="timeline-dot \${e.note_public ? 'completed' : ''}"></div>
          <div class="timeline-line" style="\${i === events.length - 1 ? 'display:none' : ''}"></div>
          <div class="timeline-content">
            <div class="timeline-time">\${new Date(e.created_at).toLocaleString('es-ES')}</div>
            <div class="timeline-status">\${esc(e.new_status)}</div>
            \${e.note_public ? \`<div class="timeline-note">\${esc(e.note_public)}</div>\` : ''}
            \${e.note_internal ? \`<div class="timeline-note" style="color:var(--naranja);font-size:12px;">[Interno] \${esc(e.note_internal)}</div>\` : ''}
          </div>
        </div>
      \`).join('');
    }

    function renderPhotos(photos) {
      const container = document.getElementById('photosGrid');
      if (!photos.length) {
        container.innerHTML = '<p style="color:var(--gris-medio);text-align:center;padding:20px;grid-column:1/-1;">Sin fotos</p>';
        return;
      }
      container.innerHTML = photos.map(p => \`
        <div class="photo-item">
          <img src="/api/photos/\${esc(p.id)}/content" alt="\${esc(p.category)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
          <div style="display:none;align-items:center;justify-content:center;height:100%;color:var(--gris-medio);font-size:12px;">Sin imagen</div>
          <div class="photo-category">\${esc(p.category)}</div>
        </div>
      \`).join('');
    }

    document.getElementById('nextStateBtn').addEventListener('click', async () => {
      const btn = document.getElementById('nextStateBtn');
      const nextStatus = btn.dataset.nextStatus;
      if (!nextStatus) return;
      btn.disabled = true;
      btn.textContent = 'Guardando...';
      try {
        const res = await fetch(\`\${API_BASE}/\${ORDER_UUID}/events\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ newStatus: nextStatus })
        });
        if (!res.ok) throw new Error('Error cambiando estado');
        showToast('Estado actualizado', 'success');
        fetchOrder();
      } catch (e) {
        showToast('Error: ' + e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Siguiente estado: <span id="nextStateLabel">' + STATUS_ORDER[STATUS_ORDER.findIndex(s=>s.key===nextStatus)].label + '</span>';
      }
    });

    let pendingPhoto = null;
    document.getElementById('photoInput').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      pendingPhoto = file;
      const preview = document.getElementById('photoPreview');
      preview.innerHTML = \`<div class="photo-item"><img src="\${URL.createObjectURL(file)}" alt="Preview"><div class="photo-category">\${document.getElementById('photoCategory').value}</div></div>\`;
    });

    document.getElementById('uploadBtn').addEventListener('click', async () => {
      if (!pendingPhoto) { showToast('Selecciona una foto', 'error'); return; }
      const btn = document.getElementById('uploadBtn');
      btn.disabled = true;
      btn.textContent = 'Subiendo...';
      try {
        const formData = new FormData();
        formData.append('file', pendingPhoto);
        formData.append('workOrderId', currentOrder.order?.id || ORDER_UUID);
        formData.append('category', document.getElementById('photoCategory').value);
        formData.append('visibility', document.getElementById('photoVisibility').value);
        const res = await fetch('/api/photos/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        if (!res.ok) throw new Error('Error subiendo foto');
        showToast('Foto subida', 'success');
        pendingPhoto = null;
        document.getElementById('photoInput').value = '';
        document.getElementById('photoPreview').innerHTML = '';
        fetchOrder();
      } catch (e) {
        showToast('Error: ' + e.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Subir foto';
      }
    });

    document.getElementById('addIncidentBtn').addEventListener('click', async () => {
      const type = document.getElementById('incidentType').value;
      const internal = document.getElementById('incidentInternal').value;
      const publicDesc = document.getElementById('incidentPublic').value;
      const delay = parseInt(document.getElementById('incidentDelay').value) || 0;
      if (!internal.trim()) { showToast('Escribe descripción interna', 'error'); return; }
      try {
        const res = await fetch(\`\${API_BASE}/\${ORDER_UUID}/events\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ newStatus: currentOrder.order?.current_status, noteInternal: internal, notePublic: publicDesc || undefined })
        });
        if (!res.ok) throw new Error('Error añadiendo incidencia');
        showToast('Incidencia añadida', 'success');
        document.getElementById('incidentInternal').value = '';
        document.getElementById('incidentPublic').value = '';
        document.getElementById('incidentDelay').value = '0';
        fetchOrder();
      } catch (e) {
        showToast('Error: ' + e.message, 'error');
      }
    });

    fetchOrder();
  </script>
</body>
</html>`;

async function requireTechAdminAuth(request: Request, env: Env): Promise<{ userId: string; role: string } | Response> {
  const session = await verifySession(env, request);
  if (!session) return json({ error: "unauthorized" }, 401);
  if (!["TECHNICIAN", "ADMIN"].includes(session.role)) {
    return json({ error: "forbidden" }, 403);
  }
  return session;
}

function renderTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || "");
}

function getStatusClass(status: string): string {
  const map: Record<string, string> = {
    RECEPCIONADO: "recibido",
    PENDIENTE_PERITACION: "peritacion",
    PERITACION_REALIZADA: "peritacion",
    PENDIENTE_AUTORIZACION: "autorizado",
    AUTORIZADO: "autorizado",
    PENDIENTE_PIEZAS: "piezas",
    EN_DESMONTAJE: "trabajo",
    CHAPA: "trabajo",
    PREPARACION_PINTURA: "trabajo",
    PINTURA: "trabajo",
    MONTAJE: "trabajo",
    MECANICA: "trabajo",
    CONTROL_CALIDAD: "trabajo",
    LIMPIEZA: "trabajo",
    LISTO_PARA_ENTREGA: "listos",
    ENTREGADO: "entregado",
    BLOQUEADO: "bloqueado",
    ESPERA_CLIENTE: "bloqueado",
    ESPERA_ASEGURADORA: "bloqueado",
    ESPERA_RECAMBIO: "piezas",
    RETRABAJO: "trabajo"
  };
  return map[status] || "recibido";
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    RECEPCIONADO: "Recepcionado",
    PENDIENTE_PERITACION: "Pte. Peritación",
    PERITACION_REALIZADA: "Peritación Realizada",
    PENDIENTE_AUTORIZACION: "Pte. Autorización",
    AUTORIZADO: "Autorizado",
    PENDIENTE_PIEZAS: "Pte. Piezas",
    EN_DESMONTAJE: "Desmontaje",
    CHAPA: "Chapa",
    PREPARACION_PINTURA: "Prep. Pintura",
    PINTURA: "Pintura",
    MONTAJE: "Montaje",
    MECANICA: "Mecánica",
    CONTROL_CALIDAD: "Control Calidad",
    LIMPIEZA: "Limpieza",
    LISTO_PARA_ENTREGA: "Listo Entrega",
    ENTREGADO: "Entregado",
    BLOQUEADO: "Bloqueado",
    ESPERA_CLIENTE: "Espera Cliente",
    ESPERA_ASEGURADORA: "Espera Aseguradora",
    ESPERA_RECAMBIO: "Espera Recambio",
    RETRABAJO: "Retrabajo"
  };
  return map[status] || status;
}

export const mobileRoutes = {
  async orderPage(request: Request, env: Env, uuid: string) {
    const auth = await requireTechAdminAuth(request, env);
    if (auth instanceof Response) return auth;
    
    const access = await orderAccess(request, env, uuid);
    if (access instanceof Response) return access;
    const orderData = await queries.getOrderWithDetails(env.DB, uuid);
    if (!orderData) return new Response("Orden no encontrada", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" }});
    
    const order = orderData.order as any;
    const vehicle = order;
    
    const templateData: Record<string, string> = {
      ORDER_UUID: uuid,
      ORDER_REFERENCE: String(order.reference || "—"),
      VEHICLE_PLATE: String(vehicle.plate || "—"),
      VEHICLE_MAKE: String(vehicle.make || "—"),
      VEHICLE_MODEL: String(vehicle.model || "—"),
      STATUS_CLASS: getStatusClass(order.current_status),
      STATUS_LABEL: getStatusLabel(order.current_status),
      ENTRY_DATE: String(order.entry_date || "—"),
      ESTIMATED_DELIVERY: String(order.estimated_delivery_date || "—")
    };
    
    const html = renderTemplate(mobileTemplate, Object.fromEntries(Object.entries(templateData).map(([k,v]) => [k, escapeHtml(v)])));
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    });
  }
};