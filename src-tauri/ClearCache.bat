@echo off
taskkill /f /im explorer.exe
del /f /s /q %localappdata%\IconCache.db
del /f /s /q %localappdata%\Microsoft\Windows\Explorer\iconcache*
del /f /s /q %localappdata%\Microsoft\Windows\Explorer\thumbcache*
start explorer.exe
echo Icon cache cleared!
pause