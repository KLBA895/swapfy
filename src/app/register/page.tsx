"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;

    setLoading(true);
    setSuccess("");
    setError("");

    const formData = new FormData(form);

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setLoading(false);
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(`Fehler: ${error.message}`);
      return;
    }

    setSuccess("Dein Konto wurde erstellt. Du kannst dich jetzt anmelden.");
    form.reset();
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
            href="/login"
            className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold hover:border-[#16A34A] hover:text-[#16A34A]"
          >
            Login
          </a>
        </nav>
      </header>

      <section className="mx-auto max-w-xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#16A34A]">
          Konto erstellen
        </p>

        <h1 className="mt-4 text-4xl font-bold">
          Erstelle dein Swapfy-Konto
        </h1>

        <p className="mt-4 text-gray-600">
          Mit einem Konto kannst du Artikel verwalten, Tauschanfragen senden und später Bewertungen sammeln.
        </p>

        <form
          onSubmit={handleRegister}
          className="mt-10 rounded-3xl border border-gray-100 bg-gray-50 p-6 shadow-sm"
        >
          <input
            name="name"
            required
            placeholder="Name"
            className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-3"
          />

          <input
            name="email"
            required
            type="email"
            placeholder="E-Mail"
            className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-3"
          />

          <input
            name="password"
            required
            type="password"
            placeholder="Passwort"
            minLength={6}
            className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-3"
          />

          <input
            name="confirmPassword"
            required
            type="password"
            placeholder="Passwort wiederholen"
            minLength={6}
            className="mb-6 w-full rounded-xl border border-gray-200 px-4 py-3"
          />

          <button
            disabled={loading}
            className="w-full rounded-full bg-[#16A34A] px-6 py-3 font-semibold text-white shadow-lg disabled:opacity-60"
          >
            {loading ? "Konto wird erstellt..." : "Konto erstellen"}
          </button>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          {success && (
            <p className="mt-4 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
              {success}
            </p>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            Bereits ein Konto?{" "}
            <a href="/login" className="font-semibold text-[#16A34A]">
              Einloggen
            </a>
          </p>
        </form>
      </section>
    </main>
  );
}