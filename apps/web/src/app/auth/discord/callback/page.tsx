"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setRefreshToken, setToken } from "@/lib/auth";

function DiscordCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    if (accessToken) {
      setToken(accessToken);
      if (refreshToken) setRefreshToken(refreshToken);
      router.replace("/bots");
    } else {
      router.replace("/login");
    }
  }, [params, router]);

  return <div className="mx-auto max-w-md text-sm dash-muted">Finishing Discord login...</div>;
}

export default function DiscordCallbackPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md text-sm dash-muted">Finishing Discord login...</div>}>
      <DiscordCallbackContent />
    </Suspense>
  );
}
