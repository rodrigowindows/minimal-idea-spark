import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  Sparkles,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Copy,
  History,
  Wand2,
  Trash2,
  Star,
  Type,
} from 'lucide-react';
import {
  generateContent,
  refineContent,
  generateTitleAndDescription,
  expandTopic,
} from '@/lib/ai/content-generator';
import type { ContentGenerationOptions } from '@/lib/ai/content-generator';
import {
  saveToHistory,
  getHistory,
  rateHistoryItem,
  clearHistory,
  type GenerationHistoryItem,
} from '@/lib/ai/prompt-library';
import { toast } from 'sonner';
import { VoiceInput } from '@/components/smart-capture/VoiceInput';
import { AudioToText } from '@/components/AudioToText';
import { PromptTemplates } from '@/components/PromptTemplates';
import { useTranslation } from '@/contexts/LanguageContext';

export function ContentGenerator() {
  const { language } = useTranslation();
  const isEn = language === 'en';

  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const [refineFeedback, setRefineFeedback] = useState('');
  const [expandedIdeas, setExpandedIdeas] = useState<string[]>([]);
  const [generatedMeta, setGeneratedMeta] = useState<{ title: string; description: string } | null>(null);
  const [historyItems, setHistoryItems] = useState<GenerationHistoryItem[]>(() => getHistory());
  const [options, setOptions] = useState<Partial<ContentGenerationOptions>>({
    style: 'professional',
    tone: 'neutral',
    length: 'medium',
    language: 'pt-BR',
  });

  const refreshHistory = useCallback(() => {
    setHistoryItems(getHistory());
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error(isEn ? 'Enter a prompt to generate content' : 'Digite um prompt para gerar conteudo');
      return;
    }

    setIsGenerating(true);
    try {
      const content = await generateContent({
        prompt,
        ...options,
      } as ContentGenerationOptions);

      setGeneratedContent(content);
      setGeneratedMeta(null);

      saveToHistory({
        prompt,
        content,
        templateId: options.templateId,
        style: options.style || 'professional',
        tone: options.tone || 'neutral',
        length: options.length || 'medium',
      });
      refreshHistory();

      toast.success(isEn ? 'Content generated successfully' : 'Conteudo gerado com sucesso');
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error(isEn ? 'Error generating content' : 'Erro ao gerar conteudo');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!generatedContent) return;
    const feedback = refineFeedback.trim() || (isEn ? 'Improve clarity and structure' : 'Melhore a clareza e a estrutura');

    setIsGenerating(true);
    try {
      const refined = await refineContent(generatedContent, feedback);
      setGeneratedContent(refined);
      setRefineFeedback('');
      setGeneratedMeta(null);
      toast.success(isEn ? 'Content refined' : 'Conteudo refinado');
    } catch (error) {
      console.error('Error refining content:', error);
      toast.error(isEn ? 'Error refining content' : 'Erro ao refinar conteudo');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMetadata = async () => {
    if (!generatedContent) return;

    setIsGenerating(true);
    try {
      const meta = await generateTitleAndDescription(generatedContent);
      setGeneratedMeta(meta);
      toast.success(isEn ? 'Title and description generated' : 'Titulo e descricao gerados');
    } catch (error) {
      console.error('Error generating metadata:', error);
      toast.error(isEn ? 'Error generating metadata' : 'Erro ao gerar metadados');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExpandTopic = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const ideas = await expandTopic(prompt, generatedContent || undefined);
      setExpandedIdeas(ideas);
      toast.success(isEn ? 'Ideas generated' : 'Ideias geradas');
    } catch (error) {
      console.error('Error expanding topic:', error);
      toast.error(isEn ? 'Error generating ideas' : 'Erro ao gerar ideias');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTemplateSelect = (
    filledPrompt: string,
    templateOptions: Partial<ContentGenerationOptions>
  ) => {
    setPrompt(filledPrompt);
    setOptions((prev) => ({ ...prev, ...templateOptions }));
    setActiveTab('generate');
    toast.success(isEn ? 'Template applied' : 'Template aplicado');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success(isEn ? 'Copied!' : 'Copiado!');
  };

  const handleRateHistory = (id: string, rating: number) => {
    rateHistoryItem(id, rating);
    refreshHistory();
  };

  const handleClearHistory = () => {
    clearHistory();
    refreshHistory();
    toast.success(isEn ? 'History cleared' : 'Historico limpo');
  };

  const handleLoadFromHistory = (item: GenerationHistoryItem) => {
    setPrompt(item.prompt);
    setGeneratedContent(item.content);
    setOptions((prev) => ({
      ...prev,
      style: item.style as any,
      tone: item.tone as any,
      length: item.length as any,
    }));
    setActiveTab('generate');
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {isEn ? 'Generate' : 'Gerar'}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            {isEn ? 'History' : 'Historico'}
          </TabsTrigger>
        </TabsList>

        {/* GENERATE TAB */}
        <TabsContent value="generate" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left: Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  {isEn ? 'Content Generator' : 'Gerador de Conteudo'}
                </CardTitle>
                <CardDescription>
                  {isEn
                    ? 'Use AI to generate high-quality content'
                    : 'Use IA para gerar conteudo de alta qualidade'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="prompt">
                      {isEn ? 'What do you want to create?' : 'O que voce quer criar?'}
                    </Label>
                    <div className="flex items-center gap-0.5">
                      <VoiceInput
                        onTranscript={(text) =>
                          setPrompt((prev) => (prev ? prev + ' ' + text : text))
                        }
                      />
                      <AudioToText
                        compact
                        sourcePage="content-generator"
                        onTranscription={(text) =>
                          setPrompt((prev) => (prev ? prev + ' ' + text : text))
                        }
                      />
                    </div>
                  </div>
                  <Textarea
                    id="prompt"
                    placeholder={
                      isEn
                        ? 'E.g.: Write an article about the benefits of AI...'
                        : 'Ex: Escreva um artigo sobre os beneficios da IA...'
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{isEn ? 'Style' : 'Estilo'}</Label>
                    <Select
                      value={options.style}
                      onValueChange={(v: any) => setOptions({ ...options, style: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">
                          {isEn ? 'Professional' : 'Profissional'}
                        </SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="creative">
                          {isEn ? 'Creative' : 'Criativo'}
                        </SelectItem>
                        <SelectItem value="technical">
                          {isEn ? 'Technical' : 'Tecnico'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{isEn ? 'Tone' : 'Tom'}</Label>
                    <Select
                      value={options.tone}
                      onValueChange={(v: any) => setOptions({ ...options, tone: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="friendly">
                          {isEn ? 'Friendly' : 'Amigavel'}
                        </SelectItem>
                        <SelectItem value="enthusiastic">
                          {isEn ? 'Enthusiastic' : 'Entusiasmado'}
                        </SelectItem>
                        <SelectItem value="neutral">
                          {isEn ? 'Neutral' : 'Neutro'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{isEn ? 'Length' : 'Tamanho'}</Label>
                    <Select
                      value={options.length}
                      onValueChange={(v: any) => setOptions({ ...options, length: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">
                          {isEn ? 'Short' : 'Curto'}
                        </SelectItem>
                        <SelectItem value="medium">
                          {isEn ? 'Medium' : 'Medio'}
                        </SelectItem>
                        <SelectItem value="long">
                          {isEn ? 'Long' : 'Longo'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="flex-1"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isEn ? 'Generating...' : 'Gerando...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {isEn ? 'Generate Content' : 'Gerar Conteudo'}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExpandTopic}
                    disabled={isGenerating || !prompt.trim()}
                    title={isEn ? 'Expand ideas' : 'Expandir ideias'}
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Expanded Ideas */}
                {expandedIdeas.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {isEn ? 'Expanded Ideas' : 'Ideias Expandidas'}
                    </Label>
                    <div className="space-y-1.5">
                      {expandedIdeas.map((idea, i) => (
                        <button
                          key={i}
                          onClick={() => setPrompt(idea)}
                          className="w-full text-left rounded-md border p-2 text-sm hover:bg-accent transition-colors"
                        >
                          {idea}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Output */}
            <Card>
              <CardHeader>
                <CardTitle>{isEn ? 'Result' : 'Resultado'}</CardTitle>
                <CardDescription>
                  {isEn
                    ? 'Your generated content will appear here'
                    : 'Seu conteudo gerado aparecera aqui'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  placeholder={
                    isEn
                      ? 'Generated content will appear here...'
                      : 'O conteudo gerado aparecera aqui...'
                  }
                  rows={10}
                  className="font-mono text-sm"
                />

                {generatedContent && (
                  <>
                    {/* Generated metadata */}
                    {generatedMeta && (
                      <div className="rounded-md border bg-muted/50 p-3 space-y-1">
                        <p className="text-sm font-medium">{generatedMeta.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {generatedMeta.description}
                        </p>
                      </div>
                    )}

                    {/* Refine with feedback */}
                    <div className="flex gap-2">
                      <Input
                        placeholder={
                          isEn
                            ? 'Refinement feedback (optional)...'
                            : 'Feedback para refinamento (opcional)...'
                        }
                        value={refineFeedback}
                        onChange={(e) => setRefineFeedback(e.target.value)}
                        className="text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefine}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        {isEn ? 'Refine' : 'Refinar'}
                      </Button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopy}>
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        {isEn ? 'Copy' : 'Copiar'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateMetadata}
                        disabled={isGenerating}
                      >
                        <Type className="mr-1.5 h-3.5 w-3.5" />
                        {isEn ? 'Title & Description' : 'Titulo & Descricao'}
                      </Button>
                      <div className="ml-auto flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toast.success(isEn ? 'Rated positively' : 'Avaliado positivamente')}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toast.success(isEn ? 'Rated negatively' : 'Avaliado negativamente')}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="mt-4">
          <div className="max-w-lg mx-auto">
            <PromptTemplates onSelectTemplate={handleTemplateSelect} />
          </div>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    {isEn ? 'Generation History' : 'Historico de Geracoes'}
                  </CardTitle>
                  <CardDescription>
                    {isEn
                      ? `${historyItems.length} generations saved`
                      : `${historyItems.length} geracoes salvas`}
                  </CardDescription>
                </div>
                {historyItems.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleClearHistory}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {isEn ? 'Clear' : 'Limpar'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {historyItems.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {isEn
                    ? 'No generations yet. Start creating content!'
                    : 'Nenhuma geracao ainda. Comece a criar conteudo!'}
                </p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3 pr-3">
                    {historyItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border p-3 space-y-2 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium line-clamp-1">
                            {item.prompt}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(item.created_at).toLocaleDateString(
                              isEn ? 'en-US' : 'pt-BR'
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {item.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-[10px]">
                              {item.style}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {item.tone}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            {item.rating != null && (
                              <div className="flex items-center gap-0.5 mr-2">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs">{item.rating}</span>
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleRateHistory(item.id, 1)}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleRateHistory(item.id, -1)}
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleLoadFromHistory(item)}
                            >
                              {isEn ? 'Load' : 'Carregar'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
