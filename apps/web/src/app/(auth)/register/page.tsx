"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/lib/api";
import { setRefreshToken, setToken } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values)
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.message ?? "Registration failed");
      return;
    }
    if (data.accessToken) {
      setToken(data.accessToken);
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      router.push("/bots");
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="dash-panel p-6">
        <p className="dash-subtitle">Account</p>
        <h2 className="mt-1 text-3xl font-display">Create Account</h2>
        <p className="mt-1 text-sm dash-muted">Local login for dev/testing.</p>

        <div className="mt-5 space-y-4">
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              window.location.href = `${API_URL}/auth/discord/login`;
            }}
          >
            Continue with Discord
          </Button>

          <div className="flex items-center gap-3 text-xs text-fog/40">
            <div className="h-px flex-1 bg-white/10" />
            or
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <Input placeholder="Display name" {...register("name")} />
            <Input placeholder="you@example.com" {...register("email")} />
            <Input type="password" placeholder="Password" {...register("password")} />
            {formState.errors.email && <p className="text-xs text-rose-200">Invalid email</p>}
            {formState.errors.password && <p className="text-xs text-rose-200">Password too short</p>}
            {error && <p className="text-xs text-rose-200">{String(error)}</p>}
            <Button type="submit" className="w-full">Create account</Button>
          </form>

          <p className="text-xs dash-muted">
            Already have an account? <a className="underline" href="/login">Login</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
