import { describe, it, expect } from "vitest";
import { loadTemplate, renderTemplate } from "../../src/generator/templates.js";

describe("templates", () => {
  it("loads a template file", async () => {
    const tpl = await loadTemplate("skills/orchestrator/SKILL.md");
    expect(tpl).toContain("Workflow Orchestrator");
  });

  it("renders template with variables", async () => {
    const tpl = "Hello {{name}}, workflow is {{workflow}}";
    const result = renderTemplate(tpl, { name: "test", workflow: "feature" });
    expect(result).toBe("Hello test, workflow is feature");
  });

  it("leaves unresolved variables as-is", async () => {
    const tpl = "Hello {{missing}}";
    const result = renderTemplate(tpl, {});
    expect(result).toBe("Hello {{missing}}");
  });
});
