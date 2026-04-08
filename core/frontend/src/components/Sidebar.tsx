"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PluginNavItem {
  label: string;
  icon: string;
  path: string;
  order: number;
}

interface Plugin {
  id: string;
  tier: string;
  ui: { navItem: PluginNavItem };
}

// Core nav items (always present, not from plugins)
const CORE_NAV = [{ href: "/overview", label: "Overview", icon: "◈", order: 0 }];

// ── Component ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [plugins, setPlugins] = useState<Plugin[]>([]);

  // Persist collapse state
  useEffect(() => {
    const stored = localStorage.getItem("sidebar_collapsed");
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  const toggleCollapse = () => {
    setCollapsed((v) => {
      localStorage.setItem("sidebar_collapsed", String(!v));
      return !v;
    });
  };

  // Load plugin manifests to build nav
  useEffect(() => {
    apiGet<Plugin[]>("/api/core/plugins")
      .then(setPlugins)
      .catch(() => {}); // silent – no plugins in Phase 1
  }, []);

  const pluginNavItems = plugins
    .filter((p) => p.ui?.navItem?.path)
    .map((p) => ({
      href: p.ui.navItem.path,
      label: p.ui.navItem.label,
      icon: p.ui.navItem.icon ?? "◉",
      order: p.ui.navItem.order ?? 99,
      isPro: p.tier === "pro",
    }))
    .sort((a, b) => a.order - b.order);

  const allNavItems = [
    ...CORE_NAV.map((n) => ({ ...n, isPro: false })),
    ...pluginNavItems,
  ];

  const width = collapsed
    ? "var(--sidebar-width-collapsed)"
    : "var(--sidebar-width-expanded)";

  const close = () => setMobileOpen(false);

  const sidebarContent = (
    <aside
      style={{
        width,
        minWidth: width,
        background: "var(--color-sidebar-bg)",
        borderRight: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "var(--sidebar-transition)",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "var(--space-4)",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          minHeight: 52,
        }}
      >
        <span style={{ fontSize: 20, flexShrink: 0 }}>◈</span>
        {!collapsed && (
          <span
            style={{
              fontWeight: 700,
              fontSize: "var(--font-size-lg)",
              color: "var(--color-text-primary)",
              whiteSpace: "nowrap",
            }}
          >
            Gitvise
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "var(--space-3) var(--space-2)", overflowY: "auto" }}>
        {allNavItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              title={collapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                marginBottom: 2,
                background: active ? "var(--color-sidebar-item-active)" : "transparent",
                color: active ? "var(--color-text-primary)" : "var(--color-sidebar-text)",
                textDecoration: "none",
                fontSize: "var(--font-size-md)",
                borderLeft: active ? "2px solid var(--color-primary)" : "2px solid transparent",
                transition: "background 120ms",
                whiteSpace: "nowrap",
                justifyContent: collapsed ? "center" : "flex-start",
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && (
                <>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.isPro && (
                    <span
                      style={{
                        fontSize: "var(--font-size-xs)",
                        padding: "1px 5px",
                        borderRadius: "var(--radius-full)",
                        background: "var(--color-primary)",
                        color: "var(--color-text-inverse)",
                        fontWeight: 600,
                      }}
                    >
                      Pro
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings + Toggle */}
      <div style={{ borderTop: "1px solid var(--color-border)", padding: "var(--space-2)" }}>
        <Link
          href="/settings"
          onClick={close}
          title={collapsed ? "Settings" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-sidebar-text)",
            textDecoration: "none",
            fontSize: "var(--font-size-md)",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <span style={{ fontSize: 16 }}>⚙</span>
          {!collapsed && <span>Settings</span>}
        </Link>

        <button
          onClick={toggleCollapse}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: "var(--space-3)",
            width: "100%",
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-md)",
            background: "transparent",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: "var(--font-size-sm)",
          }}
        >
          <span style={{ fontSize: 14 }}>{collapsed ? "›" : "‹"}</span>
          {!collapsed && <span>Einklappen</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex" style={{ height: "100vh", position: "sticky", top: 0 }}>
        {sidebarContent}
      </div>

      {/* Mobile: hamburger + overlay */}
      <div className="lg:hidden">
        {/* Hamburger – hidden when menu is open (overlay takes over) */}
        {!mobileOpen && (
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              position: "fixed",
              top: "var(--space-4)",
              left: "var(--space-4)",
              zIndex: 200,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-2)",
              cursor: "pointer",
              color: "var(--color-text-primary)",
              lineHeight: 1,
            }}
          >
            ☰
          </button>
        )}

        {/* Full-screen overlay – pointerDown on backdrop closes instantly */}
        {mobileOpen && (
          <div
            onPointerDown={() => setMobileOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 150,
            }}
          >
            <div
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: 280,
                display: "flex",
              }}
            >
              {sidebarContent}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
