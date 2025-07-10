# Screenshot Copy Command

## Quick Usage

### In Claude Code:
1. Type `/copy-screenshot` to see the command documentation
2. Use the following to actually copy screenshots:

```bash
# Copy with original filename
./scripts/copy-screenshot.sh

# Copy and rename
./scripts/copy-screenshot.sh my_error.png
```

## What it does:

✅ **Finds** the most recent screenshot from `~/Desktop/`  
✅ **Copies** it to `screenshots/` folder in project root  
✅ **Renames** it optionally if you provide a filename  
✅ **Shows** the path to reference in Claude Code  

## Examples:

```bash
# Copy the latest screenshot with its original name
./scripts/copy-screenshot.sh

# Copy and rename to 'bug_report.png'
./scripts/copy-screenshot.sh bug_report

# Copy and rename to 'error_shot.png'  
./scripts/copy-screenshot.sh error_shot.png
```

## Screenshot Patterns Detected:
- `Screenshot*.png/jpg` (macOS default)
- `CleanShot*.png/jpg` (CleanShot X)
- `Screen Shot*.png/jpg` (macOS alternative)
- Any recent `.png/.jpg/.jpeg` files as fallback

## Then in Claude Code:
```
Please view the screenshot in screenshots/bug_report.png
```

The script automatically adds `.png` extension if you don't provide one.