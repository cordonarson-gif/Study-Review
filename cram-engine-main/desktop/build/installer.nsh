!macro customInstall
  DetailPrint "Checking MiKTeX environment..."
  nsExec::ExecToLog 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\miktex-bootstrap.ps1"'
!macroend
