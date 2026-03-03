"use client";

const STORAGE_KEY = "lumi_wishlist";
const EVENT_NAME  = "wishlist:updated";

function read(): number[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as number[];
  } catch {
    return [];
  }
}

function write(ids: number[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function getWishlist(): number[] {
  return read();
}

export function isWishlisted(id: number): boolean {
  return read().includes(id);
}

/** Returns true if the item was added, false if it was removed. */
export function toggleWishlist(id: number): boolean {
  const list = read();
  const idx  = list.indexOf(id);
  if (idx === -1) {
    write([...list, id]);
    return true;
  }
  write(list.filter((x) => x !== id));
  return false;
}

export function getWishlistCount(): number {
  return read().length;
}

export function subscribeWishlist(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
