#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./cli/init.js";
import { runStatus } from "./cli/status.js";
import { runUpdate } from "./cli/update.js";
import { runGenerate } from "./cli/generate.js";
import { runWorkflow } from "./cli/run.js";
import { runHealthcheck } from "./cli/healthcheck.js";
import { runValidate } from "./cli/validate.js";
import { logger } from "./logger.js";

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
    logger.debug({ workflow, description }, "Starting workflow");
    await runWorkflow(process.cwd(), { workflow, description });
  });

program
  .command("init")
  .description("Initialize Stack Forge (zero-config)")
  .option("--workflow <name>", "Default workflow type", "feature")
  .action(async (opts) => {
    logger.debug({ workflow: opts.workflow }, "Starting init");
    await runInit(process.cwd(), { workflow: opts.workflow });
  });

program
  .command("status")
  .description("Show current workflow status")
  .action(async () => {
    logger.debug("Starting status check");
    await runStatus(process.cwd());
  });

program
  .command("update")
  .description("Re-scan providers and update configuration")
  .action(async () => {
    logger.debug("Starting update");
    await runUpdate(process.cwd());
  });

program
  .command("generate")
  .description("Regenerate all config files")
  .action(async () => {
    logger.debug("Starting generate");
    await runGenerate(process.cwd());
  });

program
  .command("healthcheck")
  .description("Check health of installed providers")
  .option("--verbose", "Show detailed output")
  .action(async (opts) => {
    logger.debug({ verbose: opts.verbose }, "Starting healthcheck");
    await runHealthcheck(process.cwd(), { verbose: opts.verbose });
  });

program
  .command("validate")
  .description("Validate implementation against spec requirements")
  .action(async () => {
    logger.debug("Starting validate");
    const { allPassed } = await runValidate();
    if (!allPassed) process.exit(1);
  });

program.parse();
