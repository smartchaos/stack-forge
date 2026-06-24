import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { detectProject } from "../../src/discovery/project-detector.js";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const TEST_DIR = join("/tmp", "cforge-test-" + Date.now());

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe("detectProject", () => {
  it("detects name from package.json", async () => {
    await writeFile(join(TEST_DIR, "package.json"), JSON.stringify({
      name: "my-app",
      description: "A test app"
    }));
    const result = await detectProject(TEST_DIR);
    expect(result.name).toBe("my-app");
    expect(result.description).toBe("A test app");
  });

  it("falls back to directory name when no package.json", async () => {
    const result = await detectProject(TEST_DIR);
    expect(result.name).toBe(TEST_DIR.split("/").pop());
    expect(result.description).toBe("");
  });

  it("prefers package.json name over directory name", async () => {
    await writeFile(join(TEST_DIR, "package.json"), JSON.stringify({
      name: "pkg-name"
    }));
    const result = await detectProject(TEST_DIR);
    expect(result.name).toBe("pkg-name");
  });

  it("falls back to directory name for malformed package.json", async () => {
    await writeFile(join(TEST_DIR, "package.json"), "{ invalid json");
    const result = await detectProject(TEST_DIR);
    expect(result.name).toBe(TEST_DIR.split("/").pop());
    expect(result.description).toBe("");
  });
});