"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);

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
    };

    loadUser();
  }, []);

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

          <div>
            <p className="text-sm text-gray-500">Benutzer-ID</p>
            <p className="font-mono text-sm">{user.id}</p>
          </div>
        </div>

        <div className="mt-10 grid gap-4">
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
      </section>
    </main>
  );
}