"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CartDrawer } from "@/components/CartDrawer";
import { apiFetch } from "@/lib/api";
import { subscribeCartUpdated } from "@/lib/cartSync";
import { clearSession, getSession } from "@/lib/session";
import { getWishlistCount, subscribeWishlist } from "@/lib/wishlist";
import { useHydrated } from "@/lib/useHydrated";
import { usePolling } from "@/lib/usePolling";
import type { CartResponse, PagedResponse, Product } from "@/lib/types";

const CATEGORIES = [
  { label: "All Products",    href: "/products",                     icon: "🛍️", desc: "Browse everything" },
  { label: "Electronics",     href: "/products?category=electronics", icon: "💻", desc: "Gadgets & tech" },
  { label: "Fashion",         href: "/products?category=fashion",     icon: "👗", desc: "Clothing & accessories" },
  { label: "Home & Living",   href: "/products?category=home",        icon: "🏠", desc: "Furniture & décor" },
  { label: "Sports & Fitness",href: "/products?category=sports",     icon: "🏃", desc: "Gear & equipment" },
  { label: "Beauty & Care",   href: "/products?category=beauty",     icon: "✨", desc: "Skincare & cosmetics" },
  { label: "Books",           href: "/products?category=books",      icon: "📚", desc: "Fiction & non-fiction" },
];

type MainNavProps = {
  compact?: boolean;
};

function MenuLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-800 hover:border-teal-500 hover:text-teal-700"
    >
      {label}
    </Link>
  );
}

