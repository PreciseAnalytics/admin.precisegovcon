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
 * NOTE: This is kept for backward compatibility but is no longer called
 * when admins create users. Admin-created users now receive
 * sendAdminCreatedUserActivationEmail instead.
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

/**
 * Send activation email to admin-created users.
 * Replaces sendNewUserWelcomeEmail for the admin "Add User" flow.
 * The link goes to /activate on the main app where the user sets
 * their password — email is verified and trial starts in that same step.
 */
export async function sendAdminCreatedUserActivationEmail(options: {
  to:              string;
  firstName:       string;
  company?:        string;
  activationUrl:   string;
  planTier:        string;
  activationCode?: string;
  expiresIn?:      string;
}): Promise<boolean> {
  const { to, firstName, company, activationUrl, planTier, activationCode, expiresIn = '72 hours' } = options;
  const subject    = '🚀 Activate Your PreciseGovCon Account';
  const tierLabel  = planTier.toUpperCase();

  const codeBlock = activationCode ? `
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:6px;margin:18px 0;">
      <p style="margin:0;font-size:13px;color:#92400e;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">Your Activation / Trial Code</p>
      <p style="margin:6px 0 0 0;font-size:22px;font-family:monospace;font-weight:900;color:#78350f;letter-spacing:0.1em;">${activationCode}</p>
      <p style="margin:6px 0 0 0;font-size:12px;color:#a16207;">This code is pre-applied — no need to type it manually.</p>
    </div>` : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#ea580c 0%,#f97316 100%);border-radius:12px 12px 0 0;padding:32px 36px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.75);">PRECISE GOVCON</p>
              <h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;line-height:1.2;">You're one step away!</h1>
              <p style="margin:10px 0 0 0;font-size:16px;color:rgba(255,255,255,0.85);">Activate your account to start finding federal contracts</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#ffffff;padding:36px 36px 28px 36px;">

              <p style="margin:0 0 16px 0;font-size:16px;color:#334155;">
                Hello <strong>${firstName}</strong>${company ? `, from <strong>${company}</strong>` : ''},
              </p>

              <p style="margin:0 0 20px 0;font-size:15px;color:#475569;line-height:1.6;">
                An account has been created for you on PreciseGovCon. To get started, click the button below to
                <strong>set your password and verify your email</strong> — it takes less than 60 seconds.
              </p>

              <!-- Plan badge -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:0 0 20px 0;">
                <tr>
                  <td style="padding:14px 18px;">
                    <span style="font-size:13px;color:#64748b;font-weight:600;">Your Plan: </span>
                    <span style="background:#0f172a;color:#f97316;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:3px 10px;border-radius:20px;">${tierLabel}</span>
                    <span style="font-size:13px;color:#10b981;font-weight:600;margin-left:12px;">✓ 7-Day Free Trial</span>
                  </td>
                </tr>
              </table>

              ${codeBlock}

              <!-- PRIMARY CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center">
                    <a href="${activationUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#ea580c,#f97316);color:#ffffff;text-decoration:none;font-size:17px;font-weight:800;padding:16px 40px;border-radius:10px;letter-spacing:0.02em;">
                      Set Password &amp; Activate Account →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- WHAT HAPPENS NEXT -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin:0 0 24px 0;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.06em;">What happens when you click:</p>
                    <ol style="margin:0;padding-left:20px;color:#15803d;font-size:14px;line-height:2.2;">
                      <li>Choose a secure password for your account</li>
                      <li>Your email is verified automatically</li>
                      <li>Your free trial activates immediately</li>
                      <li>You're signed in and ready to search contracts</li>
                    </ol>
                  </td>
                </tr>
              </table>

              <!-- EXPIRY WARNING -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px;">
                    <p style="margin:0;font-size:13px;color:#92400e;">
                      ⏰ <strong>This link expires in ${expiresIn}.</strong>
                      If it expires, contact us at <a href="mailto:support@precisegovcon.com" style="color:#b45309;font-weight:600;">support@precisegovcon.com</a> for a new link.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- FALLBACK LINK -->
              <p style="font-size:13px;color:#94a3b8;margin:0 0 8px 0;">Button not working? Copy and paste this link into your browser:</p>
              <p style="font-size:12px;word-break:break-all;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;color:#64748b;margin:0 0 24px 0;">${activationUrl}</p>

              <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 20px 0;" />

              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                If you didn't expect this email or have questions, contact us at
                <a href="mailto:support@precisegovcon.com" style="color:#ea580c;font-weight:600;">support@precisegovcon.com</a>.
                Do not share this activation link with anyone.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#0f172a;border-radius:0 0 12px 12px;padding:20px 36px;text-align:center;">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.4);">© 2025 PreciseGovCon · All rights reserved</p>
              <p style="margin:6px 0 0 0;font-size:12px;color:rgba(255,255,255,0.3);">This is an automated message — please do not reply directly to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const result = await sendEmail({
    to,
    subject,
    html,
    text: [
      `Hello ${firstName},`,
      '',
      `An account has been created for you on PreciseGovCon (${tierLabel} plan).`,
      '',
      'To activate your account and set your password, visit this link:',
      activationUrl,
      '',
      activationCode ? `Your activation code: ${activationCode} (already pre-applied in the link above)` : '',
      `This link expires in ${expiresIn}.`,
      '',
      'Questions? Email support@precisegovcon.com',
    ].filter(Boolean).join('\n'),
  });

  return result.success;
}