"use client";

import Link from "next/link";
import { useState } from "react";

export default function ImpressumPage() {
  const [lang, setLang] = useState<"de" | "en">("de");

  return (
    <main className="min-h-screen bg-white text-[#0A1F44]">
      <div className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-sm text-[#0A1F44]/70 hover:text-[#0A1F44]">
            {lang === "de" ? "Zurück zur Startseite" : "Back to homepage"}
          </Link>

          <div className="rounded-full border border-[#0A1F44]/12 bg-white p-1 text-xs font-semibold">
            <button type="button" onClick={() => setLang("de")} className={`rounded-full px-3 py-1 transition ${lang === "de" ? "bg-[#0A1F44] text-white" : "text-[#0A1F44]/65"}`}>DE</button>
            <button type="button" onClick={() => setLang("en")} className={`rounded-full px-3 py-1 transition ${lang === "en" ? "bg-[#0A1F44] text-white" : "text-[#0A1F44]/65"}`}>EN</button>
          </div>
        </div>

        {lang === "de" ? (
          <>
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.02em]">Impressum</h1>
            <div className="mt-8 space-y-6 leading-relaxed text-[#0A1F44]/80">
              <p>
              <strong>SWAPFY</strong><br />
Inhaber: Klaudio Batinić<br />
Dietikon, Schweiz
              </p>
              <p>
E-Mail:
<br />
info@elitecv.ch
</p>

<p className="text-sm text-[#0A1F44]/60">
Die offizielle Kontaktadresse info@swapfy.ch wird derzeit eingerichtet.
Anfragen können vorübergehend über info@elitecv.ch eingereicht werden.
</p>
              <p>
              Verantwortlich für den Inhalt:
              Klaudio Batinić
              </p>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.02em]">Imprint</h1>
            <div className="mt-8 space-y-6 leading-relaxed text-[#0A1F44]/80">
              <p>
              <strong>EliteCV</strong><br />
Owner: Klaudio Batinić<br />
Dietikon, Switzerland
              </p>
              <p>
Email:
<br />
info@elitecv.ch
</p>

<p className="text-sm text-[#0A1F44]/60">
The official contact address info@swapfy.ch is currently being set up.
Until then, enquiries can be sent to info@elitecv.ch.
</p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}