import React from "react";

export type StatCardStatus = "ok" | "warning" | "critical";

interface StatCardProps {
  value: string | number;
  label: string;
  sublabel?: string;
  trend?: number;
  trendLabel?: string;
  /** Invert trend colour – use for metrics where higher = worse (e.g. vuln count) */
  trendInverse?: boolean;
  sparkline?: React.ReactNode;
  icon?: React.ReactNode;
  status?: StatCardStatus;
  loading?: boolean;
  onClick?: () => void;
}

const STATUS_ACCENT: Record<StatCardStatus, string> = {
  ok:       "var(--color-border)",
  warning:  "var(--color-warning)",
  critical: "var(--color-danger)",
};

function TrendIndicator({ trend, inverse }: { trend: number; inverse?: boolean }) {
  const positive = inverse ? trend < 0 : trend > 0;
  const color = trend === 0
    ? "var(--color-text-muted)"
    : positive
    ? "var(--color-success)"
    : "var(--color-danger)";
  const arrow = trend > 0 ? "↑" : trend < 0 ? "↓" : "→";

  return (
    <span style={{
      color,
      fontSize: "var(--font-size-xs)",
      fontFamily: "var(--font-data)",
      fontWeight: 600,
      letterSpacing: "0.02em",
    }}>
      {arrow}{Math.abs(trend)}
    </span>
  );
}

export function StatCard({
  value,
  label,
  sublabel,
  trend,
  trendLabel,
  trendInverse,
  sparkline,
  icon,
  status,
  loading = false,
  onClick,
}: StatCardProps) {
  const accent = status ? STATUS_ACCENT[status] : "var(--color-border)";

  if (loading) {
    return (
      <div style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderLeft: `3px solid var(--color-border)`,
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
        minHeight: 90,
      }}>
        <div style={{ height: 10, width: "40%", background: "var(--color-border)", borderRadius: 1, marginBottom: "var(--space-2)" }} />
        <div style={{ height: 28, width: "55%", background: "var(--color-border)", borderRadius: 1 }} />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderLeft: `3px solid ${accent}`,
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 150ms, background 150ms",
      }}
    >
      {/* Label row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
        <span style={{
          fontSize: "var(--font-size-xs)",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: "var(--color-text-muted)",
          fontWeight: 600,
        }}>
          {label}
        </span>
        {icon && <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>{icon}</span>}
      </div>

      {/* Value + trend */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <span style={{
          fontSize: "var(--font-size-2xl)",
          fontWeight: 700,
          fontFamily: "var(--font-data)",
          color: "var(--color-text-primary)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}>
          {value}
        </span>
        {trend !== undefined && (
          <TrendIndicator trend={trend} inverse={trendInverse} />
        )}
      </div>

      {(sublabel || trendLabel) && (
        <div style={{
          fontSize: "var(--font-size-xs)",
          fontFamily: "var(--font-mono)",
          color: "var(--color-text-muted)",
          marginTop: "var(--space-1)",
        }}>
          {sublabel ?? trendLabel}
        </div>
      )}

      {sparkline && <div style={{ marginTop: "var(--space-3)" }}>{sparkline}</div>}
    </div>
  );
}
