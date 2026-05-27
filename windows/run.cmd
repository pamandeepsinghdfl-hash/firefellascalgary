@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

if not exist "config.txt" (
    echo [%date% %time%] config.txt missing - aborting >> log.txt
    exit /b 1
)

REM Load KEY=VALUE lines from config.txt into environment, skipping blanks/comments
for /f "usebackq tokens=1,* delims==" %%a in ("config.txt") do (
    set "_k=%%a"
    set "_v=%%b"
    if defined _k (
        if not "!_k:~0,1!"=="#" (
            for /f "tokens=* delims= " %%t in ("!_k!") do set "_k=%%t"
            if defined _k set "!_k!=!_v!"
        )
    )
)

call venv\Scripts\activate.bat >nul 2>nul
python notifier.py >> log.txt 2>&1
exit /b %errorlevel%
