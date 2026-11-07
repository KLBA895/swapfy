"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  SWAP_REQUEST_SELECT,
  SWAP_STATUS,
  SWAP_STATUS_LABEL,
  type SwapRequest,
  type SwapStatus,
} from "@/lib/swapRequests";

type ItemSummary = {
  id: string;
  title: string;
  status: string | null;
};

export default function SwapRequestsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sent, setSent] = useState<SwapRequest[]>([]);
  const [received, setReceived] = useState<SwapRequest[]>([]);
  const [items, setItems] = useState<Record<string, ItemSummary>>({});
  const [unreadByRequest, setUnreadByRequest] = useState<Record<string, number>>({});
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

    const { data, error: loadError } = await supabase
      .from("swap_requests")
      .select(SWAP_REQUEST_SELECT)
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as SwapRequest[];
    setSent(rows.filter((row) => row.requester_id === user.id));
    setReceived(rows.filter((row) => row.owner_id === user.id));

    const itemIds = [...new Set(rows.map((row) => row.item_id))];
    if (itemIds.length) {
      const { data: itemRows } = await supabase
        .from("items")
        .select("id, title, status")
        .in("id", itemIds);
      const map: Record<string, ItemSummary> = {};
      for (const item of (itemRows || []) as ItemSummary[]) map[item.id] = item;
      setItems(map);
    }

    const { data: notices } = await supabase
      .from("notifications")
      .select("swap_request_id")
      .eq("user_id", user.id)
      .is("read_at", null);
    const counts: Record<string, number> = {};
    for (const notice of notices || []) {
      const requestId = (notice as { swap_request_id?: string }).swap_request_id;
      if (!requestId) continue;
      counts[requestId] = (counts[requestId] || 0) + 1;
    }
    setUnreadByRequest(counts);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (request: SwapRequest, status: SwapStatus) => {
    setError("");

    const { data, error: updateError } = await supabase
      .from("swap_requests")
      .update({ status })
      .eq("id", request.id)
      .select("id");

    if (updateError || !data?.length) {
      setError(updateError?.message || "Aktion nicht erlaubt.");
      return;
    }

    if (status === SWAP_STATUS.accepted) {
      await supabase
        .from("items")
        .update({ status: "reserved" })
        .eq("id", request.item_id)
        .eq("user_id", request.owner_id);
      await supabase
        .from("swap_requests")
        .update({ status: SWAP_STATUS.declined })
        .eq("item_id", request.item_id)
        .eq("status", SWAP_STATUS.created)
        .neq("id", request.id);
    }

    await load();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        Lade Anfragen...
      </main>
    );
  }

  const renderList = (rows: SwapRequest[], incoming: boolean) => {
    if (!rows.length) {
      return <p className="text-gray-500">Keine Anfragen.</p>;
    }

    return (
      <div className="space-y-4">
        {rows.map((row) => {
          const item = items[row.item_id];
          const open = row.status === SWAP_STATUS.created;
          return (
            <div key={row.id} className="rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="font-semibold">{item?.title || "Artikel"}</p>
              <p className="mt-1 text-sm text-gray-500">
                {SWAP_STATUS_LABEL[row.status]}
                {item?.status === "reserved" ? " · Artikel reserviert" : ""}
                {row.status === SWAP_STATUS.accepted &&
                (row.owner_tracking || row.requester_tracking)
                  ? " · Tracking"
                  : ""}
              </p>
              <a
                href={`/swap-requests/${row.id}`}
                className="mt-3 inline-block text-sm font-semibold text-[#16A34A]"
              >
                Nachrichten{unreadByRequest[row.id] ? ` · ${unreadByRequest[row.id]} neu` : ""}
              </a>
              {open && incoming && userId === row.owner_id && (
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => updateStatus(row, SWAP_STATUS.accepted)}
                    className="rounded-full bg-[#16A34A] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Annehmen
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(row, SWAP_STATUS.declined)}
                    className="rounded-full border px-4 py-2 text-sm font-semibold"
                  >
                    Ablehnen
                  </button>
                </div>
              )}
              {open && !incoming && userId === row.requester_id && (
                <button
                  type="button"
                  onClick={() => updateStatus(row, SWAP_STATUS.withdrawn)}
                  className="mt-4 rounded-full border px-4 py-2 text-sm font-semibold"
                >
                  Zurückziehen
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <main className="mx-auto max-w-4xl p-8">
      <a href="/account" className="text-sm text-gray-500 hover:text-[#16A34A]">
        ← Account
      </a>
      <h1 className="mt-6 text-4xl font-bold">Tauschanfragen</h1>
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>
      )}
      <section className="mt-10">
        <h2 className="mb-4 text-2xl font-semibold">Erhalten</h2>
        {renderList(received, true)}
      </section>
      <section className="mt-12">
        <h2 className="mb-4 text-2xl font-semibold">Gesendet</h2>
        {renderList(sent, false)}
      </section>
    </main>
  );
}
