@echo off
REM Supabase Migration and Deploy Automation Script
REM Script para automatizar migracao e deploy do banco de dados Supabase
REM Project Ref: ekaflizdchjdryqcdlkq

setlocal enabledelayedexpansion

REM Navigate to project directory
cd /d "C:\code\minimal-idea-spark"

REM Colors and formatting
color 0A
echo.
echo ========================================
echo   SUPABASE MIGRATION AND DEPLOY TOOL
echo   Ferramenta de Migracao e Deploy
echo ========================================
echo.

REM Check if npm/node are installed
where npm >nul 2>nul
if errorlevel 1 (
    echo [ERRO] npm nao encontrado. Instale Node.js para continuar.
    echo [ERROR] npm not found. Install Node.js to continue.
    pause
    exit /b 1
)

REM Check if running from correct directory
if not exist "supabase" (
    echo [AVISO] Pasta 'supabase' nao encontrada.
    echo [WARNING] 'supabase' folder not found.
    echo.
    echo Deseja continuar mesmo assim? (S/N)
    echo Want to continue anyway? (Y/N)
    set /p continue="Resposta/Answer: "
    if /i not "!continue!"=="s" if /i not "!continue!"=="y" (
        echo Operacao cancelada.
        echo Operation cancelled.
        exit /b 0
    )
)

echo.
echo ========================================
echo   SELECIONE O METODO DE AUTENTICACAO
echo   SELECT AUTHENTICATION METHOD
echo ========================================
echo.
echo [1] Usar Token de Acesso Supabase (Use Supabase Access Token)
echo [2] Usar URL do Banco de Dados (Use Database URL)
echo [3] Sair (Exit)
echo.

set /p choice="Escolha uma opcao (1-3) / Choose an option (1-3): "

if "!choice!"=="1" (
    call :authenticate_with_token
) else if "!choice!"=="2" (
    call :authenticate_with_url
) else if "!choice!"=="3" (
    echo.
    echo Operacao cancelada. / Operation cancelled.
    exit /b 0
) else (
    echo.
    echo [ERRO] Opcao invalida. / Invalid option.
    pause
    goto :EOF
)

echo.
echo ========================================
echo   PROCESSO CONCLUIDO / PROCESS COMPLETE
echo ========================================
pause
exit /b 0

REM ========================================
REM Function: Authenticate with Access Token
REM ========================================
:authenticate_with_token
echo.
echo ========================================
echo   AUTENTICACAO COM TOKEN DE ACESSO
echo   AUTHENTICATION WITH ACCESS TOKEN
echo ========================================
echo.
echo Cole seu token de acesso Supabase:
echo Paste your Supabase access token:
echo (Voce pode gera-lo em: https://app.supabase.com/account/tokens)
echo (You can generate one at: https://app.supabase.com/account/tokens)
echo.

set /p access_token="Token: "

if "!access_token!"=="" (
    echo.
    echo [ERRO] Token nao fornecido. / Token not provided.
    goto :EOF
)

REM Set environment variable
set SUPABASE_ACCESS_TOKEN=!access_token!
echo.
echo [OK] Token de acesso configurado. / Access token configured.

REM Link project
echo.
echo [PROCESSANDO] Vinculando projeto Supabase...
echo [PROCESSING] Linking Supabase project...
echo Projeto / Project: ekaflizdchjdryqcdlkq
echo.

call npx supabase link --project-ref ekaflizdchjdryqcdlkq

if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao vincular o projeto. / Failed to link project.
    set error_msg=Linking project failed
    goto :show_error
)

echo [OK] Projeto vinculado com sucesso. / Project linked successfully.

REM Push database changes
echo.
echo [PROCESSANDO] Enviando alteracoes do banco de dados...
echo [PROCESSING] Pushing database changes...
echo.

call npx supabase db push

if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao enviar alteracoes do banco de dados.
    echo [ERROR] Failed to push database changes.
    set error_msg=Database push failed
    goto :show_error
)

echo [OK] Alteracoes do banco de dados enviadas com sucesso.
echo [OK] Database changes pushed successfully.

REM Deploy edge function
echo.
echo ========================================
echo   DEPLOY DA FUNCAO EDGE
echo   EDGE FUNCTION DEPLOYMENT
echo ========================================
echo.
echo Deseja fazer deploy da funcao edge 'nightworker-prompts'?
echo Do you want to deploy the 'nightworker-prompts' edge function?
echo.
set /p deploy_function="Digite S para sim ou N para nao / Type Y for yes or N for no: "

if /i "!deploy_function!"=="s" (
    goto :deploy_edge_function
) else if /i "!deploy_function!"=="y" (
    goto :deploy_edge_function
) else (
    echo.
    echo [INFO] Deploy da funcao edge pulado. / Edge function deployment skipped.
    goto :success_token
)

:deploy_edge_function
echo.
echo [PROCESSANDO] Fazendo deploy da funcao edge...
echo [PROCESSING] Deploying edge function...
echo.

call npx supabase functions deploy nightworker-prompts --project-ref ekaflizdchjdryqcdlkq

if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao fazer deploy da funcao edge.
    echo [ERROR] Failed to deploy edge function.
    echo.
    echo Nota: O banco de dados foi atualizado com sucesso, mas o deploy da funcao falhou.
    echo Note: Database was updated successfully, but function deployment failed.
    set error_msg=Edge function deployment failed
    goto :show_error
)

