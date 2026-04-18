import React from "react";

export type AlertVariant = "info" | "success" | "warning" | "danger";

interface AlertBannerProps {
  variant?: AlertVariant;
  title?: string;
  message: React.ReactNode;
  onDismiss?: () => void;
}

const STYLES: Record<AlertVariant, { border: string; color: string; label: string }> = {
  info:    { border: "var(--color-info)",    color: "var(--color-info)",    label: "info"  },
  success: { border: "var(--color-success)", color: "var(--color-success)", label: "ok"    },
  warning: { border: "var(--color-warning)", color: "var(--color-warning)", label: "warn"  },
  danger:  { border: "var(--color-danger)",  color: "var(--color-danger)",  label: "error" },
};

export function AlertBanner({ variant = "info", title, message, onDismiss }: AlertBannerProps) {
  const s = STYLES[variant];

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "var(--space-3)",
      padding: "var(--space-3) var(--space-4)",
      // Left-border only – no background fill
      borderTop: "1px solid var(--color-border-subtle)",
      borderRight: "1px solid var(--color-border-subtle)",
      borderBottom: "1px solid var(--color-border-subtle)",
      borderLeft: `4px solid ${s.border}`,
      borderRadius: `0 var(--radius-md) var(--radius-md) 0`,
      fontSize: "var(--font-size-sm)",
    }}>
      {/* Mono level label */}
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--font-size-xs)",
        fontWeight: 700,
        color: s.color,
        flexShrink: 0,
        marginTop: 1,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}>
        {s.label}
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
            fontSize: 14,
            lineHeight: 1,
            flexShrink: 0,
            padding: 0,
            fontFamily: "var(--font-mono)",
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
