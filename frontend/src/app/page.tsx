"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`${apiUrl}/api/core/setup/status`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) throw new Error("not ok");
        const data: { completed: boolean; hasPassword: boolean } = await res.json();
        if (cancelled) return;
        if (!data.hasPassword) {
          router.replace("/setup");
        } else if (!data.completed) {
          router.replace("/setup");
        } else {
          // Setup done – check if we have a valid session
          const authRes = await fetch(`${apiUrl}/api/core/auth/status`, {
            cache: "no-store",
            credentials: "include",
          });
          if (cancelled) return;
          // Try a protected endpoint to see if we're authenticated
          const sessionRes = await fetch(`${apiUrl}/api/core/setup/config`, {
            cache: "no-store",
            credentials: "include",
          });
          if (cancelled) return;
          if (sessionRes.status === 401) {
            router.replace("/login");
          } else {
            router.replace("/dashboard");
          }
        }
      } catch {
        // Backend not ready yet – retry after 1s
        if (!cancelled) setTimeout(check, 1000);
      }
    }

    check();
    return () => { cancelled = true; };
  }, [router]);

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
      Connecting to backend...
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
