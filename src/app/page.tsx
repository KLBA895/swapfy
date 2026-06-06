"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { FaInstagram } from "react-icons/fa";

type Lang = "de" | "en";

const content = {
  de: {
    nav: ["Tauschideen entdecken", "Kategorien", "Vorteile", "Frühzugang", "FAQ"],
    cta: "Artikel einreichen",
    heroTitle: "Tausche Werte. Nicht Geld.",
    heroText:
      "Tausche ungenutzte Gegenstände mit anderen Menschen in der Schweiz. Einfach, transparent und nachhaltig.",
    secondaryCta: "Tauschideen entdecken",
    visualStatus: "Tausch bestätigt",
    visualItemA: "Apple Watch",
    visualItemB: "Kamera",
    howTitle: "So funktioniert Swapfy",
    steps: [
      ["1", "Gegenstand erfassen", "Stelle einen Gegenstand ein, den du nicht mehr benötigst."],
      ["2", "Passenden Tausch finden", "Finde Angebote mit ähnlichem Wert."],
      ["3", "Direkt tauschen", "Bestätigt den Tausch und gebt Produkten ein zweites Leben."],
    ],
    categoriesTitle: "Beliebte Kategorien",
    categories: ["Elektronik", "Gaming", "Uhren", "Kameras", "Sport", "Haushalt"],
    benefitsTitle: "Warum Swapfy?",
    benefits: [
      ["Fair", "Tausch auf Basis vergleichbarer Werte."],
      ["Nachhaltig", "Weniger Konsum, mehr Wiederverwendung."],
      ["Einfach", "Keine komplizierten Verkaufsprozesse."],
    ],
    accessTitle: "Artikel einreichen",
    accessText:
      "Swapfy befindet sich aktuell im Aufbau. Melde dich an und erfahre als Erstes, wann die Plattform startet.",
    name: "Name",
    email: "E-Mail",
    item: "Was würdest du tauschen?",
    submit: "Benachrichtige mich",
    success: "Danke! Deine Anfrage wurde übermittelt.",
    faqTitle: "FAQ",
    imprint: "Impressum",
    privacy: "Datenschutz",
    terms: "AGB",
    faqs: [
      ["Ist Swapfy kostenlos?", "Zum Start ist die Nutzung kostenlos. Später kann eine kleine Erfolgsgebühr dazukommen."],
      ["Wie wird der Wert bestimmt?", "Am Anfang geben Nutzer den geschätzten Wert selbst an. Später kann ein Matching-System helfen."],
      ["Wer bezahlt den Versand?", "Jede Person bezahlt grundsätzlich den Versand des eigenen Artikels."],
      ["Ist Swapfy Verkäufer?", "Nein. Swapfy ist eine Plattform und vermittelt nur den Kontakt zwischen Nutzern."],
    ],
  },
  en: {
    nav: ["How it works", "Categories", "Benefits", "Early Access", "FAQ"],
    cta: "Submit Item",
    heroTitle: "Exchange Value. Not Money.",
    heroText:
      "Swap unused items with others in Switzerland. Simple, transparent and sustainable.",
    secondaryCta: "How It Works",
    visualStatus: "Swap confirmed",
    visualItemA: "Apple Watch",
    visualItemB: "Camera",
    howTitle: "How Swapfy Works",
    steps: [
      ["1", "List your item", "Add an item you no longer use."],
      ["2", "Find a match", "Discover offers with similar value."],
      ["3", "Complete the swap", "Confirm the exchange and give products a second life."],
    ],
    categoriesTitle: "Popular Categories",
    categories: ["Electronics", "Gaming", "Watches", "Cameras", "Sports", "Home"],
    benefitsTitle: "Why Swapfy?",
    benefits: [
      ["Fair", "Exchange based on comparable value."],
      ["Sustainable", "Less consumption, more reuse."],
      ["Simple", "No complicated selling process."],
    ],
    accessTitle: "Submit Item",
    accessText:
      "Swapfy is currently being built. Sign up and be the first to know when the platform launches.",
    name: "Name",
    email: "Email",
    item: "What would you swap?",
    submit: "Notify me",
    success: "Thank you! Your request has been submitted.",
    faqTitle: "FAQ",
    imprint: "Imprint",
    privacy: "Privacy Policy",
    terms: "Terms",
    faqs: [
      ["Is Swapfy free?", "At launch, Swapfy is free to use. A small success fee may be added later."],
      ["How is value determined?", "At first, users enter an estimated value. Later, a matching system can help."],
      ["Who pays shipping?", "Each person usually pays the shipping cost for their own item."],
      ["Is Swapfy the seller?", "No. Swapfy is a platform and only connects users."],
    ],
  },
};

