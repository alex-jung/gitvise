"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { RelativeTime } from "@/components/ui/relative-time";
import { BarChart } from "@/components/ui";
import type { BarChartSeries } from "@/components/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Summary {
  activeContributors: number;
  totalCommits: number;
  newContributors: number;
  avgCommitsPerDay: number;
  lastSyncedAt: string | null;
}

interface Contributor {
  login: string;
  displayName: string;
  commits: number;
  isNew: boolean;
  firstCommitAt: string | null;
}

interface DayPoint { date: string; commits: number }

interface HeatmapData {
  data: number[][];
  colLabels: string[];
  rowLabels: string[];
}

const DAYS = 30;
const HEATMAP_WEEKS = 12;

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "var(--space-3) var(--space-5)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", minWidth: 100 }}>
      <span style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: color ?? "var(--color-text-primary)" }}>{value}</span>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 2, textAlign: "center" }}>{label}</span>
    </div>
  );
}

function cellColor(value: number, max: number): string {
  if (value === 0 || max === 0) return "var(--color-border)";
  const intensity = Math.min(value / max, 1);
  if (intensity > 0.75) return "var(--color-primary)";
  if (intensity > 0.5)  return "color-mix(in srgb, var(--color-primary) 75%, transparent)";
  if (intensity > 0.25) return "color-mix(in srgb, var(--color-primary) 45%, transparent)";
  return "color-mix(in srgb, var(--color-primary) 20%, transparent)";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [activity, setActivity] = useState<DayPoint[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sum, contribs, act, heat] = await Promise.all([
        apiGet<Summary>(`/api/core/team/summary?days=${DAYS}`),
        apiGet<Contributor[]>(`/api/core/team/contributors?days=${DAYS}&limit=20`),
        apiGet<DayPoint[]>(`/api/core/team/commit-activity?days=${DAYS}`),
        apiGet<HeatmapData>(`/api/core/team/heatmap?weeks=${HEATMAP_WEEKS}`),
      ]);
      setSummary(sum);
      setContributors(contribs);
      setActivity(act);
      setHeatmap(heat);
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

  const activitySeries: BarChartSeries[] = [{
    label: "Commits",
    data: activity.map((d) => d.commits),
    color: "var(--color-primary)",
  }];
  const activityLabels = activity.map((d) => d.date);

  const heatmapMax = useMemo(
    () => heatmap ? Math.max(...heatmap.data.flatMap((row) => row)) : 0,
    [heatmap]
  );

  const labelStep = heatmap ? Math.max(1, Math.floor(heatmap.colLabels.length / 6)) : 1;

  return (
    <main style={{ flex: 1, padding: "var(--space-6)", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>Team &amp; Activity</h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", margin: "var(--space-1) 0 0" }}>
            Contributor activity &amp; commit trends · last {DAYS} days
            {summary?.lastSyncedAt && (
              <> · synced <RelativeTime value={summary.lastSyncedAt} /></>
            )}
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
          <StatPill label="Active contributors" value={summary.activeContributors} color="var(--color-primary)" />
          <StatPill label="Total commits" value={summary.totalCommits} />
          <StatPill label="New contributors" value={summary.newContributors} color={summary.newContributors > 0 ? "var(--color-success)" : undefined} />
          <StatPill label="Avg commits / day" value={summary.avgCommitsPerDay} />
        </div>
      )}

      {loading ? (
        <LoadingState rows={8} />
      ) : summary?.totalCommits === 0 ? (
        <EmptyState icon="◉" title="No commits found" description="No commit data has been synced yet. Click Sync to fetch activity." />
      ) : (
        <>
          {/* Commit activity chart + top contributors */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-5)", marginBottom: "var(--space-6)" }}>
            {/* Activity chart */}
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, margin: "0 0 var(--space-4)", color: "var(--color-text-primary)" }}>
                Commit Activity
              </h2>
              {activity.some((d) => d.commits > 0) ? (
                <BarChart series={activitySeries} labels={activityLabels} height={160} showLegend={false} gridLines={4} />
              ) : (
                <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-8)" }}>No data</div>
              )}
            </div>

            {/* Top contributors */}
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-5)" }}>
              <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, margin: "0 0 var(--space-4)", color: "var(--color-text-primary)" }}>
                Top Contributors
              </h2>
              {contributors.length === 0 ? (
                <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-6)" }}>No data</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {contributors.slice(0, 8).map((c) => (
                    <div key={c.login} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                          <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.displayName}
                          </span>
                          {c.isNew && (
                            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: "var(--radius-full)", background: "color-mix(in srgb, var(--color-success) 15%, transparent)", color: "var(--color-success)", fontWeight: 600, flexShrink: 0 }}>
                              NEW
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontFamily: "monospace" }}>{c.login}</span>
                      </div>
                      <span style={{ flexShrink: 0, fontWeight: 700, fontSize: "var(--font-size-sm)", color: "var(--color-primary)" }}>{c.commits}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Activity heatmap */}
          {heatmap && (
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", padding: "var(--space-5)", marginBottom: "var(--space-6)" }}>
              <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, margin: "0 0 var(--space-4)", color: "var(--color-text-primary)" }}>
                Activity Heatmap · {HEATMAP_WEEKS} weeks
              </h2>
              <div style={{ overflowX: "auto" }}>
                <div style={{ display: "inline-flex", flexDirection: "column", gap: 2, minWidth: "max-content" }}>
                  {/* Col labels */}
                  <div style={{ display: "flex", marginLeft: 32, gap: 3 }}>
                    {heatmap.colLabels.map((lbl, ci) => (
                      <div key={ci} style={{ width: 14, fontSize: 9, color: "var(--color-text-muted)", textAlign: "center", overflow: "hidden" }}>
                        {ci % labelStep === 0 ? lbl : ""}
                      </div>
                    ))}
                  </div>
                  {/* Rows */}
                  {heatmap.rowLabels.map((rowLbl, ri) => (
                    <div key={ri} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <div style={{ width: 28, textAlign: "right", fontSize: 9, color: "var(--color-text-muted)", flexShrink: 0 }}>{rowLbl}</div>
                      {heatmap.data[ri].map((val, ci) => (
                        <div
                          key={ci}
                          title={`${rowLbl} ${heatmap.colLabels[ci]}: ${val} commit${val !== 1 ? "s" : ""}`}
                          style={{ width: 14, height: 14, borderRadius: 2, background: cellColor(val, heatmapMax), flexShrink: 0 }}
                        />
                      ))}
                    </div>
                  ))}
                  {/* Legend */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: "var(--space-2)", marginLeft: 32 }}>
                    <span style={{ fontSize: 9, color: "var(--color-text-muted)" }}>Less</span>
                    {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
                      <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: cellColor(t * heatmapMax, heatmapMax) }} />
                    ))}
                    <span style={{ fontSize: 9, color: "var(--color-text-muted)" }}>More</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full contributors table */}
          <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, margin: "0 0 var(--space-3)", color: "var(--color-text-primary)" }}>
            All Contributors
          </h2>
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Contributor</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Login</th>
                  <th style={{ textAlign: "right", padding: "var(--space-3) var(--space-4)" }}>Commits</th>
                  <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>First commit</th>
                </tr>
              </thead>
              <tbody>
                {contributors.map((c) => (
                  <tr key={c.login} style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
                    <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{c.displayName}</span>
                        {c.isNew && (
                          <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: "var(--radius-full)", background: "color-mix(in srgb, var(--color-success) 15%, transparent)", color: "var(--color-success)", fontWeight: 600 }}>
                            NEW
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{c.login}</span>
                    </td>
                    <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right", fontWeight: 700, color: "var(--color-primary)" }}>{c.commits}</td>
                    <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                      <RelativeTime value={c.firstCommitAt} />
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
