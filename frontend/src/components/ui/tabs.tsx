"use client";

export interface Tab<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string = string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (value: T) => void;
}

export function Tabs<T extends string = string>({ tabs, active, onChange }: TabsProps<T>) {
  return (
    <div
      style={{
        display: "flex",
        gap: "var(--space-1)",
        borderBottom: "1px solid var(--color-border)",
        marginBottom: "var(--space-4)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: "transparent",
              border: "none",
              borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
              color: isActive ? "var(--color-text-primary)" : "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
              fontWeight: isActive ? 600 : 400,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              marginBottom: -1,
              transition: "color 120ms",
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  padding: "1px 6px",
                  borderRadius: "var(--radius-full)",
                  background: isActive ? "var(--color-primary)" : "var(--color-surface)",
                  color: isActive ? "var(--color-text-inverse)" : "var(--color-text-muted)",
                  fontWeight: 600,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
