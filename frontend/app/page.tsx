"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MainNav } from "@/components/MainNav";
import { apiFetch, resolveImageUrl } from "@/lib/api";
import { getSession } from "@/lib/session";
import { useHydrated } from "@/lib/useHydrated";
import type { Banner, PagedResponse, Product } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [menuOpen, setMenuOpen] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiFetch<Banner[]>("/api/banners"),
      apiFetch<PagedResponse<Product>>("/api/products?page=0&size=8"),
    ])
      .then(([bannerResponse, productResponse]) => {
        if (!alive) {
          return;
        }
        setBanners(bannerResponse);
        setFeaturedProducts(productResponse.content);
      })
      .catch((err: unknown) => {
        if (!alive) {
          return;
        }
        const message = err instanceof Error ? err.message : "Unable to load home page data.";
        setError(message);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) {
      return;
    }
    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [banners.length]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const session = hydrated ? getSession() : null;

  const menuCta = session
    ? session.role === "ROLE_ADMIN"
      ? { href: "/admin/dashboard", label: "Admin Dashboard" }
      : { href: "/products", label: "Continue Shopping" }
    : { href: "/login", label: "Login" };

  const heroBanner = banners[activeSlide];
  const heroImage = resolveImageUrl(heroBanner?.imageUrl);

  const closeMenuAndNavigateHome = () => {
    setMenuOpen(false);
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-slate-100 pb-10">
      <button
        type="button"
        aria-label="Open full menu"
        onClick={() => setMenuOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-md bg-slate-950 px-3 py-1 text-2xl font-bold text-white shadow-lg"
      >
        =
      </button>

      <div className="mx-auto max-w-6xl px-4 pt-6">
        <MainNav />

        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <img src={heroImage} alt={heroBanner?.title ?? "Hero banner"} className="h-[360px] w-full object-cover md:h-[460px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-900/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
            <p className="mb-2 w-fit rounded-full bg-orange-500/90 px-3 py-1 text-xs font-semibold tracking-wide text-white">
              New Generation Shopping
            </p>
            <h1 className="max-w-xl text-3xl font-semibold text-white md:text-5xl">
              {heroBanner?.title ?? "Build your style with curated products"}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-slate-200 md:text-base">
              Your home screen includes a dynamic hero slider, admin-controlled banners, and direct shopping navigation.
            </p>
          </div>
        </section>

        {error && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">Featured Products</h2>
            <Link href="/products" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
              Browse All
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <img
                  src={resolveImageUrl(product.imageUrl)}
                  alt={product.name}
                  className="h-44 w-full object-cover"
                />
                <div className="space-y-2 p-4">
                  <h3 className="text-base font-semibold text-slate-900">{product.name}</h3>
                  <p className="line-clamp-2 text-sm text-slate-600">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-teal-700">${Number(product.price).toFixed(2)}</span>
                    <Link
                      href="/products"
                      className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-600"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/45">
          <div className="grid h-full w-full grid-cols-1 bg-white md:grid-cols-4">
            <section className="relative p-8 md:col-span-3">
              <button
                type="button"
                onClick={closeMenuAndNavigateHome}
                className="absolute right-6 top-6 rounded-full border border-slate-300 px-3 py-1 text-xl text-slate-700 hover:bg-slate-100"
              >
                X
              </button>

              <h2 className="mt-10 text-3xl font-semibold text-slate-900">Full Menu</h2>
              <p className="mt-2 max-w-xl text-slate-600">
                This panel opens from the top-left &quot;=&quot; button. Use X to cancel and navigate back to home.
              </p>

              <nav className="mt-10 grid max-w-2xl gap-3 text-lg">
                <MenuLink href="/" label="Home" onNavigate={() => setMenuOpen(false)} />
                <MenuLink href="/products" label="Products" onNavigate={() => setMenuOpen(false)} />
                <MenuLink href="/cart" label="Cart" onNavigate={() => setMenuOpen(false)} />
                <MenuLink href="/orders" label="Order History" onNavigate={() => setMenuOpen(false)} />
                <MenuLink href="/admin/dashboard" label="Admin Dashboard" onNavigate={() => setMenuOpen(false)} />
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
    </main>
  );
}

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
