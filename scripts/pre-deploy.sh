#!/usr/bin/env bash
set -euo pipefail

echo "Running pre-deploy checks..."

echo "1) Lint"
npm run lint

echo "2) Unit/Integration tests"
npm run test

echo "3) Build"
npm run build

echo "Pre-deploy checks completed successfully."
