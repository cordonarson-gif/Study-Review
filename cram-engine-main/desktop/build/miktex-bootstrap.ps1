$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$DownloadFailure = 10
$SignatureFailure = 11
$InstallerFailure = 12
$VerificationFailure = 13
$downloadUrl = "https://miktex.org/download/win/basic-miktex-x64.exe"
$tempDir = Join-Path $env:TEMP "cram-engine-miktex"
$installerPath = Join-Path $tempDir "basic-miktex-x64.exe"

function Remove-MiKTeXInstaller {
  if (Test-Path -LiteralPath $installerPath) {
    Remove-Item -LiteralPath $installerPath -Force -ErrorAction SilentlyContinue
  }
}

function Stop-Bootstrap([int]$ExitCode, [string]$Message) {
  Write-Host $Message
  Remove-MiKTeXInstaller
  exit $ExitCode
}

function Test-MiKTeXPath([string]$ExecutablePath) {
  if (-not $ExecutablePath -or -not (Test-Path -LiteralPath $ExecutablePath -PathType Leaf)) {
    return $false
  }

  $resolvedPath = (Resolve-Path -LiteralPath $ExecutablePath).Path
  if ($resolvedPath -notmatch '(?i)[\\/]MiKTeX[\\/]') {
    return $false
  }

  try {
    $versionText = (& $resolvedPath --version 2>&1 | Out-String)
    return $versionText -match '(?i)MiKTeX'
  } catch {
    return $false
  }
}

function Test-MiKTeX {
  $candidatePaths = @(
    "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64\miktex.exe",
    "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64\xelatex.exe",
    "$env:ProgramFiles\MiKTeX\miktex\bin\x64\miktex.exe",
    "$env:ProgramFiles\MiKTeX\miktex\bin\x64\xelatex.exe",
    "${env:ProgramFiles(x86)}\MiKTeX\miktex\bin\x64\miktex.exe",
    "${env:ProgramFiles(x86)}\MiKTeX\miktex\bin\x64\xelatex.exe"
  )

  $pathMiKTeX = Get-Command miktex.exe -ErrorAction SilentlyContinue
  if ($pathMiKTeX) {
    $candidatePaths += $pathMiKTeX.Source
  }

  $pathXeLaTeX = Get-Command xelatex.exe -ErrorAction SilentlyContinue
  if ($pathXeLaTeX) {
    $candidatePaths += $pathXeLaTeX.Source
  }

  foreach ($candidatePath in ($candidatePaths | Select-Object -Unique)) {
    if (Test-MiKTeXPath $candidatePath) {
      Write-Host "Detected MiKTeX at $candidatePath"
      return $true
    }
  }

  return $false
}

if (Test-MiKTeX) {
  Write-Host "MiKTeX is already installed. Skipping dependency installation."
  exit 0
}

try {
  New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
  Remove-MiKTeXInstaller
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Write-Host "Downloading MiKTeX from $downloadUrl"
  Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing -MaximumRedirection 10
  if (-not (Test-Path -LiteralPath $installerPath -PathType Leaf) -or (Get-Item -LiteralPath $installerPath).Length -eq 0) {
    throw "The downloaded installer is empty."
  }
} catch {
  Stop-Bootstrap $DownloadFailure "MiKTeX download failed: $($_.Exception.Message)"
}

try {
  $signature = Get-AuthenticodeSignature -FilePath $installerPath
  if ($signature.Status -ne "Valid") {
    throw "Authenticode status is $($signature.Status)."
  }
  Write-Host "Verified MiKTeX installer signature: $($signature.SignerCertificate.Subject)"
} catch {
  Stop-Bootstrap $SignatureFailure "MiKTeX signature verification failed: $($_.Exception.Message)"
}

$installRoot = Join-Path $env:LOCALAPPDATA "Programs\MiKTeX"
$installerArgs = @(
  "--unattended",
  "--user-install=$installRoot",
  "--auto-install=yes"
)

try {
  Write-Host "Installing MiKTeX for the current Windows user."
  $installerProcess = Start-Process -FilePath $installerPath -ArgumentList $installerArgs -Wait -NoNewWindow -PassThru
  if ($installerProcess.ExitCode -ne 0) {
    throw "Installer exit code: $($installerProcess.ExitCode)."
  }
} catch {
  Stop-Bootstrap $InstallerFailure "MiKTeX installation failed: $($_.Exception.Message)"
}

if (-not (Test-MiKTeX)) {
  Stop-Bootstrap $VerificationFailure "MiKTeX installation finished, but the distribution could not be verified."
}

Remove-MiKTeXInstaller
Write-Host "MiKTeX installed and verified successfully."
exit 0
