"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type Lang = "de" | "en";

const items = [
  {
    title: "Apple Watch Series 9",
    value: "CHF 250",
    region: "Zürich",
    category: "Watches",
    image: "/items/apple-watch.jpg",
  },
  {
    title: "Canon EOS Kamera",
    value: "CHF 280",
    region: "Aarau",
    category: "Cameras",
    image: "/items/camera.jpg",
  },
  {
    title: "Nintendo Switch",
    value: "CHF 220",
    region: "Bern",
    category: "Gaming",
    image: "/items/switch.jpg",
  },
  {
    title: "MacBook Air",
    value: "CHF 600",
    region: "Basel",
    category: "Laptops",
    image: "/items/macbook.jpg",
  },
  {
    title: "Mountainbike",
    value: "CHF 450",
    region: "Luzern",
    category: "Sports",
    image: "/items/bike.jpg",
  },
  {
    title: "iPhone 15",
    value: "CHF 700",
    region: "Winterthur",
    category: "Smartphones",
    image: "/items/iphone.jpg",
  },
];

const content = {
  de: {
    back: "Zurück zur Startseite",
    title: "Marktplatz",
    subtitle: "Entdecke mögliche Tauschangebote auf Swapfy.",
    search: "Artikel suchen...",
    allCategories: "Alle Kategorien",
    allRegions: "Alle Regionen",
    view: "Tausch ansehen",
    submit: "Artikel einreichen",
    empty: "Keine passenden Artikel gefunden.",
  },
  en: {
    back: "Back to homepage",
    title: "Marketplace",
    subtitle: "Explore potential swap opportunities on Swapfy.",
    search: "Search items...",
    allCategories: "All categories",
    allRegions: "All regions",
    view: "View Swap",
    submit: "Submit Item",
    empty: "No matching items found.",
  },
};

export default function MarketplacePage() {
  const [lang, setLang] = useState<Lang>("de");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [region, setRegion] = useState("all");

  const t = content[lang];

  const categories = ["all", ...Array.from(new Set(items.map((item) => item.category)))];
  const regions = ["all", ...Array.from(new Set(items.map((item) => item.region)))];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesQuery =
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.region.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase());

      const matchesCategory = category === "all" || item.category === category;
      const matchesRegion = region === "all" || item.region === region;

      return matchesQuery && matchesCategory && matchesRegion;
    });
  }, [query, category, region]);

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

          <div className="flex items-center gap-3">
            <a
              href="/item-submit"
              className="hidden rounded-full bg-[#16A34A] px-5 py-2 text-sm font-semibold text-white md:inline-block"
            >
              {t.submit}
            </a>

            <div className="rounded-full border border-gray-200 p-1 text-xs font-semibold">
              <button
                onClick={() => setLang("de")}
                className={`rounded-full px-3 py-1 ${
                  lang === "de" ? "bg-[#111827] text-white" : "text-gray-500"
                }`}
              >
                DE
              </button>
              <button
                onClick={() => setLang("en")}
                className={`rounded-full px-3 py-1 ${
                  lang === "en" ? "bg-[#111827] text-white" : "text-gray-500"
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </nav>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <a href="/" className="text-sm font-medium text-gray-500 hover:text-[#16A34A]">
          ← {t.back}
        </a>

        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#16A34A]">
              SWAPFY
            </p>
            <h1 className="mt-4 text-5xl font-bold">{t.title}</h1>
            <p className="mt-4 text-lg text-gray-600">{t.subtitle}</p>
          </div>

          <a
            href="/item-submit"
            className="rounded-full bg-[#16A34A] px-6 py-3 text-center font-semibold text-white shadow-lg transition hover:scale-105"
          >
            {t.submit}
          </a>
        </div>

        <div className="mt-10 grid gap-4 rounded-3xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3"
          >
            <option value="all">{t.allCategories}</option>
            {categories
              .filter((item) => item !== "all")
              .map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
          </select>

          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3"
          >
            <option value="all">{t.allRegions}</option>
            {regions
              .filter((item) => item !== "all")
              .map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
          </select>
        </div>

        {filteredItems.length === 0 ? (
          <p className="mt-12 rounded-2xl bg-gray-50 p-6 text-center text-gray-500">
            {t.empty}
          </p>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative mb-5 h-52 overflow-hidden rounded-2xl">
  <Image
    src={item.image}
    alt={item.title}
    fill
    className="object-cover"
  />
</div>

                <div className="mb-3 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  {item.category}
                </div>

                <h2 className="text-xl font-semibold">{item.title}</h2>

                <p className="mt-2 text-gray-500">{item.value}</p>

                <p className="mt-1 text-gray-500">📍 {item.region}</p>

                <button className="mt-5 w-full rounded-full bg-[#16A34A] px-5 py-3 font-semibold text-white">
                  {t.view}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}