export interface NotificationChannel {
  send(to: string, template: string, data: Record<string, string>): Promise<{ success: boolean; providerId?: string; error?: string }>;
}

export interface NotificationTemplate {
  id: string;
  channel: 'whatsapp' | 'sms' | 'email';
  subject?: string;
  body: string;
  variables: string[];
}

export interface NotificationEvent {
  type: 'order_created' | 'order_status_changed' | 'event_added' | 'photo_uploaded' | 'incident_created' | 'order_ready' | 'delivery_scheduled';
  workOrderId: string;
  workOrderUuid: string;
  workOrderReference: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  customerPhone?: string;
  customerEmail?: string;
  insurerEmail?: string;
  technicianPhone?: string;
  technicianEmail?: string;
  data: Record<string, string>;
  timestamp: string;
}

const TEMPLATES: NotificationTemplate[] = [
  // WhatsApp templates
  {
    id: 'whatsapp_order_created',
    channel: 'whatsapp',
    body: 'Hola {{customer_name}}, tu orden {{work_order_reference}} para {{vehicle_plate}} {{vehicle_make}} {{vehicle_model}} ha sido creada. Estado: {{status}}. Seguimiento: {{tracking_url}}',
    variables: ['customer_name', 'work_order_reference', 'vehicle_plate', 'vehicle_make', 'vehicle_model', 'status', 'tracking_url']
  },
  {
    id: 'whatsapp_status_changed',
    channel: 'whatsapp',
    body: 'Actualización orden {{work_order_reference}} ({{vehicle_plate}}): nuevo estado {{new_status}}. {{note_public}}',
    variables: ['work_order_reference', 'vehicle_plate', 'new_status', 'note_public']
  },
  {
    id: 'whatsapp_order_ready',
    channel: 'whatsapp',
    body: '¡Tu vehículo {{vehicle_plate}} está listo para entrega! Orden {{work_order_reference}}. Coordina la entrega respondiendo a este mensaje.',
    variables: ['vehicle_plate', 'work_order_reference']
  },
  {
    id: 'whatsapp_delivery_scheduled',
    channel: 'whatsapp',
    body: 'Entrega programada para orden {{work_order_reference}}: {{delivery_date}} a las {{delivery_time}} en {{delivery_location}}. Confirma disponibilidad.',
    variables: ['work_order_reference', 'delivery_date', 'delivery_time', 'delivery_location']
  },

  // SMS templates
  {
    id: 'sms_status_changed',
    channel: 'sms',
    body: 'Orden {{work_order_reference}}: estado actualizado a {{new_status}}. Ver detalles: {{tracking_url}}',
    variables: ['work_order_reference', 'new_status', 'tracking_url']
  },
  {
    id: 'sms_order_ready',
    channel: 'sms',
    body: 'Vehiculo {{vehicle_plate}} listo para entrega. Orden {{work_order_reference}}. Llama para coordinar.',
    variables: ['vehicle_plate', 'work_order_reference']
  },

  // Email templates
  {
    id: 'email_order_created',
    channel: 'email',
    subject: 'Nueva orden de trabajo {{work_order_reference}} - Talleres Manotas',
    body: `
      <h2>Nueva orden de trabajo</h2>
      <p>Estimado/a {{customer_name}},</p>
      <p>Se ha creado la orden <strong>{{work_order_reference}}</strong> para su veh&iacute;culo <strong>{{vehicle_plate}} {{vehicle_make}} {{vehicle_model}}</strong>.</p>
      <p><strong>Estado inicial:</strong> {{status}}</p>
      <p><strong>Fecha de entrada:</strong> {{entry_date}}</p>
      <p>Puede hacer seguimiento en: <a href="{{tracking_url}}">{{tracking_url}}</a></p>
      <hr>
      <p>Talleres Manotas - Chapa y Pintura</p>
    `,
    variables: ['customer_name', 'work_order_reference', 'vehicle_plate', 'vehicle_make', 'vehicle_model', 'status', 'entry_date', 'tracking_url']
  },
  {
    id: 'email_status_changed',
    channel: 'email',
    subject: 'Actualizaci&oacute;n orden {{work_order_reference}} - {{new_status}}',
    body: `
      <h2>Actualizaci&oacute;n de estado</h2>
      <p>La orden <strong>{{work_order_reference}}</strong> ({{vehicle_plate}} {{vehicle_make}} {{vehicle_model}}) ha cambiado de estado.</p>
      <p><strong>Nuevo estado:</strong> {{new_status}}</p>
      <p><strong>Nota:</strong> {{note_public || 'Sin nota p&uacute;blica'}}</p>
      <p><a href="{{tracking_url}}">Ver seguimiento completo</a></p>
    `,
    variables: ['work_order_reference', 'vehicle_plate', 'vehicle_make', 'vehicle_model', 'new_status', 'note_public', 'tracking_url']
  },
  {
    id: 'email_order_ready',
    channel: 'email',
    subject: 'Veh&iacute;culo listo para entrega - Orden {{work_order_reference}}',
    body: `
      <h2>¡Veh&iacute;culo listo!</h2>
      <p>El veh&iacute;culo <strong>{{vehicle_plate}} {{vehicle_make}} {{vehicle_model}}</strong> de la orden <strong>{{work_order_reference}}</strong> est&aacute; listo para entrega.</p>
      <p>Por favor, p&oacute;ngase en contacto con nosotros para coordinar la entrega.</p>
      <p><a href="{{tracking_url}}">Ver detalles</a></p>
    `,
    variables: ['work_order_reference', 'vehicle_plate', 'vehicle_make', 'vehicle_model', 'tracking_url']
  },
  {
    id: 'email_insurer_new_case',
    channel: 'email',
    subject: 'Nuevo expediente asegurador - {{work_order_reference}}',
    body: `
      <h2>Nuevo expediente</h2>
      <p>Se ha asignado el expediente <strong>{{work_order_reference}}</strong> a su entidad.</p>
      <p><strong>Veh&iacute;culo:</strong> {{vehicle_plate}} {{vehicle_make}} {{vehicle_model}}</p>
      <p><strong>Estado:</strong> {{status}}</p>
      <p><strong>Fecha entrada:</strong> {{entry_date}}</p>
      <p>Acceda al portal: <a href="{{insurer_portal_url}}">{{insurer_portal_url}}</a></p>
    `,
    variables: ['work_order_reference', 'vehicle_plate', 'vehicle_make', 'vehicle_model', 'status', 'entry_date', 'insurer_portal_url']
  }
];

export function getTemplate(id: string): NotificationTemplate | undefined {
  return TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByChannel(channel: 'whatsapp' | 'sms' | 'email'): NotificationTemplate[] {
  return TEMPLATES.filter(t => t.channel === channel);
}

export function renderTemplate(template: NotificationTemplate, data: Record<string, string>): { subject?: string; body: string } {
  let body = template.body;
  let subject = template.subject;
  
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    body = body.replace(new RegExp(placeholder, 'g'), value);
    if (subject) {
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
    }
  }
  
  // Check for missing variables
  const missing = template.variables.filter(v => !data[v]);
  if (missing.length > 0) {
    console.warn(`Template ${template.id} missing variables:`, missing);
  }
  
  return { subject, body };
}

export function buildTrackingUrl(baseUrl: string, publicToken: string): string {
  return `${baseUrl}/seguimiento/${publicToken}`;
}

export function buildInsurerPortalUrl(baseUrl: string, insurerToken: string): string {
  return `${baseUrl}/aseguradora/${insurerToken}`;
}

export function buildTechnicianUrl(baseUrl: string, workOrderUuid: string): string {
  return `${baseUrl}/taller/orden/${workOrderUuid}`;
}