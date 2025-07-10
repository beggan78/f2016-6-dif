Copy the most recent screenshot from ~/Desktop/ to the screenshots/ folder.

Usage:
- `/copy-screenshot` - Copy with original filename
- `/copy-screenshot filename.png` - Copy and rename to specified filename

This command will:
1. Find the most recent screenshot file on your Desktop
2. Copy it to the project's screenshots/ folder
3. Optionally rename it if you provide a filename argument
4. Show you the path to reference in Claude Code

The script looks for common screenshot patterns like:
- Screenshot*.png/jpg
- CleanShot*.png/jpg  
- Screen Shot*.png/jpg

If no screenshots are found with those patterns, it will find the most recent image file (.png, .jpg, .jpeg) on Desktop.

Examples:
- `/copy-screenshot` ’ Copy Screenshot 2025-01-10 at 2.30.45 PM.png as-is
- `/copy-screenshot error_demo` ’ Copy and rename to error_demo.png
- `/copy-screenshot bug_report.png` ’ Copy and rename to bug_report.png