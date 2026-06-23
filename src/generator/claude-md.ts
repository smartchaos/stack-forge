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
  const { detected, manifest, capabilities } = options;

  // Build provider readiness map: capability -> { provider, detected }
  const providerStatus: { capability: string; provider: string; ready: boolean; installCmd?: string }[] = [];
  for (const [capName, capDef] of Object.entries(capabilities)) {
    const detectedNames = Object.keys(detected);
    const matchedProvider = Object.values(detected).find((d) =>
      d.capabilities.includes(capName)
    );
    const ready = !!matchedProvider;
    const providerName = matchedProvider?.name || capDef.default_provider;

    // Find install command from manifest
    const manifestEntry = manifest.find((m) => m.name === providerName);
    const installCmd = !ready && manifestEntry ? manifestEntry.install.command : undefined;

    providerStatus.push({
      capability: capDef.name,
      provider: providerName,
      ready,
      installCmd,
    });
  }

  // Separate ready and missing
  const readyProviders = providerStatus.filter((p) => p.ready);
  const missingProviders = providerStatus.filter((p) => !p.ready);

  let section = `## Stack Forge\n\n`;
  section += `This project uses Stack Forge for workflow orchestration.\n\n`;

  // Show detected providers
  if (readyProviders.length > 0) {
    section += `### Detected Providers\n\n`;
    section += `| Capability | Provider | Status |\n`;
    section += `|------------|----------|--------|\n`;
    for (const p of readyProviders) {
      section += `| ${p.capability} | ${p.provider} | Ready |\n`;
    }
    section += `\n`;
  }

  // Show missing providers with install instructions
  if (missingProviders.length > 0) {
    section += `### Missing Providers (run these commands to install)\n\n`;
    for (const p of missingProviders) {
      section += `**${p.capability}** → ${p.provider}\n`;
      if (p.installCmd) {
        section += `\`\`\`bash\n${p.installCmd}\n\`\`\`\n\n`;
      }
    }
    section += `After installing, run \`cforge update\` to refresh provider detection.\n\n`;
  }

  // Workflow usage
  section += `### Usage\n\n`;
  section += `- Start workflow: \`/workflow <type> "<description>"\`\n`;
  section += `- Check status: \`cforge status\`\n`;
  section += `- Update providers: \`cforge update\`\n`;
  section += `- Regenerate config: \`cforge generate\`\n\n`;

  section += `### Workflow Stages\n\n`;
  section += `\`\`\`\nbrainstorm → specification → planning → implementation → review → release\n\`\`\`\n`;

  return section;
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

  // Remove old Stack Forge section if present
  const stackForgeStart = existing.indexOf("## Stack Forge");
  if (stackForgeStart !== -1) {
    // Find the next ## heading or end of file
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
