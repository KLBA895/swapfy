"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  MIN_MATCH_SCORE,
  VALUE_TOLERANCE,
  rankMatches,
  type MatchItem,
  type MatchSuggestion,
} from "@/lib/matching";

const SELECT =
  "id, user_id, title, category, condition, estimated_value, currency, postal_code, region, wanted_item, status, created_at, image_url";

export default function MatchesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ownItems, setOwnItems] = useState<MatchItem[]>([]);
  const [candidates, setCandidates] = useState<MatchItem[]>([]);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [sourceId, setSourceId] = useState("");
  const [category, setCategory] = useState("all");
  const [region, setRegion] = useState("all");
  const [mutualOnly, setMutualOnly] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setUserId(user.id);

    const { data: ownRows, error: ownError } = await supabase
      .from("items")
      .select(SELECT)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (ownError) {
      setError(ownError.message);
      setLoading(false);
      return;
    }

    const { data: otherRows, error: otherError } = await supabase
      .from("items")
      .select(SELECT)
      .neq("user_id", user.id);
    if (otherError) {
      setError(otherError.message);
      setLoading(false);
      return;
    }

    const { data: ignoreRows, error: ignoreError } = await supabase
      .from("match_ignores")
      .select("source_item_id, candidate_item_id")
      .eq("user_id", user.id);
    if (ignoreError) {
      setError(ignoreError.message);
      setLoading(false);
      return;
    }

    const own = (ownRows || []) as MatchItem[];
    setOwnItems(own);
    setCandidates((otherRows || []) as MatchItem[]);
    const keys = new Set(
      (ignoreRows || []).map(
        (row: { source_item_id: string; candidate_item_id: string }) =>
          `${row.source_item_id}:${row.candidate_item_id}`
      )
    );
    setIgnored(keys);
    if (!sourceId && own[0]) setSourceId(own[0].id);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const source = ownItems.find((item) => item.id === sourceId) || null;

  const ranked = useMemo(() => {
    if (!source || !userId) return [];
    const ignoredIds = new Set(
      [...ignored]
        .filter((key) => key.startsWith(`${source.id}:`))
        .map((key) => key.slice(source.id.length + 1))
    );
    return rankMatches(source, candidates, {
      userId,
      ignoredCandidateIds: ignoredIds,
    });
  }, [source, userId, candidates, ignored]);

  const suggestions = useMemo(() => {
    let rows = ranked;
    if (category !== "all") rows = rows.filter((row) => row.item.category === category);
    if (region !== "all") rows = rows.filter((row) => row.item.region === region);
    if (mutualOnly) rows = rows.filter((row) => row.chips.some((chip) => chip.key === "mutual"));
    return rows;
  }, [ranked, category, region, mutualOnly]);

  const ignore = async (row: MatchSuggestion) => {
    if (!userId || !source) return;
    const { error: ignoreError } = await supabase.from("match_ignores").insert({
      user_id: userId,
      source_item_id: source.id,
      candidate_item_id: row.item.id,
    });
    if (ignoreError) {
      setError(ignoreError.message);
      return;
    }
    setIgnored((old) => new Set(old).add(`${source.id}:${row.item.id}`));
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        Lade Vorschläge...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <a href="/account" className="text-sm text-gray-500 hover:text-[#16A34A]">
        ← Account
      </a>
      <h1 className="mt-6 text-4xl font-bold">Tauschvorschläge</h1>
      <p className="mt-3 text-gray-500">
        Regelbasiert, ohne KI. Mindestscore {MIN_MATCH_SCORE}. Wertband ±
        {Math.round(VALUE_TOLERANCE * 100)} %, Region = gleiche Stadt. Reserved, eigene und
        ignorierte Angebote fallen aus.
      </p>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}

      <label className="mt-8 block text-sm font-semibold">Eigenes Inserat</label>
      <select
        className="mt-2 w-full rounded-2xl border px-4 py-3"
        value={sourceId}
        onChange={(event) => setSourceId(event.target.value)}
      >
        {ownItems.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </select>

      {source && !(source.wanted_item || "").trim() && (
        <p className="mt-4 rounded-xl bg-gray-50 p-4 text-gray-600">
          Für Vorschläge braucht dieses Inserat ein ausgefülltes Feld «Was suchst du?».
        </p>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <select
          className="rounded-2xl border px-4 py-3"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">Alle Kategorien</option>
          {[...new Set(ranked.map((row) => row.item.category).filter(Boolean))].map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          className="rounded-2xl border px-4 py-3"
          value={region}
          onChange={(event) => setRegion(event.target.value)}
        >
          <option value="all">Alle Regionen</option>
          {[...new Set(ranked.map((row) => row.item.region).filter(Boolean))].map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-2xl border px-4 py-3">
          <input
            type="checkbox"
            checked={mutualOnly}
            onChange={(event) => setMutualOnly(event.target.checked)}
          />
          Nur gegenseitig
        </label>
      </div>

      <div className="mt-10 space-y-4">
        {suggestions.length === 0 && (
          <p className="text-gray-500">Keine nachvollziehbaren Vorschläge.</p>
        )}
        {suggestions.map((row) => (
          <article key={row.item.id} className="rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{row.item.title}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {row.item.estimated_value} {row.item.currency || "CHF"} · {row.item.region} · Score{" "}
                  {row.score}
                </p>
              </div>
              <button
                type="button"
                className="text-sm text-gray-500"
                onClick={() => ignore(row)}
              >
                Ignorieren
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {row.chips.map((chip) => (
                <span
                  key={chip.key}
                  className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700"
                >
                  {chip.label}
                </span>
              ))}
            </div>
            <a
              href={`/items/${row.item.id}`}
              className="mt-4 inline-block text-sm font-semibold text-[#16A34A]"
            >
              Zum Angebot
            </a>
          </article>
        ))}
      </div>
    </main>
  );
}
