"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ItemSubmitPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const swissPostalCodes: Record<string, string> = {
    "8001": "Zürich",
    "8953": "Dietikon",
    "5400": "Baden",
    "5000": "Aarau",
    "3000": "Bern",
    "4001": "Basel",
    "6003": "Luzern",
    "8400": "Winterthur",
    "9000": "St. Gallen",
    "1201": "Genf",
    "1003": "Lausanne",
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSubmitted(false);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const imageFile = formData.get("image") as File;
    let imageUrl = "";

    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `items/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("item-images")
        .upload(filePath, imageFile);

      if (uploadError) {
        setLoading(false);
        setError(`Bild-Upload Fehler: ${uploadError.message}`);
        return;
      }

      const { data } = supabase.storage
        .from("item-images")
        .getPublicUrl(filePath);

      imageUrl = data.publicUrl;
    }

    const { error } = await supabase.from("items").insert({
      user_id: user?.id,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      title: formData.get("itemTitle") as string,
      category: formData.get("category") as string,
      condition: formData.get("condition") as string,
      estimated_value: formData.get("estimatedValue") as string,
      currency: formData.get("currency") as string,
      postal_code: formData.get("postalCode") as string,
      region: formData.get("region") as string,
      wanted_item: formData.get("wantedItem") as string,
      description: formData.get("description") as string,
      image_url: imageUrl,
      status: "pending",
    });

    setLoading(false);

    if (error) {
      console.log("Supabase error:", error);
      setError(`Fehler: ${error.message}`);
      return;
    }
    setSubmitted(true);
    form.reset();
    setPreview(null);
    setFileName("");
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
            <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white">
              <input
                name="estimatedValue"
                required
                placeholder="Wert"
                className="w-full border-0 border-r border-gray-200 px-4 py-3"
              />

              <select
                name="currency"
                required
                defaultValue="CHF"
                className="w-28 rounded-r-xl rounded-l-none border-0 bg-white px-3 py-3 font-semibold outline-none"
              >
                <option value="CHF">CHF 🇨🇭</option>
                <option value="EUR">EUR 🇪🇺</option>
                <option value="USD">USD 🇺🇸</option>
                <option value="GBP">GBP 🇬🇧</option>
              </select>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <select name="category" required className="rounded-xl border border-gray-200 px-4 py-3">
              <option value="">Kategorie wählen</option>

              <option>📱 Elektronik</option>
              <option>💻 Computer & IT</option>
              <option>⌚ Uhren & Schmuck</option>
              <option>📷 Kameras</option>
              <option>🎮 Gaming</option>
              <option>🚲 Fahrräder</option>
              <option>🚗 Fahrzeuge</option>
              <option>🏡 Haus & Garten</option>
              <option>🛋 Möbel</option>
              <option>👕 Kleidung & Mode</option>
              <option>👟 Schuhe</option>
              <option>🏋 Sport & Fitness</option>
              <option>🎸 Musikinstrumente</option>
              <option>📚 Bücher</option>
              <option>🧸 Baby & Kinder</option>
              <option>🐶 Haustiere</option>
              <option>🎨 Freizeit & Hobby</option>
              <option>🛠 Werkzeuge</option>
              <option>📦 Sonstiges</option>
            </select>

            <select name="condition" required className="rounded-xl border border-gray-200 px-4 py-3">
              <option value="">Zustand wählen</option>
              <option>✨ Neu (originalverpackt)</option>
              <option>⭐ Wie neu</option>
              <option>👍 Sehr gut</option>
              <option>👌 Gut</option>
              <option>🟡 Gebraucht</option>
              <option>🟡 🔧 Defekt / Bastler</option>
            </select>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[140px_1fr]">
            <input
              name="postalCode"
              required
              placeholder="PLZ"
              className="rounded-xl border border-gray-200 px-4 py-3"
              onChange={(e) => {
                const city = swissPostalCodes[e.target.value];
                const form = e.currentTarget.form;

                if (city && form) {
                  const regionInput = form.elements.namedItem("region") as HTMLInputElement;
                  regionInput.value = city;
                }
              }}
            />

            <input
              name="region"
              required
              placeholder="Region / Stadt, z.B. Zürich"
              className="rounded-xl border border-gray-200 px-4 py-3"
            />
          </div>

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
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white px-6 py-10 text-center transition hover:border-[#16A34A] hover:bg-green-50">
            <span className="text-4xl">📷</span>
            <span className="mt-3 text-base font-semibold text-[#111827]">
              Foto hochladen
            </span>
            <span className="mt-1 text-sm text-gray-500">
              PNG, JPG oder WEBP auswählen
            </span>

            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (!file) {
                  setPreview(null);
                  setFileName("");
                  return;
                }

                setFileName(file.name);
                setPreview(URL.createObjectURL(file));
              }}
              className="hidden"
            />
          </label>
          {preview && (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-gray-600">
                Bildvorschau
              </p>

              <div className="relative h-72 overflow-hidden rounded-xl bg-gray-50">
                <Image
                  src={preview}
                  alt="Vorschau"
                  fill
                  className="object-contain"
                />
              </div>
              {fileName && (
                <p className="mt-3 text-center text-sm text-gray-500">
                  {fileName}
                </p>
              )}
            </div>
          )}

          <button className="mt-6 w-full rounded-full bg-[#16A34A] px-6 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.02]">
            {loading ? "Wird gespeichert..." : "Artikel einreichen"}
          </button>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

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