"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { eventBus } from "@/lib/event-bus";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LicenseStatus {
  valid: boolean;
  tier: "community" | "pro";
  email?: string;
  expiresAt?: string;
  /** True when status is served from the local cache (no recent server contact). */
  offline?: boolean;
  /** Present when valid=false – machine-readable reason code. */
  reason?: string;
  /** True when a key is stored but could not yet be validated. */
  hasKey?: boolean;
}

const DEFAULT_STATUS: LicenseStatus = {
  valid: false,
  tier: "community",
  reason: "loading",
};

// ── Context ───────────────────────────────────────────────────────────────────

interface LicenseContextValue {
  status: LicenseStatus;
  isPro: boolean;
  refresh: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextValue>({
  status: DEFAULT_STATUS,
  isPro: false,
  refresh: async () => {},
});

export function useLicense(): LicenseContextValue {
  return useContext(LicenseContext);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LicenseStatus>(DEFAULT_STATUS);

  const refresh = async () => {
    try {
      const s = await apiGet<LicenseStatus>("/api/core/license/status");
      setStatus(s);
    } catch {
      // keep previous status on transient network errors
    }
  };

  useEffect(() => {
    refresh();
    // Re-check after every license:change event (activation / removal)
    const unsub = eventBus.on("license:change", refresh);
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPro = status.valid && status.tier === "pro";

  return (
    <LicenseContext.Provider value={{ status, isPro, refresh }}>
      {children}
    </LicenseContext.Provider>
  );
}
