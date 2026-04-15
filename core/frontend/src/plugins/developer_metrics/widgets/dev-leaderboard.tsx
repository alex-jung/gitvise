"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Config { days?: number; limit?: number }

interface LeaderboardRow {
  login: string;
  displayName: string;
  commits: number;
  prsOpened: number;
  prsMerged: number;
  avgCycleTimeHours: number | null;
}

function fmtHours(h: number | null): string {
  if (h === null) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${Math.round(h)}h`;
  const d = Math.floor(h / 24);
  const rem = Math.round(h % 24);
  return rem > 0 ? `${d}d ${rem}h` : `${d}d`;
}

export function DevLeaderboard({ config }: { config: Record<string, unknown> }) {
  const days = (config as Config).days ?? 30;
  const limit = (config as Config).limit ?? 20;
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<LeaderboardRow[]>(`/api/core/dev/leaderboard?days=${days}&limit=${limit}`)
      .then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, [days, limit]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {[60, 80, 50, 70, 65].map((w, i) => (
          <div key={i} style={{ height: 10, width: `${w}%`, background: "var(--color-border)", borderRadius: "var(--radius-sm)" }} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", textAlign: "center", padding: "var(--space-4)" }}>No data in last {days} days.</div>;
  }

  const maxCommits = Math.max(...rows.map((r) => r.commits), 1);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
        <thead>
          <tr style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <th style={{ textAlign: "left", padding: "var(--space-2) var(--space-3)", fontWeight: 500 }}>Developer</th>
            <th style={{ textAlign: "right", padding: "var(--space-2) var(--space-3)", fontWeight: 500 }}>Commits</th>
            <th style={{ textAlign: "right", padding: "var(--space-2) var(--space-3)", fontWeight: 500 }}>PRs opened</th>
            <th style={{ textAlign: "right", padding: "var(--space-2) var(--space-3)", fontWeight: 500 }}>PRs merged</th>
            <th style={{ textAlign: "right", padding: "var(--space-2) var(--space-3)", fontWeight: 500 }}>Avg cycle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.login} style={{ borderTop: idx > 0 ? "1px solid var(--color-border-subtle)" : undefined }}>
              <td style={{ padding: "var(--space-2) var(--space-3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", width: 18, textAlign: "right", flexShrink: 0 }}>
                    {idx + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{r.displayName}</div>
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontFamily: "monospace" }}>{r.login}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)", textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "var(--space-2)" }}>
                  <div style={{ width: 60, height: 4, borderRadius: 2, background: "var(--color-border)", overflow: "hidden" }}>
                    <div style={{ width: `${(r.commits / maxCommits) * 100}%`, height: "100%", background: "var(--color-primary)", borderRadius: 2 }} />
                  </div>
                  <span style={{ fontWeight: 600, color: "var(--color-text-primary)", minWidth: 28, textAlign: "right" }}>{r.commits}</span>
                </div>
              </td>
              <td style={{ padding: "var(--space-2) var(--space-3)", textAlign: "right", color: "var(--color-text-muted)" }}>{r.prsOpened}</td>
              <td style={{ padding: "var(--space-2) var(--space-3)", textAlign: "right", color: r.prsMerged > 0 ? "var(--color-success)" : "var(--color-text-muted)", fontWeight: r.prsMerged > 0 ? 600 : 400 }}>{r.prsMerged}</td>
              <td style={{ padding: "var(--space-2) var(--space-3)", textAlign: "right", color: "var(--color-text-muted)", fontFamily: "monospace", fontSize: "var(--font-size-xs)" }}>
                {fmtHours(r.avgCycleTimeHours)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
