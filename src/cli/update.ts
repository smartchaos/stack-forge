import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { stringify as dumpYaml } from "yaml";
import { scanForPlugins } from "../discovery/scanner.js";
import { matchProviders } from "../discovery/matcher.js";
import { loadProviders } from "../discovery/registry.js";
import type { DetectedProvider } from "../types/provider.js";

export interface UpdateResult {
  added: string[];
  removed: string[];
  unchanged: string[];
}

export async function runUpdate(projectDir: string): Promise<UpdateResult> {
  const cforgeDir = join(projectDir, ".cforge");
  const providersPath = join(cforgeDir, "providers.yaml");

  let previousProviders: Record<string, DetectedProvider> = {};
  if (existsSync(providersPath)) {
    const content = await readFile(providersPath, "utf-8");
    const { parse } = await import("yaml");
    const data = parse(content);
    previousProviders = data.providers || {};
  }

  const scanResult = await scanForPlugins();
  const providerDefs = await loadProviders();
  const currentProviders = matchProviders(scanResult, providerDefs);

  const previousNames = new Set(Object.keys(previousProviders));
  const currentNames = new Set(Object.keys(currentProviders));

  const added = [...currentNames].filter((n) => !previousNames.has(n));
  const removed = [...previousNames].filter((n) => !currentNames.has(n));
  const unchanged = [...currentNames].filter((n) => previousNames.has(n));

  await writeFile(providersPath, dumpYaml({ providers: currentProviders }), "utf-8");

  console.log("Provider scan complete:");
  if (added.length) console.log(`  Added: ${added.join(", ")}`);
  if (removed.length) console.log(`  Removed: ${removed.join(", ")}`);
  console.log(`  Unchanged: ${unchanged.join(", ") || "none"}`);

  return { added, removed, unchanged };
}
