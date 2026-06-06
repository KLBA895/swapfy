"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

export default function ItemSubmitPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    formData.append("type", "Swapfy Item Submission");

    const response = await fetch("/api/contact", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      setSubmitted(true);
      e.currentTarget.reset();
    }
  };

  return (
    <main className="min-h-screen bg-white text-[#111827]">
      <header className="border-b border-gray-100 bg-white">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
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
            href="/"
            className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold hover:border-[#16A34A] hover:text-[#16A34A]"
          >
            Zurück
          </a>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#16A34A]">
          Artikel einreichen
        </p>

        <h1 className="mt-4 text-4xl font-bold md:text-5xl">
          Was möchtest du tauschen?
        </h1>

        <p className="mt-5 text-lg leading-8 text-gray-600">
          Reiche deinen ersten Artikel ein. Wir prüfen die Anfrage und sammeln
          erste Tauschideen für den Start von Swapfy.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 rounded-3xl border border-gray-100 bg-gray-50 p-6 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <input name="name" required placeholder="Name" className="rounded-xl border border-gray-200 px-4 py-3" />
            <input name="email" required type="email" placeholder="E-Mail" className="rounded-xl border border-gray-200 px-4 py-3" />
            <input name="itemTitle" required placeholder="Artikelname, z.B. Apple Watch" className="rounded-xl border border-gray-200 px-4 py-3" />
            <input name="estimatedValue" required placeholder="Geschätzter Wert, z.B. CHF 250" className="rounded-xl border border-gray-200 px-4 py-3" />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <select name="category" required className="rounded-xl border border-gray-200 px-4 py-3">
              <option value="">Kategorie wählen</option>
              <option>Elektronik</option>
              <option>Gaming</option>
              <option>Uhren</option>
              <option>Kameras</option>
              <option>Sport</option>
              <option>Haushalt</option>
              <option>Andere</option>
            </select>

            <select name="condition" required className="rounded-xl border border-gray-200 px-4 py-3">
              <option value="">Zustand wählen</option>
              <option>Neu</option>
              <option>Sehr gut</option>
              <option>Gut</option>
              <option>Gebraucht</option>
            </select>
          </div>

          <input
            name="region"
            required
            placeholder="Region / Stadt, z.B. Zürich"
            className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-3"
          />

          <input
            name="wantedItem"
            placeholder="Was suchst du? z.B. Kamera, iPad, Fahrrad"
            className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-3"
          />

          <textarea
            name="description"
            rows={5}
            placeholder="Kurze Beschreibung des Artikels"
            className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-3"
          />
          <input
  type="file"
  name="image"
  accept="image/*"
  className="mt-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-3"
/>

          <button className="mt-6 w-full rounded-full bg-[#16A34A] px-6 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.02]">
            Artikel einreichen
          </button>

          {submitted && (
            <p className="mt-4 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
              Danke! Dein Artikel wurde übermittelt.
            </p>
          )}
        </form>
      </section>
    </main>
  );
}