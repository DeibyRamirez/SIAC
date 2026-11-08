# Aplica migraciones Prisma contra Supabase (modo sesión 5432) + verify + seed.
# Uso (PowerShell): cd Backend; .\scripts\supabase-migrate-seed.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$envFile = Join-Path (Get-Location) '.env'
if (-not (Test-Path $envFile)) {
  Write-Error 'Falta Backend/.env (copie .env.example).'
}
$directLine = Get-Content $envFile | Where-Object { $_ -match '^DIRECT_URL=' } | Select-Object -First 1
if (-not $directLine) {
  Write-Error 'Falta DIRECT_URL en .env (pooler Supabase puerto 5432).'
}
$direct = $directLine -replace '^DIRECT_URL="([^"]*)"', '$1'
if ($direct -eq $directLine) {
  Write-Error 'DIRECT_URL debe ir entre comillas dobles en .env'
}
Write-Host '[siac] migrate deploy (DIRECT_URL / sesion 5432)...'
$env:DATABASE_URL = $direct
$env:DIRECT_URL = $direct
pnpm prisma:deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host '[siac] verify...'
pnpm prisma:verify
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host '[siac] seed...'
pnpm prisma:seed
exit $LASTEXITCODE
