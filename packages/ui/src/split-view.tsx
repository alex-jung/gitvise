import React from "react";

interface SplitViewProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftLabel?: string;
  rightLabel?: string;
  /** Left panel width as a fraction 0–1 (default 0.5) */
  ratio?: number;
  /** Orientation (default "horizontal") */
  orientation?: "horizontal" | "vertical";
  /** Gap between panels */
  gap?: string;
}

export function SplitView({
  left,
  right,
  leftLabel,
  rightLabel,
  ratio = 0.5,
  orientation = "horizontal",
  gap = "var(--space-4)",
}: SplitViewProps) {
  const isHorizontal = orientation === "horizontal";
  const leftFlex = ratio;
  const rightFlex = 1 - ratio;

  const panelStyle = (flex: number): React.CSSProperties => ({
    flex,
    minWidth: 0,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  });

  const labelStyle: React.CSSProperties = {
    fontSize: "var(--font-size-xs)",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: "var(--space-2)",
  };

  const dividerStyle: React.CSSProperties = isHorizontal
    ? {
        width: 1,
        alignSelf: "stretch",
        background: "var(--color-border)",
        flexShrink: 0,
      }
    : {
        height: 1,
        background: "var(--color-border)",
        flexShrink: 0,
      };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        gap,
        width: "100%",
        height: "100%",
      }}
    >
      {/* Left / Top */}
      <div style={panelStyle(leftFlex)}>
        {leftLabel && <div style={labelStyle}>{leftLabel}</div>}
        <div style={{ flex: 1 }}>{left}</div>
      </div>

      {/* Divider */}
      <div style={dividerStyle} />

      {/* Right / Bottom */}
      <div style={panelStyle(rightFlex)}>
        {rightLabel && <div style={labelStyle}>{rightLabel}</div>}
        <div style={{ flex: 1 }}>{right}</div>
      </div>
    </div>
  );
}
