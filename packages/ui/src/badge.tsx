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
  default: "var(--color-border)",
  success:  "color-mix(in srgb, var(--color-success) 20%, transparent)",
  warning:  "color-mix(in srgb, var(--color-warning) 20%, transparent)",
  danger:   "color-mix(in srgb, var(--color-danger)  20%, transparent)",
  info:     "color-mix(in srgb, var(--color-info)    20%, transparent)",
  muted:    "color-mix(in srgb, var(--color-muted)   20%, transparent)",
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
  sm: "var(--font-size-xs)",
  md: "var(--font-size-sm)",
  lg: "var(--font-size-md)",
};

const PAD: Record<BadgeSize, string> = {
  sm: "1px 5px",
  md: "2px 7px",
  lg: "3px 10px",
};

export function Badge({ label, variant = "default", size = "md", dot = false, icon }: BadgeProps) {
  const color = COLOR[variant];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-1)",
        background: dot ? "transparent" : BG[variant],
        color,
        fontSize: FONT[size],
        fontWeight: 500,
        padding: dot ? 0 : PAD[size],
        borderRadius: "var(--radius-full)",
        whiteSpace: "nowrap",
      }}
    >
      {dot && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "var(--radius-full)",
            background: color,
            display: "inline-block",
            flexShrink: 0,
          }}
        />
      )}
      {icon && <span style={{ lineHeight: 1 }}>{icon}</span>}
      {label}
    </span>
  );
}
