/**
 * Email Service for PreciseGovCon Admin Portal
 * Handles sending transactional emails to users and admins
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using a configured email service
 * Currently uses a mock implementation - replace with actual service (SendGrid, AWS SES, etc)
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // In production, replace this with your actual email service
    // Example services: SendGrid, AWS SES, Resend, Brevo, etc.

    // Mock email sending (logs to console and simulates success)
    console.log('📧 Email sent:');
    console.log(`   To: ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    console.log(`   HTML Body: ${options.html.substring(0, 100)}...`);

    // In production, uncomment and use your actual email service:
    /*
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: process.env.ADMIN_EMAIL || 'noreply@precisegovcon.com' },
        subject: options.subject,
        content: [{ type: 'text/html', value: options.html }],
      }),
    });

    return response.ok;
    */

    return true; // Mock success
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
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

  return sendEmail({
    to: userEmail,
    subject,
    html,
    text: `Welcome to PreciseGovCon! Your account has been created with ${planTier.toUpperCase()} tier. Login at ${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.precisegovcon.com'}/login`,
  });
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

  return sendEmail({
    to: adminEmail,
    subject,
    html,
    text: `New user ${userName} (${userEmail}) registered with ${planTier} tier.`,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  userEmail: string,
  userName: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.precisegovcon.com'}/reset-password?token=${resetToken}`;

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

  return sendEmail({
    to: userEmail,
    subject,
    html,
    text: `Reset your password here: ${resetUrl}`,
  });
}
