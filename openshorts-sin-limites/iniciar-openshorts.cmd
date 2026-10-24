@echo off
rem Inicia OpenShorts Sin Limites: abre Docker Desktop si hace falta,
rem levanta la herramienta y abre el panel en el navegador.
cd /d "%~dp0"

docker info >nul 2>&1
if not errorlevel 1 goto docker_listo

echo Abriendo Docker Desktop...
start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
set /a intentos=0
:esperar_docker
timeout /t 3 /nobreak >nul
docker info >nul 2>&1
if not errorlevel 1 goto docker_listo
set /a intentos+=1
if %intentos% lss 60 goto esperar_docker
echo.
echo No se pudo iniciar Docker Desktop. Abrelo a mano y vuelve a ejecutar este archivo.
pause
exit /b 1

:docker_listo
echo Iniciando OpenShorts Sin Limites...
docker compose up -d
if errorlevel 1 (
    echo.
    echo Algo fallo al iniciar. Revisa el mensaje de arriba.
    pause
    exit /b 1
)

echo Esperando a que el panel responda...
set /a intentos=0
:esperar_panel
curl -sf -o nul http://localhost:5175
if not errorlevel 1 goto abrir
set /a intentos+=1
if %intentos% geq 60 goto abrir
timeout /t 3 /nobreak >nul
goto esperar_panel

:abrir
start "" http://localhost:5175
echo.
echo Listo: OpenShorts esta en http://localhost:5175
echo Para apagarlo todo, ejecuta detener-openshorts.cmd
timeout /t 8 >nul
