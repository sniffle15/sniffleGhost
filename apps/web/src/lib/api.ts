const isProd = process.env.NODE_ENV === "production";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (isProd ? "" : "http://localhost:4000");

if (isProd && !API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is required in production");
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {})
    },
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  return res.json();
}
