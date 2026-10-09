<#
  run-all.ps1 — start every LARE microservice as its own process (no Docker).

  Each service runs `python manage.py serve` on its assigned port using the
  shared venv. Identity/event/DB settings are injected as environment variables
  so every process shares the same JWT + internal secrets and event bus.

  Usage:
    ./run-all.ps1                # init-db (idempotent) + serve all, SQLite, HTTP event bus
    ./run-all.ps1 -SkipInit      # serve without re-running init-db
    ./run-all.ps1 -Only auth,gateway,exam   # subset (deps not auto-resolved)
    ./run-all.ps1 -DatabaseUrl "postgresql+psycopg://..."   # Supabase/Postgres
    ./run-all.ps1 -RedisUrl "redis://localhost:6379/0"      # enable Redis event bus

  Logs: backend/.run/<name>.log   PIDs: backend/.run/pids.json
  Stop: ./stop-all.ps1
#>
param(
  [switch]$SkipInit,
  [string[]]$Only,
  [string]$DatabaseUrl = "",
  [string]$RedisUrl = "",
  [string]$JwtSecret = "change-me-please-set-JWT_SECRET",
  [string]$InternalSecret = "change-me-please-set-INTERNAL_JWT_SECRET"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$py = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $py)) { throw "Shared venv not found at $py" }

$runDir = Join-Path $root ".run"
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

# Load backend/.env (gitignored) into the environment for every child process:
# DATABASE_URL, JWT/INTERNAL secrets, GEMINI/ANTHROPIC keys, REDIS_URL, etc.
# Explicit CLI params below still win over .env.
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  foreach ($l in (Get-Content $envFile)) {
    $t = $l.Trim()
    if ($t -and -not $t.StartsWith("#") -and $t.Contains("=")) {
      $i = $t.IndexOf("="); $k = $t.Substring(0, $i).Trim(); $v = $t.Substring($i + 1).Trim()
      Set-Item "env:$k" $v
    }
  }
  Write-Host "  loaded secrets from .env" -ForegroundColor DarkCyan
}

# Shared environment for every child process. CLI params override .env only when
# the caller passed a non-default value.
if ($JwtSecret -ne "change-me-please-set-JWT_SECRET" -or -not $env:JWT_SECRET) { $env:JWT_SECRET = $JwtSecret }
if ($InternalSecret -ne "change-me-please-set-INTERNAL_JWT_SECRET" -or -not $env:INTERNAL_JWT_SECRET) { $env:INTERNAL_JWT_SECRET = $InternalSecret }
if (-not $env:APP_ENV) { $env:APP_ENV = "development" }
if ($RedisUrl) { $env:REDIS_URL = $RedisUrl }
if ($env:REDIS_URL) { $env:EVENT_BUS_BACKEND = "auto" } elseif (-not $env:EVENT_BUS_BACKEND) { $env:EVENT_BUS_BACKEND = "http" }
# Let -DatabaseUrl fall back to .env's DATABASE_URL when not passed explicitly.
if (-not $DatabaseUrl -and $env:DATABASE_URL) { $DatabaseUrl = $env:DATABASE_URL }

# Parse the registry. Use a foreach statement (not a ForEach-Object pipeline) so
# array appends land in this scope, and split on any whitespace so the format is
# robust to tabs-vs-spaces.
$services = @()
foreach ($raw in (Get-Content (Join-Path $root "services.txt"))) {
  $line = $raw.Trim()
  if ($line -and -not $line.StartsWith("#")) {
    $parts = $line -split "\s+"
    if ($parts.Count -ge 3) {
      $services += [pscustomobject]@{ Name=$parts[0]; Dir=$parts[1]; Port=[int]$parts[2] }
    }
  }
}
# -File binds "a,b,c" as one string; split so both `-Only a,b` and `-Only a`
# (and inline array invocation) all work.
if ($Only) {
  $onlySet = @($Only | ForEach-Object { $_ -split "," }) | ForEach-Object { $_.Trim() }
  $services = $services | Where-Object { $onlySet -contains $_.Name }
}

$launchPlan = @()
foreach ($svc in $services) {
  $svcDir = Join-Path $root "services\$($svc.Dir)"
  if (-not (Test-Path (Join-Path $svcDir "manage.py"))) {
    Write-Host "  skip $($svc.Name) (not built yet)" -ForegroundColor DarkYellow
    continue
  }

  # Prefer the service's own venv when present (auth needs email-validator,
  # gateway needs requests); otherwise use the shared venv.
  $svcVenv = Join-Path $svcDir "venv\Scripts\python.exe"
  $py = if (Test-Path $svcVenv) { $svcVenv } else { Join-Path $root ".venv\Scripts\python.exe" }

  # Per-process DB url (each service its own SQLite file, or shared Postgres).
  # Avoid Supabase-reserved schema names (auth/storage/realtime/...).
  if ($DatabaseUrl) {
    $sch = $svc.Name.Replace("-", "_")
    if (@("auth","storage","realtime","graphql","vault","cron","net","extensions") -contains $sch) { $sch = "lare_$sch" }
    $env:DATABASE_URL = $DatabaseUrl; $env:DB_SCHEMA = $sch
  }
  else { $env:DATABASE_URL = "sqlite:///$($svc.Dir).sqlite3"; $env:DB_SCHEMA = "" }
  $env:PORT = "$($svc.Port)"
  $env:SERVICE_NAME = $svc.Name

  $log = Join-Path $runDir "$($svc.Name).log"
  $launchPlan += [pscustomobject]@{ Service=$svc; Dir=$svcDir; Python=$py; Log=$log }
}

