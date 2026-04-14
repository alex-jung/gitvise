"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { ProLock } from "@/components/ui/pro-lock";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { EmptyState } from "@/components/ui/empty-state";
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

// ── Tab bar ───────────────────────────────────────────────────────────────────

function DashboardTabs({
  dashboards,
  activeId,
  onChange,
}: {
  dashboards: Dashboard[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  if (dashboards.length <= 1) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: "var(--space-1)",
        borderBottom: "1px solid var(--color-border)",
        marginBottom: "var(--space-5)",
      }}
    >
      {dashboards.map((d) => {
        const isActive = d.id === activeId;
        return (
          <button
            key={d.id}
            onClick={() => onChange(d.id)}
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: "transparent",
              border: "none",
              borderBottom: isActive
                ? "2px solid var(--color-primary)"
                : "2px solid transparent",
              color: isActive
                ? "var(--color-text-primary)"
                : "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
              fontWeight: isActive ? 600 : 400,
              cursor: "pointer",
              marginBottom: -1,
              transition: "color 120ms",
            }}
          >
            {d.name}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardGrid() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [widgetDefs, setWidgetDefs] = useState<Record<string, WidgetDef>>({});
  const [loading, setLoading] = useState(true);
  const [hasLicense, setHasLicense] = useState(false);
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(null);

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

        // Set initial active dashboard to the default one
        const defaultDash = cfg.dashboards.find((d) => d.isDefault) ?? cfg.dashboards[0];
        if (defaultDash) setActiveDashboardId(defaultDash.id);
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

  const dashboards = config?.dashboards ?? [];
  const activeDashboard =
    dashboards.find((d) => d.id === activeDashboardId) ??
    dashboards.find((d) => d.isDefault) ??
    dashboards[0];

  if (!activeDashboard || activeDashboard.layout.length === 0) {
    return (
      <>
        <DashboardTabs
          dashboards={dashboards}
          activeId={activeDashboardId ?? ""}
          onChange={setActiveDashboardId}
        />
        <EmptyState
          icon="◫"
          title="No widgets configured"
          description="Add widgets from the widget catalog."
        />
      </>
    );
  }

  return (
    <>
      <DashboardTabs
        dashboards={dashboards}
        activeId={activeDashboard.id}
        onChange={setActiveDashboardId}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--space-4)",
          alignItems: "start",
        }}
      >
        {activeDashboard.layout.map((item) => {
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
    </>
  );
}
