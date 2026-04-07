export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold">gitvise</span>
          <a
            href="https://github.com/alex-jung/gitvise"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-32 text-center">
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          Your GitHub.
          <br />
          Your Infrastructure.
          <br />
          <span className="text-blue-400">Full Visibility.</span>
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Self-Hosted GitHub Dashboard für Orgs & User. Repository Health,
          CI/CD Metriken, Dependency Status, Team Activity – alles an einem
          Ort.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href="https://github.com/alex-jung/gitvise"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            GitHub ansehen
          </a>
          <a
            href="#quickstart"
            className="border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Quick Start
          </a>
        </div>
      </section>

      {/* Quick Start */}
      <section id="quickstart" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-4 text-center">Quick Start</h2>
        <p className="text-gray-400 text-center mb-10">
          In 30 Sekunden loslegen. Kein Repo klonen, kein Build-Prozess.
        </p>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-2xl mx-auto">
          <pre className="text-sm text-green-400 overflow-x-auto">
            <code>{`docker pull ghcr.io/alex-jung/gitvise:latest
docker run -d \\
  -p 3000:3000 \\
  -e GITHUB_TOKEN=ghp_xxx \\
  -v gitvise-data:/data \\
  ghcr.io/alex-jung/gitvise:latest

# Open http://localhost:3000`}</code>
          </pre>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-12 text-center">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: "Repository Health",
              description:
                "Health Score, Stale Repos, Missing Files, Branch Protection Status.",
            },
            {
              title: "Pull Requests & Issues",
              description:
                "Cycle Time, Review Bottlenecks, Stale PRs, Assignee Workload.",
            },
            {
              title: "CI/CD & Actions",
              description:
                "Workflow Status, Run History, Failure Detection, Duration Trends.",
            },
            {
              title: "Dependencies & Security",
              description:
                "Dependabot Alerts, Severity Breakdown, License Overview.",
            },
            {
              title: "Team & Activity",
              description:
                "Contributor Analytics, Commit Activity, Activity Heatmap.",
            },
            {
              title: "Alerts & Notifications",
              description: "Slack, Discord, Teams Webhooks, Email Digest.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-gray-900 border border-gray-800 rounded-xl p-6"
            >
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-12 text-center">Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
            <h3 className="text-xl font-bold mb-2">Community</h3>
            <div className="text-4xl font-bold mb-6">
              €0<span className="text-lg text-gray-400">/mo</span>
            </div>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ Alle Core Features</li>
              <li>✓ Unbegrenzte Repos</li>
              <li>✓ Self-Hosted</li>
              <li>✓ Open Source (MIT)</li>
            </ul>
          </div>
          <div className="bg-blue-950 border border-blue-700 rounded-xl p-8 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-xs px-3 py-1 rounded-full">
              Popular
            </span>
            <h3 className="text-xl font-bold mb-2">Pro</h3>
            <div className="text-4xl font-bold mb-6">
              €29<span className="text-lg text-gray-400">/mo</span>
            </div>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ Alles aus Community</li>
              <li>✓ Cost Analytics</li>
              <li>✓ Advanced Analytics</li>
              <li>✓ Security Deep Dive</li>
              <li>✓ REST API</li>
            </ul>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
            <h3 className="text-xl font-bold mb-2">Enterprise</h3>
            <div className="text-4xl font-bold mb-6">
              Custom
            </div>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ Alles aus Pro</li>
              <li>✓ SSO/SAML</li>
              <li>✓ RBAC</li>
              <li>✓ Multi-Org</li>
              <li>✓ Priority Support</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8 mt-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-gray-500 text-sm">
          <span>© 2026 gitvise. MIT License.</span>
          <a
            href="https://github.com/alex-jung/gitvise"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
