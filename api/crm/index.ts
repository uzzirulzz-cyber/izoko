// /api/crm/* — CRM Communication Center API
// Handles: notes, tasks, followups, timeline, employees, notifications
// Uses MongoDB (same pattern as api/messages/index.ts)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { getDb } from "../_lib/mongo.js";
import { handleOptions, jsonOk, jsonError, requireAdmin, verifyUser, verifyAdmin, AuthenticatedRequest } from "../_lib/auth.js";
import { writeAudit } from "../_lib/audit.js";

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname.replace(/^\/api\/crm\/?/, '').toLowerCase();
  const segments = path.split('/').filter(Boolean);

  try {
    // ─── NOTES ─────────────────────────────────────────
    if (segments[0] === 'notes') {
      const db = await getDb();
      if (req.method === 'GET') {
        const leadId = url.searchParams.get('leadId');
        if (!leadId) return jsonError(res, 'leadId required', 400);
        const notes = await db.collection('crm_notes').find({ leadId }).sort({ createdAt: -1 }).limit(100).toArray();
        return jsonOk(res, { notes });
      }
      if (req.method === 'POST') {
        const user = await verifyUser(req);
        if (!user) return jsonError(res, 'Unauthorized', 401);
        const { leadId, body, pinned } = req.body || {};
        if (!leadId || !body) return jsonError(res, 'leadId and body required', 400);
        const note = {
          leadId, body, pinned: !!pinned,
          employeeId: user.id, employeeName: user.name || user.email,
          createdAt: new Date(), updatedAt: new Date(),
        };
        const result = await db.collection('crm_notes').insertOne(note);
        await writeAudit(req, 'NOTE_CREATED', `Lead ${leadId}: ${body.slice(0, 80)}`);
        return jsonOk(res, { note: { ...note, _id: result.insertedId } });
      }
    }

    // ─── TASKS ─────────────────────────────────────────
    if (segments[0] === 'tasks') {
      const db = await getDb();
      if (req.method === 'GET') {
        const filter: any = {};
        const leadId = url.searchParams.get('leadId');
        const status = url.searchParams.get('status');
        if (leadId) filter.leadId = leadId;
        if (status) filter.status = status;
        const tasks = await db.collection('crm_tasks').find(filter).sort({ dueDate: 1, createdAt: -1 }).limit(200).toArray();
        return jsonOk(res, { tasks });
      }
      if (req.method === 'POST') {
        const user = await verifyUser(req);
        if (!user) return jsonError(res, 'Unauthorized', 401);
        const { title, description, leadId, dueDate, priority } = req.body || {};
        if (!title) return jsonError(res, 'title required', 400);
        const task = {
          title, description: description || null, leadId: leadId || null,
          employeeId: user.id, employeeName: user.name || user.email,
          dueDate: dueDate ? new Date(dueDate) : null,
          priority: priority || 'NORMAL', status: 'OPEN',
          createdAt: new Date(), updatedAt: new Date(),
        };
        const result = await db.collection('crm_tasks').insertOne(task);
        await writeAudit(req, 'TASK_CREATED', title);
        return jsonOk(res, { task: { ...task, _id: result.insertedId } });
      }
      if (req.method === 'PUT' && segments[1]) {
        const user = await verifyUser(req);
        if (!user) return jsonError(res, 'Unauthorized', 401);
        const update: any = { updatedAt: new Date() };
        for (const k of ['title','description','status','priority','dueDate']) {
          if ((req.body || {})[k] !== undefined) {
            update[k] = k === 'dueDate' && req.body[k] ? new Date(req.body[k]) : req.body[k];
          }
        }
        await db.collection('crm_tasks').updateOne({ _id: new ObjectId(segments[1]) }, { $set: update });
        return jsonOk(res, { ok: true });
      }
      if (req.method === 'DELETE' && segments[1]) {
        const user = await verifyUser(req);
        if (!user) return jsonError(res, 'Unauthorized', 401);
        await db.collection('crm_tasks').deleteOne({ _id: new ObjectId(segments[1]) });
        return jsonOk(res, { ok: true });
      }
    }

    // ─── FOLLOWUPS ─────────────────────────────────────
    if (segments[0] === 'followups') {
      const db = await getDb();
      if (req.method === 'GET') {
        const filter: any = {};
        const leadId = url.searchParams.get('leadId');
        const status = url.searchParams.get('status');
        const upcoming = url.searchParams.get('upcoming') === 'true';
        if (leadId) filter.leadId = leadId;
        if (status) filter.status = status;
        if (upcoming) { filter.status = 'SCHEDULED'; filter.scheduledAt = { $gte: new Date() }; }
        const followups = await db.collection('crm_followups').find(filter).sort({ scheduledAt: 1 }).limit(200).toArray();
        return jsonOk(res, { followups });
      }
      if (req.method === 'POST') {
        const user = await verifyUser(req);
        if (!user) return jsonError(res, 'Unauthorized', 401);
        const { leadId, leadName, scheduledAt, channel, notes } = req.body || {};
        if (!leadId || !scheduledAt) return jsonError(res, 'leadId and scheduledAt required', 400);
        const followup = {
          leadId, leadName: leadName || null,
          employeeId: user.id, employeeName: user.name || user.email,
          scheduledAt: new Date(scheduledAt), channel: channel || 'WHATSAPP',
          status: 'SCHEDULED', notes: notes || null,
          createdAt: new Date(), updatedAt: new Date(),
        };
        const result = await db.collection('crm_followups').insertOne(followup);
        return jsonOk(res, { followup: { ...followup, _id: result.insertedId } });
      }
      if (req.method === 'PUT' && segments[1]) {
        const user = await verifyUser(req);
        if (!user) return jsonError(res, 'Unauthorized', 401);
        const update: any = { updatedAt: new Date() };
        for (const k of ['status','notes','channel','scheduledAt']) {
          if ((req.body || {})[k] !== undefined) {
            update[k] = k === 'scheduledAt' && req.body[k] ? new Date(req.body[k]) : req.body[k];
          }
        }
        await db.collection('crm_followups').updateOne({ _id: new ObjectId(segments[1]) }, { $set: update });
        return jsonOk(res, { ok: true });
      }
    }

    // ─── TIMELINE ──────────────────────────────────────
    if (segments[0] === 'timeline' && segments[1]) {
      const db = await getDb();
      const leadId = segments[1];
      const [messages, calls, notes, tasks, followups] = await Promise.all([
        db.collection('chat_messages').find({ leadId }).sort({ createdAt: 1 }).limit(100).toArray().catch(() => []),
        db.collection('crm_calls').find({ leadId }).sort({ startedAt: 1 }).limit(100).toArray().catch(() => []),
        db.collection('crm_notes').find({ leadId }).sort({ createdAt: 1 }).limit(100).toArray().catch(() => []),
        db.collection('crm_tasks').find({ leadId }).sort({ createdAt: 1 }).limit(100).toArray().catch(() => []),
        db.collection('crm_followups').find({ leadId }).sort({ scheduledAt: 1 }).limit(100).toArray().catch(() => []),
      ]);
      const events: any[] = [];
      for (const m of messages) events.push({ id: `msg_${m._id}`, type: m.direction === 'INBOUND' ? 'MESSAGE_RECEIVED' : 'MESSAGE_SENT', timestamp: m.createdAt, title: `${m.channel || 'Message'} ${m.direction === 'INBOUND' ? 'received' : 'sent'}`, description: m.body });
      for (const c of calls) events.push({ id: `call_${c._id}`, type: c.direction === 'INBOUND' ? 'INCOMING_CALL' : 'OUTBOUND_CALL', timestamp: c.startedAt, title: `${c.direction === 'INBOUND' ? 'Incoming' : 'Outbound'} call`, description: `Duration: ${c.durationSec || 0}s, outcome: ${c.outcome || '—'}` });
      for (const n of notes) events.push({ id: `note_${n._id}`, type: 'NOTE', timestamp: n.createdAt, title: `Note by ${n.employeeName}`, description: n.body });
      for (const t of tasks) events.push({ id: `task_${t._id}`, type: 'TASK', timestamp: t.createdAt, title: t.title, description: t.description });
      for (const f of followups) events.push({ id: `followup_${f._id}`, type: 'FOLLOWUP', timestamp: f.scheduledAt, title: `Follow-up (${f.channel})`, description: f.notes });
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      // Group by day
      const grouped: any[] = [];
      for (const ev of events) {
        const dayKey = new Date(ev.timestamp).toISOString().slice(0, 10);
        let group = grouped.find(g => g.date === dayKey);
        if (!group) { group = { date: dayKey, events: [] }; grouped.push(group); }
        group.events.push(ev);
      }
      return jsonOk(res, { timeline: grouped, totalCount: events.length });
    }

    // ─── EMPLOYEES ─────────────────────────────────────
    if (segments[0] === 'employees') {
      if (req.method !== 'GET') return jsonError(res, 'Method not allowed', 405);
      const db = await getDb();
      const users = await db.collection('users').find({ active: true }).sort({ name: 1 }).toArray();
      const employees = await Promise.all(users.map(async (u: any) => {
        const [callsMade, callsAnswered, messagesSent, leadsContacted, followupsScheduled, followupsCompleted, activeTasks] = await Promise.all([
          db.collection('crm_calls').countDocuments({ employeeId: String(u._id), direction: 'OUTBOUND' }),
          db.collection('crm_calls').countDocuments({ employeeId: String(u._id), direction: 'INBOUND', status: 'ENDED' }),
          db.collection('chat_messages').countDocuments({ senderType: 'staff' }),
          db.collection('customers').countDocuments({ assignedTo: String(u._id) }),
          db.collection('crm_followups').countDocuments({ employeeId: String(u._id) }),
          db.collection('crm_followups').countDocuments({ employeeId: String(u._id), status: 'COMPLETED' }),
          db.collection('crm_tasks').countDocuments({ employeeId: String(u._id), status: { $in: ['OPEN', 'IN_PROGRESS'] } }),
        ]);
        return {
          id: String(u._id), email: u.email, name: u.name, role: u.role,
          title: u.title, availability: u.availability || 'OFFLINE',
          lastLogin: u.lastLogin, stats: { callsMade, callsAnswered, messagesSent, leadsContacted, followupsScheduled, followupsCompleted, activeTasks },
        };
      }));
      return jsonOk(res, { employees });
    }

    // ─── INBOX (unified) ──────────────────────────────
    if (segments[0] === 'inbox') {
      if (req.method !== 'GET') return jsonError(res, 'Method not allowed', 405);
      const db = await getDb();
      const filter = url.searchParams.get('filter') || 'all';
      const search = url.searchParams.get('search') || '';
      const conversations = await db.collection('chat_conversations').find({}).sort({ lastMessageAt: -1 }).limit(100).toArray();
      const items = [];
      for (const c of conversations) {
        const customer = c.customerId ? await db.collection('customers').findOne({ _id: new ObjectId(c.customerId) }) : null;
        items.push({
          kind: 'conversation', id: String(c._id), leadId: c.customerId,
          name: c.customerName || customer?.name || c.customerPhone || 'Unknown',
          company: customer?.company || null, phone: c.customerPhone,
          email: customer?.email || null, lastMessage: c.lastMessage || '',
          lastActivity: c.lastMessageAt || c.createdAt, unreadCount: c.unreadCount || 0,
          channel: c.channel || 'WHATSAPP', status: c.status || 'ACTIVE',
          leadStatus: customer?.status || null, city: customer?.city || null,
          assignedTo: customer?.assignedToName || null, tags: customer?.tags || [],
        });
      }
      let filtered = items;
      if (filter === 'unread') filtered = items.filter(i => i.unreadCount > 0);
      if (filter === 'whatsapp') filtered = items.filter(i => i.channel === 'WHATSAPP');
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(i => (i.name || '').toLowerCase().includes(s) || (i.phone || '').toLowerCase().includes(s) || (i.email || '').toLowerCase().includes(s));
      }
      filtered.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
      return jsonOk(res, { items: filtered, total: filtered.length });
    }

    return jsonError(res, 'Not found', 404);
  } catch (e: any) {
    console.error('CRM API error:', e);
    return jsonError(res, e?.message || 'Internal error', 500);
  }
}
