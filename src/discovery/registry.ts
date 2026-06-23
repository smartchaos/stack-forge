import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import type { CapabilityDefinition, ProviderDefinition } from "../types/provider.js";
import type { ManifestEntry } from "../types/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_DIR = resolve(__dirname, "../../registry");

async function loadYaml<T>(filename: string): Promise<T> {
  const content = await readFile(resolve(REGISTRY_DIR, filename), "utf-8");
  return parseYaml(content) as T;
}

export async function loadCapabilities(): Promise<Record<string, CapabilityDefinition>> {
  return loadYaml<Record<string, CapabilityDefinition>>("capabilities.yaml");
}

export async function loadProviders(): Promise<Record<string, ProviderDefinition>> {
  return loadYaml<Record<string, ProviderDefinition>>("providers.yaml");
}

export async function loadManifest(): Promise<ManifestEntry[]> {
  return loadYaml<ManifestEntry[]>("manifest.yaml");
}