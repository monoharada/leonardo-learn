#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# leonardo-learn Full-screen Screenshot Capture (Playwright)
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

BASE_URL="http://localhost:3000"
OUTPUT_DIR=".context/screenshots"

echo "🎨 leonardo-learn Full-screen Screenshot Capture (Playwright)"
echo "=============================================================="
echo ""

# ============================================================================
# 1. Prerequisites
# ============================================================================

echo "📋 Checking prerequisites..."

# Check if bun is available
if ! command -v bun &> /dev/null; then
    echo "❌ bun is not installed"
    exit 1
fi

# Check if build is up to date
if [ ! -f dist/index.js ] || [ src/index.ts -nt dist/index.js ]; then
    echo "🔨 Building application..."
    bun run build
else
    echo "✅ Build is up to date"
fi

# Install Chromium if needed
echo "📦 Checking Chromium..."
if ! npx playwright install --dry-run chromium &> /dev/null; then
    echo "�� Installing Chromium..."
    npx playwright install chromium
else
    echo "✅ Chromium is installed"
fi

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

echo ""

# ============================================================================
# 2. Start Development Server
# ============================================================================

echo "🚀 Starting development server..."

# Kill existing server on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start server in background
npx serve . -l 3000 > /tmp/leonardo-serve.log 2>&1 &
SERVER_PID=$!

# Cleanup on exit
cleanup() {
    if [ -n "${SERVER_PID:-}" ]; then
        echo ""
        echo "🧹 Stopping server..."
        kill $SERVER_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Server ready on http://localhost:3000"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Server failed to start within 30 seconds"
        echo ""
        echo "Server logs:"
        cat /tmp/leonardo-serve.log
        exit 1
    fi
    sleep 1
done

echo ""

# ============================================================================
# 3. Capture Screenshots (Playwright)
# ============================================================================

echo "📸 Capturing screenshots with Playwright..."
echo ""

# Run TypeScript capture script
if bun run "$SCRIPT_DIR/capture-screenshots.ts"; then
    echo ""
    echo "✅ All screenshots captured successfully!"
else
    echo ""
    echo "❌ Screenshot capture failed"
    exit 1
fi

echo ""

# ============================================================================
# 4. Quality Validation
# ============================================================================

echo "🔍 Performing quality checks..."
echo ""

SCREENSHOTS=(
    "00-studio-view.png"
    "01-manual-view.png"
    "02-cvd-protanopia.png"
    "03-a11y-drawer.png"
    "04-swatch-popover.png"
    "05-export-dialog.png"
    "10-pastel-hero.png"
    "11-pastel-branding.png"
    "12-vibrant-hero.png"
    "13-vibrant-branding.png"
    "14-dark-hero.png"
    "15-dark-branding.png"
    "16-highcontrast-hero.png"
    "17-default-pinpoint.png"
    "18-default-branding.png"
)

ALL_VALID=true

for screenshot in "${SCREENSHOTS[@]}"; do
    filepath="$OUTPUT_DIR/$screenshot"

    if [ ! -f "$filepath" ]; then
        echo "❌ Missing: $screenshot"
        ALL_VALID=false
        continue
    fi

    # Check file size (macOS/Linux compatible)
    if [ "$(uname)" == "Darwin" ]; then
        filesize=$(stat -f%z "$filepath")
    else
        filesize=$(stat -c%s "$filepath")
    fi

    if [ "$filesize" -eq 0 ]; then
        echo "❌ Empty file: $screenshot"
        ALL_VALID=false
        continue
    fi

    # Check dimensions if ImageMagick is available
    if command -v identify &> /dev/null; then
        dimensions=$(identify -format "%wx%h" "$filepath" 2>/dev/null || echo "unknown")
        height=$(echo "$dimensions" | cut -d'x' -f2)

        # Flag files that are exactly 720px (likely viewport-only captures)
        if [ "$height" == "720" ] && [[ "$screenshot" == *"view"* ]]; then
            echo "⚠️  Potential issue (720px height): $screenshot - $dimensions"
            echo "   (Expected full-page capture to be taller for scrollable views)"
        else
            echo "✅ $screenshot - $dimensions"
        fi
    else
        echo "✅ $screenshot - $filesize bytes"
    fi
done

echo ""

if [ "$ALL_VALID" = false ]; then
    echo "⚠️  Some quality checks failed. Review output above."
    exit 1
fi

echo "✅ All quality checks passed!"
echo ""

# ============================================================================
# 5. Summary
# ============================================================================

echo "📊 Summary:"
echo "==========="
echo "Output directory: $OUTPUT_DIR/"
echo ""
echo "To view screenshots:"
echo "  open $OUTPUT_DIR/"
echo ""
echo "To verify full-page captures:"
echo "  identify $OUTPUT_DIR/*.png | grep -v '1280x720'"
echo ""
echo "✨ Done!"
