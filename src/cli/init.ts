import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { stringify as dumpYaml } from "yaml";
import { scanForPlugins } from "../discovery/scanner.js";
import { matchProviders } from "../discovery/matcher.js";
import { loadProviders, loadCapabilities } from "../discovery/registry.js";
import { generateOrchestrator } from "../generator/orchestrator.js";
import { generateStages } from "../generator/stages.js";
import { generateCommands } from "../generator/commands.js";
import { generateClaudeMd } from "../generator/claude-md.js";
import { StateManager } from "../state/manager.js";
import type { ForgeConfig } from "../types/config.js";

export interface InitOptions {
  mode: "fresh" | "existing";
  workflow: string;
  description: string;
}

const FEATURE_STAGES = [
  "brainstorm",
  "specification",
  "planning",
  "implementation",
  "review",
  "release",
];

export async function runInit(projectDir: string, options: InitOptions): Promise<void> {
  // 1. Scan for installed plugins
  const scanResult = await scanForPlugins();
  const providerDefs = await loadProviders();
  const detected = matchProviders(scanResult, providerDefs);

  // 2. Load capabilities
  const capabilities = await loadCapabilities();

  // 3. Build provider mapping (capability → provider)
  const providerMap: Record<string, string> = {};
  for (const [capName, capDef] of Object.entries(capabilities)) {
    const detectedForCap = Object.values(detected).find((d) =>
      d.capabilities.includes(capName)
    );
    providerMap[capName] = detectedForCap?.name || capDef.default_provider;
  }

  // 4. Write .cforge/config.yaml
  const cforgeDir = join(projectDir, ".cforge");
  await mkdir(cforgeDir, { recursive: true });

  const config: ForgeConfig = {
    workflow: options.workflow,
    providers: providerMap,
    overrides: {},
    stages: { auto_advance: true, pause_on_review: true },
    artifacts: { output_dir: ".cforge/artifacts" },
  };

  await writeFile(join(cforgeDir, "config.yaml"), dumpYaml(config), "utf-8");

  // 5. Write .cforge/providers.yaml
  const providersContent = dumpYaml({ providers: detected });
  await writeFile(join(cforgeDir, "providers.yaml"), providersContent, "utf-8");

  // 6. Create state
  const stateManager = new StateManager(cforgeDir);
  await stateManager.create(options.workflow, options.description);

  // 7. Create artifacts directory
  await mkdir(join(cforgeDir, "artifacts"), { recursive: true });
  await mkdir(join(cforgeDir, "errors"), { recursive: true });

  // 8. Generate skill files
  await generateOrchestrator(projectDir, {
    workflowName: options.workflow,
    stages: FEATURE_STAGES,
  });

  await generateStages(projectDir, {
    workflowName: options.workflow,
    stages: FEATURE_STAGES,
    description: options.description,
  });

  // 9. Generate /workflow command
  await generateCommands(projectDir, {
    workflowName: options.workflow,
    description: options.description,
  });

  // 10. Generate CLAUDE.md additions
  await generateClaudeMd(projectDir, { workflowName: options.workflow });
}
