import React from "react";

interface ProLockProps {
  /** URL to the upgrade/license settings page */
  upgradeUrl?: string;
  children?: React.ReactNode;
}

/**
 * Overlay that dims widget content and shows an upgrade prompt for pro features.
 * Wrap the widget content that should be locked behind Pro.
 */
export function ProLock({ upgradeUrl = "/settings#license", children }: ProLockProps) {
  return (
    <div style={{ position: "relative" }}>
      {/* Dimmed content */}
      <div style={{ opacity: 0.25, pointerEvents: "none", userSelect: "none" }}>
        {children}
      </div>

      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-3)",
          background: "rgba(0,0,0,0.04)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <span style={{ fontSize: 24 }}>🔒</span>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: "var(--font-size-md)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-1)",
            }}
          >
            Pro feature
          </div>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
            Upgrade to unlock this widget
          </div>
        </div>
        <a
          href={upgradeUrl}
          style={{
            padding: "var(--space-2) var(--space-4)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-primary)",
            color: "var(--color-text-inverse)",
            fontSize: "var(--font-size-sm)",
            fontWeight: 600,
            textDecoration: "none",
            transition: "opacity 150ms",
          }}
        >
          Activate license
        </a>
      </div>
    </div>
  );
}
