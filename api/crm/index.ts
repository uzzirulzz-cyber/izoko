// /api/crm/* — CRM Communication Center API
// Handles: calls, notes, tasks, followups, timeline, employees, inbox
// Uses MongoDB (same pattern as api/messages/index.ts)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { getDb } from "../_lib/mongo.js";
import { handleOptions, jsonOk, jsonError, verifyUser, AuthenticatedRequest } from "../_lib/auth.js";
import { writeAudit } from "../_lib/audit.js";

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname.replace(/^\/api\/crm\/?/, '').toLowerCase();
  const segments = path.split('/').filter(Boolean);

  try {
    const db = await getDb();

    // ─── CALLS: list ──────────────────────────────────
    if (segments[0] === 'calls' && segments.length === 1 && req.method === 'GET') {
      const filter: any = {};
      const direction = url.searchParams.get('direction');
      const status = url.searchParams.get('status');
      if (direction) filter.direction = direction;
      if (status) filter.status = status;
      const calls = await db.collection('crm_calls').find(filter).sort({ startedAt: -1 }).limit(200).toArray();
      const all = await db.collection('crm_calls').countDocuments();
      const incoming = await db.collection('crm_calls').countDocuments({ direction: 'INBOUND' });
      const outgoing = await db.collection('crm_calls').countDocuments({ direction: 'OUTBOUND' });
      const missed = await db.collection('crm_calls').countDocuments({ status: 'MISSED' });
      return jsonOk(res, { calls, counts: { all, incoming, outgoing, missed, voicemail: 0 } });
    }

    // ─── CALLS: initiate ──────────────────────────────
    if (segments[0] === 'calls' && segments.length === 1 && req.method === 'POST') {
      const user = await verifyUser(req);
      if (!user) return jsonError(res, 'Unauthorized', 401);
      const { to, leadId, leadName, leadPhone } = req.body || {};
      if (!to) return jsonError(res, 'to (phone number) required', 400);
      const provider = 'mock'; // TODO: read from telephony_config
      const call = {
        leadId: leadId || null, leadName: leadName || null, leadPhone: leadPhone || null,
        employeeId: user.id, employeeName: user.name || user.email,
        direction: 'OUTBOUND', status: 'INITIATING', phone: to,
        channel: 'TELEPHONY', durationSec: 0, outcome: null, outcomeNotes: null,
        nextFollowupAt: null, provider, providerCallId: null,
        startedAt: new Date(), connectedAt: null, endedAt: null, createdAt: new Date(),
      };
      const result = await db.collection('crm_calls').insertOne(call);
      const callId = String(result.insertedId);
      // Mock lifecycle
      if (provider === 'mock') {
        setTimeout(async () => { try { await db.collection('crm_calls').updateOne({ _id: result.insertedId }, { $set: { status: 'RINGING' } }) } catch {} }, 1000);
        setTimeout(async () => { try { const c = await db.collection('crm_calls').findOne({ _id: result.insertedId }); if (c?.status === 'RINGING') await db.collection('crm_calls').updateOne({ _id: result.insertedId }, { $set: { status: 'CONNECTED', connectedAt: new Date() } }) } catch {} }, 3000);
      }
      return jsonOk(res, { callId, providerCallId: `mock_${callId}`, provider });
    }

    // ─── CALLS: single call ───────────────────────────
    if (segments[0] === 'calls' && segments.length === 2 && req.method === 'GET') {
      const call = await db.collection('crm_calls').findOne({ _id: new ObjectId(segments[1]) });
      if (!call) return jsonError(res, 'Call not found', 404);
      return jsonOk(res, { call });
    }

    // ─── CALLS: end call ──────────────────────────────
    if (segments[0] === 'calls' && segments.length === 3 && segments[2] === 'end' && req.method === 'POST') {
      const user = await verifyUser(req);
      if (!user) return jsonError(res, 'Unauthorized', 401);
      const call = await db.collection('crm_calls').findOne({ _id: new ObjectId(segments[1]) });
      if (!call) return jsonError(res, 'Call not found', 404);
      const endedAt = new Date();
      const durationSec = call.connectedAt ? Math.floor((endedAt.getTime() - new Date(call.connectedAt as any).getTime()) / 1000) : 0;
      const { outcome, notes, nextFollowupAt } = req.body || {};
      await db.collection('crm_calls').updateOne({ _id: new ObjectId(segments[1]) }, { $set: { status: 'ENDED', endedAt, durationSec, outcome: outcome || null, outcomeNotes: notes || null, nextFollowupAt: nextFollowupAt ? new Date(nextFollowupAt) : null } });
      if (nextFollowupAt && call.leadId) {
        await db.collection('crm_followups').insertOne({ leadId: call.leadId, leadName: call.leadName, employeeId: call.employeeId, employeeName: call.employeeName, scheduledAt: new Date(nextFollowupAt), channel: 'CALL', status: 'SCHEDULED', notes: notes || `Follow-up after call (${outcome || 'none'})`, callId: String(call._id), createdAt: new Date(), updatedAt: new Date() });
      }
      return jsonOk(res, { ok: true, durationSec });
    }

    // ─── CALLS: patch (update outcome/status) ─────────
    if (segments[0] === 'calls' && segments.length === 2 && req.method === 'PATCH') {
      const user = await verifyUser(req);
      if (!user) return jsonError(res, 'Unauthorized', 401);
      const update: any = {};
      for (const k of ['status','outcome','outcomeNotes']) { if ((req.body || {})[k] !== undefined) update[k] = req.body[k] }
      if (Object.keys(update).length) await db.collection('crm_calls').updateOne({ _id: new ObjectId(segments[1]) }, { $set: update });
      return jsonOk(res, { ok: true });
    }

    // ─── NOTES ─────────────────────────────────────────
    if (segments[0] === 'notes') {
      if (req.method === 'GET') {
        const leadId = url.searchParams.get('leadId');
        if (!leadId) return jsonError(res, 'leadId required', 400);
        const notes = await db.collection('crm_notes').find({ leadId }).sort({ createdAt: -1 }).limit(100).toArray();
        return jsonOk(res, { notes });
      }
      if (req.method === 'POST') {
        const user = await verifyUser(req);
        if (!user) return jsonError(res, 'Unauthorized', 401);
        const { leadId, body: noteBody, pinned } = req.body || {};
        if (!leadId || !noteBody) return jsonError(res, 'leadId and body required', 400);
        const note = { leadId, body: noteBody, pinned: !!pinned, employeeId: user.id, employeeName: user.name || user.email, createdAt: new Date(), updatedAt: new Date() };
        const result = await db.collection('crm_notes').insertOne(note);
        return jsonOk(res, { note: { ...note, _id: result.insertedId } });
      }
    }

    // ─── TASKS ─────────────────────────────────────────
    if (segments[0] === 'tasks') {
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
        const task = { title, description: description || null, leadId: leadId || null, employeeId: user.id, employeeName: user.name || user.email, dueDate: dueDate ? new Date(dueDate) : null, priority: priority || 'NORMAL', status: 'OPEN', createdAt: new Date(), updatedAt: new Date() };
        const result = await db.collection('crm_tasks').insertOne(task);
        return jsonOk(res, { task: { ...task, _id: result.insertedId } });
      }
      if (req.method === 'PUT' && segments[1]) {
        const user = await verifyUser(req);
        if (!user) return jsonError(res, 'Unauthorized', 401);
        const update: any = { updatedAt: new Date() };
        for (const k of ['title','description','status','priority']) { if ((req.body || {})[k] !== undefined) update[k] = req.body[k] }
        if ((req.body || {}).dueDate !== undefined) update.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
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
      if (req.method === 'GET') {
        const filter: any = {};
        const leadId = url.searchParams.get('leadId');
        const status = url.searchParams.get('status');
        const upcoming = url.searchParams.get('upcoming') === 'true';
        if (leadId) filter.leadId = leadId;
        if (status) filter.status = status;
        if (upcoming) { filter.status = 'SCHEDULED'; filter.scheduledAt = { $gte: new Date() } }
        const followups = await db.collection('crm_followups').find(filter).sort({ scheduledAt: 1 }).limit(200).toArray();
        return jsonOk(res, { followups });
      }
      if (req.method === 'POST') {
        const user = await verifyUser(req);
        if (!user) return jsonError(res, 'Unauthorized', 401);
        const { leadId, leadName, scheduledAt, channel, notes } = req.body || {};
        if (!leadId || !scheduledAt) return jsonError(res, 'leadId and scheduledAt required', 400);
        const followup = { leadId, leadName: leadName || null, employeeId: user.id, employeeName: user.name || user.email, scheduledAt: new Date(scheduledAt), channel: channel || 'WHATSAPP', status: 'SCHEDULED', notes: notes || null, createdAt: new Date(), updatedAt: new Date() };
        const result = await db.collection('crm_followups').insertOne(followup);
        return jsonOk(res, { followup: { ...followup, _id: result.insertedId } });
      }
      if (req.method === 'PUT' && segments[1]) {
        const user = await verifyUser(req);
        if (!user) return jsonError(res, 'Unauthorized', 401);
        const update: any = { updatedAt: new Date() };
        for (const k of ['status','notes','channel']) { if ((req.body || {})[k] !== undefined) update[k] = req.body[k] }
        if ((req.body || {}).scheduledAt !== undefined) update.scheduledAt = req.body.scheduledAt ? new Date(req.body.scheduledAt) : null;
        await db.collection('crm_followups').updateOne({ _id: new ObjectId(segments[1]) }, { $set: update });
        return jsonOk(res, { ok: true });
      }
    }

    // ─── TIMELINE ──────────────────────────────────────
    if (segments[0] === 'timeline' && segments[1]) {
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
      for (const c of calls) events.push({ id: `call_${c._id}`, type: c.direction === 'INBOUND' ? 'INCOMING_CALL' : 'OUTBOUND_CALL', timestamp: c.startedAt, title: `${c.direction === 'INBOUND' ? 'Incoming' : 'Outbound'} call`, description: `Duration: ${c.durationSec || 0}s` });
      for (const n of notes) events.push({ id: `note_${n._id}`, type: 'NOTE', timestamp: n.createdAt, title: `Note by ${n.employeeName}`, description: n.body });
      for (const t of tasks) events.push({ id: `task_${t._id}`, type: 'TASK', timestamp: t.createdAt, title: t.title, description: t.description });
      for (const f of followups) events.push({ id: `followup_${f._id}`, type: 'FOLLOWUP', timestamp: f.scheduledAt, title: `Follow-up (${f.channel})`, description: f.notes });
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const grouped: any[] = [];
      for (const ev of events) { const dayKey = new Date(ev.timestamp).toISOString().slice(0, 10); let group = grouped.find(g => g.date === dayKey); if (!group) { group = { date: dayKey, events: [] }; grouped.push(group) } group.events.push(ev) }
      return jsonOk(res, { timeline: grouped, totalCount: events.length });
    }

    // ─── EMPLOYEES ─────────────────────────────────────
    if (segments[0] === 'employees' && req.method === 'GET') {
      const users = await db.collection('users').find({ active: true }).sort({ name: 1 }).toArray();
      const employees = await Promise.all(users.map(async (u: any) => {
        const [callsMade, callsAnswered, messagesSent, followupsScheduled, followupsCompleted, activeTasks] = await Promise.all([
          db.collection('crm_calls').countDocuments({ employeeId: String(u._id), direction: 'OUTBOUND' }),
          db.collection('crm_calls').countDocuments({ employeeId: String(u._id), direction: 'INBOUND', status: 'ENDED' }),
          db.collection('chat_messages').countDocuments({ senderType: 'staff' }),
          db.collection('crm_followups').countDocuments({ employeeId: String(u._id) }),
          db.collection('crm_followups').countDocuments({ employeeId: String(u._id), status: 'COMPLETED' }),
          db.collection('crm_tasks').countDocuments({ employeeId: String(u._id), status: { $in: ['OPEN', 'IN_PROGRESS'] } }),
        ]);
        return { id: String(u._id), email: u.email, name: u.name, role: u.role, title: u.title, availability: u.availability || 'OFFLINE', lastLogin: u.lastLogin, stats: { callsMade, callsAnswered, messagesSent, followupsScheduled, followupsCompleted, activeTasks } };
      }));
      return jsonOk(res, { employees });
    }

    // ─── INBOX ────────────────────────────────────────
    if (segments[0] === 'inbox' && req.method === 'GET') {
      const filter = url.searchParams.get('filter') || 'all';
      const search = url.searchParams.get('search') || '';
      const conversations = await db.collection('chat_conversations').find({}).sort({ lastMessageAt: -1 }).limit(100).toArray();
      const items = [];
      for (const c of conversations) {
        items.push({ kind: 'conversation', id: String(c._id), leadId: c.customerId, name: c.customerName || c.customerPhone || 'Unknown', phone: c.customerPhone, email: null, lastMessage: c.lastMessage || '', lastActivity: c.lastMessageAt || c.createdAt, unreadCount: c.unreadCount || 0, channel: c.channel || 'WHATSAPP', status: c.status || 'ACTIVE' });
      }
      let filtered = items;
      if (filter === 'unread') filtered = items.filter(i => i.unreadCount > 0);
      if (filter === 'whatsapp') filtered = items.filter(i => i.channel === 'WHATSAPP');
      if (search) { const s = search.toLowerCase(); filtered = filtered.filter(i => (i.name || '').toLowerCase().includes(s) || (i.phone || '').toLowerCase().includes(s)) }
      filtered.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
      return jsonOk(res, { items: filtered, total: filtered.length });
    }

    return jsonError(res, 'Not found', 404);
  } catch (e: any) {
    console.error('CRM API error:', e);
    return jsonError(res, e?.message || 'Internal error', 500);
  }
}
