import type { CapabilityDefinition, DetectedProvider, ProviderDefinition } from "../types/provider.js";

export interface ProviderSelection {
  provider: string;
  reason: "override" | "preferred" | "priority" | "fallback" | "default";
}

function isProviderEligibleForCapability(
  provider: DetectedProvider,
  definition: ProviderDefinition | undefined,
  capabilityName: string
): boolean {
  if (!provider.capabilities.includes(capabilityName)) return false;

  const excluded = definition?.routing?.excluded_capabilities || provider.routing?.excluded_capabilities || [];
  return !excluded.includes(capabilityName);
}

function scoreProviderForCapability(
  provider: DetectedProvider,
  definition: ProviderDefinition | undefined,
  capabilityName: string,
  defaultProvider: string
): { score: number; reason: ProviderSelection["reason"] } {
  const routing = definition?.routing || provider.routing;
  const preferred = routing?.preferred_for?.includes(capabilityName) || false;
  const fallback = routing?.fallback_for?.includes(capabilityName) || false;
  const priority = routing?.priority ?? 0;
  const ruleCount = provider.matched_rule_count ?? 1;

  if (preferred) {
    return { score: 10_000 + priority * 100 + ruleCount, reason: "preferred" };
  }

  if (provider.name === defaultProvider) {
    return { score: 5_000 + priority * 100 + ruleCount, reason: "default" };
  }

  if (fallback) {
    return { score: 1_000 + priority * 100 + ruleCount, reason: "fallback" };
  }

  return { score: priority * 100 + ruleCount, reason: "priority" };
}

export function selectProviderForCapability(
  capabilityName: string,
  capability: CapabilityDefinition,
  detected: Record<string, DetectedProvider>,
  providers: Record<string, ProviderDefinition>,
  override?: string
): ProviderSelection {
  if (override && override !== "none") {
    return { provider: override, reason: "override" };
  }

  const candidates = Object.values(detected)
    .filter((provider) => isProviderEligibleForCapability(provider, providers[provider.name], capabilityName))
    .map((provider) => ({
      provider,
      scored: scoreProviderForCapability(provider, providers[provider.name], capabilityName, capability.default_provider),
    }))
    .sort((left, right) => {
      if (right.scored.score !== left.scored.score) {
        return right.scored.score - left.scored.score;
      }
      return left.provider.name.localeCompare(right.provider.name);
    });

  if (candidates.length > 0) {
    return {
      provider: candidates[0].provider.name,
      reason: candidates[0].scored.reason,
    };
  }

  return { provider: capability.default_provider, reason: "default" };
}

export function buildProviderMap(
  capabilities: Record<string, CapabilityDefinition>,
  detected: Record<string, DetectedProvider>,
  providers: Record<string, ProviderDefinition>,
  overrides: Record<string, string> = {}
): Record<string, ProviderSelection> {
  const selections: Record<string, ProviderSelection> = {};

  for (const [capabilityName, capability] of Object.entries(capabilities)) {
    selections[capabilityName] = selectProviderForCapability(
      capabilityName,
      capability,
      detected,
      providers,
      overrides[capabilityName]
    );
  }

  return selections;
}
