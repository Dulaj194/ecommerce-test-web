"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
import { clearSession, getSession } from "@/lib/session";
import { useHydrated } from "@/lib/useHydrated";
import type { CartResponse } from "@/lib/types";

type MainNavProps = {
  compact?: boolean;
};

export function MainNav({ compact = false }: MainNavProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useMemo(() => (hydrated ? getSession() : null), [hydrated]);
  const sessionUserId = session?.userId;
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let active = true;

    if (!sessionUserId) {
      return () => {
        active = false;
      };
    }

    apiFetch<CartResponse>("/api/cart", {}, true)
      .then((cart) => {
        if (active) {
          setCartCount(cart.totalItems);
        }
      })
      .catch(() => {
        if (active) {
          setCartCount(0);
        }
      });

    return () => {
      active = false;
    };
  }, [sessionUserId]);

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  return (
    <header className={compact ? "mb-4" : "mb-8"}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          NOVA MART
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link className="rounded-md px-3 py-1.5 hover:bg-slate-100" href="/">
            Home
          </Link>
          <Link className="rounded-md px-3 py-1.5 hover:bg-slate-100" href="/products">
            Products
          </Link>
          <Link className="rounded-md px-3 py-1.5 hover:bg-slate-100" href="/cart">
            <span className="inline-flex items-center gap-2">
              <span className="relative inline-flex">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-6 w-6 text-slate-900"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="20" r="1" />
                  <circle cx="18" cy="20" r="1" />
                  <path d="M1 1h4l2.68 12.39a2 2 0 0 0 2 1.61h7.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                {sessionUserId && cartCount > 0 && (
                  <span className="absolute -right-3 -top-2 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </span>
              <span className="font-medium text-slate-900">Cart</span>
            </span>
          </Link>
          <Link className="rounded-md px-3 py-1.5 hover:bg-slate-100" href="/orders">
            Orders
          </Link>
          {session?.role === "ROLE_ADMIN" && (
            <Link className="rounded-md px-3 py-1.5 hover:bg-slate-100" href="/admin/dashboard">
              Admin
            </Link>
          )}
          {!session && (
            <Link className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700" href="/login">
              Login
            </Link>
          )}
          {session && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-500"
            >
              Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
