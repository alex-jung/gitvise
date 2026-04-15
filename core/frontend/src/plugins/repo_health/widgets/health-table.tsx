"use client";

import React, { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Config {
  page_size?: number;
  show_archived?: boolean;
}

interface Repo {
  fullName: string;
  name: string;
  language: string | null;
  isArchived: boolean;
  hasReadme: boolean;
  hasLicense: boolean;
  hasBranchProtection: boolean;
  daysSincePush: number | null;
  healthScore: number;
}

interface Props {
  config: Config;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score < 40 ? "var(--color-danger)" :
    score < 60 ? "var(--color-warning)" :
    "var(--color-success)";
  return (
    <span style={{
      display: "inline-block",
      minWidth: 36,
      padding: "2px var(--space-2)",
      borderRadius: "var(--radius-sm)",
      background: `color-mix(in srgb, ${color} 15%, transparent)`,
      color,
      fontSize: "var(--font-size-xs)",
      fontWeight: 600,
      textAlign: "center",
    }}>
      {score}
    </span>
  );
}

export function HealthTable({ config }: Props) {
  const pageSize = config.page_size ?? 10;
  const showArchived = config.show_archived ?? false;

  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    apiGet<Repo[]>("/api/core/repos?sort=health_asc")
      .then((data) => {
        const filtered = showArchived ? data : data.filter((r) => !r.isArchived);
        setRepos(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [showArchived]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {[100, 85, 70].map((w, i) => (
          <div key={i} style={{ height: 28, width: `${w}%`, background: "var(--color-border)", borderRadius: "var(--radius-sm)" }} />
        ))}
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>
        No repositories found.
      </div>
    );
  }

  const totalPages = Math.ceil(repos.length / pageSize);
  const pageRepos = repos.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <Th>Repository</Th>
            <Th>Score</Th>
            <Th>Issues</Th>
          </tr>
        </thead>
        <tbody>
          {pageRepos.map((r) => {
            const issues: string[] = [];
            if (!r.hasReadme) issues.push("README");
            if (!r.hasLicense) issues.push("License");
            if (!r.hasBranchProtection) issues.push("Unprotected");
            if ((r.daysSincePush ?? 0) > 30 && !r.isArchived) issues.push("Stale");

            return (
              <tr key={r.fullName} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                <td style={{ padding: "var(--space-2) var(--space-3)" }}>
                  <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{r.name}</span>
                  {r.isArchived && (
                    <span style={{ marginLeft: "var(--space-2)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>archived</span>
                  )}
                </td>
                <td style={{ padding: "var(--space-2) var(--space-3)" }}>
                  <ScoreBadge score={r.healthScore} />
                </td>
                <td style={{ padding: "var(--space-2) var(--space-3)", color: "var(--color-text-muted)" }}>
                  {issues.length > 0 ? issues.join(", ") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", padding: "var(--space-3)", borderTop: "1px solid var(--color-border-subtle)" }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "var(--space-1) var(--space-3)", cursor: page === 0 ? "not-allowed" : "pointer", opacity: page === 0 ? 0.4 : 1, color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}
          >←</button>
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", alignSelf: "center" }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            style={{ background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "var(--space-1) var(--space-3)", cursor: page === totalPages - 1 ? "not-allowed" : "pointer", opacity: page === totalPages - 1 ? 0.4 : 1, color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}
          >→</button>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: "var(--space-2) var(--space-3)", textAlign: "left", fontWeight: 500, color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {children}
    </th>
  );
}
