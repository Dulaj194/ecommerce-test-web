"use client";

import { useEffect, useState } from "react";

const MSGS = [
  { icon: "🚚", text: "Free shipping on all orders over $50 — No code needed" },
  { icon: "🎉", text: "New arrivals just dropped — Explore the latest collection" },
  { icon: "📞", text: "Customer support: +94 77 000 0000 · Mon–Sat, 9am–6pm" },
  { icon: "🔒", text: "Secure checkout · Easy 30-day returns · 24/7 support" },
];

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);
  const [idx, setIdx]             = useState(0);
  const [fade, setFade]           = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % MSGS.length);
        setFade(true);
      }, 280);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  if (dismissed) return null;

  const msg = MSGS[idx];

  return (
    <div
      style={{
        background: "linear-gradient(90deg,#0f172a 0%,#134e4a 55%,#0d9488 100%)",
        color: "#e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: "0.45rem 3.5rem",
        fontSize: "0.78rem",
        fontWeight: 500,
        letterSpacing: "0.01em",
        minHeight: 38,
        overflow: "hidden",
      }}
    >
      {/* slide indicator dots */}
      <div
        style={{
          position: "absolute",
          left: "1.25rem",
          display: "flex",
          gap: "0.3rem",
          alignItems: "center",
        }}
      >
        {MSGS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`Announcement ${i + 1}`}
            style={{
              width: i === idx ? 22 : 6,
              height: 6,
              borderRadius: 99,
              background: i === idx ? "#ffffff" : "rgba(255,255,255,0.28)",
              border: "none",
              padding: 0,
              cursor: "pointer",
              transition: "width 0.35s ease, background 0.35s ease",
            }}
          />
        ))}
      </div>

      {/* message */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          textAlign: "center",
          opacity: fade ? 1 : 0,
          transform: fade ? "translateY(0)" : "translateY(4px)",
          transition: "opacity 0.28s ease, transform 0.28s ease",
          pointerEvents: "none",
        }}
      >
        <span>{msg.icon}</span>
        <span>{msg.text}</span>
      </span>

      {/* dismiss */}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        style={{
          position: "absolute",
          right: "0.875rem",
          background: "none",
          border: "none",
          color: "rgba(148,163,184,0.9)",
          cursor: "pointer",
          fontSize: "1.15rem",
          lineHeight: 1,
          padding: "0.25rem 0.375rem",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(148,163,184,0.9)")}
      >
        ×
      </button>
    </div>
  );
}
