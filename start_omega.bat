@echo off
echo ==============================================================================
echo  O.M.E.G.A — Starting Personal AI Operating Environment
echo ==============================================================================
cd /d "%~dp0"

echo [1/2] Starting O.M.E.G.A Python FastAPI Backend on http://127.0.0.1:8000 ...
start "OMEGA Backend" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Vite Frontend on http://localhost:5173 ...
start "OMEGA Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo O.M.E.G.A is starting. Press any key to open the interface in your browser.
pause
start http://localhost:5173
