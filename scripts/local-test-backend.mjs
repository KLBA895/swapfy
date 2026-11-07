import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, ".local-test-data");
const STORE_PATH = path.join(DATA_DIR, "store.json");
const MAIL_LOG = path.join(DATA_DIR, "mail.log");
const API_PORT = 54321;
const SMTP_PORT = 1025;
const SHIPPING_PROVIDER_ENV = process.env.SHIPPING_PROVIDER_ENV === "production" ? "production" : "sandbox";
const LABEL_API_ENABLED = process.env.LABEL_API_ENABLED === "1";
const SHIPPING_SANDBOX_SECRET = process.env.SHIPPING_SANDBOX_SECRET || "local-sandbox-secret";
const SHIPPING_WEBHOOK_INTERNAL_KEY = process.env.SHIPPING_WEBHOOK_INTERNAL_KEY || "local-webhook-internal";

const TEST_USER = {
  email: "test@swapfy.local",
  password: "test1234",
  name: "Swapfy Test",
};

const TEST_USER_B = {
  email: "test-b@swapfy.local",
  password: "test1234",
  name: "Swapfy Test B",
};

function uuid() {
  return crypto.randomUUID();
}

function b64url(value) {
  const json = typeof value === "string" ? value : JSON.stringify(value);
  return Buffer.from(json).toString("base64url");
}

