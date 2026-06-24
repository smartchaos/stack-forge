import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { stringify as dumpYaml } from "yaml";
import { scanForPlugins, type ScanOptions } from "../discovery/scanner.js";
import { matchProviders } from "../discovery/matcher.js";
import { loadProviders } from "../discovery/registry.js";
import type { DetectedProvider } from "../types/provider.js";

export interface UpdateResult {
  added: string[];
  removed: string[];
  unchanged: string[];
}

export async function runUpdate(
  projectDir: string,
  scanOptions?: ScanOptions
): Promise<UpdateResult> {
  const cforgeDir = join(projectDir, ".cforge");
  const providersPath = join(cforgeDir, "providers.yaml");

  let previousProviders: Record<string, DetectedProvider> = {};
  if (existsSync(providersPath)) {
    const content = await readFile(providersPath, "utf-8");
    const { parse } = await import("yaml");
    const data = parse(content);
    previousProviders = data.providers || {};
  }

  const scanResult = await scanForPlugins(scanOptions);
  const providerDefs = await loadProviders();
  const currentProviders = matchProviders(scanResult, providerDefs);

  const previousNames = new Set(Object.keys(previousProviders));
  const currentNames = new Set(Object.keys(currentProviders));

  const added = [...currentNames].filter((n) => !previousNames.has(n));
  const unchanged = [...currentNames].filter((n) => previousNames.has(n));

  // Merge: keep previous providers, add new ones from scan, never remove
  const merged: Record<string, DetectedProvider> = {
    ...previousProviders,
    ...currentProviders,
  };

  const mergedNames = new Set(Object.keys(merged));

  await writeFile(providersPath, dumpYaml({ providers: merged }), "utf-8");

  console.log("Provider scan complete:");
  if (added.length) console.log(`  Added: ${added.join(", ")}`);
  console.log(`  Unchanged: ${unchanged.join(", ") || "none"}`);
  console.log(`  Total tracked: ${mergedNames.size}`);

  return { added, removed: [], unchanged };
}
