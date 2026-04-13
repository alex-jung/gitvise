"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { HealthBar } from "@/components/health-badge";
import { RelativeTime } from "@/components/ui/relative-time";

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

  useEffect(() => {
    apiGet<RepoSummary>("/api/core/repos/summary")
      .catch(() => null)
      .then((s) => {
        setSummary(s);
        setLoading(false);
      });
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await apiPost("/api/core/sync/trigger", {});
      await new Promise((r) => setTimeout(r, 3000));
      const s = await apiGet<RepoSummary>("/api/core/repos/summary");
      setSummary(s);
    } catch {
      // silent
    } finally {
      setSyncing(false);
    }
  };

  const noData = !loading && summary?.total === 0;

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

        {/* No data state */}
        {noData && (
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
              No repositories synced yet.
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
                cursor: syncing ? "not-allowed" : "pointer",
                opacity: syncing ? 0.6 : 1,
              }}
            >
              {syncing ? "Syncing..." : "Start first sync"}
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
