"use client";

import { useEffect } from "react";

/**
 * Registers the static-asset service worker in production builds only.
 * Skipped in dev so Turbopack/HMR is never shadowed.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* SW is a progressive enhancement; ignore failures */
    });
  }, []);
  return null;
}
