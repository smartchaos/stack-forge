# Troubleshooting

## Common Issues

### "No workflow initialized"
Run `cforge init` first to set up the project.

### "Missing critical providers"
Run `cforge init` to auto-install missing providers, or install manually.

### State file corrupted
Stack Forge creates backups automatically. If state is corrupted:
1. Check for `state.json.bak` in `.cforge/`
2. Rename backup to `state.json`
3. Run `cforge status` to verify

### Health check fails
Run `cforge healthcheck --verbose` for detailed output.

## Debug Mode

Set environment variable for verbose logging:
```bash
CFORGE_LOG_LEVEL=debug cforge <command>
```

## Reset Project

To completely reset Stack Forge:
```bash
rm -rf .cforge .claude/skills/workflow-orchestrator .claude/commands/cforge.md
cforge init
```
