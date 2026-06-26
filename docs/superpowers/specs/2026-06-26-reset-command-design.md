# Reset Command Design

## Overview

Add a `cforge reset` command to restore the project to its pre-initialization state by removing all cforge-generated files and cleaning up CLAUDE.md.

## Requirements

### Functional Requirements

1. **Command**: `cforge reset`
2. **Purpose**: Remove all cforge configuration and generated files
3. **Target State**: Restore to pre-`cforge init` state

### Non-Functional Requirements

1. **User Experience**: Simple, interactive confirmation
2. **Safety**: Warn before destructive actions
3. **Error Handling**: Graceful handling of missing files

## Design

### Command Line Interface

```bash
cforge reset
```

- No additional flags or options
- Interactive confirmation required

### Execution Flow

1. **Check Initialization**
   - Check if `.cforge` directory exists
   - If not exists: Display warning "Stack Forge is not initialized in this project"
   - Continue regardless of initialization status

2. **Confirmation Prompt**
   - Display warning message:
     ```
     WARNING: This will remove all Stack Forge configuration and generated files.
     
     Files to be removed:
     - .cforge/ directory (all contents)
     - Stack Forge section from CLAUDE.md
     
     This action cannot be undone.
     ```
   - Ask for confirmation: "Are you sure you want to reset? (yes/no)"
   - Use inquirer for interactive prompt

3. **Execution**
   - If confirmed "yes":
     - Delete `.cforge` directory recursively
     - Remove "## Stack Forge" section from CLAUDE.md
     - Display success message: "Stack Forge has been reset successfully."
   - If "no" or cancelled:
     - Display message: "Reset cancelled."
     - Exit with code 0

### File Operations

1. **Delete `.cforge` directory**
   - Use `fs-extra`'s `remove` function
   - Handle errors gracefully

2. **Clean CLAUDE.md**
   - Read existing CLAUDE.md content
   - Find "## Stack Forge" section
   - Remove the section and its content
   - Preserve all other content
   - Write back to file

### Error Handling

1. **Missing `.cforge` directory**
   - Display warning: "Stack Forge is not initialized in this project"
   - Continue with CLAUDE.md cleanup if needed

2. **Missing CLAUDE.md**
   - Skip CLAUDE.md cleanup
   - Continue with `.cforge` deletion

3. **File permission errors**
   - Display error message with details
   - Exit with code 1

### Output Messages

1. **Warning**: Display before confirmation
2. **Success**: "Stack Forge has been reset successfully."
3. **Cancelled**: "Reset cancelled."
4. **Error**: Display specific error details

## Implementation

### New Files

1. `src/cli/reset.ts` - Main reset command implementation

### Modified Files

1. `src/index.ts` - Add reset command registration

### Dependencies

- `inquirer` - For interactive confirmation
- `fs-extra` - For file operations
- `path` - For path utilities

## Testing

### Unit Tests

1. Test command registration
2. Test confirmation prompt
3. Test `.cforge` directory deletion
4. Test CLAUDE.md cleanup
5. Test error handling scenarios

### Integration Tests

1. Test full reset flow
2. Test with missing `.cforge` directory
3. Test with missing CLAUDE.md
4. Test with partial CLAUDE.md content

## Documentation

### README Updates

1. Add `cforge reset` to commands table
2. Update Quick Start section if needed

### Help Text

- Add command description: "Reset Stack Forge to pre-initialization state"
- Include in command help output