@echo off
REM Ejecutar en la raíz del proyecto (saas_crm_multitenant)
REM Abre dos ventanas: backend (4000) y frontend (3000)

cd /d "%~dp0.."

echo Iniciando backend en http://localhost:4000 ...
start "Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo Iniciando frontend en http://localhost:3000 ...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Abre el navegador en http://localhost:3000
pause
