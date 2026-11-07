import { NextResponse } from "next/server";
import { shippingProviderEnv } from "@/lib/shippingProvider";
import { forwardRpc, requireUserToken } from "../_forward";

export async function POST(request: Request) {
  if (shippingProviderEnv() !== "sandbox") {
    return NextResponse.json({ message: "Sandbox-Label nur in der Testumgebung." }, { status: 403 });
  }
  const auth = requireUserToken(request);
  if (!auth) return NextResponse.json({ message: "Login nötig." }, { status: 401 });
  let body: Record<string, string> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Ungültige Anfrage." }, { status: 400 });
  }
  const forwarded = await forwardRpc(auth, "request_sandbox_label", {
    p_swap_request_id: String(body.p_swap_request_id || body.swap_request_id || ""),
    p_shipment_id: String(body.p_shipment_id || body.shipment_id || ""),
  });
  return NextResponse.json(forwarded.data, { status: forwarded.status });
}
