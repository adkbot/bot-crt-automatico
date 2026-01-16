@echo off
echo ============================================
echo    RENOMEAR REPOSITORIO GITHUB
echo ============================================
echo.
echo IMPORTANTE: Primeiro renomeie no GitHub!
echo.
echo 1. Acesse: https://github.com/adkbot/binance-prediction-system
echo 2. Clique em "Settings"
echo 3. Em "Repository name", digite: bot-crt-automatico
echo 4. Clique em "Rename"
echo.
echo Depois de renomear no GitHub, pressione qualquer tecla...
pause >nul
echo.
echo Atualizando remote local...
git remote set-url origin https://github.com/adkbot/bot-crt-automatico.git
echo.
echo ✅ Remote atualizado!
echo.
echo Verificando...
git remote -v
echo.
echo ============================================
echo    PRONTO!
echo ============================================
pause