export function MainNav({ compact = false }: MainNavProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const session  = useMemo(() => (hydrated ? getSession() : null), [hydrated]);
  const sessionUserId = session?.userId;

  /* ── cart ── */
  const [cartCount, setCartCount]         = useState(0);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  /* ── menus ── */
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen]               = useState(false);
  const [categoryOpen, setCategoryOpen]       = useState(false);
  const menuRef     = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  /* ── search ── */
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef      = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ── wishlist ── */
  const [wishlistCount, setWishlistCount] = useState(0);
  useEffect(() => {
    if (!hydrated) return;
    setWishlistCount(getWishlistCount());
    return subscribeWishlist(() => setWishlistCount(getWishlistCount()));
  }, [hydrated]);

  /* ── cart count ── */
  const loadCartCount = useCallback(async () => {
    if (!sessionUserId) { setCartCount(0); return; }
    try {
      const cart = await apiFetch<CartResponse>("/api/cart", {}, true);
      setCartCount(cart.totalItems);
    } catch {
      setCartCount(0);
    }
  }, [sessionUserId]);

  useEffect(() => {
    if (!sessionUserId) return;
    return subscribeCartUpdated((n) => setCartCount(n));
  }, [sessionUserId]);

  usePolling(loadCartCount, 1500, Boolean(sessionUserId), true);

  /* ── search debounce ── */
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    setSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const p = new URLSearchParams({ search: searchQuery.trim(), page: "0", size: "5" });
        const res = await apiFetch<PagedResponse<Product>>(`/api/products?${p.toString()}`);
        setSearchResults(res.content);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ── outside‑click: profile ── */
  useEffect(() => {
    if (!profileMenuOpen) return;
    const h = (e: globalThis.MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [profileMenuOpen]);

  /* ── outside‑click: category ── */
  useEffect(() => {
    if (!categoryOpen) return;
    const h = (e: globalThis.MouseEvent) => {
      if (!categoryRef.current?.contains(e.target as Node)) setCategoryOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [categoryOpen]);

  /* ── outside‑click: search ── */
  useEffect(() => {
    if (!searchOpen) return;
    const h = (e: globalThis.MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [searchOpen]);

  /* ── body scroll lock ── */
  useEffect(() => {
    document.body.style.overflow = menuOpen || cartDrawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen, cartDrawerOpen]);

  const handleLogout = () => {
    setProfileMenuOpen(false);
    clearSession();
    router.push("/login");
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    setSearchQuery("");
    router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const menuCta = session
    ? session.role === "ROLE_ADMIN"
      ? { href: "/admin/dashboard", label: "Admin Dashboard" }
      : { href: "/products", label: "Continue Shopping" }
    : { href: "/login", label: "Login" };

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
    <>
      {/* ══ Fixed Hamburger ══ */}
      <button
        type="button"
        aria-label={menuOpen ? "Close full menu" : "Open full menu"}
        onClick={() => setMenuOpen((o) => !o)}
        style={{
          position: "fixed", left: 16, top: 16, zIndex: 70,
          width: 44, height: 44, borderRadius: "50%",
          background: "#0f172a", color: "#fff",
          border: "none", cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
          transition: "background 0.2s ease, transform 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#1e293b")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#0f172a")}
      >
        {menuOpen ? (
          <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12" /><path d="M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 8h16" /><path d="M4 16h16" />
          </svg>
        )}
      </button>

      {/* ══ Header ══ */}
      <header style={{ marginBottom: compact ? "1rem" : "1.5rem" }}>

        {/* Row 1 — logo · search · icons */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "0.75rem",
          background: "#fff", borderRadius: 14,
          border: "1px solid #dbeafe",
          padding: "0.7rem 1rem",
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        }}>
          {/* Logo */}
          <div style={{ paddingLeft: 48, flexShrink: 0 }}>
            <Link
              href="/"
              onClick={handleBrandClick}
              style={{
                fontFamily: "var(--font-lora), serif",
                fontWeight: 700, fontSize: "1.15rem", color: "#0f172a",
                letterSpacing: "-0.02em", textDecoration: "none",
              }}
            >
              LuminousOne
            </Link>
          </div>

          {/* Search bar */}
          <div ref={searchRef} style={{ flex: 1, maxWidth: 480, position: "relative" }}>
            <form onSubmit={handleSearchSubmit}>
              <div style={{
                display: "flex", alignItems: "center",
                background: "#f8fafc", border: "1.5px solid #e2e8f0",
                borderRadius: 10, overflow: "hidden",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              }}
                onFocusCapture={(e) => { e.currentTarget.style.borderColor = "#0f766e"; e.currentTarget.style.boxShadow = "0 0 0 3px #ccf0ec"; }}
                onBlurCapture={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ width: 17, height: 17, flexShrink: 0, marginLeft: 12 }}>
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
                  placeholder="Search products…"
                  style={{
                    flex: 1, border: "none", background: "transparent",
                    padding: "0.6rem 0.75rem", fontSize: "0.9rem", color: "#0f172a",
                    outline: "none", minWidth: 0,
                  }}
                />
                {searchLoading && (
                  <div style={{
                    width: 15, height: 15, border: "2px solid #e2e8f0",
                    borderTopColor: "#0f766e", borderRadius: "50%",
                    marginRight: 10, flexShrink: 0,
                    animation: "lo-spin 0.7s linear infinite",
                  }} />
                )}
                {searchQuery && !searchLoading && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchOpen(false); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", marginRight: 8, fontSize: "1rem", display: "flex", alignItems: "center" }}
                  >×</button>
                )}
                <button
                  type="submit"
                  style={{
                    background: "#0f766e", color: "#fff",
                    border: "none", padding: "0.6rem 1rem",
                    fontWeight: 600, fontSize: "0.8rem",
                    cursor: "pointer", flexShrink: 0,
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#0d6460")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#0f766e")}
                >
                  Search
                </button>
              </div>
            </form>

            {/* Autocomplete dropdown */}
            {searchOpen && searchResults.length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                background: "#fff", borderRadius: 12,
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                zIndex: 80, overflow: "hidden",
                animation: "navSlideDown 0.18s ease both",
              }}>
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setSearchOpen(false); setSearchQuery(""); router.push(`/products/${p.id}`); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      width: "100%", padding: "0.625rem 1rem",
                      background: "none", border: "none",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer", textAlign: "left",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, background: "#f1f5f9", overflow: "hidden" }}>
                      <img src={p.imageUrls?.[0] ?? p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</p>
                      <p style={{ fontSize: "0.78rem", color: "#0f766e", fontWeight: 600 }}>${Number(p.price).toFixed(2)}</p>
                    </div>
                    <svg viewBox="0 0 20 20" fill="#cbd5e1" style={{ width: 13, height: 13, flexShrink: 0 }}>
                      <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setSearchOpen(false); router.push(`/products?search=${encodeURIComponent(searchQuery)}`); }}
                  style={{
                    display: "block", width: "100%", padding: "0.625rem 1rem",
                    background: "#f8fafc", border: "none", cursor: "pointer",
                    fontSize: "0.8rem", fontWeight: 600, color: "#0f766e", textAlign: "center",
                  }}
                >
                  See all results for &quot;{searchQuery}&quot; →
                </button>
              </div>
            )}
          </div>

          {/* Right icon group */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexShrink: 0 }}>

            {/* Wishlist */}
            <Link
              href="/products"
              title="Wishlist"
              style={{
                position: "relative", width: 40, height: 40, borderRadius: 9,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: "#f8fafc", border: "1px solid #e8eef8",
                color: "#64748b", textDecoration: "none",
                transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#e11d48"; e.currentTarget.style.background = "#fff1f2"; e.currentTarget.style.borderColor = "#fecdd3"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e8eef8"; }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4,
                  background: "#e11d48", color: "#fff",
                  fontSize: "0.62rem", fontWeight: 700,
                  padding: "0.1em 0.4em", borderRadius: 99,
                  border: "2px solid #fff", lineHeight: 1.4, minWidth: 16, textAlign: "center",
                }}>
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <button
              type="button"
              title="Cart"
              onClick={() => setCartDrawerOpen(true)}
              style={{
                position: "relative", width: 40, height: 40, borderRadius: 9,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: "#f8fafc", border: "1px solid #e8eef8",
                color: "#64748b", cursor: "pointer",
                transition: "background 0.15s ease, color 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.color = "#0f766e"; e.currentTarget.style.borderColor = "#bbf7d0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#e8eef8"; }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4,
                  background: "#0f766e", color: "#fff",
                  fontSize: "0.62rem", fontWeight: 700,
                  padding: "0.1em 0.4em", borderRadius: 99,
                  border: "2px solid #fff", lineHeight: 1.4, minWidth: 16, textAlign: "center",
                }}>
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>

            {/* Profile */}
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                type="button"
                aria-label="Account menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((o) => !o)}
                style={{
                  width: 40, height: 40, borderRadius: 9,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  background: profileMenuOpen ? "#0f172a" : "#f8fafc",
                  border: "1px solid",
                  borderColor: profileMenuOpen ? "#0f172a" : "#e8eef8",
                  color: profileMenuOpen ? "#fff" : "#64748b",
                  cursor: "pointer",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20a8 8 0 0 1 16 0" />
                </svg>
              </button>

              {profileMenuOpen && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)",
                  width: 240, background: "#fff", borderRadius: 14,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.14)",
                  zIndex: 80, overflow: "hidden",
                  animation: "navSlideDown 0.18s ease both",
                }}>
                  {session && (
                    <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                      <p style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: "0.1rem" }}>Signed in as</p>
                      <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.fullName}</p>
                      <p style={{ fontSize: "0.75rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.email}</p>
                    </div>
                  )}
                  <div style={{ padding: "0.375rem" }}>
                    {([
                      { href: "/",        label: "🏠  Home" },
                      { href: "/products",label: "🛍️  Products" },
                      { href: "/cart",    label: "🛒  Cart" },
                      { href: "/orders",  label: "📦  My Orders" },
                    ] as { href: string; label: string }[]).map(({ href, label }) => (
                      <Link
                        key={href} href={href}
                        onClick={() => setProfileMenuOpen(false)}
                        style={{
                          display: "flex", alignItems: "center",
                          padding: "0.55rem 0.75rem", borderRadius: 8,
                          fontSize: "0.875rem", color: "#334155",
                          textDecoration: "none",
                          transition: "background 0.1s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        {label}
                      </Link>
                    ))}
                    {session?.role === "ROLE_ADMIN" && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setProfileMenuOpen(false)}
                        style={{
                          display: "flex", alignItems: "center",
                          padding: "0.55rem 0.75rem", borderRadius: 8,
                          fontSize: "0.875rem", color: "#0f766e", fontWeight: 600,
                          textDecoration: "none",
                          transition: "background 0.1s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdf4")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        ⚙️  Admin Dashboard
                      </Link>
                    )}
                    {!session && (
                      <Link
                        href="/login"
                        onClick={() => setProfileMenuOpen(false)}
                        style={{
                          display: "block", textAlign: "center",
                          margin: "0.375rem 0 0.125rem",
                          padding: "0.625rem", borderRadius: 9,
                          background: "#0f172a", color: "#fff",
                          fontSize: "0.875rem", fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        Login / Register
                      </Link>
                    )}
                    {session && (
                      <>
                        <div style={{ borderTop: "1px solid #f1f5f9", margin: "0.375rem 0" }} />
                        <button
                          type="button"
                          onClick={handleLogout}
                          style={{
                            display: "block", width: "100%",
                            padding: "0.625rem 0.75rem", borderRadius: 9,
                            background: "#fff1f2", color: "#e11d48",
                            border: "none", fontSize: "0.875rem", fontWeight: 700,
                            cursor: "pointer", textAlign: "left",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#ffe4e6")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff1f2")}
                        >
                          🚪  Sign Out
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2 — desktop nav bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.125rem",
          padding: "0.3rem 1rem",
          background: "#fff", borderRadius: 11,
          border: "1px solid #f1f5f9",
          marginTop: "0.5rem",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          overflowX: "auto",
        }}>
          {([{ href: "/", label: "Home" }, { href: "/products", label: "Products" }] as { href: string; label: string }[]).map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href} href={href}
                style={{
                  padding: "0.4rem 0.875rem", borderRadius: 8,
                  fontWeight: active ? 600 : 500, fontSize: "0.875rem",
                  color: active ? "#0f766e" : "#475569",
                  background: active ? "#f0fdf4" : "none",
                  textDecoration: "none", whiteSpace: "nowrap",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? "#f0fdf4" : "none"; }}
              >
                {label}
              </Link>
            );
          })}

          {/* Categories mega-menu */}
          <div ref={categoryRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setCategoryOpen((o) => !o)}
              style={{
                display: "flex", alignItems: "center", gap: "0.3rem",
                padding: "0.4rem 0.875rem", borderRadius: 8,
                fontWeight: 500, fontSize: "0.875rem",
                color: categoryOpen ? "#0f766e" : "#475569",
                background: categoryOpen ? "#f0fdf4" : "none",
                border: "none", cursor: "pointer",
                transition: "background 0.15s ease, color 0.15s ease",
              }}
            >
              Categories
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14, transform: categoryOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {categoryOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0,
                width: 480, background: "#fff", borderRadius: 16,
                border: "1px solid #e2e8f0",
                boxShadow: "0 12px 40px rgba(0,0,0,0.14)",
                zIndex: 80, padding: "1.125rem",
                animation: "navSlideDown 0.18s ease both",
              }}>
                <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                  Browse by Category
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem" }}>
                  {CATEGORIES.map(({ label, href, icon, desc }) => (
                    <Link
                      key={href} href={href}
                      onClick={() => setCategoryOpen(false)}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.75rem",
                        padding: "0.625rem 0.75rem", borderRadius: 10,
                        textDecoration: "none",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <span style={{ width: 36, height: 36, borderRadius: 9, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", flexShrink: 0 }}>
                        {icon}
                      </span>
                      <div>
                        <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}>{label}</p>
                        <p style={{ fontSize: "0.73rem", color: "#94a3b8" }}>{desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ width: 1, height: 18, background: "#e2e8f0", margin: "0 0.25rem", flexShrink: 0 }} />

          {session && (
            <>
              <Link
                href="/cart"
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.4rem 0.875rem", borderRadius: 8,
                  fontWeight: 500, fontSize: "0.875rem",
                  color: "#475569", textDecoration: "none", whiteSpace: "nowrap",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                Cart
                {cartCount > 0 && (
                  <span style={{ background: "#0f766e", color: "#fff", fontSize: "0.68rem", fontWeight: 700, padding: "0.1em 0.45em", borderRadius: 99 }}>{cartCount}</span>
                )}
              </Link>
              <Link
                href="/orders"
                style={{
                  padding: "0.4rem 0.875rem", borderRadius: 8,
                  fontWeight: 500, fontSize: "0.875rem",
                  color: "#475569", textDecoration: "none", whiteSpace: "nowrap",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                My Orders
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ══ Cart Drawer ══ */}
      <CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />

      {/* ══ Full-screen Menu ══ */}
      {menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 65, background: "rgba(15,23,42,0.45)" }}>
          <div className="grid h-full w-full grid-cols-1 bg-white md:grid-cols-4">
            <section className="relative p-8 md:col-span-3">
              <h2 className="mt-10 text-3xl font-semibold text-slate-900">Full Menu</h2>
              <p className="mt-2 max-w-xl text-slate-600">Navigate anywhere in the store.</p>
              <nav className="mt-10 grid max-w-2xl gap-3 text-lg">
                <MenuLink href="/" label="Home" onNavigate={() => setMenuOpen(false)} />
                <MenuLink href="/products" label="Products" onNavigate={() => setMenuOpen(false)} />
                {session && (
                  <>
                    <MenuLink href="/cart" label="Cart" onNavigate={() => setMenuOpen(false)} />
                    <MenuLink href="/orders" label="Order History" onNavigate={() => setMenuOpen(false)} />
                  </>
                )}
                {session?.role === "ROLE_ADMIN" && (
                  <MenuLink href="/admin/dashboard" label="Admin Dashboard" onNavigate={() => setMenuOpen(false)} />
                )}
              </nav>
            </section>
            <aside className="flex items-center justify-center border-l border-slate-200 bg-slate-50 p-8 md:col-span-1">
              <Link
                href={menuCta.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg bg-slate-950 px-8 py-3 text-lg font-semibold text-white shadow hover:bg-slate-800"
              >
                {menuCta.label}
              </Link>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}