function signJwt(payload) {
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(payload)}.local-test`;
}

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function defaultStore() {
  const userId = uuid();
  const userBId = uuid();
  const createdAt = nowIso();
  return {
    users: [
      {
        id: userId,
        email: TEST_USER.email,
        password: TEST_USER.password,
        user_metadata: { name: TEST_USER.name },
        created_at: createdAt,
      },
      {
        id: userBId,
        email: TEST_USER_B.email,
        password: TEST_USER_B.password,
        user_metadata: { name: TEST_USER_B.name },
        created_at: createdAt,
      },
    ],
    swap_requests: [],
    items: [
      {
        id: uuid(),
        user_id: userId,
        name: "Swapfy Test",
        email: TEST_USER.email,
        title: "Test Apple Watch",
        category: "⌚ Uhren & Schmuck",
        condition: "👍 Sehr gut",
        estimated_value: "250",
        currency: "CHF",
        postal_code: "8001",
        region: "Zürich",
        wanted_item: "Kamera",
        description: "Lokaler Testdatensatz. Keine Produktivdaten.",
        image_url: "/items/apple-watch.jpg",
        status: "pending",
        created_at: createdAt,
      },
      {
        id: uuid(),
        user_id: userBId,
        name: "Swapfy Test B",
        email: TEST_USER_B.email,
        title: "Test Fahrrad",
        category: "🚲 Fahrräder",
        condition: "👌 Gut",
        estimated_value: "180",
        currency: "CHF",
        postal_code: "3000",
        region: "Bern",
        wanted_item: "iPad",
        description: "Zweites lokales Testangebot.",
        image_url: "/items/apple-watch.jpg",
        status: "pending",
        created_at: createdAt,
      },
    ],
    files: {},
    swap_messages: [],
    notifications: [],
    notification_preferences: [],
    notification_deliveries: [],
    shipping_reminders: {},
    swap_shipments: [],
    swap_shipment_events: [],
    provider_webhook_inbox: [],
    user_blocks: [],
    match_ignores: [],
  };
}

function migrateStore(raw) {
  const store = raw;
  store.swap_requests ||= [];
  for (const row of store.swap_requests) {
    if (typeof row.owner_tracking !== "string") row.owner_tracking = row.owner_tracking || "";
    if (typeof row.requester_tracking !== "string") row.requester_tracking = row.requester_tracking || "";
    row.owner_marked_sent_at = row.owner_marked_sent_at || null;
    row.requester_marked_sent_at = row.requester_marked_sent_at || null;
    row.owner_received_at = row.owner_received_at || null;
    row.requester_received_at = row.requester_received_at || null;
    row.owner_address = row.owner_address || "";
    row.requester_address = row.requester_address || "";
    row.problem = Boolean(row.problem);
    row.owner_cancelled_at = row.owner_cancelled_at || null;
    row.requester_cancelled_at = row.requester_cancelled_at || null;
    row.owner_return_at = row.owner_return_at || null;
    row.requester_return_at = row.requester_return_at || null;
  }
  store.swap_messages ||= [];
  store.notifications ||= [];
  store.notification_preferences ||= [];
  store.notification_deliveries ||= [];
  store.shipping_reminders ||= {};
  store.swap_shipments ||= [];
  store.swap_shipment_events ||= [];
  store.provider_webhook_inbox ||= [];
  store.user_blocks ||= [];
  for (const row of store.swap_requests) ensureShipments(store, row);
  store.match_ignores ||= [];
  for (const message of store.swap_messages) {
    if (typeof message.reported !== "boolean") message.reported = false;
  }
  let userA = store.users.find((user) => user.email === TEST_USER.email);
  let userB = store.users.find((user) => user.email === TEST_USER_B.email);
  if (!userB) {
    userB = {
      id: uuid(),
      email: TEST_USER_B.email,
      password: TEST_USER_B.password,
      user_metadata: { name: TEST_USER_B.name },
      created_at: nowIso(),
    };
    store.users.push(userB);
  }
  if (userA && userB && store.items.length >= 2 && store.items[0].user_id === store.items[1].user_id) {
    store.items[1].user_id = userB.id;
  }
  if (userB) seedMatchFixtures(store, userB);
  return store;
}

function seedMatchFixtures(store, userB) {
  const fixtures = [
    {
      title: "Analogkamera",
      category: "📷 Kameras",
      condition: "👌 Gut",
      estimated_value: "230",
      postal_code: "8001",
      region: "Zürich",
      wanted_item: "Uhr",
      status: "pending",
      created_at: "2026-11-07T14:20:00.000Z",
    },
    {
      title: "Test iPad",
      category: "📱 Elektronik",
      condition: "⭐ Wie neu",
      estimated_value: "280",
      postal_code: "3000",
      region: "Bern",
      wanted_item: "Watch",
      status: "pending",
      created_at: "2026-11-07T14:21:00.000Z",
    },
    {
      title: "Spiegelreflex-Kamera",
      category: "📷 Kameras",
      condition: "✨ Neu (originalverpackt)",
      estimated_value: "400",
      postal_code: "4001",
      region: "Basel",
      wanted_item: "",
      status: "pending",
      created_at: "2026-11-07T14:10:00.000Z",
    },
    {
      title: "Kamera reserviert Match",
      category: "📷 Kameras",
      condition: "👌 Gut",
      estimated_value: "240",
      postal_code: "8001",
      region: "Zürich",
      wanted_item: "",
      status: "reserved",
      created_at: "2026-11-07T14:22:00.000Z",
    },
  ];
  const reflex = store.items.find((item) => item.title === "Spiegelreflex");
  if (reflex) reflex.title = "Spiegelreflex-Kamera";
  for (const fixture of fixtures) {
    if (store.items.some((item) => item.title === fixture.title)) continue;
    store.items.push({
      id: uuid(),
      user_id: userB.id,
      name: userB.user_metadata?.name || "Swapfy Test B",
      email: userB.email,
      currency: "CHF",
      description: "Lokales Matching-Fixture. Keine Produktivdaten.",
      image_url: "/items/apple-watch.jpg",
      ...fixture,
    });
  }
}

function loadStore() {
  if (!fs.existsSync(STORE_PATH)) return defaultStore();
  return migrateStore(JSON.parse(fs.readFileSync(STORE_PATH, "utf8")));
}

function saveStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

let store = loadStore();
saveStore(store);

function corsHeaders(req) {
  const requested = req?.headers?.["access-control-request-headers"];
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": requested || "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Private-Network": "true",
    "Access-Control-Expose-Headers": "*",
  };
}

function send(res, status, body, extraHeaders = {}, req) {
  const headers = {
    ...corsHeaders(req),
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  };
  const payload = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, headers);
  res.end(payload);
}

function sendRaw(res, status, body, contentType, req) {
  res.writeHead(status, {
    ...corsHeaders(req),
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseJsonBody(buffer) {
  if (!buffer.length) return {};
  return JSON.parse(buffer.toString("utf8"));
}

function getBearer(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

function publicUser(user) {
  return {
    id: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    email_confirmed_at: user.created_at,
    phone: "",
    confirmed_at: user.created_at,
    last_sign_in_at: nowIso(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: user.user_metadata || {},
    identities: [],
    created_at: user.created_at,
    updated_at: nowIso(),
  };
}

function sessionFor(user) {
  const access_token = signJwt({
    sub: user.id,
    email: user.email,
    role: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  });
  return {
    access_token,
    token_type: "bearer",
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    refresh_token: `local-refresh-${user.id}`,
    user: publicUser(user),
  };
}

function userFromRequest(req) {
  const token = getBearer(req);
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload?.sub) return null;
  return store.users.find((user) => user.id === payload.sub) || null;
}

function applyFilters(rows, searchParams) {
  let result = [...rows];
  for (const [key, raw] of searchParams.entries()) {
    if (key === "select" || key === "order" || key === "offset" || key === "limit") continue;
    const [op, ...rest] = String(raw).split(".");
    const value = rest.join(".");
    if (op === "eq") result = result.filter((row) => String(row[key] ?? "") === value);
    if (op === "neq") result = result.filter((row) => String(row[key] ?? "") !== value);
    if (op === "is") {
      const wantNull = value.toLowerCase() === "null";
      result = result.filter((row) => (row[key] == null) === wantNull);
    }
    if (op === "in") {
      const list = value.replace(/^\(/, "").replace(/\)$/, "").split(",");
      result = result.filter((row) => list.includes(String(row[key] ?? "")));
    }
  }
  const order = searchParams.get("order");
  if (order) {
    const [column, direction] = order.split(".");
    result.sort((a, b) => {
      const av = a[column] ?? "";
      const bv = b[column] ?? "";
      if (av < bv) return direction === "desc" ? 1 : -1;
      if (av > bv) return direction === "desc" ? -1 : 1;
      return 0;
    });
  }
  return result;
}

function projectRows(rows, select) {
  if (!select || select === "*") return rows;
  const columns = select.split(",").map((part) => part.trim());
  return rows.map((row) => {
    const next = {};
    for (const column of columns) next[column] = row[column];
    return next;
  });
}

async function handleAuth(req, res, url) {
  const pathname = url.pathname;
  const body = req.method === "GET" ? {} : parseJsonBody(await readBody(req));

  if (req.method === "POST" && pathname === "/auth/v1/signup") {
    const email = String(body.email || "").toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) return send(res, 400, { error: "invalid_signup", msg: "email and password required" });
    if (store.users.some((user) => user.email === email)) {
      return send(res, 422, { error: "user_already_exists", msg: "User already registered" });
    }
    const user = {
      id: uuid(),
      email,
      password,
      user_metadata: body.data || {},
      created_at: nowIso(),
    };
    store.users.push(user);
    saveStore(store);
    return send(res, 200, sessionFor(user));
  }

  if (req.method === "POST" && pathname === "/auth/v1/token") {
    const email = String(body.email || "").toLowerCase();
    const password = String(body.password || "");
    const user = store.users.find((entry) => entry.email === email && entry.password === password);
    if (!user) return send(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials" });
    return send(res, 200, sessionFor(user));
  }

  if (req.method === "GET" && pathname === "/auth/v1/user") {
    const user = userFromRequest(req);
    if (!user) return send(res, 401, { error: "invalid_token", msg: "No user" });
    return send(res, 200, publicUser(user));
  }

  if (req.method === "POST" && pathname === "/auth/v1/logout") {
    return send(res, 204);
  }

  return send(res, 404, { error: "not_found", path: pathname });
}

const NOTICE = {
  new_message: {
    title: "Neue Nachricht zu deiner Tauschanfrage",
    body: "Melde dich an, um sie in Swapfy zu lesen.",
  },
  swap_created: {
    title: "Neue Tauschanfrage",
    body: "Du hast eine neue Anfrage erhalten.",
  },
  swap_status: {
    title: "Status deiner Tauschanfrage",
    body: "Eine Anfrage hat sich geändert.",
  },
  mail_failed: {
    title: "E-Mail-Hinweis fehlgeschlagen",
    body: "Der Hinweis konnte nicht zugestellt werden.",
  },
  shipping_reminder: {
    title: "Erinnerung zum Versand",
    body: "Bitte prüfe den Versandfortschritt in Swapfy.",
  },
};

function prefsFor(userId) {
  let prefs = store.notification_preferences.find((row) => row.user_id === userId);
  if (!prefs) {
    prefs = {
      user_id: userId,
      notify_in_app: true,
      notify_email: false,
      notify_push: false,
      email_invalid: false,
      updated_at: nowIso(),
    };
    store.notification_preferences.push(prefs);
  }
  return prefs;
}

function isBlocked(actorId, otherId) {
  return store.user_blocks.some(
    (row) =>
      (row.blocker_id === actorId && row.blocked_id === otherId) ||
      (row.blocker_id === otherId && row.blocked_id === actorId)
  );
}

function writeSandboxMailLog(entry) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.appendFileSync(MAIL_LOG, `${JSON.stringify(entry)}\n`);
}

function deliverNotice({ userId, type, swapRequestId, messageId, unique }) {
  const copy = NOTICE[type];
  if (!copy) return;
  const recipient = store.users.find((user) => user.id === userId);
  const prefs = prefsFor(userId);
  const key = `${type}:${messageId || swapRequestId}:${userId}${unique ? `:${unique}` : ""}`;

  if (store.notification_deliveries.some((row) => row.key === key)) return;

  store.notification_deliveries.push({
    key,
    created_at: nowIso(),
    channel: "recorded",
  });

  if (prefs.notify_in_app) {
    store.notifications.push({
      id: uuid(),
      user_id: userId,
      type,
      swap_request_id: swapRequestId || null,
      message_id: messageId || null,
      title: copy.title,
      body: copy.body,
      read_at: null,
      created_at: nowIso(),
    });
  }

  if (!prefs.notify_email) return;

  if (!recipient?.email || !recipient.email.includes("@") || prefs.email_invalid) {
    prefs.email_invalid = true;
    if (prefs.notify_in_app) {
      store.notifications.push({
        id: uuid(),
        user_id: userId,
        type: "mail_failed",
        swap_request_id: swapRequestId || null,
        message_id: null,
        title: NOTICE.mail_failed.title,
        body: NOTICE.mail_failed.body,
        read_at: null,
        created_at: nowIso(),
      });
    }
    return;
  }

  writeSandboxMailLog({
    at: nowIso(),
    to: recipient.email,
    subject: copy.title,
    key,
    note: "sandbox only; no item, address, or chat body",
  });
}

function redactSwapAddresses(row, userId) {
  const copy = { ...row };
  if (userId !== row.owner_id) copy.owner_address = copy.owner_address || "";
  if (userId !== row.requester_id) copy.requester_address = copy.requester_address || "";
  return copy;
}

function shipmentStatusOf(row) {
  if (row.cancelled_at) return "storniert";
  if (row.return_marked_at) return "ruecksendung";
  if (row.received_at) return "empfangen";
  if (row.carrier_first_scan_at) return "unterwegs";
  if (row.marked_sent_at) return "versendet_nutzer";
  if (row.label_ref) return "label_gemeldet";
  if (row.address_shared_at) return "adresse_geteilt";
  return "nicht_gestartet";
}

function shipmentRank(status) {
  const order = {
    nicht_gestartet: 0,
    adresse_geteilt: 1,
    label_gemeldet: 2,
    versendet_nutzer: 3,
    unterwegs: 4,
    empfangen: 5,
    ruecksendung: 6,
    storniert: 7,
  };
  return order[status] ?? 0;
}

function emptyShipment(request, direction) {
  const ownerSends = direction === "owner_to_requester";
  return {
    id: uuid(),
    swap_request_id: request.id,
    direction,
    sender_id: ownerSends ? request.owner_id : request.requester_id,
    recipient_id: ownerSends ? request.requester_id : request.owner_id,
    status: "nicht_gestartet",
    recipient_address: "",
    address_shared_at: null,
    tracking_code: "",
    carrier: "post",
    provider: null,
    provider_env: null,
    provider_shipment_id: null,
    label_ref: null,
    marked_sent_at: null,
    carrier_first_scan_at: null,
    received_at: null,
    cancelled_at: null,
    return_marked_at: null,
    created_at: nowIso(),
  };
}

function fillShipmentFromRequest(shipment, request) {
  const ownerSends = shipment.direction === "owner_to_requester";
  shipment.tracking_code = (ownerSends ? request.owner_tracking : request.requester_tracking) || "";
  shipment.marked_sent_at = ownerSends ? request.owner_marked_sent_at : request.requester_marked_sent_at;
  shipment.received_at = ownerSends ? request.requester_received_at : request.owner_received_at;
  shipment.cancelled_at = ownerSends ? request.owner_cancelled_at : request.requester_cancelled_at;
  shipment.return_marked_at = ownerSends ? request.requester_return_at : request.owner_return_at;
  const address = ownerSends ? request.requester_address : request.owner_address;
  shipment.recipient_address = address || "";
  shipment.address_shared_at = address ? request.responded_at || request.created_at : null;
  shipment.status = shipmentStatusOf(shipment);
}

function syncRequestFromShipments(request) {
  const ownerOut = store.swap_shipments.find(
    (row) => row.swap_request_id === request.id && row.direction === "owner_to_requester"
  );
  const requesterOut = store.swap_shipments.find(
    (row) => row.swap_request_id === request.id && row.direction === "requester_to_owner"
  );
  if (ownerOut) {
    request.owner_tracking = ownerOut.tracking_code || "";
    request.owner_marked_sent_at = ownerOut.marked_sent_at || null;
    request.requester_received_at = ownerOut.received_at || null;
    request.owner_cancelled_at = ownerOut.cancelled_at || null;
    request.requester_return_at = ownerOut.return_marked_at || null;
    request.requester_address = ownerOut.recipient_address || "";
  }
  if (requesterOut) {
    request.requester_tracking = requesterOut.tracking_code || "";
    request.requester_marked_sent_at = requesterOut.marked_sent_at || null;
    request.owner_received_at = requesterOut.received_at || null;
    request.requester_cancelled_at = requesterOut.cancelled_at || null;
    request.owner_return_at = requesterOut.return_marked_at || null;
    request.owner_address = requesterOut.recipient_address || "";
  }
}

function ensureShipments(storeRef, request) {
  storeRef.swap_shipments ||= [];
  if (!["angenommen", "streit", "abgeschlossen", "abgebrochen"].includes(request.status)) return;
  for (const direction of ["owner_to_requester", "requester_to_owner"]) {
    let row = storeRef.swap_shipments.find(
      (entry) => entry.swap_request_id === request.id && entry.direction === direction
    );
    if (!row) {
      row = emptyShipment(request, direction);
      fillShipmentFromRequest(row, request);
      storeRef.swap_shipments.push(row);
    }
  }
}

function redactShipment(row, userId) {
  const copy = { ...row };
  if (!copy.address_shared_at && userId !== copy.recipient_id) copy.recipient_address = "";
  return copy;
}

function appendShipmentEvent(shipment, event, actorType, actorId, key, payload) {
  store.swap_shipment_events ||= [];
  if (key && store.swap_shipment_events.some((row) => row.idempotency_key === key)) return false;
  store.swap_shipment_events.push({
    id: uuid(),
    shipment_id: shipment.id,
    event,
    actor_type: actorType,
    actor_id: actorId || null,
    idempotency_key: key || `evt:${uuid()}`,
    payload: payload || {},
    created_at: nowIso(),
  });
  return true;
}

function shippingRpcResult(request, userId) {
  const shipments = store.swap_shipments
    .filter((row) => row.swap_request_id === request.id)
    .map((row) => redactShipment(row, userId));
  return { request: redactSwapAddresses(request, userId), shipments };
}

function applySandboxLabel(request, shipment, user) {
  if (SHIPPING_PROVIDER_ENV !== "sandbox") {
    return { ok: false, message: "Sandbox-Label nur in der Testumgebung." };
  }
  if (shipment.sender_id !== user.id) {
    return { ok: false, message: "Nur die Absenderseite erzeugt ein Testetikett." };
  }
  if (shipment.cancelled_at) return { ok: false, message: "Sendung ist storniert." };
  if (!shipment.address_shared_at || !shipment.recipient_address) {
    return { ok: false, message: "Adresse der Gegenseite fehlt." };
  }
  if (shipment.provider_shipment_id) {
    shipment.status = shipmentStatusOf(shipment);
    return { ok: true, reused: true };
  }
  const code = `99.18.${String(Date.now()).slice(-8)}${String(Math.floor(Math.random() * 90 + 10))}`;
  shipment.provider = "sandbox-post";
  shipment.provider_env = "sandbox";
  shipment.provider_shipment_id = `sbx_${shipment.id.slice(0, 8)}`;
  shipment.label_ref = `sandbox://label/${shipment.id}`;
  shipment.tracking_code = code.slice(0, 40);
  shipment.status = shipmentStatusOf(shipment);
  appendShipmentEvent(shipment, "label_created", "system", user.id, `label:${shipment.id}`, {
    env: "sandbox",
    provider: shipment.provider,
  });
  syncRequestFromShipments(request);
  return { ok: true };
}

