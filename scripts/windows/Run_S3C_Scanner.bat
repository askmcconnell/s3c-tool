@echo off
echo.
echo ==========================================
echo   S3C-Tool - Windows Scanner Launcher
echo ==========================================
echo.
echo Starting scanner... a PowerShell window will open.
echo The scan takes 1-3 minutes. Please wait.
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0s3c_scan_windows.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Scanner did not complete successfully.
    echo Please try right-clicking s3c_scan_windows.ps1 and selecting
    echo "Run with PowerShell" instead.
    echo.
    pause
)
