$ErrorActionPreference = "Stop"

Write-Host "Running pre-deploy checks..." -ForegroundColor Cyan

Write-Host "1) Lint" -ForegroundColor Yellow
npm run lint

Write-Host "2) Unit/Integration tests" -ForegroundColor Yellow
npm run test

Write-Host "3) Build" -ForegroundColor Yellow
npm run build

Write-Host "Pre-deploy checks completed successfully." -ForegroundColor Green
