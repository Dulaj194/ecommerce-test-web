"use client";

const CART_UPDATED_EVENT = "cart:updated";

export function emitCartUpdated(totalItems: number) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<number>(CART_UPDATED_EVENT, {
      detail: totalItems,
    })
  );
}

export function subscribeCartUpdated(handler: (totalItems: number) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<number>;
    handler(customEvent.detail ?? 0);
  };

  window.addEventListener(CART_UPDATED_EVENT, listener);
  return () => window.removeEventListener(CART_UPDATED_EVENT, listener);
}
