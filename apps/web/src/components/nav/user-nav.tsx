"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { clearTokens, getToken } from "@/lib/auth";

interface Profile {
  id: string;
  name?: string | null;
  discordName?: string | null;
  discordAvatar?: string | null;
}

export function UserNav() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (!profile) {
    return (
      <a
        href="/login"
        className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-fog/75 hover:text-fog"
      >
        Login
      </a>
    );
  }

  const label = profile.discordName || profile.name || "User";

  return (
    <div className="flex items-center justify-between gap-3 text-sm text-fog/70">
      <div className="flex items-center gap-2">
        {profile.discordAvatar ? (
          <img
            src={profile.discordAvatar}
            alt={label}
            className="h-8 w-8 rounded-full border border-white/15 object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full border border-white/15 bg-white/10" />
        )}
        <div>
          <p className="text-sm text-fog leading-none">{label}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-fog/45">Online</p>
        </div>
      </div>
      <button
        className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-fog/65 hover:text-fog"
        onClick={() => {
          clearTokens();
          window.location.href = "/login";
        }}
      >
        Logout
      </button>
    </div>
  );
}
