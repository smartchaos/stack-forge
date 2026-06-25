import { readFile } from "fs/promises";
import { join } from "path";
import { parse as parseYaml } from "yaml";
import { generateOrchestrator } from "../generator/orchestrator.js";
import { generateStages } from "../generator/stages.js";
import { generateCommands } from "../generator/commands.js";
import { generateClaudeMd, generateProvidersMd } from "../generator/claude-md.js";
import { scanForPlugins } from "../discovery/scanner.js";
import { matchProviders } from "../discovery/matcher.js";
import { loadProviders, loadCapabilities, loadManifest } from "../discovery/registry.js";
import { WORKFLOW_STAGES } from "../state/manager.js";

export async function runGenerate(projectDir: string): Promise<void> {
  const cforgeDir = join(projectDir, ".cforge");

  const configContent = await readFile(join(cforgeDir, "config.yaml"), "utf-8");
  const config = parseYaml(configContent);

  const stateContent = await readFile(join(cforgeDir, "state.json"), "utf-8");
  const state = JSON.parse(stateContent);

  // Re-scan providers for CLAUDE.md generation
  const scanResult = await scanForPlugins();
  const providerDefs = await loadProviders();
  const detected = matchProviders(scanResult, providerDefs);
  const capabilities = await loadCapabilities();
  const manifest = await loadManifest();

  const stages = WORKFLOW_STAGES[config.workflow] || WORKFLOW_STAGES["feature"];

  await generateOrchestrator(projectDir, {
    workflowName: config.workflow,
    stages,
  });

  await generateStages(projectDir, {
    workflowName: config.workflow,
    stages,
    description: state.context.description,
  });

  await generateCommands(projectDir, {
    workflowName: config.workflow,
    description: state.context.description,
  });

  await generateClaudeMd(projectDir, {
    workflowName: config.workflow,
    detected,
    manifest,
    capabilities,
  });

  await generateProvidersMd(projectDir, {
    workflowName: config.workflow,
    detected,
    manifest,
    capabilities,
  });

  console.log("Configuration regenerated successfully.");
}
