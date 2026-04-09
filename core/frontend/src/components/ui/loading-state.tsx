interface LoadingStateProps {
  rows?: number;
}

export function LoadingState({ rows = 5 }: LoadingStateProps) {
  return (
    <div style={{ padding: "var(--space-2) 0" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 44,
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface)",
            marginBottom: "var(--space-2)",
            opacity: 1 - i * 0.15,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
