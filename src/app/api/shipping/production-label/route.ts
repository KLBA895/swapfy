import { NextResponse } from "next/server";
import { labelApiEnabled, shippingProviderEnv } from "@/lib/shippingProvider";

export async function POST() {
  if (!labelApiEnabled() || shippingProviderEnv() !== "production") {
    return NextResponse.json({ message: "LABEL_API_ENABLED ist aus." }, { status: 403 });
  }
  return NextResponse.json(
    { message: "Echte Label-API ist nicht verdrahtet." },
    { status: 501 }
  );
}
