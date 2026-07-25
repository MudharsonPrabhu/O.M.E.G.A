@echo off
echo ==============================================================================
echo  O.M.E.G.A — Launching Backend Service
echo ==============================================================================
cd /d "%~dp0backend"
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
) else (
    echo [ERROR] Virtual environment not found at backend\.venv
    echo Please run: python -m venv backend\.venv ^&^& backend\.venv\Scripts\pip install -r backend\requirements.txt
    pause
)
