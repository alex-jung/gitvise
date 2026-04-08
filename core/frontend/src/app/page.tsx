import { redirect } from "next/navigation";

async function getSetupStatus(): Promise<boolean> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const res = await fetch(`${apiUrl}/api/core/setup/status`, {
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data: { completed: boolean } = await res.json();
    return data.completed;
  } catch {
    return false;
  }
}

export default async function Home() {
  const completed = await getSetupStatus();
  redirect(completed ? "/overview" : "/setup");
}
