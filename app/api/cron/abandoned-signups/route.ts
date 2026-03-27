// app/api/cron/abandoned-signups/route.ts
// Re-engage users who created an account but never activated a trial or subscription
// Schedule: 0 14 * * * (2 PM daily)
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { sendAbandonedSignup } from "@/lib/email";

export const runtime = "nodejs";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Users created 24–48h ago with no trial and no subscription
    const users = await sql`
      SELECT u.id, u.email, COALESCE(u.first_name, 'there') AS first_name
      FROM users u
      WHERE u.created_at >= NOW() - INTERVAL '48 hours'
        AND u.created_at <  NOW() - INTERVAL '24 hours'
        AND (u.trial_active IS NULL OR u.trial_active = false)
        AND (u.plan_status IS NULL OR u.plan_status = '')
        AND u.email IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM email_events e
          WHERE e.user_id = u.id AND e.event_type = 'abandoned_signup'
        )
    `;

    let sent = 0;
    let failed = 0;

    for (const u of users) {
      try {
        await sendAbandonedSignup({
          to: u.email,
          name: u.first_name,
        });

        await sql`
          INSERT INTO email_events (user_id, event_type)
          VALUES (${u.id}, 'abandoned_signup')
          ON CONFLICT (user_id, event_type) DO NOTHING
        `;

        sent++;
      } catch (e: any) {
        console.error(`abandoned-signups: failed for ${u.email}:`, e?.message);
        failed++;
      }

      await new Promise((r) => setTimeout(r, 150));
    }

    console.log(`[cron/abandoned-signups] sent=${sent} failed=${failed}`);
    return NextResponse.json({ ok: true, sent, failed });
  } catch (e: any) {
    console.error("abandoned-signups cron error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 500 });
  }
}
