"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, resolveImageUrl } from "@/lib/api";
import { emitCartUpdated } from "@/lib/cartSync";
import { getSession } from "@/lib/session";
import type { CartResponse, Order } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CartDrawer({ open, onClose }: Props) {
  const router                              = useRouter();
  const [cart, setCart]                     = useState<CartResponse | null>(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [checkingOut, setCheckingOut]       = useState(false);
  const [shippingAddress, setShippingAddr]  = useState("221B Baker Street, London");
  const drawerRef                           = useRef<HTMLDivElement>(null);

  /* ── load cart when opened ── */
  const load = useCallback(async () => {
    const session = getSession();
    if (!session) { setCart(null); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<CartResponse>("/api/cart", {}, true);
      setCart(data);
      emitCartUpdated(data.totalItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load cart.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) void load(); }, [open, load]);

  /* ── ESC to close ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* ── quantity update ── */
  const updateQty = async (itemId: number, qty: number) => {
    if (qty < 1) return;
    try {
      const data = await apiFetch<CartResponse>(
        `/api/cart/items/${itemId}`,
        { method: "PUT", body: JSON.stringify({ quantity: qty }) },
        true,
      );
      setCart(data);
      emitCartUpdated(data.totalItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quantity.");
    }
  };

  /* ── remove item ── */
  const removeItem = async (itemId: number) => {
    try {
      const data = await apiFetch<CartResponse>(
        `/api/cart/items/${itemId}`,
        { method: "DELETE" },
        true,
      );
      setCart(data);
      emitCartUpdated(data.totalItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove item.");
    }
  };

  /* ── checkout ── */
  const checkout = async () => {
    if (!shippingAddress.trim()) { setError("Please enter a shipping address."); return; }
    setCheckingOut(true);
    setError(null);
    try {
      await apiFetch<Order>(
        "/api/orders/checkout",
        { method: "POST", body: JSON.stringify({ shippingAddress: shippingAddress.trim() }) },
        true,
      );
      emitCartUpdated(0);
      setCart(null);
      onClose();
      router.push("/orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setCheckingOut(false);
    }
  };

  const session = typeof window !== "undefined" ? getSession() : null;

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(15,23,42,0.48)",
          zIndex: 60,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.28s ease",
          backdropFilter: open ? "blur(3px)" : "none",
          WebkitBackdropFilter: open ? "blur(3px)" : "none",
        }}
      />

      {/* ── Drawer panel ── */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-label="Shopping cart"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(420px, 100vw)",
          background: "#fff",
          zIndex: 61,
          display: "flex", flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: "-4px 0 40px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e8eef8",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2" style={{ width: 22, height: 22 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 style={{ fontWeight: 700, fontSize: "1.05rem", color: "#0f172a" }}>
              Your Cart
              {cart && cart.totalItems > 0 && (
                <span style={{
                  marginLeft: "0.5rem",
                  background: "#0f766e", color: "#fff",
                  fontSize: "0.7rem", fontWeight: 700,
                  padding: "0.15em 0.55em", borderRadius: 99,
                  verticalAlign: "middle",
                }}>
                  {cart.totalItems}
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            style={{
              background: "#f1f5f9", border: "none",
              width: 34, height: 34, borderRadius: 8,
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#64748b", fontSize: "1.1rem",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem" }}>

          {/* Not logged in */}
          {!session && (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>🛒</div>
              <p style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a", marginBottom: "0.4rem" }}>Sign in to view your cart</p>
              <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.5rem" }}>Your saved items will be here.</p>
              <Link
                href="/login"
                onClick={onClose}
                style={{
                  display: "inline-block",
                  background: "#0f766e", color: "#fff",
                  padding: "0.65rem 1.75rem", borderRadius: 10,
                  fontWeight: 600, fontSize: "0.9rem", textDecoration: "none",
                }}
              >
                Login to Continue
              </Link>
            </div>
          )}

          {/* Loading */}
          {session && loading && (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{
                width: 32, height: 32,
                border: "3px solid #e2e8f0",
                borderTopColor: "#0f766e",
                borderRadius: "50%",
                margin: "0 auto 1rem",
                animation: "lo-spin 0.8s linear infinite",
              }} />
              <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading your cart…</p>
            </div>
          )}

          {/* Empty */}
          {session && !loading && cart && cart.items.length === 0 && (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>🛍️</div>
              <p style={{ fontWeight: 700, color: "#0f172a", marginBottom: "0.4rem" }}>Your cart is empty</p>
              <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.5rem" }}>Add something great to get started.</p>
              <Link
                href="/products"
                onClick={onClose}
                style={{
                  display: "inline-block",
                  background: "#0f766e", color: "#fff",
                  padding: "0.65rem 1.75rem", borderRadius: 10,
                  fontWeight: 600, fontSize: "0.9rem", textDecoration: "none",
                }}
              >
                Shop Now
              </Link>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: "#fff1f2", color: "#be123c",
              border: "1px solid #fecdd3",
              borderRadius: 8, padding: "0.625rem 1rem",
              fontSize: "0.85rem", marginBottom: "0.75rem",
            }}>
              {error}
            </div>
          )}

          {/* Items */}
          {session && !loading && cart && cart.items.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex", gap: "0.875rem",
                    paddingBottom: "0.875rem",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  {/* Image */}
                  <img
                    src={resolveImageUrl(item.imageUrl)}
                    alt={item.productName}
                    style={{
                      width: 72, height: 72, borderRadius: 10,
                      objectFit: "cover", border: "1px solid #e2e8f0",
                      flexShrink: 0,
                    }}
                  />
                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontWeight: 600, fontSize: "0.875rem", color: "#0f172a",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      marginBottom: "0.15rem",
                    }}>
                      {item.productName}
                    </p>
                    <p style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "0.6rem" }}>
                      ${Number(item.unitPrice).toFixed(2)} each
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {/* Qty controls */}
                      <div style={{
                        display: "flex", alignItems: "center", gap: "0.2rem",
                        background: "#f8fafc", border: "1px solid #e2e8f0",
                        borderRadius: 8, padding: "0.2rem",
                      }}>
                        <button
                          onClick={() => updateQty(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          style={{
                            width: 24, height: 24, display: "flex",
                            alignItems: "center", justifyContent: "center",
                            background: "none", border: "none", borderRadius: 6,
                            cursor: item.quantity <= 1 ? "not-allowed" : "pointer",
                            color: "#64748b", fontSize: "1rem", fontWeight: 700,
                            opacity: item.quantity <= 1 ? 0.35 : 1,
                          }}
                        >−</button>
                        <span style={{
                          minWidth: 24, textAlign: "center",
                          fontSize: "0.875rem", fontWeight: 600, color: "#0f172a",
                        }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          style={{
                            width: 24, height: 24, display: "flex",
                            alignItems: "center", justifyContent: "center",
                            background: "none", border: "none", borderRadius: 6,
                            cursor: "pointer", color: "#0f766e",
                            fontSize: "1rem", fontWeight: 700,
                          }}
                        >+</button>
                      </div>
                      {/* Price + remove */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f766e" }}>
                          ${Number(item.lineTotal).toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          style={{
                            background: "#fff1f2", color: "#e11d48",
                            border: "1px solid #fecdd3",
                            borderRadius: 7, padding: "0.2rem 0.55rem",
                            fontSize: "0.73rem", fontWeight: 600, cursor: "pointer",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#ffe4e6")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff1f2")}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — only when there are items */}
        {session && cart && cart.items.length > 0 && (
          <div style={{
            borderTop: "1px solid #e8eef8",
            padding: "1.25rem 1.5rem",
            flexShrink: 0, background: "#f8fafc",
          }}>
            {/* Shipping address */}
            <div style={{ marginBottom: "0.875rem" }}>
              <label style={{
                display: "block", fontSize: "0.76rem", fontWeight: 600,
                color: "#475569", marginBottom: "0.3rem",
              }}>
                Shipping Address
              </label>
              <input
                type="text"
                value={shippingAddress}
                onChange={(e) => setShippingAddr(e.target.value)}
                placeholder="Enter shipping address…"
                style={{
                  width: "100%", padding: "0.5rem 0.75rem",
                  border: "1.5px solid #dbeafe", borderRadius: 8,
                  fontSize: "0.85rem", background: "#fff",
                  outline: "none", color: "#0f172a",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#0f766e")}
                onBlur={(e) => (e.target.style.borderColor = "#dbeafe")}
              />
            </div>

            {/* Subtotal row */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: "1rem",
            }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#64748b" }}>
                Subtotal ({cart.totalItems} items)
              </span>
              <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f766e" }}>
                ${Number(cart.subtotal).toFixed(2)}
              </span>
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button
                onClick={checkout}
                disabled={checkingOut}
                style={{
                  background: "#0f766e", color: "#fff",
                  border: "none", borderRadius: 11,
                  padding: "0.8rem 1.5rem",
                  fontWeight: 700, fontSize: "0.95rem",
                  cursor: checkingOut ? "not-allowed" : "pointer",
                  opacity: checkingOut ? 0.7 : 1,
                  transition: "opacity 0.15s ease, background 0.15s ease",
                }}
                onMouseEnter={(e) => { if (!checkingOut) e.currentTarget.style.background = "#0d6460"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#0f766e"; }}
              >
                {checkingOut ? "Processing…" : `Checkout — $${Number(cart.subtotal).toFixed(2)}`}
              </button>
              <Link
                href="/cart"
                onClick={onClose}
                style={{
                  display: "block", textAlign: "center",
                  background: "#fff", color: "#0f766e",
                  border: "1.5px solid #0f766e", borderRadius: 11,
                  padding: "0.65rem 1.5rem",
                  fontWeight: 600, fontSize: "0.875rem",
                  textDecoration: "none",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdf4")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
              >
                View Full Cart
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
