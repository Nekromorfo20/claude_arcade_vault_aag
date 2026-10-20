#!/usr/bin/env bash
# PostToolUse hook: runs Prettier (and ESLint for JS/TS) on files Claude Code
# just wrote/edited, scoped to this project only. Never blocks the tool call.

set -u

INPUT="$(cat)"

FILE_PATH="$(echo "$INPUT" | node -e '
  let data = "";
  process.stdin.on("data", c => data += c);
  process.stdin.on("end", () => {
    try {
      const json = JSON.parse(data);
      process.stdout.write(json.tool_input && json.tool_input.file_path ? json.tool_input.file_path : "");
    } catch {
      process.stdout.write("");
    }
  });
' <<< "$INPUT")"

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

case "$FILE_PATH" in
  "$PROJECT_DIR"/*) ;;
  *) exit 0 ;;
esac

REL_PATH="${FILE_PATH#"$PROJECT_DIR"/}"

case "$REL_PATH" in
  references/templates/*|node_modules/*|.next/*|out/*|build/*)
    exit 0
    ;;
esac

if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

EXT="${FILE_PATH##*.}"

cd "$PROJECT_DIR" || exit 0

case "$EXT" in
  md|mjs|js|jsx|ts|tsx|json|css)
    npx --no-install prettier --write "$FILE_PATH" 2>&1
    ;;
esac

case "$EXT" in
  js|jsx|ts|tsx)
    npx --no-install eslint --fix "$FILE_PATH" 2>&1

    # Strip all blank lines so the code stays dense/concise, then
    # re-run Prettier so the result is still syntactically clean.
    sed -i.bak '/^[[:space:]]*$/d' "$FILE_PATH" && rm -f "$FILE_PATH.bak"
    npx --no-install prettier --write "$FILE_PATH" 2>&1
    ;;
esac

exit 0
