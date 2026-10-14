param(
  [switch]$Build,
  [switch]$AllowDirty
)

$ErrorActionPreference = "Stop"
$AppDir = Split-Path -Parent $PSScriptRoot
$TempExport = Join-Path $env:TEMP ("cuadre-android-check-" + [guid]::NewGuid())
$Node = Get-Command "node.exe" -ErrorAction SilentlyContinue
$Npx = Get-Command "npx.cmd" -ErrorAction SilentlyContinue
$Pnpm = Get-Command "pnpm.cmd" -ErrorAction SilentlyContinue

if (-not $Node) {
  $Node = Get-ChildItem `
    (Join-Path $HOME ".cache\codex-runtimes\*\dependencies\node\bin\node.exe") `
    -ErrorAction SilentlyContinue |
    Select-Object -First 1
}

if (-not $Pnpm) {
  $Pnpm = Get-ChildItem `
    (Join-Path $HOME ".cache\codex-runtimes\*\dependencies\bin\pnpm.cmd") `
    -ErrorAction SilentlyContinue |
    Select-Object -First 1
}

if (-not $Node) {
  throw "Falta Node.js. Instala Node.js LTS antes de preparar el release."
}

# Get-Command devuelve CommandInfo (.Source); Get-ChildItem devuelve FileInfo (.FullName).
function Resolve-ExePath($item) {
  if (-not $item) { return $null }
  if ($item.Source) { return [string]$item.Source }
  if ($item.Path) { return [string]$item.Path }
  return [string]$item.FullName
}

$NodePath = Resolve-ExePath $Node
$NpxPath = Resolve-ExePath $Npx
$PnpmPath = Resolve-ExePath $Pnpm

function Invoke-Checked {
  param([string]$Command, [string[]]$Arguments)
  Write-Host "> $Command $($Arguments -join ' ')" -ForegroundColor Cyan
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Falló: $Command $($Arguments -join ' ')"
  }
}

Push-Location $AppDir
try {
  if (-not (Test-Path "google-services.json")) {
    throw "Falta google-services.json."
  }

  $easConfig = Get-Content "eas.json" -Raw | ConvertFrom-Json
  if ($easConfig.build.production.android.buildType -ne "app-bundle") {
    throw "El perfil production debe generar android.buildType=app-bundle."
  }

  $apiUrl = $easConfig.build.production.env.EXPO_PUBLIC_API_URL
  if (-not $apiUrl -or -not $apiUrl.StartsWith("https://")) {
    throw "EXPO_PUBLIC_API_URL de production no es una URL HTTPS válida."
  }

  $dirty = & git -c "safe.directory=$($AppDir -replace '\\','/')" status --porcelain
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo consultar el estado de Git."
  }
  if ($dirty -and -not $AllowDirty) {
    throw "Hay cambios sin commit. Haz commit o usa -AllowDirty conscientemente."
  }

  Invoke-Checked -Command $NodePath -Arguments @(
    (Join-Path $AppDir "node_modules\typescript\bin\tsc"),
    "--noEmit"
  )
  $env:EXPO_PUBLIC_API_URL = $apiUrl
  Invoke-Checked -Command $NodePath -Arguments @(
    (Join-Path $AppDir "node_modules\expo\bin\cli"),
    "export",
    "--platform", "android",
    "--output-dir", $TempExport,
    "--clear"
  )

  Write-Host ""
  Write-Host "Preflight Android correcto." -ForegroundColor Green
  Write-Host "Perfil: production | Formato: AAB | API: $apiUrl"

  if (-not $Build) {
    Write-Host "No se inició ningún build. Usa -Build cuando quieras generar el AAB."
    exit 0
  }

  $confirmation = Read-Host "Escribe BUILD para iniciar el build remoto de EAS"
  if ($confirmation -cne "BUILD") {
    throw "Build cancelado."
  }

  if ($NpxPath) {
    Invoke-Checked -Command $NpxPath -Arguments @(
      "eas-cli@latest", "build",
      "--platform", "android",
      "--profile", "production"
    )
  }
  elseif ($PnpmPath) {
    Invoke-Checked -Command $PnpmPath -Arguments @(
      "dlx", "eas-cli@latest", "build",
      "--platform", "android",
      "--profile", "production"
    )
  }
  else {
    throw "Para iniciar EAS instala Node.js LTS con npx o pnpm."
  }

  Write-Host "EAS mostrará la URL del AAB terminado. La subida a Play Console queda manual." -ForegroundColor Green
}
finally {
  Pop-Location
  if (Test-Path -LiteralPath $TempExport) {
    Remove-Item -LiteralPath $TempExport -Recurse -Force
  }
}
