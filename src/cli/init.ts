import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { stringify as dumpYaml, parse as parseYaml } from "yaml";
import { existsSync } from "fs";
import { scanForPlugins } from "../discovery/scanner.js";
import { matchProviders } from "../discovery/matcher.js";
import { loadProviders, loadCapabilities, loadManifest } from "../discovery/registry.js";
import { detectProject } from "../discovery/project-detector.js";
import { installProvidersSilent } from "../discovery/auto-installer.js";
import { runHealthCheck, writeHealthRecord, mergeHealthWithRecord } from "../discovery/healthcheck.js";
import { generateOrchestrator } from "../generator/orchestrator.js";
import { generateStages } from "../generator/stages.js";
import { generateCommands } from "../generator/commands.js";
import { generateClaudeMd, generateProvidersMd } from "../generator/claude-md.js";
import { StateManager, WORKFLOW_STAGES } from "../state/manager.js";
import { logger } from "../logger.js";
import { ForgeConfigSchema } from "../schemas/config.js";
import type { ForgeConfig } from "../types/config.js";
import type { DetectedProvider } from "../types/provider.js";

export interface InitOptions {
  workflow?: string;
}

async function loadExistingProviders(cforgeDir: string): Promise<Record<string, DetectedProvider>> {
  const providersPath = join(cforgeDir, "providers.yaml");
  if (!existsSync(providersPath)) return {};
  try {
    const content = await readFile(providersPath, "utf-8");
    const data = parseYaml(content) as { providers?: Record<string, DetectedProvider> };
    return data.providers || {};
  } catch {
    return {};
  }
}

export async function runInit(projectDir: string, options: InitOptions = {}): Promise<void> {
  logger.info("Initializing Stack Forge...");
  const cforgeDir = join(projectDir, ".cforge");
  await mkdir(cforgeDir, { recursive: true });

  // 1. Auto-detect project info
  const projectInfo = await detectProject(projectDir);
  logger.info({ project: projectInfo.name }, "Detected project");
  const workflow = options.workflow || "feature";

  // 2. Load previously installed providers
  const existingProviders = await loadExistingProviders(cforgeDir);

  // 3. Scan for currently installed plugins
  const scanResult = await scanForPlugins();
  const providerDefs = await loadProviders();
  const scannedProviders = matchProviders(scanResult, providerDefs);

  // 4. Merge existing + scanned
  let detected: Record<string, DetectedProvider> = { ...existingProviders };
  for (const [name, provider] of Object.entries(scannedProviders)) {
    detected[name] = provider;
  }
  logger.info({ providers: Object.keys(detected) }, "Detected providers");

  // 5. Load manifest and auto-install missing required/recommended
  const manifest = await loadManifest();
  const missing = manifest.filter((m) => !Object.keys(detected).includes(m.name));

  if (missing.length > 0) {
    const results = await installProvidersSilent(missing);
    for (const result of results) {
      if (result.status === "installed") {
        const entry = missing.find((m) => m.name === result.provider);
        if (entry) {
          detected[result.provider] = {
            name: entry.name,
            capabilities: entry.capabilities,
            source: "installed-by-cforge",
            detected_at: new Date().toISOString(),
          };
        }
      }
    }

    // Print summary
    const installed = results.filter((r) => r.status === "installed");
    const pending = results.filter((r) => r.status === "pending");
    const skipped = results.filter((r) => r.status === "skipped" || r.status === "failed");

    if (installed.length > 0) {
      console.log(`Installed: ${installed.map((r) => r.provider).join(", ")}`);
    }
    if (pending.length > 0) {
      console.log("\nRun these in Claude Code:");
      for (const r of pending) {
        console.log(`  ${r.instruction}`);
      }
    }
    if (skipped.length > 0) {
      console.log(`Skipped: ${skipped.map((r) => r.provider).join(", ")}`);
    }
  }

  // 5b. Run healthcheck
  const healthResults = await runHealthCheck(scanResult);
  const healthRecord = mergeHealthWithRecord(healthResults, null);
  await writeHealthRecord(cforgeDir, healthRecord);
  const missingCritical = healthResults
    .filter((r) => r.critical && r.status !== "healthy")
    .map((r) => r.provider);
  if (missingCritical.length > 0) {
    console.log(`\nWarning: critical providers missing: ${missingCritical.join(", ")}`);
  }

  // 6. Build provider mapping
  const capabilities = await loadCapabilities();
  const providerMap: Record<string, string> = {};
  for (const [capName, capDef] of Object.entries(capabilities)) {
    const detectedForCap = Object.values(detected).find((d) =>
      d.capabilities.includes(capName)
    );
    providerMap[capName] = detectedForCap?.name || capDef.default_provider;
  }

  // 7. Write config
  const config: ForgeConfig = {
    workflow,
    providers: providerMap,
    overrides: {},
    stages: { auto_advance: true, pause_on_review: true },
    artifacts: { output_dir: ".cforge/artifacts" },
  };

  const configResult = ForgeConfigSchema.safeParse(config);
  if (!configResult.success) {
    logger.error({ errors: configResult.error.issues }, "Invalid config");
    throw new Error(`Invalid config: ${configResult.error.issues.map(i => i.message).join(", ")}`);
  }
  await writeFile(join(cforgeDir, "config.yaml"), dumpYaml(config), "utf-8");

  // 8. Write providers
  await writeFile(join(cforgeDir, "providers.yaml"), dumpYaml({ providers: detected }), "utf-8");

  // 9. Create state
  const stateManager = new StateManager(cforgeDir);
  await stateManager.create(workflow, projectInfo.name, projectInfo.description);

  // 10. Create directories
  await mkdir(join(cforgeDir, "artifacts"), { recursive: true });
  await mkdir(join(cforgeDir, "errors"), { recursive: true });

  // 11. Generate skill files
  const stages = WORKFLOW_STAGES[workflow] || WORKFLOW_STAGES["feature"];

  await generateOrchestrator(projectDir, {
    workflowName: workflow,
    stages,
  });

  await generateStages(projectDir, {
    workflowName: workflow,
    stages,
    description: projectInfo.description,
  });

  // 12. Generate /cforge command
  await generateCommands(projectDir, {
    workflowName: workflow,
    description: projectInfo.description,
  });

  // 13. Generate CLAUDE.md
  await generateClaudeMd(projectDir, {
    workflowName: workflow,
    detected,
    manifest,
    capabilities,
  });

  // 14. Generate providers.md
  await generateProvidersMd(projectDir, {
    workflowName: workflow,
    detected,
    manifest,
    capabilities,
  });

  // 15. Print summary
  const detectedNames = Object.keys(detected);
  console.log(`\nStack Forge initialized.`);
  console.log(`Detected: ${detectedNames.join(", ") || "none"}`);
  console.log(`Ready. Run: cforge`);
  logger.info("Stack Forge initialized.");
}
