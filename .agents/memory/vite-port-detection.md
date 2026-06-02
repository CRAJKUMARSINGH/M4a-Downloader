---
name: Vite port detection in Replit monorepo artifacts
description: Replit's workflow port scanner fails to detect Vite dev server ports; serving static build from Express fixes this reliably.
---

# Vite Port Detection — Replit Monorepo Artifacts

## The Rule
When a Vite dev server workflow shows `openPorts: null` despite Vite printing "ready", the fix is to serve the built frontend from the Express API server (static middleware + catch-all fallback to `index.html`) rather than running a separate Vite dev server workflow.

**Why:** Replit's port health-probe cannot detect open ports for certain Vite processes in the monorepo artifact system, even when the server is genuinely listening (observed across ports 18831 and 5173). The API server workflow (port 8080) is detected correctly every time.

**How to apply:**
1. Build the React frontend: `PORT=<n> BASE_PATH=/ pnpm --filter @workspace/<frontend> run build`
2. In `artifacts/api-server/src/app.ts`, add after API routes:
   ```ts
   const FRONTEND_DIST = path.resolve(__dirname, "../../<frontend>/dist/public");
   app.use(express.static(FRONTEND_DIST));
   app.get("/{*splat}", (_req, res) => res.sendFile(path.join(FRONTEND_DIST, "index.html")));
   ```
3. Update the frontend artifact's `artifact.toml` to `localPort = 8080` and `run = "pnpm --filter @workspace/api-server run dev"` so Replit routes `/` to the Express server.
4. In Express 5, the catch-all route must be `"/{*splat}"`, NOT `"*"` (causes `PathError: Missing parameter name`).