function applyCarrierWebhook(payload) {
  store.provider_webhook_inbox ||= [];
  const deliveryId = String(payload.delivery_id || "").slice(0, 80);
  const provider = String(payload.provider || "sandbox-post").slice(0, 40);
  const providerEnv = payload.provider_env === "production" ? "production" : "sandbox";
  if (!deliveryId) return { ok: false, status: 400, message: "delivery_id fehlt." };
  if (providerEnv === "production" && !LABEL_API_ENABLED) {
    return { ok: false, status: 403, message: "Production-Webhooks sind nicht freigegeben." };
  }
  const duplicate = store.provider_webhook_inbox.find(
    (row) => row.provider === provider && row.provider_env === providerEnv && row.delivery_id === deliveryId
  );
  if (duplicate) return { ok: true, duplicate: true };
  const shipment = store.swap_shipments.find(
    (row) => row.provider_shipment_id && row.provider_shipment_id === payload.provider_shipment_id
  );
  if (!shipment) return { ok: false, status: 404, message: "Sendung nicht gefunden." };
  const request = store.swap_requests.find((row) => row.id === shipment.swap_request_id);
  if (!request) return { ok: false, status: 404, message: "Anfrage nicht gefunden." };

  const hash = crypto.createHash("sha256").update(JSON.stringify({
    delivery_id: deliveryId,
    provider_shipment_id: payload.provider_shipment_id,
    carrier_status: payload.carrier_status,
  })).digest("hex");

  store.provider_webhook_inbox.push({
    id: uuid(),
    provider,
    provider_env: providerEnv,
    delivery_id: deliveryId,
    payload_hash: hash,
    carrier_status: String(payload.carrier_status || "").slice(0, 40),
    processed_at: nowIso(),
    created_at: nowIso(),
  });

  const incoming = String(payload.carrier_status || "");
  const nextStatus =
    incoming === "delivered" || incoming === "in_transit" ? "unterwegs" : shipment.status;
  if (shipmentRank(nextStatus) >= shipmentRank(shipment.status) || !["empfangen", "storniert", "ruecksendung"].includes(shipment.status)) {
    if (incoming === "in_transit" || incoming === "delivered") {
      shipment.carrier_first_scan_at = shipment.carrier_first_scan_at || nowIso();
    }
  }
  if (payload.tracking_code) {
    const clean = String(payload.tracking_code).replace(/[^A-Za-z0-9.]/g, "").slice(0, 40);
    if (clean) shipment.tracking_code = clean;
  }
  shipment.status = shipmentStatusOf(shipment);
  appendShipmentEvent(
    shipment,
    incoming === "delivered" ? "webhook_delivered" : "webhook_in_transit",
    "carrier",
    null,
    `webhook:${provider}:${providerEnv}:${deliveryId}`,
    { carrier_status: incoming }
  );
  syncRequestFromShipments(request);
  return { ok: true, duplicate: false };
}

