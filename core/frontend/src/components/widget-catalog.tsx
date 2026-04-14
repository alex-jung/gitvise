"use client";

import React, { useState, useMemo } from "react";

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
  const [query, setQuery] = useState("");

  if (!open) return null;

  const activeSet = new Set(activeWidgetIds);
  const q = query.trim().toLowerCase();

  const filtered = q
    ? allWidgets.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          w.pluginName.toLowerCase().includes(q)
      )
    : allWidgets;

  // Group by plugin
  const groups = useMemo(() => {
    const map = new Map<string, { pluginName: string; widgets: WidgetDef[] }>();
    for (const w of filtered) {
      if (!map.has(w.pluginId)) {
        map.set(w.pluginId, { pluginName: w.pluginName, widgets: [] });
      }
      map.get(w.pluginId)!.widgets.push(w);
    }
    return Array.from(map.values());
  }, [filtered]);

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
          width: 320,
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

        {/* Search */}
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <input
            type="search"
            placeholder="Suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              width: "100%",
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg)",
              color: "var(--color-text-primary)",
              fontSize: "var(--font-size-sm)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Widget list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-3)" }}>
          {groups.length === 0 && (
            <div
              style={{
                padding: "var(--space-8)",
                textAlign: "center",
                color: "var(--color-text-muted)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              {q ? "Keine Treffer" : "Keine Widgets verfügbar"}
            </div>
          )}

          {groups.map((group) => (
            <div key={group.pluginName} style={{ marginBottom: "var(--space-4)" }}>
              {/* Plugin group header */}
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: 700,
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  padding: "var(--space-1) var(--space-1)",
                  marginBottom: "var(--space-2)",
                }}
              >
                {group.pluginName}
              </div>

              {group.widgets.map((w) => {
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
                        {w.defaultSize ?? "1/3"}
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
          ))}
        </div>
      </div>
    </>
  );
}
