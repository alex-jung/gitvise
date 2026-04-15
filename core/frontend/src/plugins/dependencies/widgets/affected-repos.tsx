"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Summary { affectedRepos: number; total: number; critical: number; high: number }

interface AffectedRepo {
  repoFullName: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

const SEV_COLOR: Record<string, string> = {
  critical: "var(--color-danger)",
  high: "color-mix(in srgb, var(--color-danger) 60%, var(--color-warning))",
  medium: "var(--color-warning)",
};

export function AffectedRepos({ config: _ }: { config: Record<string, unknown> }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [repos, setRepos] = useState<AffectedRepo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<Summary>("/api/core/deps/summary"),
      apiGet<AffectedRepo[]>("/api/core/deps/affected-repos?limit=5"),
    ])
      .then(([sum, reps]) => { setSummary(sum); setRepos(reps); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {[60, 80, 50, 70, 40].map((w, i) => (
          <div key={i} style={{ height: 10, width: `${w}%`, background: "var(--color-border)", borderRadius: "var(--radius-sm)" }} />
        ))}
      </div>
    );
  }

  if (!summary || summary.affectedRepos === 0) {
    return (
      <div style={{ color: "var(--color-success)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>
        ✓ No repositories affected.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: summary.critical > 0 ? "var(--color-danger)" : "var(--color-warning)" }}>
          {summary.affectedRepos}
        </span>
        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>repos affected</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {repos.map((r) => {
          const worstSev = r.critical > 0 ? "critical" : r.high > 0 ? "high" : r.medium > 0 ? "medium" : null;
          return (
            <div key={r.repoFullName} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                {r.repoFullName.split("/")[1] ?? r.repoFullName}
              </span>
              <span style={{
                flexShrink: 0,
                fontSize: "var(--font-size-xs)",
                fontWeight: 600,
                color: worstSev ? SEV_COLOR[worstSev] : "var(--color-text-muted)",
              }}>
                {r.total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
