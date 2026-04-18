export type ProgressBarColor = "primary" | "success" | "warning" | "danger";
export type ProgressBarSize  = "sm" | "md" | "lg";

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: ProgressBarColor;
  /** Automatically choose green/yellow/red based on percentage */
  colorAuto?: boolean;
  showValue?: boolean;
  size?: ProgressBarSize;
  label?: string;
  animated?: boolean;
}

const COLOR_VAR: Record<ProgressBarColor, string> = {
  primary: "var(--color-primary)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger:  "var(--color-danger)",
};

// Segment count and block height per size
const SIZE_CONFIG: Record<ProgressBarSize, { segments: number; height: number }> = {
  sm: { segments: 10, height: 4  },
  md: { segments: 12, height: 6  },
  lg: { segments: 16, height: 10 },
};

function autoColor(pct: number): string {
  if (pct >= 70) return "var(--color-success)";
  if (pct >= 40) return "var(--color-warning)";
  return "var(--color-danger)";
}

export function ProgressBar({
  value,
  max = 100,
  color = "primary",
  colorAuto = false,
  showValue = false,
  size = "md",
  label,
  animated = false,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const fill = colorAuto ? autoColor(pct) : COLOR_VAR[color];
  const { segments, height } = SIZE_CONFIG[size];
  const filledCount = Math.round((pct / 100) * segments);

  return (
    <div style={{ width: "100%" }}>
      {label && (
        <div style={{
          fontSize: "var(--font-size-xs)",
          fontFamily: "var(--font-mono)",
          color: "var(--color-text-muted)",
          marginBottom: "var(--space-1)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}>
          {label}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        {/* Segmented blocks */}
        <div style={{ flex: 1, display: "flex", gap: 2 }}>
          {Array.from({ length: segments }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height,
                borderRadius: 1,
                background: i < filledCount ? fill : "var(--color-border)",
                transition: animated ? "background 300ms ease" : undefined,
                transitionDelay: animated ? `${i * 20}ms` : undefined,
              }}
            />
          ))}
        </div>
        {showValue && (
          <span style={{
            fontSize: "var(--font-size-xs)",
            fontFamily: "var(--font-data)",
            color: "var(--color-text-muted)",
            minWidth: 30,
            textAlign: "right",
          }}>
            {Math.round(pct)}%
          </span>
        )}
      </div>
    </div>
  );
}
