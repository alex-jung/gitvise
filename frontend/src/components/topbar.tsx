"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { log } from "@/lib/log";

interface TopbarProps {
  onOpenSettings?: () => void;
}

export function Topbar({ onOpenSettings }: TopbarProps) {
  const router = useRouter();
  const [org, setOrg] = useState<string>("");
  const [orgs, setOrgs] = useState<string[]>([]);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  const loadConfig = () => {
    const cachedOrg = localStorage.getItem("gitvise_org");
    if (cachedOrg) setOrg(cachedOrg);
    const cachedOrgs = localStorage.getItem("gitvise_orgs");
    if (cachedOrgs) {
      try { setOrgs(JSON.parse(cachedOrgs)); } catch {}
    }

    apiGet<{ githubOrg?: string; githubOrgs?: string[] }>("/api/core/setup/config")
      .then((cfg) => {
        const name = cfg?.githubOrg ?? "";
        const list = cfg?.githubOrgs ?? [];
        log.nav("org loaded:", name, "all orgs:", list);
        setOrg(name);
        setOrgs(list);
        localStorage.setItem("gitvise_org", name);
        localStorage.setItem("gitvise_orgs", JSON.stringify(list));
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(e.target as Node)) {
        setOrgDropdownOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setAccountDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const switchOrg = async (target: string) => {
    if (target === org) {
      setOrgDropdownOpen(false);
      return;
    }
    try {
      await apiPost("/api/core/setup/switch-org", { org: target });
      setOrg(target);
      localStorage.setItem("gitvise_org", target);
      log.nav("switched to org:", target);
    } catch {
      log.error("failed to switch org");
    }
    setOrgDropdownOpen(false);
    router.refresh();
  };

  const logout = async () => {
    log.auth("logging out");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      await fetch(`${apiUrl}/api/core/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    sessionStorage.removeItem("gitvise_authed");
    log.auth("session cleared, redirecting to /login");
    window.location.href = "/login";
  };

  return (
    <header
      style={{
        height: 48,
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 var(--space-5)",
        flexShrink: 0,
        background: "var(--color-surface)",
        zIndex: 20,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Logo + Org Switcher */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            textDecoration: "none",
            color: "var(--color-text-primary)",
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>◈</span>
          <span style={{ fontWeight: 700, fontSize: "var(--font-size-md)" }}>Gitvise</span>
        </Link>

        {org && (
          <>
            <span style={{ color: "var(--color-border)", fontSize: "var(--font-size-md)" }}>/</span>

            {/* Org Dropdown */}
            <div ref={orgDropdownRef} style={{ position: "relative" }}>
              <button
                onClick={() => setOrgDropdownOpen((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                  padding: "var(--space-1) var(--space-2)",
                  background: orgDropdownOpen ? "var(--color-sidebar-item-active)" : "transparent",
                  border: "1px solid transparent",
                  borderRadius: "var(--radius-md)",
                  color: "var(--color-text-primary)",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 120ms, border-color 120ms",
                }}
                onMouseEnter={(e) => {
                  if (!orgDropdownOpen) e.currentTarget.style.background = "var(--color-sidebar-item-active)";
                }}
                onMouseLeave={(e) => {
                  if (!orgDropdownOpen) e.currentTarget.style.background = "transparent";
                }}
              >
                {org}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  style={{
                    color: "var(--color-text-muted)",
                    transform: orgDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 120ms",
                  }}
                >
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {orgDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    minWidth: 200,
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-lg)",
                    overflow: "hidden",
                    zIndex: 100,
                  }}
                >
                  <div style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--color-border)" }}>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                      Switch org / user
                    </span>
                  </div>

                  {orgs.map((o) => (
                    <button
                      key={o}
                      onClick={() => switchOrg(o)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "var(--space-2)",
                        padding: "var(--space-3) var(--space-4)",
                        background: o === org ? "var(--color-sidebar-item-active)" : "transparent",
                        border: "none",
                        color: "var(--color-text-primary)",
                        fontSize: "var(--font-size-sm)",
                        cursor: o === org ? "default" : "pointer",
                        textAlign: "left",
                        transition: "background 120ms",
                      }}
                      onMouseEnter={(e) => {
                        if (o !== org) e.currentTarget.style.background = "var(--color-sidebar-item-active)";
                      }}
                      onMouseLeave={(e) => {
                        if (o !== org) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span>{o}</span>
                      {o === org && (
                        <span style={{ color: "var(--color-primary)", fontSize: 12 }}>✓</span>
                      )}
                    </button>
                  ))}

                  <div style={{ borderTop: "1px solid var(--color-border)", padding: "var(--space-1)" }}>
                    <button
                      onClick={() => { setOrgDropdownOpen(false); onOpenSettings?.(); }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        padding: "var(--space-2) var(--space-3)",
                        background: "transparent",
                        border: "none",
                        color: "var(--color-text-muted)",
                        fontSize: "var(--font-size-sm)",
                        cursor: "pointer",
                        borderRadius: "var(--radius-sm)",
                        transition: "background 120ms, color 120ms",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--color-sidebar-item-active)";
                        e.currentTarget.style.color = "var(--color-text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--color-text-muted)";
                      }}
                    >
                      <span>+</span>
                      <span>Add org / user</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        {/* Settings icon */}
        <button
          type="button"
          title="Settings"
          onClick={onOpenSettings}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-muted)",
            background: "transparent",
            border: "none",
            fontSize: 16,
            cursor: "pointer",
            transition: "background 120ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-border)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          ⚙
        </button>

        {/* Avatar / user dropdown */}
        <div ref={accountDropdownRef} style={{ position: "relative" }}>
          <button
            onClick={() => setAccountDropdownOpen((v) => !v)}
            title="Account"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "var(--radius-full)",
              background: accountDropdownOpen ? "var(--color-primary)" : "var(--color-border)",
              color: accountDropdownOpen ? "var(--color-text-inverse)" : "var(--color-text-muted)",
              border: "none",
              cursor: "pointer",
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
              transition: "background 120ms, color 120ms",
            }}
          >
            A
          </button>

          {accountDropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                minWidth: 160,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-lg)",
                overflow: "hidden",
                zIndex: 100,
              }}
            >
              <button
                onClick={logout}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-3) var(--space-4)",
                  background: "transparent",
                  border: "none",
                  color: "var(--color-text-primary)",
                  fontSize: "var(--font-size-sm)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-sidebar-item-active)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span>⎋</span>
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
