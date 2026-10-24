@echo off
rem Apaga OpenShorts Sin Limites y Docker Desktop, y libera la memoria de WSL,
rem para que no quede nada trabajando en segundo plano.
cd /d "%~dp0"

docker info >nul 2>&1
if errorlevel 1 goto cerrar_docker
echo Deteniendo OpenShorts Sin Limites...
docker compose down

:cerrar_docker
echo Cerrando Docker Desktop...
docker desktop stop >nul 2>&1
if errorlevel 1 taskkill /IM "Docker Desktop.exe" /F >nul 2>&1

echo Liberando la memoria de WSL...
wsl --shutdown

echo.
echo Listo: no queda nada de OpenShorts ni de Docker en segundo plano.
timeout /t 8 >nul
