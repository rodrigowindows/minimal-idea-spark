
C:\code\minimal-idea-spark
O projeto esta nesta pasta C:\code\minimal-idea-spark
C:\code\minimal-idea-spark
faca tudo e nao para nao faca pergunta somente faca tudo altera o codigo e cria tudo oque precisa

# Implementar Integração de Áudio para Texto

Adicione funcionalidade de transcrição de áudio para texto no sistema:

1. Integre API de Speech-to-Text (Whisper API da OpenAI ou similar)
2. Crie componente de upload/gravação de áudio
3. Adicione botão de microfone nos inputs de texto relevantes
4. Implemente conversão automática e preenchimento do input
5. Adicione feedback visual durante processamento
6. Salve histórico de transcrições
7. Suporte para múltiplos idiomas (pt-BR, en, es)

**Arquivos esperados:**
- `components/AudioToText.tsx`
- `lib/audio-transcription.ts`
- `supabase/functions/transcribe-audio/index.ts`
- Atualizar inputs existentes com botão de áudio
