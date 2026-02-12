"use client";

import { useCallback, useEffect, useState } from "react";

import { LoadingState } from "@/components/LoadingState";
import { MainNav } from "@/components/MainNav";
import { apiFetch, resolveImageUrl } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { usePolling } from "@/lib/usePolling";
import type { Order } from "@/lib/types";

const statuses = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export default function AdminOrdersPage() {
  const { loading: guardLoading, session } = useAuthGuard("ROLE_ADMIN");
  const sessionId = session?.userId;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(
    async (showLoader: boolean) => {
      if (showLoader) {
        setLoading(true);
      }
      try {
        const response = await apiFetch<Order[]>("/api/admin/orders", {}, true);
        setError(null);
        setOrders(response);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unable to load orders.");
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!guardLoading && sessionId) {
      void loadOrders(true);
    }
  }, [guardLoading, loadOrders, sessionId]);

  usePolling(() => loadOrders(false), 2500, Boolean(sessionId));

  const changeStatus = async (orderId: number, status: string) => {
    try {
      await apiFetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }, true);
      await loadOrders(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to update order status.");
    }
  };

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

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <h1 className="text-2xl font-semibold text-slate-900">Admin Order Management</h1>
          <p className="mt-1 text-sm text-slate-600">Review all orders and update their status.</p>

          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {loading && <div className="mt-4"><LoadingState label="Loading orders..." /></div>}

          {!loading && orders.length === 0 && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
              No orders found.
            </div>
          )}

          {!loading && orders.length > 0 && (
            <div className="mt-6 space-y-4">
              {orders.map((order) => (
                <article key={order.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Order #{order.id}</h2>
                      <p className="text-sm text-slate-600">
                        {order.customerName} ({order.customerEmail})
                      </p>
                      <p className="text-sm text-slate-600">Ship to: {order.shippingAddress}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-md border border-slate-300 px-2 py-1"
                        value={order.status}
                        onChange={(e) => changeStatus(order.id, e.target.value)}
                      >
                        {statuses.map((status) => (
                          <option value={status} key={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        ${Number(order.totalAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex gap-3 rounded-lg border border-slate-200 p-3">
                        <img src={resolveImageUrl(item.imageUrl)} alt={item.productName} className="h-16 w-16 rounded-md object-cover" />
                        <div className="text-sm">
                          <p className="font-medium text-slate-900">{item.productName}</p>
                          <p className="text-slate-600">Qty: {item.quantity}</p>
                          <p className="text-slate-600">Line: ${Number(item.lineTotal).toFixed(2)}</p>
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
