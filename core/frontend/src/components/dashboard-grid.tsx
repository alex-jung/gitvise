"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { ProLock } from "@/components/ui/pro-lock";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { EmptyState } from "@/components/ui/empty-state";
import { HealthScoreCard } from "@/plugins/repo_health/widgets/health-score-card";
import { HealthTable } from "@/plugins/repo_health/widgets/health-table";
import { PrsOverviewCard } from "@/plugins/pull_requests/widgets/prs-overview-card";
import { IssuesOverviewCard } from "@/plugins/pull_requests/widgets/issues-overview-card";
import { PrsDraftRatio } from "@/plugins/pull_requests/widgets/prs-draft-ratio";
import { PrsAgeDistribution } from "@/plugins/pull_requests/widgets/prs-age-distribution";
import { IssuesByLabel } from "@/plugins/pull_requests/widgets/issues-by-label";
import { PrsStaleTable } from "@/plugins/pull_requests/widgets/prs-stale-table";
import { TeamContributors } from "@/plugins/team/widgets/team-contributors";
import { TeamNewContributors } from "@/plugins/team/widgets/team-new-contributors";
import { TeamCommitActivity } from "@/plugins/team/widgets/team-commit-activity";
import { TeamActivityHeatmap } from "@/plugins/team/widgets/team-activity-heatmap";
import { CiStatusSummary } from "@/plugins/ci_cd/widgets/ci-status-summary";
import { CiFailingWorkflows } from "@/plugins/ci_cd/widgets/ci-failing-workflows";
import { CiDurationTrend } from "@/plugins/ci_cd/widgets/ci-duration-trend";
import { CiRunHistory } from "@/plugins/ci_cd/widgets/ci-run-history";
import { VulnSummary } from "@/plugins/dependencies/widgets/vuln-summary";
import { SecurityScore } from "@/plugins/dependencies/widgets/security-score";
import { AffectedRepos } from "@/plugins/dependencies/widgets/affected-repos";
import { LicenseOverview } from "@/plugins/dependencies/widgets/license-overview";
import { usePluginRegistry } from "@/context/PluginContext";
import { WidgetCatalog, type WidgetDef } from "@/components/widget-catalog";

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

// ── Widget registry (built-in plugins) ───────────────────────────────────────

type WidgetComponent = React.ComponentType<{ config: Record<string, unknown> }>;

