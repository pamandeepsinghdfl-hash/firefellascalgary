@echo off
setlocal
echo Removing scheduled task...
schtasks /Delete /TN "AmazonShiftNotifier" /F
echo.
echo Done. The bot will no longer run.
echo The files in this folder are still here - delete the folder to
echo remove them completely.
pause
