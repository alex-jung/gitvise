"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { RelativeTime } from "@/components/ui/relative-time";
import { LineChart } from "@/components/ui";
import type { LineChartSeries } from "@/components/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Summary {
  total: number;
  success: number;
  failure: number;
  cancelled: number;
  inProgress: number;
  successRate: number;
  avgDurationSeconds: number;
  lastSyncedAt: string | null;
}

interface Run {
  repoFullName: string;
  workflowName: string;
  branch: string | null;
  status: string;
  conclusion: string | null;
  event: string | null;
  durationSeconds: number | null;
  createdAt: string | null;
}

interface FailingRow {
  repoFullName: string;
  workflowName: string;
  total: number;
  failures: number;
  lastConclusion: string | null;
  lastRunAt: string | null;
}

interface TrendPoint { date: string; avgSeconds: number }

type RunFilter = "all" | "success" | "failure" | "cancelled";
const DAYS = 14;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(s: number | null): string {
  if (s === null || s === 0) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}

function ConclusionBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  const label = status === "in_progress" ? "running" : status === "queued" ? "queued" : (conclusion ?? "—");
  const color =
    label === "success"   ? "var(--color-success)" :
    label === "failure"   ? "var(--color-danger)"  :
    label === "running"   ? "var(--color-primary)"  :
    label === "cancelled" ? "var(--color-warning)"  :
    "var(--color-text-muted)";
  return (
    <span style={{ fontSize: "var(--font-size-xs)", padding: "1px 7px", borderRadius: "var(--radius-full)", background: `color-mix(in srgb, ${color} 15%, transparent)`, color, fontWeight: 500 }}>
      {label}
    </span>
  );
}

function StatPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "var(--space-3) var(--space-5)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", minWidth: 90 }}>
      <span style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: color ?? "var(--color-text-primary)" }}>{value}</span>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CiCdPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [failing, setFailing] = useState<FailingRow[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [runFilter, setRunFilter] = useState<RunFilter>("all");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sum, runList, failList, trendList] = await Promise.all([
        apiGet<Summary>(`/api/core/ci/summary?days=${DAYS}`),
        apiGet<Run[]>(`/api/core/ci/runs?days=${DAYS}&limit=500`),
        apiGet<FailingRow[]>(`/api/core/ci/failing?days=${DAYS}`),
        apiGet<TrendPoint[]>(`/api/core/ci/duration-trend?days=${DAYS}`),
      ]);
      setSummary(sum);
      setRuns(runList);
      setFailing(failList);
      setTrend(trendList);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await apiPost("/api/core/sync/trigger", {});
      await new Promise((r) => setTimeout(r, 3000));
      await fetchAll();
    } finally {
      setSyncing(false);
    }
  };

  const filteredRuns = useMemo(() => {
    switch (runFilter) {
      case "success":   return runs.filter((r) => r.conclusion === "success");
      case "failure":   return runs.filter((r) => r.conclusion === "failure");
      case "cancelled": return runs.filter((r) => r.conclusion === "cancelled" || r.conclusion === "timed_out");
      default:          return runs;
    }
  }, [runs, runFilter]);

  const trendSeries: LineChartSeries[] = [{
    label: "Avg duration (min)",
    data: trend.map((p) => Math.round(p.avgSeconds / 60)),
    color: "var(--color-primary)",
  }];
  const trendLabels = trend.map((p) => p.date);

  const rateColor = !summary ? "var(--color-text-primary)" :
    summary.successRate >= 90 ? "var(--color-success)" :
    summary.successRate >= 70 ? "var(--color-warning)" : "var(--color-danger)";

  const runTabs = [
    { value: "all" as RunFilter,       label: "All",       count: runs.length },
    { value: "success" as RunFilter,   label: "Success",   count: runs.filter((r) => r.conclusion === "success").length },
    { value: "failure" as RunFilter,   label: "Failed",    count: runs.filter((r) => r.conclusion === "failure").length },
    { value: "cancelled" as RunFilter, label: "Cancelled", count: runs.filter((r) => r.conclusion === "cancelled" || r.conclusion === "timed_out").length },
  ];

  return (
    <main style={{ flex: 1, padding: "var(--space-6)", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>CI/CD &amp; Actions</h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", margin: "var(--space-1) 0 0" }}>
            Workflow runs across all repositories · last {DAYS} days
          </p>
        </div>
        <button
          onClick={triggerSync}
          disabled={syncing}
          style={{ padding: "var(--space-2) var(--space-4)", borderRadius: "var(--radius-md)", background: "var(--color-primary)", color: "var(--color-text-inverse)", border: "none", fontSize: "var(--font-size-sm)", fontWeight: 500, cursor: syncing ? "not-allowed" : "pointer", opacity: syncing ? 0.6 : 1 }}
        >
          {syncing ? "Syncing..." : "↻ Sync"}
        </button>
      </div>

      {/* Stat pills */}
      {!loading && summary && (
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
          <StatPill label="Success rate" value={`${summary.successRate}%`} color={rateColor} />
          <StatPill label="Total runs" value={summary.total} />
          <StatPill label="Success" value={summary.success} color="var(--color-success)" />
          <StatPill label="Failed" value={summary.failure} color={summary.failure > 0 ? "var(--color-danger)" : undefined} />
          <StatPill label="Running" value={summary.inProgress} color={summary.inProgress > 0 ? "var(--color-primary)" : undefined} />
          <StatPill label="Avg duration" value={fmtDuration(summary.avgDurationSeconds)} />
        </div>
      )}

      {loading ? (
        <LoadingState rows={8} />
      ) : summary?.total === 0 ? (
        <EmptyState icon="⚙" title="No workflow runs" description="No GitHub Actions runs found in the last 14 days." />
      ) : (
        <>
          {/* Duration trend + Failing workflows side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-5)", marginBottom: "var(--space-6)" }}>
            {/* Duration trend */}
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, margin: "0 0 var(--space-4)", color: "var(--color-text-primary)" }}>
                Avg Run Duration
              </h2>
              {trend.some((p) => p.avgSeconds > 0) ? (
                <LineChart labels={trendLabels} series={trendSeries} filled showLegend={false} formatY={(v) => `${v}m`} />
              ) : (
                <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-8)" }}>No data</div>
              )}
            </div>

            {/* Failing workflows */}
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, margin: "0 0 var(--space-4)", color: "var(--color-text-primary)" }}>
                Failing Workflows
              </h2>
              {failing.length === 0 ? (
                <div style={{ color: "var(--color-success)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-6)" }}>✓ No failures</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {failing.slice(0, 8).map((f) => (
                    <div key={`${f.repoFullName}:${f.workflowName}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-2) var(--space-3)", borderRadius: "var(--radius-md)", background: "color-mix(in srgb, var(--color-danger) 6%, transparent)" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.workflowName}</div>
                        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.repoFullName}</div>
                      </div>
                      <span style={{ flexShrink: 0, fontWeight: 700, color: "var(--color-danger)", fontSize: "var(--font-size-sm)", marginLeft: "var(--space-3)" }}>
                        {f.failures}✕
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Run history */}
          <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, margin: "0 0 var(--space-3)", color: "var(--color-text-primary)" }}>
            Run History
          </h2>
          <div style={{ marginBottom: "var(--space-4)" }}>
            <Tabs tabs={runTabs} active={runFilter} onChange={setRunFilter} />
          </div>
          {filteredRuns.length === 0 ? (
            <EmptyState icon="⚙" title="No runs" description="No runs match this filter." />
          ) : (
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Repository</th>
                    <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Workflow</th>
                    <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Branch</th>
                    <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Trigger</th>
                    <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Status</th>
                    <th style={{ textAlign: "right", padding: "var(--space-3) var(--space-4)" }}>Duration</th>
                    <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRuns.map((r, i) => (
                    <tr key={`${r.repoFullName}:${r.workflowName}:${r.createdAt}:${i}`} style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
                      <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{r.repoFullName}</span>
                      </td>
                      <td style={{ padding: "var(--space-3) var(--space-4)", fontWeight: 500, color: "var(--color-text-primary)" }}>{r.workflowName}</td>
                      <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{r.branch ?? "—"}</span>
                      </td>
                      <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>{r.event ?? "—"}</td>
                      <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                        <ConclusionBadge status={r.status} conclusion={r.conclusion} />
                      </td>
                      <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                        {fmtDuration(r.durationSeconds)}
                      </td>
                      <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                        <RelativeTime value={r.createdAt} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
