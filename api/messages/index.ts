// /api/messages/* — Message Box & Live Support (consolidated router)
//
// Powers two linked experiences on top of the same chat storage:
//   1. LIVE SUPPORT (storefront ↔ admin): customers open a chat from the
//      storefront bubble (or Account drawer); staff view, read and reply from
//      the admin Message Box in real time (polling).
//   2. STAFF MESSAGE BOX (admin ↔ admin): employees exchange direct messages
//      with each other and with customer accounts.
//
// Routes:
//   POST /api/messages/start                        (visitor/customer: open live chat)
//   GET  /api/messages/mine?conversationId=&since=  (visitor/customer: poll own thread)
//   POST /api/messages/mine                         (visitor/customer: send message)
//   GET  /api/messages/conversations                (admin: inbox list w/ unread counts)
//   GET  /api/messages/conversations/:id            (admin: open thread, mark read)
//   POST /api/messages/conversations/:id/reply      (admin: staff reply)
//   PUT  /api/messages/conversations/:id            (admin: status / assign)
//   GET  /api/messages/staff-dm                     (admin: my staff DM threads)
//   POST /api/messages/staff-dm                     (admin: send staff direct message)
//   GET  /api/messages/unread-count                 (admin: sidebar badge)
//   POST /api/messages/bot                          (visitor/customer: ONE customer bot — catalog-grounded instant answers)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { getDb } from "../_lib/mongo.js";
import {
  handleOptions,
  jsonOk,
  jsonError,
  requireAdmin,
  verifyUser,
  verifyAdmin,
  AuthenticatedRequest,
} from "../_lib/auth.js";
import { handleCustomerBot } from "../_lib/customerBot.js";
import { writeAudit } from "../_lib/audit.js";

// ---------------------------------------------------------------------------
// SUPPORT TICKET STATE MACHINE (extends the live-support conversations)
//   open → pending → in_progress → resolved → closed
// with sensible escape hatches (reopen) — see ALLOWED_TICKET_TRANSITIONS.
// Every transition is appended to the conversation's `ticketEvents` feed.
// ---------------------------------------------------------------------------
const TICKET_STATES = ["open", "pending", "in_progress", "resolved", "closed"] as const;
type TicketState = (typeof TICKET_STATES)[number];

const ALLOWED_TICKET_TRANSITIONS: Record<TicketState, TicketState[]> = {
  open: ["pending", "in_progress", "resolved", "closed"],
  pending: ["in_progress", "resolved", "closed", "open"],
  in_progress: ["pending", "resolved", "closed"],
  resolved: ["closed", "in_progress", "open"], // reopen when the customer disagrees
  closed: ["open"], // reopen
};
const TICKET_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);

type ChatMessage = {
  conversationId: ObjectId;
  senderType: "customer" | "staff" | "system";
  senderId?: string | null;
  senderName: string;
  senderEmail?: string | null;
  body: string;
  createdAt: Date;
  readAt?: Date | null;
};

function isTicketState(v: any): v is TicketState {
  return TICKET_STATES.includes(v as TicketState);
}

function serialize(conv: any) {
  if (!conv) return null;
  return {
    id: conv._id?.toString(),
    type: conv.type,
    status: conv.status || "open",
    ticketPriority: conv.ticketPriority || "normal",
    ticketStateUpdatedAt: conv.ticketStateUpdatedAt || null,
    subject: conv.subject || "",
    customer: conv.customer || null,
    staff: conv.staff || null,
    participants: conv.participants || [],
    lastMessage: conv.lastMessage || null,
    unreadForStaff: conv.unreadForStaff || 0,
    unreadForCustomer: conv.unreadForCustomer || 0,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
  };
}

