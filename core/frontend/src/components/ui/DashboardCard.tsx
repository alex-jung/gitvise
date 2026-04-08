import React from "react";

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  loading?: boolean;
  error?: string;
  /** Set to false for edge-to-edge content (e.g. full-width charts) */
  padding?: boolean;
  children?: React.ReactNode;
}

export function DashboardCard({
  title,
  subtitle,
  icon,
  action,
  loading = false,
  error,
  padding = true,
  children,
}: DashboardCardProps) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-4) var(--space-4) var(--space-3)",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        {icon && (
          <span style={{ color: "var(--color-text-muted)", fontSize: 16, flexShrink: 0 }}>
            {icon}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: "var(--font-size-md)",
              color: "var(--color-text-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 1 }}>
              {subtitle}
            </div>
          )}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: padding ? "var(--space-4)" : 0 }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {[80, 60, 90].map((w, i) => (
              <div
                key={i}
                style={{
                  height: 12,
                  width: `${w}%`,
                  background: "var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                }}
              />
            ))}
          </div>
        ) : error ? (
          <div style={{ color: "var(--color-danger)", fontSize: "var(--font-size-sm)" }}>
            {error}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
