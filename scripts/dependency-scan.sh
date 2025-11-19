#!/usr/bin/env bash
set -euo pipefail

# Simple helper to run dependency scans and save outputs under docs/internal-reviews/reports/
mkdir -p docs/internal-reviews/reports

echo "Running npm audit..."
npm audit --json > docs/internal-reviews/reports/dependency-license-report.raw-audit.json || true
echo "Saved audit to docs/internal-reviews/reports/dependency-license-report.raw-audit.json"

echo "Running npm outdated..."
npm outdated --json > docs/internal-reviews/reports/dependency-license-report.raw-outdated.json || true
echo "Saved outdated to docs/internal-reviews/reports/dependency-license-report.raw-outdated.json"

echo "Attempting license scan with license-checker (if available)..."
if command -v npx >/dev/null 2>&1; then
  npx license-checker --json > docs/internal-reviews/reports/dependency-license-report.raw-licenses.json || echo "license-checker failed or not available"
  echo "Saved license info to docs/internal-reviews/reports/dependency-license-report.raw-licenses.json"
else
  echo "npx not available; skipping license scan"
fi

echo "Done"

