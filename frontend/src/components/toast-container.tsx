"use client";

import { useToast, type Toast } from "@/context/toast-context";

const ICON: Record<Toast["type"], string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✕",
};

const BORDER_COLOR: Record<Toast["type"], string> = {
  info: "var(--color-info)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error: "var(--color-danger)",
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "var(--space-8)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          style={{
            pointerEvents: "auto",
            cursor: "pointer",
            background: "var(--color-surface-raised)",
            border: `1px solid ${BORDER_COLOR[toast.type]}`,
            borderRadius: "var(--radius-lg)",
            padding: "var(--space-3) var(--space-5)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            boxShadow: "var(--shadow-md)",
            fontSize: "var(--font-size-md)",
            color: "var(--color-text-primary)",
            whiteSpace: "nowrap",
            animation: "toast-in 200ms ease",
          }}
        >
          <span style={{ color: BORDER_COLOR[toast.type], fontWeight: 600 }}>
            {ICON[toast.type]}
          </span>
          {toast.message}
        </div>
      ))}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
