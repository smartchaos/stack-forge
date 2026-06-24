import { describe, it, expect } from "vitest";
import {
  validateRequirements,
  getValidationSummary,
} from "../../src/validation/validator.js";

describe("spec requirements", () => {
  it("all critical requirements are met", async () => {
    const results = await validateRequirements();
    const summary = getValidationSummary(results);

    const failures = results.filter((r) => !r.passed && r.critical);
    if (failures.length > 0) {
      console.log("Failed critical requirements:");
      for (const f of failures) {
        console.log(`  ${f.id}: ${f.description} — ${f.message}`);
      }
    }

    expect(summary.criticalFailed).toBe(0);
  });

  it("all requirements are met", async () => {
    const results = await validateRequirements();
    const summary = getValidationSummary(results);

    const failures = results.filter((r) => !r.passed);
    if (failures.length > 0) {
      console.log("Failed requirements:");
      for (const f of failures) {
        console.log(`  ${f.id}: ${f.description} — ${f.message}`);
      }
    }

    expect(summary.failed).toBe(0);
  });

  it("requirements.yaml has expected count", async () => {
    const results = await validateRequirements();
    expect(results.length).toBeGreaterThanOrEqual(20);
  });
});
