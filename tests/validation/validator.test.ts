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
  it("escapes regex metacharacters when reporting missing exports", async () => {
    await withTempFile("cforge-validator-plus", "export const foobar = 1;\n", async (file) => {
      const results = await validateRequirements([
        {
          id: "symbol-plus",
          description: "Missing symbol containing plus",
          type: "export_exists",
          file,
          symbol: "foo+bar",
          critical: true,
        },
      ]);

      expect(results[0].passed).toBe(false);
      expect(results[0].message).toContain('Export "foo+bar" not found');
    });
  });

  it("matches exported identifiers containing dollar signs", async () => {
    await withTempFile("cforge-validator-dollar", "export const foo$ = 1;\nexport const $foo = 2;\n", async (file) => {
      const results = await validateRequirements([
        {
          id: "symbol-trailing-dollar",
          description: "Symbol ending with dollar sign",
          type: "export_exists",
          file,
          symbol: "foo$",
          critical: true,
        },
        {
          id: "symbol-leading-dollar",
          description: "Symbol beginning with dollar sign",
          type: "export_exists",
          file,
          symbol: "$foo",
          critical: true,
        },
      ]);

      expect(results.map((result) => result.passed)).toEqual([true, true]);
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
