"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AlertSummary {
  total: number;
  level: "ok" | "warning" | "critical";
  criticalVulns: number;
  staleRepos: number;
  failingWorkflows: number;
  stalePrs: number;
}

interface NotificationSettings {
  stale_threshold_days: number;
  pr_stale_days: number;
  webhook_url: string;
  webhook_enabled: boolean;
  email_enabled: boolean;
  email_digest_hour: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "var(--space-3) var(--space-5)",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        minWidth: 90,
      }}
    >
      <span
        style={{
          fontSize: "var(--font-size-xl)",
          fontWeight: 700,
          color: color ?? "var(--color-text-primary)",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-muted)",
          marginTop: 2,
          textAlign: "center",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function LevelBadge({ level }: { level: AlertSummary["level"] }) {
  const map = {
    ok: { label: "All clear", color: "var(--color-success)" },
    warning: { label: "Attention needed", color: "var(--color-warning)" },
    critical: { label: "Action required", color: "var(--color-danger)" },
  };
  const { label, color } = map[level];
  return (
    <span
      style={{
        fontSize: "var(--font-size-xs)",
        padding: "2px 10px",
        borderRadius: "var(--radius-full)",
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        color,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sum, cfg] = await Promise.all([
        apiGet<AlertSummary>("/api/core/alerts/summary"),
        apiGet<NotificationSettings>("/api/core/alerts/settings"),
      ]);
      setSummary(sum);
      setSettings(cfg);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      await apiPost("/api/core/alerts/settings", settings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } finally {
      setSavingSettings(false);
    }
  };

  const testWebhook = async () => {
    setTestingWebhook(true);
    setWebhookResult(null);
    try {
      await apiPost("/api/core/alerts/webhook/test", {});
      setWebhookResult({ ok: true, msg: "Test payload delivered successfully." });
    } catch {
      setWebhookResult({ ok: false, msg: "Webhook delivery failed – check the URL and try again." });
    } finally {
      setTestingWebhook(false);
    }
  };

  const set = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => setSettings((s) => (s ? { ...s, [key]: value } : s));

  return (
    <main style={{ flex: 1, padding: "var(--space-6)", overflowY: "auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-6)",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: 700,
              margin: 0,
              color: "var(--color-text-primary)",
            }}
          >
            Alerts &amp; Notifications
          </h1>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-muted)",
              margin: "var(--space-1) 0 0",
            }}
          >
            Aggregated alerts from vulnerabilities, CI, stale repos and PRs
          </p>
        </div>
        <button
          onClick={fetchAll}
          style={{
            padding: "var(--space-2) var(--space-4)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-primary)",
            color: "var(--color-text-inverse)",
            border: "none",
            fontSize: "var(--font-size-sm)",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <LoadingState rows={6} />
      ) : (
        <>
          {/* Alert level + stat pills */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
              marginBottom: "var(--space-6)",
              flexWrap: "wrap",
            }}
          >
            {summary && <LevelBadge level={summary.level} />}
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <StatPill
                label="Total alerts"
                value={summary?.total ?? 0}
                color={
                  summary?.level === "critical"
                    ? "var(--color-danger)"
                    : summary?.level === "warning"
                    ? "var(--color-warning)"
                    : "var(--color-success)"
                }
              />
              <StatPill
                label="Critical / High vulns"
                value={summary?.criticalVulns ?? 0}
                color={
                  (summary?.criticalVulns ?? 0) > 0 ? "var(--color-danger)" : undefined
                }
              />
              <StatPill
                label="Failing workflows"
                value={summary?.failingWorkflows ?? 0}
                color={
                  (summary?.failingWorkflows ?? 0) > 0 ? "var(--color-danger)" : undefined
                }
              />
              <StatPill
                label="Stale repos"
                value={summary?.staleRepos ?? 0}
                color={
                  (summary?.staleRepos ?? 0) > 0 ? "var(--color-warning)" : undefined
                }
              />
              <StatPill
                label="Stale PRs"
                value={summary?.stalePrs ?? 0}
                color={
                  (summary?.stalePrs ?? 0) > 0 ? "var(--color-warning)" : undefined
                }
              />
            </div>
          </div>

          {/* Alert breakdown */}
          {summary?.total === 0 ? (
            <EmptyState
              icon="◎"
              title="No active alerts"
              description="Everything looks good – no critical vulnerabilities, failing CI or stale items detected."
            />
          ) : (
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                overflow: "hidden",
                marginBottom: "var(--space-6)",
              }}
            >
              <div
                style={{
                  padding: "var(--space-4) var(--space-5)",
                  borderBottom: "1px solid var(--color-border)",
                  fontWeight: 600,
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-primary)",
                }}
              >
                Alert breakdown
              </div>
              {[
                {
                  label: "Critical / High vulnerabilities",
                  value: summary?.criticalVulns ?? 0,
                  hint: "Open Dependabot alerts with critical or high severity",
                  color: "var(--color-danger)",
                  link: "/dependencies",
                },
                {
                  label: "Failing CI workflows",
                  value: summary?.failingWorkflows ?? 0,
                  hint: "Distinct workflows with at least one failure in the last 7 days",
                  color: "var(--color-danger)",
                  link: "/ci-cd",
                },
                {
                  label: "Stale repositories",
                  value: summary?.staleRepos ?? 0,
                  hint: `Repos with no push activity in the last ${settings?.stale_threshold_days ?? 30} days`,
                  color: "var(--color-warning)",
                  link: "/repos",
                },
                {
                  label: "Stale pull requests",
                  value: summary?.stalePrs ?? 0,
                  hint: `Open PRs with no activity in the last ${settings?.pr_stale_days ?? 14} days`,
                  color: "var(--color-warning)",
                  link: "/pull-requests",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-4)",
                    padding: "var(--space-4) var(--space-5)",
                    borderTop: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "var(--font-size-sm)",
                        fontWeight: 500,
                        color:
                          row.value > 0
                            ? row.color
                            : "var(--color-text-primary)",
                      }}
                    >
                      {row.label}
                    </div>
                    <div
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {row.hint}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "var(--font-size-lg)",
                      fontWeight: 700,
                      color:
                        row.value > 0 ? row.color : "var(--color-text-muted)",
                      minWidth: 32,
                      textAlign: "right",
                    }}
                  >
                    {row.value}
                  </span>
                  <a
                    href={row.link}
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-primary)",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    View →
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Notification settings */}
          {settings && (
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                padding: "var(--space-6)",
              }}
            >
              <h2
                style={{
                  fontSize: "var(--font-size-md)",
                  fontWeight: 600,
                  margin: "0 0 var(--space-5)",
                  color: "var(--color-text-primary)",
                }}
              >
                Notification Settings
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "var(--space-4)",
                  marginBottom: "var(--space-5)",
                }}
              >
                <Field label="Stale repo threshold (days)">
                  <input
                    type="number"
                    min={7}
                    max={365}
                    value={settings.stale_threshold_days}
                    onChange={(e) =>
                      set("stale_threshold_days", Number(e.target.value))
                    }
                    style={inputStyle}
                  />
                </Field>
                <Field label="Stale PR threshold (days)">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={settings.pr_stale_days}
                    onChange={(e) =>
                      set("pr_stale_days", Number(e.target.value))
                    }
                    style={inputStyle}
                  />
                </Field>
              </div>

              <Field label="Webhook URL">
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/…"
                  value={settings.webhook_url}
                  onChange={(e) => set("webhook_url", e.target.value)}
                  style={inputStyle}
                />
              </Field>

              <div style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-5)" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.webhook_enabled}
                    onChange={(e) => set("webhook_enabled", e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  <span
                    style={{
                      fontSize: "var(--font-size-sm)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Enable webhook notifications after each sync
                  </span>
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  style={{
                    padding: "var(--space-3) var(--space-6)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-primary)",
                    color: "var(--color-text-inverse)",
                    border: "none",
                    fontWeight: 500,
                    cursor: savingSettings ? "not-allowed" : "pointer",
                    opacity: savingSettings ? 0.6 : 1,
                  }}
                >
                  {savingSettings ? "Saving..." : "Save"}
                </button>
                {settingsSaved && (
                  <span
                    style={{
                      color: "var(--color-success)",
                      fontSize: "var(--font-size-sm)",
                    }}
                  >
                    ✓ Saved
                  </span>
                )}

                {settings.webhook_url && (
                  <button
                    onClick={testWebhook}
                    disabled={testingWebhook}
                    style={{
                      padding: "var(--space-3) var(--space-5)",
                      borderRadius: "var(--radius-md)",
                      background: "transparent",
                      color: "var(--color-text-secondary)",
                      border: "1px solid var(--color-border)",
                      fontWeight: 500,
                      cursor: testingWebhook ? "not-allowed" : "pointer",
                      opacity: testingWebhook ? 0.6 : 1,
                      fontSize: "var(--font-size-sm)",
                    }}
                  >
                    {testingWebhook ? "Sending..." : "Send test"}
                  </button>
                )}

                {webhookResult && (
                  <span
                    style={{
                      color: webhookResult.ok
                        ? "var(--color-success)"
                        : "var(--color-danger)",
                      fontSize: "var(--font-size-sm)",
                    }}
                  >
                    {webhookResult.ok ? "✓" : "✗"} {webhookResult.msg}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-3) var(--space-4)",
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  color: "var(--color-text-primary)",
  fontSize: "var(--font-size-sm)",
  outline: "none",
  boxSizing: "border-box",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "var(--font-size-sm)",
          fontWeight: 500,
          color: "var(--color-text-secondary)",
          marginBottom: "var(--space-2)",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
