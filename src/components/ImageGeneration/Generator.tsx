import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sparkles,
  Loader2,
  Copy,
  Maximize2,
  Eraser,
  Download,
  Wand2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  generateImage,
  enhancePrompt,
  SUGGESTED_PROMPTS,
  IMAGE_STYLES,
  IMAGE_MODELS,
  IMAGE_QUALITIES,
  STYLE_PRESETS,
  getSizesForModel,
  createVariation,
  upscaleImage,
  removeBackground,
  type ImageModel,
  type ImageSize,
  type ImageStyle,
  type ImageQuality,
  type GeneratedImage,
} from '@/lib/ai/image-generation'
import { addStoredImage } from '@/lib/storage/image-manager'
import { toast } from 'sonner'

interface ImageGeneratorProps {
  onImageGenerated?: (img: GeneratedImage) => void
}

export function ImageGenerator({ onImageGenerated }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [model, setModel] = useState<ImageModel>('dall-e-3')
  const [size, setSize] = useState<ImageSize>('1024x1024')
  const [style, setStyle] = useState<ImageStyle>('vivid')
  const [quality, setQuality] = useState<ImageQuality>('standard')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GeneratedImage | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const availableSizes = getSizesForModel(model)

  const handleModelChange = (newModel: ImageModel) => {
    setModel(newModel)
    const sizes = getSizesForModel(newModel)
    if (!sizes.find((s) => s.value === size)) {
      setSize(sizes[0]?.value ?? '1024x1024')
    }
  }

  const handlePresetClick = (presetId: string) => {
    if (selectedPreset === presetId) {
      setSelectedPreset(null)
    } else {
      setSelectedPreset(presetId)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setResult(null)
    try {
      const finalPrompt = selectedPreset
        ? enhancePrompt(prompt.trim(), selectedPreset)
        : prompt.trim()

      const img = await generateImage({
        prompt: finalPrompt,
        model,
        size,
        style,
        quality,
        negativePrompt: negativePrompt.trim() || undefined,
      })

      if (img) {
        setResult(img)
        addStoredImage(img)
        onImageGenerated?.(img)
        toast.success('Image generated successfully!')
      } else {
        toast.error('Failed to generate image. Check your API key configuration.')
      }
    } catch {
      toast.error('An error occurred during generation.')
    } finally {
      setLoading(false)
    }
  }

  const handleVariation = async () => {
    if (!result || actionLoading) return
    setActionLoading('variation')
    try {
      const img = await createVariation(result.url, result.prompt)
      if (img) {
        setResult(img)
        addStoredImage(img)
        onImageGenerated?.(img)
        toast.success('Variation created!')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleUpscale = async () => {
    if (!result || actionLoading) return
    setActionLoading('upscale')
    try {
      const url = await upscaleImage(result.url)
      if (url) {
        setResult((r) => (r ? { ...r, url } : null))
        toast.success('Image upscaled!')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveBg = async () => {
    if (!result || actionLoading) return
    setActionLoading('remove-bg')
    try {
      const url = await removeBackground(result.url)
      if (url) {
        setResult((r) => (r ? { ...r, url } : null))
        toast.success('Background removed!')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleDownload = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = result.url
    a.download = `canvas-image-${result.id}.png`
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }

  const handleReset = () => {
    setPrompt('')
    setNegativePrompt('')
    setSelectedPreset(null)
    setResult(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Generate Image
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Prompt */}
        <div>
          <Label htmlFor="img-prompt">Prompt</Label>
          <Textarea
            id="img-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            className="mt-1 min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate()
            }}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Press Ctrl+Enter to generate
          </p>
        </div>

        {/* Model & Style row */}
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[140px]">
            <Label className="text-xs text-muted-foreground">Model</Label>
            <Select value={model} onValueChange={(v) => handleModelChange(v as ImageModel)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[120px]">
            <Label className="text-xs text-muted-foreground">Style</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as ImageStyle)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <Label className="text-xs text-muted-foreground">Size</Label>
            <Select value={size} onValueChange={(v) => setSize(v as ImageSize)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSizes.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[120px]">
            <Label className="text-xs text-muted-foreground">Quality</Label>
            <Select value={quality} onValueChange={(v) => setQuality(v as ImageQuality)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_QUALITIES.map((q) => (
                  <SelectItem key={q.value} value={q.value}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced options toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="gap-1 text-muted-foreground"
        >
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Advanced options
        </Button>

        {showAdvanced && (
          <div className="space-y-4 rounded-lg border p-4">
            {/* Negative prompt */}
            <div>
              <Label htmlFor="neg-prompt" className="text-sm">
                Negative prompt
              </Label>
              <Textarea
                id="neg-prompt"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="What to avoid (e.g., blurry, distorted, low quality)..."
                className="mt-1 min-h-[50px]"
              />
            </div>

            {/* Style presets */}
            <div>
              <Label className="text-sm mb-2 block">Style presets</Label>
              <div className="flex flex-wrap gap-2">
                {STYLE_PRESETS.map((preset) => (
                  <Badge
                    key={preset.id}
                    variant={selectedPreset === preset.id ? 'default' : 'outline'}
                    className="cursor-pointer select-none"
                    onClick={() => handlePresetClick(preset.id)}
                  >
                    {preset.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Suggested prompts */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">
            <Wand2 className="h-3 w-3 inline mr-1" />
            Suggested prompts
          </Label>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.slice(0, 6).map((p) => (
              <Button
                key={p}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setPrompt(p)}
              >
                {p.length > 40 ? `${p.slice(0, 40)}...` : p}
              </Button>
            ))}
          </div>
        </div>

        {/* Generate + Reset */}
        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={!prompt.trim() || loading} className="gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? 'Generating...' : 'Generate'}
          </Button>
          {(prompt || result) && (
            <Button variant="outline" onClick={handleReset} className="gap-1">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-lg border overflow-hidden">
            <div className="relative bg-muted/30">
              <img
                src={result.url}
                alt={result.prompt}
                className="w-full h-auto max-h-[512px] object-contain mx-auto"
              />
            </div>
            <div className="p-3 space-y-2 border-t">
              <p className="text-sm font-medium line-clamp-2">{result.prompt}</p>
              {result.revisedPrompt && result.revisedPrompt !== result.prompt && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Revised:</span> {result.revisedPrompt}
                </p>
              )}
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">
                  {result.model}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {result.size}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {result.style}
                </Badge>
                {result.quality === 'hd' && (
                  <Badge variant="secondary" className="text-xs">
                    HD
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVariation}
                  disabled={!!actionLoading}
                  className="gap-1"
                >
                  {actionLoading === 'variation' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  Variation
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpscale}
                  disabled={!!actionLoading}
                  className="gap-1"
                >
                  {actionLoading === 'upscale' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Maximize2 className="h-3 w-3" />
                  )}
                  Upscale
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveBg}
                  disabled={!!actionLoading}
                  className="gap-1"
                >
                  {actionLoading === 'remove-bg' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Eraser className="h-3 w-3" />
                  )}
                  Remove BG
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1">
                  <Download className="h-3 w-3" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
