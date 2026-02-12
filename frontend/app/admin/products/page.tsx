"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { LoadingState } from "@/components/LoadingState";
import { MainNav } from "@/components/MainNav";
import { apiFetch, resolveImageUrl } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { usePolling } from "@/lib/usePolling";
import type { PagedResponse, Product } from "@/lib/types";

type ProductForm = {
  name: string;
  description: string;
  price: string;
  stock: string;
  imageUrl: string;
  active: boolean;
};

const defaultForm: ProductForm = {
  name: "",
  description: "",
  price: "0.00",
  stock: "0",
  imageUrl: "",
  active: true,
};

export default function AdminProductsPage() {
  const { loading: guardLoading, session } = useAuthGuard("ROLE_ADMIN");
  const sessionId = session?.userId;
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(
    async (showLoader: boolean) => {
      if (showLoader) {
        setLoading(true);
      }
      try {
        const response = await apiFetch<PagedResponse<Product>>("/api/admin/products?page=0&size=200", {}, true);
        setError(null);
        setProducts(response.content);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unable to load products.");
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
      void loadProducts(true);
    }
  }, [guardLoading, loadProducts, sessionId]);

  usePolling(() => loadProducts(false), 5000, Boolean(sessionId) && !submitting && editingId === null);

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      stock: Number(form.stock),
      imageUrl: form.imageUrl,
      active: form.active,
    };

    try {
      if (editingId) {
        await apiFetch(`/api/admin/products/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        }, true);
      } else {
        await apiFetch("/api/admin/products", {
          method: "POST",
          body: JSON.stringify(payload),
        }, true);
      }
      setForm(defaultForm);
      setEditingId(null);
      await loadProducts(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to save product.");
    } finally {
      setSubmitting(false);
    }
  };

  const editProduct = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description ?? "",
      price: String(product.price),
      stock: String(product.stock),
      imageUrl: product.imageUrl ?? "",
      active: product.active,
    });
  };

  const deleteProduct = async (id: number) => {
    try {
      await apiFetch(`/api/admin/products/${id}`, { method: "DELETE" }, true);
      await loadProducts(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to delete product.");
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
          <h1 className="text-2xl font-semibold text-slate-900">Admin Product Management</h1>
          <p className="mt-1 text-sm text-slate-600">Create, update, and deactivate products.</p>

          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <form onSubmit={submitForm} className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
            <input
              type="text"
              placeholder="Product name"
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Image URL (/uploads/... or full URL)"
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={form.imageUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
            />
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Price"
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              required
            />
            <input
              type="number"
              min="0"
              placeholder="Stock"
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={form.stock}
              onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
              required
            />
            <textarea
              placeholder="Description"
              className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
              Active
            </label>
            <div className="flex gap-2 md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving..." : editingId ? "Update Product" : "Create Product"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(defaultForm);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          {loading && <div className="mt-4"><LoadingState label="Loading products..." /></div>}

          {!loading && (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {products.map((product) => (
                <article key={product.id} className="overflow-hidden rounded-xl border border-slate-200">
                  <img src={resolveImageUrl(product.imageUrl)} alt={product.name} className="h-40 w-full object-cover" />
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-slate-900">{product.name}</h2>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${product.active ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                        {product.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">${Number(product.price).toFixed(2)} | Stock: {product.stock}</p>
                    <p className="text-sm text-slate-600">{product.description}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editProduct(product)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProduct(product.id)}
                        className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-500"
                      >
                        Deactivate
                      </button>
                    </div>
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
