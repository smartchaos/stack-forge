import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { parse as parseYaml } from "yaml";
import { scanForPlugins, type ScanResult } from "./scanner.js";
import { readdir, stat } from "fs/promises";
import { homedir } from "os";

export type HealthStatus = "healthy" | "missing" | "stale" | "unknown";

export interface ProviderHealth {
  status: HealthStatus;
  last_verified: string | null;
}

export interface HealthRecord {
  last_check: string;
  stale_threshold_hours: number;
  providers: Record<string, ProviderHealth>;
}

export interface HealthCheckRule {
  type: string;
  name?: string;
  path?: string;
}

export interface HealthRuleEntry {
  checks: HealthCheckRule[];
  critical: boolean;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function loadHealthRules(): Promise<Record<string, HealthRuleEntry>> {
  const { resolve, dirname } = await import("path");
  const { fileURLToPath } = await import("url");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const rulesPath = resolve(__dirname, "../../registry/health-rules.yaml");
  const content = await readFile(rulesPath, "utf-8");
  return parseYaml(content) as Record<string, HealthRuleEntry>;
}

function checkRule(rule: HealthCheckRule, scan: ScanResult): boolean {
  switch (rule.type) {
    case "plugin_installed":
      return (scan.plugins || []).includes(rule.name || "");
    case "skill_exists": {
      if (!rule.path) return false;
      const pathParts = rule.path.replace(/\/$/, "").split("/");
      const targetDir = pathParts[pathParts.length - 1];
      return (scan.skill_dirs || []).some((dir) => dir === targetDir);
    }
    case "mcp_server_configured":
      return (scan.mcp_servers || []).includes(rule.name || "");
    default:
      return false;
  }
}

function expandHome(path: string): string {
  if (path.startsWith("~")) {
    return join(homedir(), path.slice(1));
  }
  return path;
}

async function checkSkillFileExists(path: string): Promise<boolean> {
  return fileExists(expandHome(path));
}

export interface HealthCheckResult {
  provider: string;
  status: HealthStatus;
  critical: boolean;
  checks: { type: string; passed: boolean }[];
}

export async function runHealthCheck(
  scan: ScanResult,
  rules?: Record<string, HealthRuleEntry>
): Promise<HealthCheckResult[]> {
  const healthRules = rules || (await loadHealthRules());
  const results: HealthCheckResult[] = [];

  for (const [provider, rule] of Object.entries(healthRules)) {
    const checks = rule.checks.map((c) => {
      let passed: boolean;
      switch (c.type) {
        case "plugin_installed":
        case "skill_exists":
        case "mcp_server_configured":
          passed = checkRule(c, scan);
          break;
        case "skill_file_exists":
          passed = c.path ? false : true;
          break;
        default:
          passed = false;
      }
      return { type: c.type, passed };
    });

    const allPassed = checks.every((c) => c.passed);
    const status: HealthStatus = allPassed ? "healthy" : "missing";

    results.push({
      provider,
      status,
      critical: rule.critical,
      checks,
    });
  }

  return results;
}

export async function readHealthRecord(
  cforgeDir: string
): Promise<HealthRecord | null> {
  const healthPath = join(cforgeDir, "health.json");
  if (!existsSync(healthPath)) return null;
  try {
    const content = await readFile(healthPath, "utf-8");
    return JSON.parse(content) as HealthRecord;
  } catch {
    return null;
  }
}

export async function writeHealthRecord(
  cforgeDir: string,
  record: HealthRecord
): Promise<void> {
  await mkdir(cforgeDir, { recursive: true });
  const healthPath = join(cforgeDir, "health.json");
  await writeFile(healthPath, JSON.stringify(record, null, 2), "utf-8");
}

export function mergeHealthWithRecord(
  results: HealthCheckResult[],
  previous: HealthRecord | null
): HealthRecord {
  const now = new Date().toISOString();
  const providers: Record<string, ProviderHealth> = {};

  for (const r of results) {
    const prev = previous?.providers[r.provider];
    providers[r.provider] = {
      status: r.status,
      last_verified: r.status === "healthy" ? now : prev?.last_verified || null,
    };
  }

  return {
    last_check: now,
    stale_threshold_hours: previous?.stale_threshold_hours || 168,
    providers,
  };
}

export function checkStaleness(record: HealthRecord): HealthStatus[] {
  const now = Date.now();
  const thresholdMs = record.stale_threshold_hours * 60 * 60 * 1000;
  const statuses: HealthStatus[] = [];

  for (const health of Object.values(record.providers)) {
    if (health.status !== "healthy") continue;
    if (!health.last_verified) continue;
    const elapsed = now - new Date(health.last_verified).getTime();
    if (elapsed > thresholdMs) {
      statuses.push("stale");
    }
  }

  return statuses;
}
