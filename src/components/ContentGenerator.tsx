import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  Star, 
  History, 
  Wand2,
  Lightbulb,
  ArrowRight
} from 'lucide-react'
import { PromptTemplates } from './PromptTemplates'
import { 
  generateContent, 
  refineContent, 
  saveToHistory,
  getHistory,
  rateGeneration,
  type GenerationResult 
} from '@/lib/ai/content-generator'
import type { ContentType, ToneStyle } from '@/lib/ai/prompt-library'
import { toast } from 'sonner'
import { MarkdownContent } from './consultant/MarkdownContent'
import { LoadingSpinner } from './ui/LoadingSpinner'

export function ContentGenerator() {
  const { t } = useTranslation()
  
  const [selectedType, setSelectedType] = useState<ContentType>('brainstorm')
  const [params, setParams] = useState<Record<string, any>>({})
  const [selectedTone, setSelectedTone] = useState<ToneStyle>('professional')
  const [generatedContent, setGeneratedContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [refinementPrompt, setRefinementPrompt] = useState('')
  const [history, setHistory] = useState<GenerationResult[]>([])
  const [currentRating, setCurrentRating] = useState<number>(0)

  const tones: { value: ToneStyle; label: string }[] = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'motivational', label: 'Motivational' },
    { value: 'analytical', label: 'Analytical' },
    { value: 'creative', label: 'Creative' },
  ]

  const handleGenerate = async () => {
    if (!params.title && !params.topic && !params.idea && !params.text && !params.goal) {
      toast.error('Please fill in the required field')
      return
    }

    setIsGenerating(true)
    setGeneratedContent('')
    
    try {
      const result = await generateContent({
        contentType: selectedType,
        params,
        tone: selectedTone
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      setGeneratedContent(result.content)
      
      // Save to history
      const generation: GenerationResult = {
        id: `gen-${Date.now()}`,
        content: result.content,
        contentType: selectedType,
        params,
        createdAt: new Date()
      }
      saveToHistory(generation)
      setHistory([generation, ...history])
      
      toast.success('Content generated!')
    } catch (error) {
      console.error('Generation error:', error)
      toast.error('Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRefine = async () => {
    if (!refinementPrompt.trim() || !generatedContent) {
      toast.error('Enter refinement instructions')
      return
    }

    setIsGenerating(true)
    
    try {
      const result = await refineContent(
        generatedContent,
        refinementPrompt,
        selectedType
      )

      if (result.error) {
        toast.error(result.error)
        return
      }

      setGeneratedContent(result.content)
      setRefinementPrompt('')
      
      toast.success('Content refined!')
    } catch (error) {
      console.error('Refinement error:', error)
      toast.error('Failed to refine content')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedContent) return
    
    try {
      await navigator.clipboard.writeText(generatedContent)
      setCopied(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy')
    }
  }

  const handleRate = (rating: number) => {
    if (history.length > 0) {
      const currentGen = history[0]
      rateGeneration(currentGen.id, rating)
      setCurrentRating(rating)
      toast.success(`Rated ${rating} stars!`)
    }
  }

  const loadHistory = () => {
    const h = getHistory()
    setHistory(h.generations)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Wand2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">AI Content Generator</h2>
            <p className="text-sm text-muted-foreground">
              Create, expand, and refine content with AI
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadHistory}>
          <History className="mr-2 h-4 w-4" />
          History
        </Button>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">
            <Sparkles className="mr-2 h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Lightbulb className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Content Type</label>
                <PromptTemplates
                  onSelect={(type, template) => {
                    setSelectedType(type)
                    setParams({})
                  }}
                  selectedType={selectedType}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Tone & Style</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tones.map((tone) => (
                    <Badge
                      key={tone.value}
                      variant={selectedTone === tone.value ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedTone(tone.value)}
                    >
                      {tone.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {selectedType === 'brainstorm' && (
                  <>
                    <input
                      type="text"
                      placeholder="What do you want to brainstorm?"
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={params.topic || ''}
                      onChange={(e) => setParams({ ...params, topic: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Any constraints? (optional)"
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={params.constraints || ''}
                      onChange={(e) => setParams({ ...params, constraints: e.target.value })}
                    />
                  </>
                )}

                {selectedType === 'expand_idea' && (
                  <>
                    <Textarea
                      placeholder="Enter your brief idea..."
                      className="min-h-24"
                      value={params.idea || ''}
                      onChange={(e) => setParams({ ...params, idea: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Direction to expand (optional)"
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={params.direction || ''}
                      onChange={(e) => setParams({ ...params, direction: e.target.value })}
                    />
                  </>
                )}

                {selectedType === 'task_description' && (
                  <>
                    <input
                      type="text"
                      placeholder="Task title"
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={params.title || ''}
                      onChange={(e) => setParams({ ...params, title: e.target.value })}
                    />
                    <Textarea
                      placeholder="Additional context (optional)"
                      className="min-h-20"
                      value={params.context || ''}
                      onChange={(e) => setParams({ ...params, context: e.target.value })}
                    />
                  </>
                )}

                {selectedType === 'goal_description' && (
                  <>
                    <input
                      type="text"
                      placeholder="Goal title"
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={params.title || ''}
                      onChange={(e) => setParams({ ...params, title: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Timeframe (e.g., 3 months)"
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={params.timeframe || ''}
                      onChange={(e) => setParams({ ...params, timeframe: e.target.value })}
                    />
                  </>
                )}

                {selectedType === 'refine_text' && (
                  <Textarea
                    placeholder="Paste text to refine..."
                    className="min-h-32"
                    value={params.text || ''}
                    onChange={(e) => setParams({ ...params, text: e.target.value })}
                  />
                )}

                {selectedType === 'action_steps' && (
                  <>
                    <input
                      type="text"
                      placeholder="Goal to break down"
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={params.goal || ''}
                      onChange={(e) => setParams({ ...params, goal: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Timeframe (optional)"
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={params.timeframe || ''}
                      onChange={(e) => setParams({ ...params, timeframe: e.target.value })}
                    />
                  </>
                )}
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Content
                  </>
                )}
              </Button>
            </div>
          </Card>

          {generatedContent && (
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Generated Content</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRate(star)}
                          className="text-muted-foreground hover:text-yellow-500 transition-colors"
                        >
                          <Star 
                            className={`h-4 w-4 ${star <= currentRating ? 'fill-yellow-500 text-yellow-500' : ''}`}
                          />
                        </button>
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCopy}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-64 rounded-md border bg-muted/30 p-4">
                  <MarkdownContent content={generatedContent} className="text-sm" />
                </ScrollArea>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Refine this content</label>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="E.g., 'Make it shorter', 'Add more examples', 'Use simpler language'"
                      value={refinementPrompt}
                      onChange={(e) => setRefinementPrompt(e.target.value)}
                      className="min-h-20"
                    />
                    <Button
                      onClick={handleRefine}
                      disabled={isGenerating || !refinementPrompt.trim()}
                      className="shrink-0"
                    >
                      {isGenerating ? (
                        <LoadingSpinner className="h-4 w-4" />
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Refine
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {history.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 font-semibold">Recent Generations</h3>
              <div className="space-y-3">
                {history.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setGeneratedContent(item.content)}
                    className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.contentType.replace('_', ' ')}
                        </Badge>
                        {item.rating && (
                          <div className="flex gap-0.5">
                            {Array.from({ length: item.rating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            ))}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {item.content.substring(0, 100)}...
                    </p>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <Card className="p-6">
            <PromptTemplates
              onSelect={(type) => setSelectedType(type)}
              selectedType={selectedType}
              detailed
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
