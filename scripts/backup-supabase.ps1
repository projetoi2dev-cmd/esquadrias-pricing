param(
  [string]$DbUrl = $env:SUPABASE_DB_URL,
  [string]$OutDir = 'backups',
  [switch]$IncludeRoles
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $DbUrl) {
  throw 'Defina SUPABASE_DB_URL ou passe -DbUrl com a connection string do Supabase.'
}

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  throw 'Supabase CLI nao encontrado. Instale com: npm install -g supabase'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$target = Join-Path $repoRoot (Join-Path $OutDir "esquadra-$stamp")
New-Item -ItemType Directory -Path $target -Force | Out-Null

$schemaPath = Join-Path $target 'schema.sql'
$dataPath = Join-Path $target 'data.sql'

Write-Host "Gerando schema em $schemaPath"
& supabase db dump --db-url $DbUrl --schema public --file $schemaPath
if ($LASTEXITCODE -ne 0) { throw "Falha ao gerar schema.sql (exit $LASTEXITCODE)" }

Write-Host "Gerando dados em $dataPath"
& supabase db dump --db-url $DbUrl --schema public --data-only --file $dataPath
if ($LASTEXITCODE -ne 0) { throw "Falha ao gerar data.sql (exit $LASTEXITCODE)" }

$files = @($schemaPath, $dataPath)

if ($IncludeRoles) {
  $rolesPath = Join-Path $target 'roles.sql'
  Write-Host "Gerando roles em $rolesPath"
  & supabase db dump --db-url $DbUrl --role-only --file $rolesPath
  if ($LASTEXITCODE -ne 0) { throw "Falha ao gerar roles.sql (exit $LASTEXITCODE)" }
  $files += $rolesPath
}

$commit = $null
try {
  $commit = (& git -C $repoRoot rev-parse HEAD 2>$null).Trim()
} catch {
  $commit = 'desconhecido'
}

$manifest = @(
  "timestamp_utc=$((Get-Date).ToUniversalTime().ToString('o'))",
  "commit=$commit",
  "schema_public=$schemaPath",
  "data_public=$dataPath"
)

if ($IncludeRoles) {
  $manifest += "roles=$($files | Where-Object { $_ -like '*roles.sql' })"
}

foreach ($file in $files) {
  $hash = (Get-FileHash -Algorithm SHA256 -Path $file).Hash
  $size = (Get-Item -LiteralPath $file).Length
  $manifest += "sha256 $([System.IO.Path]::GetFileName($file))=$hash"
  $manifest += "bytes $([System.IO.Path]::GetFileName($file))=$size"
}

$manifestPath = Join-Path $target 'manifest.txt'
$manifest | Set-Content -LiteralPath $manifestPath -Encoding UTF8

Write-Host ''
Write-Host 'Backup concluido.'
Write-Host "Pasta: $target"
Write-Host "Manifesto: $manifestPath"
Write-Host 'Guarde os arquivos fora do repositorio e confira o SHA-256 antes de um restore.'
