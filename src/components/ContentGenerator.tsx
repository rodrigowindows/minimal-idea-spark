import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { generateContent, refineContent, rateGeneration } from '@/lib/ai/content-generator';
import type { ContentGenerationOptions } from '@/lib/ai/content-generator';
import { toast } from 'sonner';
import { VoiceInput } from '@/components/smart-capture/VoiceInput';
import { AudioToText } from '@/components/AudioToText';

export function ContentGenerator() {
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState<Partial<ContentGenerationOptions>>({
    style: 'professional',
    tone: 'neutral',
    length: 'medium',
    language: 'pt-BR',
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Digite um prompt para gerar conteúdo');
      return;
    }

    setIsGenerating(true);
    try {
      const content = await generateContent({
        prompt,
        ...options,
      } as ContentGenerationOptions);

      setGeneratedContent(content);
      toast.success('Conteúdo gerado com sucesso');
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Erro ao gerar conteúdo');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!generatedContent) return;

    setIsGenerating(true);
    try {
      const refined = await refineContent(
        generatedContent,
        'Improve clarity and structure'
      );
      setGeneratedContent(refined);
      toast.success('Conteúdo refinado');
    } catch (error) {
      console.error('Error refining content:', error);
      toast.error('Erro ao refinar conteúdo');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Gerador de Conteúdo
          </CardTitle>
          <CardDescription>
            Use IA para gerar conteúdo de alta qualidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt">O que você quer criar?</Label>
              <div className="flex items-center gap-0.5">
                <VoiceInput
                  onTranscript={(text) => setPrompt((prev) => (prev ? prev + ' ' + text : text))}
                />
                <AudioToText
                  compact
                  sourcePage="content-generator"
                  onTranscription={(text) => setPrompt((prev) => (prev ? prev + ' ' + text : text))}
                />
              </div>
            </div>
            <Textarea
              id="prompt"
              placeholder="Ex: Escreva um artigo sobre os benefícios da IA..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estilo</Label>
              <Select
                value={options.style}
                onValueChange={(v: any) => setOptions({ ...options, style: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Profissional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="creative">Criativo</SelectItem>
                  <SelectItem value="technical">Técnico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tom</Label>
              <Select
                value={options.tone}
                onValueChange={(v: any) => setOptions({ ...options, tone: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="friendly">Amigável</SelectItem>
                  <SelectItem value="enthusiastic">Entusiasmado</SelectItem>
                  <SelectItem value="neutral">Neutro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tamanho</Label>
              <Select
                value={options.length}
                onValueChange={(v: any) => setOptions({ ...options, length: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Curto</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="long">Longo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Conteúdo
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultado</CardTitle>
          <CardDescription>
            Seu conteúdo gerado aparecerá aqui
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={generatedContent}
            onChange={(e) => setGeneratedContent(e.target.value)}
            placeholder="O conteúdo gerado aparecerá aqui..."
            rows={12}
            className="font-mono text-sm"
          />

          {generatedContent && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefine}
                disabled={isGenerating}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refinar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(generatedContent);
                  toast.success('Copiado!');
                }}
              >
                Copiar
              </Button>
              <div className="ml-auto flex gap-1">
                <Button variant="outline" size="icon">
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
