import { int, sqliteTable, text, real } from "drizzle-orm/sqlite-core";

export const repositories = sqliteTable("repositories", {
  id: int().primaryKey({ autoIncrement: true }),
  githubId: int("github_id").notNull().unique(),
  name: text().notNull(),
  fullName: text("full_name").notNull(),
  description: text(),
  private: int({ mode: "boolean" }).notNull().default(false),
  fork: int({ mode: "boolean" }).notNull().default(false),
  archived: int({ mode: "boolean" }).notNull().default(false),
  defaultBranch: text("default_branch").notNull().default("main"),
  language: text(),
  stargazersCount: int("stargazers_count").notNull().default(0),
  forksCount: int("forks_count").notNull().default(0),
  openIssuesCount: int("open_issues_count").notNull().default(0),
  sizeKb: int("size_kb").notNull().default(0),
  hasReadme: int("has_readme", { mode: "boolean" }).notNull().default(false),
  hasLicense: int("has_license", { mode: "boolean" }).notNull().default(false),
  hasCodeowners: int("has_codeowners", { mode: "boolean" }).notNull().default(false),
  branchProtection: int("branch_protection", { mode: "boolean" }).notNull().default(false),
  healthScore: real("health_score"),
  pushedAt: text("pushed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  syncedAt: text("synced_at"),
});

export const pullRequests = sqliteTable("pull_requests", {
  id: int().primaryKey({ autoIncrement: true }),
  githubId: int("github_id").notNull().unique(),
  repoId: int("repo_id").notNull().references(() => repositories.id),
  number: int().notNull(),
  title: text().notNull(),
  state: text().notNull(), // open | closed | merged
  draft: int({ mode: "boolean" }).notNull().default(false),
  authorLogin: text("author_login"),
  assigneeLogin: text("assignee_login"),
  reviewersCount: int("reviewers_count").notNull().default(0),
  commentsCount: int("comments_count").notNull().default(0),
  additions: int().notNull().default(0),
  deletions: int().notNull().default(0),
  openedAt: text("opened_at").notNull(),
  mergedAt: text("merged_at"),
  closedAt: text("closed_at"),
  cycleTimeHours: real("cycle_time_hours"),
  syncedAt: text("synced_at"),
});

export const workflows = sqliteTable("workflows", {
  id: int().primaryKey({ autoIncrement: true }),
  githubId: int("github_id").notNull().unique(),
  repoId: int("repo_id").notNull().references(() => repositories.id),
  name: text().notNull(),
  state: text().notNull(), // active | disabled
  path: text().notNull(),
  syncedAt: text("synced_at"),
});

export const workflowRuns = sqliteTable("workflow_runs", {
  id: int().primaryKey({ autoIncrement: true }),
  githubId: int("github_id").notNull().unique(),
  workflowId: int("workflow_id").notNull().references(() => workflows.id),
  repoId: int("repo_id").notNull().references(() => repositories.id),
  status: text().notNull(), // queued | in_progress | completed
  conclusion: text(), // success | failure | cancelled | skipped
  branch: text(),
  durationSeconds: int("duration_seconds"),
  runStartedAt: text("run_started_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const dependabotAlerts = sqliteTable("dependabot_alerts", {
  id: int().primaryKey({ autoIncrement: true }),
  githubId: int("github_id").notNull(),
  repoId: int("repo_id").notNull().references(() => repositories.id),
  state: text().notNull(), // open | dismissed | fixed
  severity: text().notNull(), // critical | high | medium | low
  packageName: text("package_name").notNull(),
  packageEcosystem: text("package_ecosystem").notNull(),
  manifestPath: text("manifest_path"),
  summary: text(),
  createdAt: text("created_at").notNull(),
  fixedAt: text("fixed_at"),
  dismissedAt: text("dismissed_at"),
  syncedAt: text("synced_at"),
});

export const syncJobs = sqliteTable("sync_jobs", {
  id: int().primaryKey({ autoIncrement: true }),
  type: text().notNull(), // repos | pull_requests | workflows | dependabot
  status: text().notNull(), // pending | running | completed | failed
  repoId: int("repo_id").references(() => repositories.id),
  error: text(),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
});
