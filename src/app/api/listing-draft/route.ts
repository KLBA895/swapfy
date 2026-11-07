import { NextResponse } from "next/server";
import {
  buildListingDraft,
  listingDraftStubEnabled,
  sanitizeDraftInput,
} from "@/lib/listingDraft";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function clientKey(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!token) return "";
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8"));
    return String(payload.sub || "");
  } catch {
    return "";
  }
}

function allow(userId: string) {
  const now = Date.now();
  const stamps = (hits.get(userId) || []).filter((time) => now - time < WINDOW_MS);
  if (stamps.length >= MAX_PER_WINDOW) {
    hits.set(userId, stamps);
    return false;
  }
  stamps.push(now);
  hits.set(userId, stamps);
  return true;
}

export async function POST(request: Request) {
  if (!listingDraftStubEnabled()) {
    return NextResponse.json({ ok: false, error: "nicht verfügbar" }, { status: 404 });
  }

  const userId = clientKey(request);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Login nötig." }, { status: 401 });
  }
  if (!allow(userId)) {
    return NextResponse.json({ ok: false, error: "Zu viele Vorschläge. Bitte später." }, { status: 429 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  const input = sanitizeDraftInput(body);
  if (!input.title) {
    return NextResponse.json({ ok: false, error: "Titel nötig für einen Vorschlag." }, { status: 400 });
  }

  const draft = buildListingDraft(input);
  return NextResponse.json({ ok: true, description: draft.description });
}
