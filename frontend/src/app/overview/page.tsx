"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { DashboardGrid } from "@/components/dashboard-grid";

// ── Sync trigger on first run ─────────────────────────────────────────────────
// Auto-starts a sync when no repo data exists yet and polls until data arrives.

function useSyncOnFirstRun() {
  const [ready, setReady] = useState<boolean | null>(null); // null = checking
  const syncStartedRef = useRef(false);

  // Initial check
  useEffect(() => {
    apiGet<{ total: number }>("/api/core/repos/summary")
      .then((s) => setReady((s?.total ?? 0) > 0))
      .catch(() => setReady(true)); // on error assume data is there, don't block
  }, []);

  // Auto-sync when no data
  useEffect(() => {
    if (ready !== false || syncStartedRef.current) return;
    syncStartedRef.current = true;

    apiPost("/api/core/sync/trigger", {}).catch(() => {});

    const poll = setInterval(async () => {
      try {
        const s = await apiGet<{ total: number }>("/api/core/repos/summary");
        if ((s?.total ?? 0) > 0) {
          clearInterval(poll);
          setReady(true);
        }
      } catch {
        // continue polling
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [ready]);

  return ready;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const ready = useSyncOnFirstRun();

  // Checking for data
  if (ready === null) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-md)",
          gap: "var(--space-3)",
        }}
      >
        <span style={{ animation: "pulse 1.5s infinite", fontSize: 24 }}>◈</span>
        Loading...
        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        `}</style>
      </div>
    );
  }

  // First-run sync in progress
  if (ready === false) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-3)",
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-md)",
        }}
      >
        <span style={{ animation: "pulse 1.5s infinite", fontSize: 24 }}>◈</span>
        Syncing repositories...
        <span style={{ fontSize: "var(--font-size-sm)", opacity: 0.7 }}>
          This may take a moment on first run.
        </span>
        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        `}</style>
      </div>
    );
  }

  return (
    <main style={{ flex: 1, padding: "var(--space-6)", overflowY: "auto" }}>
      <DashboardGrid />
    </main>
  );
}
