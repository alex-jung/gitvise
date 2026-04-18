export type ProgressBarColor = "primary" | "success" | "warning" | "danger";
export type ProgressBarSize  = "sm" | "md" | "lg";

interface ProgressBarProps {
  value: number;
  max?: number;
  /** Named color token or any CSS color string */
  color?: ProgressBarColor | string;
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

// Segment count and heights per size.
// filledHeight: colored/active blocks  emptyHeight: gray track blocks (shorter)
const SIZE_CONFIG: Record<ProgressBarSize, { segments: number; filledHeight: number; emptyHeight: number }> = {
  sm: { segments: 10, filledHeight: 5,  emptyHeight: 3  },
  md: { segments: 12, filledHeight: 7,  emptyHeight: 4  },
  lg: { segments: 16, filledHeight: 11, emptyHeight: 6  },
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
  const fill = colorAuto ? autoColor(pct) : (COLOR_VAR[color as ProgressBarColor] ?? color ?? COLOR_VAR.primary);
  const { segments, filledHeight, emptyHeight } = SIZE_CONFIG[size];
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
        <div style={{ flex: 1, display: "flex", gap: 2, alignItems: "center" }}>
          {Array.from({ length: segments }, (_, i) => {
            const active = i < filledCount;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: active ? filledHeight : emptyHeight,
                  borderRadius: 1,
                  background: active ? fill : "var(--color-border)",
                  transition: animated ? "background 300ms ease, height 300ms ease" : undefined,
                  transitionDelay: animated ? `${i * 20}ms` : undefined,
                }}
              />
            );
          })}
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
