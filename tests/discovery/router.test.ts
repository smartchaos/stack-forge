import { describe, expect, it } from "vitest";
import { buildProviderMap, selectProviderForCapability } from "../../src/discovery/router.js";
import type { CapabilityDefinition, DetectedProvider, ProviderDefinition } from "../../src/types/provider.js";

describe("router", () => {
  const specificationCapability: CapabilityDefinition = {
    name: "Specification",
    description: "Formal requirement spec from proposal",
    input: "proposal.md",
    output: "spec.md",
    default_provider: "feature-dev",
  };

  it("prefers provider marked preferred_for over lower-priority detected peers", () => {
    const detected: Record<string, DetectedProvider> = {
      "feature-dev": {
        name: "feature-dev",
        capabilities: ["specification"],
        source: "detected:feature-dev",
        detected_at: "2026-06-30T00:00:00.000Z",
        matched_rule_count: 1,
      },
      "spec-pro": {
        name: "spec-pro",
        capabilities: ["specification"],
        source: "detected:spec-pro",
        detected_at: "2026-06-30T00:00:00.000Z",
        matched_rule_count: 2,
      },
    };

    const providers: Record<string, ProviderDefinition> = {
      "feature-dev": {
        name: "feature-dev",
        capabilities: ["specification"],
        detect: [],
        routing: { priority: 10 },
      },
      "spec-pro": {
        name: "spec-pro",
        capabilities: ["specification"],
        detect: [],
        routing: { priority: 5, preferred_for: ["specification"] },
      },
    };

    const selection = selectProviderForCapability(
      "specification",
      specificationCapability,
      detected,
      providers
    );

    expect(selection).toEqual({
      provider: "spec-pro",
      reason: "preferred",
    });
  });

  it("prefers fallback provider over high-priority non-fallback provider", () => {
    const detected: Record<string, DetectedProvider> = {
      "fallback-spec": {
        name: "fallback-spec",
        capabilities: ["specification"],
        source: "detected:fallback-spec",
        detected_at: "2026-06-30T00:00:00.000Z",
        matched_rule_count: 1,
      },
      "high-priority": {
        name: "high-priority",
        capabilities: ["specification"],
        source: "detected:high-priority",
        detected_at: "2026-06-30T00:00:00.000Z",
        matched_rule_count: 1,
      },
    };

    const providers: Record<string, ProviderDefinition> = {
      "fallback-spec": {
        name: "fallback-spec",
        capabilities: ["specification"],
        detect: [],
        routing: { priority: 0, fallback_for: ["specification"] },
      },
      "high-priority": {
        name: "high-priority",
        capabilities: ["specification"],
        detect: [],
        routing: { priority: 50 },
      },
    };

    const selection = selectProviderForCapability(
      "specification",
      specificationCapability,
      detected,
      providers
    );

    expect(selection.provider).toBe("fallback-spec");
    expect(selection.reason).toBe("fallback");
  });

  it("falls back to default provider when no detected provider is eligible", () => {
    const selection = selectProviderForCapability(
      "specification",
      specificationCapability,
      {},
      {}
    );

    expect(selection).toEqual({
      provider: "feature-dev",
      reason: "default",
    });
  });

  it("respects explicit provider overrides", () => {
    const selection = selectProviderForCapability(
      "specification",
      specificationCapability,
      {},
      {},
      "manual-spec"
    );

    expect(selection).toEqual({
      provider: "manual-spec",
      reason: "override",
    });
  });

  it("excludes providers configured as ineligible for a capability", () => {
    const detected: Record<string, DetectedProvider> = {
      "feature-dev": {
        name: "feature-dev",
        capabilities: ["specification"],
        source: "detected:feature-dev",
        detected_at: "2026-06-30T00:00:00.000Z",
        matched_rule_count: 1,
      },
    };

    const providers: Record<string, ProviderDefinition> = {
      "feature-dev": {
        name: "feature-dev",
        capabilities: ["specification"],
        detect: [],
        routing: { excluded_capabilities: ["specification"] },
      },
    };

    const selection = selectProviderForCapability(
      "specification",
      specificationCapability,
      detected,
      providers
    );

    expect(selection).toEqual({
      provider: "feature-dev",
      reason: "default",
    });
  });

  it("builds deterministic provider maps across multiple capabilities", () => {
    const capabilities: Record<string, CapabilityDefinition> = {
      specification: specificationCapability,
      review: {
        name: "Review",
        description: "Code review",
        input: "diff",
        output: "review.md",
        default_provider: "code-review",
      },
    };

    const detected: Record<string, DetectedProvider> = {
      "feature-dev": {
        name: "feature-dev",
        capabilities: ["specification"],
        source: "detected:feature-dev",
        detected_at: "2026-06-30T00:00:00.000Z",
      },
      "code-review": {
        name: "code-review",
        capabilities: ["review"],
        source: "detected:code-review",
        detected_at: "2026-06-30T00:00:00.000Z",
      },
    };

    const providers: Record<string, ProviderDefinition> = {
      "feature-dev": {
        name: "feature-dev",
        capabilities: ["specification"],
        detect: [],
        routing: { preferred_for: ["specification"], priority: 100 },
      },
      "code-review": {
        name: "code-review",
        capabilities: ["review"],
        detect: [],
        routing: { preferred_for: ["review"], priority: 100 },
      },
    };

    expect(buildProviderMap(capabilities, detected, providers)).toEqual({
      specification: { provider: "feature-dev", reason: "preferred" },
      review: { provider: "code-review", reason: "preferred" },
    });
  });
});
