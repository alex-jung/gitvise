"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { RelativeTime } from "@/components/ui/relative-time";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PrRow {
  repoFullName: string;
  number: number;
  title: string;
  isDraft: boolean;
  author: string | null;
  labels: string[];
  ageDays: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface IssueRow {
  repoFullName: string;
  number: number;
  title: string;
  author: string | null;
  labels: string[];
  ageDays: number;
  createdAt: string | null;
}

interface Summary {
  open: number;
  drafts: number;
  ready: number;
  avgAgeDays: number;
  staleCount: number;
}

interface IssueSummary {
  open: number;
  avgAgeDays: number;
}

type View = "prs" | "issues";

// ── Helpers ───────────────────────────────────────────────────────────────────

function ageColor(days: number): string {
  if (days >= 30) return "var(--color-danger)";
  if (days >= 7) return "var(--color-warning)";
  return "var(--color-text-primary)";
}

function Label({ name }: { name: string }) {
  return (
    <span
      style={{
        fontSize: "var(--font-size-xs)",
        padding: "1px 6px",
        borderRadius: "var(--radius-full)",
        background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
        color: "var(--color-primary)",
        whiteSpace: "nowrap",
      }}
    >
      {name}
    </span>
  );
}

function StatPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "var(--space-3) var(--space-5)",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        minWidth: 90,
      }}
    >
      <span style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: color ?? "var(--color-text-primary)" }}>
        {value}
      </span>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
        {label}
      </span>
    </div>
  );
}

// ── PR table ──────────────────────────────────────────────────────────────────

