@echo off
REM En tu PC: añade todo, hace commit y push.
REM Uso: scripts\git-subir-pc.bat "mensaje del commit"
cd /d "%~dp0.."

if "%~1"=="" (
  echo Escribe el mensaje del commit. Ejemplo:
  echo   scripts\git-subir-pc.bat "Nuevo generador de prompt en Bot IA"
  pause
  exit /b 1
)

git add .
git status
echo.
set /p OK="Confirmar commit y push? (S/N): "
if /i not "%OK%"=="S" exit /b 0
git commit -m "%~1"
git push origin main
if errorlevel 1 git push origin master
echo.
echo Listo. Ahora en el VPS ejecuta: git pull origin main y reinicia servicios.
pause
