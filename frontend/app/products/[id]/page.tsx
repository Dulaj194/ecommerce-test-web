"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LoadingState } from "@/components/LoadingState";
import { MainNav } from "@/components/MainNav";
import { apiFetch, resolveImageUrl } from "@/lib/api";
import { emitCartUpdated } from "@/lib/cartSync";
import { getSession } from "@/lib/session";
import type { CartResponse, Product } from "@/lib/types";

function parseProductId(raw: string | string[] | undefined): number | null {
  if (!raw || Array.isArray(raw)) {
    return null;
  }
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = parseProductId(params?.id);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const loadProduct = useCallback(async () => {
    if (!productId) {
      setError("Invalid product id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<Product>(`/api/products/${productId}`);
      setProduct(response);
      setActiveImageIndex(0);
      setQuantity(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load product.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const galleryImages = useMemo(() => {
    if (!product) {
      return [];
    }
    if (product.imageUrls?.length) {
      return product.imageUrls;
    }
    return product.imageUrl ? [product.imageUrl] : [];
  }, [product]);

  const maxQuantity = useMemo(() => {
    if (!product) {
      return 1;
    }
    return Math.max(1, Math.min(product.stock, 99));
  }, [product]);

  const inStock = Boolean(product && product.stock > 0);
  const safeImage =
    galleryImages[activeImageIndex] ??
    galleryImages[0] ??
    product?.imageUrl ??
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80";

  const updateQuantity = (next: number) => {
    const bounded = Math.min(maxQuantity, Math.max(1, next));
    setQuantity(bounded);
  };

  const handleAddToCart = async (goToCart: boolean) => {
    if (!product) {
      return;
    }

    const session = getSession();
    if (!session) {
      router.push(`/login?next=${encodeURIComponent(`/products/${product.id}`)}`);
      return;
    }

    if (!inStock) {
      setMessage("This product is currently out of stock.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const cart = await apiFetch<CartResponse>(
        "/api/cart/items",
        {
          method: "POST",
          body: JSON.stringify({
            productId: product.id,
            quantity,
          }),
        },
        true
      );

      emitCartUpdated(cart.totalItems);

      if (goToCart) {
        router.push("/cart");
        return;
      }

      setMessage("Product added to cart.");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed to add product.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 pb-10">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <MainNav />

        {loading && <LoadingState label="Loading product details..." />}

        {!loading && error && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
            <p className="text-sm font-medium">{error}</p>
            <Link href="/products" className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Back to products
            </Link>
          </section>
        )}

        {!loading && !error && product && (
          <>
            <nav className="mb-4 text-sm text-slate-600">
              <Link href="/" className="hover:text-slate-900">
                Home
              </Link>
              <span className="px-2">/</span>
              <Link href="/products" className="hover:text-slate-900">
                Products
              </Link>
              <span className="px-2">/</span>
              <span className="font-medium text-slate-900">{product.name}</span>
            </nav>

            <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1.05fr_1fr] md:p-6">
              <div>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img src={resolveImageUrl(safeImage)} alt={product.name} className="h-[320px] w-full object-cover md:h-[460px]" />
                </div>

                {galleryImages.length > 1 && (
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {galleryImages.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        className={`overflow-hidden rounded-md border ${
                          index === activeImageIndex ? "border-teal-600 ring-2 ring-teal-200" : "border-slate-200"
                        }`}
                      >
                        <img src={resolveImageUrl(image)} alt={`${product.name} thumbnail ${index + 1}`} className="h-16 w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <header>
                  <h1 className="text-3xl font-semibold text-slate-900">{product.name}</h1>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{product.description}</p>
                </header>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-3xl font-bold text-orange-600">${Number(product.price).toFixed(2)}</p>
                  <p className="mt-1 text-sm text-slate-600">Inclusive of taxes. Shipping calculated at checkout.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span
                    className={`rounded-full px-3 py-1 font-semibold ${
                      inStock ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {inStock ? `In stock (${product.stock})` : "Out of stock"}
                  </span>
                  <span className="text-slate-500">Product ID: {product.id}</span>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Quantity</p>
                  <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
                    <button
                      type="button"
                      onClick={() => updateQuantity(quantity - 1)}
                      disabled={quantity <= 1}
                      className="h-10 w-10 text-xl text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={maxQuantity}
                      value={quantity}
                      onChange={(event) => updateQuantity(Number(event.target.value))}
                      className="h-10 w-16 border-x border-slate-300 text-center outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => updateQuantity(quantity + 1)}
                      disabled={quantity >= maxQuantity}
                      className="h-10 w-10 text-xl text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void handleAddToCart(true)}
                    disabled={submitting || !inStock}
                    className="rounded-lg bg-sky-600 px-4 py-3 font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Processing..." : "Buy Now"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAddToCart(false)}
                    disabled={submitting || !inStock}
                    className="rounded-lg bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Adding..." : "Add To Cart"}
                  </button>
                </div>

                {message && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>}

                <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">Why buy from us?</p>
                  <ul className="mt-2 space-y-1">
                    <li>Fast island-wide delivery</li>
                    <li>Secure payments and order tracking</li>
                    <li>Dedicated after-sales support</li>
                  </ul>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
