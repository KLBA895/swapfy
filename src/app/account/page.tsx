"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { DEFAULT_PREFS, type NotificationPreferences } from "@/lib/notifications";

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [unread, setUnread] = useState(0);
  const [prefError, setPrefError] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUser(user);

      const { data: prefRow } = await supabase
        .from("notification_preferences")
        .select("user_id, notify_in_app, notify_email, notify_push, email_invalid")
        .eq("user_id", user.id)
        .maybeSingle();

      setPrefs(
        (prefRow as NotificationPreferences | null) || {
          user_id: user.id,
          ...DEFAULT_PREFS,
        }
      );

      const { data: notices } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .is("read_at", null);
      setUnread((notices || []).length);
    };

    loadUser();
  }, []);

  const savePref = async (patch: Partial<NotificationPreferences>) => {
    if (!user || !prefs) return;
    setPrefError("");
    const next = { ...prefs, ...patch };
    setPrefs(next);

    if (patch.notify_push && typeof Notification !== "undefined") {
      await Notification.requestPermission();
    }

    const { error } = await supabase
      .from("notification_preferences")
      .upsert({
        user_id: user.id,
        notify_in_app: next.notify_in_app,
        notify_email: next.notify_email,
        notify_push: next.notify_push,
      });
    if (error) setPrefError(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        Lade Benutzer...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b">
        <nav className="mx-auto flex max-w-6xl items-center justify-between p-6">
          <a href="/" className="flex items-center gap-3">
            <Image
              src="/swapfy-icon.png"
              alt="Swapfy"
              width={42}
              height={42}
            />

            <span className="text-2xl font-bold">
              SWAP<span className="text-green-600">FY</span>
            </span>
          </a>

          <button
            onClick={logout}
            className="rounded-full border px-5 py-2 hover:border-green-600"
          >
            Logout
          </button>
        </nav>
      </header>

      <section className="mx-auto mt-16 max-w-3xl rounded-3xl border p-10 shadow-sm">
        <h1 className="text-4xl font-bold">
          Willkommen 👋
        </h1>

        <div className="mt-10 space-y-6">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="text-xl font-semibold">{user.user_metadata?.name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">E-Mail</p>
            <p className="text-xl">{user.email}</p>
          </div>
        </div>

        <div className="mt-10 grid gap-4">
          <a href="/notifications" className="rounded-2xl border border-gray-200 p-5 transition hover:border-[#16A34A]">
            <h2 className="text-xl font-semibold">Hinweise {unread ? `(${unread} neu)` : ""}</h2>
            <p className="mt-2 text-gray-500">In-App-Status zu Anfragen und Nachrichten</p>
          </a>

          <a href="/matches" className="rounded-2xl border border-gray-200 p-5 transition hover:border-[#16A34A]">
            <h2 className="text-xl font-semibold">Tauschvorschläge</h2>
            <p className="mt-2 text-gray-500">Nachvollziehbare Treffer zu deinen Inseraten</p>
          </a>

          <a href="/swap-requests" className="rounded-2xl border border-gray-200 p-5 transition hover:border-[#16A34A]">
            <h2 className="text-xl font-semibold">🔄 Tauschanfragen</h2>
            <p className="mt-2 text-gray-500">Gesendete und erhaltene Anfragen</p>
          </a>

          <a href="/my-items" className="rounded-2xl border border-gray-200 p-5 transition hover:border-[#16A34A]">
            <h2 className="text-xl font-semibold">📦 Meine Artikel</h2>
            <p className="mt-2 text-gray-500">Eigene Angebote verwalten</p>
          </a>

          <a href="/item-submit" className="rounded-2xl border border-gray-200 p-5 transition hover:border-[#16A34A]">
            <h2 className="text-xl font-semibold">➕ Neuer Artikel</h2>
            <p className="mt-2 text-gray-500">Neues Tauschangebot erstellen</p>
          </a>

          <a href="/items" className="rounded-2xl border border-gray-200 p-5 transition hover:border-[#16A34A]">
            <h2 className="text-xl font-semibold">🌍 Marktplatz</h2>
            <p className="mt-2 text-gray-500">Alle Angebote durchsuchen</p>
          </a>
        </div>

        {prefs && (
          <div className="mt-10 rounded-2xl border border-gray-200 p-5">
            <h2 className="text-xl font-semibold">Benachrichtigungen</h2>
            <p className="mt-2 text-sm text-gray-500">
              E-Mail geht nur an die lokale Test-Senke. Betreff ohne Artikel- oder Adressdaten. Push bleibt gerätelokal, ohne FCM.
            </p>
            <label className="mt-4 flex items-center gap-3">
              <input
                type="checkbox"
                checked={prefs.notify_in_app}
                onChange={(event) => savePref({ notify_in_app: event.target.checked })}
              />
              In-App
            </label>
            <label className="mt-3 flex items-center gap-3">
              <input
                type="checkbox"
                checked={prefs.notify_email}
                onChange={(event) => savePref({ notify_email: event.target.checked })}
              />
              E-Mail (Sandbox, Opt-in)
            </label>
            <label className="mt-3 flex items-center gap-3">
              <input
                type="checkbox"
                checked={prefs.notify_push}
                onChange={(event) => savePref({ notify_push: event.target.checked })}
              />
              Browser-Hinweis auf diesem Gerät
            </label>
            {prefs.email_invalid && (
              <p className="mt-3 text-sm text-red-700">E-Mail-Adresse als ungültig markiert — kein erneuter Versand.</p>
            )}
            {prefError && <p className="mt-3 text-sm text-red-700">{prefError}</p>}
          </div>
        )}
      </section>
    </main>
  );
}