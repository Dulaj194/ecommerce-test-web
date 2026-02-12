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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
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

    const parsedPrice = Number.parseFloat(form.price);
    const parsedStock = Number.parseInt(form.stock, 10);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0.01) {
      setError("Price must be a valid number greater than 0.00.");
      setSubmitting(false);
      return;
    }

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      setError("Stock must be a valid whole number 0 or greater.");
      setSubmitting(false);
      return;
    }

    if (imageFiles.length > 5) {
      setError("Maximum 5 product images are allowed.");
      setSubmitting(false);
      return;
    }

    if (!editingId && imageFiles.length === 0 && !form.imageUrl.trim()) {
      setError("Upload at least one product image or provide an image URL.");
      setSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("description", form.description);
    formData.append("price", String(parsedPrice));
    formData.append("stock", String(parsedStock));
    formData.append("active", String(form.active));
    if (form.imageUrl.trim()) {
      formData.append("imageUrl", form.imageUrl.trim());
    }
    imageFiles.forEach((file) => {
      formData.append("images", file);
    });

    try {
      if (editingId) {
        await apiFetch(`/api/admin/products/${editingId}`, {
          method: "PUT",
          body: formData,
        }, true);
      } else {
        await apiFetch("/api/admin/products", {
          method: "POST",
          body: formData,
        }, true);
      }
      setForm(defaultForm);
      setImageFiles([]);
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
    const imageUrls = (product.imageUrls ?? []).length > 0
      ? product.imageUrls
      : product.imageUrl
        ? [product.imageUrl]
        : [];
    setForm({
      name: product.name,
      description: product.description ?? "",
      price: String(product.price),
      stock: String(product.stock),
      imageUrl: imageUrls[0] ?? "",
      active: product.active,
    });
    setImageFiles([]);
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
              placeholder="Primary image URL (optional)"
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
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="productImages">
                Product Images (max 5)
              </label>
              <input
                id="productImages"
                type="file"
                multiple
                accept="image/*"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length > 5) {
                    setError("Maximum 5 product images are allowed.");
                    setImageFiles(files.slice(0, 5));
                    return;
                  }
                  setError(null);
                  setImageFiles(files);
                }}
              />
              <p className="mt-1 text-xs text-slate-500">
                Upload between 1 and 5 images. On edit, uploading new files replaces current product photos.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
              Active
            </label>
            {imageFiles.length > 0 && (
              <p className="text-xs text-slate-600 md:col-span-2">
                Selected files: {imageFiles.map((file) => file.name).join(", ")}
              </p>
            )}
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
                    setImageFiles([]);
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
              {products.map((product) => {
                const photos = (product.imageUrls ?? []).length > 0
                  ? product.imageUrls
                  : product.imageUrl
                    ? [product.imageUrl]
                    : [];

                return (
                  <article key={product.id} className="overflow-hidden rounded-xl border border-slate-200">
                    <img
                      src={resolveImageUrl(photos[0])}
                      alt={product.name}
                      className="h-40 w-full object-cover"
                    />
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-slate-900">{product.name}</h2>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${product.active ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                          {product.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">${Number(product.price).toFixed(2)} | Stock: {product.stock}</p>
                      <p className="text-sm text-slate-500">Photos: {photos.length}/5</p>
                      {photos.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                          {photos.slice(0, 5).map((url, index) => (
                            <img
                              key={`${product.id}-${index}`}
                              src={resolveImageUrl(url)}
                              alt={`${product.name} ${index + 1}`}
                              className="h-12 w-12 rounded-md border border-slate-200 object-cover"
                            />
                          ))}
                        </div>
                      )}
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
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
