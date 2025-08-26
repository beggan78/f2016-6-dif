Copy the most recent screenshot from ~/Desktop/ to the screenshots/ folder using the project's copy-screenshot script.

Usage:
- `/copy-screenshot` - Copy with original filename
- `/copy-screenshot filename.png` - Copy and rename to specified filename

## Implementation Instructions for Claude Code

When the user runs `/copy-screenshot [optional-filename]`, you should:

1. Use the Bash tool to run: `./scripts/copy-screenshot.sh [optional-filename]`
2. The script will automatically:
   - Find the most recent screenshot file on Desktop
   - Copy it to the project's screenshots/ folder
   - Optionally rename it if you provide a filename argument
   - Show you the path to reference in Claude Code

IMPORTANT: ALWAYS use `./scripts/copy-screenshot.sh` - do NOT manually copy files with `cp` commands.