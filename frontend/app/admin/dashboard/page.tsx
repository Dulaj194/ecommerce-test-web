"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { LoadingState } from "@/components/LoadingState";
import { MainNav } from "@/components/MainNav";
import { apiFetch } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { usePolling } from "@/lib/usePolling";
import type { Banner, Order, PagedResponse, Product } from "@/lib/types";

type Snapshot = {
  products: number;
  orders: number;
  banners: number;
};

export default function AdminDashboardPage() {
  const { loading: guardLoading, session } = useAuthGuard("ROLE_ADMIN");
  const sessionId = session?.userId;
  const [snapshot, setSnapshot] = useState<Snapshot>({ products: 0, orders: 0, banners: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(
    async (showLoader: boolean) => {
      if (showLoader) {
        setLoading(true);
      }
      try {
        const [products, orders, banners] = await Promise.all([
          apiFetch<PagedResponse<Product>>("/api/admin/products?page=0&size=1", {}, true),
          apiFetch<Order[]>("/api/admin/orders", {}, true),
          apiFetch<Banner[]>("/api/admin/banners", {}, true),
        ]);
        setError(null);
        setSnapshot({
          products: products.totalElements,
          orders: orders.length,
          banners: banners.length,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unable to load admin summary.");
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (guardLoading || !sessionId) {
      return;
    }

    void loadSnapshot(true);
  }, [guardLoading, loadSnapshot, sessionId]);

  usePolling(() => loadSnapshot(false), 3000, Boolean(sessionId));

  if (guardLoading || !session) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <MainNav />
          <LoadingState label="Checking admin account..." />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-10">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <MainNav />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Manage products, orders, and home page banners.</p>

          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {loading && <div className="mt-4"><LoadingState label="Loading admin summary..." /></div>}

          {!loading && (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card label="Products" value={snapshot.products} href="/admin/products" />
              <Card label="Orders" value={snapshot.orders} href="/admin/orders" />
              <Card label="Banners" value={snapshot.banners} href="/admin/banners" />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Card({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
      <Link href={href} className="mt-4 inline-block rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700">
        Open {label}
      </Link>
    </article>
  );
}
