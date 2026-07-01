import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { buildProviderMap } from "../discovery/router.js";
import { loadProviders } from "../discovery/registry.js";
import { BUILTIN_PROVIDER } from "../types/provider.js";
import type { CapabilityDefinition, DetectedProvider, ProviderDefinition } from "../types/provider.js";
import type { ManifestEntry } from "../types/config.js";

export interface ClaudeMdOptions {
  workflowName: string;
  detected: Record<string, DetectedProvider>;
  manifest: ManifestEntry[];
  capabilities: Record<string, CapabilityDefinition>;
  providerDefinitions?: Record<string, ProviderDefinition>;
}

function buildStackForgeSection(options: ClaudeMdOptions): string {
  const { workflowName } = options;
  let section = `## Stack Forge\n\n`;
  section += `Workflow orchestration for Claude Code.\n\n`;
  section += `### Commands\n\n`;
  section += `- \`cforge ${workflowName} "<description>"\` — start workflow\n`;
  section += `- \`cforge status\` — check progress\n`;
  section += `- \`cforge healthcheck\` — verify providers\n`;
  section += `- \`cforge update\` — rescan providers\n`;
  section += `- \`cforge reset\` — clear state\n\n`;
  section += `### Workflows\n\n`;
  section += `- \`feature\`: brainstorm → spec → plan → implement → review → release\n`;
  section += `- \`bugfix\`: diagnosis → plan → implement → review → release\n\n`;
  section += `### Debug\n\n`;
  section += `\`CFORGE_LOG_LEVEL=debug cforge <command>\`\n\n`;
  section += `Providers: \`.cforge/providers.md\`\n`;
  return section;
}

function buildProvidersMd(options: ClaudeMdOptions): string {
  const { detected, manifest, capabilities, providerDefinitions = {} } = options;
  const providerSelections = buildProviderMap(capabilities, detected, providerDefinitions);

  const providerStatus: { capability: string; provider: string; ready: boolean; statusLabel: string; installCmd?: string }[] = [];
  for (const [capName, capDef] of Object.entries(capabilities)) {
    const providerName = providerSelections[capName]?.provider || capDef.default_provider;
    const isBuiltin = providerName === BUILTIN_PROVIDER;
    const ready = isBuiltin || !!detected[providerName];
    const statusLabel = isBuiltin ? "Built-in" : "Ready";

    const manifestEntry = manifest.find((m) => m.name === providerName);
    const installCmd = !ready && manifestEntry ? manifestEntry.install.command : undefined;

    providerStatus.push({
      capability: capDef.name,
      provider: providerName,
      ready,
      statusLabel,
      installCmd,
    });
  }

  const readyProviders = providerStatus.filter((p) => p.ready);
  const missingProviders = providerStatus.filter((p) => !p.ready);

  let content = `# Providers\n\n`;

  if (readyProviders.length > 0) {
    content += `| Capability | Provider | Status |\n`;
    content += `|------------|----------|--------|\n`;
    for (const p of readyProviders) {
      content += `| ${p.capability} | ${p.provider} | ${p.statusLabel} |\n`;
    }
    content += `\n`;
  }

  if (missingProviders.length > 0) {
    content += `## Missing\n\n`;
    for (const p of missingProviders) {
      content += `**${p.capability}** → ${p.provider}\n`;
      if (p.installCmd) {
        content += `\`\`\`bash\n${p.installCmd}\n\`\`\`\n\n`;
      }
    }
    content += `Run \`cforge update\` after installing.\n`;
  }

  return content;
}

export async function generateProvidersMd(
  projectDir: string,
  options: ClaudeMdOptions
): Promise<void> {
  const cforgeDir = join(projectDir, ".cforge");
  const providersPath = join(cforgeDir, "providers.md");
  const providerDefinitions = options.providerDefinitions || await loadProviders();
  const content = buildProvidersMd({ ...options, providerDefinitions });
  await writeFile(providersPath, content, "utf-8");
}

export async function generateClaudeMd(
  projectDir: string,
  options: ClaudeMdOptions
): Promise<void> {
  const claudeMdPath = join(projectDir, "CLAUDE.md");

  let existing = "";
  if (existsSync(claudeMdPath)) {
    existing = await readFile(claudeMdPath, "utf-8");
  }

  const stackForgeStart = existing.indexOf("## Stack Forge");
  if (stackForgeStart !== -1) {
    const afterStackForge = existing.substring(stackForgeStart);
    const nextHeading = afterStackForge.indexOf("\n## ", 1);
    existing = (nextHeading !== -1
      ? existing.substring(0, stackForgeStart) + afterStackForge.substring(nextHeading)
      : existing.substring(0, stackForgeStart)
    ).trimEnd();
  }

  const section = buildStackForgeSection(options);
  await writeFile(claudeMdPath, existing ? `${existing}\n${section.trim()}\n` : `${section.trim()}\n`, "utf-8");
}
