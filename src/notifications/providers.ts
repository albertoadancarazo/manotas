import type { NotificationChannel, NotificationEvent, NotificationTemplate } from "./templates";
import { getTemplate, renderTemplate, buildTrackingUrl, buildInsurerPortalUrl } from "./templates";

export interface WhatsAppConfig {
  provider: 'twilio' | 'gupshup' | 'meta';
  accountSid?: string;
  authToken?: string;
  fromNumber: string;
  apiKey?: string;
  appId?: string;
}

export class WhatsAppProvider implements NotificationChannel {
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  async send(to: string, templateId: string, data: Record<string, string>): Promise<{ success: boolean; providerId?: string; error?: string }> {
    const template = getTemplate(templateId);
    if (!template || template.channel !== 'whatsapp') {
      return { success: false, error: `Template ${templateId} not found or not whatsapp` };
    }

    const { body } = renderTemplate(template, data);
    const cleanTo = to.replace(/\D/g, '');

    try {
      if (this.config.provider === 'twilio') {
        return this.sendViaTwilio(cleanTo, body);
      } else if (this.config.provider === 'gupshup') {
        return this.sendViaGupshup(cleanTo, body);
      } else if (this.config.provider === 'meta') {
        return this.sendViaMeta(cleanTo, body);
      }
      return { success: false, error: 'Unknown WhatsApp provider' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async sendViaTwilio(to: string, body: string): Promise<{ success: boolean; providerId?: string; error?: string }> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;
    const auth = btoa(`${this.config.accountSid}:${this.config.authToken}`);
    
    const formData = new FormData();
    formData.append('From', `whatsapp:${this.config.fromNumber}`);
    formData.append('To', `whatsapp:+${to}`);
    formData.append('Body', body);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}` },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Twilio error: ${error}` };
    }

    const result: { sid: string } = await response.json();
    return { success: true, providerId: result.sid };
  }

  private async sendViaGupshup(to: string, body: string): Promise<{ success: boolean; providerId?: string; error?: string }> {
    const response = await fetch('https://api.gupshup.io/wa/api/v1/msg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': this.config.apiKey || ''
      },
      body: new URLSearchParams({
        channel: 'whatsapp',
        source: this.config.fromNumber,
        destination: to,
        message: JSON.stringify({ type: 'text', text: body }),
        'src.name': 'Manotas'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Gupshup error: ${error}` };
    }

    const result: { messageId: string } = await response.json();
    return { success: true, providerId: result.messageId };
  }

  private async sendViaMeta(to: string, body: string): Promise<{ success: boolean; providerId?: string; error?: string }> {
    const response = await fetch(`https://graph.facebook.com/v18.0/${this.config.appId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Meta error: ${error}` };
    }

    const result: { messages?: Array<{ id: string }> } = await response.json();
    return { success: true, providerId: result.messages?.[0]?.id };
  }
}

export interface SMSConfig {
  provider: 'twilio' | 'vonage' | 'plivo';
  accountSid?: string;
  authToken?: string;
  apiKey?: string;
  apiSecret?: string;
  fromNumber: string;
}

export class SMSProvider implements NotificationChannel {
  private config: SMSConfig;

  constructor(config: SMSConfig) {
    this.config = config;
  }

  async send(to: string, templateId: string, data: Record<string, string>): Promise<{ success: boolean; providerId?: string; error?: string }> {
    const template = getTemplate(templateId);
    if (!template || template.channel !== 'sms') {
      return { success: false, error: `Template ${templateId} not found or not sms` };
    }

    const { body } = renderTemplate(template, data);
    const cleanTo = to.replace(/\D/g, '');

    try {
      if (this.config.provider === 'twilio') {
        return this.sendViaTwilio(cleanTo, body);
      } else if (this.config.provider === 'vonage') {
        return this.sendViaVonage(cleanTo, body);
      } else if (this.config.provider === 'plivo') {
        return this.sendViaPlivo(cleanTo, body);
      }
      return { success: false, error: 'Unknown SMS provider' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async sendViaTwilio(to: string, body: string): Promise<{ success: boolean; providerId?: string; error?: string }> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;
    const auth = btoa(`${this.config.accountSid}:${this.config.authToken}`);
    
    const formData = new FormData();
    formData.append('From', this.config.fromNumber);
    formData.append('To', to);
    formData.append('Body', body);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}` },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Twilio SMS error: ${error}` };
    }

