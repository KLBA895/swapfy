export const VALUE_TOLERANCE = 0.2;
export const MIN_MATCH_SCORE = 40;

const BLOCKED_STATUS = new Set([
  "reserved",
  "swapped",
  "paused",
  "expired",
  "deleted",
  "abgelaufen",
]);

const CONDITION_ORDER = [
  "neu",
  "wie neu",
  "sehr gut",
  "gut",
  "gebraucht",
  "defekt",
];

const ALIASES: Record<string, string[]> = {
  kamera: ["kamera", "kameras", "camera", "foto"],
  uhr: ["uhr", "uhren", "watch", "watches"],
  ipad: ["ipad", "tablet"],
};

export type MatchItem = {
  id: string;
  user_id: string | null;
  title: string;
  category: string;
  condition: string;
  estimated_value: string;
  currency: string | null;
  postal_code: string | null;
  region: string;
  wanted_item: string | null;
  status: string | null;
  created_at: string;
  image_url?: string | null;
};

export type MatchChip = {
  key: string;
  label: string;
  points: number;
};

export type MatchSuggestion = {
  item: MatchItem;
  score: number;
  chips: MatchChip[];
};

export function isListedForMatch(status: string | null | undefined) {
  if (!status) return true;
  return !BLOCKED_STATUS.has(status);
}

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function tokens(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((part) => part.length >= 3);
}

function expand(token: string) {
  for (const group of Object.values(ALIASES)) {
    if (group.includes(token)) return group;
  }
  return [token];
}

function wantedHits(wanted: string, haystack: string) {
  const text = normalizeText(haystack);
  if (!text) return false;
  return tokens(wanted).some((token) => expand(token).some((alias) => text.includes(alias)));
}

export function parseValue(raw: string) {
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function conditionIndex(raw: string) {
  const text = normalizeText(raw);
  return CONDITION_ORDER.findIndex((entry) => text.includes(entry));
}

export function scorePair(source: MatchItem, candidate: MatchItem): MatchSuggestion | null {
  const wanted = (source.wanted_item || "").trim();
  if (!wanted) return null;

  const chips: MatchChip[] = [];

  if (wantedHits(wanted, candidate.title)) {
    chips.push({ key: "wanted_title", label: "Gesucht trifft Titel", points: 40 });
  }
  if (wantedHits(wanted, candidate.category)) {
    chips.push({ key: "wanted_category", label: "Gesucht trifft Kategorie", points: 20 });
  }
  if ((candidate.wanted_item || "").trim() && wantedHits(candidate.wanted_item || "", source.title)) {
    chips.push({ key: "mutual", label: "Gegenseitiger Wunsch", points: 15 });
  }
  if (source.region && candidate.region && normalizeText(source.region) === normalizeText(candidate.region)) {
    chips.push({ key: "region", label: "Gleiche Stadt", points: 10 });
  }
  if (
    source.postal_code &&
    candidate.postal_code &&
    source.postal_code === candidate.postal_code
  ) {
    chips.push({ key: "postal", label: "Gleiche PLZ", points: 8 });
  }

  const sourceValue = parseValue(source.estimated_value);
  const candidateValue = parseValue(candidate.estimated_value);
  const sameCurrency =
    (source.currency || "CHF") === (candidate.currency || "CHF");
  if (
    sourceValue &&
    candidateValue &&
    sameCurrency &&
    Math.abs(candidateValue - sourceValue) / sourceValue <= VALUE_TOLERANCE
  ) {
    chips.push({
      key: "value",
      label: `Wert im Band ±${Math.round(VALUE_TOLERANCE * 100)} %`,
      points: 5,
    });
  }

  const sourceCondition = conditionIndex(source.condition);
  const candidateCondition = conditionIndex(candidate.condition);
  if (
    sourceCondition >= 0 &&
    candidateCondition >= 0 &&
    candidateCondition <= sourceCondition + 1
  ) {
    chips.push({ key: "condition", label: "Zustand vergleichbar", points: 2 });
  }

  const score = chips.reduce((sum, chip) => sum + chip.points, 0);
  if (score < MIN_MATCH_SCORE) return null;
  return { item: candidate, score, chips };
}

export function rankMatches(
  source: MatchItem,
  candidates: MatchItem[],
  options: { userId: string; ignoredCandidateIds: Set<string> }
): MatchSuggestion[] {
  if (!isListedForMatch(source.status) || source.user_id !== options.userId) {
    return [];
  }

  const ranked = candidates
    .filter((candidate) => {
      if (candidate.id === source.id) return false;
      if (candidate.user_id === options.userId) return false;
      if (!isListedForMatch(candidate.status)) return false;
      if (options.ignoredCandidateIds.has(candidate.id)) return false;
      return true;
    })
    .map((candidate) => scorePair(source, candidate))
    .filter((row): row is MatchSuggestion => Boolean(row));

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aTime = a.item.created_at;
    const bTime = b.item.created_at;
    if (aTime !== bTime) return aTime < bTime ? 1 : -1;
    const aVal = parseValue(a.item.estimated_value);
    const bVal = parseValue(b.item.estimated_value);
    const sourceVal = parseValue(source.estimated_value) || 0;
    const aDiff = aVal == null ? Number.POSITIVE_INFINITY : Math.abs(aVal - sourceVal);
    const bDiff = bVal == null ? Number.POSITIVE_INFINITY : Math.abs(bVal - sourceVal);
    if (aDiff !== bDiff) return aDiff - bDiff;
    return a.item.id.localeCompare(b.item.id);
  });

  return ranked;
}
