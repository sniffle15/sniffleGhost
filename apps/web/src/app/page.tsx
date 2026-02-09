import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <section className="dash-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-rose-500/20 text-rose-200">/</div>
            <div>
              <p className="dash-subtitle">Control</p>
              <h2 className="dash-title">Custom Commands</h2>
              <p className="mt-1 text-sm dash-muted">Create custom slash commands and event automations.</p>
            </div>
          </div>
          <Button size="sm" asChild>
            <a href="/settings">Docs</a>
          </Button>
        </div>
      </section>

      <section className="dash-panel p-5">
        <p className="dash-subtitle">Quick Start</p>
        <h3 className="mt-1 text-2xl font-display">Build New Command</h3>
        <div className="mt-4 rounded-xl border border-white/10 bg-[#242932] p-6">
          <div className="grid place-items-center rounded-xl border border-white/10 bg-[#2b313b] py-16">
            <div className="text-center">
              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg bg-amber-400/20 text-amber-200">↗</div>
              <p className="text-base font-semibold text-fog">Command Builder</p>
              <p className="mt-1 text-sm dash-muted">Open a bot and start building a custom command flow.</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button asChild>
                  <a href="/bots">Open Bots</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/bots">Create Bot</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="dash-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="dash-subtitle">Status</p>
            <h3 className="mt-1 text-2xl font-display">Workspace Overview</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/bots">Bots</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/settings">Settings</a>
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="dash-panel-soft p-4">
            <p className="dash-subtitle">Builder</p>
            <p className="mt-1 text-sm dash-muted">Node-based command and event workflows.</p>
          </div>
          <div className="dash-panel-soft p-4">
            <p className="dash-subtitle">Hosting</p>
            <p className="mt-1 text-sm dash-muted">Start/stop bots and keep runtime logs in one place.</p>
          </div>
          <div className="dash-panel-soft p-4">
            <p className="dash-subtitle">Discord</p>
            <p className="mt-1 text-sm dash-muted">Sync slash commands and execute workflows live.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
