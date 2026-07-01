@echo off
rem Start the CogniMap backend and frontend in separate windows
set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

cd /d "%ROOT%"

rem Start backend in a new terminal
start "CogniMap Backend" cmd /k "cd /d "%ROOT%\backend" && call "..\.venv\Scripts\activate.bat" && python -m uvicorn app.main:app --reload --port 8000"

rem Start frontend in a new terminal
cd /d "%ROOT%\frontend"
start "CogniMap Frontend" cmd /k "npm run dev"

exit /b 0
