import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImageGenerator } from '@/components/ImageGeneration/Generator'
import { ImageGallery } from '@/components/ImageGeneration/Gallery'
import { Sparkles, ImageIcon } from 'lucide-react'
import { AIFeatureInfo } from '@/components/AIFeatureInfo'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageContent } from '@/components/layout/PageContent'

export function ImageGenerationPage() {
  const [activeTab, setActiveTab] = useState('generate')

  return (
    <PageContent maxWidth="wide">
      <PageHeader
        icon={<ImageIcon className="h-6 w-6 text-primary" />}
        title="AI Image Generation"
        description="Generate, edit, and manage images using DALL-E. Create variations, upscale, and remove backgrounds."
        variant="compact"
        actions={<AIFeatureInfo feature="images" />}
      />

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
    </PageContent>
  )
}
