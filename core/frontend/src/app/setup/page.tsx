"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

interface TestConnectionResult {
  valid: boolean;
  login?: string;
  name?: string;
  error?: string;
}

interface FormState {
  password: string;
  token: string;
  githubOrg: string;
  syncIntervalSec: number;
  licenseKey: string;
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            height: 3,
            flex: 1,
            borderRadius: "var(--radius-full)",
            background: i <= current ? "var(--color-primary)" : "var(--color-border)",
            opacity: i > current ? 0.4 : 1,
          }}
        />
      ))}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "var(--space-5)" }}>
      <label style={{ display: "block", fontWeight: 500, fontSize: "var(--font-size-md)", marginBottom: "var(--space-2)", color: "var(--color-text-primary)" }}>
        {label}
      </label>
      {children}
      {hint && (
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "var(--space-3) var(--space-4)",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        color: "var(--color-text-primary)",
        fontSize: "var(--font-size-md)",
        fontFamily: "var(--font-mono)",
        outline: "none",
        ...props.style,
      }}
    />
  );
}

function Btn({ children, variant = "primary", disabled, loading, onClick, type = "button" }: {
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: "var(--space-3) var(--space-6)",
        borderRadius: "var(--radius-md)",
        fontWeight: 500,
        fontSize: "var(--font-size-md)",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.6 : 1,
        background: variant === "primary" ? "var(--color-primary)" : "transparent",
        color: variant === "primary" ? "var(--color-text-inverse)" : "var(--color-text-muted)",
        border: variant === "ghost" ? "1px solid var(--color-border)" : "none",
        transition: "opacity 150ms",
      }}
    >
      {loading ? "..." : children}
    </button>
  );
}

