import { describe, it, expect } from "vitest";
import { validateRequirements } from "../../src/validation/validator.js";

describe("export_exists validation", () => {
  it("matches symbols with regex metacharacters", async () => {
    const results = await validateRequirements([
      {
        id: "symbol-dollar",
        description: "Export with $ in name",
        type: "export_exists",
        file: "src/types/provider.ts",
        symbol: "BUILTIN_PROVIDER",
        critical: true,
      },
      {
        id: "symbol-dot-like",
        description: "Symbol that looks like a property path",
        type: "export_exists",
        file: "src/types/config.ts",
        symbol: "ProviderOverride",
        critical: true,
      },
    ]);

    expect(results.every((r) => r.passed)).toBe(true);
  });

  it("does not throw on symbol with quantifier-like characters", async () => {
    const results = await validateRequirements([
      {
        id: "symbol-plus",
        description: "Symbol containing plus",
        type: "export_exists",
        file: "src/types/provider.ts",
        symbol: "foo+bar",
        critical: false,
      },
    ]);

    expect(results[0].passed).toBe(false);
    expect(results[0].message).toContain('Export "foo+bar" not found');
  });
});
