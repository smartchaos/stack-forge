import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { stringify as dumpYaml, parse as parseYaml } from "yaml";
import inquirer from "inquirer";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { scanForPlugins } from "../discovery/scanner.js";
import { matchProviders } from "../discovery/matcher.js";
import { loadProviders, loadCapabilities, loadManifest } from "../discovery/registry.js";
import { generateOrchestrator } from "../generator/orchestrator.js";
import { generateStages } from "../generator/stages.js";
import { generateCommands } from "../generator/commands.js";
import { generateClaudeMd } from "../generator/claude-md.js";
import { StateManager } from "../state/manager.js";
import type { ForgeConfig, ManifestEntry } from "../types/config.js";
import type { DetectedProvider } from "../types/provider.js";

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

async function installProvider(entry: ManifestEntry): Promise<boolean> {
  console.log(`\n  Installing ${entry.name}...`);

  // Claude Code slash commands cannot run from shell
  if (entry.install.type === "claude_command") {
    console.log(`  This provider must be installed inside Claude Code:`);
    console.log(`    ${entry.install.command}`);
    const { confirmed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmed",
        message: `Did you install ${entry.name} in Claude Code?`,
        default: false,
      },
    ]);
    return confirmed;
  }

  const cmd = getInstallCommand(entry);
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
  const cforgeDir = join(projectDir, ".cforge");
  await mkdir(cforgeDir, { recursive: true });

  // 1. Load previously installed providers from providers.yaml
  const existingProviders = await loadExistingProviders(cforgeDir);

  // 2. Scan for currently installed plugins
  const scanResult = await scanForPlugins();
  const providerDefs = await loadProviders();
  const scannedProviders = matchProviders(scanResult, providerDefs);

  // 3. Merge existing + scanned (scanned takes precedence)
  let detected: Record<string, DetectedProvider> = { ...existingProviders };
  for (const [name, provider] of Object.entries(scannedProviders)) {
    detected[name] = provider;
  }

  // 4. Load capabilities and manifest
  const capabilities = await loadCapabilities();
  const manifest = await loadManifest();

  // 5. Show detected providers
  const detectedNames = Object.keys(detected);
  console.log("\nStack Forge — Provider Detection\n");

  if (detectedNames.length > 0) {
    console.log("Detected providers:");
    for (const [name, provider] of Object.entries(detected)) {
      console.log(`  ✓ ${name} (${provider.capabilities.join(", ")})`);
    }
    console.log();
  }

  // 6. Identify missing providers
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

    // 7. Ask user to select which to install
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

    // 8. Install selected providers
    if (selected.length > 0) {
      console.log(`\nInstalling ${selected.length} provider(s)...\n`);
      for (const name of selected) {
        const entry = missing.find((m) => m.name === name)!;
        const success = await installProvider(entry);
        if (success) {
          // Mark as detected even if scanner couldn't verify it
          detected[name] = {
            name: entry.name,
            capabilities: entry.capabilities,
            source: "installed-by-cforge",
            detected_at: new Date().toISOString(),
          };
        }
      }

      // Re-scan after shell installations
      console.log("\nRe-scanning providers...");
      const newScanResult = await scanForPlugins();
      const newScanned = matchProviders(newScanResult, providerDefs);
      for (const [name, provider] of Object.entries(newScanned)) {
        detected[name] = provider;
      }
      const newDetected = Object.keys(detected);
      console.log(`Detected: ${newDetected.join(", ") || "none"}\n`);
    } else {
      console.log("\nSkipping installation. Run `cforge update` later to retry.\n");
    }
  }

  // 9. Build provider mapping (capability → provider)
  const providerMap: Record<string, string> = {};
  for (const [capName, capDef] of Object.entries(capabilities)) {
    const detectedForCap = Object.values(detected).find((d) =>
      d.capabilities.includes(capName)
    );
    providerMap[capName] = detectedForCap?.name || capDef.default_provider;
  }

  // 10. Write .cforge/config.yaml
  const config: ForgeConfig = {
    workflow: options.workflow,
    providers: providerMap,
    overrides: {},
    stages: { auto_advance: true, pause_on_review: true },
    artifacts: { output_dir: ".cforge/artifacts" },
  };

  await writeFile(join(cforgeDir, "config.yaml"), dumpYaml(config), "utf-8");

  // 11. Write .cforge/providers.yaml
  const providersContent = dumpYaml({ providers: detected });
  await writeFile(join(cforgeDir, "providers.yaml"), providersContent, "utf-8");

  // 12. Create state
  const stateManager = new StateManager(cforgeDir);
  await stateManager.create(options.workflow, options.description);

  // 13. Create artifacts directory
  await mkdir(join(cforgeDir, "artifacts"), { recursive: true });
  await mkdir(join(cforgeDir, "errors"), { recursive: true });

  // 14. Generate skill files
  await generateOrchestrator(projectDir, {
    workflowName: options.workflow,
    stages: FEATURE_STAGES,
  });

  await generateStages(projectDir, {
    workflowName: options.workflow,
    stages: FEATURE_STAGES,
    description: options.description,
  });

  // 15. Generate /workflow command
  await generateCommands(projectDir, {
    workflowName: options.workflow,
    description: options.description,
  });

  // 16. Generate CLAUDE.md
  await generateClaudeMd(projectDir, {
    workflowName: options.workflow,
    detected,
    manifest,
    capabilities,
  });

  // 17. Final summary
  console.log("Stack Forge initialized!\n");
  console.log("Next: In Claude Code, run:");
  console.log(`  /workflow ${options.workflow} "${options.description}"\n`);
}
