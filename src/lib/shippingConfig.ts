export type ShippingProviderEnv = "sandbox" | "production";

export function shippingProviderEnv(): ShippingProviderEnv {
  return process.env.SHIPPING_PROVIDER_ENV === "production" ? "production" : "sandbox";
}

export function labelApiEnabled() {
  return process.env.LABEL_API_ENABLED === "1";
}

export function publicShippingConfig() {
  const env = shippingProviderEnv();
  return {
    env,
    sandboxLabel: env === "sandbox",
    labelApiEnabled: labelApiEnabled(),
    productionWired: false,
  };
}
