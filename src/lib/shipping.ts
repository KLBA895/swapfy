export const POST_LABEL_INLAND =
  "https://www.post.ch/de/pakete-versenden/frankieren/paketetiketten-inland/privatkunden";
export const POST_WAYBILL_INTL =
  "https://www.post.ch/de/kundencenter/onlinedienste/frachtbrief-erstellen-barzahlung/info";
export const POST_TRACK_BASE = "https://www.post.ch/swisspost-tracking?formattedParcelCodes=";

export function sanitizeTrackingCode(raw: string) {
  return raw.replace(/[^A-Za-z0-9.]/g, "").slice(0, 40);
}

export function trackingUrl(code: string) {
  const clean = sanitizeTrackingCode(code);
  if (!clean) return "";
  return `${POST_TRACK_BASE}${encodeURIComponent(clean)}`;
}
