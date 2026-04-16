"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { SettingsModal } from "@/components/settings-modal";
import { log } from "@/lib/log";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function ShellLayout({ children }: { children: React.ReactNode }) {
  // Always start with checking=true (SSR-safe, avoids hydration mismatch).
  const [checking, setChecking] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cancelledRef = useRef(false);

  // useLayoutEffect fires synchronously before the browser paints.
  // If sessionStorage confirms auth, checking is set to false before the
  // spinner is ever visible — even when ShellLayout remounts on navigation.
  useLayoutEffect(() => {
    if (sessionStorage.getItem("gitvise_authed")) {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;

    // sessionStorage already set → no full check needed on this mount.
    if (sessionStorage.getItem("gitvise_authed")) {
      return () => { cancelledRef.current = true; };
    }

    async function check() {
      try {
        log.auth("checking setup status");
        const res = await fetch(`${API_BASE}/api/core/setup/status`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) throw new Error("not ok");
        const data: { completed: boolean; hasPassword: boolean } = await res.json();
        if (cancelledRef.current) return;

        if (!data.completed || !data.hasPassword) {
          log.auth("setup incomplete → redirecting to /setup");
          sessionStorage.removeItem("gitvise_authed");
          window.location.href = "/setup";
          return;
        }

        // Verify auth via protected endpoint
        log.auth("setup complete, verifying session");
        const authRes = await fetch(`${API_BASE}/api/core/setup/config`, {
          cache: "no-store",
          credentials: "include",
        });
        if (cancelledRef.current) return;

        if (authRes.status === 401) {
          log.auth("session invalid (401) → redirecting to /login");
          sessionStorage.removeItem("gitvise_authed");
          window.location.href = "/login";
          return;
        }

        log.auth("session valid, rendering app");
        sessionStorage.setItem("gitvise_authed", "1");
        setChecking(false);
      } catch {
        log.warn("auth check failed, retrying in 1s");
        if (!cancelledRef.current) setTimeout(check, 1000);
      }
    }

    check();
    return () => { cancelledRef.current = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-background)",
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-md)",
          gap: "var(--space-3)",
        }}
      >
        <span style={{ animation: "pulse 1.5s infinite" }}>◈</span>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Topbar onOpenSettings={() => setSettingsOpen(true)} />
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <Sidebar />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {children}
          </div>
        </div>
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
