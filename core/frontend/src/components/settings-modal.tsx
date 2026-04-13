"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { log } from "@/lib/log";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import type { Tab } from "@/components/ui/tabs";

interface Config {
  githubAuthType: string;
  githubOrg: string;
  syncIntervalSec: number;
  hasLicenseKey: boolean;
  setupCompleted: boolean;
}

const INTERVALS = [
  { label: "Every 5 minutes", value: 300 },
  { label: "Every 15 minutes", value: 900 },
  { label: "Every 30 minutes", value: 1800 },
  { label: "Every hour", value: 3600 },
];

const TABS: Tab<string>[] = [
  { value: "general", label: "General" },
];

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { notify } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [config, setConfig] = useState<Config | null>(null);
  const [syncInterval, setSyncInterval] = useState(300);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    log.settings("loading config");
    apiGet<Config>("/api/core/setup/config")
      .then((cfg) => {
        log.settings("config loaded, syncInterval:", cfg.syncIntervalSec);
        setConfig(cfg);
        setSyncInterval(cfg.syncIntervalSec);
      })
      .catch(() => {});
  }, [open]);

  const save = async () => {
    if (!config) return;
    log.settings("saving config, syncInterval:", syncInterval);
    setSaving(true);
    try {
      await apiPost("/api/core/setup", {
        github_token: "",
        github_org: config.githubOrg,
        sync_interval_sec: syncInterval,
        license_key: "",
      });
      log.settings("config saved successfully");
      notify("Settings saved", "success");
    } catch {
      log.error("failed to save settings");
      notify("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings" width={580}>
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === "general" && (
        <div>
          <Section title="GitHub">
            <Field label="Organisation / User">
              <input
                value={config?.githubOrg ?? ""}
                onChange={(e) => setConfig((c) => c ? { ...c, githubOrg: e.target.value } : c)}
                style={inputStyle}
              />
            </Field>
            <Field label="Authentication">
              <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
                {config?.githubAuthType === "pat" ? "Personal Access Token (PAT)" : config?.githubAuthType ?? "—"}
                {" · "}
                <a href="/setup" style={{ color: "var(--color-primary)" }}>Change token</a>
              </div>
            </Field>
          </Section>

          <Section title="Sync">
            <Field label="Sync interval">
              <select
                value={syncInterval}
                onChange={(e) => setSyncInterval(Number(e.target.value))}
                style={inputStyle}
              >
                {INTERVALS.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </Field>
          </Section>

          <Section title="License">
            <Field label="License Key">
              <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
                {config?.hasLicenseKey ? "✓ Active" : "No license key – Community mode"}
              </div>
            </Field>
            {!config?.hasLicenseKey && (
              <input
                type="text"
                placeholder="gvs_xxxxxxxxxxxxxxxxxxxx"
                style={{ ...inputStyle, marginTop: "var(--space-2)" }}
              />
            )}
          </Section>

          <div style={{ marginTop: "var(--space-4)" }}>
            <button
              type="button"
              onClick={save}
              disabled={saving || !config}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-3) var(--space-6)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-primary)",
                color: "var(--color-text-inverse)",
                border: "none",
                fontWeight: 500,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving && (
                <span style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.35)",
                  borderTopColor: "#fff",
                  display: "inline-block",
                  animation: "spin 0.6s linear infinite",
                  flexShrink: 0,
                }} />
              )}
              Save
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </button>
          </div>
        </div>
      )}
    </Modal>
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
  boxSizing: "border-box",
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "var(--space-4)" }}>
      <label style={{ display: "block", fontSize: "var(--font-size-sm)", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "var(--space-2)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
