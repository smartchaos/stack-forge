import { remove, pathExists } from "fs-extra";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import inquirer from "inquirer";
import { logger } from "../logger.js";

export async function runReset(projectDir: string): Promise<void> {
  const cforgeDir = join(projectDir, ".cforge");
  const claudeMdPath = join(projectDir, "CLAUDE.md");

  const cforgeExists = await pathExists(cforgeDir);
  if (!cforgeExists) {
    logger.warn("Stack Forge is not initialized in this project");
  }

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message:
        "WARNING: This will remove all Stack Forge configuration and generated files.\n\n" +
        "Files to be removed:\n" +
        "- .cforge/ directory (all contents)\n" +
        "- Stack Forge section from CLAUDE.md\n\n" +
        "This action cannot be undone.\n\n" +
        "Are you sure you want to reset?",
      default: false,
    },
  ]);

  if (!confirm) {
    logger.info("Reset cancelled.");
    return;
  }

  if (cforgeExists) {
    await remove(cforgeDir);
    logger.info("Deleted .cforge directory");
  }

  if (await pathExists(claudeMdPath)) {
    const content = await readFile(claudeMdPath, "utf-8");
    const stackForgeStart = content.indexOf("## Stack Forge");

    if (stackForgeStart !== -1) {
      const afterStackForge = content.substring(stackForgeStart);
      const nextHeading = afterStackForge.indexOf("\n## ", 1);
      const cleanedContent = (
        nextHeading !== -1
          ? content.substring(0, stackForgeStart) +
            afterStackForge.substring(nextHeading)
          : content.substring(0, stackForgeStart)
      ).trimEnd();

      await writeFile(claudeMdPath, cleanedContent + "\n", "utf-8");
      logger.info("Cleaned CLAUDE.md");
    }
  }

  logger.info("Stack Forge has been reset successfully.");
}
