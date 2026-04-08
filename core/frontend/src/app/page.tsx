import { redirect } from "next/navigation";

/**
 * Returns true  → setup done
 * Returns false → setup not done
 * Returns null  → backend unreachable (don't assume setup is needed)
 */
async function getSetupStatus(): Promise<boolean | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const res = await fetch(`${apiUrl}/api/core/setup/status`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data: { completed: boolean } = await res.json();
    return data.completed;
  } catch {
    return null; // backend not reachable – don't redirect to /setup
  }
}

export default async function Home() {
  const status = await getSetupStatus();
  // Only send to /setup when we know for certain it's not done.
  // On backend unreachable (null) go to /overview – it will show its own error.
  redirect(status === false ? "/setup" : "/overview");
}
