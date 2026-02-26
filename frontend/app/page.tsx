"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { MainNav } from "@/components/MainNav";
import { apiFetch, resolveImageUrl } from "@/lib/api";
import { usePolling } from "@/lib/usePolling";
import type { Banner, PagedResponse, Product } from "@/lib/types";

export default function HomePage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadHomeData = useCallback(async () => {
    try {
      const [bannerResponse, productResponse] = await Promise.all([
        apiFetch<Banner[]>("/api/banners"),
        apiFetch<PagedResponse<Product>>("/api/products?page=0&size=8"),
      ]);
      setError(null);
      setBanners(bannerResponse);
      setFeaturedProducts(productResponse.content);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to load home page data.";
      setError(message);
    }
  }, []);

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
        setError(null);
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

  usePolling(loadHomeData, 4000, true);

  useEffect(() => {
    if (banners.length <= 1) {
      return;
    }
    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [banners.length]);



  const heroBanner = banners[activeSlide];
  const heroImage = resolveImageUrl(heroBanner?.imageUrl);

  return (
    <main className="min-h-screen bg-slate-100 pb-10">
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
                  src={resolveImageUrl(product.imageUrls?.[0] ?? product.imageUrl)}
                  alt={product.name}
                  className="h-44 w-full object-cover"
                />
                <div className="space-y-2 p-4">
                  <h3 className="text-base font-semibold text-slate-900">{product.name}</h3>
                  <p className="line-clamp-2 text-sm text-slate-600">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-teal-700">${Number(product.price).toFixed(2)}</span>
                    <Link
                      href={`/products/${product.id}`}
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

    </main>
  );
}
