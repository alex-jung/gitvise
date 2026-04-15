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

const HEIGHT: Record<ProgressBarSize, number> = { sm: 4, md: 6, lg: 10 };

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
  const h = HEIGHT[size];

  return (
    <div style={{ width: "100%" }}>
      {label && (
        <div
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
            marginBottom: "var(--space-1)",
          }}
        >
          {label}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <div
          style={{
            flex: 1,
            height: h,
            background: "var(--color-border)",
            borderRadius: "var(--radius-full)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: fill,
              borderRadius: "var(--radius-full)",
              transition: animated ? "width 600ms ease" : undefined,
            }}
          />
        </div>
        {showValue && (
          <span
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-muted)",
              minWidth: 32,
              textAlign: "right",
            }}
          >
            {Math.round(pct)}%
          </span>
        )}
      </div>
    </div>
  );
}
