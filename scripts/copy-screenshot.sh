#!/bin/bash

# Copy Screenshot Script for Claude Code
# Usage: ./scripts/copy-screenshot.sh [optional_filename]
# Examples:
#   ./scripts/copy-screenshot.sh                    # Copy with original name
#   ./scripts/copy-screenshot.sh error_shot.png    # Copy and rename

DESKTOP_DIR="$HOME/Desktop"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCREENSHOTS_DIR="$PROJECT_ROOT/screenshots"

# Create screenshots directory if it doesn't exist
mkdir -p "$SCREENSHOTS_DIR"

# Find the most recent screenshot file on Desktop
# Look for common screenshot file patterns
RECENT_SCREENSHOT=$(find "$DESKTOP_DIR" -maxdepth 1 \
  \( -name "Screenshot*.png" -o \
     -name "Screenshot*.jpg" -o \
     -name "CleanShot*.png" -o \
     -name "CleanShot*.jpg" -o \
     -name "Screen Shot*.png" -o \
     -name "Screen Shot*.jpg" -o \
     -name "screen_capture*.png" -o \
     -name "screen_capture*.jpg" \) \
  -type f -print0 2>/dev/null | \
  xargs -0 ls -t 2>/dev/null | \
  head -n 1)

# If no screenshot found with common patterns, look for any recent image
if [ -z "$RECENT_SCREENSHOT" ]; then
  RECENT_SCREENSHOT=$(find "$DESKTOP_DIR" -maxdepth 1 \
    \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) \
    -type f -print0 2>/dev/null | \
    xargs -0 ls -t 2>/dev/null | \
    head -n 1)
fi

if [ -z "$RECENT_SCREENSHOT" ]; then
  echo "❌ No screenshot files found on Desktop"
  exit 1
fi

# Determine destination filename
if [ -n "$1" ]; then
  DEST_FILENAME="$1"
  # Add .png extension if no extension provided
  if [[ "$DEST_FILENAME" != *.* ]]; then
    DEST_FILENAME="$DEST_FILENAME.png"
  fi
else
  DEST_FILENAME=$(basename "$RECENT_SCREENSHOT")
fi

DEST_PATH="$SCREENSHOTS_DIR/$DEST_FILENAME"

# Copy the file
if cp "$RECENT_SCREENSHOT" "$DEST_PATH"; then
  echo "✅ Successfully copied screenshot:"
  echo "   From: $(basename "$RECENT_SCREENSHOT")"
  echo "   To:   screenshots/$DEST_FILENAME"
  echo ""
  echo "💡 You can now reference it in Claude Code as:"
  echo "   screenshots/$DEST_FILENAME"
else
  echo "❌ Failed to copy screenshot"
  exit 1
fi