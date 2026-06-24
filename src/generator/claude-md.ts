import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import type { DetectedProvider } from "../types/provider.js";
import type { ManifestEntry } from "../types/config.js";
import type { CapabilityDefinition } from "../types/provider.js";

export interface ClaudeMdOptions {
  workflowName: string;
  detected: Record<string, DetectedProvider>;
  manifest: ManifestEntry[];
  capabilities: Record<string, CapabilityDefinition>;
}

function buildStackForgeSection(options: ClaudeMdOptions): string {
  let section = `## Stack Forge\n\n`;
  section += `- Start: \`/workflow <type> "<description>"\`\n`;
  section += `- Status: \`cforge status\`\n`;
  section += `- Providers: \`cforge providers\` (see \`.cforge/providers.md\`)\n\n`;
  section += `### When to Use\n\n`;
  section += `Use cforge when:\n`;
  section += `- User asks to implement a feature, fix a bug, or add functionality\n`;
  section += `- Starting any multi-step coding task\n`;
  section += `- User says "workflow", "feature", "implement", or "fix"\n`;
  return section;
}

function buildProvidersMd(options: ClaudeMdOptions): string {
  const { detected, manifest, capabilities } = options;

  const providerStatus: { capability: string; provider: string; ready: boolean; installCmd?: string }[] = [];
  for (const [capName, capDef] of Object.entries(capabilities)) {
    const matchedProvider = Object.values(detected).find((d) =>
      d.capabilities.includes(capName)
    );
    const ready = !!matchedProvider;
    const providerName = matchedProvider?.name || capDef.default_provider;

    const manifestEntry = manifest.find((m) => m.name === providerName);
    const installCmd = !ready && manifestEntry ? manifestEntry.install.command : undefined;

    providerStatus.push({
      capability: capDef.name,
      provider: providerName,
      ready,
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
      content += `| ${p.capability} | ${p.provider} | Ready |\n`;
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
  const content = buildProvidersMd(options);
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
  await writeFile(claudeMdPath, (existing + "\n" + section).trim() + "\n", "utf-8");
}
