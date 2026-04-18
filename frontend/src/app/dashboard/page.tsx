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
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
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

function RepoHealthCard() {
  const [data, setData] = useState<RepoSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<RepoSummary>("/api/core/repos/summary")
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const score = data?.avgHealthScore ?? 0;
  const scoreColor =
    score >= 70 ? "var(--color-success)" :
    score >= 40 ? "var(--color-warning)" :
    "var(--color-danger)";

  return (
    <DashboardCard title="Repository Health" icon={<Icon name="repo-health" size={15} />} action={<DetailLink href="/repos" />}>
      {loading ? <SkeletonCard /> : data && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <BigValue value={score} unit="/ 100" color={scoreColor} />
          <ProgressBar value={score} max={100} colorAuto size="sm" animated />
          <div style={{ display: "flex", gap: "var(--space-4)" }}>
            <SubStat label="Repos" value={data.total} />
            <SubStat label="Critical" value={data.critical} color={data.critical > 0 ? "var(--color-danger)" : undefined} />
            <SubStat label="Stale" value={data.stale} color={data.stale > 0 ? "var(--color-warning)" : undefined} />
            <SubStat label="Unprotected" value={data.unprotected} color={data.unprotected > 0 ? "var(--color-warning)" : undefined} />
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
