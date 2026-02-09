"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Bot, Home, Settings, ChevronLeft, Book, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserNav } from "./user-nav";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/bots", label: "Bots", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings }
];

function useShellMode(pathname: string | null) {
  const isBuilder = Boolean(pathname && pathname.includes("/builder"));
  const isAuth =
    Boolean(pathname && (pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/auth/")));
  return { isBuilder, isAuth };
}

function getTitle(pathname: string | null) {
  if (!pathname) return "Dashboard";
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/bots")) return "Bots";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Workspace";
}

function getSubtitle(pathname: string | null) {
  if (!pathname || pathname === "/") return "overview";
  if (pathname.startsWith("/bots")) return "bot management";
  if (pathname.startsWith("/settings")) return "configuration";
  return "workspace";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isBuilder, isAuth } = useShellMode(pathname);
  const title = useMemo(() => getTitle(pathname), [pathname]);
  const subtitle = useMemo(() => getSubtitle(pathname), [pathname]);

  if (isBuilder) {
    return <>{children}</>;
  }

  if (isAuth) {
    return (
      <div className="min-h-screen bg-app text-fog">
        <div className="grid min-h-screen place-items-center px-6 py-10">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app text-fog">
      <div className="flex min-h-screen">
        <aside className="hidden w-[248px] shrink-0 border-r border-white/10 bg-[var(--bg-sidebar)] lg:block">
          <div className="flex h-full flex-col gap-5 px-4 py-4">
            <div className="dash-panel-soft flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-violet-500/20 text-violet-200">N</div>
                <div>
                  <p className="text-sm font-semibold text-fog">NZ Helper</p>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-fog/50">workspace</p>
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 rotate-180 text-fog/40" />
            </div>

            <div className="dash-panel-soft px-3 py-2">
              <UserNav />
            </div>

            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "bg-white/10 text-fog"
                        : "text-fog/65 hover:bg-white/5 hover:text-fog"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </a>
                );
              })}
            </nav>

            <div className="mt-2 space-y-1">
              <p className="px-3 text-[10px] uppercase tracking-[0.22em] text-fog/40">Tools</p>
              <a href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-fog/65 hover:bg-white/5 hover:text-fog">
                <Book className="h-4 w-4" />
                Docs
              </a>
              <a href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-fog/65 hover:bg-white/5 hover:text-fog">
                <ShieldCheck className="h-4 w-4" />
                Status
              </a>
            </div>

            <div className="mt-auto dash-panel-soft p-3">
              <p className="text-xs font-semibold text-fog">sniffleGhost Studio</p>
              <p className="mt-1 text-xs text-fog/55">Build command and event flows with persistent hosting.</p>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-white/10 bg-[#20252d] px-4 py-3 lg:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="dash-subtitle">{subtitle}</p>
                <h1 className="dash-title text-fog">{title}</h1>
              </div>
              <div className="dash-panel-soft px-3 py-2 text-xs text-fog/60 lg:hidden">
                <UserNav />
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto px-4 py-4 lg:px-6 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

