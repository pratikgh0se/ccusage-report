#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_TARGET="/opt/homebrew/bin/ccusage-report"

echo "==> Installing ccusage-report from $REPO_DIR"

# Install ccusage globally if not present
if ! command -v ccusage &>/dev/null; then
  echo "==> ccusage not found. Installing via npm..."
  npm install -g ccusage
else
  echo "==> ccusage already installed ($(ccusage --version 2>/dev/null || echo 'unknown version'))"
fi

# Write the launcher script
cat > "$BIN_TARGET" <<EOF
#!/bin/bash
set -e
node "$REPO_DIR/generate.js"
open "$REPO_DIR/index.html"
EOF

chmod +x "$BIN_TARGET"

echo "==> Done. Run: ccusage-report"
