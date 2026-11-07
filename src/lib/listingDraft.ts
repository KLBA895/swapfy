const MAX_FIELD = 200;
const MAX_NOTES = 500;
const MAX_OUTPUT = 800;
const INJECTION = /ignoriere|ignore previous|veröffentlich|setze wert|system prompt|<\/?[a-z]/i;

export type ListingDraftInput = {
  title: string;
  category: string;
  condition: string;
  wantedItem: string;
  notes: string;
};

export function listingDraftStubEnabled() {
  if (process.env.LISTING_DRAFT_STUB === "0") return false;
  if (process.env.LISTING_DRAFT_STUB === "1") return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return url.includes("127.0.0.1") || url.includes("localhost");
}

export function clip(value: unknown, max: number) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function sanitizeDraftInput(body: Record<string, unknown>): ListingDraftInput {
  return {
    title: clip(body.title, MAX_FIELD),
    category: clip(body.category, MAX_FIELD),
    condition: clip(body.condition, MAX_FIELD),
    wantedItem: clip(body.wantedItem, MAX_FIELD),
    notes: clip(body.notes, MAX_NOTES),
  };
}

export function buildListingDraft(input: ListingDraftInput) {
  const wanted = input.wantedItem || "ein vergleichbares Angebot";
  const extra = input.notes && !INJECTION.test(input.notes) ? ` ${input.notes}` : "";
  const text = [
    `${input.title || "Artikel"} (${input.category || "Kategorie"}, ${input.condition || "Zustand"}).`,
    `Zum Tausch gegen ${wanted}.`,
    extra.trim(),
    "Entwurf zur Bearbeitung — Wert, Zustand und Veröffentlichung setzt nur der Nutzer.",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, MAX_OUTPUT);

  return { description: text };
}
