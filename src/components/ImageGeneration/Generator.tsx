import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, Loader2, Copy, Maximize2, Eraser } from 'lucide-react'
import {
  generateImage,
  SUGGESTED_PROMPTS,
  IMAGE_STYLES,
  IMAGE_SIZES,
  createVariation,
  upscaleImage,
  removeBackground,
} from '@/lib/ai/image-generation'
import { addStoredImage } from '@/lib/storage/image-manager'

export function ImageGenerator() {
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState<'256x256' | '512x512' | '1024x1024'>('512x512')
  const [style, setStyle] = useState<'vivid' | 'natural'>('vivid')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ url: string; prompt: string } | null>(null)
  const [variantLoading, setVariantLoading] = useState(false)

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setResult(null)
    try {
      const img = await generateImage({ prompt: prompt.trim(), size, style })
      if (img) {
        setResult({ url: img.url, prompt: img.prompt })
        addStoredImage(img)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVariation = async () => {
    if (!result || variantLoading) return
    setVariantLoading(true)
    try {
      const img = await createVariation(result.url, result.prompt)
      if (img) {
        setResult({ url: img.url, prompt: img.prompt })
        addStoredImage(img)
      }
    } finally {
      setVariantLoading(false)
    }
  }

  const handleUpscale = async () => {
    if (!result) return
    const url = await upscaleImage(result.url)
    if (url) setResult(r => r ? { ...r, url } : null)
  }

  const handleRemoveBg = async () => {
    if (!result) return
    const url = await removeBackground(result.url)
    if (url) setResult(r => r ? { ...r, url } : null)
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
          <Input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the image..." className="mt-1" />
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Style</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as 'vivid' | 'natural')}>
              <SelectTrigger className="w-32 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {IMAGE_STYLES.map(s => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Size</Label>
            <Select value={size} onValueChange={(v) => setSize(v as '256x256' | '512x512' | '1024x1024')}>
              <SelectTrigger className="w-32 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {IMAGE_SIZES.map(s => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((p) => (
            <Button key={p} variant="outline" size="sm" onClick={() => setPrompt(p)}>{p}</Button>
          ))}
        </div>
        <Button onClick={handleGenerate} disabled={!prompt.trim() || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generate
        </Button>
        {result && (
          <div className="rounded-lg border overflow-hidden space-y-2">
            <img src={result.url} alt={result.prompt} className="w-full h-auto" />
            <p className="text-xs text-muted-foreground px-2">{result.prompt}</p>
            <div className="flex flex-wrap gap-2 p-2 border-t">
              <Button variant="outline" size="sm" onClick={handleVariation} disabled={variantLoading} className="gap-1">
                <Copy className="h-3 w-3" /> Variation
              </Button>
              <Button variant="outline" size="sm" onClick={handleUpscale} className="gap-1">
                <Maximize2 className="h-3 w-3" /> Upscale
              </Button>
              <Button variant="outline" size="sm" onClick={handleRemoveBg} className="gap-1">
                <Eraser className="h-3 w-3" /> Remove BG
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
