"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api";
import { log } from "@/lib/log";

interface TopbarProps {
  onOpenSettings?: () => void;
}

export function Topbar({ onOpenSettings }: TopbarProps) {
  const router = useRouter();
  // Always start empty (SSR-safe). useEffect reads cache + fetches.
  const [org, setOrg] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Show cached value immediately (no flash), then refresh from API
    const cached = localStorage.getItem("gitvise_org");
    if (cached) {
      log.nav("org name loaded from cache:", cached);
      setOrg(cached);
    }

    apiGet<{ githubOrg?: string }>("/api/core/setup/config")
      .then((cfg) => {
        const name = cfg?.githubOrg ?? "";
        log.nav("org name fetched from API:", name);
        setOrg(name);
        localStorage.setItem("gitvise_org", name);
      })
      .catch(() => {});
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

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
      {/* Logo */}
      <Link
        href="/overview"
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
        {org && (
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginLeft: "var(--space-1)" }}>
            / {org}
          </span>
        )}
      </Link>

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
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            title="Account"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "var(--radius-full)",
              background: dropdownOpen ? "var(--color-primary)" : "var(--color-border)",
              color: dropdownOpen ? "var(--color-text-inverse)" : "var(--color-text-muted)",
              border: "none",
              cursor: "pointer",
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
              transition: "background 120ms, color 120ms",
            }}
          >
            A
          </button>

          {dropdownOpen && (
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
