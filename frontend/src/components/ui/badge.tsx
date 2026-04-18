import React from "react";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "muted";
export type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
}

const BG: Record<BadgeVariant, string> = {
  default: "color-mix(in srgb, var(--color-border) 60%, transparent)",
  success:  "color-mix(in srgb, var(--color-success) 10%, transparent)",
  warning:  "color-mix(in srgb, var(--color-warning) 10%, transparent)",
  danger:   "color-mix(in srgb, var(--color-danger)  10%, transparent)",
  info:     "color-mix(in srgb, var(--color-info)    10%, transparent)",
  muted:    "color-mix(in srgb, var(--color-muted)   10%, transparent)",
};

const COLOR: Record<BadgeVariant, string> = {
  default: "var(--color-text-secondary)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger:  "var(--color-danger)",
  info:    "var(--color-info)",
  muted:   "var(--color-text-muted)",
};

const FONT: Record<BadgeSize, string> = {
  sm: "10px",
  md: "var(--font-size-xs)",
  lg: "var(--font-size-sm)",
};

const PAD: Record<BadgeSize, string> = {
  sm: "1px 5px",
  md: "2px 6px",
  lg: "3px 9px",
};

export function Badge({ label, variant = "default", size = "md", dot = false, icon }: BadgeProps) {
  const color = COLOR[variant];

  if (dot) {
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-1)",
        fontFamily: "var(--font-mono)",
        fontSize: FONT[size],
        fontWeight: 500,
        color,
      }}>
        {/* Square dot – matches angular aesthetic */}
        <span style={{
          width: 6,
          height: 6,
          borderRadius: 1,
          background: color,
          display: "inline-block",
          flexShrink: 0,
        }} />
        {icon && <span style={{ lineHeight: 1 }}>{icon}</span>}
        {label}
      </span>
    );
  }

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontFamily: "var(--font-mono)",
      fontSize: FONT[size],
      fontWeight: 600,
      color,
      background: BG[variant],
      padding: PAD[size],
      // Angular corners – no pill shape
      borderRadius: "var(--radius-sm)",
      // Left-border accent instead of uniform border
      borderLeft: `2px solid ${color}`,
      whiteSpace: "nowrap",
      letterSpacing: "0.02em",
    }}>
      {icon && <span style={{ lineHeight: 1 }}>{icon}</span>}
      {label}
    </span>
  );
}