function validSandboxSignature(rawBody, signature) {
  const expected = crypto.createHmac("sha256", SHIPPING_SANDBOX_SECRET).update(rawBody).digest("hex");
  const given = String(signature || "").replace(/^sha256=/i, "");
  if (!given || given.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(given, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

function applyShipmentPatch(row, user, payload, isOwner, isRequester) {
  ensureShipments(store, row);
  const stamp = nowIso();
  const cleanTrack = (value) => String(value || "").replace(/[^A-Za-z0-9.]/g, "").slice(0, 40);
  const cleanAddress = (value) => String(value || "").slice(0, 500).trim();
  const ownerOut = store.swap_shipments.find(
    (entry) => entry.swap_request_id === row.id && entry.direction === "owner_to_requester"
  );
  const requesterOut = store.swap_shipments.find(
    (entry) => entry.swap_request_id === row.id && entry.direction === "requester_to_owner"
  );
  let did = false;

  if (payload.remind_other) {
    store.shipping_reminders ||= {};
    const key = `${row.id}:${user.id}`;
    const last = store.shipping_reminders[key];
    if (last && Date.now() - new Date(last).getTime() < 12 * 60 * 60 * 1000) {
      return { ok: false, message: "Erinnerung erst später wieder möglich." };
    }
    store.shipping_reminders[key] = stamp;
    deliverNotice({
      userId: isOwner ? row.requester_id : row.owner_id,
      type: "shipping_reminder",
      swapRequestId: row.id,
      unique: stamp,
    });
    did = true;
  }

  if (isOwner && "owner_address" in payload) {
    requesterOut.recipient_address = cleanAddress(payload.owner_address);
    requesterOut.address_shared_at = requesterOut.address_shared_at || stamp;
    requesterOut.status = shipmentStatusOf(requesterOut);
    appendShipmentEvent(requesterOut, "address_shared", "user", user.id, `addr:${requesterOut.id}:${stamp}`, {
      length: requesterOut.recipient_address.length,
    });
    did = true;
  } else if (isRequester && "requester_address" in payload) {
    ownerOut.recipient_address = cleanAddress(payload.requester_address);
    ownerOut.address_shared_at = ownerOut.address_shared_at || stamp;
    ownerOut.status = shipmentStatusOf(ownerOut);
    appendShipmentEvent(ownerOut, "address_shared", "user", user.id, `addr:${ownerOut.id}:${stamp}`, {
      length: ownerOut.recipient_address.length,
    });
    did = true;
  }

  if (isOwner && "owner_tracking" in payload) {
    ownerOut.tracking_code = cleanTrack(payload.owner_tracking);
    ownerOut.status = shipmentStatusOf(ownerOut);
    appendShipmentEvent(ownerOut, "tracking_set", "user", user.id, `track:${ownerOut.id}:${ownerOut.tracking_code}`, {
      length: ownerOut.tracking_code.length,
    });
    did = true;
  } else if (isRequester && "requester_tracking" in payload) {
    requesterOut.tracking_code = cleanTrack(payload.requester_tracking);
    requesterOut.status = shipmentStatusOf(requesterOut);
    appendShipmentEvent(
      requesterOut,
      "tracking_set",
      "user",
      user.id,
      `track:${requesterOut.id}:${requesterOut.tracking_code}`,
      { length: requesterOut.tracking_code.length }
    );
    did = true;
  }

  if (isOwner && payload.owner_cancelled_at) {
    if (ownerOut.marked_sent_at) return { ok: false, message: "Nach dem Versand nicht mehr stornierbar." };
    ownerOut.cancelled_at = ownerOut.cancelled_at || stamp;
    ownerOut.status = shipmentStatusOf(ownerOut);
    appendShipmentEvent(ownerOut, "cancelled", "user", user.id, `cancel:${ownerOut.id}`);
    did = true;
  } else if (isRequester && payload.requester_cancelled_at) {
    if (requesterOut.marked_sent_at) return { ok: false, message: "Nach dem Versand nicht mehr stornierbar." };
    requesterOut.cancelled_at = requesterOut.cancelled_at || stamp;
    requesterOut.status = shipmentStatusOf(requesterOut);
    appendShipmentEvent(requesterOut, "cancelled", "user", user.id, `cancel:${requesterOut.id}`);
    did = true;
  }

  if (ownerOut.cancelled_at && requesterOut.cancelled_at && row.status !== "abgebrochen") {
    row.status = "abgebrochen";
    const item = store.items.find((entry) => entry.id === row.item_id);
    if (item && item.status === "reserved") item.status = "pending";
    deliverNotice({ userId: row.owner_id, type: "swap_status", swapRequestId: row.id, unique: "cancel" });
    deliverNotice({ userId: row.requester_id, type: "swap_status", swapRequestId: row.id, unique: "cancel" });
  }

  if (payload.problem === true) {
    row.problem = true;
    row.status = "streit";
    deliverNotice({
      userId: isOwner ? row.requester_id : row.owner_id,
      type: "swap_status",
      swapRequestId: row.id,
      unique: "streit",
    });
    appendShipmentEvent(ownerOut, "problem", "user", user.id, `problem:${row.id}`);
    did = true;
  }

  if (isOwner && payload.owner_marked_sent_at) {
    if (ownerOut.cancelled_at) return { ok: false, message: "Sendung ist storniert." };
    ownerOut.marked_sent_at = ownerOut.marked_sent_at || stamp;
    ownerOut.status = shipmentStatusOf(ownerOut);
    appendShipmentEvent(ownerOut, "marked_sent", "user", user.id, `sent:${ownerOut.id}`);
    did = true;
  } else if (isRequester && payload.requester_marked_sent_at) {
    if (requesterOut.cancelled_at) return { ok: false, message: "Sendung ist storniert." };
    requesterOut.marked_sent_at = requesterOut.marked_sent_at || stamp;
    requesterOut.status = shipmentStatusOf(requesterOut);
    appendShipmentEvent(requesterOut, "marked_sent", "user", user.id, `sent:${requesterOut.id}`);
    did = true;
  }

  if (isOwner && payload.owner_received_at) {
    requesterOut.received_at = requesterOut.received_at || stamp;
    requesterOut.status = shipmentStatusOf(requesterOut);
    appendShipmentEvent(requesterOut, "received", "user", user.id, `recv:${requesterOut.id}`);
    did = true;
  } else if (isRequester && payload.requester_received_at) {
    ownerOut.received_at = ownerOut.received_at || stamp;
    ownerOut.status = shipmentStatusOf(ownerOut);
    appendShipmentEvent(ownerOut, "received", "user", user.id, `recv:${ownerOut.id}`);
    did = true;
  }

  if (isOwner && payload.owner_return_at) {
    requesterOut.return_marked_at = requesterOut.return_marked_at || stamp;
    requesterOut.status = shipmentStatusOf(requesterOut);
    appendShipmentEvent(requesterOut, "return_marked", "user", user.id, `return:${requesterOut.id}`);
    did = true;
  } else if (isRequester && payload.requester_return_at) {
    ownerOut.return_marked_at = ownerOut.return_marked_at || stamp;
    ownerOut.status = shipmentStatusOf(ownerOut);
    appendShipmentEvent(ownerOut, "return_marked", "user", user.id, `return:${ownerOut.id}`);
    did = true;
  }

  syncRequestFromShipments(row);

  if (
    row.owner_received_at &&
    row.requester_received_at &&
    !row.problem &&
    (row.status === "angenommen" || row.status === "streit")
  ) {
    row.status = "abgeschlossen";
    deliverNotice({
      userId: isOwner ? row.requester_id : row.owner_id,
      type: "swap_status",
      swapRequestId: row.id,
      unique: "done",
    });
  }

  if (!did) return { ok: false, message: "Diese Versandaktion ist nicht erlaubt." };
  return { ok: true };
}

async function handleSwapRequests(req, res, url, prefer, objectMode) {
  const user = userFromRequest(req);
  if (!user) return send(res, 401, { message: "JWT required" });

  const visible = () =>
    store.swap_requests.filter(
      (row) => row.requester_id === user.id || row.owner_id === user.id
    );

  if (req.method === "GET") {
    const rows = projectRows(applyFilters(visible(), url.searchParams), url.searchParams.get("select")).map(
      (row) => redactSwapAddresses(row, user.id)
    );
    if (objectMode) {
      if (rows.length !== 1) return send(res, 406, { message: "JSON object requested, multiple (or no) rows returned" });
      return send(res, 200, rows[0]);
    }
    return send(res, 200, rows, { "Content-Range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
  }

  if (req.method === "POST") {
    const payload = parseJsonBody(await readBody(req));
    const record = Array.isArray(payload) ? payload[0] : payload;
    const item = store.items.find((entry) => entry.id === record.item_id);
    if (!item) return send(res, 400, { message: "Artikel nicht gefunden." });
    if (item.user_id === user.id) return send(res, 400, { message: "Eigenes Angebot kann nicht angefragt werden." });
    if (item.status === "reserved") return send(res, 400, { message: "Artikel ist reserviert." });
    const duplicate = store.swap_requests.find(
      (row) =>
        row.item_id === item.id &&
        row.requester_id === user.id &&
        row.status === "erstellt"
    );
    if (duplicate) return send(res, 409, { message: "Es gibt bereits eine offene Anfrage.", code: "23505" });

    const inserted = {
      id: uuid(),
      item_id: item.id,
      requester_id: user.id,
      owner_id: item.user_id,
      status: "erstellt",
      owner_tracking: "",
      requester_tracking: "",
      owner_marked_sent_at: null,
      requester_marked_sent_at: null,
      owner_received_at: null,
      requester_received_at: null,
      owner_address: "",
      requester_address: "",
      problem: false,
      owner_cancelled_at: null,
      requester_cancelled_at: null,
      owner_return_at: null,
      requester_return_at: null,
      created_at: nowIso(),
    };
    store.swap_requests.push(inserted);
    deliverNotice({
      userId: inserted.owner_id,
      type: "swap_created",
      swapRequestId: inserted.id,
    });
    saveStore(store);
    if (prefer.includes("return=representation")) return send(res, 201, [inserted]);
    return send(res, 201, null);
  }

  if (req.method === "PATCH") {
    const payload = parseJsonBody(await readBody(req));
    const nextStatus = payload.status;
    const matched = applyFilters(visible(), url.searchParams);
    if (!matched.length) return send(res, 204);
    const row = matched[0];
    const from = row.status;
    const isOwner = row.owner_id === user.id;
    const isRequester = row.requester_id === user.id;

    const shippingKeys = [
      "owner_tracking",
      "requester_tracking",
      "owner_marked_sent_at",
      "requester_marked_sent_at",
      "owner_received_at",
      "requester_received_at",
      "owner_address",
      "requester_address",
      "problem",
      "owner_cancelled_at",
      "requester_cancelled_at",
      "owner_return_at",
      "requester_return_at",
      "remind_other",
    ];
    if (!nextStatus && shippingKeys.some((key) => key in payload)) {
      if (from !== "angenommen" && from !== "streit") {
        return send(res, 403, { message: "Versand nur nach Annahme." });
      }
      const applied = applyShipmentPatch(row, user, payload, isOwner, isRequester);
      if (!applied.ok) return send(res, 403, { message: applied.message });
      saveStore(store);
      const view = redactSwapAddresses(row, user.id);
      if (prefer.includes("return=representation")) {
        return send(res, 200, objectMode ? view : [view]);
      }
      return send(res, 204);
    }

    const allowed =
      (nextStatus === "zurueckgezogen" && from === "erstellt" && isRequester) ||
      (nextStatus === "abgelehnt" && from === "erstellt" && isOwner) ||
      (nextStatus === "angenommen" && from === "erstellt" && isOwner);

    if (!allowed) return send(res, 403, { message: "Übergang nicht erlaubt." });

    row.status = nextStatus;
    row.responded_at = nowIso();
    deliverNotice({
      userId: isOwner ? row.requester_id : row.owner_id,
      type: "swap_status",
      swapRequestId: row.id,
    });

    if (nextStatus === "angenommen") {
      ensureShipments(store, row);
      const item = store.items.find((entry) => entry.id === row.item_id);
      for (const other of store.swap_requests) {
        if (other.item_id === row.item_id && other.id !== row.id && other.status === "erstellt") {
          other.status = "abgelehnt";
          other.responded_at = nowIso();
          deliverNotice({
            userId: other.requester_id,
            type: "swap_status",
            swapRequestId: other.id,
          });
        }
      }
    }

    saveStore(store);
    if (prefer.includes("return=representation")) {
      return send(res, 200, objectMode ? row : matched.map((entry) => (entry.id === row.id ? row : entry)));
    }
    return send(res, 204);
  }

  return send(res, 405, { message: "method not allowed" });
}

const messageRateLimit = new Map();

function allowMessage(userId) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const stamps = (messageRateLimit.get(userId) || []).filter((time) => now - time < windowMs);
  if (stamps.length >= 20) {
    messageRateLimit.set(userId, stamps);
    return false;
  }
  stamps.push(now);
  messageRateLimit.set(userId, stamps);
  return true;
}

async function handleSwapMessages(req, res, url, prefer, objectMode) {
  const user = userFromRequest(req);
  if (!user) return send(res, 401, { message: "JWT required" });

  const visibleMessages = () =>
    store.swap_messages.filter((message) => {
      const request = store.swap_requests.find((row) => row.id === message.swap_request_id);
      return request && (request.requester_id === user.id || request.owner_id === user.id);
    });

  if (req.method === "GET") {
    const rows = projectRows(
      applyFilters(visibleMessages(), url.searchParams),
      url.searchParams.get("select")
    );
    if (objectMode) {
      if (rows.length !== 1) return send(res, 406, { message: "JSON object requested, multiple (or no) rows returned" });
      return send(res, 200, rows[0]);
    }
    return send(res, 200, rows, { "Content-Range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
  }

  if (req.method === "POST") {
    if (!allowMessage(user.id)) {
      return send(res, 429, { message: "Zu viele Nachrichten. Bitte später erneut versuchen." });
    }
    const payload = parseJsonBody(await readBody(req));
    const record = Array.isArray(payload) ? payload[0] : payload;
    const body = String(record.body || "").trim();
    if (!body) return send(res, 400, { message: "Nachricht darf nicht leer sein." });
    if (body.length > 2000) return send(res, 400, { message: "Nachricht ist zu lang." });

    const request = store.swap_requests.find((row) => row.id === record.swap_request_id);
    if (!request) return send(res, 404, { message: "Anfrage nicht gefunden." });
    if (request.requester_id !== user.id && request.owner_id !== user.id) {
      return send(res, 403, { message: "Kein Zugriff." });
    }
    if (
      request.status !== "erstellt" &&
      request.status !== "angenommen" &&
      request.status !== "streit"
    ) {
      return send(res, 403, { message: "Schreiben bei diesem Status nicht erlaubt." });
    }
    const otherId = request.requester_id === user.id ? request.owner_id : request.requester_id;
    if (isBlocked(user.id, otherId)) {
      return send(res, 403, { message: "Nachrichten sind für diese Anfrage gesperrt." });
    }

    const inserted = {
      id: uuid(),
      swap_request_id: request.id,
      sender_id: user.id,
      body,
      reported: false,
      created_at: nowIso(),
    };
    store.swap_messages.push(inserted);
    deliverNotice({
      userId: otherId,
      type: "new_message",
      swapRequestId: request.id,
      messageId: inserted.id,
    });
    saveStore(store);
    if (prefer.includes("return=representation")) return send(res, 201, [inserted]);
    return send(res, 201, null);
  }

  if (req.method === "PATCH") {
    const payload = parseJsonBody(await readBody(req));
    const matched = applyFilters(visibleMessages(), url.searchParams);
    if (!matched.length) return send(res, 204);
    for (const message of matched) {
      if (payload.reported === true) message.reported = true;
    }
    saveStore(store);
    if (prefer.includes("return=representation")) {
      return send(res, 200, objectMode ? matched[0] : matched);
    }
    return send(res, 204);
  }

  return send(res, 405, { message: "method not allowed" });
}

async function handleNotifications(req, res, url, prefer, objectMode) {
  const user = userFromRequest(req);
  if (!user) return send(res, 401, { message: "JWT required" });
  const own = () => store.notifications.filter((row) => row.user_id === user.id);

  if (req.method === "GET") {
    const rows = projectRows(applyFilters(own(), url.searchParams), url.searchParams.get("select"));
    if (objectMode) {
      if (rows.length !== 1) return send(res, 406, { message: "JSON object requested, multiple (or no) rows returned" });
      return send(res, 200, rows[0]);
    }
    return send(res, 200, rows, { "Content-Range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
  }

  if (req.method === "PATCH") {
    const payload = parseJsonBody(await readBody(req));
    const matched = applyFilters(own(), url.searchParams);
    for (const row of matched) {
      if ("read_at" in payload) row.read_at = payload.read_at;
    }
    saveStore(store);
    if (prefer.includes("return=representation")) {
      return send(res, 200, objectMode ? matched[0] || payload : matched);
    }
    return send(res, 204);
  }

  return send(res, 405, { message: "method not allowed" });
}

async function handleNotificationPreferences(req, res, url, prefer, objectMode) {
  const user = userFromRequest(req);
  if (!user) return send(res, 401, { message: "JWT required" });
  const prefs = prefsFor(user.id);

  if (req.method === "GET") {
    const rows = projectRows(applyFilters([prefs], url.searchParams), url.searchParams.get("select"));
    if (objectMode) {
      return send(res, 200, rows[0] || prefs);
    }
    return send(res, 200, rows, { "Content-Range": `0-0/1` });
  }

  if (req.method === "PATCH") {
    const payload = parseJsonBody(await readBody(req));
    if (typeof payload.notify_in_app === "boolean") prefs.notify_in_app = payload.notify_in_app;
    if (typeof payload.notify_email === "boolean") prefs.notify_email = payload.notify_email;
    if (typeof payload.notify_push === "boolean") prefs.notify_push = payload.notify_push;
    prefs.updated_at = nowIso();
    saveStore(store);
    if (prefer.includes("return=representation")) return send(res, 200, objectMode ? prefs : [prefs]);
    return send(res, 204);
  }

  if (req.method === "POST") {
    const payload = parseJsonBody(await readBody(req));
    const record = Array.isArray(payload) ? payload[0] : payload;
    if (typeof record.notify_in_app === "boolean") prefs.notify_in_app = record.notify_in_app;
    if (typeof record.notify_email === "boolean") prefs.notify_email = record.notify_email;
    if (typeof record.notify_push === "boolean") prefs.notify_push = record.notify_push;
    prefs.updated_at = nowIso();
    saveStore(store);
    if (prefer.includes("return=representation")) return send(res, 201, [prefs]);
    return send(res, 201, null);
  }

  return send(res, 405, { message: "method not allowed" });
}

async function handleUserBlocks(req, res, url, prefer, objectMode) {
  const user = userFromRequest(req);
  if (!user) return send(res, 401, { message: "JWT required" });
  const own = () => store.user_blocks.filter((row) => row.blocker_id === user.id);

  if (req.method === "GET") {
    const rows = projectRows(applyFilters(own(), url.searchParams), url.searchParams.get("select"));
    if (objectMode) {
      if (rows.length !== 1) return send(res, 406, { message: "JSON object requested, multiple (or no) rows returned" });
      return send(res, 200, rows[0]);
    }
    return send(res, 200, rows, { "Content-Range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
  }

  if (req.method === "POST") {
    const payload = parseJsonBody(await readBody(req));
    const record = Array.isArray(payload) ? payload[0] : payload;
    const blockedId = record.blocked_id;
    if (!blockedId || blockedId === user.id) return send(res, 400, { message: "Ungültige Sperre." });
    if (own().some((row) => row.blocked_id === blockedId)) {
      return send(res, 409, { message: "Bereits gesperrt.", code: "23505" });
    }
    const inserted = {
      id: uuid(),
      blocker_id: user.id,
      blocked_id: blockedId,
      created_at: nowIso(),
    };
    store.user_blocks.push(inserted);
    saveStore(store);
    if (prefer.includes("return=representation")) return send(res, 201, [inserted]);
    return send(res, 201, null);
  }

  if (req.method === "DELETE") {
    const matched = applyFilters(own(), url.searchParams);
    const ids = new Set(matched.map((row) => row.id));
    store.user_blocks = store.user_blocks.filter((row) => !ids.has(row.id));
    saveStore(store);
    if (prefer.includes("return=representation")) return send(res, 200, objectMode ? matched[0] || null : matched);
    return send(res, 204);
  }

  return send(res, 405, { message: "method not allowed" });
}

async function handleMatchIgnores(req, res, url, prefer, objectMode) {
  const user = userFromRequest(req);
  if (!user) return send(res, 401, { message: "JWT required" });
  const own = () => store.match_ignores.filter((row) => row.user_id === user.id);

  if (req.method === "GET") {
    const rows = projectRows(applyFilters(own(), url.searchParams), url.searchParams.get("select"));
    if (objectMode) {
      if (rows.length !== 1) return send(res, 406, { message: "JSON object requested, multiple (or no) rows returned" });
      return send(res, 200, rows[0]);
    }
    return send(res, 200, rows, { "Content-Range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
  }

  if (req.method === "POST") {
    const payload = parseJsonBody(await readBody(req));
    const record = Array.isArray(payload) ? payload[0] : payload;
    if (!record.source_item_id || !record.candidate_item_id) {
      return send(res, 400, { message: "Quelle und Kandidat nötig." });
    }
    if (record.source_item_id === record.candidate_item_id) {
      return send(res, 400, { message: "Eigenes Angebot kann nicht ignoriert werden." });
    }
    const duplicate = own().find(
      (row) =>
        row.source_item_id === record.source_item_id &&
        row.candidate_item_id === record.candidate_item_id
    );
    if (duplicate) return send(res, 409, { message: "Bereits ignoriert.", code: "23505" });
    const inserted = {
      id: uuid(),
      user_id: user.id,
      source_item_id: record.source_item_id,
      candidate_item_id: record.candidate_item_id,
      created_at: nowIso(),
    };
    store.match_ignores.push(inserted);
    saveStore(store);
    if (prefer.includes("return=representation")) return send(res, 201, [inserted]);
    return send(res, 201, null);
  }

  return send(res, 405, { message: "method not allowed" });
}

async function handleShippingRpc(req, res, url) {
  if (req.method !== "POST") return send(res, 405, { message: "method not allowed" });
  const user = userFromRequest(req);
  if (!user) return send(res, 401, { message: "JWT required" });
  const name = url.pathname.replace("/rest/v1/rpc/", "");
  const payload = parseJsonBody(await readBody(req));
  const swapId = payload.p_swap_request_id || payload.swap_request_id;
  const shipmentId = payload.p_shipment_id || payload.shipment_id;
  let row = swapId ? store.swap_requests.find((entry) => entry.id === swapId) : null;
  let shipment = shipmentId ? store.swap_shipments.find((entry) => entry.id === shipmentId) : null;
  if (shipment) row = store.swap_requests.find((entry) => entry.id === shipment.swap_request_id) || row;
  if (!row) return send(res, 404, { message: "Anfrage nicht gefunden." });
  const isOwner = row.owner_id === user.id;
  const isRequester = row.requester_id === user.id;
  if (!isOwner && !isRequester) return send(res, 403, { message: "Kein Zugriff." });

  const patch = {};
  if (name === "share_my_shipping_address") {
    patch[isOwner ? "owner_address" : "requester_address"] = payload.p_address || payload.address || "";
  } else if (name === "set_shipment_tracking") {
    if (shipment && shipment.sender_id !== user.id) {
      return send(res, 403, { message: "Nur die Absenderseite setzt Tracking." });
    }
    patch[isOwner ? "owner_tracking" : "requester_tracking"] = payload.p_tracking_code || payload.tracking_code || "";
  } else if (name === "mark_shipment_sent") {
    if (shipment && shipment.sender_id !== user.id) {
      return send(res, 403, { message: "Nur die Absenderseite markiert Versand." });
    }
    patch[isOwner ? "owner_marked_sent_at" : "requester_marked_sent_at"] = nowIso();
  } else if (name === "confirm_shipment_received") {
    if (shipment && shipment.recipient_id !== user.id) {
      return send(res, 403, { message: "Nur die Empfangsseite bestätigt." });
    }
    patch[isOwner ? "owner_received_at" : "requester_received_at"] = nowIso();
  } else if (name === "cancel_shipment") {
    if (shipment && shipment.sender_id !== user.id) {
      return send(res, 403, { message: "Nur die Absenderseite storniert." });
    }
    patch[isOwner ? "owner_cancelled_at" : "requester_cancelled_at"] = nowIso();
  } else if (name === "mark_shipment_return") {
    if (shipment && shipment.recipient_id !== user.id) {
      return send(res, 403, { message: "Nur die Empfangsseite markiert Rücksendung." });
    }
    patch[isOwner ? "owner_return_at" : "requester_return_at"] = nowIso();
  } else if (name === "report_swap_problem") {
    patch.problem = true;
  } else if (name === "remind_swap_peer") {
    patch.remind_other = true;
  } else if (name === "request_sandbox_label") {
    if (!shipment) {
      shipment = store.swap_shipments.find(
        (entry) => entry.swap_request_id === row.id && entry.sender_id === user.id
      );
    }
    if (!shipment) return send(res, 404, { message: "Sendung nicht gefunden." });
    const labeled = applySandboxLabel(row, shipment, user);
    if (!labeled.ok) return send(res, 403, { message: labeled.message });
    saveStore(store);
    return send(res, 200, shippingRpcResult(row, user.id));
  } else if (name === "request_production_label") {
    if (!LABEL_API_ENABLED) {
      return send(res, 403, { message: "LABEL_API_ENABLED ist aus." });
    }
    if (SHIPPING_PROVIDER_ENV !== "production") {
      return send(res, 403, { message: "Production-Umgebung nicht aktiv." });
    }
    if (!process.env.SHIPPING_PRODUCTION_API_KEY) {
      return send(res, 403, { message: "Production-Key fehlt." });
    }
    return send(res, 501, { message: "Echte Label-API ist nicht verdrahtet." });
  } else {
    return send(res, 404, { message: "rpc not found" });
  }

  const applied = applyShipmentPatch(row, user, patch, isOwner, isRequester);
  if (!applied.ok) return send(res, 403, { message: applied.message });
  saveStore(store);
  return send(res, 200, shippingRpcResult(row, user.id));
}

async function handleProviderWebhook(req, res) {
  if (req.method !== "POST") return send(res, 405, { message: "method not allowed" });
  const raw = await readBody(req);
  const internal = String(req.headers["x-internal-key"] || "") === SHIPPING_WEBHOOK_INTERNAL_KEY;
  const signed = validSandboxSignature(raw, req.headers["x-sandbox-signature"]);
  if (!internal && !signed) return send(res, 401, { message: "Ungültige Webhook-Signatur." });
  let payload = {};
  try {
    payload = parseJsonBody(raw);
  } catch {
    return send(res, 400, { message: "Ungültiges JSON." });
  }
  const result = applyCarrierWebhook(payload);
  if (!result.ok) return send(res, result.status || 400, { message: result.message });
  saveStore(store);
  return send(res, 200, { ok: true, duplicate: Boolean(result.duplicate) });
}

async function handleRest(req, res, url) {
  if (url.pathname.startsWith("/rest/v1/rpc/")) return handleShippingRpc(req, res, url);

  const table = url.pathname.replace("/rest/v1/", "");
  const allowed = new Set([
    "items",
    "swap_requests",
    "swap_messages",
    "swap_shipments",
    "swap_shipment_events",
    "notifications",
    "notification_preferences",
    "user_blocks",
    "match_ignores",
  ]);
  if (!allowed.has(table)) {
    return send(res, 404, { message: "table not found" });
  }

  const prefer = String(req.headers.prefer || "");
  const accept = String(req.headers.accept || "");
  const objectMode = accept.includes("application/vnd.pgrst.object+json");

  if (table === "swap_requests") return handleSwapRequests(req, res, url, prefer, objectMode);
  if (table === "swap_messages") return handleSwapMessages(req, res, url, prefer, objectMode);
  if (table === "swap_shipments" || table === "swap_shipment_events") {
    const user = userFromRequest(req);
    if (!user) return send(res, 401, { message: "JWT required" });
    if (req.method !== "GET") return send(res, 403, { message: "Nur Lesen. Änderungen über RPC." });
    const visible = store[table].filter((row) => {
      const shipment =
        table === "swap_shipments"
          ? row
          : store.swap_shipments.find((entry) => entry.id === row.shipment_id);
      const request = store.swap_requests.find((entry) => entry.id === shipment?.swap_request_id);
      return request && (request.requester_id === user.id || request.owner_id === user.id);
    });
    const projected = projectRows(applyFilters(visible, url.searchParams), url.searchParams.get("select")).map(
      (row) => (table === "swap_shipments" ? redactShipment(row, user.id) : row)
    );
    if (objectMode) {
      if (projected.length !== 1) {
        return send(res, 406, { message: "JSON object requested, multiple (or no) rows returned" });
      }
      return send(res, 200, projected[0]);
    }
    return send(res, 200, projected, {
      "Content-Range": `0-${Math.max(projected.length - 1, 0)}/${projected.length}`,
    });
  }
  if (table === "notifications") return handleNotifications(req, res, url, prefer, objectMode);
  if (table === "notification_preferences") {
    return handleNotificationPreferences(req, res, url, prefer, objectMode);
  }
  if (table === "user_blocks") return handleUserBlocks(req, res, url, prefer, objectMode);
  if (table === "match_ignores") return handleMatchIgnores(req, res, url, prefer, objectMode);

  if (req.method === "GET") {
    const rows = projectRows(applyFilters(store.items, url.searchParams), url.searchParams.get("select"));
    if (objectMode) {
      if (rows.length !== 1) return send(res, 406, { message: "JSON object requested, multiple (or no) rows returned" });
      return send(res, 200, rows[0]);
    }
    return send(res, 200, rows, { "Content-Range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
  }

  if (req.method === "POST") {
    const payload = parseJsonBody(await readBody(req));
    const records = Array.isArray(payload) ? payload : [payload];
    const inserted = records.map((record) => ({
      id: uuid(),
      created_at: nowIso(),
      status: "pending",
      currency: "CHF",
      ...record,
    }));
    store.items.push(...inserted);
    saveStore(store);
    if (prefer.includes("return=representation")) {
      return send(res, 201, Array.isArray(payload) ? inserted : inserted[0]);
    }
    return send(res, 201, null);
  }

  if (req.method === "PATCH") {
    const payload = parseJsonBody(await readBody(req));
    const matched = applyFilters(store.items, url.searchParams);
    for (const item of matched) Object.assign(item, payload);
    saveStore(store);
    if (prefer.includes("return=representation")) {
      return send(res, 200, objectMode ? matched[0] || payload : matched);
    }
    return send(res, 204);
  }

  if (req.method === "DELETE") {
    const matched = applyFilters(store.items, url.searchParams);
    const matchedIds = new Set(matched.map((item) => item.id));
    store.items = store.items.filter((item) => !matchedIds.has(item.id));
    saveStore(store);
    if (prefer.includes("return=representation")) {
      return send(res, 200, objectMode ? matched[0] || null : matched);
    }
    return send(res, 204);
  }

  return send(res, 405, { message: "method not allowed" });
}

async function handleStorage(req, res, url) {
  const publicPrefix = "/storage/v1/object/public/";
  const objectPrefix = "/storage/v1/object/";

  if (req.method === "GET" && url.pathname.startsWith(publicPrefix)) {
    const key = decodeURIComponent(url.pathname.slice(publicPrefix.length));
    const file = store.files[key];
    if (!file) return send(res, 404, { statusCode: "404", error: "not_found" });
    return sendRaw(res, 200, Buffer.from(file.content, "base64"), file.contentType);
  }

  if (req.method === "POST" && url.pathname.startsWith(objectPrefix)) {
    const key = decodeURIComponent(url.pathname.slice(objectPrefix.length));
    const body = await readBody(req);
    store.files[key] = {
      content: body.toString("base64"),
      contentType: req.headers["content-type"] || "application/octet-stream",
    };
    saveStore(store);
    return send(res, 200, { Key: key, Id: key });
  }

  if (req.method === "DELETE" && url.pathname.startsWith(objectPrefix)) {
    const payload = parseJsonBody(await readBody(req));
    const prefixes = Array.isArray(payload.prefixes) ? payload.prefixes : [];
    const bucket = decodeURIComponent(url.pathname.slice(objectPrefix.length)).replace(/\/$/, "");
    for (const prefix of prefixes) {
      delete store.files[`${bucket}/${prefix}`];
    }
    saveStore(store);
    return send(res, 200, prefixes.map((prefix) => ({ name: prefix })));
  }

  return send(res, 404, { error: "not_found" });
}

const apiServer = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders(req));
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://127.0.0.1:${API_PORT}`);

    if (url.pathname.startsWith("/auth/v1/")) return await handleAuth(req, res, url);
    if (url.pathname.startsWith("/rest/v1/")) return await handleRest(req, res, url);
    if (url.pathname.startsWith("/storage/v1/")) return await handleStorage(req, res, url);
    if (url.pathname === "/shipping/v1/webhooks/sandbox") return await handleProviderWebhook(req, res);

    if (url.pathname === "/health") return send(res, 200, { ok: true, mode: "local-test" });
    return send(res, 404, { error: "not_found", path: url.pathname });
  } catch (error) {
    send(res, 500, { error: "internal", message: String(error) });
  }
});

function startSmtp() {
  const server = net.createServer((socket) => {
    let buffer = "";
    let dataMode = false;
    let message = "";
    socket.write("220 swapfy-local-test ESMTP\r\n");
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      if (dataMode) {
        message += chunk.toString("utf8");
        if (message.includes("\r\n.\r\n")) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
          fs.appendFileSync(MAIL_LOG, `\n--- ${nowIso()} ---\n${message}`);
          dataMode = false;
          message = "";
          socket.write("250 OK\r\n");
        }
        return;
      }
      while (buffer.includes("\r\n")) {
        const idx = buffer.indexOf("\r\n");
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const command = line.split(" ")[0].toUpperCase();
        if (command === "EHLO" || command === "HELO") {
          socket.write("250-swapfy-local-test\r\n250 AUTH LOGIN PLAIN\r\n");
        } else if (command === "AUTH") {
          socket.write("235 2.7.0 Authentication successful\r\n");
        } else if (command === "MAIL" || command === "RCPT" || command === "RSET") {
          socket.write("250 OK\r\n");
        } else if (command === "DATA") {
          dataMode = true;
          message = "";
          socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
        } else if (command === "QUIT") {
          socket.write("221 Bye\r\n");
          socket.end();
        } else {
          socket.write("250 OK\r\n");
        }
      }
    });
  });
  server.listen(SMTP_PORT, "127.0.0.1");
  return server;
}

apiServer.listen(API_PORT, "127.0.0.1", () => {
  startSmtp();
  console.log(`Local test API: http://127.0.0.1:${API_PORT}`);
  console.log(`Local test SMTP: 127.0.0.1:${SMTP_PORT}`);
  console.log("Mode: local test data only (no production connection)");
  console.log(`Shipping: env=${SHIPPING_PROVIDER_ENV} labelApi=${LABEL_API_ENABLED}`);
});
