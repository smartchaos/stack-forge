import { describe, it, expect } from "vitest";
import { loadCapabilities, loadProviders, loadManifest } from "../../src/discovery/registry.js";

describe("registry", () => {
  it("loads capabilities from yaml", async () => {
    const caps = await loadCapabilities();
    expect(caps).toBeDefined();
    expect(caps.brainstorm).toBeDefined();
    expect(caps.brainstorm.default_provider).toBe("superpowers");
    expect(caps.specification).toBeDefined();
    expect(caps.planning).toBeDefined();
  });

  it("loads providers from yaml", async () => {
    const providers = await loadProviders();
    expect(providers).toBeDefined();
    expect(providers.superpowers).toBeDefined();
    expect(providers.superpowers.capabilities).toContain("brainstorm");
  });

  it("loads manifest from yaml", async () => {
    const manifest = await loadManifest();
    expect(manifest).toBeDefined();
    expect(manifest.length).toBeGreaterThan(0);
    expect(manifest[0].name).toBe("superpowers");
  });
});