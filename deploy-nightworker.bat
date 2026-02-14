@echo off
echo ====================================
echo Deploy: nightworker-prompts Edge Function
echo ====================================
echo.

set SUPABASE_ACCESS_TOKEN=sbp_f4fa60af7af31f19e9f5c09dbdf26ea2b64dcb74

cd /d "c:\code\minimal-idea-spark"

echo Fazendo deploy...
npx supabase functions deploy nightworker-prompts --project-ref ekaflizdchjdryqcdlkq

echo.
echo ====================================
echo Deploy concluido!
echo ====================================
pause