function serializeMsg(m: any) {
  return {
    id: m._id?.toString(),
    senderType: m.senderType,
    senderName: m.senderName,
    senderEmail: m.senderEmail || null,
    body: m.body,
    createdAt: m.createdAt,
    readAt: m.readAt || null,
  };
}

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const url = new URL(req.url || "", "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  const pathSegments = parts.slice(2); // drop api/messages
  const route = pathSegments.join("/").toLowerCase();

  const db = await getDb();
  const convCol = db.collection("chat_conversations");
  const msgCol = db.collection("chat_messages");

  // Helper: verify admin OR user token for CRM routes
  const verifyCrmAuth = (req: AuthenticatedRequest) => {
    const admin = verifyAdmin(req);
    if (admin) return admin;
    return verifyUser(req);
  };

  // ===========================================================================
  // CRM ROUTES — calls, notes, tasks, followups, timeline, employees, inbox
  // Routed under /api/messages/crm/* to stay within Vercel Hobby 12-function limit
  // ===========================================================================
  if (pathSegments[0] === "crm") {
    const crmPath = pathSegments.slice(1).join("/").toLowerCase();
    const crmSegs = crmPath.split("/").filter(Boolean);

    // DEAL PIPELINE — persistent CRM deals used by both embedded CRM views
    const dealStages: any[] = [
      { id: "inbound", name: "New Inbound", color: "#38bdf8", badgeBg: "bg-sky-500/15 text-sky-700 border-sky-500/30", probability: 15, description: "Newly added prospect accounts" },
      { id: "contacted", name: "Contacted", color: "#06b6d4", badgeBg: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30", probability: 30, description: "Outreach is in progress" },
      { id: "qualified", name: "Qualified", color: "#6366f1", badgeBg: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30", probability: 55, description: "Buying need and contact have been confirmed" },
      { id: "demo", name: "Pitch / Demo", color: "#a855f7", badgeBg: "bg-purple-500/15 text-purple-700 border-purple-500/30", probability: 75, description: "A product discussion or demo is scheduled" },
      { id: "proposal", name: "Proposal", color: "#f59e0b", badgeBg: "bg-amber-500/15 text-amber-700 border-amber-500/30", probability: 90, description: "A commercial proposal is under review" },
      { id: "won", name: "Closed Won", color: "#10b981", badgeBg: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", probability: 100, description: "The customer has accepted the agreement" },
      { id: "lost", name: "Closed Lost", color: "#f43f5e", badgeBg: "bg-rose-500/15 text-rose-700 border-rose-500/30", probability: 0, description: "The opportunity did not close" },
    ];
    const serializeDeal = (deal: any) => ({ ...deal, id: String(deal._id || deal.id), _id: String(deal._id || deal.id) });
    const serializeTask = (task: any) => ({
      ...task, id: String(task._id || task.id), _id: String(task._id || task.id),
      completed: task.status === "COMPLETED" || task.completed === true,
      assignedTo: task.assignedTo || task.employeeName || "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : "",
    });
    const logDealActivity = async (activity: any) => {
      await db.collection("crm_activities").insertOne({ ...activity, timestamp: new Date() });
    };
    if (crmSegs[0] === "pipeline" && req.method === "GET") {
      const user = await verifyCrmAuth(req);
      if (!user) return jsonError(res, "Unauthorized", 401);
      const [rawDeals, rawTasks, activities] = await Promise.all([
        db.collection("crm_deals").find({}).sort({ updatedAt: -1 }).limit(500).toArray(),
        db.collection("crm_tasks").find({}).sort({ updatedAt: -1 }).limit(300).toArray(),
        db.collection("crm_activities").find({}).sort({ timestamp: -1 }).limit(100).toArray(),
      ]);
      const deals = rawDeals.map(serializeDeal);
      const tasks = rawTasks.map(serializeTask);
      const active = deals.filter((deal: any) => !["won", "lost"].includes(deal.stage));
      const won = deals.filter((deal: any) => deal.stage === "won");
      const totalPipelineValue = active.reduce((sum: number, deal: any) => sum + (Number(deal.value) || 0), 0);
      const weightedForecastValue = active.reduce((sum: number, deal: any) => sum + (Number(deal.value) || 0) * (Number(deal.probability) || 0) / 100, 0);
      const wonRevenue = won.reduce((sum: number, deal: any) => sum + (Number(deal.value) || 0), 0);
      const repMap = new Map<string, any>();
      deals.forEach((deal: any) => {
        const name = deal.assignedRepName || "Unassigned";
        const rep = repMap.get(name) || { seatId: deal.assignedSeatId || name, name, role: "CRM team member", avatarBg: "bg-slate-100 text-slate-700", assignedDeals: 0, wonDeals: 0, pipelineValue: 0, wonValue: 0, quotaAttainment: 0, conversionRate: 0, callsCount: 0 };
        rep.assignedDeals++;
        if (deal.stage === "won") { rep.wonDeals++; rep.wonValue += Number(deal.value) || 0; }
        else if (deal.stage !== "lost") rep.pipelineValue += Number(deal.value) || 0;
        rep.conversionRate = rep.assignedDeals ? Math.round(rep.wonDeals / rep.assignedDeals * 1000) / 10 : 0;
        repMap.set(name, rep);
      });
      return jsonOk(res, {
        stages: dealStages, deals, tasks, activities,
        reps: [...repMap.values()],
        kpis: {
          totalPipelineValue, weightedForecastValue, wonRevenue,
          activeDealsCount: active.length, wonDealsCount: won.length,
          averageDealSize: deals.length ? Math.round((totalPipelineValue + wonRevenue) / deals.length) : 0,
          overallConversionRate: deals.length ? Math.round(won.length / deals.length * 1000) / 10 : 0,
          avgSalesCycleDays: 0,
        },
      });
    }
    if (crmSegs[0] === "deals" && crmSegs.length === 1 && req.method === "POST") {
      const user = await verifyCrmAuth(req);
      if (!user) return jsonError(res, "Unauthorized", 401);
      const body = req.body || {};
      const dealName = String(body.dealName || "").trim();
      const companyName = String(body.companyName || "").trim();
      const value = Number(body.value);
      if (!dealName || !companyName) return jsonError(res, "Deal and company names are required", 400);
      if (!Number.isFinite(value) || value < 0) return jsonError(res, "Deal value must be a valid non-negative number", 400);
      const stage = dealStages.find((item) => item.id === body.stage)?.id || "inbound";
      const probability = dealStages.find((item) => item.id === stage)?.probability || 0;
      const now = new Date();
      const deal = {
        dealName, companyName, value, currency: body.currency === "PKR" ? "PKR" : "USD",
        stage, probability, leadId: body.leadId ? String(body.leadId) : undefined,
        contactPerson: String(body.contactPerson || ""), contactEmail: String(body.contactEmail || ""),
        contactPhone: String(body.contactPhone || ""), expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
        assignedRepName: body.assignedRepName || user.name || user.email,
        assignedSeatId: body.assignedSeatId || null, source: body.source || "Admin CRM",
        priority: body.priority || "MEDIUM", tags: Array.isArray(body.tags) ? body.tags : [],
        notes: String(body.notes || ""), createdBy: user.id, createdAt: now, updatedAt: now,
        lastActivity: "Deal created in PlayBeat CRM",
      };
      const result = await db.collection("crm_deals").insertOne(deal);
      await logDealActivity({ actor: deal.assignedRepName, action: `Created deal: ${deal.dealName}`, dealName, value, type: "DEAL_CREATED" });
      return jsonOk(res, { success: true, deal: serializeDeal({ ...deal, _id: result.insertedId }) }, 201);
    }
    if (crmSegs[0] === "deals" && crmSegs.length === 2 && req.method === "PATCH") {
      const user = await verifyCrmAuth(req);
      if (!user) return jsonError(res, "Unauthorized", 401);
      if (!ObjectId.isValid(crmSegs[1])) return jsonError(res, "Invalid deal id", 400);
      const id = new ObjectId(crmSegs[1]);
      const before = await db.collection("crm_deals").findOne({ _id: id });
      if (!before) return jsonError(res, "Deal not found", 404);
      const body = req.body || {};
      const update: any = { updatedAt: new Date() };
      if (body.stage !== undefined) {
        const stage = dealStages.find((item) => item.id === body.stage);
        if (!stage) return jsonError(res, "Invalid deal stage", 400);
        update.stage = stage.id; update.probability = stage.probability;
        update.lastActivity = `Stage changed from ${before.stage} to ${stage.id}`;
      }
      if (body.dealName !== undefined) update.dealName = String(body.dealName).trim();
      if (body.companyName !== undefined) update.companyName = String(body.companyName).trim();
      if (body.value !== undefined) {
        const value = Number(body.value);
        if (!Number.isFinite(value) || value < 0) return jsonError(res, "Deal value must be a valid non-negative number", 400);
        update.value = value;
      }
      await db.collection("crm_deals").updateOne({ _id: id }, { $set: update });
      if (update.stage && update.stage !== before.stage) {
        await logDealActivity({ actor: before.assignedRepName || user.name, action: `Moved ${before.dealName} to ${update.stage}`, dealName: before.dealName, stageFrom: before.stage, stageTo: update.stage, value: before.value, type: update.stage === "won" ? "DEAL_WON" : "STAGE_CHANGE" });
      }
      const deal = await db.collection("crm_deals").findOne({ _id: id });
      return jsonOk(res, { success: true, deal: serializeDeal(deal) });
    }
    if (crmSegs[0] === "convert-lead" && req.method === "POST") {
      const user = await verifyCrmAuth(req);
      if (!user) return jsonError(res, "Unauthorized", 401);
      const body = req.body || {};
      const lead = body.lead || {};
      const companyName = String(lead.companyName || body.companyName || "").trim();
      const dealName = String(body.dealName || (companyName ? `${companyName} - Enterprise Contract` : "")).trim();
      const value = Number(body.value);
      if (!lead.id || !companyName || !dealName || !Number.isFinite(value) || value < 0) return jsonError(res, "A valid lead, deal name, and deal value are required", 400);
      const stage = dealStages[0];
      const now = new Date();
      const deal = {
        leadId: String(lead.id), dealName, companyName, value, currency: "USD",
        stage: stage.id, probability: stage.probability, contactPerson: lead.contactPerson?.name || "",
        contactEmail: lead.email || "", contactPhone: lead.phone || "", expectedCloseDate: null,
        assignedRepName: lead.assignedEmployeeName || user.name || user.email,
        assignedSeatId: lead.assignedSeatId || null, source: lead.discoverySource || lead.sourceCategory || "Lead conversion",
        priority: lead.emailVerified || lead.isVerifiedMatch ? "HIGH" : "MEDIUM", tags: [],
        notes: "Converted from the embedded lead and customer workspace.",
        createdBy: user.id, createdAt: now, updatedAt: now, lastActivity: "Lead converted to deal",
      };
      const result = await db.collection("crm_deals").insertOne(deal);
      await logDealActivity({ actor: deal.assignedRepName, action: `Converted lead to deal: ${dealName}`, dealName, value, type: "DEAL_CREATED" });
      return jsonOk(res, { success: true, deal: serializeDeal({ ...deal, _id: result.insertedId }) }, 201);
    }

    // CALLS: list
    if (crmSegs[0] === "calls" && crmSegs.length === 1 && req.method === "GET") {
      const filter: any = {};
      if (url.searchParams.get("direction")) filter.direction = url.searchParams.get("direction");
      if (url.searchParams.get("status")) filter.status = url.searchParams.get("status");
      const calls = await db.collection("crm_calls").find(filter).sort({ startedAt: -1 }).limit(200).toArray();
      const all = await db.collection("crm_calls").countDocuments();
      const incoming = await db.collection("crm_calls").countDocuments({ direction: "INBOUND" });
      const outgoing = await db.collection("crm_calls").countDocuments({ direction: "OUTBOUND" });
      const missed = await db.collection("crm_calls").countDocuments({ status: "MISSED" });
      return jsonOk(res, { calls, counts: { all, incoming, outgoing, missed, voicemail: 0 } });
    }
    // CALLS: initiate
    if (crmSegs[0] === "calls" && crmSegs.length === 1 && req.method === "POST") {
      const user = await verifyCrmAuth(req);
      if (!user) return jsonError(res, "Unauthorized", 401);
      const { to, leadId, leadName, leadPhone } = req.body || {};
      if (!to) return jsonError(res, "to required", 400);
      const call = { leadId: leadId||null, leadName: leadName||null, leadPhone: leadPhone||null, employeeId: user.id, employeeName: user.name||user.email, direction: "OUTBOUND", status: "INITIATING", phone: to, channel: "TELEPHONY", durationSec: 0, outcome: null, outcomeNotes: null, provider: "mock", providerCallId: null, startedAt: new Date(), connectedAt: null, endedAt: null, createdAt: new Date() };
      const result = await db.collection("crm_calls").insertOne(call);
      const callId = String(result.insertedId);
      setTimeout(async () => { try { await db.collection("crm_calls").updateOne({ _id: result.insertedId }, { $set: { status: "RINGING" } }) } catch {} }, 1000);
      setTimeout(async () => { try { const c = await db.collection("crm_calls").findOne({ _id: result.insertedId }); if (c?.status === "RINGING") await db.collection("crm_calls").updateOne({ _id: result.insertedId }, { $set: { status: "CONNECTED", connectedAt: new Date() } }) } catch {} }, 3000);
      return jsonOk(res, { callId, providerCallId: `mock_${callId}`, provider: "mock" });
    }
    // CALLS: get single
    if (crmSegs[0] === "calls" && crmSegs.length === 2 && req.method === "GET") {
      const call = await db.collection("crm_calls").findOne({ _id: new ObjectId(crmSegs[1]) });
      if (!call) return jsonError(res, "Call not found", 404);
      return jsonOk(res, { call });
    }
    // CALLS: end
    if (crmSegs[0] === "calls" && crmSegs.length === 3 && crmSegs[2] === "end" && req.method === "POST") {
      const user = await verifyCrmAuth(req);
      if (!user) return jsonError(res, "Unauthorized", 401);
      const call = await db.collection("crm_calls").findOne({ _id: new ObjectId(crmSegs[1]) });
      if (!call) return jsonError(res, "Call not found", 404);
      const endedAt = new Date();
      const durationSec = call.connectedAt ? Math.floor((endedAt.getTime() - new Date(call.connectedAt as any).getTime()) / 1000) : 0;
      const { outcome, notes, nextFollowupAt } = req.body || {};
      await db.collection("crm_calls").updateOne({ _id: new ObjectId(crmSegs[1]) }, { $set: { status: "ENDED", endedAt, durationSec, outcome: outcome||null, outcomeNotes: notes||null, nextFollowupAt: nextFollowupAt ? new Date(nextFollowupAt) : null } });
      if (nextFollowupAt && call.leadId) { await db.collection("crm_followups").insertOne({ leadId: call.leadId, leadName: call.leadName, employeeId: call.employeeId, employeeName: call.employeeName, scheduledAt: new Date(nextFollowupAt), channel: "CALL", status: "SCHEDULED", notes: notes||`Follow-up (${outcome||"none"})`, callId: String(call._id), createdAt: new Date(), updatedAt: new Date() }) }
      return jsonOk(res, { ok: true, durationSec });
    }
    // CALLS: patch
    if (crmSegs[0] === "calls" && crmSegs.length === 2 && req.method === "PATCH") {
      const user = await verifyCrmAuth(req);
      if (!user) return jsonError(res, "Unauthorized", 401);
      const update: any = {};
      for (const k of ["status","outcome","outcomeNotes"]) { if ((req.body||{})[k] !== undefined) update[k] = req.body[k] }
      if (Object.keys(update).length) await db.collection("crm_calls").updateOne({ _id: new ObjectId(crmSegs[1]) }, { $set: update });
      return jsonOk(res, { ok: true });
    }

    // NOTES
    if (crmSegs[0] === "notes") {
      if (req.method === "GET") {
        const leadId = url.searchParams.get("leadId"); if (!leadId) return jsonError(res, "leadId required", 400);
        const notes = await db.collection("crm_notes").find({ leadId }).sort({ createdAt: -1 }).limit(100).toArray();
        return jsonOk(res, { notes });
      }
      if (req.method === "POST") {
        const user = await verifyCrmAuth(req); if (!user) return jsonError(res, "Unauthorized", 401);
        const { leadId, body: noteBody } = req.body || {}; if (!leadId || !noteBody) return jsonError(res, "leadId and body required", 400);
        const note = { leadId, body: noteBody, employeeId: user.id, employeeName: user.name||user.email, createdAt: new Date(), updatedAt: new Date() };
        const result = await db.collection("crm_notes").insertOne(note);
        return jsonOk(res, { note: { ...note, _id: result.insertedId } });
      }
    }

    // TASKS — shared by the current CRM and the embedded source CRM
    if (crmSegs[0] === "tasks") {
      if (req.method === "GET") {
        const filter: any = {}; const leadId = url.searchParams.get("leadId"); const status = url.searchParams.get("status");
        if (leadId) filter.leadId = leadId; if (status) filter.status = status;
        const tasks = await db.collection("crm_tasks").find(filter).sort({ dueDate: 1, createdAt: -1 }).limit(300).toArray();
        return jsonOk(res, { tasks: tasks.map(serializeTask) });
      }
      if (req.method === "POST") {
        const user = await verifyCrmAuth(req); if (!user) return jsonError(res, "Unauthorized", 401);
        const body = req.body || {}; const title = String(body.title || "").trim();
        if (!title) return jsonError(res, "title required", 400);
        const dueDate = body.dueDate ? new Date(body.dueDate) : null;
        if (dueDate && Number.isNaN(dueDate.getTime())) return jsonError(res, "Invalid dueDate", 400);
        const task = {
          title, description: body.description || null, type: body.type || "FOLLOW_UP",
          leadId: body.leadId ? String(body.leadId) : null, dealId: body.dealId ? String(body.dealId) : null,
          companyName: body.companyName || null, assignedTo: body.assignedTo || user.name || user.email,
          employeeId: user.id, employeeName: user.name || user.email,
          dueDate, dueTime: body.dueTime || null, priority: body.priority || "NORMAL",
          status: "OPEN", createdAt: new Date(), updatedAt: new Date(),
        };
        const result = await db.collection("crm_tasks").insertOne(task);
        return jsonOk(res, { success: true, task: serializeTask({ ...task, _id: result.insertedId }) }, 201);
      }
      if (req.method === "PATCH" && crmSegs[1] && crmSegs[2] === "toggle") {
        const user = await verifyCrmAuth(req); if (!user) return jsonError(res, "Unauthorized", 401);
        if (!ObjectId.isValid(crmSegs[1])) return jsonError(res, "Invalid task id", 400);
        const id = new ObjectId(crmSegs[1]); const task = await db.collection("crm_tasks").findOne({ _id: id });
        if (!task) return jsonError(res, "Task not found", 404);
        const status = task.status === "COMPLETED" ? "OPEN" : "COMPLETED";
        await db.collection("crm_tasks").updateOne({ _id: id }, { $set: { status, updatedAt: new Date(), completedAt: status === "COMPLETED" ? new Date() : null } });
        if (status === "COMPLETED") await logDealActivity({ actor: task.assignedTo || task.employeeName || user.name, action: `Completed task: ${task.title}`, dealName: task.companyName || "Sales task", type: "TASK_COMPLETED" });
        const updated = await db.collection("crm_tasks").findOne({ _id: id });
        return jsonOk(res, { success: true, task: serializeTask(updated) });
      }
      if (req.method === "PUT" && crmSegs[1]) {
        const user = await verifyCrmAuth(req); if (!user) return jsonError(res, "Unauthorized", 401);
        if (!ObjectId.isValid(crmSegs[1])) return jsonError(res, "Invalid task id", 400);
        const update: any = { updatedAt: new Date() };
        for (const key of ["title", "description", "status", "priority"]) if ((req.body || {})[key] !== undefined) update[key] = (req.body || {})[key];
        if ((req.body || {}).dueDate !== undefined) update.dueDate = (req.body || {}).dueDate ? new Date((req.body || {}).dueDate) : null;
        await db.collection("crm_tasks").updateOne({ _id: new ObjectId(crmSegs[1]) }, { $set: update });
        return jsonOk(res, { ok: true });
      }
      if (req.method === "DELETE" && crmSegs[1]) {
        const user = await verifyCrmAuth(req); if (!user) return jsonError(res, "Unauthorized", 401);
        if (!ObjectId.isValid(crmSegs[1])) return jsonError(res, "Invalid task id", 400);
        await db.collection("crm_tasks").deleteOne({ _id: new ObjectId(crmSegs[1]) });
        return jsonOk(res, { ok: true });
      }
    }

    // FOLLOWUPS
    if (crmSegs[0] === "followups") {
      if (req.method === "GET") {
        const filter: any = {}; const leadId = url.searchParams.get("leadId"); const status = url.searchParams.get("status"); const upcoming = url.searchParams.get("upcoming") === "true";
        if (leadId) filter.leadId = leadId; if (status) filter.status = status;
        if (upcoming) { filter.status = "SCHEDULED"; filter.scheduledAt = { $gte: new Date() } }
        const followups = await db.collection("crm_followups").find(filter).sort({ scheduledAt: 1 }).limit(200).toArray();
        return jsonOk(res, { followups });
      }
      if (req.method === "POST") {
        const user = await verifyCrmAuth(req); if (!user) return jsonError(res, "Unauthorized", 401);
        const { leadId, leadName, scheduledAt, channel, notes } = req.body || {}; if (!leadId || !scheduledAt) return jsonError(res, "leadId and scheduledAt required", 400);
        const followup = { leadId, leadName: leadName||null, employeeId: user.id, employeeName: user.name||user.email, scheduledAt: new Date(scheduledAt), channel: channel||"WHATSAPP", status: "SCHEDULED", notes: notes||null, createdAt: new Date(), updatedAt: new Date() };
        const result = await db.collection("crm_followups").insertOne(followup);
        return jsonOk(res, { followup: { ...followup, _id: result.insertedId } });
      }
      if (req.method === "PUT" && crmSegs[1]) {
        const user = await verifyCrmAuth(req); if (!user) return jsonError(res, "Unauthorized", 401);
        const update: any = { updatedAt: new Date() };
        for (const k of ["status","notes","channel"]) { if ((req.body||{})[k] !== undefined) update[k] = req.body[k] }
        if ((req.body||{}).scheduledAt !== undefined) update.scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : null;
        await db.collection("crm_followups").updateOne({ _id: new ObjectId(crmSegs[1]) }, { $set: update });
        return jsonOk(res, { ok: true });
      }
    }

    // TIMELINE
    if (crmSegs[0] === "timeline" && crmSegs[1]) {
      const leadId = crmSegs[1];
      const [messages, calls, notes, tasks, followups] = await Promise.all([
        db.collection("chat_messages").find({ leadId }).sort({ createdAt: 1 }).limit(100).toArray().catch(() => []),
        db.collection("crm_calls").find({ leadId }).sort({ startedAt: 1 }).limit(100).toArray().catch(() => []),
        db.collection("crm_notes").find({ leadId }).sort({ createdAt: 1 }).limit(100).toArray().catch(() => []),
        db.collection("crm_tasks").find({ leadId }).sort({ createdAt: 1 }).limit(100).toArray().catch(() => []),
        db.collection("crm_followups").find({ leadId }).sort({ scheduledAt: 1 }).limit(100).toArray().catch(() => []),
      ]);
      const events: any[] = [];
      for (const m of messages) events.push({ id: `msg_${m._id}`, type: m.direction === "INBOUND" ? "MESSAGE_RECEIVED" : "MESSAGE_SENT", timestamp: m.createdAt, title: `Message ${m.direction === "INBOUND" ? "received" : "sent"}`, description: m.body });
      for (const c of calls) events.push({ id: `call_${c._id}`, type: "CALL", timestamp: c.startedAt, title: `${c.direction === "INBOUND" ? "Incoming" : "Outbound"} call`, description: `Duration: ${c.durationSec||0}s` });
      for (const n of notes) events.push({ id: `note_${n._id}`, type: "NOTE", timestamp: n.createdAt, title: `Note by ${n.employeeName}`, description: n.body });
      for (const t of tasks) events.push({ id: `task_${t._id}`, type: "TASK", timestamp: t.createdAt, title: t.title, description: t.description });
      for (const f of followups) events.push({ id: `followup_${f._id}`, type: "FOLLOWUP", timestamp: f.scheduledAt, title: `Follow-up (${f.channel})`, description: f.notes });
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const grouped: any[] = [];
      for (const ev of events) { const dayKey = new Date(ev.timestamp).toISOString().slice(0, 10); let group = grouped.find(g => g.date === dayKey); if (!group) { group = { date: dayKey, events: [] }; grouped.push(group) } group.events.push(ev) }
      return jsonOk(res, { timeline: grouped, totalCount: events.length });
    }

    // EMPLOYEES
    if (crmSegs[0] === "employees" && req.method === "GET") {
      const users = await db.collection("users").find({ active: true }).sort({ name: 1 }).toArray();
      const employees = await Promise.all(users.map(async (u: any) => {
        const [callsMade, messagesSent, followupsScheduled, activeTasks] = await Promise.all([
          db.collection("crm_calls").countDocuments({ employeeId: String(u._id), direction: "OUTBOUND" }),
          db.collection("chat_messages").countDocuments({ senderType: "staff" }),
          db.collection("crm_followups").countDocuments({ employeeId: String(u._id) }),
          db.collection("crm_tasks").countDocuments({ employeeId: String(u._id), status: { $in: ["OPEN", "IN_PROGRESS"] } }),
        ]);
        return { id: String(u._id), email: u.email, name: u.name, role: u.role, title: u.title, availability: u.availability || "OFFLINE", stats: { callsMade, messagesSent, followupsScheduled, activeTasks } };
      }));
      return jsonOk(res, { employees });
    }

    // INBOX
    if (crmSegs[0] === "inbox" && req.method === "GET") {
      const filter = url.searchParams.get("filter") || "all";
      const search = url.searchParams.get("search") || "";
      const conversations = await convCol.find({}).sort({ lastMessageAt: -1 }).limit(100).toArray();
      const items = conversations.map((c: any) => ({ kind: "conversation", id: String(c._id), leadId: c.customerId, name: c.customerName || c.customerPhone || "Unknown", phone: c.customerPhone, lastMessage: c.lastMessage || "", lastActivity: c.lastMessageAt || c.createdAt, unreadCount: c.unreadCount || 0, channel: c.channel || "WHATSAPP", status: c.status || "ACTIVE" }));
      let filtered = items;
      if (filter === "unread") filtered = items.filter(i => i.unreadCount > 0);
      if (filter === "whatsapp") filtered = items.filter(i => i.channel === "WHATSAPP");
      if (search) { const s = search.toLowerCase(); filtered = filtered.filter(i => (i.name || "").toLowerCase().includes(s)) }
      filtered.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
      return jsonOk(res, { items: filtered, total: filtered.length });
    }

    // ─── WHATSAPP SEND — send real WhatsApp message via Cloud API ────
    if (crmSegs[0] === "whatsapp-send" && req.method === "POST") {
      const user = await verifyCrmAuth(req);
      if (!user) return jsonError(res, "Unauthorized", 401);
      const { to, text } = req.body || {};
      if (!to) return jsonError(res, "Recipient phone number required", 400);
      if (!text) return jsonError(res, "Message text required", 400);

      // Get WhatsApp config from env + DB
      let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
      let accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
      let graphVersion = process.env.WHATSAPP_GRAPH_VERSION || "v25.0";

      try {
        const waDoc = await db.collection("whatsapp_config").findOne({});
        if (waDoc) {
          if (waDoc.phoneNumberId) phoneNumberId = waDoc.phoneNumberId;
          if (waDoc.accessToken) accessToken = waDoc.accessToken;
          if (waDoc.graphVersion) graphVersion = waDoc.graphVersion;
        }
      } catch {}

      if (!phoneNumberId || !accessToken) {
        return jsonError(res, "WhatsApp not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN env vars or configure in Admin → WhatsApp Business.", 400);
      }

      const recipient = String(to).replace(/[^\d]/g, "");
      if (recipient.length < 8) return jsonError(res, "Invalid phone number", 400);

      const payload = {
        messaging_product: "whatsapp",
        to: recipient,
        type: "text",
        text: { body: String(text) },
      };

      try {
        const waRes = await fetch(
          `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        const waBody = await waRes.json().catch(() => ({}));

        // Log the message
        try {
          await db.collection("whatsapp_messages").insertOne({
            at: new Date(), to: recipient, kind: "text", ok: waRes.ok,
            wamid: waBody?.messages?.[0]?.id || null,
            error: waRes.ok ? null : (waBody?.error?.message || `HTTP ${waRes.status}`),
            actor: user.email || "crm",
            body: String(text),
            direction: "outbound",
          });
        } catch {}

        // Also create/update a conversation for this recipient
        try {
          const conv = await convCol.findOne({ customerPhone: recipient, channel: "WHATSAPP" });
          if (!conv) {
            await convCol.insertOne({
              type: "live_support", status: "open", channel: "WHATSAPP",
              customerName: `WhatsApp ${recipient}`, customerPhone: recipient,
              customerId: null, lastMessage: String(text),
              lastMessageAt: new Date(), unreadCount: 0,
              createdAt: new Date(), updatedAt: new Date(),
            });
          } else {
            await convCol.updateOne({ _id: conv._id }, { $set: { lastMessage: String(text), lastMessageAt: new Date(), updatedAt: new Date() } });
          }
          // Add message to chat_messages
          await msgCol.insertOne({
            conversationId: conv ? conv._id : null,
            senderType: "staff", senderId: user.id, senderName: user.name || user.email,
            senderEmail: user.email, body: String(text), direction: "OUTBOUND",
            channel: "WHATSAPP", status: waRes.ok ? "SENT" : "FAILED",
            providerId: waBody?.messages?.[0]?.id || null,
            createdAt: new Date(),
          });
        } catch {}

        if (!waRes.ok) {
          return jsonError(res, waBody?.error?.message || "WhatsApp send failed", 502);
        }
        return jsonOk(res, { success: true, messageId: waBody?.messages?.[0]?.id, response: waBody });
      } catch (e: any) {
        return jsonError(res, e?.message || "WhatsApp send error", 500);
      }
    }

    // ─── WHATSAPP LOG — fetch sent/received WhatsApp messages ──────
    if (crmSegs[0] === "whatsapp-log" && req.method === "GET") {
      const user = await verifyCrmAuth(req);
      if (!user) return jsonError(res, "Unauthorized", 401);
      const phone = url.searchParams.get("phone");
      const filter: any = {};
      if (phone) filter.to = String(phone).replace(/[^\d]/g, "");
      const messages = await db.collection("whatsapp_messages").find(filter).sort({ at: -1 }).limit(100).toArray();
      return jsonOk(res, { messages });
    }

    // ─── WHATSAPP CONVERSATIONS — list WhatsApp-specific threads ───
    if (crmSegs[0] === "whatsapp-conversations" && req.method === "GET") {
      const user = await verifyCrmAuth(req);
      if (!user) return jsonError(res, "Unauthorized", 401);
      // Get conversations that have WhatsApp messages
      const conversations = await convCol.find({
        $or: [{ channel: "WHATSAPP" }, { customerPhone: { $exists: true, $ne: null } }]
      }).sort({ lastMessageAt: -1 }).limit(100).toArray();

      // Also get unique recipients from whatsapp_messages
      const waMessages = await db.collection("whatsapp_messages").find({}).sort({ at: -1 }).limit(100).toArray();
      const waPhones = new Map<string, any>();
      for (const m of waMessages) {
        if (!waPhones.has(m.to)) {
          waPhones.set(m.to, {
            id: `wa_${m.to}`,
            name: `WhatsApp ${m.to}`,
            phone: m.to,
            lastMessage: m.body || m.kind,
            lastActivity: m.at,
            unreadCount: 0,
            channel: "WHATSAPP",
            direction: m.direction || "outbound",
            ok: m.ok,
          });
        }
      }

      // Merge: conversations from chat_conversations + unique WhatsApp recipients
      const items = [];
      const seenPhones = new Set<string>();
      for (const c of conversations) {
        const phone = c.customerPhone || "";
        if (phone) seenPhones.add(phone.replace(/[^\d]/g, ""));
        items.push({
          id: String(c._id),
          name: c.customerName || `WhatsApp ${phone}`,
          phone,
          email: null,
          lastMessage: typeof c.lastMessage === "string" ? c.lastMessage : (c.lastMessage?.body || ""),
          lastActivity: c.lastMessageAt || c.createdAt,
          unreadCount: c.unreadCount || 0,
          channel: c.channel || "WHATSAPP",
          status: c.status || "open",
        });
      }
      // Add WhatsApp-only recipients not in conversations
      for (const [phone, data] of waPhones) {
        if (!seenPhones.has(phone.replace(/[^\d]/g, ""))) {
          items.push(data);
        }
      }
      items.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
      return jsonOk(res, { items, total: items.length });
    }

    return jsonError(res, "CRM route not found", 404);
  }
  // ─── END CRM ROUTES ──────────────────────────────────

  // Helper: identify the storefront caller (signed-in user OR returning visitor)
  const caller = (req: AuthenticatedRequest) => {
    const user = verifyUser(req); // customer cookie/bearer token
    const body = req.body || {};
    const visitorId = String(body.visitorId || url.searchParams.get("visitorId") || "").trim();
    return { user, visitorId };
  };

  // ===========================================================================
  // POST /api/messages/bot — THE single customer assistant.
  // Catalog-grounded instant answers (products/pricing/checkout/order status)
  // with escalation links to the human live-support thread. Rate-limited,
  // no auth required; signed-in callers get their OWN order status.
  // ===========================================================================
  if (route === "bot" && req.method === "POST") {
    return handleCustomerBot(req, res);
  }

  // ===========================================================================
  // POST /api/messages/start — storefront opens a live-support conversation
  // Body: { name, email, message, visitorId }
  // Reuses the caller's most recent open conversation when one exists.
  // ===========================================================================
  if (route === "start" && req.method === "POST") {
    try {
      const { user, visitorId } = caller(req);
      const body = req.body || {};
      const name = String(body.name || user?.name || "").trim();
      const email = String(body.email || user?.email || "").toLowerCase().trim();
      const message = String(body.message || "").trim();
      if (!name || !email) return jsonError(res, "Name and email are required to start a chat.", 400);
      if (!message) return jsonError(res, "Please type a message to start the conversation.", 400);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return jsonError(res, "Please provide a valid email address.", 400);
      }

      // Find an existing open conversation for this identity
      const identityFilter: any = user
        ? { type: "live_support", "customer.userId": user.id, status: { $ne: "closed" } }
        : visitorId
        ? { type: "live_support", "customer.visitorId": visitorId, status: { $ne: "closed" } }
        : null;
      let conv = identityFilter ? await convCol.findOne(identityFilter) : null;

      const now = new Date();
      if (!conv) {
        const newConv = {
          type: "live_support",
          status: "open",
          subject: "Live Support Chat",
          customer: {
            name,
            email,
            userId: user?.id || null,
            visitorId: visitorId || null,
          },
          staff: null,
          participants: [{ email, name, kind: "customer" }],
          lastMessage: { body: message.slice(0, 200), senderType: "customer", at: now },
          unreadForStaff: 1,
          unreadForCustomer: 0,
          createdAt: now,
          updatedAt: now,
        };
        const ins = await convCol.insertOne(newConv);
        conv = { _id: ins.insertedId, ...newConv };
      }

      const msg: ChatMessage = {
        conversationId: conv._id,
        senderType: "customer",
        senderId: user?.id || null,
        senderName: name,
        senderEmail: email,
        body: message,
        createdAt: now,
        readAt: null,
      };
      await msgCol.insertOne(msg);
      await convCol.updateOne(
        { _id: conv._id },
        { $set: { lastMessage: { body: message.slice(0, 200), senderType: "customer", at: now }, unreadForStaff: (conv.unreadForStaff || 0) + 1, updatedAt: now } }
      );

      return jsonOk(res, {
        success: true,
        conversation: serialize({ ...conv, unreadForCustomer: 0 }),
        message: "Conversation ready — our team typically replies within minutes.",
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ===========================================================================
  // GET  /api/messages/mine?conversationId=&since=&visitorId= — poll own thread
  // POST /api/messages/mine — send a customer message to own thread
  // ===========================================================================
  if (route === "mine") {
    const { user, visitorId } = caller(req);
    const conversationId = String(req.body?.conversationId || url.searchParams.get("conversationId") || "");
    if (!conversationId || !ObjectId.isValid(conversationId)) {
      return jsonError(res, "A valid conversationId is required.", 400);
    }
    const conv = await convCol.findOne({ _id: new ObjectId(conversationId), type: "live_support" });
    if (!conv) return jsonError(res, "Conversation not found.", 404);

    // Ownership check: signed-in user, matching visitorId, or email match
    const email = String(req.body?.email || url.searchParams.get("email") || "").toLowerCase().trim();
    const owns =
      (user && conv.customer?.userId === user.id) ||
      (visitorId && conv.customer?.visitorId === visitorId) ||
      (email && conv.customer?.email === email);
    if (!owns) return jsonError(res, "You do not have access to this conversation.", 403);

    if (req.method === "GET") {
      // Mark staff messages as read by the customer
      await msgCol.updateMany(
        { conversationId: conv._id, senderType: "staff", readAt: null },
        { $set: { readAt: new Date() } }
      );
      await convCol.updateOne({ _id: conv._id }, { $set: { unreadForCustomer: 0 } });

      const since = url.searchParams.get("since");
      const filter: any = { conversationId: conv._id };
      if (since) {
        const sinceDate = new Date(since);
        if (!isNaN(sinceDate.getTime())) filter.createdAt = { $gt: sinceDate };
      }
      const messages = await msgCol
        .find(filter)
        .sort({ createdAt: 1 })
        .limit(200)
        .toArray();
      return jsonOk(res, {
        success: true,
        conversation: serialize(conv),
        messages: messages.map(serializeMsg),
      });
    }

    if (req.method === "POST") {
      const body = String(req.body?.body || "").trim();
      if (!body) return jsonError(res, "Message body is required.", 400);
      const now = new Date();
      const msg: ChatMessage = {
        conversationId: conv._id,
        senderType: "customer",
        senderId: user?.id || null,
        senderName: conv.customer?.name || "Customer",
        senderEmail: conv.customer?.email || null,
        body,
        createdAt: now,
        readAt: null,
      };
      await msgCol.insertOne(msg);
      await convCol.updateOne(
        { _id: conv._id },
        {
          $set: { lastMessage: { body: body.slice(0, 200), senderType: "customer", at: now }, updatedAt: now },
          $inc: { unreadForStaff: 1 },
        }
      );
      // Closed conversations reopen automatically when the customer replies
      if (conv.status === "closed") {
        await convCol.updateOne({ _id: conv._id }, { $set: { status: "open" } });
      }
      return jsonOk(res, { success: true, message: serializeMsg(msg) });
    }

    return jsonError(res, "Method not allowed", 405);
  }

  // From here on, everything is admin/staff territory
  if (!requireAdmin(req, res)) return;
  const admin: any = verifyAdmin(req);

  // ===========================================================================
  // GET /api/messages/conversations — admin inbox (list + counts)
  // Query: ?type=live_support|staff_dm&status=open|pending|closed
  // ===========================================================================
  if (route === "conversations" && req.method === "GET") {
    try {
      const type = url.searchParams.get("type");
      const status = url.searchParams.get("status");
      const filter: any = {};
      if (type) filter.type = type;
      if (status) filter.status = status;
      const conversations = await convCol
        .find(filter)
        .sort({ updatedAt: -1 })
        .limit(100)
        .toArray();
      const all = await convCol.find({}).toArray();
      const counts = {
        all: all.length,
        open: all.filter((c: any) => (c.status || "open") === "open").length,
        pending: all.filter((c: any) => c.status === "pending").length,
        in_progress: all.filter((c: any) => c.status === "in_progress").length,
        resolved: all.filter((c: any) => c.status === "resolved").length,
        closed: all.filter((c: any) => c.status === "closed").length,
        unread: all.reduce((acc: number, c: any) => acc + (c.unreadForStaff || 0), 0),
        live: all.filter((c: any) => c.type === "live_support").length,
        staffDm: all.filter((c: any) => c.type === "staff_dm").length,
      };
      return jsonOk(res, {
        success: true,
        conversations: conversations.map(serialize),
        counts,
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ===========================================================================
  // GET  /api/messages/conversations/:id — open thread (marks staff-read)
  // POST /api/messages/conversations/:id/reply — staff reply
  // PUT  /api/messages/conversations/:id — status/assign updates
  // ===========================================================================
  if (pathSegments[0] === "conversations" && pathSegments[1] && ObjectId.isValid(pathSegments[1])) {
    const convId = new ObjectId(pathSegments[1]);
    const conv = await convCol.findOne({ _id: convId });
    if (!conv) return jsonError(res, "Conversation not found.", 404);

    // --- open thread ---
    if (req.method === "GET" && pathSegments.length === 2) {
      await msgCol.updateMany(
        { conversationId: convId, senderType: { $ne: "staff" }, readAt: null },
        { $set: { readAt: new Date() } }
      );
      await convCol.updateOne({ _id: convId }, { $set: { unreadForStaff: 0 } });
      const messages = await msgCol
        .find({ conversationId: convId })
        .sort({ createdAt: 1 })
        .limit(300)
        .toArray();
      const fresh = await convCol.findOne({ _id: convId });
      return jsonOk(res, {
        success: true,
        conversation: serialize(fresh),
        messages: messages.map(serializeMsg),
      });
    }

    // --- staff reply ---
    if (req.method === "POST" && pathSegments[2] === "reply") {
      try {
        const body = String(req.body?.body || "").trim();
        if (!body) return jsonError(res, "Message body is required.", 400);
        const now = new Date();
        const msg: ChatMessage = {
          conversationId: convId,
          senderType: "staff",
          senderId: admin?.id || null,
          senderName: admin?.name || "PlayBeat Support",
          senderEmail: admin?.email || null,
          body,
          createdAt: now,
          readAt: null,
        };
        await msgCol.insertOne(msg);
        await convCol.updateOne(
          { _id: convId },
          {
            $set: {
              lastMessage: { body: body.slice(0, 200), senderType: "staff", at: now },
              updatedAt: now,
              // Ticket auto-advance on staff reply: closed → pending (reopened),
              // resolved → in_progress (customer follow-up), otherwise unchanged.
              status:
                conv.status === "closed"
                  ? "pending"
                  : conv.status === "resolved"
                    ? "in_progress"
                    : conv.status || "open",
            },
            $inc: { unreadForCustomer: 1 },
          }
        );
        return jsonOk(res, { success: true, message: serializeMsg(msg) });
      } catch (err: any) {
        return jsonError(res, err.message, 500);
      }
    }

    // --- ticket state / assignment (5-state machine + priority) ---
    if (req.method === "PUT" && pathSegments.length === 2) {
      try {
        const { status, staffName, priority, note } = req.body || {};
        const update: any = { updatedAt: new Date() };
        const current: TicketState = (isTicketState(conv.status) ? conv.status : "open") as TicketState;

        if (status !== undefined) {
          if (!isTicketState(status)) {
            return jsonError(res, `status must be one of: ${TICKET_STATES.join(", ")}`, 400);
          }
          if (status !== current && !ALLOWED_TICKET_TRANSITIONS[current].includes(status)) {
            return jsonError(
              res,
              `Invalid ticket transition: ${current} → ${status}. Allowed: ${ALLOWED_TICKET_TRANSITIONS[current].join(", ")}.`,
              409
            );
          }
          if (status !== current) {
            update.status = status;
            update.ticketStateUpdatedAt = new Date();
            await convCol.updateOne({ _id: convId }, {
              $push: {
                ticketEvents: {
                  $each: [{ from: current, to: status, by: admin?.name || admin?.email || "staff", note: String(note || "").slice(0, 300), at: new Date() }],
                  $slice: -50,
                },
              },
            } as any);
            await writeAudit(db, {
              actor: admin,
              action: "ticket.state_change",
              targetType: "conversation",
              targetId: String(convId),
              detail: `Ticket ${current} → ${status}`,
              meta: { note: String(note || "") },
            });
          }
        }
        if (priority !== undefined) {
          if (!TICKET_PRIORITIES.has(String(priority))) {
            return jsonError(res, "priority must be one of: low, normal, high, urgent", 400);
          }
          update.ticketPriority = String(priority);
        }
        if (staffName !== undefined) {
          update.staff = staffName
            ? { id: admin?.id || null, email: admin?.email || null, name: staffName }
            : null;
        }
        await convCol.updateOne({ _id: convId }, { $set: update });
        return jsonOk(res, { success: true, message: "Ticket updated." });
      } catch (err: any) {
        return jsonError(res, err.message, 500);
      }
    }

    return jsonError(res, "Method not allowed", 405);
  }

  // ===========================================================================
  // STAFF MESSAGE BOX — direct messages between employees
  // ===========================================================================
  if (route === "staff-dm" && req.method === "GET") {
    try {
      const myEmail = (admin?.email || "").toLowerCase();
      const conversations = await convCol
        .find({ type: "staff_dm", "participants.email": myEmail })
        .sort({ updatedAt: -1 })
        .limit(100)
        .toArray();
      return jsonOk(res, {
        success: true,
        conversations: conversations.map(serialize),
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  if (route === "staff-dm" && req.method === "POST") {
    try {
      const { toEmail, toName, body } = req.body || {};
      const recipient = String(toEmail || "").toLowerCase().trim();
      const text = String(body || "").trim();
      if (!recipient || !text) return jsonError(res, "Recipient email and message body are required.", 400);
      const myEmail = String(admin?.email || "").toLowerCase();
      if (recipient === myEmail) return jsonError(res, "You cannot message yourself.", 400);

      const now = new Date();
      // Stable two-person conversation key (order-independent)
      const pairKey = [myEmail, recipient].sort().join("|");
      let conv = await convCol.findOne({ type: "staff_dm", pairKey });
      if (!conv) {
        const newConv = {
          type: "staff_dm",
          status: "open",
          subject: "Staff Direct Message",
          pairKey,
          customer: null,
          participants: [
            { email: myEmail, name: admin?.name || "Staff", kind: "staff" },
            { email: recipient, name: String(toName || recipient).trim(), kind: "staff" },
          ],
          lastMessage: { body: text.slice(0, 200), senderType: "staff", at: now },
          unreadForStaff: 1,
          unreadForCustomer: 0,
          createdAt: now,
          updatedAt: now,
        };
        const ins = await convCol.insertOne(newConv);
        conv = { _id: ins.insertedId, ...newConv };
      }
      const msg: ChatMessage = {
        conversationId: conv._id,
        senderType: "staff",
        senderId: admin?.id || null,
        senderName: admin?.name || "Staff",
        senderEmail: myEmail,
        body: text,
        createdAt: now,
        readAt: null,
      };
      await msgCol.insertOne(msg);
      await convCol.updateOne(
        { _id: conv._id },
        {
          $set: { lastMessage: { body: text.slice(0, 200), senderType: "staff", at: now }, updatedAt: now },
          $inc: { unreadForStaff: 1 },
        }
      );
      return jsonOk(res, { success: true, conversation: serialize(conv), message: serializeMsg(msg) }, 201);
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ===========================================================================
  // GET /api/messages/unread-count — sidebar badge for the admin Message Box
  // ===========================================================================
  if (route === "unread-count" && req.method === "GET") {
    try {
      const myEmail = (admin?.email || "").toLowerCase();
      const all = await convCol.find({ status: { $ne: "closed" } }).toArray();
      const liveUnread = all
        .filter((c: any) => c.type === "live_support")
        .reduce((acc: number, c: any) => acc + (c.unreadForStaff || 0), 0);
      // Staff DM unread counts as one badge per thread (simple + readable)
      const dmUnread = all.filter(
        (c: any) =>
          c.type === "staff_dm" &&
          (c.unreadForStaff || 0) > 0 &&
          Array.isArray(c.participants) &&
          c.participants.some((p: any) => p.email === myEmail)
      ).length;
      return jsonOk(res, {
        success: true,
        unread: { live: liveUnread, staffDm: dmUnread, total: liveUnread + dmUnread },
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  return jsonError(res, `Messages route not found: ${route || "/"}`, 404);
}
