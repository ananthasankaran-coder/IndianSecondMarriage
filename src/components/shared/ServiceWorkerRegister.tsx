"use client";

import { useEffect } from "react";

/** Registers the offline-fallback service worker in production only. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* Installability is a progressive enhancement; failure must never affect the app. */
    });
  }, []);
  return null;
}
