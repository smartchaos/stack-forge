import { join } from "path";
import { existsSync } from "fs";
import { scanForPlugins } from "../discovery/scanner.js";
import {
  runHealthCheck,
  readHealthRecord,
  writeHealthRecord,
  mergeHealthWithRecord,
  checkStaleness,
  type HealthCheckResult,
  type HealthRecord,
} from "../discovery/healthcheck.js";

export interface HealthcheckOptions {
  verbose?: boolean;
}

const STATUS_ICONS: Record<string, string> = {
  healthy: "\u2713",
  missing: "\u2717",
  stale: "\u26a0",
  unknown: "?",
};

const STATUS_LABELS: Record<string, string> = {
  healthy: "healthy",
  missing: "MISSING",
  stale: "stale",
  unknown: "unknown",
};

function formatAge(lastVerified: string | null): string {
  if (!lastVerified) return "never checked";
  const elapsed = Date.now() - new Date(lastVerified).getTime();
  const hours = Math.floor(elapsed / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function printResults(
  results: HealthCheckResult[],
  record: HealthRecord | null
): void {
  console.log("\nProvider Health Check");
  console.log("\u2501".repeat(20));

  let issueCount = 0;

  for (const r of results) {
    const icon = STATUS_ICONS[r.status] || "?";
    const label = STATUS_LABELS[r.status] || r.status;
    const providerHealth = record?.providers[r.provider];
    const age = r.status === "healthy" ? ` (checked ${formatAge(providerHealth?.last_verified || null)})` : "";
    const criticalTag = r.critical && r.status !== "healthy" ? " [critical]" : "";

    console.log(`${icon} ${r.provider.padEnd(16)} ${label.padEnd(12)}${age}${criticalTag}`);

    if (r.status !== "healthy" && r.critical) {
      issueCount++;
    }
  }

  console.log("");
  if (issueCount > 0) {
    console.log(`${issueCount} critical provider(s) need attention.`);
    console.log("Run: cforge init to auto-install missing providers.");
  } else {
    console.log("All providers healthy.");
  }
}

export async function runHealthcheck(
  projectDir: string,
  options: HealthcheckOptions = {}
): Promise<HealthCheckResult[]> {
  const cforgeDir = join(projectDir, ".cforge");
  const scan = await scanForPlugins();
  const previous = await readHealthRecord(cforgeDir);
  const results = await runHealthCheck(scan);
  const merged = mergeHealthWithRecord(results, previous);

  await writeHealthRecord(cforgeDir, merged);
  printResults(results, previous);

  const stale = checkStaleness(merged);
  if (stale.length > 0 && options.verbose) {
    console.log(`\n${stale.length} provider(s) haven't been verified in over ${merged.stale_threshold_hours}h.`);
  }

  return results;
}

export async function runLightweightHealthcheck(
  projectDir: string
): Promise<{ healthy: boolean; missingCritical: string[] }> {
  const cforgeDir = join(projectDir, ".cforge");

  if (!existsSync(cforgeDir)) {
    return { healthy: true, missingCritical: [] };
  }

  const scan = await scanForPlugins();
  const results = await runHealthCheck(scan);
  const missingCritical = results
    .filter((r) => r.critical && r.status !== "healthy")
    .map((r) => r.provider);

  return {
    healthy: missingCritical.length === 0,
    missingCritical,
  };
}
