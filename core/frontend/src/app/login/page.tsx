"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/core/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });
      if (res.status === 429) {
        setError("Too many failed attempts. Try again in 15 minutes.");
        return;
      }
      if (res.status === 401) {
        setError("Invalid password.");
        return;
      }
      if (!res.ok) {
        setError("Login failed. Please try again.");
        return;
      }
      router.replace("/overview");
    } catch {
      setError("Could not reach backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-background)",
        padding: "var(--space-6)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-8)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
          <div style={{ fontSize: 32, marginBottom: "var(--space-3)" }}>◈</div>
          <h1
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-1)",
            }}
          >
            Gitvise
          </h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
            Enter your admin password to continue
          </p>
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom: "var(--space-5)" }}>
            <label
              style={{
                display: "block",
                fontWeight: 500,
                fontSize: "var(--font-size-md)",
                marginBottom: "var(--space-2)",
                color: "var(--color-text-primary)",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "var(--space-3) var(--space-4)",
                background: "var(--color-background)",
                border: `1px solid ${error ? "var(--color-danger)" : "var(--color-border)"}`,
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
                fontSize: "var(--font-size-md)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-danger)",
                background: "var(--color-surface)",
                color: "var(--color-danger)",
                fontSize: "var(--font-size-sm)",
                marginBottom: "var(--space-5)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: "100%",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-primary)",
              color: "var(--color-text-inverse)",
              border: "none",
              fontWeight: 600,
              fontSize: "var(--font-size-md)",
              cursor: loading || !password ? "not-allowed" : "pointer",
              opacity: loading || !password ? 0.6 : 1,
              transition: "opacity 150ms",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
