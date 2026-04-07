import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use("*", logger());
app.use("*", cors({ origin: "http://localhost:3000" }));

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/api/v1/repos", (c) => {
  return c.json({ repos: [], message: "Not implemented yet" });
});

const port = Number(process.env.PORT) || 3001;
console.log(`API running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
