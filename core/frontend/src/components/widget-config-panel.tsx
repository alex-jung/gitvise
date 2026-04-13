"use client";

import React from "react";

interface ConfigFieldDef {
  type: "number" | "boolean" | "select" | "string";
  label: string;
  default?: unknown;
  min?: number;
  max?: number;
  options?: string[];
  tier?: "pro";
}

interface WidgetDef {
  id: string;
  title: string;
  config?: Record<string, ConfigFieldDef>;
}

interface Props {
  widgetDef: WidgetDef;
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  hasLicense: boolean;
}

export function WidgetConfigPanel({ widgetDef, config, onChange, hasLicense }: Props) {
  const fields = widgetDef.config ?? {};
  const entries = Object.entries(fields);

  if (entries.length === 0) {
    return (
      <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", padding: "var(--space-4)" }}>
        No configuration options for this widget.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {entries.map(([key, field]) => {
        const isPro = field.tier === "pro";
        const isDisabled = isPro && !hasLicense;
        const currentValue = key in config ? config[key] : field.default;

        return (
          <div key={key}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
              <label style={{ fontSize: "var(--font-size-sm)", fontWeight: 500, color: isDisabled ? "var(--color-text-muted)" : "var(--color-text-primary)" }}>
                {field.label}
              </label>
              {isPro && (
                <span style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: 600,
                  color: "var(--color-warning)",
                  background: "color-mix(in srgb, var(--color-warning) 15%, transparent)",
                  padding: "1px var(--space-2)",
                  borderRadius: "var(--radius-sm)",
                }}>
                  {hasLicense ? "Pro" : "🔒 Pro"}
                </span>
              )}
            </div>

            {field.type === "boolean" ? (
              <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: isDisabled ? "not-allowed" : "pointer" }}>
                <input
                  type="checkbox"
                  checked={Boolean(currentValue)}
                  disabled={isDisabled}
                  onChange={(e) => !isDisabled && onChange(key, e.target.checked)}
                  style={{ cursor: isDisabled ? "not-allowed" : "pointer" }}
                />
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>Enabled</span>
              </label>
            ) : field.type === "select" ? (
              <select
                value={String(currentValue ?? "")}
                disabled={isDisabled}
                onChange={(e) => !isDisabled && onChange(key, e.target.value)}
                style={{
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  color: isDisabled ? "var(--color-text-muted)" : "var(--color-text-primary)",
                  fontSize: "var(--font-size-sm)",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  opacity: isDisabled ? 0.6 : 1,
                }}
              >
                {(field.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type === "number" ? "number" : "text"}
                value={String(currentValue ?? "")}
                min={field.min}
                max={field.max}
                disabled={isDisabled}
                onChange={(e) => {
                  if (isDisabled) return;
                  const val = field.type === "number" ? Number(e.target.value) : e.target.value;
                  onChange(key, val);
                }}
                style={{
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  color: isDisabled ? "var(--color-text-muted)" : "var(--color-text-primary)",
                  fontSize: "var(--font-size-sm)",
                  cursor: isDisabled ? "not-allowed" : "text",
                  opacity: isDisabled ? 0.6 : 1,
                  boxSizing: "border-box",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
