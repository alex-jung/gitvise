import { Topbar } from "@/components/topbar";
import { HealthBar, HealthBadge } from "@/components/health-badge";
import Link from "next/link";

// Placeholder data – wird in Phase 2 durch echte Plugin-Daten ersetzt
const MOCK_REPOS = [
  { name: "api-service", fullName: "acme/api-service", language: "TypeScript", healthScore: 28, pushedAt: "2026-02-24", openIssuesCount: 12 },
  { name: "frontend", fullName: "acme/frontend", language: "TypeScript", healthScore: 45, pushedAt: "2026-03-23", openIssuesCount: 3 },
  { name: "data-pipeline", fullName: "acme/data-pipeline", language: "Python", healthScore: 60, pushedAt: "2026-04-05", openIssuesCount: 7 },
  { name: "auth-service", fullName: "acme/auth-service", language: "Go", healthScore: 70, pushedAt: "2026-04-06", openIssuesCount: 1 },
  { name: "docs", fullName: "acme/docs", language: "Markdown", healthScore: 85, pushedAt: "2026-04-02", openIssuesCount: 0 },
  { name: "infra", fullName: "acme/infra", language: "HCL", healthScore: 92, pushedAt: "2026-04-07", openIssuesCount: 0 },
];

const avgScore = Math.round(MOCK_REPOS.reduce((s, r) => s + r.healthScore, 0) / MOCK_REPOS.length);
const critical = MOCK_REPOS.filter((r) => r.healthScore < 40).length;
const stale = MOCK_REPOS.filter((r) => {
  const days = (Date.now() - new Date(r.pushedAt).getTime()) / 86400000;
  return days > 30;
}).length;

function daysSince(date: string) {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  return d === 0 ? "heute" : d === 1 ? "gestern" : `vor ${d}d`;
}

export default function OverviewPage() {
  const attention = MOCK_REPOS.filter((r) => r.healthScore < 70).slice(0, 4);

  return (
    <>
      <Topbar org="acme-corp" />
      <main className="flex-1 p-6 overflow-auto">
        {/* Org Health Score */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Org Health Score</span>
            <span className="font-bold text-lg">{avgScore}/100</span>
          </div>
          <div className="w-64">
            <HealthBar score={avgScore} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 max-w-xl">
          {[
            { value: MOCK_REPOS.length, label: "Repositories", color: "var(--color-text-primary)" },
            { value: critical, label: "Critical (Score < 40)", color: "var(--color-danger)" },
            { value: stale, label: "Stale (> 30 Tage)", color: "var(--color-warning)" },
          ].map(({ value, label, color }) => (
            <div
              key={label}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                padding: "var(--space-4)",
              }}
            >
              <div className="text-2xl font-bold" style={{ color }}>{value}</div>
              <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Attention Required */}
        <div className="mb-8">
          <h2
            className="text-sm font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--color-text-muted)" }}
          >
            Attention Required
          </h2>
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            {attention.map((repo) => (
              <Link
                key={repo.fullName}
                href={`/repos/${repo.fullName}`}
                className="flex items-center gap-4 px-4 py-3 transition-colors"
                style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
              >
                <span className="text-sm font-medium w-48 truncate">{repo.name}</span>
                <div className="flex-1">
                  <HealthBar score={repo.healthScore} />
                </div>
                <span className="text-xs w-16 text-right" style={{ color: "var(--color-text-muted)" }}>
                  {daysSince(repo.pushedAt)}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* All Repos Table */}
        <div>
          <h2
            className="text-sm font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--color-text-muted)" }}
          >
            Alle Repositories
          </h2>
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              overflow: "hidden",
            }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Sprache</th>
                  <th className="text-left px-4 py-3 w-40">Health</th>
                  <th className="text-left px-4 py-3">Letzte Aktivität</th>
                  <th className="text-right px-4 py-3">Issues</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_REPOS.map((repo) => (
                  <tr
                    key={repo.fullName}
                    style={{ borderTop: "1px solid var(--color-border-subtle)" }}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/repos/${repo.fullName}`} style={{ color: "var(--color-primary)" }}>
                        {repo.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--color-text-muted)" }}>{repo.language ?? "—"}</td>
                    <td className="px-4 py-3">
                      <HealthBadge score={repo.healthScore} />
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--color-text-muted)" }}>{daysSince(repo.pushedAt)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--color-text-muted)" }}>{repo.openIssuesCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