echo [OK] Funcao edge implantada com sucesso.
echo [OK] Edge function deployed successfully.

:success_token
echo.
echo ========================================
echo   SUCESSO / SUCCESS
echo ========================================
echo.
echo [OK] Migracao e deploy completados com sucesso!
echo [OK] Migration and deployment completed successfully!
echo.
echo Resumo / Summary:
echo - Token de acesso configurado / Access token configured
echo - Projeto vinculado / Project linked
echo - Banco de dados atualizado / Database updated
if /i "!deploy_function!"=="s" (
    echo - Funcao edge implantada / Edge function deployed
) else if /i "!deploy_function!"=="y" (
    echo - Funcao edge implantada / Edge function deployed
) else (
    echo - Deploy da funcao edge foi pulado / Edge function deployment skipped
)
echo.
goto :EOF

REM ========================================
REM Function: Authenticate with Database URL
REM ========================================
:authenticate_with_url
echo.
echo ========================================
echo   AUTENTICACAO COM URL DO BANCO DE DADOS
echo   AUTHENTICATION WITH DATABASE URL
echo ========================================
echo.
echo Cole a URL de conexao do seu banco de dados Supabase:
echo Paste your Supabase database connection URL:
echo (Formato / Format: postgresql://user:password@host:5432/dbname)
echo.

set /p db_url="URL: "

if "!db_url!"=="" (
    echo.
    echo [ERRO] URL nao fornecida. / URL not provided.
    goto :EOF
)

REM Push database changes with URL
echo.
echo [PROCESSANDO] Enviando alteracoes do banco de dados...
echo [PROCESSING] Pushing database changes...
echo.

call npx supabase db push --db-url "!db_url!"

if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao enviar alteracoes do banco de dados.
    echo [ERROR] Failed to push database changes.
    set error_msg=Database push with URL failed
    goto :show_error
)

echo [OK] Alteracoes do banco de dados enviadas com sucesso.
echo [OK] Database changes pushed successfully.

REM Ask about deploying edge function
echo.
echo ========================================
echo   DEPLOY DA FUNCAO EDGE
echo   EDGE FUNCTION DEPLOYMENT
echo ========================================
echo.
echo Para fazer deploy da funcao edge, voce precisara do token de acesso.
echo To deploy the edge function, you will need your access token.
echo.
echo Deseja fazer deploy da funcao edge 'nightworker-prompts' agora?
echo Do you want to deploy the 'nightworker-prompts' edge function now?
echo.
set /p deploy_with_url="Digite S para sim ou N para nao / Type Y for yes or N for no: "

if /i "!deploy_with_url!"=="s" (
    goto :get_token_for_deploy
) else if /i "!deploy_with_url!"=="y" (
    goto :get_token_for_deploy
) else (
    echo.
    echo [INFO] Deploy da funcao edge pulado. / Edge function deployment skipped.
    goto :success_url
)

:get_token_for_deploy
echo.
echo Cole seu token de acesso Supabase para fazer deploy:
echo Paste your Supabase access token for deployment:
echo.

set /p token_for_deploy="Token: "

if "!token_for_deploy!"=="" (
    echo.
    echo [ERRO] Token nao fornecido. / Token not provided.
    echo [INFO] Continuando sem fazer deploy da funcao edge.
    echo [INFO] Continuing without deploying edge function.
    goto :success_url
)

REM Set token and deploy
set SUPABASE_ACCESS_TOKEN=!token_for_deploy!

echo.
echo [PROCESSANDO] Fazendo deploy da funcao edge...
echo [PROCESSING] Deploying edge function...
echo.

call npx supabase functions deploy nightworker-prompts --project-ref ekaflizdchjdryqcdlkq

if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao fazer deploy da funcao edge.
    echo [ERROR] Failed to deploy edge function.
    echo.
    echo Nota: O banco de dados foi atualizado com sucesso, mas o deploy da funcao falhou.
    echo Note: Database was updated successfully, but function deployment failed.
    set error_msg=Edge function deployment with URL failed
    goto :show_error
)

echo [OK] Funcao edge implantada com sucesso.
echo [OK] Edge function deployed successfully.

:success_url
echo.
echo ========================================
echo   SUCESSO / SUCCESS
echo ========================================
echo.
echo [OK] Migracao completada com sucesso!
echo [OK] Migration completed successfully!
echo.
echo Resumo / Summary:
echo - Banco de dados atualizado / Database updated
if /i "!deploy_with_url!"=="s" (
    echo - Funcao edge implantada / Edge function deployed
) else if /i "!deploy_with_url!"=="y" (
    echo - Funcao edge implantada / Edge function deployed
) else (
    echo - Deploy da funcao edge foi pulado / Edge function deployment skipped
)
echo.
goto :EOF

REM ========================================
REM Function: Show Error Message
REM ========================================
:show_error
echo.
echo ========================================
echo   ERRO / ERROR
echo ========================================
echo.
echo [ERRO] !error_msg!
echo.
echo Por favor, verifique:
echo Please check:
echo 1. Sua conexao de internet / Your internet connection
echo 2. Suas credenciais Supabase / Your Supabase credentials
echo 3. A URL do banco de dados / The database URL
echo 4. Permissoes necessarias / Required permissions
echo.
echo Para mais informacoes, visite:
echo For more information, visit:
echo https://supabase.com/docs/guides/cli/managing-environments
echo.
goto :EOF
