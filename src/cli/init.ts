import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { stringify as dumpYaml } from "yaml";
import inquirer from "inquirer";
import { execSync } from "child_process";
import { scanForPlugins } from "../discovery/scanner.js";
import { matchProviders } from "../discovery/matcher.js";
import { loadProviders, loadCapabilities, loadManifest } from "../discovery/registry.js";
import { generateOrchestrator } from "../generator/orchestrator.js";
import { generateStages } from "../generator/stages.js";
import { generateCommands } from "../generator/commands.js";
import { generateClaudeMd } from "../generator/claude-md.js";
import { StateManager } from "../state/manager.js";
import type { ForgeConfig } from "../types/config.js";
import type { ManifestEntry } from "../types/config.js";

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

function detectOs(): "macos" | "linux" | "windows" {
  const platform = process.platform;
  if (platform === "darwin") return "macos";
  if (platform === "win32") return "windows";
  return "linux";
}

function getInstallCommand(entry: ManifestEntry): string {
  if (entry.install.type === "git_clone") {
    const os = detectOs();
    if (os === "windows") {
      return `echo "Windows not supported for git_clone. Install manually: ${entry.install.command}"`;
    }
    return entry.install.command;
  }
  return entry.install.command;
}

async function installProvider(entry: ManifestEntry): Promise<boolean> {
  const cmd = getInstallCommand(entry);
  console.log(`\n  Installing ${entry.name}...`);
  try {
    execSync(cmd, { stdio: "inherit" });
    if (entry.post_install) {
      console.log(`  Running post-install: ${entry.post_install}`);
      execSync(entry.post_install, { stdio: "inherit" });
    }
    console.log(`  ✓ ${entry.name} installed successfully`);
    return true;
  } catch (err) {
    console.error(`  ✗ Failed to install ${entry.name}`);
    return false;
  }
}

export async function runInit(projectDir: string, options: InitOptions): Promise<void> {
  // 1. Scan for installed plugins
  const scanResult = await scanForPlugins();
  const providerDefs = await loadProviders();
  let detected = matchProviders(scanResult, providerDefs);

  // 2. Load capabilities and manifest
  const capabilities = await loadCapabilities();
  const manifest = await loadManifest();

  // 3. Show detected providers
  const detectedNames = Object.keys(detected);
  console.log("\nStack Forge — Provider Detection\n");

  if (detectedNames.length > 0) {
    console.log("Detected:");
    for (const [name, provider] of Object.entries(detected)) {
      console.log(`  ✓ ${name} (${provider.capabilities.join(", ")})`);
    }
    console.log();
  }

  // 4. Identify missing providers
  const missing = manifest.filter((m) => !detectedNames.includes(m.name));

  if (missing.length === 0) {
    console.log("All providers detected.\n");
  } else {
    console.log("Missing providers:\n");
    for (const entry of missing) {
      const cmd = getInstallCommand(entry);
      console.log(`  ${entry.name} — ${entry.description}`);
      console.log(`    ${cmd}`);
      console.log();
    }

    // 5. Ask user to select which to install
    const { selected } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selected",
        message: "Select providers to install:",
        choices: missing.map((m) => ({
          name: `${m.name} — ${m.description} (${m.priority})`,
          value: m.name,
          checked: m.priority === "required",
        })),
      },
    ]);

    // 6. Install selected providers
    if (selected.length > 0) {
      console.log(`\nInstalling ${selected.length} provider(s)...\n`);
      for (const name of selected) {
        const entry = missing.find((m) => m.name === name)!;
        await installProvider(entry);
      }

      // Re-scan after installation
      console.log("\nRe-scanning providers...");
      const newScanResult = await scanForPlugins();
      detected = matchProviders(newScanResult, providerDefs);
      const newDetected = Object.keys(detected);
      console.log(`Detected: ${newDetected.join(", ") || "none"}\n`);
    } else {
      console.log("\nSkipping installation. Run `cforge update` later to retry.\n");
    }
  }

  // 7. Build provider mapping (capability → provider)
  const providerMap: Record<string, string> = {};
  for (const [capName, capDef] of Object.entries(capabilities)) {
    const detectedForCap = Object.values(detected).find((d) =>
      d.capabilities.includes(capName)
    );
    providerMap[capName] = detectedForCap?.name || capDef.default_provider;
  }

  // 8. Write .cforge/config.yaml
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

  // 9. Write .cforge/providers.yaml
  const providersContent = dumpYaml({ providers: detected });
  await writeFile(join(cforgeDir, "providers.yaml"), providersContent, "utf-8");

  // 10. Create state
  const stateManager = new StateManager(cforgeDir);
  await stateManager.create(options.workflow, options.description);

  // 11. Create artifacts directory
  await mkdir(join(cforgeDir, "artifacts"), { recursive: true });
  await mkdir(join(cforgeDir, "errors"), { recursive: true });

  // 12. Generate skill files
  await generateOrchestrator(projectDir, {
    workflowName: options.workflow,
    stages: FEATURE_STAGES,
  });

  await generateStages(projectDir, {
    workflowName: options.workflow,
    stages: FEATURE_STAGES,
    description: options.description,
  });

  // 13. Generate /workflow command
  await generateCommands(projectDir, {
    workflowName: options.workflow,
    description: options.description,
  });

  // 14. Generate CLAUDE.md
  await generateClaudeMd(projectDir, {
    workflowName: options.workflow,
    detected,
    manifest,
    capabilities,
  });

  // 15. Final summary
  console.log("Stack Forge initialized!\n");
  console.log("Next: In Claude Code, run:");
  console.log(`  /workflow ${options.workflow} "${options.description}"\n`);
}
