"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

type Item = {
  id: string;
  title: string;
  estimated_value: string;
  currency: string;
  region: string;
  image_url: string | null;
};

export default function MyItemsPage() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const loadItems = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setItems((data as Item[]) || []);
    };

    loadItems();
  }, []);
  const deleteItem = async (id: string) => {
    const ok = confirm("Artikel wirklich löschen?");

    if (!ok) return;

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setItems((old) => old.filter((item) => item.id !== id));
  };
  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-10 text-4xl font-bold">
        Meine Artikel
      </h1>

      <div className="grid gap-6 md:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-3xl border p-5 shadow-sm"
          >
            <div className="relative h-56">
              <Image
                src={item.image_url || "/items/apple-watch.jpg"}
                alt={item.title}
                fill
                className="object-contain"
              />
            </div>

            <h2 className="mt-4 text-xl font-semibold">
              {item.title}
            </h2>

            <p>
              {item.estimated_value} {item.currency}
            </p>

            <p>
              📍 {item.region}
            </p>
            <div className="mt-5 flex gap-3">

              <a
                href={`/edit-item/${item.id}`}
                className="flex-1 rounded-full bg-blue-600 px-4 py-2 text-center font-semibold text-white hover:bg-blue-700"
              >
                ✏ Bearbeiten
              </a>

              <button
                onClick={() => deleteItem(item.id)}
                className="flex-1 rounded-full bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
              >
                🗑 Löschen
              </button>

            </div>
          </div>
        ))}
      </div>
    </main>
  );
}