function healthColor(score: number): string {
  if (score >= 80) return "var(--color-success)";
  if (score >= 60) return "var(--color-warning)";
  if (score >= 40) return "color-mix(in srgb, var(--color-warning) 50%, var(--color-danger))";
  return "var(--color-danger)";
}

const SEGS = 10;

export function HealthBadge({ score }: { score: number }) {
  const color = healthColor(score);
  return (
    <span style={{
      fontFamily: "var(--font-data)",
      fontWeight: 700,
      fontSize: "var(--font-size-sm)",
      color,
      background: `color-mix(in srgb, ${color} 10%, transparent)`,
      padding: "1px 6px",
      borderRadius: "var(--radius-sm)",
      borderLeft: `2px solid ${color}`,
      letterSpacing: "0.02em",
    }}>
      {score}
    </span>
  );
}

export function HealthBar({ score }: { score: number }) {
  const color = healthColor(score);
  const filled = Math.round((score / 100) * SEGS);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ display: "flex", flex: 1, gap: 2 }}>
        {Array.from({ length: SEGS }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 1,
              background: i < filled ? color : "var(--color-border)",
            }}
          />
        ))}
      </div>
      <span style={{
        fontFamily: "var(--font-data)",
        fontSize: 11,
        color: "var(--color-text-muted)",
        width: 22,
        textAlign: "right",
        flexShrink: 0,
      }}>
        {score}
      </span>
    </div>
  );
}
