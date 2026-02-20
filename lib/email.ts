// lib/email.ts

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResult {
  success: boolean;
  resendId?: string;
}

/**
 * Core email sender using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<SendEmailResult> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY is missing');
      return { success: false };
    }

    const from =
      process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return { success: false };
    }

    console.log('✅ Email sent via Resend:', {
      to: options.to,
      subject: options.subject,
      id: data?.id,
    });

    return { success: true, resendId: data?.id };
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
    return { success: false };
  }
}

/**
 * Send welcome email to newly created user
 */
export async function sendNewUserWelcomeEmail(
  userEmail: string,
  userName: string,
  planTier: string
): Promise<boolean> {
  const subject = '🎉 Welcome to PreciseGovCon Admin Portal!';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #ea580c; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; padding-top: 20px; color: #666; font-size: 12px; }
          .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-left: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to PreciseGovCon!</h1>
            <p>Your admin portal account has been created</p>
          </div>

          <div class="content">
            <p>Hello <strong>${userName || 'User'}</strong>,</p>

            <p>Welcome to the PreciseGovCon Admin Portal! Your account has been successfully created by our team.</p>

            <h2 style="color: #1f2937; font-size: 18px; margin-top: 24px;">Account Details</h2>
            <ul style="background: white; padding: 16px; border-radius: 6px; border-left: 4px solid #ea580c;">
              <li><strong>Email:</strong> ${userEmail}</li>
              <li><strong>Plan Tier:</strong> <span class="badge">${planTier.toUpperCase()}</span></li>
              <li><strong>Status:</strong> Active and Ready to Use</li>
            </ul>

            <h2 style="color: #1f2937; font-size: 18px; margin-top: 24px;">Next Steps</h2>
            <ol>
              <li>Log in to your account using your email and password</li>
              <li>Complete your profile information</li>
              <li>Explore the dashboard and manage your account</li>
              <li>Contact our support team if you need assistance</li>
            </ol>

            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.precisegovcon.com'}/login" class="button">Login to Portal</a>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              If you didn't create this account or have questions, please contact our support team at <strong>support@precisegovcon.com</strong>
            </p>
          </div>

          <div class="footer">
            <p>© 2025 PreciseGovCon. All rights reserved.</p>
            <p style="margin: 8px 0 0 0;">This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const result = await sendEmail({ to: userEmail, subject, html,
    text: `Welcome to PreciseGovCon! Your account has been created with ${planTier.toUpperCase()} tier. Login at ${
      process.env.NEXT_PUBLIC_APP_URL || 'https://admin.precisegovcon.com'
    }/login`,
  });
  return result.success;
}

/**
 * Send notification email to admin when new user is created
 */
export async function sendAdminNewUserNotification(
  adminEmail: string,
  userName: string,
  userEmail: string,
  planTier: string,
  company?: string
): Promise<boolean> {
  const subject = `✅ New User Registration: ${userName}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #1e40af; }
          .info-box strong { color: #1e40af; }
          .button { display: inline-block; background: #1e40af; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">✅ New User Registration</h2>
          </div>

          <div class="content">
            <p>A new user has been registered on the PreciseGovCon platform:</p>

            <div class="info-box">
              <p><strong>Name:</strong> ${userName || 'Unnamed'}</p>
              <p><strong>Email:</strong> ${userEmail}</p>
              <p><strong>Plan Tier:</strong> ${planTier.toUpperCase()}</p>
              ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
              <p><strong>Registered:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <p>You can manage this user's account from the admin portal dashboard.</p>

            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.precisegovcon.com'}/dashboard/users" class="button">View Users</a>
          </div>
        </div>
      </body>
    </html>
  `;

  const result = await sendEmail({ to: adminEmail, subject, html,
    text: `New user ${userName} (${userEmail}) registered with ${planTier} tier.`,
  });
  return result.success;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  userEmail: string,
  userName: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || 'https://admin.precisegovcon.com'
  }/reset-password?token=${resetToken}`;

  const subject = '🔐 Reset Your PreciseGovCon Password';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ea580c; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #ea580c; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🔐 Password Reset Request</h1>
          </div>

          <div class="content">
            <p>Hello ${userName || 'User'},</p>

            <p>You requested to reset your password. Click the button below to create a new password:</p>

            <a href="${resetUrl}" class="button">Reset Password</a>

            <div class="warning">
              <p><strong>⚠️ Security Notice:</strong> This link will expire in 24 hours. If you didn't request this, please ignore this email.</p>
            </div>

            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; background: white; padding: 12px; border-radius: 4px; font-size: 12px;">${resetUrl}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const result = await sendEmail({ to: userEmail, subject, html,
    text: `Reset your password here: ${resetUrl}`,
  });
  return result.success;
}

/**
 * Send email verification email to newly created user
 */
export async function sendEmailVerificationEmail(options: {
  email: string;
  firstName: string;
  company?: string;
  verificationUrl: string;
  expiresIn?: string;
}): Promise<boolean> {
  const subject = '✉️ Verify Your Email - PreciseGovCon';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #ea580c; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }
          .info-box { background: white; padding: 16px; border-radius: 6px; border-left: 4px solid #ea580c; margin: 20px 0; }
          .footer { text-align: center; padding-top: 20px; color: #666; font-size: 12px; }
          .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✉️ Verify Your Email</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Complete your account setup</p>
          </div>

          <div class="content">
            <p>Hello <strong>${options.firstName}</strong>,</p>

            <p>Thank you for signing up for PreciseGovCon! To activate your account, please verify your email address:</p>

            <center>
              <a href="${options.verificationUrl}" class="button">Verify Email Address</a>
            </center>

            <div class="info-box">
              <p><strong>📋 Account Details:</strong></p>
              <p style="margin: 8px 0;"><strong>Email:</strong> ${options.email}</p>
              ${options.company ? `<p style="margin: 8px 0;"><strong>Company:</strong> ${options.company}</p>` : ''}
              <p style="margin: 8px 0;"><strong>Status:</strong> <span class="badge">Pending Verification</span></p>
            </div>

            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; background: white; padding: 12px; border-radius: 4px; font-size: 12px; border: 1px solid #e5e7eb;">${options.verificationUrl}</p>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 20px 0;">
              <p><strong>⏰ Expires in ${options.expiresIn || '7 days'}</strong></p>
              <p style="margin: 8px 0 0 0; font-size: 14px;">After this time, you'll need to sign up again or contact support.</p>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              If you didn't create this account, please ignore this email or contact us at <strong>support@precisegovcon.com</strong>
            </p>
          </div>

          <div class="footer">
            <p>© 2025 PreciseGovCon. All rights reserved.</p>
            <p style="margin: 8px 0 0 0;">This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const result = await sendEmail({ to: options.email, subject, html,
    text: `Verify your email: ${options.verificationUrl}`,
  });
  return result.success;
}