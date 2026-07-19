!macro customInstall
  miktex_retry:
  DetailPrint "Checking MiKTeX environment..."
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\miktex-bootstrap.ps1"'
  Pop $0
  Pop $1
  DetailPrint "$1"
  StrCmp $0 "0" miktex_done

  MessageBox MB_RETRYCANCEL|MB_ICONSTOP "MiKTeX could not be installed (error $0). Retry the dependency installation or cancel Cram Engine setup. Details: $1" IDRETRY miktex_retry IDCANCEL miktex_cancel

  miktex_cancel:
  Abort

  miktex_done:
  DetailPrint "MiKTeX dependency is ready."
!macroend
