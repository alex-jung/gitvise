"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Gauge, ProgressBar } from "@/components/ui";
import type { GaugeZone } from "@/components/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Summary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  affectedRepos: number;
  securityScore: number;
  lastSyncedAt: string | null;
}

interface Alert {
  repoFullName: string;
  alertNumber: number;
  packageName: string;
  ecosystem: string | null;
  severity: string;
  summary: string | null;
  cveId: string | null;
  createdAt: string | null;
}

interface LicenseCount { license: string; count: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  critical: "var(--color-danger)",
  high: "color-mix(in srgb, var(--color-danger) 60%, var(--color-warning))",
  medium: "var(--color-warning)",
  low: "var(--color-text-muted)",
};

const GAUGE_ZONES: GaugeZone[] = [
  { from: 0,  to: 40,  color: "var(--color-danger)" },
  { from: 40, to: 70,  color: "var(--color-warning)" },
  { from: 70, to: 100, color: "var(--color-success)" },
];

function SevBadge({ severity }: { severity: string }) {
  const color = SEV_COLOR[severity] ?? "var(--color-text-muted)";
  return (
    <span style={{ fontSize: "var(--font-size-xs)", padding: "1px 7px", borderRadius: "var(--radius-full)", background: `color-mix(in srgb, ${color} 15%, transparent)`, color, fontWeight: 600, textTransform: "capitalize" }}>
      {severity}
    </span>
  );
}

function StatPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "var(--space-3) var(--space-5)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", minWidth: 90 }}>
      <span style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, color: color ?? "var(--color-text-primary)" }}>{value}</span>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DependenciesPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [licenses, setLicenses] = useState<LicenseCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sevFilter, setSevFilter] = useState<string>("all");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sum, alertList, licList] = await Promise.all([
        apiGet<Summary>("/api/core/deps/summary"),
        apiGet<Alert[]>("/api/core/deps/alerts?limit=500"),
        apiGet<LicenseCount[]>("/api/core/deps/licenses?limit=15"),
      ]);
      setSummary(sum);
      setAlerts(alertList);
      setLicenses(licList);
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

  const sevOptions = ["all", "critical", "high", "medium", "low"];
  const filtered = sevFilter === "all" ? alerts : alerts.filter((a) => a.severity === sevFilter);

  const scoreColor = !summary ? "var(--color-text-primary)"
    : summary.securityScore >= 70 ? "var(--color-success)"
    : summary.securityScore >= 40 ? "var(--color-warning)"
    : "var(--color-danger)";

  return (
    <main style={{ flex: 1, padding: "var(--space-6)", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>Dependencies &amp; Security</h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", margin: "var(--space-1) 0 0" }}>
            Dependabot vulnerability alerts and license distribution
          </p>
        </div>
        <button
          onClick={triggerSync}
          disabled={syncing}
          style={{ padding: "var(--space-2) var(--space-4)", borderRadius: "var(--radius-md)", background: "var(--color-primary)", color: "var(--color-text-inverse)", border: "none", fontSize: "var(--font-size-sm)", fontWeight: 500, cursor: syncing ? "not-allowed" : "pointer", opacity: syncing ? 0.6 : 1 }}
        >
          {syncing ? "Syncing..." : "↻ Sync"}
        </button>
      </div>

      {loading ? (
        <LoadingState rows={8} />
      ) : (
        <>
          {/* Top row: stat pills + gauge */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "var(--space-5)", marginBottom: "var(--space-6)", alignItems: "start" }}>
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <StatPill label="Open alerts" value={summary?.total ?? 0} color={summary && summary.total > 0 ? SEV_COLOR[summary.critical > 0 ? "critical" : summary.high > 0 ? "high" : "medium"] : "var(--color-success)"} />
              <StatPill label="Critical" value={summary?.critical ?? 0} color={(summary?.critical ?? 0) > 0 ? SEV_COLOR.critical : undefined} />
              <StatPill label="High" value={summary?.high ?? 0} color={(summary?.high ?? 0) > 0 ? SEV_COLOR.high : undefined} />
              <StatPill label="Medium" value={summary?.medium ?? 0} color={(summary?.medium ?? 0) > 0 ? SEV_COLOR.medium : undefined} />
              <StatPill label="Low" value={summary?.low ?? 0} />
              <StatPill label="Affected repos" value={summary?.affectedRepos ?? 0} />
            </div>
            <div style={{ width: 200 }}>
              <Gauge
                value={summary?.securityScore ?? 100}
                min={0}
                max={100}
                zones={GAUGE_ZONES}
                label="Security Score"
                size={180}
              />
            </div>
          </div>

          {/* Alerts table */}
          {summary?.total === 0 ? (
            <EmptyState icon="⚑" title="No open vulnerabilities" description="Dependabot found no open alerts across your repositories." />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>Severity:</span>
                {sevOptions.map((sev) => {
                  const count = sev === "all" ? alerts.length : alerts.filter((a) => a.severity === sev).length;
                  return (
                    <button
                      key={sev}
                      onClick={() => setSevFilter(sev)}
                      style={{
                        padding: "var(--space-1) var(--space-3)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--color-border)",
                        background: sevFilter === sev ? "var(--color-primary)" : "transparent",
                        color: sevFilter === sev ? "var(--color-text-inverse)" : "var(--color-text-muted)",
                        fontSize: "var(--font-size-xs)",
                        cursor: "pointer",
                        fontWeight: sevFilter === sev ? 600 : 400,
                        textTransform: "capitalize",
                      }}
                    >
                      {sev} {count > 0 && <span style={{ opacity: 0.8 }}>({count})</span>}
                    </button>
                  );
                })}
              </div>

              <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden", marginBottom: "var(--space-6)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Repository</th>
                      <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Package</th>
                      <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Ecosystem</th>
                      <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Severity</th>
                      <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>CVE</th>
                      <th style={{ textAlign: "left", padding: "var(--space-3) var(--space-4)" }}>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr key={`${a.repoFullName}#${a.alertNumber}`} style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
                        <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{a.repoFullName}</span>
                        </td>
                        <td style={{ padding: "var(--space-3) var(--space-4)", fontWeight: 500, color: "var(--color-text-primary)" }}>{a.packageName}</td>
                        <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>{a.ecosystem ?? "—"}</td>
                        <td style={{ padding: "var(--space-3) var(--space-4)" }}><SevBadge severity={a.severity} /></td>
                        <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                          {a.cveId ? (
                            <span style={{ fontFamily: "monospace", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{a.cveId}</span>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "var(--space-3) var(--space-4)", color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.summary ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* License distribution */}
          {licenses.length > 0 && (
            <>
              <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, margin: "0 0 var(--space-4)", color: "var(--color-text-primary)" }}>License Distribution</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {licenses.map((l) => {
                  const total = licenses.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? Math.round(l.count / total * 100) : 0;
                  return (
                    <div key={l.license} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <span style={{ width: 140, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {l.license}
                      </span>
                      <div style={{ flex: 1 }}>
                        <ProgressBar value={pct} max={100} color="primary" size="sm" animated />
                      </div>
                      <span style={{ width: 60, fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textAlign: "right", flexShrink: 0 }}>
                        {l.count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
