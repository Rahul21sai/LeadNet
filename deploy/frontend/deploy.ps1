param(
    [ValidatePattern('^[a-z][a-z0-9-]{4,28}[a-z0-9]$')][string]$ProjectId = 'leadnet-blr',
    [ValidatePattern('^[a-z]+-[a-z]+[0-9]+$')][string]$Region = 'asia-south1',
    [ValidatePattern('^[a-z][a-z0-9-]{0,47}[a-z0-9]$')][string]$ServiceName = 'namma-civic-web',
    [switch]$UsePrepared
)

$ErrorActionPreference = 'Stop'
$repo = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$cloudCli = Join-Path $env:LOCALAPPDATA 'Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'
if (!(Test-Path -LiteralPath $cloudCli)) { throw 'Google Cloud CLI is not installed in its expected location.' }

function Invoke-Cloud {
    & $cloudCli @args
    if ($LASTEXITCODE -ne 0) { throw "Google Cloud command failed: $($args[0]) $($args[1])" }
}

$activeAccount = Invoke-Cloud auth list --filter='status:ACTIVE' --format='value(account)'
if (!$activeAccount) { throw "Sign in first: & '$cloudCli' auth login" }
Invoke-Cloud projects describe $ProjectId --format='value(projectId)' | Out-Null
$billingEnabled = Invoke-Cloud billing projects describe $ProjectId --format='value(billingEnabled)'
if ($billingEnabled -notmatch '^true$') { throw "Billing is not enabled on $ProjectId. Link your intended billing account in Google Cloud Console before deploying." }

if (!$UsePrepared) {
    node (Join-Path $PSScriptRoot 'prepare.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Frontend preparation failed.' }
}
$prepared = Get-Content -LiteralPath (Join-Path $repo 'tmp\cloudrun-frontend\latest.json') -Raw -Encoding utf8 | ConvertFrom-Json
$source = [System.IO.Path]::GetFullPath($prepared.sourceDirectory)
$stagingRoot = [System.IO.Path]::GetFullPath((Join-Path $repo 'tmp\cloudrun-frontend'))
if (!$source.StartsWith($stagingRoot + '\', [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Prepared source is outside the isolated frontend staging directory.' }
foreach ($file in @('Dockerfile', 'server.mjs')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination (Join-Path $source $file)
}
if (!(Test-Path -LiteralPath (Join-Path $source 'public\index.html'))) { throw 'Prepared frontend index is missing.' }
$unexpected = Get-ChildItem -LiteralPath $source -Force | Where-Object { $_.Name -notin @('Dockerfile', 'server.mjs', 'public', '.gcloudignore') }
if ($unexpected) { throw 'Unexpected content in isolated frontend build context.' }

Invoke-Cloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com iam.googleapis.com "--project=$ProjectId" --quiet
$existingJson = & $cloudCli run services describe $ServiceName "--project=$ProjectId" "--region=$Region" --format=json 2>$null
if ($LASTEXITCODE -eq 0) {
    $existing = ($existingJson -join "`n") | ConvertFrom-Json
    if ($existing.metadata.labels.component -ne 'frontend' -or $existing.metadata.labels.app -ne 'namma-civic') {
        throw 'An existing service with this name is not labelled as this frontend; refusing to replace it.'
    }
}
$runtimeAccount = "$ServiceName@$ProjectId.iam.gserviceaccount.com"
& $cloudCli iam service-accounts describe $runtimeAccount "--project=$ProjectId" --format='value(email)' 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Invoke-Cloud iam service-accounts create $ServiceName "--project=$ProjectId" --display-name='Namma Civic static frontend' --quiet
}

Invoke-Cloud run deploy $ServiceName "--source=$source" "--project=$ProjectId" "--region=$Region" `
    "--service-account=$runtimeAccount" --port=8080 --cpu=1 --memory=256Mi --concurrency=80 `
    --min-instances=0 --max-instances=1 --timeout=60 --cpu-throttling --no-cpu-boost `
    --no-invoker-iam-check --ingress=all '--labels=app=namma-civic,component=frontend,mode=device-demo' --quiet

$url = Invoke-Cloud run services describe $ServiceName "--project=$ProjectId" "--region=$Region" --format='value(status.url)'
$health = Invoke-RestMethod -Uri ($url.TrimEnd('/') + '/healthz') -TimeoutSec 60
if ($health.status -ne 'ok' -or $health.mode -ne 'device-demo') { throw 'Deployment did not return the frontend-only health response.' }
$record = [PSCustomObject]@{
    project = $ProjectId; region = $Region; service = $ServiceName; url = $url
    mode = 'device-demo'; minInstances = 0; maxInstances = 1; memory = '256Mi'; cpu = 1
    deployedAt = [DateTime]::UtcNow.ToString('o')
}
$record | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $repo 'tmp\cloudrun-frontend\deployment.json') -Encoding utf8
Write-Output "Namma Civic frontend: $url"
