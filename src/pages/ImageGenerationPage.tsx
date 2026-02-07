import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImageGenerator } from '@/components/ImageGeneration/Generator'
import { ImageGallery } from '@/components/ImageGeneration/Gallery'
import { Sparkles, ImageIcon } from 'lucide-react'

export function ImageGenerationPage() {
  const [activeTab, setActiveTab] = useState('generate')

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ImageIcon className="h-6 w-6 text-primary" />
          AI Image Generation
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate, edit, and manage images using DALL-E. Create variations, upscale, and remove backgrounds.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generate" className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-1.5">
            <ImageIcon className="h-4 w-4" />
            Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4 space-y-6">
          <ImageGenerator
            onImageGenerated={() => {
              // Could switch to library tab after generation if desired
            }}
          />
        </TabsContent>

        <TabsContent value="library" className="mt-4">
          <ImageGallery />
        </TabsContent>
      </Tabs>
    </div>
  )
}
