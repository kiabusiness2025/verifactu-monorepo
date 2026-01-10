Param(
  [string]$ProjectDir = "C:\dev\verifactu-monorepo\apps\landing",
  [string]$EnvFile    = "C:\dev\verifactu-monorepo\apps\landing\.env.local",
  [string[]]$Targets  = @("preview","production")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (!(Test-Path $ProjectDir)) { throw "No existe ProjectDir: $ProjectDir" }
if (!(Test-Path $EnvFile))    { throw "No existe EnvFile: $EnvFile" }

function Parse-DotEnv([string]$file) {
  $map = @{}
  Get-Content $file | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    if ($line -match "^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$") {
      $k = $Matches[1]
      $v = $Matches[2]

      if ($v.StartsWith('"') -and $v.EndsWith('"') -and $v.Length -ge 2) {
        $v = $v.Substring(1, $v.Length-2)
      }
      if ($v.StartsWith("'") -and $v.EndsWith("'") -and $v.Length -ge 2) {
        $v = $v.Substring(1, $v.Length-2)
      }

      $map[$k] = $v
    }
  }
  return $map
}

function Vercel-EnvUpsert([string]$name, [string]$value, [string]$target) {
  try {
    vercel env rm $name $target --yes | Out-Null
  } catch {}

  $value | vercel env add $name $target | Out-Null
  Write-Host "✅ $target: $name"
}

Push-Location $ProjectDir
try {
  vercel link | Out-Null
} finally {
  Pop-Location
}

$envMap = Parse-DotEnv $EnvFile

$keys = $envMap.Keys | Where-Object {
  $_ -like "STRIPE_*"
} | Sort-Object

if ($keys.Count -eq 0) {
  throw "No se encontraron variables STRIPE_* en $EnvFile"
}

Write-Host "`n📌 Variables a subir desde $EnvFile:"
$keys | ForEach-Object { Write-Host " - $_" }

foreach ($t in $Targets) {
  Write-Host "`n🚀 Subiendo a Vercel target=$t (ProjectDir=$ProjectDir)"
  Push-Location $ProjectDir
  try {
    foreach ($k in $keys) {
      $v = $envMap[$k]
      if ([string]::IsNullOrWhiteSpace($v)) {
        Write-Host "⚠️ Saltando $k (vacío)"
        continue
      }
      Vercel-EnvUpsert $k $v $t
    }
  } finally {
    Pop-Location
  }
}

Write-Host "`n🎉 Hecho. Stripe envs actualizadas en Vercel (preview + production)."
Write-Host "Nota: necesitarás redeploy para que apliquen en builds ya existentes."
