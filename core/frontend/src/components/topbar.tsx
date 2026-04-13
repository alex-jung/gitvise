"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api";

export function Topbar() {
  const router = useRouter();
  const [org, setOrg] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGet<{ githubOrg?: string }>("/api/core/setup/config")
      .then((cfg) => setOrg(cfg?.githubOrg ?? ""))
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
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      await fetch(`${apiUrl}/api/core/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    router.replace("/login");
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
        <Link
          href="/settings"
          title="Settings"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-muted)",
            textDecoration: "none",
            fontSize: 16,
            transition: "background 120ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-border)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          ⚙
        </Link>

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
