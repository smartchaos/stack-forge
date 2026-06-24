#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./cli/init.js";
import { runStatus } from "./cli/status.js";
import { runUpdate } from "./cli/update.js";
import { runGenerate } from "./cli/generate.js";
import { runWorkflow } from "./cli/run.js";
import { runHealthcheck } from "./cli/healthcheck.js";

const program = new Command();

program
  .name("cforge")
  .description("Claude Code workflow orchestration engine")
  .version("0.1.0");

// Default command: cforge [workflow] [description]
program
  .argument("[workflow]", "Workflow type (feature, bugfix, etc.)", "feature")
  .argument("[description]", "Workflow description", "")
  .action(async (workflow, description) => {
    await runWorkflow(process.cwd(), { workflow, description });
  });

program
  .command("init")
  .description("Initialize Stack Forge (zero-config)")
  .option("--workflow <name>", "Default workflow type", "feature")
  .action(async (opts) => {
    await runInit(process.cwd(), { workflow: opts.workflow });
  });

program
  .command("status")
  .description("Show current workflow status")
  .action(async () => {
    await runStatus(process.cwd());
  });

program
  .command("update")
  .description("Re-scan providers and update configuration")
  .action(async () => {
    await runUpdate(process.cwd());
  });

program
  .command("generate")
  .description("Regenerate all config files")
  .action(async () => {
    await runGenerate(process.cwd());
  });

program
  .command("healthcheck")
  .description("Check health of installed providers")
  .option("--verbose", "Show detailed output")
  .action(async (opts) => {
    await runHealthcheck(process.cwd(), { verbose: opts.verbose });
  });

program.parse();
