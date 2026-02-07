import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getStoredImages, removeStoredImage, addStoredImage } from '@/lib/storage/image-manager'
import { createVariation, upscaleImage, removeBackground } from '@/lib/ai/image-generation'
import { ImageIcon, Trash2, Copy, Maximize2, Eraser } from 'lucide-react'
import { useState } from 'react'

export function ImageGallery() {
  const [images, setImages] = useState(getStoredImages())

  const refresh = () => setImages(getStoredImages())

  const remove = (id: string) => {
    removeStoredImage(id)
    refresh()
  }

  const handleVariation = async (url: string, prompt: string) => {
    const img = await createVariation(url, prompt)
    if (img) { addStoredImage(img); refresh() }
  }

  const handleUpscale = async (url: string) => {
    const newUrl = await upscaleImage(url)
    if (newUrl) { addStoredImage({ id: `up-${Date.now()}`, url: newUrl, prompt: 'Upscaled', createdAt: new Date().toISOString() }); refresh() }
  }

  const handleRemoveBg = async (url: string) => {
    const newUrl = await removeBackground(url)
    if (newUrl) { addStoredImage({ id: `bg-${Date.now()}`, url: newUrl, prompt: 'No background', createdAt: new Date().toISOString() }); refresh() }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ImageIcon className="h-5 w-5" />
          Generated images
        </CardTitle>
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No images yet. Generate some above.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img) => (
              <div key={img.id} className="rounded-lg border overflow-hidden group relative">
                <img src={img.url} alt={img.prompt} className="w-full h-32 object-cover" />
                <p className="text-xs text-muted-foreground p-2 line-clamp-2">{img.prompt}</p>
                <div className="flex items-center justify-between gap-1 p-2 border-t">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleVariation(img.url, img.prompt)} title="Variation">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleUpscale(img.url)} title="Upscale">
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveBg(img.url)} title="Remove background">
                      <Eraser className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(img.id)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
