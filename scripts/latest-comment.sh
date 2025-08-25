#!/bin/bash

# Simple script to get just the latest PR comment content

# Check if there's a PR for the current branch
if ! gh pr view > /dev/null 2>&1; then
    echo "No pull request found for current branch"
    exit 1
fi

echo "📝 Latest PR Comment:"
echo

# Extract just the last comment content
gh pr view --comments | awk '
BEGIN { 
    capturing = 0
    current_comment = ""
    latest_comment = ""
}
/^author:/ {
    if (current_comment != "") {
        latest_comment = current_comment
    }
    current_comment = ""
    capturing = 0
}
/^--$/ { capturing = 1; next }
capturing == 1 { 
    if (current_comment == "") {
        current_comment = $0
    } else {
        current_comment = current_comment "\n" $0
    }
}
END { 
    if (current_comment != "") {
        latest_comment = current_comment
    }
    if (latest_comment != "") {
        print latest_comment
    } else {
        print "No comments found"
    }
}'