"use client";

import { useEffect, useState } from "react";

export function PageLoader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Start fade-out after fonts + first paint settle
    const fadeTimer = window.setTimeout(() => setFading(true), 600);
    const hideTimer = window.setTimeout(() => setVisible(false), 1050);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #0f766e 100%)",
        opacity: fading ? 0 : 1,
        transition: "opacity 450ms cubic-bezier(0.4,0,0.2,1)",
        pointerEvents: fading ? "none" : "all",
      }}
    >
      {/* Ripple rings */}
      <div style={{ position: "relative", width: 90, height: 90, marginBottom: 32 }}>
        <span style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.25)",
          animation: "lo-ping 1.4s cubic-bezier(0,0,0.2,1) infinite",
        }} />
        <span style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.15)",
          animation: "lo-ping 1.4s cubic-bezier(0,0,0.2,1) infinite 0.35s",
        }} />
        {/* Spinner track */}
        <svg
          viewBox="0 0 90 90"
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            animation: "lo-spin 1s linear infinite",
          }}
        >
          <circle
            cx="45" cy="45" r="38"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="5"
          />
          <circle
            cx="45" cy="45" r="38"
            fill="none"
            stroke="#5eead4"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="60 180"
          />
        </svg>
        {/* Center dot */}
        <span style={{
          position: "absolute",
          inset: "50%",
          transform: "translate(-50%, -50%)",
          width: 14, height: 14,
          borderRadius: "50%",
          background: "#5eead4",
          boxShadow: "0 0 16px 4px rgba(94,234,212,0.5)",
        }} />
      </div>

      {/* Brand name */}
      <p style={{
        fontFamily: "var(--font-lora), serif",
        fontSize: "1.5rem",
        fontWeight: 600,
        color: "#ffffff",
        letterSpacing: "0.04em",
        animation: "lo-pulse 1.8s ease-in-out infinite",
      }}>
        LuminousOne
      </p>
      <p style={{
        marginTop: 6,
        fontSize: "0.75rem",
        color: "rgba(255,255,255,0.45)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}>
        Loading…
      </p>
    </div>
  );
}
