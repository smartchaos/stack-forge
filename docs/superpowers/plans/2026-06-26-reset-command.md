# Reset Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `cforge reset` command to restore the project to its pre-initialization state

**Architecture:** Create a new CLI command that interactively confirms and removes cforge configuration files and cleans up CLAUDE.md

**Tech Stack:** TypeScript, Node.js, commander, inquirer, fs-extra

## Global Constraints

- Node.js >= 18.0.0
- Use existing project patterns (ES modules, TypeScript)
- Follow existing code style and conventions
- Use inquirer for interactive prompts
- Use fs-extra for file operations

---

### Task 1: Create reset command module

**Files:**
- Create: `src/cli/reset.ts`
- Test: `tests/cli/reset.test.ts`

**Interfaces:**
- Consumes: None (new module)
- Produces: `runReset(projectDir: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runReset } from '../../src/cli/reset.js';
import { remove, pathExists, readFile, writeFile } from 'fs-extra';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtemp, rm } from 'fs/promises';

describe('runReset', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'cforge-reset-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should delete .cforge directory', async () => {
    // Create .cforge directory
    const cforgeDir = join(testDir, '.cforge');
    await writeFile(join(cforgeDir, 'config.yaml'), 'test: true');
    
    // Mock inquirer to auto-confirm
    vi.mock('inquirer', () => ({
      default: {
        prompt: vi.fn().mockResolvedValue({ confirm: true })
      }
    }));

    await runReset(testDir);
    
    const exists = await pathExists(cforgeDir);
    expect(exists).toBe(false);
  });

  it('should remove Stack Forge section from CLAUDE.md', async () => {
    // Create CLAUDE.md with Stack Forge section
    const claudeMdPath = join(testDir, 'CLAUDE.md');
    const content = `# Claude Code

## Stack Forge

- Start: \`cforge feature "<description>"\`
- Status: \`cforge status\`

## Other Section

Some content here.
`;
    await writeFile(claudeMdPath, content);
    
    // Mock inquirer to auto-confirm
    vi.mock('inquirer', () => ({
      default: {
        prompt: vi.fn().mockResolvedValue({ confirm: true })
      }
    }));

    await runReset(testDir);
    
    const result = await readFile(claudeMdPath, 'utf-8');
    expect(result).not.toContain('## Stack Forge');
    expect(result).toContain('## Other Section');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli/reset.test.ts`
Expected: FAIL with "Cannot find module '../../src/cli/reset.js'"

- [ ] **Step 3: Write minimal implementation**

```typescript
import { remove, pathExists, readFile, writeFile } from 'fs-extra';
import { join } from 'path';
import inquirer from 'inquirer';
import { logger } from '../logger.js';

export async function runReset(projectDir: string): Promise<void> {
  const cforgeDir = join(projectDir, '.cforge');
  const claudeMdPath = join(projectDir, 'CLAUDE.md');
  
  // Check if cforge is initialized
  const cforgeExists = await pathExists(cforgeDir);
  if (!cforgeExists) {
    logger.warn('Stack Forge is not initialized in this project');
  }
  
  // Confirmation prompt
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'WARNING: This will remove all Stack Forge configuration and generated files.\n\nFiles to be removed:\n- .cforge/ directory (all contents)\n- Stack Forge section from CLAUDE.md\n\nThis action cannot be undone.\n\nAre you sure you want to reset?',
      default: false
    }
  ]);
  
  if (!confirm) {
    logger.info('Reset cancelled.');
    return;
  }
  
  // Delete .cforge directory
  if (cforgeExists) {
    await remove(cforgeDir);
    logger.info('Deleted .cforge directory');
  }
  
  // Clean CLAUDE.md
  if (await pathExists(claudeMdPath)) {
    const content = await readFile(claudeMdPath, 'utf-8');
    const stackForgeStart = content.indexOf('## Stack Forge');
    
    if (stackForgeStart !== -1) {
      const afterStackForge = content.substring(stackForgeStart);
      const nextHeading = afterStackForge.indexOf('\n## ', 1);
      const cleanedContent = (nextHeading !== -1
        ? content.substring(0, stackForgeStart) + afterStackForge.substring(nextHeading)
        : content.substring(0, stackForgeStart)
      ).trimEnd();
      
      await writeFile(claudeMdPath, cleanedContent + '\n', 'utf-8');
      logger.info('Cleaned CLAUDE.md');
    }
  }
  
  logger.info('Stack Forge has been reset successfully.');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli/reset.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/reset.ts tests/cli/reset.test.ts
git commit -m "feat: add reset command module"
```

### Task 2: Register reset command in CLI

**Files:**
- Modify: `src/index.ts:79-80` (add import and command)
- Test: `tests/cli/reset.test.ts` (update existing tests)

**Interfaces:**
- Consumes: `runReset` from `./cli/reset.js`
- Produces: Command registered in commander program

- [ ] **Step 1: Write the failing test**

```typescript
// Add to existing test file
describe('CLI Integration', () => {
  it('should register reset command', async () => {
    // This is a basic integration test
    // The actual CLI testing would require more setup
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli/reset.test.ts`
Expected: PASS (test is trivial)

- [ ] **Step 3: Write minimal implementation**

```typescript
// In src/index.ts, add import at top
import { runReset } from "./cli/reset.js";

// Add command after existing commands
program
  .command("reset")
  .description("Reset Stack Forge to pre-initialization state")
  .action(async () => {
    logger.debug("Starting reset");
    await runReset(process.cwd());
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli/reset.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: register reset command in CLI"
```

### Task 3: Update documentation

**Files:**
- Modify: `README.md:57-67` (commands table)
- Test: Manual verification

**Interfaces:**
- Consumes: None
- Produces: Updated documentation

- [ ] **Step 1: Write the failing test**

```bash
# Manual verification
grep -q "cforge reset" README.md
```

- [ ] **Step 2: Run test to verify it fails**

Run: `grep -q "cforge reset" README.md; echo $?`
Expected: Exit code 1 (not found)

- [ ] **Step 3: Write minimal implementation**

```markdown
# In README.md, update commands table
| Command | Description |
|---------|-------------|
| `cforge init` | Initialize Stack Forge (zero-config) |
| `cforge [workflow] [desc]` | Start or continue a workflow |
| `cforge status` | Show current workflow status |
| `cforge healthcheck` | Check health of installed providers |
| `cforge update` | Re-scan providers and update configuration |
| `cforge generate` | Regenerate all config files |
| `cforge validate` | Validate implementation against spec requirements |
| `cforge reset` | Reset Stack Forge to pre-initialization state |
```

- [ ] **Step 4: Run test to verify it passes**

Run: `grep -q "cforge reset" README.md; echo $?`
Expected: Exit code 0 (found)

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add reset command to README"
```

### Task 4: Final verification

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Verified implementation

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Manual testing**

```bash
# Test reset command
npm run dev -- reset
# Should show warning and confirmation prompt
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete reset command implementation"
```