export const dynamic = 'force-dynamic';

// app/api/test-email/route.ts

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await requireSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { to } = await request.json();

    if (!to) {
      return NextResponse.json(
        { error: 'Email recipient required' },
        { status: 400 }
      );
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'RESEND_API_KEY is not configured',
          message: 'Please add RESEND_API_KEY to your environment variables'
        },
        { status: 500 }
      );
    }

    // Send test email using your existing sendEmail function
    const result = await sendEmail({
      to,
      subject: 'Test Email from PreciseGovCon',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .success-badge { background: #dbeafe; color: #1e40af; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; margin-bottom: 20px; }
              .footer { text-align: center; padding-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">✅ Email Test Successful</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your email configuration is working!</p>
              </div>

              <div class="content">
                <center>
                  <div class="success-badge">
                    ✓ Resend Connected
                  </div>
                </center>

                <p>Hello,</p>

                <p>This is a test email from your PreciseGovCon application. If you're receiving this, your email configuration is working correctly!</p>

                <div style="background: white; padding: 16px; border-radius: 6px; border-left: 4px solid #ea580c; margin: 20px 0;">
                  <p><strong>📋 Test Details:</strong></p>
                  <p style="margin: 8px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                  <p style="margin: 8px 0;"><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
                  <p style="margin: 8px 0;"><strong>Resend API:</strong> Configured ✓</p>
                </div>

                <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666;">
                  This is an automated test message from your admin portal.
                </p>
              </div>

              <div class="footer">
                <p>© 2025 PreciseGovCon. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        ✅ Email Test Successful
        
        This is a test email from your PreciseGovCon application.
        
        If you're receiving this, your email configuration is working correctly!
        
        Time: ${new Date().toLocaleString()}
        Environment: ${process.env.NODE_ENV}
      `,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        resendId: result.resendId,
        to,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email',
          message: 'Check your Resend configuration and logs',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Email Test] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send test email',
      },
      { status: 500 }
    );
  }
}

// Simple GET endpoint to check if the route is accessible
export async function GET() {
  return NextResponse.json({
    message: 'Email test endpoint ready. Send a POST request with {"to": "email@example.com"}',
    status: 'ready',
  });
}
