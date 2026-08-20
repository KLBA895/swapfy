"use client";

import { use, useEffect, useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";

type Item = {
  id: string;
  title: string;
  estimated_value: string;
  currency: string | null;
  region: string;
  wanted_item: string | null;
  description: string | null;
};

export default function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadItem = async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .single();

      if (error) setError(error.message);
      else setItem(data as Item);

      setLoading(false);
    };

    loadItem();
  }, [id]);

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaved(false);
    setError("");

    const formData = new FormData(e.currentTarget);

    const { error } = await supabase
      .from("items")
      .update({
        title: formData.get("title") as string,
        estimated_value: formData.get("estimatedValue") as string,
        currency: formData.get("currency") as string,
        region: formData.get("region") as string,
        wanted_item: formData.get("wantedItem") as string,
        description: formData.get("description") as string,
      })
      .eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    setSaved(true);
  };

  if (loading) return <main className="p-10">Lade Artikel...</main>;
  if (!item) return <main className="p-10">Artikel nicht gefunden.</main>;

  return (
    <main className="mx-auto max-w-3xl p-10">
      <h1 className="text-4xl font-bold">Artikel bearbeiten</h1>

      <form onSubmit={handleSave} className="mt-8 rounded-3xl border p-6 shadow-sm">
        <input
          name="title"
          defaultValue={item.title}
          className="mb-4 w-full rounded-xl border px-4 py-3"
        />

        <div className="mb-4 flex overflow-hidden rounded-xl border">
          <input
            name="estimatedValue"
            defaultValue={item.estimated_value}
            className="w-full border-0 border-r px-4 py-3 outline-none"
          />

          <select
            name="currency"
            defaultValue={item.currency || "CHF"}
            className="w-28 border-0 bg-white px-3 py-3 font-semibold outline-none"
          >
            <option value="CHF">CHF</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <input
          name="region"
          defaultValue={item.region}
          className="mb-4 w-full rounded-xl border px-4 py-3"
        />

        <input
          name="wantedItem"
          defaultValue={item.wanted_item || ""}
          className="mb-4 w-full rounded-xl border px-4 py-3"
        />

        <textarea
          name="description"
          defaultValue={item.description || ""}
          rows={5}
          className="mb-6 w-full rounded-xl border px-4 py-3"
        />

        <button className="w-full rounded-full bg-[#16A34A] px-6 py-3 font-semibold text-white">
          Änderungen speichern
        </button>

        {saved && (
          <p className="mt-4 rounded-xl bg-green-50 p-4 text-green-700">
            Änderungen gespeichert.
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">
            Fehler: {error}
          </p>
        )}
      </form>
    </main>
  );
}