/**
 * User Invitation System for Precise Govcon Admin Portal
 *
 * Three invitation methods:
 * 1. Direct invite with generated password (Admin controls account setup)
 * 2. Email invite with activation code (User-driven activation)
 * 3. Bulk credentials (For enterprise tier - batch login credentials)
 */

import prisma from './prisma';
import crypto from 'crypto';
import { sendEmail } from './email';

interface InvitationOptions {
  email: string;
  name: string;
  company?: string;
  planTier: 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  invitationType: 'direct' | 'email-code' | 'bulk-credential';
  expiresInDays?: number;
}

interface GeneratedCredentials {
  email: string;
  temporaryPassword: string;
  activationCode?: string;
  expiresAt?: Date;
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  return password;
}

/**
 * Generate an activation code for email-based invitations
 */
export function generateActivationCode(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a direct invitation (Admin provides temporary password)
 * User receives credentials and must login/change password
 */
export async function createDirectInvitation(
  options: InvitationOptions
): Promise<GeneratedCredentials> {
  const password = generateSecurePassword();

  // Create user in database (will add in next step - for now return credentials)
  return {
    email: options.email,
    temporaryPassword: password,
  };
}

/**
 * Create an email-based invitation with activation code
 * User receives email with activation link, sets their own password
 */
export async function createEmailCodeInvitation(
  options: InvitationOptions & { adminId: string }
): Promise<GeneratedCredentials> {
  const activationCode = generateActivationCode();
  const temporaryPassword = generateSecurePassword();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (options.expiresInDays || 7));

  // In production, store this in database
  // For now, return the credentials
  return {
    email: options.email,
    temporaryPassword,
    activationCode,
    expiresAt,
  };
}

/**
 * Create bulk credentials for Enterprise tier
 * Generates multiple login credentials for batch distribution
 */
export async function createBulkCredentials(
  enterpriseName: string,
  tierName: string,
  count: number = 10
): Promise<GeneratedCredentials[]> {
  const credentials: GeneratedCredentials[] = [];

  for (let i = 0; i < count; i++) {
    const email = `${enterpriseName.toLowerCase().replace(/\s+/g, '')}_user${i + 1}@enterprise.${tierName.toLowerCase()}.local`;
    const password = generateSecurePassword();

    credentials.push({
      email,
      temporaryPassword: password,
    });
  }

  return credentials;
}

/**
 * Generate invitation email template
 */
export function generateDirectInvitationEmail(
  userName: string,
  email: string,
  password: string,
  company?: string
): { subject: string; html: string } {
  const subject = '🎉 Your Precise Govcon Admin Portal Account is Ready!';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .credentials-box { background: white; padding: 20px; border-radius: 6px; border: 2px solid #ea580c; margin: 20px 0; }
          .cred-item { margin: 10px 0; }
          .cred-label { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; }
          .cred-value { font-family: 'Courier New', monospace; font-size: 14px; color: #333; background: #f0f0f0; padding: 8px; border-radius: 4px; word-break: break-all; }
          .button { display: inline-block; background: #ea580c; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 20px 0; font-size: 14px; }
          .footer { text-align: center; padding-top: 20px; color: #666; font-size: 12px; border-top: 1px solid #e5e7eb; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Welcome to Precise Govcon</h1>
            <p style="margin: 10px 0 0 0;">Admin Portal Access Granted</p>
          </div>

          <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>

            <p>Your admin account for the Precise Govcon platform is ready! You now have access to manage users, subscriptions, and analytics for ${company || 'your organization'}.</p>

            <div class="credentials-box">
              <h3 style="margin-top: 0; color: #ea580c;">Your Login Credentials</h3>

              <div class="cred-item">
                <div class="cred-label">Email Address</div>
                <div class="cred-value">${email}</div>
              </div>

              <div class="cred-item">
                <div class="cred-label">Temporary Password</div>
                <div class="cred-value">${password}</div>
              </div>
            </div>

            <div class="warning">
              <strong>⚠️ Important:</strong> This is a temporary password. You must change it on your first login for security reasons. Never share this password with anyone.
            </div>

            <h3 style="color: #1f2937;">Getting Started</h3>
            <ol style="color: #666;">
              <li>Visit the admin portal: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.precisegovcon.com'}" style="color: #ea580c; text-decoration: none;">admin.precisegovcon.com</a></li>
              <li>Log in with the credentials above</li>
              <li>Change your password (required on first login)</li>
              <li>Explore the dashboard to manage users and subscriptions</li>
            </ol>

            <p style="margin-top: 30px;">Questions? Contact our support team at <strong>support@precisegovcon.com</strong></p>
          </div>

          <div class="footer">
            <p>© 2025 Precise Govcon. All rights reserved.</p>
            <p style="margin: 8px 0 0 0;">This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Generate email invitation template (activation code based)
 */
export function generateEmailCodeInvitationTemplate(
  userName: string,
  email: string,
  activationCode: string,
  expiresAt: Date
): { subject: string; html: string } {
  const activationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.precisegovcon.com'}/activate?code=${activationCode}&email=${encodeURIComponent(email)}`;

  const subject = '🔗 Activate Your Precise Govcon Admin Account';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #ea580c; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 20px 0; font-size: 14px; }
          .footer { text-align: center; padding-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Activate Your Account</h1>
            <p style="margin: 10px 0 0 0;">Complete Your Precise Govcon Setup</p>
          </div>

          <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>

            <p>You've been invited to join the Precise Govcon Admin Portal. Click the button below to activate your account and set your password.</p>

            <a href="${activationLink}" class="button">Activate Account</a>

            <div class="warning">
              <strong>⏰ Expires:</strong> This link will expire on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}
            </div>

            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; background: white; padding: 12px; border-radius: 4px; font-size: 12px;">${activationLink}</p>

            <p style="margin-top: 30px;">Questions? Contact support@precisegovcon.com</p>
          </div>

          <div class="footer">
            <p>© 2025 Precise Govcon. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, html };
}

/**
 * Export bulk credentials as CSV
 */
export function generateBulkCredentialsCSV(
  credentials: GeneratedCredentials[],
  enterpriseName: string
): string {
  let csv = `Email,Temporary Password,First Login URL\n`;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.precisegovcon.com';

  credentials.forEach(cred => {
    csv += `"${cred.email}","${cred.temporaryPassword}","${baseUrl}/login"\n`;
  });

  return csv;
}
