import { ImageGenerator } from '@/components/ImageGeneration/Generator'
import { ImageGallery } from '@/components/ImageGeneration/Gallery'

export function ImageGenerationPage() {
  return (
    <div className="min-h-screen p-4 md:p-6 space-y-8 max-w-4xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">AI Image Generation</h1>
        <p className="text-muted-foreground">Generate images from descriptions (DALL-E).</p>
      </header>
      <ImageGenerator />
      <ImageGallery />
    </div>
  )
}
