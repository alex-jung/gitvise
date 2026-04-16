import React from "react";

interface WidgetDemoBarProps {
  upgradeUrl?: string;
}

export function WidgetDemoBar({ upgradeUrl = "/settings#license" }: WidgetDemoBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-2) var(--space-4)",
        background: "color-mix(in srgb, var(--color-warning) 10%, transparent)",
        borderBottom: "1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)",
        fontSize: "var(--font-size-xs)",
        color: "var(--color-warning)",
      }}
    >
      <span style={{ fontWeight: 600 }}>Demo mode</span>
      <span style={{ color: "var(--color-text-muted)" }}>·</span>
      <span style={{ color: "var(--color-text-muted)" }}>7 days of data</span>
      <span style={{ color: "var(--color-text-muted)", marginLeft: "auto" }}>
        <a
          href={upgradeUrl}
          style={{ color: "var(--color-warning)", textDecoration: "underline", fontWeight: 500 }}
        >
          Activate license →
        </a>
      </span>
    </div>
  );
}
