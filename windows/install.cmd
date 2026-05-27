@echo off
setlocal
cd /d "%~dp0"

echo.
echo ====================================================
echo   Amazon Shift Notifier - installer
echo ====================================================
echo.

REM --- 1. Python check ------------------------------------------------
where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python is not installed or not on PATH.
    echo.
    echo  1. Download Python from: https://www.python.org/downloads/
    echo  2. During install, CHECK the box "Add Python to PATH".
    echo  3. Re-run install.cmd.
    echo.
    pause
    exit /b 1
)
python --version

REM --- 2. config.txt check --------------------------------------------
if not exist "config.txt" (
    echo.
    echo [ERROR] config.txt is missing.
    echo.
    echo  1. Open config.example.txt in Notepad.
    echo  2. Fill in your TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID at minimum.
    echo  3. Save it as: config.txt  ^(in this same folder^)
    echo  4. Re-run install.cmd.
    echo.
    pause
    exit /b 1
)

REM --- 3. Create venv -------------------------------------------------
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause & exit /b 1
    )
)

REM --- 4. Install requirements ----------------------------------------
echo Installing dependencies...
call venv\Scripts\activate.bat
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies.
    pause & exit /b 1
)

REM --- 5. Smoke test --------------------------------------------------
echo Running one test check ^(this may take 10-30 sec^)...
call run.cmd
if errorlevel 1 (
    echo.
    echo [WARN] Test run failed. Check log.txt for details.
    echo The scheduled task was NOT installed.
    pause & exit /b 1
)

REM --- 6. Register Windows scheduled task -----------------------------
echo Registering scheduled task ^(runs every 5 min while logged in^)...
schtasks /Create /TN "AmazonShiftNotifier" /TR "\"%~dp0run.cmd\"" /SC MINUTE /MO 5 /F /RL LIMITED >nul
if errorlevel 1 (
    echo [ERROR] Failed to register scheduled task.
    pause & exit /b 1
)

echo.
echo ====================================================
echo   Done!
echo ====================================================
echo  - Checks Amazon every 5 minutes
echo  - Telegram message arrives when a new shift drops
echo  - First run baselines existing jobs, no alert sent
echo  - PC must be ON and logged in (not asleep)
echo  - Check log.txt to see what the bot did
echo  - Run uninstall.cmd to remove
echo ====================================================
echo.
pause
