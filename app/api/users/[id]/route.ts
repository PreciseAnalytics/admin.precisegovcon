// app/api/users/[id]/route.ts
//
// IMPORTANT: This uses prisma.user (singular) — the admin portal Prisma schema
// maps the User model to the "users" table via @@map("users"), but the Prisma
// client accessor is prisma.user (not prisma.users).

import { NextRequest, NextResponse } from 'next/server';
import { requireSession, hashPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logUserUpdate, logUserDeletion, createAuditLog } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

const updateUserSchema = z.object({
  email:        z.string().email().optional(),
  name:         z.string().optional(),
  firstName:    z.string().optional(),
  lastName:     z.string().optional(),
  company:      z.string().optional(),
  phone:        z.string().optional(),
  plan_tier:    z.string().optional(),
  plan_status:  z.string().optional(),
  is_active:    z.boolean().optional(),
  is_suspended: z.boolean().optional(),
});

// ── Helper: notify admin of user record changes ───────────────────────────────
async function notifyAdminOfUserUpdate(opts: {
  adminEmail: string;
  adminId:    string;
  userId:     string;
  userEmail:  string;
  userName:   string | null;
  changes:    Record<string, { from: unknown; to: unknown }>;
}) {
  const { adminEmail, adminId, userId, userEmail, userName, changes } = opts;

  const changesHtml = Object.entries(changes)
    .map(([field, { from, to }]) =>
      `<tr>
        <td style="padding:6px 12px;font-size:13px;font-weight:600;color:#64748b;width:140px;">${field}</td>
        <td style="padding:6px 12px;font-size:13px;color:#ef4444;text-decoration:line-through;">${String(from ?? '—')}</td>
        <td style="padding:6px 4px;font-size:13px;color:#64748b;">→</td>
        <td style="padding:6px 12px;font-size:13px;color:#16a34a;font-weight:700;">${String(to ?? '—')}</td>
      </tr>`
    )
    .join('');

  const adminPortalUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.precisegovcon.com';

  await sendEmail({
    to:      adminEmail,
    subject: `📝 User Updated: ${userName || userEmail}`,
    html: `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:24px 32px;">
            <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.5);text-transform:uppercase;">PreciseGovCon Admin</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:900;color:#fff;">User Account Updated</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 6px;font-size:13px;color:#64748b;">User</p>
            <p style="margin:0 0 20px;font-size:16px;font-weight:700;color:#0f172a;">${userName || 'Unnamed'} &lt;${userEmail}&gt;</p>
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Changes Made</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;">Field</th>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;">Before</th>
                  <th style="padding:8px 4px;"></th>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;">After</th>
                </tr>
              </thead>
              <tbody>${changesHtml}</tbody>
            </table>
            <p style="margin:20px 0 4px;font-size:12px;color:#94a3b8;">Changed by admin: ${adminId}</p>
            <p style="margin:0 0 20px;font-size:12px;color:#94a3b8;">At: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</p>
            <a href="${adminPortalUrl}/dashboard/users/${userId}"
               style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;">
              View User →
            </a>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">© ${new Date().getFullYear()} PreciseGovCon · Admin notification</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    text: `User Updated: ${userName || userEmail}\n\nChanges:\n${
      Object.entries(changes).map(([f, { from, to }]) => `  ${f}: ${from} → ${to}`).join('\n')
    }\n\nChanged by: ${adminId}\nView: ${adminPortalUrl}/dashboard/users/${userId}`,
  }).catch(err => console.error('Admin update notification failed (non-fatal):', err));
}

// ── GET /api/users/[id] ───────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSession();

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id:                     true,
        email:                  true,
        name:                   true,
        firstName:              true,
        lastName:               true,
        company:                true,
        phone:                  true,
        plan:                   true,
        plan_tier:              true,
        plan_status:            true,
        created_at:             true,
        updated_at:             true,
        last_login_at:          true,
        is_active:              true,
        is_suspended:           true,
        email_verified:         true,
        stripe_customer_id:     true,
        stripe_subscription_id: true,
        trial_active:           true,
        trial_expires_at:       true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// ── PATCH /api/users/[id] ─────────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let session: Awaited<ReturnType<typeof requireSession>> | null = null;

  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body    = await request.json();
    const updates = updateUserSchema.parse(body);

    // ── Fetch current state for diffing ──────────────────────────────────────
    const currentUser = await prisma.user.findUnique({
      where:  { id: params.id },
      select: {
        id:           true,
        email:        true,
        name:         true,
        firstName:    true,
        lastName:     true,
        company:      true,
        phone:        true,
        plan_tier:    true,
        plan_status:  true,
        is_active:    true,
        is_suspended: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ── Apply update ──────────────────────────────────────────────────────────
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data:  updates,
      select: {
        id:                     true,
        email:                  true,
        name:                   true,
        firstName:              true,
        lastName:               true,
        company:                true,
        phone:                  true,
        plan:                   true,
        plan_tier:              true,
        plan_status:            true,
        created_at:             true,
        updated_at:             true,
        last_login_at:          true,
        is_active:              true,
        is_suspended:           true,
        email_verified:         true,
        stripe_customer_id:     true,
        stripe_subscription_id: true,
        trial_active:           true,
        trial_expires_at:       true,
      },
    });

    // ── Audit log ─────────────────────────────────────────────────────────────
    try {
      await logUserUpdate(session.id, params.id, currentUser, updatedUser);

      if (updates.is_suspended !== undefined && updates.is_suspended !== currentUser.is_suspended) {
        await createAuditLog({
          adminUserId:   session.id,
          action:        updates.is_suspended ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
          entityType:    'User',
          entityId:      params.id,
          changesBefore: { is_suspended: currentUser.is_suspended },
          changesAfter:  { is_suspended: updates.is_suspended },
        });
      }

      if (updates.is_active !== undefined && updates.is_active !== currentUser.is_active) {
        await createAuditLog({
          adminUserId:   session.id,
          action:        updates.is_active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
          entityType:    'User',
          entityId:      params.id,
          changesBefore: { is_active: currentUser.is_active },
          changesAfter:  { is_active: updates.is_active },
        });
      }
    } catch (auditError) {
      console.error('Audit log failed (non-fatal):', auditError);
    }

    // ── Admin notification on significant field changes ────────────────────────
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (adminEmail) {
      const TRACKED: Array<keyof typeof updates> = [
        'plan_tier', 'plan_status', 'is_active', 'is_suspended', 'email',
      ];
      const changedFields: Record<string, { from: unknown; to: unknown }> = {};

      for (const field of TRACKED) {
        if (updates[field] === undefined) continue;
        const currentVal = (currentUser as Record<string, unknown>)[field];
        const newVal     = updates[field];
        if (currentVal !== newVal) {
          changedFields[field] = { from: currentVal, to: newVal };
        }
      }

      if (Object.keys(changedFields).length > 0) {
        notifyAdminOfUserUpdate({
          adminEmail,
          adminId:   session.id,
          userId:    params.id,
          userEmail: updatedUser.email,
          userName:  updatedUser.name,
          changes:   changedFields,
        });
      }
    }

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// ── DELETE /api/users/[id] ────────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let session: Awaited<ReturnType<typeof requireSession>> | null = null;

  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where:  { id: params.id },
      select: { id: true, email: true, name: true, company: true, plan_tier: true, plan_status: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Clean up verification tokens first to avoid FK constraint errors
    await prisma.email_verification_tokens.deleteMany({
      where: { user_id: params.id },
    }).catch(() => {});

    await prisma.user.delete({ where: { id: params.id } });

    try {
      await logUserDeletion(session.id, params.id, user);
    } catch (auditError) {
      console.error('Audit log failed (non-fatal):', auditError);
    }

    // Admin notification
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (adminEmail) {
      sendEmail({
        to:      adminEmail,
        subject: `🗑️ User Deleted: ${user.name || user.email}`,
        html:    `<p>Admin <strong>${session.id}</strong> deleted user <strong>${user.name || 'Unnamed'}</strong> (${user.email}) at ${new Date().toLocaleString()}.</p>`,
        text:    `Admin ${session.id} deleted user ${user.email} at ${new Date().toLocaleString()}.`,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}