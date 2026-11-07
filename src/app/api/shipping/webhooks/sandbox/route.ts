import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sandboxSecret, shippingProviderEnv, webhookInternalKey } from "@/lib/shippingProvider";

function validSignature(raw: string, signature: string) {
  const expected = createHmac("sha256", sandboxSecret()).update(raw).digest("hex");
  const given = signature.replace(/^sha256=/i, "");
  if (!given || given.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(given, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (shippingProviderEnv() !== "sandbox") {
    return NextResponse.json({ message: "Nur Sandbox-Webhooks." }, { status: 403 });
  }
  const raw = await request.text();
  const signature = request.headers.get("x-sandbox-signature") || "";
  if (!validSignature(raw, signature)) {
    return NextResponse.json({ message: "Ungültige Webhook-Signatur." }, { status: 401 });
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return NextResponse.json({ message: "Backend fehlt." }, { status: 500 });
  const res = await fetch(`${base}/shipping/v1/webhooks/sandbox`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": webhookInternalKey(),
    },
    body: raw,
  });
  const data = await res.json().catch(() => ({ message: "Webhook-Fehler." }));
  return NextResponse.json(data, { status: res.status });
}
