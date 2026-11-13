@echo off
title Budget Cycle Challenge - Server
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download the LTS version from https://nodejs.org then run this file again.
  pause
  exit /b
)
node server.js
pause
