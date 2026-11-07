"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { AppNotification } from "@/lib/notifications";

export default function NotificationsPage() {
  const [rows, setRows] = useState<AppNotification[]>([]);
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

    const { data, error: loadError } = await supabase
      .from("notifications")
      .select("id, user_id, type, swap_request_id, message_id, title, body, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }

    setRows((data || []) as AppNotification[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (row: AppNotification) => {
    if (row.read_at) return;
    const readAt = new Date().toISOString();
    await supabase.from("notifications").update({ read_at: readAt }).eq("id", row.id);
    setRows((old) => old.map((entry) => (entry.id === row.id ? { ...entry, read_at: readAt } : entry)));
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        Lade Hinweise...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <a href="/account" className="text-sm text-gray-500 hover:text-[#16A34A]">
        ← Account
      </a>
      <h1 className="mt-6 text-4xl font-bold">Hinweise</h1>
      <p className="mt-3 text-gray-500">
        Nur In-App-Status. Keine Artikel-, Preis- oder Adressdaten in diesen Texten.
      </p>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      <div className="mt-10 space-y-4">
        {rows.length === 0 && <p className="text-gray-500">Keine Hinweise.</p>}
        {rows.map((row) => (
          <article
            key={row.id}
            className={`rounded-2xl border p-5 ${row.read_at ? "border-gray-100" : "border-[#16A34A] bg-green-50/40"}`}
          >
            <h2 className="font-semibold">{row.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{row.body}</p>
            <div className="mt-3 flex gap-4 text-sm">
              {row.swap_request_id && (
                <a
                  href={`/swap-requests/${row.swap_request_id}`}
                  className="font-semibold text-[#16A34A]"
                  onClick={() => markRead(row)}
                >
                  Zur Anfrage
                </a>
              )}
              {!row.read_at && (
                <button type="button" className="text-gray-600" onClick={() => markRead(row)}>
                  Als gelesen
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
