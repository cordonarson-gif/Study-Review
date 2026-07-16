$ErrorActionPreference = "Stop"

function Test-MiKTeX {
  $candidatePaths = @(
    "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64\xelatex.exe",
    "$env:ProgramFiles\MiKTeX\miktex\bin\x64\xelatex.exe",
    "${env:ProgramFiles(x86)}\MiKTeX\miktex\bin\x64\xelatex.exe"
  )

  foreach ($candidatePath in $candidatePaths) {
    if ($candidatePath -and (Test-Path -LiteralPath $candidatePath)) {
      Write-Host "Detected MiKTeX at $candidatePath"
      return $true
    }
  }

  $pathExecutable = Get-Command xelatex.exe -ErrorAction SilentlyContinue
  if ($pathExecutable) {
    Write-Host "Detected MiKTeX/LaTeX from PATH at $($pathExecutable.Source)"
    return $true
  }

  return $false
}

try {
  if (Test-MiKTeX) {
    Write-Host "MiKTeX already installed. Skip installation."
    exit 0
  }

  $tempDir = Join-Path $env:TEMP "cram-engine-miktex"
  New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

  $installerPath = Join-Path $tempDir "basic-miktex-x64.exe"
  $downloadUrl = "https://miktex.org/download/win/basic-miktex-x64.exe"

  Write-Host "Downloading MiKTeX from $downloadUrl"
  Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing

  $installRoot = Join-Path $env:LOCALAPPDATA "Programs\MiKTeX"
  $installerArgs = @(
    "--unattended",
    "--user-install=$installRoot",
    "--auto-install=yes"
  )

  Write-Host "Installing MiKTeX for the current Windows user."
  Start-Process -FilePath $installerPath -ArgumentList $installerArgs -Wait -NoNewWindow

  if (Test-MiKTeX) {
    Write-Host "MiKTeX installed successfully."
  } else {
    Write-Host "MiKTeX installer finished, but xelatex.exe was not detected yet."
  }

  exit 0
} catch {
  Write-Host "MiKTeX bootstrap failed: $($_.Exception.Message)"
  Write-Host "Cram Engine installation will continue; LaTeX can be installed later from system settings."
  exit 0
}
