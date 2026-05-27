@echo off
setlocal
cd /d "%~dp0"

echo.
echo ====================================================
echo   US Visa Public-Monitor - installer
echo ====================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python is not installed or not on PATH.
    echo Install from https://www.python.org/downloads/  and check
    echo "Add Python to PATH" during install. Then re-run this.
    pause & exit /b 1
)
python --version

if not exist "config.txt" (
    echo [ERROR] config.txt missing.
    echo  1. Open config.example.txt in Notepad
    echo  2. Fill in TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
    echo  3. Save it as: config.txt  (in this folder)
    echo  4. Re-run install.cmd
    pause & exit /b 1
)

if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 ( echo [ERROR] venv failed. & pause & exit /b 1 )
)

echo Installing dependencies...
call venv\Scripts\activate.bat
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt
if errorlevel 1 ( echo [ERROR] pip install failed. & pause & exit /b 1 )

echo Running test check...
call run.cmd
if errorlevel 1 (
    echo [WARN] Test failed. Check log.txt. Scheduled task NOT installed.
    pause & exit /b 1
)

echo Registering scheduled task (runs every 15 min while logged in)...
schtasks /Create /TN "USVisaPublicMonitor" /TR "\"%~dp0run.cmd\"" /SC MINUTE /MO 15 /F /RL LIMITED >nul
if errorlevel 1 ( echo [ERROR] schtasks failed. & pause & exit /b 1 )

echo.
echo ====================================================
echo   Done!
echo ====================================================
echo  - Checks public sources every 15 minutes
echo  - Telegram alerts on Calgary / B1-B2 visa mentions
echo  - Edit sources.txt to add/remove feeds
echo  - Edit config.txt to change keywords
echo  - Run uninstall.cmd to remove
echo ====================================================
pause
