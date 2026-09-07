// Audit log — every admin change to order status, products, permissions,
// coupons, CMS, reviews or inventory is written to the `audit_logs` collection.
//
// Shape: { actorEmail, actorName, actorRole, actorAuthority, actorId,
//          action, targetType, targetId, detail, meta, at }
//
// writeAudit NEVER throws — audit failures must not break the mutation that
// produced them. Entries are append-only (no update/delete endpoints).

import type { Db } from "mongodb";

export interface AuditEntry {
  actor?: any; // verified admin token payload (or { email } for system events)
  action: string; // e.g. "order.status_change", "product.create", "coupon.create"
  targetType: string; // "order" | "product" | "staff" | "coupon" | ...
  targetId?: string;
  detail?: string;
  meta?: Record<string, any>;
  source?: string; // "admin" | "webhook" | "system"
}

export async function writeAudit(db: Db, entry: AuditEntry): Promise<void> {
  try {
    const actor: any = entry.actor || {};
    await db.collection("audit_logs").insertOne({
      actorEmail: String(actor.email || "system"),
      actorName: String(actor.name || actor.email || "System"),
      actorRole: actor.role || (entry.source === "webhook" ? "webhook" : "system"),
      actorAuthority: actor.authority || (actor.role === "admin" ? "super_admin" : null),
      actorId: actor.id || null,
      action: String(entry.action || "").slice(0, 120),
      targetType: String(entry.targetType || "").slice(0, 60),
      targetId: entry.targetId ? String(entry.targetId).slice(0, 120) : null,
      detail: entry.detail ? String(entry.detail).slice(0, 500) : null,
      meta: entry.meta && typeof entry.meta === "object" ? entry.meta : {},
      source: entry.source || "admin",
      at: new Date(),
    });
  } catch (err: any) {
    console.error("audit log write failed (non-blocking):", err?.message);
  }
}
