#!/bin/bash
# Frontend production build — run from React project root
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=========================================="
echo " Parrot Academy Frontend — production build"
echo "=========================================="

if [ ! -f package.json ]; then
  echo "ERROR: package.json not found."
  exit 1
fi

echo "==> npm install"
npm ci

echo "==> Production build (uses .env.production)"
npm run build

if [ ! -f dist/.htaccess ]; then
  echo "ERROR: dist/.htaccess missing — copying from public/"
  cp public/.htaccess dist/.htaccess
fi

if [ ! -f dist/version.json ]; then
  echo "ERROR: dist/version.json missing — run npm run build again."
  exit 1
fi

echo ""
echo "Upload the contents of: $ROOT/dist/"
echo "to your hosting public folder (e.g. xanderglobalacademy.com)."
echo ""
echo "Required files in upload: index.html, version.json, .htaccess"
echo "After upload: users auto-refresh on next visit (no Ctrl+F5 needed)."
