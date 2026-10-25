import { verifySession } from "../auth";
import { json } from "../utils/response";
import { queries } from "../db/queries";
import type { Env } from "../index";
import { NotificationEvent, NotificationTemplate } from "./templates";
import { WhatsAppProvider, WhatsAppConfig } from "./providers";
import { SMSProvider, SMSConfig } from "./providers";
import { EmailProvider, EmailConfig } from "./providers";

export interface NotificationConfig {
  whatsapp?: WhatsAppConfig;
  sms?: SMSConfig;
  email?: EmailConfig;
  baseUrl: string;
}

export class NotificationService {
  public whatsapp?: WhatsAppProvider;
  public sms?: SMSProvider;
  public email?: EmailProvider;
  private baseUrl: string;

  constructor(config: NotificationConfig) {
    this.baseUrl = config.baseUrl;
    if (config.whatsapp) this.whatsapp = new WhatsAppProvider(config.whatsapp);
    if (config.sms) this.sms = new SMSProvider(config.sms);
    if (config.email) this.email = new EmailProvider(config.email);
  }

  async processEvent(event: NotificationEvent, env: Env): Promise<void> {
    const notifications = this.buildNotifications(event);
    
    for (const notification of notifications) {
      try {
        await this.sendNotification(notification);
        await this.logNotification(env, notification, 'sent');
      } catch (error) {
        await this.logNotification(env, notification, 'failed', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  private buildNotifications(event: NotificationEvent): Array<{ channel: 'whatsapp' | 'sms' | 'email'; templateId: string; to: string; data: Record<string, string> }> {
    const notifications: Array<{ channel: 'whatsapp' | 'sms' | 'email'; templateId: string; to: string; data: Record<string, string> }> = [];
    const trackingUrl = `${this.baseUrl}/seguimiento/${event.data.public_token || ''}`;
    const insurerPortalUrl = `${this.baseUrl}/aseguradora/${event.data.insurer_token || ''}`;

    const baseData = {
      work_order_reference: event.workOrderReference,
      work_order_uuid: event.workOrderUuid,
      vehicle_plate: event.vehiclePlate,
      vehicle_make: event.vehicleMake,
      vehicle_model: event.vehicleModel,
      tracking_url: trackingUrl,
      insurer_portal_url: insurerPortalUrl,
      timestamp: event.timestamp
    };

    switch (event.type) {
      case 'order_created':
        if (event.customerPhone) {
          notifications.push({ channel: 'whatsapp', templateId: 'whatsapp_order_created', to: event.customerPhone, data: { ...baseData, customer_name: event.data.customer_name || 'Cliente', status: 'RECEPCIONADO' } });
          notifications.push({ channel: 'sms', templateId: 'sms_status_changed', to: event.customerPhone, data: { ...baseData, new_status: 'RECEPCIONADO' } });
        }
        if (event.customerEmail) {
          notifications.push({ channel: 'email', templateId: 'email_order_created', to: event.customerEmail, data: { ...baseData, customer_name: event.data.customer_name || 'Cliente', entry_date: event.data.entry_date || new Date().toLocaleDateString('es-ES') } });
        }
        break;

      case 'order_status_changed':
        if (event.customerPhone) {
          notifications.push({ channel: 'whatsapp', templateId: 'whatsapp_status_changed', to: event.customerPhone, data: { ...baseData, new_status: event.data.new_status || '', note_public: event.data.note_public || '' } });
          notifications.push({ channel: 'sms', templateId: 'sms_status_changed', to: event.customerPhone, data: { ...baseData, new_status: event.data.new_status || '' } });
        }
        if (event.customerEmail) {
          notifications.push({ channel: 'email', templateId: 'email_status_changed', to: event.customerEmail, data: { ...baseData, new_status: event.data.new_status || '', note_public: event.data.note_public || '' } });
        }
        if (event.insurerEmail) {
          notifications.push({ channel: 'email', templateId: 'email_status_changed', to: event.insurerEmail, data: { ...baseData, new_status: event.data.new_status || '', note_public: event.data.note_public || '' } });
        }
        break;

      case 'order_ready':
        if (event.customerPhone) {
          notifications.push({ channel: 'whatsapp', templateId: 'whatsapp_order_ready', to: event.customerPhone, data: baseData });
          notifications.push({ channel: 'sms', templateId: 'sms_order_ready', to: event.customerPhone, data: baseData });
        }
        if (event.customerEmail) {
          notifications.push({ channel: 'email', templateId: 'email_order_ready', to: event.customerEmail, data: baseData });
        }
        break;

      case 'delivery_scheduled':
        if (event.customerPhone) {
          notifications.push({ channel: 'whatsapp', templateId: 'whatsapp_delivery_scheduled', to: event.customerPhone, data: { ...baseData, delivery_date: event.data.delivery_date || '', delivery_time: event.data.delivery_time || '', delivery_location: event.data.delivery_location || '' } });
        }
        break;

      case 'event_added':
      case 'photo_uploaded':
      case 'incident_created':
        // Notify insurer if exists
        if (event.insurerEmail) {
          notifications.push({ channel: 'email', templateId: 'email_status_changed', to: event.insurerEmail, data: { ...baseData, new_status: event.data.current_status || '', note_public: event.data.note_public || 'Nueva actualización en el expediente' } });
        }
        break;
    }

    return notifications;
  }

  private async sendNotification(notification: { channel: 'whatsapp' | 'sms' | 'email'; templateId: string; to: string; data: Record<string, string> }): Promise<void> {
    let result;
    switch (notification.channel) {
      case 'whatsapp':
        if (!this.whatsapp) throw new Error('WhatsApp provider not configured');
        result = await this.whatsapp.send(notification.to, notification.templateId, notification.data);
        break;
      case 'sms':
        if (!this.sms) throw new Error('SMS provider not configured');
        result = await this.sms.send(notification.to, notification.templateId, notification.data);
        break;
      case 'email':
        if (!this.email) throw new Error('Email provider not configured');
        result = await this.email.send(notification.to, notification.templateId, notification.data);
        break;
    }
    
    if (!result?.success) {
      throw new Error(result?.error || 'Notification send failed');
    }
  }

  private async logNotification(env: Env, notification: { channel: string; templateId: string; to: string }, status: 'sent' | 'failed', error?: string): Promise<void> {
    await env.DB.prepare(`
      INSERT INTO notifications (id, channel, template_id, recipient, status, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(crypto.randomUUID(), notification.channel, notification.templateId, notification.to, status, error || null).run();
  }

  // Webhook handlers for delivery status callbacks
  async handleWhatsAppWebhook(request: Request, env: Env): Promise<Response> {
    // Handle Twilio/Gupshup/Meta delivery receipts
    const body = await request.json();
    // Process delivery status, update notification log
    return json({ received: true });
  }

  async handleSMSWebhook(request: Request, env: Env): Promise<Response> {
    const body = await request.json();
    // Process delivery status
    return json({ received: true });
  }

  async handleEmailWebhook(request: Request, env: Env): Promise<Response> {
    const body = await request.json();
    // Process bounce/complaint/delivery
    return json({ received: true });
  }
}

export function createNotificationService(env: Env): NotificationService {
  return new NotificationService({
    baseUrl: env.BASE_URL || 'https://manotas.es',
    whatsapp: env.WHATSAPP_ACCOUNT_SID && env.WHATSAPP_FROM_NUMBER ? {
      provider: 'twilio',
      accountSid: env.WHATSAPP_ACCOUNT_SID!,
      authToken: env.WHATSAPP_AUTH_TOKEN!,
      fromNumber: env.WHATSAPP_FROM_NUMBER!
    } : undefined,
    sms: env.SMS_ACCOUNT_SID && env.SMS_FROM_NUMBER ? {
      provider: 'twilio',
      accountSid: env.SMS_ACCOUNT_SID!,
      authToken: env.SMS_AUTH_TOKEN!,
      fromNumber: env.SMS_FROM_NUMBER!
    } : undefined,
    email: env.SENDGRID_API_KEY ? {
      provider: 'sendgrid',
      apiKey: env.SENDGRID_API_KEY!,
      fromEmail: env.EMAIL_FROM || 'noreply@manotas.es',
      fromName: 'Talleres Manotas'
    } : undefined
  });
}

// Notification routes for the worker
export const notificationRoutes = {
  async webhookWhatsApp(request: Request, env: Env) {
    const service = createNotificationService(env);
    return service.handleWhatsAppWebhook(request, env);
  },

  async webhookSMS(request: Request, env: Env) {
    const service = createNotificationService(env);
    return service.handleSMSWebhook(request, env);
  },

  async webhookEmail(request: Request, env: Env) {
    const service = createNotificationService(env);
    return service.handleEmailWebhook(request, env);
  },

  async testNotification(request: Request, env: Env) {
    const auth = await verifySession(env, request);
    if (auth instanceof Response) return auth;
    if (!auth || auth.role !== 'ADMIN') return json({ error: 'forbidden' }, 403);

    const body = await request.json() as { channel: 'whatsapp' | 'sms' | 'email'; templateId: string; to: string; data: Record<string, string> };
    const service = createNotificationService(env);
    
    try {
      let result;
      switch (body.channel) {
        case 'whatsapp':
          if (!service.whatsapp) return json({ error: 'WhatsApp not configured' }, 400);
          result = await service.whatsapp.send(body.to, body.templateId, body.data);
          break;
        case 'sms':
          if (!service.sms) return json({ error: 'SMS not configured' }, 400);
          result = await service.sms.send(body.to, body.templateId, body.data);
          break;
        case 'email':
          if (!service.email) return json({ error: 'Email not configured' }, 400);
          result = await service.email.send(body.to, body.templateId, body.data);
          break;
      }
      return json({ success: true, result });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
    }
  }
};

// Database migration for notifications table
export const NOTIFICATIONS_MIGRATION = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL CHECK(channel IN ('whatsapp','sms','email')),
  template_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('sent','failed','pending')),
  error TEXT,
  provider_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created ON notifications(created_at);
`;