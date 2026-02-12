"use client";

import { useEffect, useState } from "react";

import { LoadingState } from "@/components/LoadingState";
import { MainNav } from "@/components/MainNav";
import { apiFetch, resolveImageUrl } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";
import type { Order } from "@/lib/types";

export default function OrdersPage() {
  const { loading: guardLoading, session } = useAuthGuard();
  const sessionId = session?.userId;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (guardLoading || !sessionId) {
      return;
    }

    let alive = true;

    apiFetch<Order[]>("/api/orders/me", {}, true)
      .then((response) => {
        if (alive) {
          setError(null);
          setOrders(response);
        }
      })
      .catch((err: unknown) => {
        if (alive) {
          setError(err instanceof Error ? err.message : "Unable to load orders.");
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [guardLoading, sessionId]);

  if (guardLoading || !session) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <MainNav />
          <LoadingState label="Checking your account..." />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-10">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <MainNav />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <h1 className="text-2xl font-semibold text-slate-900">Order History</h1>
          <p className="mt-1 text-sm text-slate-600">Track your completed and in-progress orders.</p>

          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {loading && <div className="mt-4"><LoadingState label="Loading orders..." /></div>}

          {!loading && orders.length === 0 && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
              No orders yet.
            </div>
          )}

          {!loading && orders.length > 0 && (
            <div className="mt-6 space-y-4">
              {orders.map((order) => (
                <article key={order.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">Order #{order.id}</h2>
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Placed: {new Date(order.createdAt).toLocaleString()}</p>
                  <p className="text-sm text-slate-600">Ship to: {order.shippingAddress}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">Total: ${Number(order.totalAmount).toFixed(2)}</p>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex gap-3 rounded-lg border border-slate-200 p-3">
                        <img src={resolveImageUrl(item.imageUrl)} alt={item.productName} className="h-16 w-16 rounded-md object-cover" />
                        <div>
                          <p className="font-medium text-slate-900">{item.productName}</p>
                          <p className="text-sm text-slate-600">Qty: {item.quantity}</p>
                          <p className="text-sm text-slate-600">Line Total: ${Number(item.lineTotal).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
