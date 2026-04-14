"use client";

import React from "react";

export interface WidgetDef {
  id: string;
  type: string;
  title: string;
  defaultSize?: string;
  tier: string;
  pluginId: string;
  pluginName: string;
  pluginTier: string;
  config?: Record<string, { type: string; label: string; default?: unknown; tier?: string }>;
}

interface WidgetCatalogProps {
  open: boolean;
  onClose: () => void;
  allWidgets: WidgetDef[];
  activeWidgetIds: string[];
  hasLicense: boolean;
  onAdd: (def: WidgetDef) => void;
}

export function WidgetCatalog({
  open,
  onClose,
  allWidgets,
  activeWidgetIds,
  hasLicense,
  onAdd,
}: WidgetCatalogProps) {
  if (!open) return null;

  const activeSet = new Set(activeWidgetIds);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.35)",
        }}
      />

      {/* Slide-in panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 300,
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-4) var(--space-5)",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: "var(--font-size-md)",
              color: "var(--color-text-primary)",
            }}
          >
            Widget-Katalog
          </span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-text-muted)",
              fontSize: 20,
              cursor: "pointer",
              padding: "var(--space-1)",
              borderRadius: "var(--radius-sm)",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Widget list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-3)" }}>
          {allWidgets.length === 0 && (
            <div
              style={{
                padding: "var(--space-8)",
                textAlign: "center",
                color: "var(--color-text-muted)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              Keine Widgets verfügbar
            </div>
          )}

          {allWidgets.map((w) => {
            const added = activeSet.has(w.id);
            const locked = w.tier === "pro" && !hasLicense;

            return (
              <div
                key={w.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "var(--space-2)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  opacity: locked ? 0.55 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 500,
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {w.title}
                    </span>
                    {w.tier === "pro" && (
                      <span
                        style={{
                          fontSize: "var(--font-size-xs)",
                          padding: "1px 5px",
                          borderRadius: "var(--radius-full)",
                          background:
                            "color-mix(in srgb, var(--color-warning) 20%, transparent)",
                          color: "var(--color-warning)",
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        Pro
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {w.pluginName} · {w.defaultSize ?? "1/3"}
                  </div>
                </div>

                <button
                  onClick={() => !added && !locked && onAdd(w)}
                  disabled={added || locked}
                  title={
                    locked
                      ? "Pro-Feature – Lizenz erforderlich"
                      : added
                      ? "Bereits im Dashboard"
                      : "Zum Dashboard hinzufügen"
                  }
                  style={{
                    flexShrink: 0,
                    width: 28,
                    height: 28,
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    background: added
                      ? "var(--color-border)"
                      : locked
                      ? "var(--color-border)"
                      : "var(--color-primary)",
                    color: added
                      ? "var(--color-text-muted)"
                      : "var(--color-text-inverse)",
                    fontSize: locked ? 13 : 18,
                    cursor: added || locked ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  {locked ? "🔒" : added ? "✓" : "+"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
