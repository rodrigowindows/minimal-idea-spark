import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sparkles, Loader2 } from 'lucide-react'
import { generateImage, SUGGESTED_PROMPTS } from '@/lib/ai/image-generation'
import { addStoredImage } from '@/lib/storage/image-manager'

export function ImageGenerator() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ url: string; prompt: string } | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setResult(null)
    try {
      const img = await generateImage({ prompt: prompt.trim(), size: '512x512' })
      if (img) {
        setResult({ url: img.url, prompt: img.prompt })
        addStoredImage(img)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5" />
          Generate image
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Prompt</Label>
          <Input
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Describe the image..."
            className="mt-1"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((p) => (
            <Button key={p} variant="outline" size="sm" onClick={() => setPrompt(p)}>
              {p}
            </Button>
          ))}
        </div>
        <Button onClick={handleGenerate} disabled={!prompt.trim() || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generate
        </Button>
        {result && (
          <div className="rounded-lg border overflow-hidden">
            <img src={result.url} alt={result.prompt} className="w-full h-auto" />
            <p className="text-xs text-muted-foreground p-2">{result.prompt}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
