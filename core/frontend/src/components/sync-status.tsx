"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api";

interface SyncStatusData {
  status: "idle" | "syncing" | "error";
  lastSync: string | null;
  error: string | null;
}

function formatRelative(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function SyncStatus() {
  const [data, setData] = useState<SyncStatusData | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const status = await apiGet<SyncStatusData>("/api/core/sync/status");
        setData(status);
      } catch {
        // backend not reachable yet
      }
    };
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dotColor =
    !data || data.status === "idle"
      ? data?.lastSync
        ? (Date.now() - new Date(data.lastSync).getTime()) / 1000 > 900
          ? "var(--color-warning)"
          : "var(--color-success)"
        : "var(--color-muted)"
      : data.status === "syncing"
      ? "var(--color-info)"
      : "var(--color-danger)";

  const label =
    !data
      ? "—"
      : data.status === "syncing"
      ? "Syncing..."
      : data.status === "error"
      ? "Sync failed"
      : data.lastSync
      ? `Synced ${formatRelative(data.lastSync)}`
      : "Never synced";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-sm)",
          padding: "var(--space-2)",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "var(--radius-full)",
            background: dotColor,
            display: "inline-block",
            animation: data?.status === "syncing" ? "pulse 1.5s infinite" : "none",
          }}
        />
        <span className="hidden sm:inline">{label}</span>
      </button>

      {open && data && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + var(--space-2))",
            right: 0,
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-4)",
            boxShadow: "var(--shadow-md)",
            minWidth: 220,
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
          }}
        >
          <div style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>
            Sync Status
          </div>
          <div>Status: {data.status}</div>
          {data.lastSync && <div>Last sync: {new Date(data.lastSync).toLocaleString("en")}</div>}
          {data.error && <div style={{ color: "var(--color-danger)" }}>Error: {data.error}</div>}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
