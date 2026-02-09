export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <section className="dash-panel p-5">
        <p className="dash-subtitle">Settings</p>
        <h2 className="dash-title">Workspace Settings</h2>
        <p className="mt-2 text-sm dash-muted">
          Configure OAuth, runner secret, encryption keys and deployment defaults in your environment files.
        </p>
      </section>

      <section className="dash-panel p-5">
        <h3 className="text-xl font-display">Quick References</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="dash-panel-soft p-4">
            <p className="dash-subtitle">API</p>
            <p className="mt-1 text-sm text-fog">
              <code>http://localhost:4000/docs</code>
            </p>
          </div>
          <div className="dash-panel-soft p-4">
            <p className="dash-subtitle">Web</p>
            <p className="mt-1 text-sm text-fog">
              <code>http://localhost:3000</code>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
