import { readFile } from "fs/promises";
import { resolve, dirname, isAbsolute } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

export type RequirementType =
  | "file_exists"
  | "file_absent"
  | "file_content"
  | "export_exists"
  | "config_value";

export interface Requirement {
  id: string;
  description: string;
  type: RequirementType;
  file: string;
  pattern?: string;
  symbol?: string;
  critical: boolean;
}

export interface RequirementResult {
  id: string;
  description: string;
  type: RequirementType;
  critical: boolean;
  passed: boolean;
  message?: string;
}

interface RequirementsFile {
  requirements: Requirement[];
}

export async function loadRequirements(): Promise<Requirement[]> {
  const reqPath = resolve(PROJECT_ROOT, "registry/requirements.yaml");
  const content = await readFile(reqPath, "utf-8");
  const data = parseYaml(content) as RequirementsFile;
  return data.requirements || [];
}

function resolveProjectPath(filePath: string): string {
  return isAbsolute(filePath) ? filePath : resolve(PROJECT_ROOT, filePath);
}

async function readFileContent(filePath: string): Promise<string | null> {
  try {
    return await readFile(resolveProjectPath(filePath), "utf-8");
  } catch {
    return null;
  }
}

function checkFileExists(req: Requirement): RequirementResult {
  const passed = existsSync(resolveProjectPath(req.file));
  return {
    id: req.id,
    description: req.description,
    type: req.type,
    critical: req.critical,
    passed,
    message: passed ? undefined : `File not found: ${req.file}`,
  };
}

async function checkFileAbsent(req: Requirement): Promise<RequirementResult> {
  if (!req.pattern) {
    return {
      id: req.id,
      description: req.description,
      type: req.type,
      critical: req.critical,
      passed: false,
      message: "No pattern specified for file_absent check",
    };
  }
  const content = await readFileContent(req.file);
  const passed = content === null ? false : !content.includes(req.pattern);
  return {
    id: req.id,
    description: req.description,
    type: req.type,
    critical: req.critical,
    passed,
    message: passed ? undefined : `Found forbidden pattern "${req.pattern}" in ${req.file}`,
  };
}

async function checkFileContent(req: Requirement): Promise<RequirementResult> {
  if (!req.pattern) {
    return {
      id: req.id,
      description: req.description,
      type: req.type,
      critical: req.critical,
      passed: false,
      message: "No pattern specified for file_content check",
    };
  }
  const content = await readFileContent(req.file);
  const passed = content === null ? false : content.includes(req.pattern);
  return {
    id: req.id,
    description: req.description,
    type: req.type,
    critical: req.critical,
    passed,
    message: passed ? undefined : `Pattern "${req.pattern}" not found in ${req.file}`,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function checkExportExists(req: Requirement): Promise<RequirementResult> {
  if (!req.symbol) {
    return {
      id: req.id,
      description: req.description,
      type: req.type,
      critical: req.critical,
      passed: false,
      message: "No symbol specified for export_exists check",
    };
  }
  const content = await readFileContent(req.file);
  if (content === null) {
    return {
      id: req.id,
      description: req.description,
      type: req.type,
      critical: req.critical,
      passed: false,
      message: `File not found: ${req.file}`,
    };
  }
  const exportPattern = new RegExp(`export\\s+(?:async\\s+)?(?:function|const|class|type|interface)\\s+${escapeRegExp(req.symbol)}\\b`);
  const passed = exportPattern.test(content);
  return {
    id: req.id,
    description: req.description,
    type: req.type,
    critical: req.critical,
    passed,
    message: passed ? undefined : `Export "${req.symbol}" not found in ${req.file}`,
  };
}

async function checkRequirement(req: Requirement): Promise<RequirementResult> {
  switch (req.type) {
    case "file_exists":
      return checkFileExists(req);
    case "file_absent":
      return checkFileAbsent(req);
    case "file_content":
      return checkFileContent(req);
    case "export_exists":
      return checkExportExists(req);
    default:
      return {
        id: req.id,
        description: req.description,
        type: req.type,
        critical: req.critical,
        passed: false,
        message: `Unknown requirement type: ${req.type}`,
      };
  }
}

export async function validateRequirements(
  requirements?: Requirement[]
): Promise<RequirementResult[]> {
  const reqs = requirements || (await loadRequirements());
  const results: RequirementResult[] = [];

  for (const req of reqs) {
    const result = await checkRequirement(req);
    results.push(result);
  }

  return results;
}

export function getValidationSummary(results: RequirementResult[]): {
  total: number;
  passed: number;
  failed: number;
  criticalFailed: number;
  allPassed: boolean;
} {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const criticalFailed = results.filter((r) => !r.passed && r.critical).length;

  return {
    total,
    passed,
    failed,
    criticalFailed,
    allPassed: criticalFailed === 0,
  };
}
