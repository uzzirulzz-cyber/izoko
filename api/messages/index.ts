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

function serialize(conv: any) {
  if (!conv) return null;
  return {
    id: conv._id?.toString(),
    type: conv.type,
    status: conv.status || "open",
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

  // Helper: identify the storefront caller (signed-in user OR returning visitor)
  const caller = (req: AuthenticatedRequest) => {
    const user = verifyUser(req); // customer cookie/bearer token
    const body = req.body || {};
    const visitorId = String(body.visitorId || url.searchParams.get("visitorId") || "").trim();
    return { user, visitorId };
  };

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
              status: conv.status === "closed" ? "pending" : conv.status || "open",
            },
            $inc: { unreadForCustomer: 1 },
          }
        );
        return jsonOk(res, { success: true, message: serializeMsg(msg) });
      } catch (err: any) {
        return jsonError(res, err.message, 500);
      }
    }

    // --- status / assignment ---
    if (req.method === "PUT" && pathSegments.length === 2) {
      try {
        const { status, staffName } = req.body || {};
        const update: any = { updatedAt: new Date() };
        if (status && ["open", "pending", "closed"].includes(status)) update.status = status;
        if (staffName !== undefined) {
          update.staff = staffName
            ? { id: admin?.id || null, email: admin?.email || null, name: staffName }
            : null;
        }
        await convCol.updateOne({ _id: convId }, { $set: update });
        return jsonOk(res, { success: true, message: "Conversation updated." });
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
