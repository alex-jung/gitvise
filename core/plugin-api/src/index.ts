/**
 * @gitvise/plugin-api
 *
 * The stable public API that every Gitvise plugin must use to interact
 * with the Core. Plugins receive this API when they are activated and
 * may only communicate with Core via these interfaces.
 *
 * Core internals, other plugins' state, and the raw DOM outside the
 * plugin's own container are never accessible.
 */

// ── Navigation ────────────────────────────────────────────────────────────────

export interface PluginNavigate {
  (path: string): void;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type ToastType = "info" | "success" | "warning" | "error";

export interface NotifyOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export interface PluginNotify {
  (message: string, type?: ToastType): void;
  (options: NotifyOptions): void;
}

// ── Data fetching ─────────────────────────────────────────────────────────────

export interface PluginFetch {
  <T = unknown>(endpoint: string, options?: RequestInit): Promise<T>;
}

// ── Widget registry ───────────────────────────────────────────────────────────

export type WidgetSlot =
  | "dashboard-card"
  | "sidebar-widget"
  | "header-status"
  | "full-page";

export interface WidgetConfig {
  id: string;
  slot: WidgetSlot;
  /** REST endpoint that provides the widget's data */
  dataEndpoint: string;
  component: () => Promise<{ default: React.ComponentType }>;
}

export interface PluginRegisterWidget {
  (config: WidgetConfig): void;
}

// ── Event bus ─────────────────────────────────────────────────────────────────

export type CoreEvent =
  | "github:sync:complete"
  | "github:sync:start"
  | "github:sync:error"
  | "setup:complete"
  | "license:change";

export interface PluginOn {
  (event: CoreEvent, handler: (payload?: unknown) => void): () => void;
}

// ── Plugin Manifest ───────────────────────────────────────────────────────────

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  /** "community" | "pro" */
  tier: string;
  description: string;
  requires?: {
    core?: string;
    githubScopes?: string[];
  };
  ui: {
    navItem: {
      label: string;
      icon: string;
      path: string;
      order: number;
    };
    dashboardWidgets?: Array<{
      id: string;
      slot: WidgetSlot;
      dataEndpoint: string;
    }>;
  };
  backend: {
    routes: Array<{ method: string; path: string }>;
    syncHooks: string[];
  };
  license: {
    required: boolean;
  };
}

// ── License ───────────────────────────────────────────────────────────────────

export interface LicenseStatus {
  valid: boolean;
  /** "community" | "pro" */
  tier: string;
  email?: string;
  /** ISO-8601 expiry date, if provided by the license server */
  expiresAt?: string;
  /** True when status is served from the local cache (no recent server contact) */
  offline?: boolean;
  /** Machine-readable reason code when valid=false */
  reason?: string;
}

export interface PluginGetLicense {
  (): LicenseStatus;
}

// ── Plugin API (passed to activate()) ────────────────────────────────────────

export interface PluginAPI {
  fetch: PluginFetch;
  navigate: PluginNavigate;
  notify: PluginNotify;
  registerWidget: PluginRegisterWidget;
  on: PluginOn;
  getLicense: PluginGetLicense;
}

// ── Plugin entry point ────────────────────────────────────────────────────────

export interface GitvisePlugin {
  /**
   * Called once when the plugin is first loaded.
   * The plugin should register widgets, listen to events, etc.
   * Returns an optional cleanup function.
   */
  activate(api: PluginAPI): void | (() => void);
}
