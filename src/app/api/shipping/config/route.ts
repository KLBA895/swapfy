import { NextResponse } from "next/server";
import { publicShippingConfig } from "@/lib/shippingProvider";

export async function GET() {
  return NextResponse.json(publicShippingConfig());
}
