// lib/email-sendgrid.ts

import sgMail from '@sendgrid/mail';
import { ResponseError } from '@sendgrid/helpers/classes';

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@precisegovcon.com';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'PreciseGovCon';

if (!SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY is not set. Email sending will fail.');
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmailSendGrid({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailResult> {
  try {
    // Validate email
    if (!to || !subject || (!html && !text)) {
      return {
        success: false,
        error: 'Missing required email fields',
      };
    }

    // Prepare message
    const msg = {
      to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject,
      text,
      html,
      trackingSettings: {
        clickTracking: {
          enable: true,
          enableText: true,
        },
        openTracking: {
          enable: true,
        },
        subscriptionTracking: {
          enable: true,
          substitutionTag: '[unsubscribe_url]',
        },
      },
      // Custom args for tracking
      customArgs: {
        environment: process.env.NODE_ENV || 'development',
        source: 'precisegovcon',
      },
    };

    // Send email
    const [response] = await sgMail.send(msg);
    
    // Safely access headers
    const headers = response?.headers || {};
    const messageId = headers['x-message-id'] || headers['X-Message-Id'];

    return {
      success: true,
      messageId: Array.isArray(messageId) ? messageId[0] : messageId,
    };
  } catch (error: any) {
    console.error('[SendGrid] Error sending email:', {
      to,
      subject,
      error: error.response?.body || error.message,
    });

    return {
      success: false,
      error: error.response?.body?.errors?.[0]?.message || error.message,
    };
  }
}

// Bulk send function
export async function sendBulkEmailsSendGrid(
  emails: Array<{
    to: string;
    subject: string;
    html: string;
    text: string;
  }>
): Promise<EmailResult[]> {
  try {
    const messages = emails.map((email) => ({
      to: email.to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: email.subject,
      text: email.text,
      html: email.html,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
        subscriptionTracking: { enable: true },
      },
    }));

    const responses = await sgMail.send(messages);
    
    // Handle responses safely
    return responses.map((response) => {
      // Check if response is an array and has elements
      const responseData = Array.isArray(response) && response.length > 0 
        ? response[0] 
        : response;
      
      const headers = responseData?.headers || {};
      const messageId = headers['x-message-id'] || headers['X-Message-Id'];
      
      return {
        success: true,
        messageId: Array.isArray(messageId) ? messageId[0] : messageId,
      };
    });
  } catch (error: any) {
    console.error('[SendGrid] Error sending bulk emails:', error.response?.body || error);
    
    // Return individual results with errors
    return emails.map(() => ({
      success: false,
      error: error.response?.body?.errors?.[0]?.message || error.message,
    }));
  }
}

// Verify SendGrid connection by sending a test email
export async function verifySendGridConnection(): Promise<boolean> {
  try {
    // Try to send a test email to verify API key works
    const testMsg = {
      to: FROM_EMAIL, // Send to yourself
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: 'SendGrid Connection Test',
      text: 'This is a test email to verify SendGrid connection.',
      html: '<p>This is a test email to verify SendGrid connection.</p>',
    };

    await sgMail.send(testMsg);
    console.log('[SendGrid] Connection verification successful');
    return true;
  } catch (error: any) {
    console.error('[SendGrid] Connection verification failed:', error.response?.body || error.message);
    return false;
  }
}

// Simple API key format validation (doesn't make an actual API call)
export function validateSendGridApiKeyFormat(): boolean {
  if (!SENDGRID_API_KEY) return false;
  
  // SendGrid API keys typically start with "SG." and are a specific format
  // This is a basic format check, not a validation that the key works
  return SENDGRID_API_KEY.startsWith('SG.') && SENDGRID_API_KEY.length > 30;
}

// Helper function to create HTML emails with templates
export function createEmailTemplate({
  title,
  content,
  buttonText,
  buttonUrl,
}: {
  title: string;
  content: string;
  buttonText?: string;
  buttonUrl?: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">PreciseGovCon</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #0f172a; margin-top: 0;">${title}</h2>
          <div style="color: #475569;">${content}</div>
          
          ${buttonText && buttonUrl ? `
            <div style="text-align: center; margin-top: 30px;">
              <a href="${buttonUrl}" style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">${buttonText}</a>
            </div>
          ` : ''}
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="color: #64748b; font-size: 14px; text-align: center;">
            You received this email because you're registered with PreciseGovCon.<br>
            <a href="[unsubscribe_url]" style="color: #f97316; text-decoration: none;">Unsubscribe</a>
          </p>
        </div>
      </body>
    </html>
  `;
}