"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { DashboardCard, LineChart, BarChart, Icon, ProgressBar } from "@/components/ui";
import type { LineChartSeries, BarChartSeries } from "@/components/ui";

// ── First-run sync ────────────────────────────────────────────────────────────

function useSyncOnFirstRun() {
  const [ready, setReady] = useState<boolean | null>(null);
  const syncStartedRef = useRef(false);

  useEffect(() => {
    apiGet<{ total: number }>("/api/core/repos/summary")
      .then((s) => setReady((s?.total ?? 0) > 0))
      .catch(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready !== false || syncStartedRef.current) return;
    syncStartedRef.current = true;
    apiPost("/api/core/sync/trigger", {}).catch(() => {});
    const poll = setInterval(async () => {
      try {
        const s = await apiGet<{ total: number }>("/api/core/repos/summary");
        if ((s?.total ?? 0) > 0) { clearInterval(poll); setReady(true); }
      } catch { /* continue polling */ }
    }, 3000);
    return () => clearInterval(poll);
  }, [ready]);

  return ready;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function DetailLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      style={{
        fontSize: "var(--font-size-xs)",
        fontFamily: "var(--font-mono)",
        color: "var(--color-text-muted)",
        textDecoration: "none",
        padding: "1px 6px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--color-border)",
        letterSpacing: "0.02em",
      }}
    >
      open →
    </Link>
  );
}

function BigValue({ value, unit, color }: { value: string | number; unit?: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
      <span style={{
        fontSize: 36,
        fontWeight: 700,
        fontFamily: "var(--font-data)",
        lineHeight: 1,
        letterSpacing: "-0.02em",
        color: color ?? "var(--color-text-primary)",
      }}>
        {value}
      </span>
      {unit && (
        <span style={{
          fontSize: "var(--font-size-xs)",
          fontFamily: "var(--font-mono)",
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}>
          {unit}
        </span>
      )}
    </div>
  );
}

function SubStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "center" }}>
      <span style={{
        fontSize: "var(--font-size-md)",
        fontWeight: 700,
        fontFamily: "var(--font-data)",
        color: color ?? "var(--color-text-primary)",
        letterSpacing: "-0.01em",
      }}>
        {value}
      </span>
      <span style={{
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--color-text-muted)",
      }}>
        {label}
      </span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {[60, 90, 45].map((w, i) => (
        <div key={i} style={{ height: 12, width: `${w}%`, background: "var(--color-border)", borderRadius: "var(--radius-sm)" }} />
      ))}
    </div>
  );
}

