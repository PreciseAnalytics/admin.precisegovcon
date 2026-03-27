// lib/email/sendEmailCampaign.ts
// Thin wrapper: validates email, calls Resend, returns result.
// Used by cron routes that need a one-off send outside of named functions.
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.RESEND_FROM_EMAIL || "Precise GovCon <noreply@precisegovcon.com>";

export type SendOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: { name: string; value: string }[];
};

export async function sendEmailCampaign(opts: SendOptions): Promise<{ id?: string; error?: string }> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(opts.to)) {
    return { error: "invalid_email" };
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    tags: opts.tags,
  });

  if (error) return { error: error.message };
  return { id: data?.id };
}
