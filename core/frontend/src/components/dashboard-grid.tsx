"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { ProLock } from "@/components/ui/pro-lock";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { HealthScoreCard } from "@/plugins/repo_health/widgets/health-score-card";
import { HealthTable } from "@/plugins/repo_health/widgets/health-table";
import { usePluginRegistry } from "@/context/PluginContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WidgetLayout {
  widgetId: string;
  pluginId: string;
  row: number;
  col: number;
  width: "1/3" | "2/3" | "full";
  config: Record<string, unknown>;
}

interface Dashboard {
  id: string;
  name: string;
  isDefault: boolean;
  layout: WidgetLayout[];
}

interface DashboardConfig {
  dashboards: Dashboard[];
}

interface WidgetDef {
  id: string;
  type: string;
  title: string;
  defaultSize?: string;
  tier: string;
  pluginId: string;
  pluginName: string;
  pluginTier: string;
}

// ── Widget registry (built-in plugins) ───────────────────────────────────────

type WidgetComponent = React.ComponentType<{ config: Record<string, unknown> }>;

const BUILTIN_WIDGETS: Record<string, WidgetComponent> = {
  "repo-health-score": HealthScoreCard as WidgetComponent,
  "repo-health-table": HealthTable as WidgetComponent,
};

// ── Width mapping ─────────────────────────────────────────────────────────────

function colSpan(width: string): number {
  if (width === "full") return 3;
  if (width === "2/3") return 2;
  return 1;
}

// ── Placeholder for unknown widget IDs ───────────────────────────────────────

function PlaceholderWidget({ title }: { title: string }) {
  return (
    <DashboardCard title={title}>
      <div
        style={{
          minHeight: 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-sm)",
        }}
      >
        Widget not available
      </div>
    </DashboardCard>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardGrid() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [widgetDefs, setWidgetDefs] = useState<Record<string, WidgetDef>>({});
  const [loading, setLoading] = useState(true);
  const [hasLicense, setHasLicense] = useState(false);

  const { dynamicWidgets } = usePluginRegistry();

  // Merge built-in and dynamically registered plugin widgets
  const widgetRegistry = useMemo<Record<string, WidgetComponent>>(
    () => ({ ...BUILTIN_WIDGETS, ...Object.fromEntries(dynamicWidgets) }),
    [dynamicWidgets]
  );

  useEffect(() => {
    Promise.all([
      apiGet<DashboardConfig>("/api/core/dashboard"),
      apiGet<WidgetDef[]>("/api/core/widgets"),
      apiGet<{ hasLicenseKey: boolean }>("/api/core/setup/config"),
    ])
      .then(([cfg, defs, setupCfg]) => {
        setConfig(cfg);
        const defMap: Record<string, WidgetDef> = {};
        for (const d of defs) defMap[d.id] = d;
        setWidgetDefs(defMap);
        setHasLicense(setupCfg.hasLicenseKey);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-4)",
        }}
      >
        {[1, 2, 3].map((i) => (
          <DashboardCard key={i} title="" loading />
        ))}
      </div>
    );
  }

  const dashboard = config?.dashboards.find((d) => d.isDefault) ?? config?.dashboards[0];
  if (!dashboard || dashboard.layout.length === 0) {
    return (
      <div
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-md)",
        }}
      >
        No widgets configured. Add widgets from the widget catalog.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "var(--space-4)",
        alignItems: "start",
      }}
    >
      {dashboard.layout.map((item) => {
        const def = widgetDefs[item.widgetId];
        const title = def?.title ?? item.widgetId;
        const isPro = (def?.tier ?? def?.pluginTier) === "pro";
        const isLocked = isPro && !hasLicense;
        const span = colSpan(item.width);
        const WidgetComp = widgetRegistry[item.widgetId];

        return (
          <div
            key={`${item.pluginId}-${item.widgetId}`}
            style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}
          >
            <ErrorBoundary>
              {WidgetComp ? (
                <DashboardCard title={title} demoMode={isPro && !hasLicense}>
                  {isLocked ? (
                    <ProLock>
                      <WidgetComp config={item.config} />
                    </ProLock>
                  ) : (
                    <WidgetComp config={item.config} />
                  )}
                </DashboardCard>
              ) : (
                <PlaceholderWidget title={title} />
              )}
            </ErrorBoundary>
          </div>
        );
      })}
    </div>
  );
}
