"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { LoadingState } from "@/components/LoadingState";
import { MainNav } from "@/components/MainNav";
import { apiFetch, resolveImageUrl } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";
import type { Banner } from "@/lib/types";

type BannerDraft = {
  title: string;
  sortOrder: number;
  active: boolean;
};

export default function AdminBannersPage() {
  const { loading: guardLoading, session } = useAuthGuard("ROLE_ADMIN");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [drafts, setDrafts] = useState<Record<number, BannerDraft>>({});
  const [title, setTitle] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [active, setActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncDrafts = (items: Banner[]) => {
    const nextDrafts: Record<number, BannerDraft> = {};
    items.forEach((banner) => {
      nextDrafts[banner.id] = {
        title: banner.title,
        sortOrder: banner.sortOrder,
        active: banner.active,
      };
    });
    setDrafts(nextDrafts);
  };

  const loadBanners = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<Banner[]>("/api/admin/banners", {}, true);
      setBanners(response);
      syncDrafts(response);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load banners.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!guardLoading && session) {
      loadBanners();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardLoading, session?.userId]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError("Select an image file first.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("sortOrder", String(sortOrder));
      formData.append("active", String(active));
      formData.append("image", file);
      await apiFetch("/api/admin/banners", { method: "POST", body: formData }, true);
      setTitle("");
      setSortOrder(0);
      setActive(true);
      setFile(null);
      await loadBanners();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to upload banner.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateBanner = async (bannerId: number) => {
    const draft = drafts[bannerId];
    if (!draft) {
      return;
    }
    try {
      await apiFetch(`/api/admin/banners/${bannerId}`, {
        method: "PUT",
        body: JSON.stringify(draft),
      }, true);
      await loadBanners();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to update banner.");
    }
  };

  const deleteBanner = async (bannerId: number) => {
    try {
      await apiFetch(`/api/admin/banners/${bannerId}`, { method: "DELETE" }, true);
      await loadBanners();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to delete banner.");
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
          <h1 className="text-2xl font-semibold text-slate-900">Admin Banner Management</h1>
          <p className="mt-1 text-sm text-slate-600">Upload and control home page slider banners.</p>

          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <form onSubmit={handleCreate} className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
            <input
              type="text"
              placeholder="Banner title"
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <input
              type="number"
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 md:col-span-2"
              required
            />
            <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Active banner
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-fit rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
            >
              {submitting ? "Uploading..." : "Upload Banner"}
            </button>
          </form>

          {loading && <div className="mt-4"><LoadingState label="Loading banners..." /></div>}

          {!loading && (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {banners.map((banner) => {
                const draft = drafts[banner.id];
                if (!draft) {
                  return null;
                }
                return (
                  <article key={banner.id} className="overflow-hidden rounded-xl border border-slate-200">
                    <img src={resolveImageUrl(banner.imageUrl)} alt={banner.title} className="h-40 w-full object-cover" />
                    <div className="space-y-2 p-4">
                      <input
                        type="text"
                        value={draft.title}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [banner.id]: { ...prev[banner.id], title: e.target.value },
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={draft.sortOrder}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [banner.id]: { ...prev[banner.id], sortOrder: Number(e.target.value) },
                            }))
                          }
                          className="w-24 rounded-md border border-slate-300 px-2 py-1.5"
                        />
                        <label className="flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            checked={draft.active}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [banner.id]: { ...prev[banner.id], active: e.target.checked },
                              }))
                            }
                          />
                          Active
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateBanner(banner.id)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBanner(banner.id)}
                          className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-500"
                        >
                          Delete
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
