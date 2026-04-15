"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { Table } from "@/components/ui";
import type { Column } from "@/components/ui";

interface Config {
  stale_days?: number;
  page_size?: number;
}

interface PrRow {
  repoFullName: string;
  number: number;
  title: string;
  isDraft: boolean;
  author: string | null;
  labels: string[];
  ageDays: number;
  createdAt: string | null;
}

const COLUMNS: Column<PrRow>[] = [
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
    key: "number",
    label: "#",
    width: 60,
    render: (row) => (
      <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>#{row.number}</span>
    ),
  },
  {
    key: "title",
    label: "Title",
    render: (row) => (
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", minWidth: 0 }}>
        {row.isDraft && (
          <span style={{
            fontSize: "var(--font-size-xs)",
            padding: "1px 5px",
            borderRadius: "var(--radius-full)",
            background: "var(--color-border)",
            color: "var(--color-text-muted)",
            flexShrink: 0,
          }}>
            Draft
          </span>
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "var(--font-size-sm)" }}>
          {row.title}
        </span>
      </div>
    ),
  },
  {
    key: "labels",
    label: "Labels",
    render: (row) => (
      <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
        {row.labels.slice(0, 3).map((lbl) => (
          <span key={lbl} style={{
            fontSize: "var(--font-size-xs)",
            padding: "1px 5px",
            borderRadius: "var(--radius-full)",
            background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
            color: "var(--color-primary)",
          }}>
            {lbl}
          </span>
        ))}
        {row.labels.length > 3 && (
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
            +{row.labels.length - 3}
          </span>
        )}
      </div>
    ),
  },
  {
    key: "author",
    label: "Author",
    width: 120,
    render: (row) => (
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
        {row.author ?? "—"}
      </span>
    ),
  },
  {
    key: "ageDays",
    label: "Age",
    width: 70,
    sortable: true,
    align: "right",
    render: (row) => {
      const color = row.ageDays >= 30 ? "var(--color-danger)" : row.ageDays >= 7 ? "var(--color-warning)" : "var(--color-text-primary)";
      return (
        <span style={{ fontWeight: 600, color, fontSize: "var(--font-size-sm)" }}>
          {row.ageDays}d
        </span>
      );
    },
  },
];

export function PrsStaleTable({ config }: { config: Record<string, unknown> }) {
  const cfg = config as Config;
  const staleDays = cfg.stale_days ?? 7;

  const [rows, setRows] = useState<PrRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<PrRow[]>(`/api/core/prs/list?stale_days=${staleDays}&limit=200`)
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [staleDays]);

  if (!loading && rows.length === 0) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-8)" }}>
        No stale pull requests (older than {staleDays} days).
      </div>
    );
  }

  return (
    <Table<PrRow>
      columns={COLUMNS}
      rows={rows}
      rowKey={(row) => `${row.repoFullName}#${row.number}`}
      loading={loading}
    />
  );
}
