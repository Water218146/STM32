# Claude Code to OpenCode Migration Log

## Migration Date: January 30, 2026

## What Was Migrated

### 1. Permissions Configuration
- **From**: `.claude/settings.local.json`
- **To**: `opencode.json` (project) and `~/.config/opencode/opencode.json` (global)
- **Changes**: Converted Claude Code permission format to OpenCode format

### 2. Project Context
- **From**: (No existing CLAUDE.md found)
- **To**: `AGENTS.md` created with project context based on existing code structure
- **Content**: Tech stack, context, commands, rules, and notes

## Configuration Files Created

### Global Configuration
- `~/.config/opencode/opencode.json` - Global OpenCode settings

### Project Configuration
- `opencode.json` - Project-specific OpenCode settings
- `AGENTS.md` - Project context and instructions for OpenCode agent

## Key Differences Between Claude Code and OpenCode

### File Structure
- **Claude Code**: Uses `.claude/` directory with `settings.json` and `settings.local.json`
- **OpenCode**: Uses `opencode.json` (or `opencode.jsonc`) directly in project root

### Context Files
- **Claude Code**: `CLAUDE.md` for project context
- **OpenCode**: `AGENTS.md` for project context

### Permission Format
- **Claude Code**: `permissions.allow` array with detailed patterns
- **OpenCode**: `permission` object with tool-specific settings (allow/ask/deny)

### Configuration Hierarchy
- **Claude Code**: Enterprise > CLI flags > Local > Shared > Global
- **OpenCode**: Remote > Global > Custom > Project > .opencode directory > Inline

## Next Steps for Complete Migration

### 1. Check for Additional Claude Code Configurations
```bash
# Look for any remaining Claude Code files
find ~ -name "CLAUDE.md" -o -name "settings.json" 2>/dev/null | grep claude
```

### 2. Verify OpenCode Installation
```bash
# Check if OpenCode is installed
opencode --version
```

### 3. Test the Configuration
```bash
# Navigate to your project
cd /mnt/d/AAAWaterCode/Distributed_IO/disteributed_io

# Run OpenCode
opencode

# Initialize the project
/init
```

### 4. Customize Further (Optional)

#### Add Custom Commands
If you had custom commands in Claude Code, add them to `opencode.json`:
```json
{
  "command": {
    "test": {
      "template": "Run the test suite...",
      "description": "Run tests"
    }
  }
}
```

#### Configure Models
Set your preferred model in `opencode.json`:
```json
{
  "model": "anthropic/claude-sonnet-4-5"
}
```

#### Add Custom Agents
Create specialized agents in `~/.config/opencode/agents/`:
```bash
mkdir -p ~/.config/opencode/agents
```

### 5. Clean Up Old Configuration (Optional)
Once you're comfortable with OpenCode, you can remove old Claude Code files:
```bash
# Backup first
mv .claude .claude.backup
```

## Configuration Verification

To verify your OpenCode configuration is working:

1. Start OpenCode in your project directory
2. Check that it loads the AGENTS.md file
3. Verify that bash permissions work correctly
4. Test any custom commands you've added

## Additional Resources

- OpenCode Documentation: https://opencode.ai/docs
- Configuration Guide: https://opencode.ai/docs/config/
- Agents Documentation: https://opencode.ai/docs/agents/
- Rules Documentation: https://opencode.ai/docs/rules/

## Notes

- OpenCode uses JSON with comments support (.jsonc), so you can add comments to your config
- Configuration files are merged, not replaced, so you can have both global and project settings
- The AGENTS.md file should be committed to git for team consistency
- OpenCode supports multiple configuration sources, giving you more flexibility than Claude Code

## Troubleshooting

### If permissions don't work:
Check the exact format in opencode.json and ensure the tool names match OpenCode's tool names.

### If AGENTS.md is not loaded:
Make sure the file path is correct in the `instructions` array of opencode.json.

### If you need to migrate more configurations:
Look for additional `.claude` directories or `settings.json` files in your home directory or other project directories.
