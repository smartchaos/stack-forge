import type { CapabilityDefinition, DetectedProvider, ProviderDefinition } from "../types/provider.js";

export interface ProviderSelection {
  provider: string;
  reason: "override" | "preferred" | "priority" | "fallback" | "default";
}

// Score tier constants. Each tier is an order of magnitude apart so that
// tier always dominates priority within-tier ranking.  The gap between
// SCORE_FALLBACK (1_000) and SCORE_PRIORITY_MULTIPLIER * MAX_PRIORITY (10*50=500)
// guarantees: preferred > default > fallback > priority-only.
const SCORE_PREFERRED = 100_000;
const SCORE_DEFAULT = 10_000;
const SCORE_FALLBACK = 1_000;
const SCORE_PRIORITY_MULTIPLIER = 10;
const MAX_PRIORITY = 50;

function isProviderEligibleForCapability(
  provider: DetectedProvider,
  definition: ProviderDefinition | undefined,
  capabilityName: string
): boolean {
  if (!provider.capabilities.includes(capabilityName)) return false;

  const excluded = definition?.routing?.excluded_capabilities ?? provider.routing?.excluded_capabilities ?? [];
  return !excluded.includes(capabilityName);
}

function scoreProviderForCapability(
  provider: DetectedProvider,
  definition: ProviderDefinition | undefined,
  capabilityName: string,
  defaultProvider: string
): { score: number; reason: ProviderSelection["reason"] } {
  const routing = definition?.routing ?? provider.routing;
  const preferred = routing?.preferred_for?.includes(capabilityName) ?? false;
  const fallback = routing?.fallback_for?.includes(capabilityName) ?? false;
  const priority = Math.min(routing?.priority ?? 0, MAX_PRIORITY);
  const ruleCount = provider.matched_rule_count ?? 1;
  const baseScore = priority * SCORE_PRIORITY_MULTIPLIER + ruleCount;

  if (preferred) {
    return { score: SCORE_PREFERRED + baseScore, reason: "preferred" };
  }

  if (provider.name === defaultProvider) {
    return { score: SCORE_DEFAULT + baseScore, reason: "default" };
  }

  if (fallback) {
    return { score: SCORE_FALLBACK + baseScore, reason: "fallback" };
  }

  return { score: baseScore, reason: "priority" };
}

function pickBestProvider(
  candidates: { provider: DetectedProvider; scored: { score: number; reason: ProviderSelection["reason"] } }[]
): { provider: DetectedProvider; scored: { score: number; reason: ProviderSelection["reason"] } } | undefined {
  if (candidates.length === 0) return undefined;

  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    const current = candidates[i];
    if (
      current.scored.score > best.scored.score ||
      (current.scored.score === best.scored.score && current.provider.name.localeCompare(best.provider.name, "en", { sensitivity: "base" }) < 0)
    ) {
      best = current;
    }
  }
  return best;
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
    }));

  const best = pickBestProvider(candidates);

  if (best) {
    return {
      provider: best.provider.name,
      reason: best.scored.reason,
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
