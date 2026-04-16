import React from "react";

interface FullPageLayoutProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function FullPageLayout({ title, subtitle, action, children }: FullPageLayoutProps) {
  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Page header */}
      <div
        style={{
          padding: "var(--space-5) var(--space-6) var(--space-4)",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-4)",
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              margin: 0,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
                margin: "var(--space-1) 0 0",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-6)" }}>
        {children}
      </div>
    </main>
  );
}
