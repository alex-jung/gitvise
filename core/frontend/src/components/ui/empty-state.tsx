interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = "◫", title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-12, 3rem) var(--space-6)",
        textAlign: "center",
        gap: "var(--space-3)",
      }}
    >
      <span style={{ fontSize: 32, opacity: 0.4 }}>{icon}</span>
      <p style={{ fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>{title}</p>
      {description && (
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", margin: 0, maxWidth: 320 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: "var(--space-2)" }}>{action}</div>}
    </div>
  );
}
