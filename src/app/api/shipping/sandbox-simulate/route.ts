import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { sandboxSecret, shippingProviderEnv } from "@/lib/shippingProvider";
import { requireUserToken } from "../_forward";

export async function POST(request: Request) {
  if (shippingProviderEnv() !== "sandbox") {
    return NextResponse.json({ message: "Simulation nur in der Sandbox." }, { status: 403 });
  }
  const auth = requireUserToken(request);
  if (!auth) return NextResponse.json({ message: "Login nötig." }, { status: 401 });
  let body: Record<string, string> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Ungültige Anfrage." }, { status: 400 });
  }
  const shipmentId = String(body.shipment_id || "");
  const carrierStatus = body.carrier_status === "delivered" ? "delivered" : "in_transit";
  if (!shipmentId) return NextResponse.json({ message: "shipment_id fehlt." }, { status: 400 });

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return NextResponse.json({ message: "Backend fehlt." }, { status: 500 });

  const shipRes = await fetch(
    `${base}/rest/v1/swap_shipments?id=eq.${encodeURIComponent(shipmentId)}&select=id,provider_shipment_id,sender_id,recipient_id`,
    { headers: { Authorization: auth, apikey: key, Accept: "application/json" } }
  );
  const rows = (await shipRes.json().catch(() => [])) as Array<{
    id?: string;
    provider_shipment_id?: string;
  }>;
  const shipment = Array.isArray(rows) ? rows[0] : rows;
  if (!shipment?.provider_shipment_id) {
    return NextResponse.json({ message: "Zuerst ein Sandbox-Etikett erzeugen." }, { status: 400 });
  }

  const payload = JSON.stringify({
    delivery_id: body.delivery_id || `sim-${Date.now()}`,
    provider: "sandbox-post",
    provider_env: "sandbox",
    provider_shipment_id: shipment.provider_shipment_id,
    carrier_status: carrierStatus,
  });
  const signature = createHmac("sha256", sandboxSecret()).update(payload).digest("hex");
  const origin = new URL(request.url).origin;
  const hook = await fetch(`${origin}/api/shipping/webhooks/sandbox`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-sandbox-signature": signature },
    body: payload,
  });
  const data = await hook.json().catch(() => ({ message: "Simulation fehlgeschlagen." }));
  return NextResponse.json(data, { status: hook.status });
}
