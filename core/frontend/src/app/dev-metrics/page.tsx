"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { LineChart, BarChart } from "@/components/ui";
import type { LineChartSeries, BarChartSeries } from "@/components/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Summary {
  avgCycleTimeHours: number | null;
  mergeRate: number | null;
  totalMerged: number;
  totalClosed: number;
  topCommitter: string | null;
}

interface LeaderboardRow {
  login: string;
  displayName: string;
  commits: number;
  prsOpened: number;
  prsMerged: number;
  avgCycleTimeHours: number | null;
}

interface TrendPoint { week: string; avgHours: number | null }

const DAYS = 30;
const WEEKS = 8;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtHours(h: number | null): string {
  if (h === null) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${Math.round(h)}h`;
  const d = Math.floor(h / 24);
  const rem = Math.round(h % 24);
  return rem > 0 ? `${d}d ${rem}h` : `${d}d`;
}

function StatPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "var(--space-3) var(--space-5)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", minWidth: 110 }}>
      <span style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: color ?? "var(--color-text-primary)" }}>{value}</span>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 2, textAlign: "center" }}>{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DevMetricsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sum, lb, tr] = await Promise.all([
        apiGet<Summary>(`/api/core/dev/summary?days=${DAYS}`),
        apiGet<LeaderboardRow[]>(`/api/core/dev/leaderboard?days=${DAYS}&limit=50`),
        apiGet<TrendPoint[]>(`/api/core/dev/cycle-time-trend?weeks=${WEEKS}`),
      ]);
      setSummary(sum);
      setLeaderboard(lb);
      setTrend(tr);
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

  const trendSeries: LineChartSeries[] = [{
    label: "Avg cycle time (h)",
    data: trend.map((d) => d.avgHours ?? 0),
    color: "var(--color-primary)",
  }];
  const trendLabels = trend.map((d) => d.week);
  const hasTrend = trend.some((d) => d.avgHours !== null);

  const topCommitters = useMemo(() => leaderboard.filter((r) => r.commits > 0).slice(0, 10), [leaderboard]);
  const commitSeries: BarChartSeries[] = [{
    label: "Commits",
    data: topCommitters.map((r) => r.commits),
    color: "var(--color-primary)",
  }];
  const commitLabels = topCommitters.map((r) => r.displayName.split(" ")[0] ?? r.login);

  const maxCommits = Math.max(...leaderboard.map((r) => r.commits), 1);

  const cycleColor = (h: number | null) =>
    h === null ? "var(--color-text-muted)" :
    h <= 24 ? "var(--color-success)" :
    h <= 72 ? "var(--color-warning)" : "var(--color-danger)";

  const rateColor = (r: number | null) =>
    r === null ? "var(--color-text-primary)" :
    r >= 80 ? "var(--color-success)" :
    r >= 60 ? "var(--color-warning)" : "var(--color-danger)";

  return (
    <main style={{ flex: 1, padding: "var(--space-6)", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>Developer Metrics</h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", margin: "var(--space-1) 0 0" }}>
            PR cycle time, merge rate &amp; commit leaderboard · last {DAYS} days
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
          <StatPill label="Avg cycle time" value={fmtHours(summary.avgCycleTimeHours)} color={cycleColor(summary.avgCycleTimeHours)} />
          <StatPill label="Merge rate" value={summary.mergeRate !== null ? `${summary.mergeRate}%` : "—"} color={rateColor(summary.mergeRate)} />
          <StatPill label="PRs merged" value={summary.totalMerged} color="var(--color-success)" />
          <StatPill label="PRs closed w/o merge" value={summary.totalClosed - summary.totalMerged} />
          {summary.topCommitter && <StatPill label="Top committer" value={summary.topCommitter} />}
        </div>
      )}

      {loading ? (
        <LoadingState rows={8} />
      ) : summary?.totalMerged === 0 && leaderboard.length === 0 ? (
        <EmptyState icon="⚡" title="No data yet" description="No merged PR or commit data found. Click Sync to fetch developer activity." />
      ) : (
        <>
          {/* Cycle time trend + Top committers */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-5)", marginBottom: "var(--space-6)" }}>
            {/* Trend */}
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, margin: "0 0 var(--space-4)", color: "var(--color-text-primary)" }}>
                PR Cycle Time Trend
              </h2>
              {hasTrend ? (
                <LineChart
                  series={trendSeries}
                  labels={trendLabels}
                  height={160}
                  showLegend={false}
                  filled
                  showDots
                  formatY={fmtHours}
                />
              ) : (
                <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-8)" }}>No merged PRs yet</div>
              )}
            </div>

            {/* Top committers bar */}
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, margin: "0 0 var(--space-4)", color: "var(--color-text-primary)" }}>
                Top Committers
              </h2>
              {topCommitters.length === 0 ? (
                <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-6)" }}>No data</div>
              ) : (
                <BarChart series={commitSeries} labels={commitLabels} height={160} showLegend={false} gridLines={4} />
              )}
            </div>
          </div>

          {/* Developer leaderboard */}
          <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, margin: "0 0 var(--space-3)", color: "var(--color-text-primary)" }}>
            Developer Leaderboard
          </h2>
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>#</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Developer</th>
                  <th style={{ textAlign: "right", padding: "var(--space-3) var(--space-4)" }}>Commits</th>
                  <th style={{ textAlign: "right", padding: "var(--space-3) var(--space-4)" }}>PRs opened</th>
                  <th style={{ textAlign: "right", padding: "var(--space-3) var(--space-4)" }}>PRs merged</th>
                  <th style={{ textAlign: "right", padding: "var(--space-3) var(--space-4)" }}>Avg cycle</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((r, idx) => (
                  <tr key={r.login} style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
                    <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", width: 36 }}>{idx + 1}</td>
                    <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                      <div style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{r.displayName}</div>
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontFamily: "monospace" }}>{r.login}</div>
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--space-2)" }}>
                        <div style={{ width: 60, height: 4, borderRadius: 2, background: "var(--color-border)", overflow: "hidden" }}>
                          <div style={{ width: `${(r.commits / maxCommits) * 100}%`, height: "100%", background: "var(--color-primary)", borderRadius: 2 }} />
                        </div>
                        <span style={{ fontWeight: 600, color: "var(--color-text-primary)", minWidth: 28, textAlign: "right" }}>{r.commits}</span>
                      </div>
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right", color: "var(--color-text-muted)" }}>{r.prsOpened}</td>
                    <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right", color: r.prsMerged > 0 ? "var(--color-success)" : "var(--color-text-muted)", fontWeight: r.prsMerged > 0 ? 600 : 400 }}>
                      {r.prsMerged}
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right", color: cycleColor(r.avgCycleTimeHours), fontSize: "var(--font-size-xs)", fontFamily: "monospace" }}>
                      {fmtHours(r.avgCycleTimeHours)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
