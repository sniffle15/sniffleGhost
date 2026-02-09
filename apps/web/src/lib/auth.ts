import { API_URL } from "./api";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", token);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

export function setRefreshToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("refreshToken", token);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export async function authFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });
  const text = await res.text();
  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      message = parsed?.message ? JSON.stringify(parsed.message) : JSON.stringify(parsed);
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  return text ? JSON.parse(text) : null;
}
