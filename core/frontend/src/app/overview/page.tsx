"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { HealthBar } from "@/components/health-badge";
import { RelativeTime } from "@/components/ui/relative-time";
import { log } from "@/lib/log";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RepoSummary {
  total: number;
  avgHealthScore: number;
  critical: number;
  stale: number;
  unprotected: number;
  lastSyncedAt: string | null;
  attentionRepos: AttentionRepo[];
}

interface AttentionRepo {
  fullName: string;
  name: string;
  healthScore: number;
  hasReadme: boolean;
  hasLicense: boolean;
  hasBranchProtection: boolean;
  daysSincePush: number | null;
  pushedAt: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const [summary, setSummary] = useState<RepoSummary | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const syncStartedRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    log.sync("fetching initial repo summary");
    apiGet<RepoSummary>("/api/core/repos/summary")
      .catch(() => null)
      .then((s) => {
        log.sync("summary loaded, total repos:", s?.total ?? 0);
        setSummary(s);
        setLoading(false);
      });
  }, []);

  // Auto-trigger sync and poll when no data exists after initial load
  const noData = !loading && (summary === null || summary.total === 0);

  useEffect(() => {
    if (!noData) return;
    if (syncStartedRef.current) return;
    syncStartedRef.current = true;
    setSyncing(true);

    log.sync("no repos found, triggering initial sync");
    apiPost("/api/core/sync/trigger", {}).catch(() => {});

    pollRef.current = setInterval(async () => {
      try {
        const s = await apiGet<RepoSummary>("/api/core/repos/summary");
        if (s && s.total > 0) {
          log.sync("sync complete, repos available:", s.total);
          clearInterval(pollRef.current!);
          setSummary(s);
          setSyncing(false);
        }
      } catch {
        // continue polling
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [noData]);

  const triggerSync = async () => {
    log.sync("manual sync triggered");
    setSyncing(true);
    try {
      await apiPost("/api/core/sync/trigger", {});
      await new Promise((r) => setTimeout(r, 3000));
      const s = await apiGet<RepoSummary>("/api/core/repos/summary");
      log.sync("manual sync complete, repos:", s?.total ?? 0);
      setSummary(s);
    } catch {
      // silent
    } finally {
      setSyncing(false);
    }
  };

  // Fullscreen loading while initial fetch is in progress
  if (loading) {
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
        Loading...
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }

  // Fullscreen syncing overlay while auto-sync runs on first start
  if (syncing && noData) {
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
        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", opacity: 0.7 }}>
          This may take a moment on first run.
        </span>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <main style={{ flex: 1, padding: "var(--space-6)", overflowY: "auto" }}>

        {/* Org Health Score */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
              Org Health Score
            </span>
            {loading ? (
              <span style={{ fontWeight: 700, fontSize: "var(--font-size-lg)", color: "var(--color-text-muted)" }}>—</span>
            ) : (
              <span style={{ fontWeight: 700, fontSize: "var(--font-size-lg)", color: "var(--color-text-primary)" }}>
                {summary?.avgHealthScore ?? 0}/100
              </span>
            )}
            {summary?.lastSyncedAt && (
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                · last sync: <RelativeTime value={summary.lastSyncedAt} />
              </span>
            )}
          </div>
          <div style={{ width: 280 }}>
            <HealthBar score={summary?.avgHealthScore ?? 0} />
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-8)", maxWidth: 700 }}>
          <StatCard
            value={loading ? "…" : String(summary?.total ?? 0)}
            label="Repositories"
            color="var(--color-text-primary)"
          />
          <StatCard
            value={loading ? "…" : String(summary?.critical ?? 0)}
            label="Critical (Score < 40)"
            color="var(--color-danger)"
          />
          <StatCard
            value={loading ? "…" : String(summary?.stale ?? 0)}
            label="Stale (> 30 days)"
            color="var(--color-warning)"
          />
          <StatCard
            value={loading ? "…" : String(summary?.unprotected ?? 0)}
            label="Unprotected"
            color="var(--color-warning)"
          />
        </div>

        {/* No data state – shown only if sync finished but still 0 repos (edge case) */}
        {noData && !syncing && (
          <div
            style={{
              padding: "var(--space-6)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              textAlign: "center",
              marginBottom: "var(--space-6)",
            }}
          >
            <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
              No repositories found. Check your GitHub organisation settings.
            </p>
            <button
              onClick={triggerSync}
              disabled={syncing}
              style={{
                padding: "var(--space-2) var(--space-5)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-primary)",
                color: "var(--color-text-inverse)",
                border: "none",
                fontSize: "var(--font-size-sm)",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              ↻ Retry sync
            </button>
          </div>
        )}

        {/* Attention Required */}
        {!noData && summary && summary.attentionRepos.length > 0 && (
          <div style={{ marginBottom: "var(--space-8)" }}>
            <h2
              style={{
                fontSize: "var(--font-size-sm)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--color-text-muted)",
                marginBottom: "var(--space-3)",
              }}
            >
              Attention Required
            </h2>
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                overflow: "hidden",
              }}
            >
              {summary.attentionRepos.map((repo, i) => (
                <div
                  key={repo.fullName}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-4)",
                    padding: "var(--space-3) var(--space-4)",
                    borderTop: i > 0 ? "1px solid var(--color-border-subtle)" : undefined,
                  }}
                >
                  <span style={{ fontWeight: 500, width: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text-primary)" }}>
                    {repo.name}
                  </span>
                  <div style={{ flex: 1 }}>
                    <HealthBar score={repo.healthScore} />
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)", fontSize: "var(--font-size-xs)" }}>
                    {!repo.hasReadme && <Tag label="No README" />}
                    {!repo.hasLicense && <Tag label="No License" />}
                    {!repo.hasBranchProtection && <Tag label="Unprotected" />}
                    {(repo.daysSincePush ?? 0) > 30 && <Tag label="Stale" />}
                  </div>
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                    <RelativeTime value={repo.pushedAt} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        {!loading && summary && summary.total > 0 && (
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <button
              onClick={triggerSync}
              disabled={syncing}
              style={{
                padding: "var(--space-2) var(--space-4)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "transparent",
                color: "var(--color-text-muted)",
                fontSize: "var(--font-size-sm)",
                cursor: syncing ? "not-allowed" : "pointer",
                opacity: syncing ? 0.6 : 1,
              }}
            >
              {syncing ? "Syncing..." : "↻ Sync now"}
            </button>
          </div>
        )}
      </main>
    </>
  );
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-4)",
      }}
    >
      <div style={{ fontSize: "var(--font-size-2xl, 1.75rem)", fontWeight: 700, color, marginBottom: "var(--space-1)" }}>
        {value}
      </div>
      <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>{label}</div>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span
      style={{
        padding: "1px 5px",
        borderRadius: "var(--radius-full)",
        background: "rgba(239,68,68,0.15)",
        color: "var(--color-danger)",
        fontSize: "var(--font-size-xs)",
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
