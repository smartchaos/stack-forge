import { describe, it, expect } from "vitest";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { validateRequirements } from "../../src/validation/validator.js";

async function withTempFile(prefix: string, content: string, fn: (file: string) => Promise<void>) {
  const dir = join(tmpdir(), prefix);
  await mkdir(dir, { recursive: true });
  const file = join(dir, "test.ts");
  await writeFile(file, content, "utf-8");
  try {
    await fn(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("export_exists validation", () => {
  it("matches symbol containing regex metacharacters", async () => {
    await withTempFile("cforge-validator-plus", "export const foo+bar = 1;\n", async (file) => {
      const results = await validateRequirements([
        {
          id: "symbol-plus",
          description: "Symbol containing plus",
          type: "export_exists",
          file,
          symbol: "foo+bar",
          critical: true,
        },
      ]);

      expect(results[0].passed).toBe(true);
    });
  });

  it("matches symbol containing dollar sign", async () => {
    await withTempFile("cforge-validator-dollar", "export const $foo = 1;\n", async (file) => {
      const results = await validateRequirements([
        {
          id: "symbol-dollar",
          description: "Symbol containing dollar sign",
          type: "export_exists",
          file,
          symbol: "$foo",
          critical: true,
        },
      ]);

      expect(results[0].passed).toBe(true);
    });
  });

  it("does not throw and reports missing for symbol with quantifier-like characters", async () => {
    const results = await validateRequirements([
      {
        id: "symbol-plus-missing",
        description: "Symbol containing plus that does not exist",
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