# Initialize every requested service before starting any servers. If a schema
# setup fails, this avoids leaving a partially running backend behind.
if (-not $SkipInit) {
  $oldNativePreference = $null
  $hasNativePreference = Test-Path Variable:PSNativeCommandUseErrorActionPreference
  if ($hasNativePreference) {
    $oldNativePreference = $PSNativeCommandUseErrorActionPreference
    $PSNativeCommandUseErrorActionPreference = $false
  }
  try {
    foreach ($item in $launchPlan) {
      $svc = $item.Service
      if ($DatabaseUrl) {
        $sch = $svc.Name.Replace("-", "_")
        if (@("auth","storage","realtime","graphql","vault","cron","net","extensions") -contains $sch) { $sch = "lare_$sch" }
        $env:DATABASE_URL = $DatabaseUrl; $env:DB_SCHEMA = $sch
      }
      else { $env:DATABASE_URL = "sqlite:///$($svc.Dir).sqlite3"; $env:DB_SCHEMA = "" }
      $env:PORT = "$($svc.Port)"
      $env:SERVICE_NAME = $svc.Name

      # The gateway is stateless and its CLI intentionally has no init-db command.
      if ($svc.Name -eq "gateway") { continue }

      # Start Python with file redirection instead of invoking it through the
      # PowerShell pipeline. In Windows PowerShell, native stderr plus
      # $ErrorActionPreference = Stop can abort here before we report the
      # service name and the captured traceback.
      $initStdout = Join-Path $runDir "$($svc.Name).init.stdout.log"
      $initStderr = Join-Path $runDir "$($svc.Name).init.stderr.log"
      $manageArg = '"' + (Join-Path $item.Dir "manage.py") + '"'
      $initProc = Start-Process -FilePath $item.Python `
        -ArgumentList @($manageArg, "init-db") `
        -WorkingDirectory $item.Dir -PassThru -Wait -NoNewWindow `
        -RedirectStandardOutput $initStdout -RedirectStandardError $initStderr
      $initExitCode = $initProc.ExitCode
      if ($initExitCode -ne 0) {
        $initOutput = @()
        if (Test-Path $initStdout) { $initOutput += Get-Content $initStdout }
        if (Test-Path $initStderr) { $initOutput += Get-Content $initStderr }
        $safeOutput = ($initOutput | ForEach-Object {
          if ($DatabaseUrl) { "$($_)" -replace [regex]::Escape($DatabaseUrl), "<DATABASE_URL_REDACTED>" }
          else { "$($_)" }
        } | Select-Object -Last 20) -join "`n"
        throw "init-db failed for '$($svc.Name)' (exit $initExitCode).`n$safeOutput"
      }
    }
  }
  finally {
    if ($hasNativePreference) { $PSNativeCommandUseErrorActionPreference = $oldNativePreference }
  }
}

$pids = @{}
foreach ($item in $launchPlan) {
  $svc = $item.Service
  $svcDir = $item.Dir
  $py = $item.Python
  $log = $item.Log
  if ($DatabaseUrl) {
    $sch = $svc.Name.Replace("-", "_")
    if (@("auth","storage","realtime","graphql","vault","cron","net","extensions") -contains $sch) { $sch = "lare_$sch" }
    $env:DATABASE_URL = $DatabaseUrl; $env:DB_SCHEMA = $sch
  }
  else { $env:DATABASE_URL = "sqlite:///$($svc.Dir).sqlite3"; $env:DB_SCHEMA = "" }
  $env:PORT = "$($svc.Port)"
  $env:SERVICE_NAME = $svc.Name
  if ($svc.Name -eq "coding" -and $env:APP_ENV -eq "production" -and $env:EXEC_MODE -eq "subprocess") {
    # Never permit unsandboxed execution in production. On local Windows, where
    # nsjail/bubblewrap are unavailable, keep the API available with execution
    # disabled rather than weakening the executor's production guard.
    $env:EXEC_ENABLED = "false"
    Write-Warning "coding: code execution disabled (production requires a sandbox; this host is configured for subprocess mode)."
  }

  try {
  # Quote the manage.py path — it can contain spaces (e.g. "C:\Users\S Sameer\...").
  $manageArg = '"' + (Join-Path $svcDir "manage.py") + '"'
  $proc = Start-Process -FilePath $py `
    -ArgumentList @($manageArg, "serve") `
    -WorkingDirectory $svcDir -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $log -RedirectStandardError "$log.err"
  $pids[$svc.Name] = $proc.Id
  $pids | ConvertTo-Json | Out-File (Join-Path $runDir "pids.json") -Encoding utf8
  Write-Host ("  started {0,-16} :{1}  pid {2}" -f $svc.Name, $svc.Port, $proc.Id) -ForegroundColor Green
  }
  catch {
    foreach ($startedPid in $pids.Values) {
      Stop-Process -Id $startedPid -Force -ErrorAction SilentlyContinue
    }
    throw
  }
}

$pids | ConvertTo-Json | Out-File (Join-Path $runDir "pids.json") -Encoding utf8
Write-Host "`nAll requested services launched. Gateway: http://127.0.0.1:8000/health" -ForegroundColor Cyan
Write-Host "Logs in backend/.run/*.log   Stop with ./stop-all.ps1"

