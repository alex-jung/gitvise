import React from "react";

export type AlertVariant = "info" | "success" | "warning" | "danger";

interface AlertBannerProps {
  variant?: AlertVariant;
  title?: string;
  message: React.ReactNode;
  onDismiss?: () => void;
}

const STYLES: Record<AlertVariant, { bg: string; border: string; color: string; icon: string }> = {
  info:    { bg: "color-mix(in srgb, var(--color-info)    12%, transparent)", border: "var(--color-info)",    color: "var(--color-info)",    icon: "ℹ" },
  success: { bg: "color-mix(in srgb, var(--color-success) 12%, transparent)", border: "var(--color-success)", color: "var(--color-success)", icon: "✓" },
  warning: { bg: "color-mix(in srgb, var(--color-warning) 12%, transparent)", border: "var(--color-warning)", color: "var(--color-warning)", icon: "⚠" },
  danger:  { bg: "color-mix(in srgb, var(--color-danger)  12%, transparent)", border: "var(--color-danger)",  color: "var(--color-danger)",  icon: "✕" },
};

export function AlertBanner({ variant = "info", title, message, onDismiss }: AlertBannerProps) {
  const s = STYLES[variant];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-4)",
        borderRadius: "var(--radius-md)",
        background: s.bg,
        border: `1px solid ${s.border}`,
        fontSize: "var(--font-size-sm)",
      }}
    >
      <span style={{ color: s.color, flexShrink: 0, fontWeight: 700, marginTop: 1 }}>
        {s.icon}
      </span>
      <div style={{ flex: 1 }}>
        {title && (
          <div style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "var(--space-1)" }}>
            {title}
          </div>
        )}
        <div style={{ color: "var(--color-text-secondary)" }}>{message}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            flexShrink: 0,
            padding: 0,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