function Step0({ form, setForm, onNext }: {
  form: FormState;
  setForm: (f: Partial<FormState>) => void;
  onNext: () => void;
}) {
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const valid = form.password.length >= 8 && form.password === confirm;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    setError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/core/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.password }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail ?? "Failed to set password.");
        return;
      }
      onNext();
    } catch {
      setError("Could not reach backend.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: 600, marginBottom: "var(--space-2)" }}>
        Set admin password
      </h2>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
        Step 1 of 4 – Protect your Gitvise instance with a password.
      </p>

      <Field label="Password" hint="Minimum 8 characters.">
        <Input
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm({ password: e.target.value })}
        />
      </Field>

      <Field label="Confirm password">
        <Input
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={{ borderColor: confirm && form.password !== confirm ? "var(--color-danger)" : undefined }}
        />
      </Field>

      {error && (
        <div style={{ color: "var(--color-danger)", fontSize: "var(--font-size-sm)", marginBottom: "var(--space-4)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn onClick={submit} disabled={!valid} loading={saving}>Next →</Btn>
      </div>
    </div>
  );
}

function Step1({ form, setForm, onNext }: {
  form: FormState;
  setForm: (f: Partial<FormState>) => void;
  onNext: (login: string) => void;
}) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestConnectionResult | null>(null);

  const test = async () => {
    if (!form.token.trim()) return;
    setTesting(true);
    setResult(null);
    try {
      const res = await apiPost<TestConnectionResult>("/api/core/setup/test-connection", { token: form.token });
      setResult(res);
    } catch {
      setResult({ valid: false, error: "Could not reach backend" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: 600, marginBottom: "var(--space-2)" }}>
        Connect GitHub
      </h2>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
        Step 2 of 4 – Personal Access Token (classic) or fine-grained token.
      </p>

      <Field label="GitHub Token" hint="Required scopes: repo, read:org, workflow">
        <Input
          type="password"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          value={form.token}
          onChange={(e) => setForm({ token: e.target.value })}
        />
      </Field>

      {result && (
        <div style={{
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-md)",
          border: `1px solid ${result.valid ? "var(--color-success)" : "var(--color-danger)"}`,
          background: "var(--color-surface)",
          color: result.valid ? "var(--color-success)" : "var(--color-danger)",
          fontSize: "var(--font-size-sm)",
          marginBottom: "var(--space-5)",
        }}>
          {result.valid
            ? `✓ Connected as @${result.login}${result.name ? ` (${result.name})` : ""}`
            : `✕ ${result.error ?? "Invalid token"}`}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Btn variant="ghost" onClick={test} loading={testing} disabled={!form.token.trim()}>
          Test connection
        </Btn>
        <Btn onClick={() => result?.valid && onNext(result.login ?? "")} disabled={!result?.valid}>
          Next →
        </Btn>
      </div>
    </div>
  );
}

function Step2({ form, setForm, detectedLogin, onBack, onNext }: {
  form: FormState;
  setForm: (f: Partial<FormState>) => void;
  detectedLogin: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const INTERVALS = [
    { label: "Every 5 minutes", value: 300 },
    { label: "Every 15 minutes", value: 900 },
    { label: "Every 30 minutes", value: 1800 },
    { label: "Every hour", value: 3600 },
  ];

  return (
    <div>
      <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: 600, marginBottom: "var(--space-2)" }}>
        Select organisation
      </h2>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
        Step 3 of 4 – What should be analysed?
      </p>

      <Field label="GitHub organisation or user" hint={`Detected: @${detectedLogin}`}>
        <Input
          placeholder={detectedLogin}
          value={form.githubOrg}
          onChange={(e) => setForm({ githubOrg: e.target.value })}
        />
      </Field>

      <Field label="Sync interval">
        <select
          value={form.syncIntervalSec}
          onChange={(e) => setForm({ syncIntervalSec: Number(e.target.value) })}
          style={{
            width: "100%",
            padding: "var(--space-3) var(--space-4)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-primary)",
            fontSize: "var(--font-size-md)",
            outline: "none",
          }}
        >
          {INTERVALS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
        </select>
      </Field>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Btn variant="ghost" onClick={onBack}>← Back</Btn>
        <Btn onClick={onNext} disabled={!form.githubOrg.trim()}>Next →</Btn>
      </div>
    </div>
  );
}

function Step3({ form, setForm, onBack, onFinish, saving }: {
  form: FormState;
  setForm: (f: Partial<FormState>) => void;
  onBack: () => void;
  onFinish: () => void;
  saving: boolean;
}) {
  return (
    <div>
      <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: 600, marginBottom: "var(--space-2)" }}>
        Activate Pro license
      </h2>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
        Step 4 of 4 – Optional. Without a license key, Pro plugins run in demo mode.
      </p>

      <Field label="License Key" hint="Can be added later under Settings.">
        <Input
          placeholder="gvs_xxxxxxxxxxxxxxxxxxxx"
          value={form.licenseKey}
          onChange={(e) => setForm({ licenseKey: e.target.value })}
        />
      </Field>

      <div style={{
        padding: "var(--space-4)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border-subtle)",
        fontSize: "var(--font-size-sm)",
        color: "var(--color-text-muted)",
        marginBottom: "var(--space-6)",
      }}>
        ℹ Without a license key, Pro plugins run in demo mode (7 days of data, no export).
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Btn variant="ghost" onClick={onBack} disabled={saving}>← Back</Btn>
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Btn variant="ghost" onClick={onFinish} loading={saving}>Skip</Btn>
          <Btn onClick={onFinish} loading={saving}>Finish</Btn>
        </div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Redirect to /overview if setup is already completed
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    fetch(`${apiUrl}/api/core/setup/status`, { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((data: { completed: boolean; hasPassword: boolean }) => {
        if (data.completed) {
          router.replace("/overview");
        } else if (data.hasPassword) {
          // Password already set – skip step 0
          setStep(1);
        }
      })
      .catch(() => {}); // backend unreachable – stay on setup page
  }, [router]);
  const [detectedLogin, setDetectedLogin] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setFormRaw] = useState<FormState>({
    password: "",
    token: "",
    githubOrg: "",
    syncIntervalSec: 300,
    licenseKey: "",
  });

  const setForm = (partial: Partial<FormState>) =>
    setFormRaw((prev) => ({ ...prev, ...partial }));

  const finish = async () => {
    setSaving(true);
    try {
      await apiPost("/api/core/setup", {
        github_token: form.token,
        github_org: form.githubOrg,
        sync_interval_sec: form.syncIntervalSec,
        license_key: form.licenseKey,
      });
      router.push("/overview");
    } catch {
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--color-background)",
      padding: "var(--space-6)",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 480,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-8)",
        boxShadow: "var(--shadow-lg)",
      }}>
        <div style={{ marginBottom: "var(--space-8)" }}>
          <div style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, marginBottom: "var(--space-1)", color: "var(--color-text-primary)" }}>
            Set up Gitvise
          </div>
          <StepIndicator current={step} total={4} />
        </div>

        {step === 0 && (
          <Step0 form={form} setForm={setForm} onNext={() => setStep(1)} />
        )}
        {step === 1 && (
          <Step1 form={form} setForm={setForm} onNext={(login) => {
            setDetectedLogin(login);
            setForm({ githubOrg: login });
            setStep(2);
          }} />
        )}
        {step === 2 && (
          <Step2 form={form} setForm={setForm} detectedLogin={detectedLogin} onBack={() => setStep(1)} onNext={() => setStep(3)} />
        )}
        {step === 3 && (
          <Step3 form={form} setForm={setForm} onBack={() => setStep(2)} onFinish={finish} saving={saving} />
        )}
      </div>
    </div>
  );
}