function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${Math.round(h)}h`;
  const days = Math.floor(h / 24);
  const rem = Math.round(h % 24);
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

// ── Card: Repository Health ───────────────────────────────────────────────────

interface RepoSummary {
  total: number;
  avgHealthScore: number;
  critical: number;
  stale: number;
  unprotected: number;
}

interface HealthPoint {
  date: string;
  score: number;
  critical: number;
  stale: number;
}

type HealthMetric = "score" | "critical" | "stale";
type HealthRange  = 7 | 30;

const METRIC_LABELS: Record<HealthMetric, string> = {
  score:    "AVG SCORE",
  critical: "CRITICAL",
  stale:    "STALE",
};

function healthColor(score: number) {
  if (score >= 70) return "var(--color-success)";
  if (score >= 40) return "var(--color-warning)";
  return "var(--color-danger)";
}

function TrendArrow({ delta }: { delta: number }) {
  if (delta === 0) return (
    <span style={{ color: "var(--color-text-muted)", fontSize: 13, fontFamily: "var(--font-mono)" }}>→</span>
  );
  const up = delta > 0;
  return (
    <span style={{
      color: up ? "var(--color-success)" : "var(--color-danger)",
      fontSize: 13,
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
    }}>
      {up ? "↑" : "↓"}{Math.abs(delta)}
    </span>
  );
}

function HistorySparkline({ points, metric, color }: { points: HealthPoint[]; metric: HealthMetric; color: string }) {
  const data = points.map(p => p[metric]);
  if (data.length < 2) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "var(--font-size-xs)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>
          no history yet
        </span>
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 300;
  const H = 60;
  const pad = { t: 4, r: 2, b: 2, l: 2 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;

  const pts = data.map((v, i) => {
    const x = pad.l + (i / (data.length - 1)) * w;
    const y = pad.t + h - ((v - min) / range) * h;
    return [x, y] as [number, number];
  });

  const polyline = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const fillPath = `M${pts[0][0]},${pts[0][1]} ${pts.map(([x, y]) => `L${x},${y}`).join(" ")} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <path d={fillPath} fill={color} fillOpacity={0.12} strokeWidth={0} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RepoHealthCard() {
  const [summary, setSummary]   = useState<RepoSummary | null>(null);
  const [history, setHistory]   = useState<HealthPoint[]>([]);
  const [loading, setLoading]   = useState(true);
  const [metric, setMetric]     = useState<HealthMetric>("score");
  const [range, setRange]       = useState<HealthRange>(30);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet<RepoSummary>("/api/core/repos/summary"),
      apiGet<HealthPoint[]>(`/api/core/repos/health-history?days=${range}`),
    ])
      .then(([s, h]) => { setSummary(s); setHistory(h ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  const score = summary?.avgHealthScore ?? 0;
  const color = healthColor(score);

  // Trend: diff between first and last point in history
  const trend = history.length >= 2
    ? history[history.length - 1][metric] - history[0][metric]
    : 0;

  const metricColor: Record<HealthMetric, string> = {
    score:    color,
    critical: "var(--color-danger)",
    stale:    "var(--color-warning)",
  };

  const chartColor = metricColor[metric];

  // Range toggle rendered into DashboardCard action slot
  const rangeToggle = (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {([7, 30] as HealthRange[]).map(d => (
        <button
          key={d}
          onClick={() => setRange(d)}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            letterSpacing: "0.04em",
            padding: "1px 6px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border)",
            background: range === d ? "var(--color-primary)" : "transparent",
            color: range === d ? "var(--color-text-inverse)" : "var(--color-text-muted)",
            cursor: "pointer",
          }}
        >
          {d}d
        </button>
      ))}
      <DetailLink href="/repos" />
    </div>
  );

  return (
    <DashboardCard
      title="Repository Health"
      icon={<Icon name="repo-health" size={15} />}
      action={rangeToggle}
      padding={false}
    >
      {loading ? (
        <div style={{ padding: "var(--space-4)" }}><SkeletonCard /></div>
      ) : summary && (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

          {/* Score row + metric pills */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3) var(--space-4) var(--space-2)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
              <BigValue value={score} unit="/ 100" color={color} />
              <TrendArrow delta={metric === "score" ? trend : -trend} />
            </div>
            {/* Metric selector */}
            <div style={{ display: "flex", gap: 3 }}>
              {(Object.keys(METRIC_LABELS) as HealthMetric[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding: "2px 5px",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${metric === m ? metricColor[m] : "var(--color-border)"}`,
                    background: metric === m ? `color-mix(in srgb, ${metricColor[m]} 12%, transparent)` : "transparent",
                    color: metric === m ? metricColor[m] : "var(--color-text-muted)",
                    cursor: "pointer",
                  }}
                >
                  {METRIC_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Chart – fills remaining space */}
          <div style={{ flex: 1, minHeight: 64, position: "relative" }}>
            <HistorySparkline points={history} metric={metric} color={chartColor} />
          </div>

          {/* Stats row */}
          <div style={{
                          display: "flex",
                          justifyContent: "space-around",
            gap: "var(--space-4)",
            padding: "var(--space-3) var(--space-4)",
            borderTop: "1px solid var(--color-border-subtle)",
          }}>
            <SubStat label="Repos"       value={summary.total} />
            <SubStat label="Critical"    value={summary.critical}    color={summary.critical > 0    ? "var(--color-danger)"  : undefined} />
            <SubStat label="Stale"       value={summary.stale}       color={summary.stale > 0       ? "var(--color-warning)" : undefined} />
            <SubStat label="Unprotected" value={summary.unprotected} color={summary.unprotected > 0 ? "var(--color-warning)" : undefined} />
          </div>

        </div>
      )}
    </DashboardCard>
  );
}

// ── Card: Pull Requests ───────────────────────────────────────────────────────

interface PrSummary {
  open: number;
  drafts: number;
  ready: number;
  avgAgeDays: number;
  staleCount: number;
}

interface AgeBucket { label: string; count: number }

function PullRequestsCard() {
  const [summary, setSummary] = useState<PrSummary | null>(null);
  const [buckets, setBuckets] = useState<AgeBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<PrSummary>("/api/core/prs/summary"),
      apiGet<AgeBucket[]>("/api/core/prs/age-distribution"),
    ])
      .then(([s, b]) => { setSummary(s); setBuckets(b); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasBucketData = buckets.some((b) => b.count > 0);
  const ageSeries: BarChartSeries[] = hasBucketData ? [{
    label: "PRs",
    data: buckets.map((b) => b.count),
    color: "var(--color-primary)",
  }] : [];

  return (
    <DashboardCard title="Pull Requests" icon={<Icon name="pull-requests" size={15} />} action={<DetailLink href="/pull-requests" />}>
      {loading ? <SkeletonCard /> : summary && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <BigValue value={summary.open} unit="open" color="var(--color-primary)" />
          {ageSeries.length > 0 && (
            <BarChart
              labels={buckets.map((b) => b.label)}
              series={ageSeries}
              height={80}
              showLegend={false}
              gridLines={3}
            />
          )}
          <div style={{ display: "flex", gap: "var(--space-4)" }}>
            <SubStat label="Ready" value={summary.ready} />
            <SubStat label="Draft" value={summary.drafts} color="var(--color-text-muted)" />
            <SubStat label="Avg age" value={`${summary.avgAgeDays}d`} />
            <SubStat label="Stale" value={summary.staleCount} color={summary.staleCount > 0 ? "var(--color-warning)" : undefined} />
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

// ── Card: CI / CD ─────────────────────────────────────────────────────────────

interface CiSummary {
  total: number;
  failure: number;
  inProgress: number;
  successRate: number;
  avgDurationSeconds: number;
}

interface DurationPoint { date: string; avgSeconds: number }

function fmtDuration(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function CiCdCard() {
  const [summary, setSummary] = useState<CiSummary | null>(null);
  const [trend, setTrend] = useState<DurationPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<CiSummary>("/api/core/ci/summary?days=14"),
      apiGet<DurationPoint[]>("/api/core/ci/duration-trend?days=14"),
    ])
      .then(([s, t]) => { setSummary(s); setTrend(t); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const rateColor = !summary ? "var(--color-text-primary)" :
    summary.successRate >= 90 ? "var(--color-success)" :
    summary.successRate >= 70 ? "var(--color-warning)" :
    "var(--color-danger)";

  const hasTrend = trend.some((p) => p.avgSeconds > 0);
  const trendSeries: LineChartSeries[] = hasTrend ? [{
    label: "Avg duration",
    data: trend.map((p) => Math.round(p.avgSeconds / 60)),
    color: "var(--color-primary)",
  }] : [];

  return (
    <DashboardCard title="CI / CD" icon={<Icon name="ci-cd" size={15} />} action={<DetailLink href="/ci-cd" />}>
      {loading ? <SkeletonCard /> : summary && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <BigValue value={`${summary.successRate}%`} unit="success rate" color={rateColor} />
          {trendSeries.length > 0 && (
            <LineChart
              labels={trend.map((p) => p.date)}
              series={trendSeries}
              height={80}
              showLegend={false}
              filled
              formatY={(v) => `${v}m`}
            />
          )}
          <div style={{ display: "flex", gap: "var(--space-4)" }}>
            <SubStat label="Runs (14d)" value={summary.total} />
            <SubStat label="Failed" value={summary.failure} color={summary.failure > 0 ? "var(--color-danger)" : undefined} />
            <SubStat label="Running" value={summary.inProgress} />
            {summary.avgDurationSeconds > 0 && (
              <SubStat label="Avg time" value={fmtDuration(summary.avgDurationSeconds)} />
            )}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

// ── Card: Security ────────────────────────────────────────────────────────────

interface DepSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  affectedRepos: number;
}

const SEV_COLORS = {
  critical: "var(--color-danger)",
  high: "color-mix(in srgb, var(--color-danger) 60%, var(--color-warning))",
  medium: "var(--color-warning)",
  low: "var(--color-text-muted)",
};

function SecurityCard() {
  const [data, setData] = useState<DepSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<DepSummary>("/api/core/deps/summary")
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const mainColor = !data || data.total === 0 ? "var(--color-success)" :
    data.critical > 0 ? SEV_COLORS.critical :
    data.high > 0 ? SEV_COLORS.high :
    SEV_COLORS.medium;

  const sevBuckets = data ? [
    { key: "critical" as const, label: "Critical", value: data.critical },
    { key: "high" as const, label: "High", value: data.high },
    { key: "medium" as const, label: "Medium", value: data.medium },
    { key: "low" as const, label: "Low", value: data.low },
  ] : [];
  const maxSev = Math.max(...sevBuckets.map((b) => b.value), 1);

  return (
    <DashboardCard title="Security" icon={<Icon name="security" size={15} />} action={<DetailLink href="/dependencies" />}>
      {loading ? <SkeletonCard /> : data && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {data.total === 0 ? (
            <span style={{ color: "var(--color-success)", fontSize: "var(--font-size-md)", fontWeight: 600 }}>
              ✓ No open vulnerabilities
            </span>
          ) : (
            <BigValue value={data.total} unit="open alerts" color={mainColor} />
          )}
          {data.total > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {sevBuckets.map(({ key, label, value }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", width: 46, flexShrink: 0 }}>{label}</span>
                  <div style={{ flex: 1 }}>
                    <ProgressBar value={value} max={maxSev} color={SEV_COLORS[key]} size="sm" />
                  </div>
                  <span style={{
                    fontSize: "var(--font-size-xs)",
                    color: value > 0 ? SEV_COLORS[key] : "var(--color-text-muted)",
                    width: 18,
                    textAlign: "right",
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>{value}</span>
                </div>
              ))}
            </div>
          )}
          {data.total > 0 && (
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
              {data.affectedRepos} repo{data.affectedRepos !== 1 ? "s" : ""} affected
            </span>
          )}
        </div>
      )}
    </DashboardCard>
  );
}

// ── Card: Team Activity ───────────────────────────────────────────────────────

interface CommitPoint { date: string; commits: number }

function TeamActivityCard() {
  const [points, setPoints] = useState<CommitPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<CommitPoint[]>("/api/core/team/commit-activity?days=14")
      .then(setPoints).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalCommits = points.reduce((s, p) => s + p.commits, 0);
  const hasData = points.some((p) => p.commits > 0);

  const series: BarChartSeries[] = [{
    label: "Commits",
    data: points.map((p) => p.commits),
    color: "var(--color-primary)",
  }];

  return (
    <DashboardCard title="Team Activity" icon={<Icon name="team" size={15} />} action={<DetailLink href="/team" />}>
      {loading ? <SkeletonCard /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {hasData ? (
            <>
              <BarChart
                labels={points.map((p) => p.date)}
                series={series}
                height={100}
                showLegend={false}
                gridLines={3}
              />
              <div style={{ display: "flex", gap: "var(--space-4)" }}>
                <SubStat label="Commits (14d)" value={totalCommits} />
              </div>
            </>
          ) : (
            <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>
              No commits in last 14 days.
            </div>
          )}
        </div>
      )}
    </DashboardCard>
  );
}

// ── Card: Developer Metrics ───────────────────────────────────────────────────

interface DevSummary {
  avgCycleTimeHours: number | null;
  totalMerged: number;
  mergeRate: number | null;
}

interface CycleTrendPoint { week: string; avgHours: number | null }

function DevMetricsCard() {
  const [summary, setSummary] = useState<DevSummary | null>(null);
  const [trend, setTrend] = useState<CycleTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<DevSummary>("/api/core/dev/summary?days=30"),
      apiGet<CycleTrendPoint[]>("/api/core/dev/cycle-time-trend?weeks=8"),
    ])
      .then(([s, t]) => { setSummary(s); setTrend(t); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cycleColor = !summary?.avgCycleTimeHours ? "var(--color-text-primary)" :
    summary.avgCycleTimeHours <= 24 ? "var(--color-success)" :
    summary.avgCycleTimeHours <= 72 ? "var(--color-warning)" :
    "var(--color-danger)";

  const hasTrend = trend.some((p) => p.avgHours !== null && p.avgHours > 0);
  const trendSeries: LineChartSeries[] = hasTrend ? [{
    label: "Cycle time",
    data: trend.map((p) => p.avgHours ?? 0),
    color: "var(--color-primary)",
  }] : [];

  return (
    <DashboardCard title="Developer Metrics" icon={<Icon name="dev-metrics" size={15} />} action={<DetailLink href="/dev-metrics" />}>
      {loading ? <SkeletonCard /> : summary && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {summary.avgCycleTimeHours !== null ? (
            <>
              <BigValue
                value={fmtHours(summary.avgCycleTimeHours)}
                unit="avg cycle time"
                color={cycleColor}
              />
              {trendSeries.length > 0 && (
                <LineChart
                  labels={trend.map((p) => p.week)}
                  series={trendSeries}
                  height={80}
                  showLegend={false}
                  filled
                  formatY={fmtHours}
                />
              )}
            </>
          ) : (
            <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
              No merged PRs in last 30 days.
            </div>
          )}
          <div style={{ display: "flex", gap: "var(--space-4)" }}>
            <SubStat label="Merged (30d)" value={summary.totalMerged} />
            {summary.mergeRate !== null && (
              <SubStat label="Merge rate" value={`${summary.mergeRate}%`} />
            )}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const ready = useSyncOnFirstRun();
  const [orgName, setOrgName] = useState<string>("");

  useEffect(() => {
    const cached = localStorage.getItem("gitvise_org");
    if (cached) setOrgName(cached);
  }, []);

  if (ready === null) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: "var(--font-size-md)", gap: "var(--space-3)" }}>
        <span style={{ animation: "pulse 1.5s infinite", fontSize: 24 }}>◈</span>
        Loading...
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      </div>
    );
  }

  if (ready === false) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--space-3)", color: "var(--color-text-muted)", fontSize: "var(--font-size-md)" }}>
        <span style={{ animation: "pulse 1.5s infinite", fontSize: 24 }}>◈</span>
        Syncing repositories...
        <span style={{ fontSize: "var(--font-size-sm)", opacity: 0.7 }}>This may take a moment on first run.</span>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      </div>
    );
  }

  return (
    <main style={{ flex: 1, padding: "var(--space-6)", overflowY: "auto" }}>
      {/* Page title */}
      <div style={{ marginBottom: "var(--space-6)", display: "flex", alignItems: "baseline", gap: "var(--space-3)" }}>
        <h1 style={{
          fontSize: "var(--font-size-xl)",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          margin: 0,
        }}>
          Overview
        </h1>
        {orgName && (
          <span style={{
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-mono)",
            color: "var(--color-primary)",
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}>
            {orgName}
          </span>
        )}
      </div>

      {/* Fixed 3-column grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        style={{ gap: "var(--space-4)" }}
      >
        <RepoHealthCard />
        <PullRequestsCard />
        <CiCdCard />
        <SecurityCard />
        <TeamActivityCard />
        <DevMetricsCard />
      </div>
    </main>
  );
}
