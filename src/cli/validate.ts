import {
  validateRequirements,
  getValidationSummary,
  type RequirementResult,
} from "../validation/validator.js";

const STATUS_ICONS: Record<string, string> = {
  pass: "\u2713",
  fail: "\u2717",
};

function printResults(results: RequirementResult[]): void {
  console.log("\nRequirement Validation");
  console.log("\u2501".repeat(20));

  for (const r of results) {
    const icon = r.passed ? STATUS_ICONS.pass : STATUS_ICONS.fail;
    const criticalTag = !r.passed && r.critical ? " [CRITICAL]" : "";
    const message = r.passed ? "" : ` — ${r.message}`;

    console.log(`${icon} ${r.id.padEnd(10)} ${r.description}${criticalTag}${message}`);
  }

  const summary = getValidationSummary(results);
  console.log("");
  console.log(
    `${summary.passed}/${summary.total} requirements met.` +
    (summary.criticalFailed > 0
      ? ` ${summary.criticalFailed} critical failure(s).`
      : " All critical requirements met.")
  );
}

export async function runValidate(): Promise<{
  results: RequirementResult[];
  allPassed: boolean;
}> {
  const results = await validateRequirements();
  printResults(results);

  const summary = getValidationSummary(results);
  return { results, allPassed: summary.allPassed };
}
