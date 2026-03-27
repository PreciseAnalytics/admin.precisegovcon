// lib/email/offerCodes.ts
// Offer code validation and application using neon SQL (matches real project pattern)
// offer_codes table: id, code, description, discount, type, usage_count, max_usage, expires_at, active
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export type CodeValidationResult =
  | { valid: true;  id: string; code: string; type: string; discount: string; trialDays: number }
  | { valid: false; reason: "not_found" | "expired" | "maxed_out" | "inactive" };

export async function validateOfferCode(code: string): Promise<CodeValidationResult> {
  const rows = await sql`
    SELECT id, code, type, discount, active, usage_count, max_usage, expires_at
    FROM offer_codes
    WHERE code = ${code.toUpperCase().trim()}
    LIMIT 1
  `;

  if (!rows.length) return { valid: false, reason: "not_found" };

  const r = rows[0];
  if (!r.active) return { valid: false, reason: "inactive" };
  if (r.expires_at && new Date(r.expires_at) < new Date()) return { valid: false, reason: "expired" };
  if (r.max_usage !== null && r.usage_count >= r.max_usage) return { valid: false, reason: "maxed_out" };

  const match = r.discount?.match(/(\d+)/);
  const trialDays = match ? parseInt(match[1]) : 14;

  return { valid: true, id: r.id, code: r.code, type: r.type, discount: r.discount, trialDays };
}

export async function applyOfferCode(codeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Re-validate then atomically increment
    const rows = await sql`
      UPDATE offer_codes
      SET usage_count = usage_count + 1,
          updated_at  = NOW()
      WHERE id = ${codeId}
        AND active = true
        AND (max_usage IS NULL OR usage_count < max_usage)
        AND (expires_at IS NULL OR expires_at > NOW())
      RETURNING id
    `;

    if (!rows.length) return { success: false, error: "Code no longer valid" };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}