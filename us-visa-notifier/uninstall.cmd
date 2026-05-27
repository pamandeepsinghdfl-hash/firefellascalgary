@echo off
setlocal
echo Removing scheduled task...
schtasks /Delete /TN "USVisaPublicMonitor" /F
echo Done. Folder files remain - delete the folder to remove them.
pause
