const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function redirect401() {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (res.status === 401) {
    redirect401();
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (res.status === 401) {
    redirect401();
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}
