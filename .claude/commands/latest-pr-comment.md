Read and display the latest comment from the current branch's pull request.

Usage:
- `/latest-comment` - Fetch and read the most recent PR comment

## Implementation Instructions for Claude Code

When the user runs `/latest-comment`, you should:

1. Use the Bash tool to run: `./scripts/latest-comment.sh`
2. The script will automatically display the comment text cleanly without metadata.
3. After running the script, analyze the content.
4. If the comment contains actionable feedback or suggestions, make a plan to implement them

## Example output:

```
📝 Latest PR Comment:

**Claude finished @beggan78's task** —— [View job](...)

### PR Review: Match Recovery System
[rest of comment content]
```
