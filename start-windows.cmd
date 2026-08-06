@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node.js, then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo Installing the Electron 38.8.6 runtime...
  call npm install
  if errorlevel 1 (
    echo Electron installation failed.
    pause
    exit /b 1
  )
)

call npm run verify
if errorlevel 1 (
  pause
  exit /b 1
)

call npm start
if errorlevel 1 pause
