/**
 * Local/manual sync script.
 * Usage:
 *   npx tsx --env-file=.env.local scripts/sync-incidents.ts
 *   npx tsx --env-file=.env.local scripts/sync-incidents.ts --days=90
 *   npx tsx --env-file=.env.local scripts/sync-incidents.ts --days=all
 */

import { syncIncidents } from "../lib/sync";

function parseDays(argv: string[]): number | null | undefined {
  const arg = argv.find((a) => a.startsWith("--days="));
  if (!arg) return undefined;
  const value = arg.slice("--days=".length);
  if (value === "all") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid --days value: ${value}`);
  }
  return Math.floor(n);
}

async function main() {
  const sinceDays = parseDays(process.argv.slice(2));
  console.log(
    "Starting MPD sync...",
    sinceDays === undefined
      ? "(default last 365 days)"
      : sinceDays === null
        ? "(full history)"
        : `(last ${sinceDays} days)`,
  );

  const result = await syncIncidents(
    sinceDays === undefined ? undefined : { sinceDays },
  );

  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "success") process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
