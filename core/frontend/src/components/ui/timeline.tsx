import React from "react";

export interface TimelineEvent {
  date: string;
  label: string;
  description?: string;
  /** CSS color for the dot and accent. Defaults to var(--color-primary). */
  color?: string;
  /** Small icon / emoji shown inside the dot */
  icon?: string;
  /** "success" | "warning" | "danger" | "info" – maps to CSS color variable */
  variant?: "success" | "warning" | "danger" | "info" | "default";
}

interface TimelineProps {
  events: TimelineEvent[];
  /** Show newest first (default: true) */
  newestFirst?: boolean;
}

const VARIANT_COLOR: Record<string, string> = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  info: "var(--color-info)",
  default: "var(--color-primary)",
};

export function Timeline({ events, newestFirst = true }: TimelineProps) {
  if (!events.length) return null;

  const ordered = newestFirst ? [...events].reverse() : events;

  return (
    <div style={{ position: "relative", padding: "var(--space-1) 0" }}>
      {/* Vertical line */}
      <div
        style={{
          position: "absolute",
          left: 15,
          top: 8,
          bottom: 8,
          width: 2,
          background: "var(--color-border)",
          borderRadius: 1,
        }}
      />

      {ordered.map((event, i) => {
        const color =
          event.color ??
          VARIANT_COLOR[event.variant ?? "default"] ??
          "var(--color-primary)";

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-4)",
              position: "relative",
              marginBottom:
                i < ordered.length - 1 ? "var(--space-5)" : 0,
            }}
          >
            {/* Dot */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-full)",
                background: `color-mix(in srgb, ${color} 15%, transparent)`,
                border: `2px solid ${color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 13,
                color,
                zIndex: 1,
              }}
            >
              {event.icon ?? "●"}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "var(--space-3)",
                  flexWrap: "wrap",
                  marginBottom: event.description ? "var(--space-1)" : 0,
                }}
              >
                <span
                  style={{
                    fontWeight: 500,
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {event.label}
                </span>
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {event.date}
                </span>
              </div>
              {event.description && (
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {event.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
