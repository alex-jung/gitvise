"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { eventBus } from "@/lib/event-bus";

// ── Types (mirrors @gitvise/plugin-api without requiring the package) ─────────

type CoreEvent =
  | "github:sync:complete"
  | "github:sync:start"
  | "github:sync:error"
  | "setup:complete"
  | "license:change";

type ToastType = "info" | "success" | "warning" | "error";

interface NotifyOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface WidgetConfig {
  id: string;
  component: () => Promise<{ default: React.ComponentType<{ config: Record<string, unknown> }> }>;
}

export interface PluginAPI {
  fetch: <T = unknown>(endpoint: string, options?: RequestInit) => Promise<T>;
  navigate: (path: string) => void;
  notify: ((message: string, type?: ToastType) => void) & ((options: NotifyOptions) => void);
  registerWidget: (config: WidgetConfig) => void;
  on: (event: CoreEvent, handler: (payload?: unknown) => void) => () => void;
}

interface RemotePlugin {
  activate(api: PluginAPI): void | (() => void);
}

interface PluginEntry {
  id: string;
  hasBundle: boolean;
}

// ── Widget registry type ──────────────────────────────────────────────────────

export type WidgetComponent = React.ComponentType<{ config: Record<string, unknown> }>;

// ── Context ───────────────────────────────────────────────────────────────────

interface PluginContextValue {
  dynamicWidgets: Map<string, WidgetComponent>;
}

const PluginContext = createContext<PluginContextValue>({ dynamicWidgets: new Map() });

export function usePluginRegistry(): PluginContextValue {
  return useContext(PluginContext);
}

// ── Bundle loader ─────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function loadBundle(pluginId: string, api: PluginAPI): Promise<(() => void) | void> {
  const res = await fetch(`${API_BASE}/api/core/plugins/${pluginId}/bundle`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Bundle fetch failed with status ${res.status}`);

  const code = await res.text();
  const blob = new Blob([code], { type: "text/javascript" });
  const blobUrl = URL.createObjectURL(blob);

  try {
    // webpackIgnore keeps bundler from trying to statically resolve runtime URLs
    const mod = await import(/* webpackIgnore: true */ blobUrl);
    const plugin: RemotePlugin = mod.default ?? mod;
    if (typeof plugin?.activate !== "function") {
      throw new Error(`Plugin "${pluginId}" does not export a valid activate() function`);
    }
    return plugin.activate(api);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function PluginProvider({ children }: { children: React.ReactNode }) {
  const { notify } = useToast();
  const router = useRouter();
  const [dynamicWidgets, setDynamicWidgets] = useState<Map<string, WidgetComponent>>(
    () => new Map()
  );
  const cleanups = useRef<Array<() => void>>([]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      let plugins: PluginEntry[] = [];
      try {
        const res = await fetch(`${API_BASE}/api/core/plugins`, { credentials: "include" });
        if (!res.ok) return;
        plugins = await res.json();
      } catch {
        return;
      }

      const external = plugins.filter((p) => p.hasBundle);
      for (const p of external) {
        if (cancelled) break;
        try {
          const api = buildPluginAPI(p.id, notify, router.push, setDynamicWidgets);
          const cleanup = await loadBundle(p.id, api);
          if (typeof cleanup === "function") cleanups.current.push(cleanup);
        } catch (err) {
          console.error(`[plugin-loader] Failed to activate plugin "${p.id}":`, err);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      cleanups.current.forEach((fn) => fn());
      cleanups.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ dynamicWidgets }), [dynamicWidgets]);

  return <PluginContext.Provider value={value}>{children}</PluginContext.Provider>;
}

// ── PluginAPI factory ─────────────────────────────────────────────────────────

function buildPluginAPI(
  pluginId: string,
  notify: (message: string, type?: ToastType, duration?: number) => void,
  navigate: (path: string) => void,
  setDynamicWidgets: React.Dispatch<React.SetStateAction<Map<string, WidgetComponent>>>
): PluginAPI {
  const notifyFn = (msgOrOptions: string | NotifyOptions, type?: ToastType): void => {
    if (typeof msgOrOptions === "string") {
      notify(msgOrOptions, type ?? "info");
    } else {
      notify(msgOrOptions.message, msgOrOptions.type ?? "info", msgOrOptions.duration);
    }
  };

  const registerWidget = (config: WidgetConfig): void => {
    config
      .component()
      .then(({ default: Comp }) => {
        setDynamicWidgets((prev) => new Map(prev).set(config.id, Comp));
      })
      .catch((err) => {
        console.error(`[plugin-loader] Widget component "${config.id}" (plugin: "${pluginId}") failed to load:`, err);
      });
  };

  return {
    fetch: async <T = unknown>(endpoint: string, options?: RequestInit): Promise<T> => {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`[plugin:${pluginId}] fetch ${endpoint} failed: ${res.status}`);
      }
      return res.json() as Promise<T>;
    },
    navigate,
    notify: notifyFn as PluginAPI["notify"],
    registerWidget,
    on: (event, handler) => eventBus.on(event, handler),
  };
}
