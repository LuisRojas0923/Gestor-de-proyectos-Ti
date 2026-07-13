[CmdletBinding()]
param(
    [ValidateRange(0, 100)]
    [int]$Warmup = 5,

    [ValidateRange(1, 500)]
    [int]$Iterations = 50,

    [ValidateRange(5, 300)]
    [int]$CpuWindowSeconds = 30,

    [string]$OutputPath = "docs/reviews/builds/evidence/performance-baseline.json",

    [string]$FrontendBaseUrl = "http://127.0.0.1:5173",

    [string]$BackendBaseUrl = "http://127.0.0.1:8000",

    [switch]$SelfTest,

    [switch]$FrontendOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-NearestRankPercentile {
    param(
        [double[]]$Values,
        [ValidateRange(0.01, 1.0)]
        [double]$Percentile
    )

    if ($Values.Count -eq 0) {
        return $null
    }
    $sorted = @($Values | Sort-Object)
    $rank = [Math]::Ceiling($Percentile * $sorted.Count)
    return [Math]::Round([double]$sorted[[Math]::Max(0, $rank - 1)], 2)
}

function Get-SampleSummary {
    param([double[]]$Values)

    if ($Values.Count -eq 0) {
        return [ordered]@{
            count = 0
            p50 = $null
            p95 = $null
            max = $null
        }
    }
    return [ordered]@{
        count = $Values.Count
        p50 = Get-NearestRankPercentile -Values $Values -Percentile 0.50
        p95 = Get-NearestRankPercentile -Values $Values -Percentile 0.95
        max = [Math]::Round([double](($Values | Measure-Object -Maximum).Maximum), 2)
    }
}

function Convert-CpuPercent {
    param([string]$Value)

    $normalized = $Value.Trim().TrimEnd('%')
    return [double]::Parse($normalized, [Globalization.CultureInfo]::InvariantCulture)
}

function Convert-MemoryToMiB {
    param([string]$Value)

    $used = ($Value -split '/')[0].Trim()
    if ($used -match '^([0-9.]+)(KiB|MiB|GiB)$') {
        $number = [double]::Parse($Matches[1], [Globalization.CultureInfo]::InvariantCulture)
        switch ($Matches[2]) {
            'KiB' { return [Math]::Round($number / 1024, 2) }
            'MiB' { return [Math]::Round($number, 2) }
            'GiB' { return [Math]::Round($number * 1024, 2) }
        }
    }
    return $null
}

function Get-DockerResourceSamples {
    param([int]$WindowSeconds)

    $samples = @()
    $containerNames = @(
        'gestor-de-proyectos-ti-frontend-1',
        'gestor-de-proyectos-ti-backend-1'
    )
    foreach ($containerName in $containerNames) {
        $startInfo = New-Object System.Diagnostics.ProcessStartInfo
        $startInfo.FileName = 'docker'
        $startInfo.Arguments = "stats --format `"{{json .}}`" $containerName"
        $startInfo.UseShellExecute = $false
        $startInfo.RedirectStandardOutput = $true
        $startInfo.RedirectStandardError = $true
        $startInfo.CreateNoWindow = $true
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $startInfo
        $null = $process.Start()
        $started = [DateTimeOffset]::UtcNow
        $lastCapturedAt = [DateTimeOffset]::MinValue
        try {
            while (([DateTimeOffset]::UtcNow - $started).TotalSeconds -lt $WindowSeconds -and -not $process.HasExited) {
                $line = $process.StandardOutput.ReadLine()
                if ([string]::IsNullOrWhiteSpace($line)) { continue }
                try {
                    $jsonStart = $line.IndexOf('{')
                    $jsonEnd = $line.LastIndexOf('}')
                    if ($jsonStart -lt 0 -or $jsonEnd -le $jsonStart) { continue }
                    $cleanLine = $line.Substring($jsonStart, $jsonEnd - $jsonStart + 1)
                    $item = $cleanLine | ConvertFrom-Json
                    $capturedAt = [DateTimeOffset]::UtcNow
                    if (($capturedAt - $lastCapturedAt).TotalMilliseconds -lt 900) { continue }
                    $lastCapturedAt = $capturedAt
                    $samples += [pscustomobject][ordered]@{
                        captured_at = $capturedAt.ToString('o')
                        container = $item.Name
                        cpu_percent = Convert-CpuPercent -Value $item.CPUPerc
                        memory_mib = Convert-MemoryToMiB -Value $item.MemUsage
                    }
                } catch {
                    # Una linea parcial de docker stats no invalida el resto de la ventana.
                }
            }
        } finally {
            if (-not $process.HasExited) { $process.Kill() }
            $process.WaitForExit()
            $process.Dispose()
        }
    }
    return $samples
}

function Invoke-TimedRequest {
    param(
        [System.Net.Http.HttpClient]$Client,
        [string]$Uri,
        [int]$Iteration
    )

    $watch = [Diagnostics.Stopwatch]::StartNew()
    $response = $null
    try {
        $response = $Client.GetAsync($Uri).GetAwaiter().GetResult()
        $content = $response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
        $watch.Stop()
        return [ordered]@{
            iteration = $Iteration
            status = [int]$response.StatusCode
            duration_ms = [Math]::Round($watch.Elapsed.TotalMilliseconds, 2)
            bytes = $content.Length
        }
    } catch {
        $watch.Stop()
        return [ordered]@{
            iteration = $Iteration
            status = 0
            duration_ms = [Math]::Round($watch.Elapsed.TotalMilliseconds, 2)
            bytes = 0
            error_type = $_.Exception.GetType().Name
        }
    } finally {
        if ($null -ne $response) { $response.Dispose() }
    }
}

function Measure-Target {
    param(
        [System.Net.Http.HttpClient]$Client,
        [hashtable]$Target,
        [int]$WarmupCount,
        [int]$MeasuredCount
    )

    for ($index = 1; $index -le $WarmupCount; $index += 1) {
        $null = Invoke-TimedRequest -Client $Client -Uri $Target.uri -Iteration (-1 * $index)
    }

    $samples = @()
    for ($index = 1; $index -le $MeasuredCount; $index += 1) {
        $samples += [pscustomobject](Invoke-TimedRequest -Client $Client -Uri $Target.uri -Iteration $index)
    }
    $durations = @($samples | ForEach-Object { [double]$_.duration_ms })
    return [ordered]@{
        alias = $Target.alias
        category = $Target.category
        path = ([Uri]$Target.uri).PathAndQuery
        summary_ms = Get-SampleSummary -Values $durations
        samples = $samples
    }
}

function Assert-SelfTest {
    $values = [double[]](1, 2, 3, 4, 5)
    if ((Get-NearestRankPercentile -Values $values -Percentile 0.50) -ne 3) {
        throw 'Fallo percentil p50'
    }
    if ((Get-NearestRankPercentile -Values $values -Percentile 0.95) -ne 5) {
        throw 'Fallo percentil p95'
    }
    $sample = [ordered]@{ alias = 'seguro'; status = 200; duration_ms = 1.2 } | ConvertTo-Json
    if ($sample -match 'token|authorization|cedula') {
        throw 'La evidencia de autoevaluacion contiene una clave sensible'
    }
    'SELF_TEST_OK'
}

function Assert-SafeBaseUrl {
    param([string]$Value)

    $uri = $null
    if (-not [Uri]::TryCreate($Value, [UriKind]::Absolute, [ref]$uri)) {
        throw 'BackendBaseUrl debe ser una URL absoluta.'
    }
    $isLoopback = $uri.IsLoopback -or $uri.Host -in @('localhost', '127.0.0.1', '::1', '[::1]')
    if ($uri.Scheme -ne 'https' -and -not $isLoopback) {
        throw 'BackendBaseUrl debe usar HTTPS salvo para loopback local.'
    }
}

if ($SelfTest) {
    Assert-SelfTest
    exit 0
}

$token = [Environment]::GetEnvironmentVariable('PERF_AUTH_TOKEN', 'Process')
[Environment]::SetEnvironmentVariable('PERF_AUTH_TOKEN', $null, 'Process')
if (-not $FrontendOnly -and [string]::IsNullOrWhiteSpace($token)) {
    throw 'PERF_AUTH_TOKEN es obligatorio. Definelo en el proceso actual; el script nunca lo imprime ni persiste.'
}
if (-not $FrontendOnly) {
    Assert-SafeBaseUrl -Value $BackendBaseUrl
}

Add-Type -AssemblyName System.Net.Http
$frontendClient = New-Object System.Net.Http.HttpClient
$backendHandler = New-Object System.Net.Http.HttpClientHandler
$backendHandler.AllowAutoRedirect = $false
$backendClient = New-Object System.Net.Http.HttpClient($backendHandler)
$frontendClient.Timeout = [TimeSpan]::FromSeconds(30)
$backendClient.Timeout = [TimeSpan]::FromSeconds(30)
if (-not [string]::IsNullOrWhiteSpace($token)) {
    $backendClient.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $token)
}

$frontendTargets = @(
    @{ alias = 'modulo_configuracion_he'; category = 'vite_module'; uri = "$FrontendBaseUrl/src/pages/ServicePortal/pages/HORAS_EXTRAS/ConfiguracionHorasExtrasView.tsx" },
    @{ alias = 'modulo_calculadora_he'; category = 'vite_module'; uri = "$FrontendBaseUrl/src/pages/ServicePortal/pages/HORAS_EXTRAS/PreLiquidacionView.tsx" },
    @{ alias = 'modulo_alcance'; category = 'vite_module'; uri = "$FrontendBaseUrl/src/pages/ServicePortal/pages/AlcanceEmpleados/index.tsx" },
    @{ alias = 'modulo_modal'; category = 'vite_module'; uri = "$FrontendBaseUrl/src/components/molecules/Modal.tsx" }
)
$backendTargets = @(
    @{ alias = 'parametros_calculo'; category = 'api'; uri = "$BackendBaseUrl/api/v2/novedades-nomina/horas-extras/parametros-calculo" },
    @{ alias = 'festivos_auto'; category = 'api'; uri = "$BackendBaseUrl/api/v2/novedades-nomina/horas-extras/festivos/2026?fuente=auto" },
    @{ alias = 'gestores_alcance'; category = 'api'; uri = "$BackendBaseUrl/api/v2/alcance-empleados/gestores?limit=100&offset=0" }
)

try {
    $resourceSamples = Get-DockerResourceSamples -WindowSeconds $CpuWindowSeconds
    $measurements = @()
    foreach ($target in $frontendTargets) {
        $measurements += [pscustomobject](Measure-Target -Client $frontendClient -Target $target -WarmupCount $Warmup -MeasuredCount $Iterations)
    }
    if (-not $FrontendOnly) {
        foreach ($target in $backendTargets) {
            $measurements += [pscustomobject](Measure-Target -Client $backendClient -Target $target -WarmupCount $Warmup -MeasuredCount $Iterations)
        }
    }

    $resourceSummary = @()
    foreach ($container in @($resourceSamples.container | Sort-Object -Unique)) {
        $containerSamples = @($resourceSamples | Where-Object { $_.container -eq $container })
        $resourceSummary += [ordered]@{
            container = $container
            cpu_percent = Get-SampleSummary -Values @($containerSamples | ForEach-Object { [double]$_.cpu_percent })
            memory_mib = Get-SampleSummary -Values @($containerSamples | ForEach-Object { [double]$_.memory_mib })
        }
    }

    $gitSha = (& git rev-parse --short HEAD 2>$null)
    $gitStatus = @(& git status --porcelain 2>$null)
    $evidence = [ordered]@{
        schema_version = 1
        generated_at = [DateTimeOffset]::UtcNow.ToString('o')
        git_sha = "$gitSha".Trim()
        worktree_dirty = $gitStatus.Count -gt 0
        environment = [ordered]@{
            platform = 'windows-docker-desktop'
            warmup = $Warmup
            iterations = $Iterations
            percentile_method = 'nearest-rank'
            cpu_window_seconds = $CpuWindowSeconds
            mode = if ($FrontendOnly) { 'frontend-only' } else { 'full-authenticated' }
        }
        resources = [ordered]@{
            summary = $resourceSummary
            samples = $resourceSamples
        }
        requests = $measurements
    }

    $absoluteOutput = if ([IO.Path]::IsPathRooted($OutputPath)) { $OutputPath } else { Join-Path (Get-Location) $OutputPath }
    $parent = Split-Path -Parent $absoluteOutput
    if (-not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    $evidence | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $absoluteOutput -Encoding UTF8

    $failed = @($measurements | ForEach-Object { $_.samples } | Where-Object { $_.status -lt 200 -or $_.status -ge 300 })
    "Evidencia guardada en $absoluteOutput"
    if ($failed.Count -gt 0) {
        throw "El baseline contiene $($failed.Count) respuestas no exitosas. Revisa token, servicios y evidencia anonimizada."
    }
} finally {
    $frontendClient.Dispose()
    $backendClient.Dispose()
    [Environment]::SetEnvironmentVariable('PERF_AUTH_TOKEN', $null, 'Process')
    $token = $null
}
