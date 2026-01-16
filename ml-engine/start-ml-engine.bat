@echo off
echo ============================================
echo    ML ENGINE - LSTM + XGBoost
echo ============================================
echo.
echo Iniciando ML Engine API...
echo.

REM Ativar ambiente virtual
call venv\Scripts\activate.bat

REM Rodar API
python api.py

pause
