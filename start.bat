@echo off
title AI Trading System - Inicializador
color 0A

echo.
echo ========================================
echo   🤖 AI TRADING SYSTEM v2.0
echo ========================================
echo.
echo 🚀 Iniciando sistema completo...
echo.

REM Verificar se as dependências estão instaladas
if not exist "server\node_modules" (
    echo 📦 Instalando dependências do servidor...
    cd server
    call npm install
    cd ..
    echo ✅ Dependências do servidor instaladas!
    echo.
)

if not exist "client\node_modules" (
    echo 📦 Instalando dependências do cliente...
    cd client
    call npm install
    cd ..
    echo ✅ Dependências do cliente instaladas!
    echo.
)

REM Iniciar servidor
echo 📡 Iniciando Backend (Servidor)...
start "AI Trading - Backend" cmd /k "cd server && npm start"
timeout /t 3 /nobreak >nul

REM Iniciar cliente
echo 🌐 Iniciando Frontend (Cliente)...
start "AI Trading - Frontend" cmd /k "cd client && npm run dev"

echo.
echo ========================================
echo   ✅ SISTEMA INICIADO COM SUCESSO!
echo ========================================
echo.
echo 📡 Backend rodando em: http://localhost:3001
echo 🌐 Frontend rodando em: http://localhost:3000
echo.
echo ⚠️  Não feche estas janelas!
echo.
echo Pressione qualquer tecla para abrir o navegador...
pause >nul

REM Abrir navegador
start http://localhost:3000

exit
