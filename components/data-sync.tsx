"use client";

import { useEffect } from "react";
import { mutate } from "swr";

/**
 * Keeps every open page of the HR dashboard in sync with the shared Supabase
 * backend without a manual browser refresh.
 *
 * 1. When a change is saved (add worker, edit, leave, transfer, …) the
 *    employee-store dispatches an `hr-data-synced` window event AFTER the
 *    backend write completes. This component revalidates every mounted
 *    `/api/*` SWR key, so the table/chart counts update live.
 * 2. Because changes made elsewhere (CMaT app, another HR browser) still need
 *    to appear, it also refreshes when the tab regains focus and on a slow
 *    2-minute poll while the tab is visible.
 *
 * Note: the poll used to run every 30s, which made the whole dashboard visibly
 * re-render/blink every half minute. Saves still update the UI instantly via
 * step 1, so a slower poll is enough for the background case.
 */
const REVALIDATE_DELAY_MS = 250;
const POLL_INTERVAL_MS = 120_000;
// Ignore repeated sync events that arrive while a revalidation is in flight.
const MIN_GAP_MS = 1_500;

let lastRevalidateAt = 0;

function revalidateApiKeys() {
  const now = Date.now();
  if (now - lastRevalidateAt < MIN_GAP_MS) return Promise.resolve();
  lastRevalidateAt = now;
  return mutate(
    (key) => typeof key === "string" && key.startsWith("/api/"),
    undefined,
    { revalidate: true },
  );
}

export function DataSync() {
  useEffect(() => {
    const onSynced = () => {
      // Slight delay lets the backend upsert fully settle before re-reading.
      window.setTimeout(() => {
        void revalidateApiKeys();
      }, REVALIDATE_DELAY_MS);
    };

    // Coming back to the tab is the best moment to pick up other people's
    // changes — no need to poll aggressively while it sits in front of you.
    const onVisible = () => {
      if (document.visibilityState === "visible") void revalidateApiKeys();
    };

    window.addEventListener("hr-data-synced", onSynced);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    // Slow safety-net poll (only while the tab is visible).
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void revalidateApiKeys();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener("hr-data-synced", onSynced);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(poll);
    };
  }, []);

  return null;
}
