# Stack Forge Routing Optimization Validation Plan

> **For agentic workers:** Validate provider selection changes before and after implementation. Use this plan to keep routing behavior explainable, deterministic, and regression-resistant.

**Goal:** Verify that routing-layer improvements correctly disambiguate similar providers/skills, preserve existing simple flows, and generate orchestration outputs that reflect the selected providers.

**Scope:** Provider metadata, provider matching, capability-to-provider selection, and generated orchestration artifacts.

**Non-Goals:** Reworking unrelated CLI UX, redesigning stage templates, or changing healthcheck semantics unless required by routing changes.

---

## Validation Principles

1. **Correctness over mere execution**

The routing layer is successful only when it selects the right provider for a capability under ambiguous conditions. A passing command with the wrong provider is still a failure.

2. **Determinism under similar inputs**

The same registry and scan inputs must produce the same routing decisions every time. Similar providers should not cause unstable selection.

3. **Explainability as a product requirement**

Selection should be inspectable. If the system chooses provider A over provider B, tests should be able to assert the reason through metadata, priority, or explicit fallback order.

4. **Regression protection for default flows**

Most users will still rely on the default `cforge init` path. Routing improvements must not degrade the simple case where only one provider is available for a capability.

---

## Test Layers

### Layer 1: Matcher Unit Tests

**Purpose:** Verify provider detection and selection primitives in isolation.

**Primary files:**
- `src/discovery/matcher.ts`
- `tests/discovery/matcher.test.ts`

**Required coverage:**
- [ ] Detect a provider when only one detection rule matches
- [ ] Ignore providers whose detection rules do not match
- [ ] Prefer a higher-priority provider when multiple providers satisfy the same capability
- [ ] Preserve deterministic ordering when two providers have equal detection strength
- [ ] Respect explicit user/provider override input when present
- [ ] Reject providers excluded for a capability even if they are detected

**Pass criteria:**
- All matcher tests pass
- No test depends on object iteration accidents or current wall-clock time

### Layer 2: Registry and Schema Validation

**Purpose:** Ensure routing metadata is structurally valid before runtime selection uses it.

**Primary files:**
- `registry/providers.yaml`
- `registry/capabilities.yaml`
- `src/types/provider.ts`
- `tests/discovery/registry.test.ts`
- `tests/schemas/config.test.ts`

**Required coverage:**
- [ ] Provider metadata fails validation when routing fields are malformed
- [ ] Capability defaults must reference an existing provider
- [ ] Provider priority values must be constrained to known values
- [ ] Fallback providers, if configured, must reference existing providers
- [ ] Exclusion/preference metadata must not reference undefined capabilities

**Pass criteria:**
- Invalid registry fixtures fail fast with clear error messages
- Current checked-in registry passes validation without warnings

### Layer 3: Routing Behavior Tests

**Purpose:** Test capability-to-provider resolution, not just raw detection.

**Primary files:**
- `src/cli/init.ts`
- new routing helper if introduced
- focused tests adjacent to routing implementation

**Required coverage:**
- [ ] Single detected provider maps to the capability as before
- [ ] Multiple detected providers for one capability resolve to the preferred provider
- [ ] Missing preferred provider falls back to default capability provider
- [ ] Existing persisted provider config is merged without losing newly detected stronger candidates
- [ ] Similar providers with different routing metadata resolve consistently across repeated runs

**Pass criteria:**
- Resolution is deterministic across repeated test runs
- Tests assert both the chosen provider and the fallback reason

### Layer 4: Generated Artifact Integration Tests

**Purpose:** Confirm routing decisions appear in generated project artifacts.

**Primary files:**
- `src/generator/orchestrator.ts`
- `src/generator/stages.ts`
- `src/generator/claude-md.ts`
- `tests/integration/init-workflow.test.ts`
- `tests/generator/orchestrator.test.ts`

**Required coverage:**
- [ ] `cforge init` generates a valid project structure after routing changes
- [ ] Generated provider mappings reflect the selected provider, not just the capability default
- [ ] Orchestrator output remains stable when routing metadata changes only for unrelated capabilities
- [ ] Re-running generation does not drift selected providers without input changes

**Pass criteria:**
- Integration tests pass against built CLI output
- Generated files contain the expected provider mapping and workflow stage structure

### Layer 5: Golden Scenario Regression Tests

**Purpose:** Protect user-visible behavior using realistic multi-provider scenarios.

**Suggested fixture themes:**
- [ ] Only one provider exists for each capability
- [ ] Two similar providers compete for `specification`
- [ ] Two similar providers compete for `review`
- [ ] A preferred provider is absent, forcing fallback
- [ ] A user override chooses a non-default provider

**Scenario format:**
- Input:
  - detected providers
  - capability registry
  - optional override
- Expected:
  - selected provider per capability
  - explanation basis: `priority`, `override`, `fallback`, or `default`

**Pass criteria:**
- Every golden scenario asserts both outcome and explanation basis
- New routing changes must update fixtures intentionally, not incidentally

---

## Recommended Execution Order

1. Add or update matcher unit tests first
2. Add registry/schema validation for new routing metadata
3. Add routing behavior tests for capability resolution
4. Add golden scenario fixtures for ambiguous provider cases
5. Run integration tests for `init` and generated artifacts

**Why this order:**
- Unit tests isolate algorithm changes early
- Schema tests prevent invalid registry data from hiding logic bugs
- Behavior tests verify end-to-end selection logic before CLI integration
- Golden scenarios protect product behavior
- Integration tests confirm the generated outputs still work

---

## Commands

Run targeted tests during implementation:

```bash
npm test -- tests/discovery/matcher.test.ts
npm test -- tests/discovery/registry.test.ts
npm test -- tests/integration/init-workflow.test.ts
```

Run the full test suite before opening a PR:

```bash
npm test
```

Build before integration assertions that depend on `dist/`:

```bash
npm run build
```

---

## PR Acceptance Criteria

- [ ] Routing changes include tests at unit and integration levels
- [ ] Similar-provider ambiguity is covered by at least one golden scenario
- [ ] Registry additions include validation coverage
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] Generated initialization flow still succeeds in a clean temp directory

---

## Why This Validation Strategy

This project is not only generating files; it is making routing decisions that determine the rest of the workflow. That means validation has to prove:

- the decision inputs are valid
- the selection logic is correct
- the outputs reflect the selection
- future changes do not silently alter user-facing routing behavior

Without all four, the project can appear healthy while still choosing the wrong skills/providers in real usage.