    const result: { sid: string } = await response.json();
    return { success: true, providerId: result.sid };
  }

  private async sendViaVonage(to: string, body: string): Promise<{ success: boolean; providerId?: string; error?: string }> {
    const response = await fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: this.config.apiKey,
        api_secret: this.config.apiSecret,
        from: this.config.fromNumber,
        to: to,
        text: body
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Vonage error: ${error}` };
    }

    const result: { messages?: Array<{ 'message-id': string }> } = await response.json();
    return { success: true, providerId: result.messages?.[0]?.['message-id'] };
  }

  private async sendViaPlivo(to: string, body: string): Promise<{ success: boolean; providerId?: string; error?: string }> {
    const auth = btoa(`${this.config.apiKey}:${this.config.apiSecret}`);
    const response = await fetch(`https://api.plivo.com/v1/Account/${this.config.apiKey}/Message/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        src: this.config.fromNumber,
        dst: to,
        text: body
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Plivo error: ${error}` };
    }

    const result: { message_uuid: string } = await response.json();
    return { success: true, providerId: result.message_uuid };
  }
}

export interface EmailConfig {
  provider: 'sendgrid' | 'mailgun' | 'ses' | 'smtp';
  apiKey?: string;
  domain?: string;
  fromEmail: string;
  fromName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
}

export class EmailProvider implements NotificationChannel {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async send(to: string, templateId: string, data: Record<string, string>): Promise<{ success: boolean; providerId?: string; error?: string }> {
    const template = getTemplate(templateId);
    if (!template || template.channel !== 'email') {
      return { success: false, error: `Template ${templateId} not found or not email` };
    }

    const { subject, body } = renderTemplate(template, data);

    try {
      if (this.config.provider === 'sendgrid') {
        return this.sendViaSendGrid(to, subject || '', body);
      } else if (this.config.provider === 'mailgun') {
        return this.sendViaMailgun(to, subject || '', body);
      } else if (this.config.provider === 'ses') {
        return this.sendViaSES(to, subject || '', body);
      } else if (this.config.provider === 'smtp') {
        return this.sendViaSMTP(to, subject || '', body);
      }
      return { success: false, error: 'Unknown email provider' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async sendViaSendGrid(to: string, subject: string, html: string): Promise<{ success: boolean; providerId?: string; error?: string }> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }], subject }],
        from: { email: this.config.fromEmail, name: this.config.fromName },
        content: [{ type: 'text/html', value: html }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `SendGrid error: ${error}` };
    }

    return { success: true, providerId: response.headers.get('x-message-id') || undefined };
  }

  private async sendViaMailgun(to: string, subject: string, html: string): Promise<{ success: boolean; providerId?: string; error?: string }> {
    const formData = new FormData();
    formData.append('from', `${this.config.fromName || 'Manotas'} <${this.config.fromEmail}>`);
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('html', html);

    const response = await fetch(`https://api.mailgun.net/v3/${this.config.domain}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${btoa(`api:${this.config.apiKey}`)}` },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Mailgun error: ${error}` };
    }

    const result: { id: string } = await response.json();
    return { success: true, providerId: result.id };
  }

  private async sendViaSES(to: string, subject: string, html: string): Promise<{ success: boolean; providerId?: string; error?: string }> {
    // SES requires AWS SDK - simplified implementation
    return { success: false, error: 'SES not implemented - use SendGrid or Mailgun' };
  }

  private async sendViaSMTP(to: string, subject: string, html: string): Promise<{ success: boolean; providerId?: string; error?: string }> {
    // SMTP would require a library like nodemailer - not available in Workers easily
    return { success: false, error: 'SMTP not implemented in Workers - use SendGrid or Mailgun' };
  }
}