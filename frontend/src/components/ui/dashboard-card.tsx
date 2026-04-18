import React from "react";
import { WidgetDemoBar } from "./widget-demo-bar";

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  loading?: boolean;
  error?: string;
  /** Set to false for edge-to-edge content (e.g. full-width charts) */
  padding?: boolean;
  /** Shows a demo-mode banner below the header */
  demoMode?: boolean;
  /** Left accent color – defaults to primary */
  accent?: string;
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
  demoMode = false,
  accent,
  children,
}: DashboardCardProps) {
  const accentColor = accent ?? "var(--color-primary)";

  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header – no separator line, tighter padding */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-3) var(--space-4)",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}>
        {icon && (
          <span style={{ color: "var(--color-text-muted)", fontSize: 13, flexShrink: 0, lineHeight: 1 }}>
            {icon}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600,
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-mono)",
            color: "var(--color-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
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

      {demoMode && <WidgetDemoBar />}

      {/* Body */}
      <div style={{ flex: 1, padding: padding ? "var(--space-4)" : 0 }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", padding: padding ? 0 : "var(--space-4)" }}>
            {[70, 90, 55].map((w, i) => (
              <div key={i} style={{ height: 10, width: `${w}%`, background: "var(--color-border)", borderRadius: 1 }} />
            ))}
          </div>
        ) : error ? (
          <div style={{ color: "var(--color-danger)", fontSize: "var(--font-size-sm)", fontFamily: "var(--font-mono)" }}>
            {error}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
