"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

interface RepoHealthSettings {
  stale_threshold_days: number;
  required_files: string;
  exclude_repos: string;
  exclude_archived: boolean;
}

const DEFAULTS: RepoHealthSettings = {
  stale_threshold_days: 30,
  required_files: "README,LICENSE",
  exclude_repos: "",
  exclude_archived: false,
};

export default function RepoHealthSettingsPage() {
  const [settings, setSettings] = useState<RepoHealthSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<RepoHealthSettings>("/api/core/plugin-settings/repo-health")
      .then((data) => setSettings({ ...DEFAULTS, ...data }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await apiPost("/api/core/plugin-settings/repo-health", settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof RepoHealthSettings>(key: K, value: RepoHealthSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  if (loading) {
    return (
      <main style={{ flex: 1, padding: "var(--space-6)" }}>
        <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>Loading…</div>
      </main>
    );
  }

  return (
    <main style={{ flex: 1, padding: "var(--space-6)", overflowY: "auto" }}>
      <nav style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
        <a href="/settings" style={{ color: "var(--color-primary)" }}>Settings</a>
        {" / "}
        <span>Repository Health</span>
      </nav>

      <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, margin: "0 0 var(--space-6)", color: "var(--color-text-primary)" }}>
        Repository Health – Plugin Settings
      </h1>

      <div style={{ maxWidth: 560 }}>
        <Section title="Health Scoring">
          <Field
            label="Stale repo threshold (days)"
            hint="Repos with no push activity beyond this threshold are flagged as stale."
          >
            <input
              type="number"
              min={7}
              max={365}
              value={settings.stale_threshold_days}
              onChange={(e) => set("stale_threshold_days", Number(e.target.value))}
              style={inputStyle}
            />
          </Field>

          <Field
            label="Required files"
            hint="Comma-separated file stems that must be present in each repo (e.g. README,LICENSE,CONTRIBUTING). Missing files lower the health score."
          >
            <input
              type="text"
              placeholder="README,LICENSE"
              value={settings.required_files}
              onChange={(e) => set("required_files", e.target.value)}
              style={inputStyle}
            />
          </Field>
        </Section>

        <Section title="Exclusions">
          <Field
            label="Exclude repositories"
            hint="Comma-separated glob patterns for repos to skip (e.g. myorg/temp-*,myorg/archived-*). Matched repos are not scored or synced."
          >
            <input
              type="text"
              placeholder="myorg/sandbox-*"
              value={settings.exclude_repos}
              onChange={(e) => set("exclude_repos", e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Exclude archived repositories">
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.exclude_archived}
                onChange={(e) => set("exclude_archived", e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                Skip archived repos entirely (they won't appear in health reports)
              </span>
            </label>
          </Field>
        </Section>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-6)" }}>
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: "var(--space-3) var(--space-6)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-primary)",
              color: "var(--color-text-inverse)",
              border: "none",
              fontWeight: 500,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {saved && (
            <span style={{ color: "var(--color-success)", fontSize: "var(--font-size-sm)" }}>
              ✓ Saved
            </span>
          )}
          {error && (
            <span style={{ color: "var(--color-danger)", fontSize: "var(--font-size-sm)" }}>
              {error}
            </span>
          )}
        </div>
      </div>
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
  fontSize: "var(--font-size-md)",
  outline: "none",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-6)",
        marginBottom: "var(--space-4)",
      }}
    >
      <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, margin: "0 0 var(--space-5)", color: "var(--color-text-primary)" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "var(--space-4)" }}>
      <label style={{ display: "block", fontSize: "var(--font-size-sm)", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "var(--space-1)" }}>
        {label}
      </label>
      {hint && (
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", margin: "0 0 var(--space-2)" }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}
