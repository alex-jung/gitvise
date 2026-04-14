"use client";

import React, { useState } from "react";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: number | string;
  align?: "left" | "center" | "right";
  render?: (row: T) => React.ReactNode;
}

type SortDir = "asc" | "desc";

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  loading?: boolean;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyText = "No data",
  loading = false,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = React.useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  textAlign: col.align ?? "left",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  cursor: col.sortable ? "pointer" : "default",
                  userSelect: "none",
                  width: col.width,
                  whiteSpace: "nowrap",
                }}
              >
                {col.label}
                {col.sortable && sortKey === String(col.key) && (
                  <span style={{ marginLeft: "var(--space-1)" }}>
                    {sortDir === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={String(col.key)} style={{ padding: "var(--space-3) var(--space-4)" }}>
                    <div
                      style={{
                        height: 12,
                        width: `${60 + Math.random() * 30}%`,
                        background: "var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : sorted.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: "var(--space-8)",
                  textAlign: "center",
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{
                  borderTop: i > 0 ? "1px solid var(--color-border-subtle)" : undefined,
                  cursor: onRowClick ? "pointer" : "default",
                  transition: "background 100ms",
                }}
                onMouseEnter={(e) => {
                  if (onRowClick) (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover, rgba(255,255,255,0.04))";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "";
                }}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    style={{
                      padding: "var(--space-3) var(--space-4)",
                      fontSize: "var(--font-size-sm)",
                      color: "var(--color-text-primary)",
                      textAlign: col.align ?? "left",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[String(col.key)] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
