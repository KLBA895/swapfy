"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { SWAP_STATUS, SWAP_STATUS_LABEL, type SwapRequest } from "@/lib/swapRequests";

type Item = {
  id: string;
  user_id: string | null;
  status: string | null;
  title: string;
  category: string;
  condition: string;
  estimated_value: string;
  currency: string | null;
  postal_code: string | null;
  region: string;
  wanted_item: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
};

export default function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [ownRequest, setOwnRequest] = useState<SwapRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const loadItem = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const { data, error } = await supabase
        .from("items")
        .select(
          "id, user_id, status, title, category, condition, estimated_value, currency, postal_code, region, wanted_item, description, image_url, created_at"
        )
        .eq("id", id)
        .single();

      if (!error && data) {
        setItem(data as Item);
      }

      if (user) {
        const { data: requests } = await supabase
          .from("swap_requests")
          .select("id, item_id, requester_id, owner_id, status, created_at")
          .eq("item_id", id)
          .eq("requester_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
        setOwnRequest(((requests || []) as SwapRequest[])[0] || null);
      }

      setLoading(false);
    };

    loadItem();
  }, [id]);

  const sendRequest = async () => {
    if (!userId) {
      window.location.href = "/login";
      return;
    }
    if (!item?.user_id) return;

    setBusy(true);
    setActionError("");

    const { data, error } = await supabase
      .from("swap_requests")
      .insert({
        item_id: item.id,
        requester_id: userId,
        owner_id: item.user_id,
        status: SWAP_STATUS.created,
      })
      .select("id, item_id, requester_id, owner_id, status, created_at");

    setBusy(false);

    if (error || !data?.length) {
      setActionError(error?.message || "Anfrage konnte nicht gesendet werden.");
      return;
    }

    setOwnRequest(data[0] as SwapRequest);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-6 py-20 text-center">
        Artikel wird geladen...
      </main>
    );
  }

  if (!item) {
    return (
      <main className="min-h-screen bg-white px-6 py-20 text-center">
        Artikel wurde nicht gefunden.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <header className="border-b border-gray-100 bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-3">
            <Image
              src="/swapfy-icon.png"
              alt="Swapfy Logo"
              width={42}
              height={42}
              className="rounded-full"
            />
            <span className="text-2xl font-bold tracking-tight">
              SWAP<span className="text-[#16A34A]">FY</span>
            </span>
          </a>

          <a
            href="/items"
            className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold hover:border-[#16A34A] hover:text-[#16A34A]"
          >
            Zurück zum Marktplatz
          </a>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6">
          <div className="relative h-[520px] overflow-hidden rounded-2xl bg-white">
            <Image
              src={item.image_url || "/items/apple-watch.jpg"}
              alt={item.title}
              fill
              className="object-contain"
            />
          </div>
        </div>

        <div>
          <div className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            {item.category}
          </div>

          <h1 className="mt-5 text-4xl font-bold">{item.title}</h1>

          <p className="mt-4 text-2xl font-bold text-[#16A34A]">
            {item.estimated_value} {item.currency || "CHF"}
          </p>

          <div className="mt-6 space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p>
              <span className="font-semibold">Zustand:</span> {item.condition}
            </p>

            <p>
              <span className="font-semibold">Standort:</span>{" "}
              {item.postal_code ? `${item.postal_code} ` : ""}
              {item.region}
            </p>

            {item.wanted_item && (
              <p>
                <span className="font-semibold">Gesucht:</span>{" "}
                {item.wanted_item}
              </p>
            )}
          </div>

          {item.description && (
            <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold">Beschreibung</h2>
              <p className="mt-3 leading-7 text-gray-600">
                {item.description}
              </p>
            </div>
          )}

          {item.user_id && userId === item.user_id ? (
            <p className="mt-8 rounded-2xl bg-gray-50 p-4 text-center text-gray-600">
              Das ist dein Artikel.
            </p>
          ) : item.status === "reserved" ? (
            <p className="mt-8 rounded-2xl bg-gray-50 p-4 text-center text-gray-600">
              Dieser Artikel ist reserviert.
            </p>
          ) : ownRequest?.status === SWAP_STATUS.created ? (
            <a
              href="/swap-requests"
              className="mt-8 block w-full rounded-full bg-gray-900 px-6 py-4 text-center font-semibold text-white"
            >
              Anfrage gesendet · {SWAP_STATUS_LABEL[ownRequest.status]}
            </a>
          ) : ownRequest ? (
            <p className="mt-8 rounded-2xl bg-gray-50 p-4 text-center text-gray-600">
              Letzte Anfrage: {SWAP_STATUS_LABEL[ownRequest.status]}
            </p>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={sendRequest}
              className="mt-8 w-full rounded-full bg-[#16A34A] px-6 py-4 font-semibold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-60"
            >
              {userId ? (busy ? "Wird gesendet..." : "Tauschanfrage senden") : "Zum Anfragen einloggen"}
            </button>
          )}
          {actionError && (
            <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{actionError}</p>
          )}
        </div>
      </section>
    </main>
  );
}