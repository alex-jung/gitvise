"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { HealthBadge, HealthBar } from "@/components/health-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { RelativeTime } from "@/components/ui/relative-time";
import { Tabs } from "@/components/ui/tabs";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Repo {
  fullName: string;
  name: string;
  owner: string;
  description: string | null;
  language: string | null;
  isPrivate: boolean;
  isArchived: boolean;
  hasReadme: boolean;
  hasLicense: boolean;
  hasBranchProtection: boolean;
  openIssuesCount: number;
  pushedAt: string | null;
  daysSincePush: number | null;
  healthScore: number;
}

type FilterValue = "all" | "stale" | "critical" | "unprotected" | "archived";
type SortValue = "health_asc" | "health_desc" | "name" | "pushed_at";

function applyFilter(repos: Repo[], filter: FilterValue): Repo[] {
  switch (filter) {
    case "stale":       return repos.filter((r) => (r.daysSincePush ?? 0) > 30 && !r.isArchived);
    case "critical":    return repos.filter((r) => r.healthScore < 40);
    case "unprotected": return repos.filter((r) => !r.hasBranchProtection && !r.isArchived);
    case "archived":    return repos.filter((r) => r.isArchived);
    default:            return repos;
  }
}

function applySort(repos: Repo[], sort: SortValue): Repo[] {
  const copy = [...repos];
  switch (sort) {
    case "health_asc":  copy.sort((a, b) => a.healthScore - b.healthScore); break;
    case "health_desc": copy.sort((a, b) => b.healthScore - a.healthScore); break;
    case "name":        copy.sort((a, b) => a.name.localeCompare(b.name)); break;
    case "pushed_at":   copy.sort((a, b) => (b.pushedAt ?? "").localeCompare(a.pushedAt ?? "")); break;
  }
  return copy;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReposPage() {
  const [allRepos, setAllRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [sort, setSort] = useState<SortValue>("health_asc");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const data = await apiGet<Repo[]>("/api/core/repos");
      setAllRepos(data);
    } catch {
      setAllRepos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const repos = useMemo(
    () => applySort(applyFilter(allRepos, filter), sort),
    [allRepos, filter, sort],
  );

  const counts = useMemo(() => ({
    all:         allRepos.length,
    critical:    allRepos.filter((r) => r.healthScore < 40).length,
    stale:       allRepos.filter((r) => (r.daysSincePush ?? 0) > 30 && !r.isArchived).length,
    unprotected: allRepos.filter((r) => !r.hasBranchProtection && !r.isArchived).length,
    archived:    allRepos.filter((r) => r.isArchived).length,
  }), [allRepos]);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await apiPost("/api/core/sync/trigger", {});
      await new Promise((r) => setTimeout(r, 2500));
      await fetchAll();
    } finally {
      setSyncing(false);
    }
  };

  const tabs = [
    { value: "all" as FilterValue,         label: "All",         count: counts.all },
    { value: "critical" as FilterValue,    label: "Critical",    count: counts.critical },
    { value: "stale" as FilterValue,       label: "Stale",       count: counts.stale },
    { value: "unprotected" as FilterValue, label: "Unprotected", count: counts.unprotected },
    { value: "archived" as FilterValue,    label: "Archived",    count: counts.archived },
  ];

  return (
    <main style={{ flex: 1, padding: "var(--space-6)", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
            Repositories
          </h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", margin: "var(--space-1) 0 0" }}>
            Health Scores aller Repositories
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

      {/* Sort controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>Sort:</span>
        {(
          [
            { value: "health_asc",  label: "Health ↑" },
            { value: "health_desc", label: "Health ↓" },
            { value: "name",        label: "Name" },
            { value: "pushed_at",   label: "Activity" },
          ] as { value: SortValue; label: string }[]
        ).map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSort(opt.value)}
            style={{
              padding: "var(--space-1) var(--space-3)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: sort === opt.value ? "var(--color-primary)" : "transparent",
              color: sort === opt.value ? "var(--color-text-inverse)" : "var(--color-text-muted)",
              fontSize: "var(--font-size-xs)",
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filter Tabs */}
      <Tabs tabs={tabs} active={filter} onChange={setFilter} />

      {/* Content */}
      {loading ? (
        <LoadingState rows={8} />
      ) : allRepos.length === 0 ? (
        <EmptyState
          icon="◫"
          title="No repositories found"
          description="Run a sync to load your repositories."
          action={
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
                cursor: "pointer",
              }}
            >
              Sync starten
            </button>
          }
        />
      ) : repos.length === 0 ? (
        <EmptyState
          icon="◫"
          title={`No ${filter} repositories`}
          description="No repositories match this filter."
        />
      ) : (
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
              <tr
                style={{
                  borderBottom: "1px solid var(--color-border)",
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-xs)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Name</th>
                <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Language</th>
                <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)", width: 180 }}>Health</th>
                <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Checks</th>
                <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Last activity</th>
                <th style={{ textAlign: "right", padding: "var(--space-3) var(--space-4)" }}>Issues</th>
              </tr>
            </thead>
            <tbody>
              {repos.map((repo) => (
                <tr key={repo.fullName} style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
                  <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
                        {repo.name}
                      </span>
                      {repo.isPrivate && (
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>🔒</span>
                      )}
                      {repo.isArchived && (
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>📦</span>
                      )}
                    </div>
                    {repo.description && (
                      <div
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-muted)",
                          marginTop: 2,
                          maxWidth: 280,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {repo.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-muted)" }}>
                    {repo.language ?? "—"}
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <HealthBadge score={repo.healthScore} />
                      <div style={{ flex: 1, minWidth: 80 }}>
                        <HealthBar score={repo.healthScore} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                      <CheckBadge ok={repo.hasReadme} label="README" />
                      <CheckBadge ok={repo.hasLicense} label="License" />
                      <CheckBadge ok={repo.hasBranchProtection} label="Protection" />
                    </div>
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-muted)" }}>
                    <RelativeTime value={repo.pushedAt} />
                  </td>
                  <td style={{ padding: "var(--space-3) var(--space-4)", textAlign: "right", color: "var(--color-text-muted)" }}>
                    {repo.openIssuesCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function CheckBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      title={`${label}: ${ok ? "✓" : "✗"}`}
      style={{
        fontSize: "var(--font-size-xs)",
        padding: "1px 5px",
        borderRadius: "var(--radius-full)",
        background: ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
        color: ok ? "var(--color-success)" : "var(--color-danger)",
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}
