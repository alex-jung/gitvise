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

const STATUS_BORDER: Record<StatCardStatus, string> = {
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
    <span style={{ color, fontSize: "var(--font-size-sm)", fontWeight: 500 }}>
      {arrow} {Math.abs(trend)}
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
  const border = status ? STATUS_BORDER[status] : "var(--color-border)";

  if (loading) {
    return (
      <div
        style={{
          background: "var(--color-surface)",
          border: `1px solid var(--color-border)`,
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-4)",
          minHeight: 90,
        }}
      >
        <div style={{ height: 12, width: "40%", background: "var(--color-border)", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-2)" }} />
        <div style={{ height: 28, width: "60%", background: "var(--color-border)", borderRadius: "var(--radius-sm)" }} />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--color-surface)",
        border: `1px solid ${border}`,
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 150ms",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
        <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
          {label}
        </span>
        {icon && <span style={{ color: "var(--color-text-muted)", fontSize: 16 }}>{icon}</span>}
      </div>

      {/* Value */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <span style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1 }}>
          {value}
        </span>
        {trend !== undefined && (
          <TrendIndicator trend={trend} inverse={trendInverse} />
        )}
      </div>

      {/* Sublabel / trend label */}
      {(sublabel || trendLabel) && (
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
          {sublabel ?? trendLabel}
        </div>
      )}

      {/* Sparkline */}
      {sparkline && <div style={{ marginTop: "var(--space-3)" }}>{sparkline}</div>}
    </div>
  );
}
