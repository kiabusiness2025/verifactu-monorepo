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

      # quitar comillas externas si existen
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

function Upsert-DotEnvKey([string]$file, [string]$key, [string]$value) {
  if (!(Test-Path $file)) { New-Item -ItemType File -Force -Path $file | Out-Null }
  $content = Get-Content $file -Raw
  $pattern = "(?m)^\s*{0}\s*=.*$" -f [regex]::Escape($key)

  # si hay comillas, mantenemos el valor tal cual lo pasamos
  if ($content -match $pattern) {
    $content = [regex]::Replace($content, $pattern, "$key=$value")
  } else {
    if ($content.Length -gt 0 -and !$content.EndsWith("`n")) { $content += "`n" }
    $content += "$key=$value`n"
  }
  Set-Content -Encoding UTF8 -Path $file -Value $content
}

function Vercel-EnvUpsert([string]$name, [string]$value, [string]$target) {
  try { vercel env rm $name $target --yes | Out-Null } catch {}
  $value | vercel env add $name $target | Out-Null
  Write-Host ("OK {0}: {1}" -f $target, $name)
}

# 1) Entrar al proyecto y linkear
Push-Location $ProjectDir
try { vercel link | Out-Null } finally { Pop-Location }

# 2) Parse env local
$envMap = Parse-DotEnv $EnvFile

# 3) Build de la whitelist (Stripe + sesión + url)
$keys = @()

# STRIPE_*
$keys += ($envMap.Keys | Where-Object { $_ -like "STRIPE_*" })

# Obligatorias extra (si existen)
foreach ($k in @("SESSION_SECRET","NEXT_PUBLIC_APP_URL")) {
  if ($envMap.ContainsKey($k)) { $keys += $k }
}

# Webhook secret: si no existe, pedirlo (opcional)
if (-not $envMap.ContainsKey("STRIPE_WEBHOOK_SECRET")) {
  Write-Host ("\nINFO: STRIPE_WEBHOOK_SECRET no está en {0}" -f $EnvFile)
  $wh = Read-Host "Pega STRIPE_WEBHOOK_SECRET (whsec_...) o ENTER para saltar"
  if ($wh -and $wh.Trim().Length -gt 0) {
    $whVal = $wh.Trim()
    $envMap["STRIPE_WEBHOOK_SECRET"] = $whVal
    $keys += "STRIPE_WEBHOOK_SECRET"

    # Guardar también en .env.local (persistente)
    Upsert-DotEnvKey $EnvFile "STRIPE_WEBHOOK_SECRET" $whVal
    Write-Host ("OK Guardado STRIPE_WEBHOOK_SECRET en {0}" -f $EnvFile)
  }
} else {
  $keys += "STRIPE_WEBHOOK_SECRET"
}

# Quitar duplicados y ordenar
$keys = $keys | Where-Object { $_ } | Select-Object -Unique | Sort-Object

if ($keys.Count -eq 0) {
  throw "No se encontraron variables para subir. ¿Seguro que hay STRIPE_* en $EnvFile?"
}

Write-Host ("\nVariables a subir desde {0}:" -f $EnvFile)
$keys | ForEach-Object { Write-Host " - $_" }

# 4) Upsert por target
foreach ($t in $Targets) {
  Write-Host ("\nSubiendo a Vercel target={0} (ProjectDir={1})" -f $t, $ProjectDir)
  Push-Location $ProjectDir
  try {
    foreach ($k in $keys) {
      if (-not $envMap.ContainsKey($k)) {
        Write-Host "⚠️ Saltando $k (no está en envMap)"
        continue
      }
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

Write-Host "\nHecho. Env vars (Stripe + sesión + URL) actualizadas en Vercel (preview + production)."
Write-Host "Sugerencia: haz redeploy para que apliquen."
