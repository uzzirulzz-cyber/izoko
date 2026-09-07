// Honest transactional email helper.
//
// Provider: Resend (https://resend.com) — chosen because it needs NO native
// dependency (plain fetch, works on Vercel serverless + local Node 18+).
//
// Configuration (server-side env only — never exposed to clients):
//   RESEND_API_KEY   → API key; when absent the function reports
//                      { sent: false, reason: "email_not_configured" } and the
//                      caller MUST fall back to in-app notifications.
//   EMAIL_FROM       → "PlayBeat Digital <noreply@playbeat.digital>" (optional;
//                      defaults to onboarding@resend.dev which Resend allows
//                      for testing).
//
// RED LINE: we never pretend an email was sent. The return value is always
// truthful and the caller is expected to persist an in-app notification when
// the send fails or is unconfigured.

export interface EmailResult {
  sent: boolean;
  reason?: string;
  providerId?: string;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, reason: "email_not_configured" };
  }
  const to = Array.isArray(opts.to) ? opts.to : [opts.to];
  if (!to.length || !opts.subject || !opts.html) {
    return { sent: false, reason: "invalid_params" };
  }
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "PlayBeat Digital <onboarding@resend.dev>",
        to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.text ? { text: opts.text } : {}),
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body: any = await res.json().catch(() => null);
      console.error("email send failed:", res.status, body?.message || body?.name);
      return { sent: false, reason: `provider_error_${res.status}` };
    }
    const data: any = await res.json().catch(() => ({}));
    return { sent: true, providerId: data?.id || undefined };
  } catch (err: any) {
    console.error("email send error:", err?.message);
    return { sent: false, reason: "network_error" };
  }
}

// ---------------------------------------------------------------------------
// Branded email templates (inline CSS — email clients strip <style> blocks)
// ---------------------------------------------------------------------------
const WRAP = (title: string, bodyHtml: string) => `
<div style="background:#f4f5f9;padding:24px 12px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e8f0;">
    <div style="background:linear-gradient(135deg,#0b1020,#1a2340);padding:22px 28px;">
      <div style="color:#f5b52e;font-weight:800;font-size:20px;letter-spacing:.4px;">PLAYBEAT DIGITAL</div>
      <div style="color:#aab3d0;font-size:12px;margin-top:2px;">Instant Licenses &amp; Smart 4K Cinema — playbeat.digital</div>
    </div>
    <div style="padding:26px 28px;color:#1c2333;">
      <h2 style="margin:0 0 12px;font-size:18px;color:#10162b;">${title}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:16px 28px;border-top:1px solid #eef0f6;color:#7a8299;font-size:11px;line-height:1.6;">
      PlayBeat Digital Private Limited — HOUSE 334, Street 6, Jinnahabad, Abbottabad, Pakistan<br/>
      Support: support@playbeat.digital · WhatsApp 24/7: +92 332 1049333
    </div>
  </div>
</div>`;

export function orderPaidEmail(order: any, itemsHtml: string, keysHtml: string): string {
  return WRAP(
    `Payment received — order ${order.orderNumber} confirmed`,
    `<p style="margin:0 0 10px;">Thank you, ${order.customerName || "customer"}! Your payment of
     <strong>PKR ${Number(order.totalAmount || 0).toLocaleString("en-PK")}</strong> was verified.</p>
     <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;">
       <thead><tr><th align="left" style="padding:6px 4px;border-bottom:2px solid #eef0f6;">Item</th>
       <th align="right" style="padding:6px 4px;border-bottom:2px solid #eef0f6;">Qty</th>
       <th align="right" style="padding:6px 4px;border-bottom:2px solid #eef0f6;">Amount</th></tr></thead>
       <tbody>${itemsHtml}</tbody>
     </table>
     ${keysHtml}
     <p style="margin:14px 0 0;">View your invoice and license keys any time in your PlayBeat account.</p>`
  );
}
