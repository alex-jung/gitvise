"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { Table } from "@/components/ui";
import type { Column } from "@/components/ui";
import { RelativeTime } from "@/components/ui";

interface Config { days?: number; page_size?: number }

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

function fmtDuration(s: number | null): string {
  if (s === null) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}

function ConclusionBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  const label = status === "in_progress" ? "running" : status === "queued" ? "queued" : (conclusion ?? "—");
  const color =
    label === "success" ? "var(--color-success)" :
    label === "failure" ? "var(--color-danger)" :
    label === "running" ? "var(--color-primary)" :
    label === "cancelled" ? "var(--color-warning)" :
    "var(--color-text-muted)";
  return (
    <span style={{
      fontSize: "var(--font-size-xs)",
      padding: "1px 7px",
      borderRadius: "var(--radius-full)",
      background: `color-mix(in srgb, ${color} 15%, transparent)`,
      color,
      fontWeight: 500,
    }}>
      {label}
    </span>
  );
}

const COLUMNS: Column<Run>[] = [
  {
    key: "repoFullName",
    label: "Repository",
    render: (r) => (
      <span style={{ fontFamily: "monospace", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
        {r.repoFullName}
      </span>
    ),
  },
  {
    key: "workflowName",
    label: "Workflow",
    render: (r) => (
      <span style={{ fontWeight: 500, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>
        {r.workflowName}
      </span>
    ),
  },
  {
    key: "branch",
    label: "Branch",
    render: (r) => (
      <span style={{ fontFamily: "monospace", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
        {r.branch ?? "—"}
      </span>
    ),
  },
  {
    key: "event",
    label: "Trigger",
    render: (r) => (
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
        {r.event ?? "—"}
      </span>
    ),
  },
  {
    key: "conclusion",
    label: "Status",
    render: (r) => <ConclusionBadge status={r.status} conclusion={r.conclusion} />,
  },
  {
    key: "durationSeconds",
    label: "Duration",
    align: "right",
    sortable: true,
    render: (r) => (
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
        {fmtDuration(r.durationSeconds)}
      </span>
    ),
  },
  {
    key: "createdAt",
    label: "Started",
    render: (r) => <RelativeTime value={r.createdAt} />,
  },
];

export function CiRunHistory({ config }: { config: Record<string, unknown> }) {
  const cfg = config as Config;
  const days = cfg.days ?? 7;

  const [rows, setRows] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Run[]>(`/api/core/ci/runs?days=${days}&limit=500`)
      .then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, [days]);

  if (!loading && rows.length === 0) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-8)" }}>
        No workflow runs in the last {days} days.
      </div>
    );
  }

  return (
    <Table<Run>
      columns={COLUMNS}
      rows={rows}
      rowKey={(r) => `${r.repoFullName}:${r.workflowName}:${r.createdAt ?? Math.random()}`}
      loading={loading}
    />
  );
}
