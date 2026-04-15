"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { Table } from "@/components/ui";
import type { Column } from "@/components/ui";

interface Config { days?: number }

interface FailingRow {
  repoFullName: string;
  workflowName: string;
  total: number;
  failures: number;
  lastConclusion: string | null;
  lastRunAt: string | null;
}

const COLUMNS: Column<FailingRow>[] = [
  {
    key: "repoFullName",
    label: "Repository",
    render: (row) => (
      <span style={{ fontFamily: "monospace", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
        {row.repoFullName}
      </span>
    ),
  },
  {
    key: "workflowName",
    label: "Workflow",
    render: (row) => (
      <span style={{ fontWeight: 500, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>
        {row.workflowName}
      </span>
    ),
  },
  {
    key: "failures",
    label: "Failures",
    sortable: true,
    align: "right",
    render: (row) => (
      <span style={{ fontWeight: 700, color: "var(--color-danger)", fontSize: "var(--font-size-sm)" }}>
        {row.failures}
      </span>
    ),
  },
  {
    key: "total",
    label: "Total runs",
    align: "right",
    render: (row) => (
      <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
        {row.total}
      </span>
    ),
  },
  {
    key: "lastConclusion",
    label: "Last",
    render: (row) => {
      const c = row.lastConclusion;
      const color = c === "success" ? "var(--color-success)" : c === "failure" ? "var(--color-danger)" : "var(--color-text-muted)";
      return (
        <span style={{ fontSize: "var(--font-size-xs)", padding: "1px 6px", borderRadius: "var(--radius-full)", background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
          {c ?? "—"}
        </span>
      );
    },
  },
];

export function CiFailingWorkflows({ config }: { config: Record<string, unknown> }) {
  const days = (config as Config).days ?? 7;
  const [rows, setRows] = useState<FailingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<FailingRow[]>(`/api/core/ci/failing?days=${days}`)
      .then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, [days]);

  if (!loading && rows.length === 0) {
    return (
      <div style={{ color: "var(--color-success)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-8)" }}>
        ✓ No workflow failures in the last {days} days.
      </div>
    );
  }

  return (
    <Table<FailingRow>
      columns={COLUMNS}
      rows={rows}
      rowKey={(r) => `${r.repoFullName}:${r.workflowName}`}
      loading={loading}
    />
  );
}
