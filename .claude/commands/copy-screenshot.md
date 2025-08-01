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

The script looks for common screenshot patterns like:
- Screenshot*.png/jpg
- CleanShot*.png/jpg  
- Screen Shot*.png/jpg

If no screenshots are found with those patterns, it will find the most recent image file (.png, .jpg, .jpeg) on Desktop.

Examples:
- `/copy-screenshot` → Copy Screenshot 2025-01-10 at 2.30.45 PM.png as-is
- `/copy-screenshot error_demo` → Copy and rename to error_demo.png
- `/copy-screenshot bug_report.png` → Copy and rename to bug_report.png

## Important
ALWAYS use `./scripts/copy-screenshot.sh` - do NOT manually copy files with `cp` commands.