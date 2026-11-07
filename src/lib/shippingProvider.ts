import { labelApiEnabled, shippingProviderEnv } from "@/lib/shippingConfig";

export { labelApiEnabled, shippingProviderEnv, publicShippingConfig } from "@/lib/shippingConfig";

export function sandboxSecret() {
  return process.env.SHIPPING_SANDBOX_SECRET || "local-sandbox-secret";
}

export function webhookInternalKey() {
  return process.env.SHIPPING_WEBHOOK_INTERNAL_KEY || "local-webhook-internal";
}

export function productionLabelBlockedReason() {
  if (!labelApiEnabled()) return "LABEL_API_ENABLED ist aus.";
  if (shippingProviderEnv() !== "production") return "Production-Umgebung nicht aktiv.";
  if (!process.env.SHIPPING_PRODUCTION_API_KEY) return "Production-Key fehlt.";
  return "";
}