export default function Home() {
  const [lang, setLang] = useState<Lang>("de");
  const [submitted, setSubmitted] = useState(false);
  const t = content[lang];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    formData.append("type", "Swapfy Early Access");

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
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-3">
            <Image
              src="/swapfy-icon.png"
              alt="Swapfy Logo"
              width={46}
              height={46}
              priority
              className="rounded-full"
            />
            <span className="text-2xl font-bold tracking-tight">
              SWAP<span className="text-[#16A34A]">FY</span>
            </span>
          </a>

          <div className="hidden gap-7 text-sm font-medium text-gray-600 lg:flex">
            <a href="#how-it-works">{t.nav[0]}</a>
            <a href="#categories">{t.nav[1]}</a>
            <a href="#benefits">{t.nav[2]}</a>
            <a href="#early-access">{t.nav[3]}</a>
            <a href="#faq">{t.nav[4]}</a>
          </div>

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
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(22,163,74,0.15),transparent_35%),radial-gradient(circle_at_10%_10%,rgba(249,115,22,0.08),transparent_30%)]" />

        <div className="relative mx-auto grid min-h-[90vh] max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-[#16A34A]">
              SWAPFY
            </p>

            <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-7xl">
              {t.heroTitle}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#6B7280]">
              {t.heroText}
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4 lg:justify-start">
              <a
                href="/item-submit"
                className="rounded-full bg-[#16A34A] px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105"
              >
                {t.cta}
              </a>

              <a
                href="#how-it-works"
                className="rounded-full border border-gray-300 bg-white px-7 py-3 text-sm font-semibold transition hover:border-[#16A34A] hover:text-[#16A34A]"
              >
                {t.secondaryCta}
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-2xl">
            <div className="rounded-[1.5rem] bg-gradient-to-br from-green-50 to-white p-6">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image src="/swapfy-icon.png" alt="Swapfy" width={34} height={34} />
                  <p className="font-semibold">Swap Detail</p>
                </div>

                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  {t.visualStatus}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="mb-3 flex h-36 items-center justify-center rounded-xl bg-gray-100 text-5xl">
                    ⌚
                  </div>
                  <p className="font-semibold">{t.visualItemA}</p>
                  <p className="text-sm text-gray-500">CHF 250</p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#16A34A] text-2xl text-white shadow-lg">
                  ↔
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="mb-3 flex h-36 items-center justify-center rounded-xl bg-gray-100 text-5xl">
                    📷
                  </div>
                  <p className="font-semibold">{t.visualItemB}</p>
                  <p className="text-sm text-gray-500">CHF 260</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-2 text-center text-xs font-semibold">
                {["Confirmed", "Shipped", "Transit", "Done"].map((step, i) => (
                  <div
                    key={step}
                    className={`rounded-full px-2 py-2 ${
                      i < 2
                        ? "bg-[#16A34A] text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-gray-100 bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold">{t.howTitle}</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {t.steps.map((step) => (
              <div key={step[0]} className="rounded-2xl bg-white p-6 shadow-sm">
                <span className="text-sm font-bold text-[#16A34A]">
                  Step {step[0]}
                </span>
                <h3 className="mt-3 text-xl font-semibold">{step[1]}</h3>
                <p className="mt-3 text-gray-600">{step[2]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-3xl font-bold">{t.categoriesTitle}</h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {t.categories.map((category, index) => {
            const icons = ["📱", "🎮", "⌚", "📷", "🚲", "🏠"];
            return (
              <div
                key={category}
                className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="text-4xl">{icons[index]}</div>
                <p className="mt-3 font-semibold">{category}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="benefits" className="border-y border-gray-100 bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold">{t.benefitsTitle}</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {t.benefits.map((item) => (
              <div key={item[0]} className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold">{item[0]}</h3>
                <p className="mt-3 text-gray-600">{item[1]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="early-access" className="bg-[#111827] px-6 py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-3xl font-bold">{t.accessTitle}</h2>
            <p className="mt-4 text-white/70">{t.accessText}</p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 text-[#111827]">
            <input name="name" required placeholder={t.name} className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-3" />
            <input name="email" required type="email" placeholder={t.email} className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-3" />
            <textarea name="message" placeholder={t.item} rows={4} className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-3" />
            <button className="w-full rounded-full bg-[#16A34A] px-6 py-3 font-semibold text-white">
              {t.submit}
            </button>
            {submitted && <p className="mt-4 text-sm text-green-700">{t.success}</p>}
          </form>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-3xl font-bold">{t.faqTitle}</h2>

        <div className="mt-8 grid gap-4">
          {t.faqs.map((faq) => (
            <div key={faq[0]} className="rounded-2xl border border-gray-100 p-6">
              <h3 className="font-semibold">{faq[0]}</h3>
              <p className="mt-2 text-gray-600">{faq[1]}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-100 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium">
            <a href="/impressum" className="hover:text-[#16A34A]">
              {t.imprint}
            </a>

            <a href="/datenschutz" className="hover:text-[#16A34A]">
              {t.privacy}
            </a>

            <a href="/agb" className="hover:text-[#16A34A]">
              {t.terms}
            </a>

            <a
              href="https://instagram.com/swapfy_ch"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:text-[#16A34A]"
              aria-label="Instagram"
            >
              <FaInstagram size={24} />
            </a>
          </div>

          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} SWAPFY. Exchange Value. Not Money.
          </p>
        </div>
      </footer>
    </main>
  );
}