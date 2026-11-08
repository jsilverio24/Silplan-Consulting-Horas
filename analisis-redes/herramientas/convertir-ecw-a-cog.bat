@echo off
chcp 65001 >nul
REM ==========================================================================
REM  CONSULTORA SILPLAN CONSULTING - Servicios de Ingenieria y Planificacion
REM  Av. Republica de Argentina #1, Plaza Belle Vue, Modulo 1A
REM  www.silplanconsulting.com
REM
REM  Convierte ortofotos ECW a GeoTIFF optimizado (COG) para el
REM  Analizador de Redes de Acueducto.
REM
REM  Uso: arrastre uno o varios archivos .ecw sobre este archivo.
REM  Requiere QGIS instalado (https://qgis.org). Se usa el GDAL que trae QGIS.
REM  El resultado queda junto al original con el nombre  <archivo>_cog.tif
REM ==========================================================================
setlocal EnableDelayedExpansion

set "QGISDIR="
for /d %%D in ("C:\Program Files\QGIS*") do set "QGISDIR=%%D"
if not defined QGISDIR (
  echo No se encontro QGIS en "C:\Program Files". Instale QGIS desde https://qgis.org
  pause
  exit /b 1
)
call "%QGISDIR%\bin\o4w_env.bat"

gdalinfo --formats | findstr /i "ECW" >nul
if errorlevel 1 (
  echo El GDAL de esta instalacion de QGIS no lee archivos ECW.
  echo Abra el ECW en QGIS y use Raster ^> Conversion ^> Traducir ^(formato GeoTIFF^).
  pause
  exit /b 1
)

if "%~1"=="" (
  echo Arrastre uno o varios archivos .ecw sobre este archivo.
  pause
  exit /b 1
)

:siguiente
if "%~1"=="" goto fin
echo.
echo Convirtiendo "%~nx1" ...
gdal_translate -b 1 -b 2 -b 3 -of COG -co COMPRESS=JPEG -co QUALITY=85 -co BIGTIFF=YES -co NUM_THREADS=ALL_CPUS "%~1" "%~dpn1_cog.tif"
if errorlevel 1 (
  echo   Error al convertir "%~nx1".
) else (
  echo   Listo: "%~dpn1_cog.tif"
)
shift
goto siguiente

:fin
echo.
echo Conversion terminada. Cargue los archivos *_cog.tif en el Analizador de Redes.
pause
