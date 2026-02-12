"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { MainNav } from "@/components/MainNav";
import { apiFetch } from "@/lib/api";
import { saveSession } from "@/lib/session";
import type { AuthResponse } from "@/lib/types";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("admin@shop.com");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<AuthResponse>("/api/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const next = new URLSearchParams(window.location.search).get("next");

      saveSession(response);

      if (next) {
        router.push(next);
      } else {
        router.push("/admin/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to sign in as admin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <MainNav />

        <section className="mx-auto mt-6 max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Admin Login</h1>
          <p className="mt-1 text-sm text-slate-600">Only admin accounts can login on this page.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Login as Admin"}
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">Customer login is available only on `/login`.</p>
        </section>
      </div>
    </main>
  );
}
