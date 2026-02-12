"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/lib/api";
import { subscribeCartUpdated } from "@/lib/cartSync";
import { clearSession, getSession } from "@/lib/session";
import { useHydrated } from "@/lib/useHydrated";
import { usePolling } from "@/lib/usePolling";
import type { CartResponse } from "@/lib/types";

type MainNavProps = {
  compact?: boolean;
};

export function MainNav({ compact = false }: MainNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const session = useMemo(() => (hydrated ? getSession() : null), [hydrated]);
  const sessionUserId = session?.userId;
  const [cartCount, setCartCount] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadCartCount = useCallback(async () => {
    if (!sessionUserId) {
      setCartCount(0);
      return;
    }

    try {
      const cart = await apiFetch<CartResponse>("/api/cart", {}, true);
      setCartCount(cart.totalItems);
    } catch {
      setCartCount(0);
    }
  }, [sessionUserId]);

  useEffect(() => {
    if (!sessionUserId) {
      return;
    }
    return subscribeCartUpdated((totalItems) => {
      setCartCount(totalItems);
    });
  }, [sessionUserId]);

  usePolling(loadCartCount, 1500, Boolean(sessionUserId), true);

  useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent | globalThis.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!menuRef.current?.contains(target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [profileMenuOpen]);

  const handleLogout = () => {
    setProfileMenuOpen(false);
    clearSession();
    router.push("/login");
  };

  const handleBrandClick = (event: MouseEvent<HTMLAnchorElement>) => {
    setProfileMenuOpen(false);
    event.preventDefault();
    if (pathname === "/") {
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    router.push("/");
  };

  return (
    <header className={compact ? "mb-4" : "mb-8"}>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Link href="/" onClick={handleBrandClick} className="text-lg font-semibold text-slate-900">
          LuminousOne
        </Link>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="Open profile menu"
            aria-expanded={profileMenuOpen}
            onClick={() => setProfileMenuOpen((open) => !open)}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20a8 8 0 0 1 16 0" />
            </svg>
            {sessionUserId && cartCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <Link className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100" href="/">
                Home
              </Link>
              <Link className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100" href="/products">
                Products
              </Link>
              <Link className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-slate-100" href="/cart">
                <span>Cart</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {cartCount}
                </span>
              </Link>
              <Link className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100" href="/orders">
                Orders
              </Link>
              {session?.role === "ROLE_ADMIN" && (
                <Link className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100" href="/admin/dashboard">
                  Admin Dashboard
                </Link>
              )}
              {!session && (
                <Link className="mt-1 block rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700" href="/login">
                  Login
                </Link>
              )}
              {session && (
                <>
                  <div className="my-1 border-t border-slate-200" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-md bg-rose-600 px-3 py-2 text-left text-sm font-semibold text-white hover:bg-rose-500"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
