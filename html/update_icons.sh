#!/usr/bin/env bash
# Update PWA icons from source icon
set -e

SOURCE_ICON="/Users/takaho/Documents/Kaname/JSEC2026/boricalc_icon.png"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$SOURCE_ICON" ]; then
    echo "Copying icon from $SOURCE_ICON ..."
    cp "$SOURCE_ICON" "$SCRIPT_DIR/boricalc_icon.png"
elif [ -f "$SCRIPT_DIR/boricalc_icon.png" ]; then
    echo "Using existing $SCRIPT_DIR/boricalc_icon.png"
else
    echo "Error: Source icon not found at $SOURCE_ICON"
    exit 1
fi

echo "Generating all PWA icons..."
python3 "$PROJECT_ROOT/scripts/generate_pwa_icons.py" "$SCRIPT_DIR/boricalc_icon.png"
echo "Done! All PWA icons in $SCRIPT_DIR have been refreshed."
