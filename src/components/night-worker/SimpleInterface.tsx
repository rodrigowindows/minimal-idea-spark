import React, { useState, useEffect, useCallback } from 'react'
import { useNightWorker } from '@/contexts/NightWorkerContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2, Send } from 'lucide-react'

/**
 * Uma interface simples para interagir com o Night Worker.
 * Demonstra o fluxo completo: criar um prompt e fazer polling do seu status.
 */
export function NightWorkerSimpleInterface() {
  const { apiFetch, isConnected } = useNightWorker()

  // Estado do formulário
  const [name, setName] = useState('meu-prompt-de-teste')
  const [content, setContent] = useState('Crie uma função em TypeScript que soma dois números.')
  const [provider, setProvider] = useState('claude')

  // Estado do prompt submetido
  const [submittedPromptId, setSubmittedPromptId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 1. Função para criar um novo prompt
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSubmittedPromptId(null)
    setStatus(null)
    setResult(null)

    try {
      const response = await apiFetch<{ id: string }>('/prompts', {
        method: 'POST',
        body: JSON.stringify({ provider, name, content, target_folder: '' }),
      })
      setSubmittedPromptId(response.id)
      setStatus('pending')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar o prompt.')
    } finally {
      setIsLoading(false)
    }
  }

  // 2. Função de Polling para verificar o status
  const pollStatus = useCallback(async () => {
    if (!submittedPromptId) return

    try {
      const promptDetails = await apiFetch<any>(`/prompts/${submittedPromptId}`)
      setStatus(promptDetails.status)

      if (promptDetails.status === 'done') {
        setResult(promptDetails.result_content)
      } else if (promptDetails.status === 'failed') {
        setError(promptDetails.error || 'O processamento falhou sem uma mensagem de erro.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao consultar o status do prompt.')
      setStatus('failed') // Interrompe o polling em caso de erro de consulta
    }
  }, [submittedPromptId, apiFetch])

  // 3. Efeito para iniciar e parar o polling
  useEffect(() => {
    if (submittedPromptId && (status === 'pending' || status === 'processing')) {
      const intervalId = setInterval(pollStatus, 5000) // Consulta a cada 5 segundos
      return () => clearInterval(intervalId) // Limpa o intervalo quando o status muda
    }
  }, [submittedPromptId, status, pollStatus])

  if (!isConnected) {
    return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /> <AlertTitle>Não Conectado</AlertTitle><AlertDescription>A API do Night Worker não está acessível. Verifique a configuração.</AlertDescription></Alert>
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Interface do Night Worker</CardTitle>
        <CardDescription>Envie um prompt e acompanhe o processamento em tempo real.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label htmlFor="name">Nome do Prompt</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label htmlFor="provider">Provider</Label><Input id="provider" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="claude, codex, gemini..." required /></div>
          <div><Label htmlFor="content">Conteúdo do Prompt</Label><Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} required /></div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : <><Send className="mr-2 h-4 w-4" /> Enviar Prompt</>}
          </Button>
        </form>

        {submittedPromptId && (
          <div className="mt-6">
            <h3 className="font-semibold">Status do Prompt: {submittedPromptId}</h3>
            {status === 'pending' && <div className="flex items-center text-yellow-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Aguardando processamento...</div>}
            {status === 'processing' && <div className="flex items-center text-blue-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</div>}
            {status === 'done' && (
              <Alert variant="default" className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Concluído com Sucesso!</AlertTitle>
                <AlertDescription><pre className="mt-2 whitespace-pre-wrap bg-green-100/50 p-2 rounded-md text-sm"><code>{result}</code></pre></AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ocorreu um Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">O status será atualizado automaticamente a cada 5 segundos.</p>
      </CardFooter>
    </Card>
  )
}