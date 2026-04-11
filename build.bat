@echo off
title Building SalaryGoalsCalculator v2.0...
echo.
echo ============================================================
echo   Salary ^& Goals Calculator  v2.0 Modern Edition
echo   by Erick Perez
echo ============================================================
echo.
python --version >nul 2>&1
if errorlevel 1 (echo [ERROR] Python not found. & pause & exit /b 1)
echo [OK] & python --version
echo.
echo [1/4] Installing dependencies...
pip install --upgrade pyinstaller customtkinter pillow reportlab >nul 2>&1
echo [OK] Dependencies installed
echo.
echo [2/4] Cleaning previous build...
if exist dist\SalaryGoalsCalculator.exe del /q dist\SalaryGoalsCalculator.exe
if exist build rmdir /s /q build >nul 2>&1
if exist SalaryGoalsCalculator.spec del /q SalaryGoalsCalculator.spec
echo.
echo [3/4] Running PyInstaller...
echo.
pyinstaller --onefile --windowed ^
  --name "SalaryGoalsCalculator" ^
  --icon "assets\icon.ico" ^
  --add-data "assets;assets" ^
  --hidden-import customtkinter ^
  --hidden-import PIL ^
  --hidden-import PIL.Image ^
  --hidden-import PIL.ImageDraw ^
  --hidden-import PIL.ImageFont ^
  --hidden-import PIL.ImageTk ^
  --hidden-import reportlab ^
  --hidden-import reportlab.graphics ^
  --hidden-import reportlab.platypus ^
  --hidden-import reportlab.lib ^
  --collect-all customtkinter ^
  --collect-all reportlab ^
  --collect-all PIL ^
  SalaryGoals_Modern.py
if errorlevel 1 (echo. & echo [ERROR] PyInstaller failed. & pause & exit /b 1)
if not exist dist\SalaryGoalsCalculator.exe (echo [ERROR] EXE not found. & pause & exit /b 1)
echo.
echo [OK] dist\SalaryGoalsCalculator.exe ready
for %%I in (dist\SalaryGoalsCalculator.exe) do echo     Size: %%~zI bytes
echo.
echo [4/4] Inno Setup...
set ISCC=
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" set ISCC="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if exist "C:\Program Files\Inno Setup 6\ISCC.exe"       set ISCC="C:\Program Files\Inno Setup 6\ISCC.exe"
if "%ISCC%"=="" (echo [SKIP] Inno Setup not found. & goto :done)
if not exist Output mkdir Output
%ISCC% installer.iss
if errorlevel 1 (echo [ERROR] Inno Setup failed. & pause & exit /b 1)
echo [OK] Output\SalaryGoalsCalculator_v2.0_Setup.exe
:done
echo.
echo ============================================================
echo   BUILD COMPLETE
echo   .py  Run : python SalaryGoals_Modern.py
echo   EXE      : dist\SalaryGoalsCalculator.exe
echo ============================================================
echo.
pause
