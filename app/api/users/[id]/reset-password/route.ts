import { NextRequest, NextResponse } from 'next/server';
import { requireSession, hashPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logPasswordReset } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { newPassword } = resetPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { password: hashedPassword },
    });

    await logPasswordReset(session.id, params.id);

    // Send confirmation email (non-blocking)
    sendEmail({
      to: user.email,
      subject: '🔐 Password Changed Successfully',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
              .info { background: white; padding: 16px; border-radius: 6px; border-left: 4px solid #10b981; margin: 16px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">✅ Password Changed</h2>
              </div>
              <div class="content">
                <p>Hello ${user.name || 'User'},</p>
                <p>Your password has been successfully reset at ${new Date().toLocaleString()}.</p>
                <div class="info">
                  <p><strong>If you didn't make this change:</strong> Please contact support immediately.</p>
                  <p style="margin: 0; color: #666; font-size: 12px;">Support: support@precisegovcon.com</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Your password has been successfully reset.`,
    }).catch(error => {
      console.error('Failed to send password reset confirmation email:', error);
      // Don't fail the request if email fails
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
