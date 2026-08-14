# Project structure guide

Internship-style map of folders and files. Stubs only - logic comes in later PRs on separate branches.

Branch for this work: chore/scaffold-project-structure

## Root config

- README.md - Project overview, branching rules, planned stack
- STRUCTURE.md - This file - human-readable map of the repo
- package.json - Dependencies and npm scripts (dev, build, sync, db commands)
- tsconfig.json - TypeScript compiler settings; @/* path alias
- next.config.ts - Next.js build/runtime configuration
- drizzle.config.ts - Drizzle Kit settings (schema path, Postgres URL)
- vercel.json - Vercel deploy config; schedules daily cron to /api/sync
- .env.example - Documents required env vars (DATABASE_URL, CRON_SECRET) without secrets
- .gitignore - Keeps node_modules, .env*, .next, OS junk out of git

## app/ - Next.js App Router (pages + APIs)

- app/layout.tsx - Root HTML shell, site metadata, global CSS import
- app/page.tsx - Home page - will host map + trends UI
- app/globals.css - Global styles and CSS design tokens
- app/api/incidents/route.ts - GET /api/incidents - map points with filters
- app/api/stats/route.ts - GET /api/stats - chart aggregations
- app/api/sync/route.ts - POST /api/sync - cron-protected ArcGIS to DB ingest

## components/ - React UI building blocks

- components/map/CrimeMap.tsx - MapLibre map: clusters, pins, popups
- components/trends/TrendsCharts.tsx - Recharts time series + category charts
- components/filters/IncidentFilters.tsx - Shared date/category filters for map + trends

## lib/ - shared server/client helpers

- lib/db.ts - Neon Postgres + Drizzle client singleton
- lib/arcgis.ts - MPD ArcGIS FeatureServer fetch + pagination
- lib/types.ts - Shared TypeScript types (Incident, stats shapes)

## drizzle/ - database schema and migrations

- drizzle/schema.ts - Table definitions (incidents, sync_runs)
- drizzle/migrations/ - Generated SQL migrations (empty until first generate)

## scripts/ - CLI utilities

- scripts/sync-incidents.ts - Manual/local sync (npm run sync) for dev/backfill

## public/ - static assets

- public/ - Favicon, images, static files served as-is (placeholder for now)
