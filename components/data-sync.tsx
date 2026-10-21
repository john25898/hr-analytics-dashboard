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
// Ignore repeated *background* sync events that arrive while a revalidation is
// in flight. This used to be 1.5s, which let an embedded browser (VS Code
// webview, or any iframe) re-fetch /api/employees + /api/analytics on every
// single click, since such browsers fire a `focus` event on each interaction.
// 60s is enough to pick up other people's edits without the dashboard
// appearing to "refresh" itself.
//
// Saves made by THIS user must not be throttled (see `force`), otherwise the
// employee count stayed stale after adding a worker for up to a minute.
const MIN_GAP_MS = 60_000;

let lastRevalidateAt = 0;

function revalidateApiKeys(force = false) {
  const now = Date.now();
  if (!force && now - lastRevalidateAt < MIN_GAP_MS) return Promise.resolve();
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
      // Forced: this is a change the user just made, so it must show up now.
      window.setTimeout(() => {
        void revalidateApiKeys(true);
      }, REVALIDATE_DELAY_MS);
    };

    // Coming back to the tab is the best moment to pick up other people's
    // changes — no need to poll aggressively while it sits in front of you.
    // NOTE: deliberately no `focus` listener. Embedded browsers fire `focus`
    // on every click into the frame, which made the whole dashboard re-fetch
    // (and visibly redraw) constantly.
    const onVisible = () => {
      if (document.visibilityState === "visible") void revalidateApiKeys();
    };

    window.addEventListener("hr-data-synced", onSynced);
    document.addEventListener("visibilitychange", onVisible);

    // Slow safety-net poll (only while the tab is visible).
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void revalidateApiKeys();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener("hr-data-synced", onSynced);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(poll);
    };
  }, []);

  return null;
}
