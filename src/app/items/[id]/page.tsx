"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

type Item = {
  id: string;
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

  useEffect(() => {
    const loadItem = async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        setItem(data as Item);
      }

      setLoading(false);
    };

    loadItem();
  }, [id]);

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

          <button className="mt-8 w-full rounded-full bg-[#16A34A] px-6 py-4 font-semibold text-white shadow-lg transition hover:scale-[1.02]">
            Tauschanfrage senden
          </button>
        </div>
      </section>
    </main>
  );
}