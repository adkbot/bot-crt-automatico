@echo off
echo ============================================
echo    INSTALACAO ML ENGINE - LSTM + XGBoost
echo ============================================
echo.

REM Verificar se Python esta instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python nao encontrado!
    echo.
    echo Por favor, instale Python 3.9+ de: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✅ Python encontrado!
echo.

REM Criar ambiente virtual
echo Criando ambiente virtual...
python -m venv venv

REM Ativar ambiente virtual
echo Ativando ambiente virtual...
call venv\Scripts\activate.bat

REM Instalar dependencias
echo.
echo Instalando dependencias (pode demorar alguns minutos)...
pip install --upgrade pip
pip install -r requirements.txt

echo.
echo ============================================
echo    ✅ INSTALACAO CONCLUIDA!
echo ============================================
echo.
echo Para rodar o ML Engine:
echo    1. Execute: start-ml-engine.bat
echo.
pause