const BUILTIN_WIDGETS: Record<string, WidgetComponent> = {
  // repo-health
  "repo-health-score": HealthScoreCard as WidgetComponent,
  "repo-health-table": HealthTable as WidgetComponent,
  // dependencies
  "vuln-summary": VulnSummary as WidgetComponent,
  "security-score": SecurityScore as WidgetComponent,
  "affected-repos": AffectedRepos as WidgetComponent,
  "license-overview": LicenseOverview as WidgetComponent,
  // ci-cd
  "ci-status-summary": CiStatusSummary as WidgetComponent,
  "ci-failing-workflows": CiFailingWorkflows as WidgetComponent,
  "ci-duration-trend": CiDurationTrend as WidgetComponent,
  "ci-run-history": CiRunHistory as WidgetComponent,
  // pull-requests
  "prs-open-count": PrsOverviewCard as WidgetComponent,
  "issues-open-count": IssuesOverviewCard as WidgetComponent,
  "prs-draft-ratio": PrsDraftRatio as WidgetComponent,
  "prs-age-distribution": PrsAgeDistribution as WidgetComponent,
  "issues-by-label": IssuesByLabel as WidgetComponent,
  "prs-stale-table": PrsStaleTable as WidgetComponent,
  // team
  "team-contributors": TeamContributors as WidgetComponent,
  "team-new-contributors": TeamNewContributors as WidgetComponent,
  "team-commit-activity": TeamCommitActivity as WidgetComponent,
  "team-activity-heatmap": TeamActivityHeatmap as WidgetComponent,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function colSpan(width: string): number {
  if (width === "full") return 3;
  if (width === "2/3") return 2;
  return 1;
}

/** Recompute row/col for each item based on its order and width. */
function recomputeGrid(items: WidgetLayout[]): WidgetLayout[] {
  let row = 1;
  let col = 1;
  return items.map((item) => {
    const span = colSpan(item.width);
    if (col + span - 1 > 3) { row++; col = 1; }
    const result = { ...item, row, col };
    col += span;
    if (col > 3) { row++; col = 1; }
    return result;
  });
}

/** Build default config for a widget from its definition's schema. */
function defaultConfig(def: WidgetDef): Record<string, unknown> {
  const cfg: Record<string, unknown> = {};
  if (def.config) {
    for (const [key, field] of Object.entries(def.config)) {
      if ("default" in field) cfg[key] = field.default;
    }
  }
  return cfg;
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

// ── Width selector (edit mode) ────────────────────────────────────────────────

function WidthButtons({
  current,
  onChange,
}: {
  current: "1/3" | "2/3" | "full";
  onChange: (w: "1/3" | "2/3" | "full") => void;
}) {
  const options: Array<{ value: "1/3" | "2/3" | "full"; label: string }> = [
    { value: "1/3", label: "1/3" },
    { value: "2/3", label: "2/3" },
    { value: "full", label: "Voll" },
  ];
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: "2px 8px",
            fontSize: "var(--font-size-xs)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border)",
            background:
              current === o.value
                ? "var(--color-primary)"
                : "transparent",
            color:
              current === o.value
                ? "var(--color-text-inverse)"
                : "var(--color-text-muted)",
            cursor: "pointer",
            fontWeight: current === o.value ? 600 : 400,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

interface TabBarProps {
  dashboards: Dashboard[];
  activeId: string;
  editMode: boolean;
  saving: boolean;
  draftName: string;
  canDelete: boolean;
  onTabChange: (id: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const tabBtnBase: React.CSSProperties = {
  padding: "var(--space-1) var(--space-3)",
  background: "transparent",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--font-size-xs)",
  cursor: "pointer",
  fontWeight: 500,
};

function TabBar({
  dashboards,
  activeId,
  editMode,
  saving,
  draftName,
  canDelete,
  onTabChange,
  onEdit,
  onSave,
  onCancel,
  onReset,
  onRename,
  onDuplicate,
  onDelete,
}: TabBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid var(--color-border)",
        marginBottom: "var(--space-5)",
        gap: "var(--space-1)",
        minHeight: 38,
      }}
    >
      {/* Tabs (hidden in edit mode to avoid distraction) */}
      {!editMode &&
        dashboards.map((d) => {
          const isActive = d.id === activeId;
          return (
            <button
              key={d.id}
              onClick={() => onTabChange(d.id)}
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
                whiteSpace: "nowrap",
              }}
            >
              {d.name}
            </button>
          );
        })}

      {/* Name input in edit mode */}
      {editMode && (
        <input
          type="text"
          value={draftName}
          onChange={(e) => onRename(e.target.value)}
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            background: "transparent",
            border: "none",
            borderBottom: "2px solid var(--color-primary)",
            outline: "none",
            padding: "var(--space-1) var(--space-2)",
            marginBottom: -1,
            minWidth: 120,
            maxWidth: 240,
          }}
        />
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* View-mode actions */}
      {!editMode && (
        <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: -1 }}>
          <button
            onClick={onDuplicate}
            title="Dashboard duplizieren"
            style={{ ...tabBtnBase, color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-primary)"; e.currentTarget.style.borderColor = "var(--color-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-muted)"; e.currentTarget.style.borderColor = "var(--color-border)"; }}
          >
            ⧉ Duplizieren
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              title="Dashboard löschen"
              style={{ ...tabBtnBase, color: "var(--color-danger)", borderColor: "var(--color-border)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-danger)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
            >
              ✕ Löschen
            </button>
          )}
          <button
            onClick={onEdit}
            title="Dashboard bearbeiten"
            style={{ ...tabBtnBase, color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.color = "var(--color-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
          >
            ✎ Bearbeiten
          </button>
        </div>
      )}

      {/* Edit-mode actions */}
      {editMode && (
        <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: -1 }}>
          <button
            onClick={onReset}
            disabled={saving}
            title="Standard-Dashboard wiederherstellen"
            style={{ ...tabBtnBase, color: "var(--color-text-muted)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
          >
            ↺ Zurücksetzen
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{ ...tabBtnBase, color: "var(--color-text-muted)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
          >
            ✕ Abbrechen
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              ...tabBtnBase,
              background: "var(--color-primary)",
              border: "none",
              color: "var(--color-text-inverse)",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 600,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Speichern..." : "✓ Speichern"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardGrid() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [widgetDefs, setWidgetDefs] = useState<Record<string, WidgetDef>>({});
  const [allWidgetDefs, setAllWidgetDefs] = useState<WidgetDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLicense, setHasLicense] = useState(false);
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(null);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [draftLayout, setDraftLayout] = useState<WidgetLayout[]>([]);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  // Drag & drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const { dynamicWidgets } = usePluginRegistry();

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
        setAllWidgetDefs(defs);
        setHasLicense(setupCfg.hasLicenseKey);
        const defaultDash =
          cfg.dashboards.find((d) => d.isDefault) ?? cfg.dashboards[0];
        if (defaultDash) setActiveDashboardId(defaultDash.id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const dashboards = config?.dashboards ?? [];
  const activeDashboard =
    dashboards.find((d) => d.id === activeDashboardId) ??
    dashboards.find((d) => d.isDefault) ??
    dashboards[0];

  const displayLayout = editMode ? draftLayout : (activeDashboard?.layout ?? []);

  // ── Edit mode handlers ─────────────────────────────────────────────────────

  const enterEdit = () => {
    setDraftLayout(activeDashboard?.layout ?? []);
    setDraftName(activeDashboard?.name ?? "");
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setCatalogOpen(false);
    setDraftLayout([]);
    setDraftName("");
  };

  const saveEdit = async () => {
    if (!config || !activeDashboard) return;
    setSaving(true);
    try {
      const newLayout = recomputeGrid(draftLayout);
      const newName = draftName.trim() || activeDashboard.name;
      const newConfig: DashboardConfig = {
        ...config,
        dashboards: config.dashboards.map((d) =>
          d.id === activeDashboard.id
            ? { ...d, name: newName, layout: newLayout }
            : d
        ),
      };
      await apiPost("/api/core/dashboard", newConfig);
      setConfig(newConfig);
      setEditMode(false);
      setCatalogOpen(false);
      setDraftName("");
    } catch {
      // silent – TODO: show toast
    } finally {
      setSaving(false);
    }
  };

  const duplicateDashboard = async () => {
    if (!config || !activeDashboard) return;
    const newId = `${activeDashboard.id}-copy-${Date.now().toString(36)}`;
    const copy: Dashboard = {
      ...activeDashboard,
      id: newId,
      name: `${activeDashboard.name} (Kopie)`,
      isDefault: false,
    };
    const newConfig: DashboardConfig = {
      ...config,
      dashboards: [...config.dashboards, copy],
    };
    try {
      await apiPost("/api/core/dashboard", newConfig);
      setConfig(newConfig);
      setActiveDashboardId(newId);
    } catch {
      // silent
    }
  };

  const deleteDashboard = async () => {
    if (!config || !activeDashboard) return;
    if (!confirm(`Dashboard „${activeDashboard.name}" löschen?`)) return;
    const remaining = config.dashboards.filter((d) => d.id !== activeDashboard.id);
    // Ensure at least one default
    if (remaining.length > 0 && !remaining.some((d) => d.isDefault)) {
      remaining[0] = { ...remaining[0], isDefault: true };
    }
    const newConfig: DashboardConfig = { ...config, dashboards: remaining };
    try {
      await apiPost("/api/core/dashboard", newConfig);
      setConfig(newConfig);
      const next = remaining.find((d) => d.isDefault) ?? remaining[0];
      setActiveDashboardId(next?.id ?? null);
    } catch {
      // silent
    }
  };

  const resetToDefault = async () => {
    if (!confirm("Dashboard auf Standard zurücksetzen?")) return;
    setSaving(true);
    try {
      const newConfig = await apiPost<DashboardConfig>(
        "/api/core/dashboard/reset",
        {}
      );
      setConfig(newConfig);
      const resetDash =
        newConfig.dashboards.find((d) => d.id === activeDashboard?.id) ??
        newConfig.dashboards.find((d) => d.isDefault) ??
        newConfig.dashboards[0];
      if (resetDash) {
        setActiveDashboardId(resetDash.id);
        setDraftLayout(resetDash.layout);
      }
      setEditMode(false);
      setCatalogOpen(false);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (id: string) => {
    if (editMode) cancelEdit();
    setActiveDashboardId(id);
  };

  // ── Draft layout mutations ─────────────────────────────────────────────────

  const removeWidget = (index: number) => {
    setDraftLayout((prev) => prev.filter((_, i) => i !== index));
  };

  const changeWidth = (index: number, width: "1/3" | "2/3" | "full") => {
    setDraftLayout((prev) =>
      prev.map((item, i) => (i === index ? { ...item, width } : item))
    );
  };

  const addWidget = (def: WidgetDef) => {
    if (!activeDashboard) return;
    setDraftLayout((prev) => [
      ...prev,
      {
        widgetId: def.id,
        pluginId: def.pluginId,
        row: 1,
        col: 1,
        width: (def.defaultSize as "1/3" | "2/3" | "full") ?? "1/3",
        config: defaultConfig(def),
      },
    ]);
  };

  // ── Drag & Drop handlers ───────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Required for Firefox
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragCounter.current++;
    if (index !== dragIndex) setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    dragCounter.current = 0;
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setDraftLayout((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  // ── Loading state ──────────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Tab bar + edit controls */}
      <TabBar
        dashboards={dashboards}
        activeId={activeDashboard?.id ?? ""}
        editMode={editMode}
        saving={saving}
        draftName={draftName}
        canDelete={dashboards.length > 1}
        onTabChange={handleTabChange}
        onEdit={enterEdit}
        onSave={saveEdit}
        onCancel={cancelEdit}
        onReset={resetToDefault}
        onRename={setDraftName}
        onDuplicate={duplicateDashboard}
        onDelete={deleteDashboard}
      />

      {/* Empty state */}
      {displayLayout.length === 0 && (
        <EmptyState
          icon="◫"
          title={editMode ? "Keine Widgets" : "Keine Widgets konfiguriert"}
          description={
            editMode
              ? "Füge Widgets aus dem Katalog hinzu."
              : "Bearbeite das Dashboard um Widgets hinzuzufügen."
          }
          action={
            editMode ? (
              <button
                onClick={() => setCatalogOpen(true)}
                style={{
                  padding: "var(--space-2) var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-primary)",
                  color: "var(--color-text-inverse)",
                  border: "none",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Widget hinzufügen
              </button>
            ) : undefined
          }
        />
      )}

      {/* Widget grid */}
      {displayLayout.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--space-4)",
            alignItems: "start",
          }}
        >
          {displayLayout.map((item, index) => {
            const def = widgetDefs[item.widgetId];
            const title = def?.title ?? item.widgetId;
            const isPro = (def?.tier ?? def?.pluginTier) === "pro";
            const isLocked = isPro && !hasLicense;
            const span = colSpan(item.width);
            const WidgetComp = widgetRegistry[item.widgetId];

            const isDragging = dragIndex === index;
            const isDropTarget = dragOverIndex === index && dragIndex !== index;

            return (
              <div
                key={`${item.pluginId}-${item.widgetId}-${index}`}
                draggable={editMode}
                onDragStart={editMode ? (e) => handleDragStart(e, index) : undefined}
                onDragEnter={editMode ? (e) => handleDragEnter(e, index) : undefined}
                onDragLeave={editMode ? handleDragLeave : undefined}
                onDragOver={editMode ? handleDragOver : undefined}
                onDrop={editMode ? (e) => handleDrop(e, index) : undefined}
                onDragEnd={editMode ? handleDragEnd : undefined}
                style={{
                  gridColumn: span > 1 ? `span ${span}` : undefined,
                  opacity: isDragging ? 0.4 : 1,
                  outline: isDropTarget
                    ? "2px solid var(--color-primary)"
                    : "2px solid transparent",
                  borderRadius: "var(--radius-lg)",
                  transition: "opacity 150ms, outline-color 100ms",
                  cursor: editMode ? "grab" : "default",
                }}
              >
                {/* Edit mode overlay controls */}
                {editMode && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "var(--space-2)",
                      padding: "0 var(--space-1)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      {/* Drag handle */}
                      <span
                        style={{
                          color: "var(--color-text-muted)",
                          fontSize: 14,
                          cursor: "grab",
                          userSelect: "none",
                          letterSpacing: -1,
                        }}
                      >
                        ⠿
                      </span>
                      <WidthButtons
                        current={item.width}
                        onChange={(w) => changeWidth(index, w)}
                      />
                    </div>
                    {/* Remove button */}
                    <button
                      onClick={() => removeWidget(index)}
                      title="Widget entfernen"
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-border)",
                        background: "transparent",
                        color: "var(--color-danger)",
                        fontSize: 14,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}

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
      )}

      {/* Add widget button (edit mode) */}
      {editMode && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "var(--space-5)",
          }}
        >
          <button
            onClick={() => setCatalogOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-5)",
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--color-border)",
              background: "transparent",
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
              cursor: "pointer",
              fontWeight: 500,
              transition: "border-color 120ms, color 120ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-primary)";
              e.currentTarget.style.color = "var(--color-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
          >
            + Widget hinzufügen
          </button>
        </div>
      )}

      {/* Widget catalog */}
      <WidgetCatalog
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        allWidgets={allWidgetDefs}
        activeWidgetIds={draftLayout.map((item) => item.widgetId)}
        hasLicense={hasLicense}
        onAdd={(def) => {
          addWidget(def);
          setCatalogOpen(false);
        }}
      />
    </>
  );
}