function PrTable({ rows }: { rows: PrRow[] }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Repository</th>
            <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Title</th>
            <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Labels</th>
            <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Author</th>
            <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Opened</th>
            <th style={{ textAlign: "right", padding: "var(--space-3) var(--space-4)" }}>Age</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((pr) => (
            <tr key={`${pr.repoFullName}#${pr.number}`} style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
              <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                <span style={{ fontFamily: "monospace", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                  {pr.repoFullName}
                  <span style={{ marginLeft: 4, opacity: 0.6 }}>#{pr.number}</span>
                </span>
              </td>
              <td style={{ padding: "var(--space-3) var(--space-4)", maxWidth: 300 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  {pr.isDraft && (
                    <span style={{ fontSize: "var(--font-size-xs)", padding: "1px 5px", borderRadius: "var(--radius-full)", background: "var(--color-border)", color: "var(--color-text-muted)", flexShrink: 0 }}>
                      Draft
                    </span>
                  )}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text-primary)", fontWeight: 500 }}>
                    {pr.title}
                  </span>
                </div>
              </td>
              <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
                  {pr.labels.slice(0, 3).map((l) => <Label key={l} name={l} />)}
                  {pr.labels.length > 3 && (
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>+{pr.labels.length - 3}</span>
                  )}
                </div>
              </td>
              <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                {pr.author ?? "—"}
              </td>
              <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                <RelativeTime value={pr.createdAt} />
              </td>
              <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right" }}>
                <span style={{ fontWeight: 600, color: ageColor(pr.ageDays), fontSize: "var(--font-size-sm)" }}>
                  {pr.ageDays}d
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Issue table ───────────────────────────────────────────────────────────────

function IssueTable({ rows }: { rows: IssueRow[] }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Repository</th>
            <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Title</th>
            <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Labels</th>
            <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Author</th>
            <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Opened</th>
            <th style={{ textAlign: "right", padding: "var(--space-3) var(--space-4)" }}>Age</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((issue) => (
            <tr key={`${issue.repoFullName}#${issue.number}`} style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
              <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                <span style={{ fontFamily: "monospace", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                  {issue.repoFullName}
                  <span style={{ marginLeft: 4, opacity: 0.6 }}>#{issue.number}</span>
                </span>
              </td>
              <td style={{ padding: "var(--space-3) var(--space-4)", maxWidth: 300 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", color: "var(--color-text-primary)", fontWeight: 500 }}>
                  {issue.title}
                </span>
              </td>
              <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
                  {issue.labels.slice(0, 3).map((l) => <Label key={l} name={l} />)}
                  {issue.labels.length > 3 && (
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>+{issue.labels.length - 3}</span>
                  )}
                </div>
              </td>
              <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                {issue.author ?? "—"}
              </td>
              <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
                <RelativeTime value={issue.createdAt} />
              </td>
              <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right" }}>
                <span style={{ fontWeight: 600, color: ageColor(issue.ageDays), fontSize: "var(--font-size-sm)" }}>
                  {issue.ageDays}d
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PullRequestsPage() {
  const [view, setView] = useState<View>("prs");
  const [prs, setPrs] = useState<PrRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [prSummary, setPrSummary] = useState<Summary | null>(null);
  const [issueSummary, setIssueSummary] = useState<IssueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [prFilter, setPrFilter] = useState<"all" | "ready" | "draft" | "stale">("all");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [prList, issueList, prSum, issueSum] = await Promise.all([
        apiGet<PrRow[]>("/api/core/prs/list?stale_days=0&limit=500"),
        apiGet<IssueRow[]>("/api/core/issues/list?limit=500").catch(() => [] as IssueRow[]),
        apiGet<Summary>("/api/core/prs/summary"),
        apiGet<IssueSummary>("/api/core/issues/summary"),
      ]);
      setPrs(prList);
      setIssues(issueList);
      setPrSummary(prSum);
      setIssueSummary(issueSum);
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

  const filteredPrs = useMemo(() => {
    switch (prFilter) {
      case "ready": return prs.filter((p) => !p.isDraft);
      case "draft": return prs.filter((p) => p.isDraft);
      case "stale": return prs.filter((p) => p.ageDays >= 7);
      default:      return prs;
    }
  }, [prs, prFilter]);

  const prTabs = [
    { value: "all" as const,   label: "All",   count: prs.length },
    { value: "ready" as const, label: "Ready", count: prs.filter((p) => !p.isDraft).length },
    { value: "draft" as const, label: "Draft", count: prs.filter((p) => p.isDraft).length },
    { value: "stale" as const, label: "Stale (7d+)", count: prs.filter((p) => p.ageDays >= 7).length },
  ];

  const viewTabs = [
    { value: "prs" as View,    label: "Pull Requests", count: prSummary?.open ?? 0 },
    { value: "issues" as View, label: "Issues",        count: issueSummary?.open ?? 0 },
  ];

  return (
    <main style={{ flex: 1, padding: "var(--space-6)", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
            Pull Requests &amp; Issues
          </h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", margin: "var(--space-1) 0 0" }}>
            Open PRs and issues across all repositories
          </p>
        </div>
        <button
          onClick={triggerSync}
          disabled={syncing}
          style={{
            padding: "var(--space-2) var(--space-4)",
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
          {syncing ? "Syncing..." : "↻ Sync"}
        </button>
      </div>

      {/* Summary stats */}
      {!loading && prSummary && (
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
          <StatPill label="Open PRs" value={prSummary.open} color="var(--color-primary)" />
          <StatPill label="Ready" value={prSummary.ready} color="var(--color-success)" />
          <StatPill label="Draft" value={prSummary.drafts} />
          <StatPill label="Avg age" value={`${prSummary.avgAgeDays}d`} />
          <StatPill
            label="Stale (7d+)"
            value={prSummary.staleCount}
            color={prSummary.staleCount > 0 ? "var(--color-warning)" : undefined}
          />
          {issueSummary && (
            <StatPill label="Open Issues" value={issueSummary.open} color="var(--color-info, var(--color-primary))" />
          )}
        </div>
      )}

      {/* View switcher */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <Tabs tabs={viewTabs} active={view} onChange={setView} />
      </div>

      {loading ? (
        <LoadingState rows={8} />
      ) : view === "prs" ? (
        <>
          <div style={{ marginBottom: "var(--space-4)" }}>
            <Tabs tabs={prTabs} active={prFilter} onChange={setPrFilter} />
          </div>
          {filteredPrs.length === 0 ? (
            <EmptyState icon="⌥" title="No pull requests" description="No PRs match the current filter." />
          ) : (
            <PrTable rows={filteredPrs} />
          )}
        </>
      ) : (
        <>
          {issues.length === 0 ? (
            <EmptyState icon="◎" title="No open issues" description="All clear – no open issues found." />
          ) : (
            <IssueTable rows={issues} />
          )}
        </>
      )}
    </main>
  );
}
