$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")

$sc = $ws.CreateShortcut($desktop + "\Cram Engine.lnk")
$sc.TargetPath = "D:\review\cram-engine-main\desktop\node_modules\electron\dist\electron.exe"
$sc.Arguments = "D:\review\cram-engine-main\desktop\dist-electron\main.js"
$sc.WorkingDirectory = "D:\review\cram-engine-main\desktop"
$sc.Description = "Cram Engine"
$sc.Save()
Write-Output "Shortcut created"
