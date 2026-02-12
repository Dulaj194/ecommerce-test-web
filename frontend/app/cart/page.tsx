"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { LoadingState } from "@/components/LoadingState";
import { MainNav } from "@/components/MainNav";
import { apiFetch, resolveImageUrl } from "@/lib/api";
import { emitCartUpdated } from "@/lib/cartSync";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { usePolling } from "@/lib/usePolling";
import type { CartResponse, Order } from "@/lib/types";

export default function CartPage() {
  const router = useRouter();
  const { loading: guardLoading, session } = useAuthGuard();
  const sessionId = session?.userId;
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [shippingAddress, setShippingAddress] = useState("221B Baker Street, London");
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const loadCart = useCallback(
    async (showLoader: boolean) => {
      if (showLoader) {
        setLoading(true);
      }
      try {
        const response = await apiFetch<CartResponse>("/api/cart", {}, true);
        setError(null);
        setCart(response);
        emitCartUpdated(response.totalItems);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unable to load cart.");
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
      void loadCart(true);
    }
  }, [guardLoading, loadCart, sessionId]);

  usePolling(() => loadCart(false), 2000, Boolean(sessionId));

  useEffect(() => {
    if (!cart) {
      return;
    }
    const nextDrafts: Record<number, string> = {};
    cart.items.forEach((item) => {
      nextDrafts[item.id] = String(item.quantity);
    });
    setQuantityDrafts(nextDrafts);
  }, [cart]);

  const updateQuantity = async (itemId: number, quantity: number) => {
    const safeQuantity = Math.max(1, quantity);
    setQuantityDrafts((prev) => ({ ...prev, [itemId]: String(safeQuantity) }));
    try {
      const response = await apiFetch<CartResponse>(
        `/api/cart/items/${itemId}`,
        {
          method: "PUT",
          body: JSON.stringify({ quantity: safeQuantity }),
        },
        true
      );
      setCart(response);
      emitCartUpdated(response.totalItems);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update quantity.");
    }
  };

  const removeItem = async (itemId: number, currentQuantity: number) => {
    try {
      const response =
        currentQuantity > 1
          ? await apiFetch<CartResponse>(
              `/api/cart/items/${itemId}`,
              {
                method: "PUT",
                body: JSON.stringify({ quantity: currentQuantity - 1 }),
              },
              true
            )
          : await apiFetch<CartResponse>(`/api/cart/items/${itemId}`, { method: "DELETE" }, true);
      setCart(response);
      emitCartUpdated(response.totalItems);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove item.");
    }
  };

  const checkout = async () => {
    if (!shippingAddress.trim()) {
      setError("Shipping address is required.");
      return;
    }

    setCheckingOut(true);
    setError(null);

    try {
      await apiFetch<Order>(
        "/api/orders/checkout",
        {
          method: "POST",
          body: JSON.stringify({ shippingAddress: shippingAddress.trim() }),
        },
        true
      );
      emitCartUpdated(0);
      router.push("/orders");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setCheckingOut(false);
    }
  };

  if (guardLoading || !session) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="mx-auto max-w-5xl px-4 pt-6">
          <MainNav />
          <LoadingState label="Checking your account..." />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-10">
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <MainNav />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <h1 className="text-2xl font-semibold text-slate-900">Your Cart</h1>
          <p className="mt-1 text-sm text-slate-600">Review items and complete checkout.</p>

          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          {loading && <div className="mt-4"><LoadingState label="Loading cart..." /></div>}

          {!loading && cart && (
            <>
              <div className="mt-6 space-y-3">
                {cart.items.length === 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
                    Cart is empty. Add products first.
                  </div>
                )}

                {cart.items.map((item, index) => (
                  <article key={item.id} className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-[100px_1fr_auto]">
                    <img src={resolveImageUrl(item.imageUrl)} alt={item.productName} className="h-24 w-24 rounded-lg object-cover" />
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-500">
                        Cart No: {index + 1} | Cart Item ID: {item.id}
                      </p>
                      <h2 className="text-base font-semibold text-slate-900">{item.productName}</h2>
                      <p className="text-sm text-slate-600">Unit: ${Number(item.unitPrice).toFixed(2)}</p>
                      <p className="text-sm font-medium text-slate-800">Line Total: ${Number(item.lineTotal).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2 md:flex-col md:items-end">
                      <input
                        type="number"
                        min={1}
                        value={quantityDrafts[item.id] ?? String(item.quantity)}
                        className="w-20 rounded-md border border-slate-300 px-2 py-1"
                        onChange={(e) =>
                          setQuantityDrafts((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        onBlur={(e) => updateQuantity(item.id, Number(e.target.value))}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.id, item.quantity)}
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                      >
                        Remove 1
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">Items: {cart.totalItems}</p>
                <p className="text-xl font-semibold text-slate-900">Subtotal: ${Number(cart.subtotal).toFixed(2)}</p>

                <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="shippingAddress">
                  Shipping Address
                </label>
                <textarea
                  id="shippingAddress"
                  className="mt-1 h-24 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                />

                <button
                  type="button"
                  disabled={checkingOut || cart.items.length === 0}
                  onClick={checkout}
                  className="mt-4 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkingOut ? "Processing..." : "Checkout"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
