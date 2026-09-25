// /api/calls/* — Call management API (initiate, end, history, update)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { getDb } from "../_lib/mongo.js";
import { handleOptions, jsonOk, jsonError, verifyUser, AuthenticatedRequest } from "../_lib/auth.js";
import { writeAudit } from "../_lib/audit.js";

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname.replace(/^\/api\/calls\/?/, '').toLowerCase();
  const segments = path.split('/').filter(Boolean);

  try {
    const db = await getDb();

    // GET /api/calls — list calls (with filters)
    if (req.method === 'GET' && segments.length === 0) {
      const filter: any = {};
      const direction = url.searchParams.get('direction');
      const status = url.searchParams.get('status');
      const outcome = url.searchParams.get('outcome');
      if (direction) filter.direction = direction;
      if (status) filter.status = status;
      if (outcome) filter.outcome = outcome;
      const calls = await db.collection('crm_calls').find(filter).sort({ startedAt: -1 }).limit(200).toArray();
      const all = await db.collection('crm_calls').countDocuments();
      const incoming = await db.collection('crm_calls').countDocuments({ direction: 'INBOUND' });
      const outgoing = await db.collection('crm_calls').countDocuments({ direction: 'OUTBOUND' });
      const missed = await db.collection('crm_calls').countDocuments({ status: 'MISSED' });
      return jsonOk(res, { calls, counts: { all, incoming, outgoing, missed, voicemail: 0 } });
    }

    // POST /api/calls — initiate a call
    if (req.method === 'POST' && segments.length === 0) {
      const user = await verifyUser(req);
      if (!user) return jsonError(res, 'Unauthorized', 401);
      const { to, leadId, leadName, leadPhone } = req.body || {};
      if (!to) return jsonError(res, 'to (phone number) required', 400);

      // Check telephony config
      const telephonyConfig = await db.collection('telephony_config').findOne({ active: true });
      const provider = telephonyConfig?.provider || 'mock';

      const call = {
        leadId: leadId || null, leadName: leadName || null, leadPhone: leadPhone || null,
        employeeId: user.id, employeeName: user.name || user.email,
        direction: 'OUTBOUND', status: 'INITIATING', phone: to,
        channel: 'TELEPHONY', durationSec: 0, outcome: null, outcomeNotes: null,
        nextFollowupAt: null, provider, providerCallId: null,
        startedAt: new Date(), connectedAt: null, endedAt: null,
        createdAt: new Date(),
      };
      const result = await db.collection('crm_calls').insertOne(call);
      const callId = String(result.insertedId);

      // Mock provider: simulate lifecycle
      if (provider === 'mock') {
        setTimeout(async () => {
          try {
            await db.collection('crm_calls').updateOne({ _id: result.insertedId }, { $set: { status: 'RINGING' } });
          } catch {}
        }, 1000);
        setTimeout(async () => {
          try {
            const current = await db.collection('crm_calls').findOne({ _id: result.insertedId });
            if (current && current.status === 'RINGING') {
              await db.collection('crm_calls').updateOne({ _id: result.insertedId }, { $set: { status: 'CONNECTED', connectedAt: new Date() } });
            }
          } catch {}
        }, 3000);
      }

      await writeAudit(req, 'CALL_INITIATED', `Outbound call to ${to} via ${provider}`);
      return jsonOk(res, { callId, providerCallId: `mock_${callId}`, provider });
    }

    // GET /api/calls/:id — single call
    if (req.method === 'GET' && segments.length === 1) {
      const call = await db.collection('crm_calls').findOne({ _id: new ObjectId(segments[0]) });
      if (!call) return jsonError(res, 'Call not found', 404);
      return jsonOk(res, { call });
    }

    // PATCH /api/calls/:id — update call (outcome, status, notes)
    if (req.method === 'PATCH' && segments.length === 1) {
      const user = await verifyUser(req);
      if (!user) return jsonError(res, 'Unauthorized', 401);
      const update: any = { updatedAt: new Date() };
      for (const k of ['status','outcome','outcomeNotes','nextFollowupAt','recordingUrl']) {
        if ((req.body || {})[k] !== undefined) {
          update[k] = k === 'nextFollowupAt' && req.body[k] ? new Date(req.body[k]) : req.body[k];
        }
      }
      await db.collection('crm_calls').updateOne({ _id: new ObjectId(segments[0]) }, { $set: update });
      return jsonOk(res, { ok: true });
    }

    // POST /api/calls/:id/end — end a call (compute duration, create followup)
    if (req.method === 'POST' && segments.length === 2 && segments[1] === 'end') {
      const user = await verifyUser(req);
      if (!user) return jsonError(res, 'Unauthorized', 401);
      const call = await db.collection('crm_calls').findOne({ _id: new ObjectId(segments[0]) });
      if (!call) return jsonError(res, 'Call not found', 404);
      const endedAt = new Date();
      const durationSec = call.connectedAt ? Math.floor((endedAt.getTime() - new Date(call.connectedAt).getTime()) / 1000) : 0;
      const { outcome, notes, nextFollowupAt } = req.body || {};
      await db.collection('crm_calls').updateOne(
        { _id: new ObjectId(segments[0]) },
        { $set: { status: 'ENDED', endedAt, durationSec, outcome: outcome || null, outcomeNotes: notes || null, nextFollowupAt: nextFollowupAt ? new Date(nextFollowupAt) : null } }
      );
      // Create followup if scheduled
      if (nextFollowupAt && call.leadId) {
        await db.collection('crm_followups').insertOne({
          leadId: call.leadId, leadName: call.leadName,
          employeeId: call.employeeId, employeeName: call.employeeName,
          scheduledAt: new Date(nextFollowupAt), channel: 'CALL', status: 'SCHEDULED',
          notes: notes || `Follow-up after call (outcome: ${outcome || 'none'})`,
          callId: String(call._id), createdAt: new Date(), updatedAt: new Date(),
        });
      }
      await writeAudit(req, 'CALL_ENDED', `Duration: ${durationSec}s, outcome: ${outcome || '—'}`);
      return jsonOk(res, { ok: true, durationSec });
    }

    return jsonError(res, 'Not found', 404);
  } catch (e: any) {
    console.error('Calls API error:', e);
    return jsonError(res, e?.message || 'Internal error', 500);
  }
}
