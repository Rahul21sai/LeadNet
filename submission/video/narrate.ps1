param(
    [string]$PlanPath = (Join-Path $PSScriptRoot '..\video-notes\scene-plan.json'),
    [string]$Voice = 'Microsoft Mark',
    [int]$Rate = 0
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$planFile = (Resolve-Path -LiteralPath $PlanPath).Path
$plan = Get-Content -LiteralPath $planFile -Raw -Encoding utf8 | ConvertFrom-Json
$audioDir = Join-Path $PSScriptRoot 'assets\narration'
New-Item -ItemType Directory -Path $audioDir -Force | Out-Null
$speaker = [System.Speech.Synthesis.SpeechSynthesizer]::new()
$speaker.SelectVoice($Voice)
$format = [System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(
    48000,
    [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,
    [System.Speech.AudioFormat.AudioChannel]::Mono
)

function Get-WaveSeconds([string]$FilePath) {
    $reader = [System.IO.BinaryReader]::new([System.IO.File]::OpenRead($FilePath))
    try {
        [void]$reader.ReadBytes(12)
        $byteRate = 0
        $dataBytes = 0
        while ($reader.BaseStream.Position + 8 -le $reader.BaseStream.Length) {
            $id = [System.Text.Encoding]::ASCII.GetString($reader.ReadBytes(4))
            $size = $reader.ReadUInt32()
            $next = $reader.BaseStream.Position + $size + ($size % 2)
            if ($id -eq 'fmt ') {
                [void]$reader.ReadBytes(8)
                $byteRate = $reader.ReadUInt32()
            } elseif ($id -eq 'data') {
                $dataBytes = $size
            }
            $reader.BaseStream.Position = $next
        }
        if (!$byteRate -or !$dataBytes) { throw "Invalid WAV metadata: $FilePath" }
        return [double]$dataBytes / $byteRate
    } finally {
        $reader.Dispose()
    }
}

$timings = @()
try {
    foreach ($scene in $plan.scenes) {
        $path = Join-Path $audioDir ($scene.id + '.wav')
        $sceneRate = $Rate
        $budget = [double]$scene.end - [double]$scene.start - 0.8
        do {
            $speaker.Rate = $sceneRate
            $speaker.SetOutputToWaveFile($path, $format)
            $speaker.Speak([string]$scene.narration)
            $speaker.SetOutputToNull()
            $seconds = Get-WaveSeconds $path
            if ($seconds -le $budget -or $sceneRate -ge 3) { break }
            $sceneRate++
        } while ($true)
        if ($seconds -gt $budget) { throw "Narration exceeds scene budget: $($scene.id), $seconds seconds" }
        $timings += [PSCustomObject]@{
            id = $scene.id
            src = ('assets/narration/' + $scene.id + '.wav')
            start = [double]$scene.start + 0.4
            duration = [Math]::Round($seconds, 4)
            sceneStart = [double]$scene.start
            sceneEnd = [double]$scene.end
            voice = $Voice
            rate = $sceneRate
            sampleRate = 48000
            channels = 1
        }
    }
} finally {
    $speaker.Dispose()
}

$report = [PSCustomObject]@{
    sourcePlan = '../video-notes/scene-plan.json'
    sourceSha256 = (Get-FileHash -LiteralPath $planFile -Algorithm SHA256).Hash.ToLowerInvariant()
    provider = 'Offline Windows System.Speech; no network TTS'
    voice = $Voice
    scenes = $timings
}
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'narration-timings.json') -Encoding utf8
$timings | ConvertTo-Json -Depth 4
