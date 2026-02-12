"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { LoadingState } from "@/components/LoadingState";
import { MainNav } from "@/components/MainNav";
import { apiFetch, resolveImageUrl } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { PagedResponse, Product } from "@/lib/types";

export default function ProductsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [products, setProducts] = useState<PagedResponse<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("size", "12");
    if (search.trim()) {
      params.set("search", search.trim());
    }

    apiFetch<PagedResponse<Product>>(`/api/products?${params.toString()}`)
      .then((response) => {
        if (alive) {
          setError(null);
          setProducts(response);
        }
      })
      .catch((err: unknown) => {
        if (alive) {
          setError(err instanceof Error ? err.message : "Unable to load products.");
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
  }, [page, search]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFeedback(null);
    setPage(0);
    setSearch(query);
  };

  const addToCart = async (productId: number) => {
    const session = getSession();
    if (!session) {
      router.push("/login?next=%2Fproducts");
      return;
    }

    try {
      await apiFetch("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId, quantity: 1 }),
      }, true);
      setFeedback("Product added to cart.");
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Failed to add product.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 pb-10">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <MainNav />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">Products</h1>
            <Link href="/cart" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Go to Cart
            </Link>
          </div>

          <form onSubmit={handleSearch} className="mb-5 flex flex-wrap gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600"
            />
            <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-600">
              Search
            </button>
          </form>

          {feedback && <p className="mb-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">{feedback}</p>}
          {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          {loading && <LoadingState label="Loading products..." />}

          {!loading && products && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.content.map((product) => (
                  <article key={product.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <img src={resolveImageUrl(product.imageUrl)} alt={product.name} className="h-44 w-full object-cover" />
                    <div className="space-y-2 p-4">
                      <h2 className="text-base font-semibold text-slate-900">{product.name}</h2>
                      <p className="text-sm text-slate-600">{product.description}</p>
                      <p className="text-sm text-slate-500">Stock: {product.stock}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-teal-700">${Number(product.price).toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => addToCart(product.id)}
                          className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-400"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={products.page <= 0}
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    setFeedback(null);
                    setPage((prev) => Math.max(0, prev - 1));
                  }}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-sm text-slate-700">
                  Page {products.page + 1} / {Math.max(products.totalPages, 1)}
                </span>
                <button
                  type="button"
                  disabled={products.page + 1 >= products.totalPages}
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    setFeedback(null);
                    setPage((prev) => prev + 1);
                  }}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
