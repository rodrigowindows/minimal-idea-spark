import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getStoredImages, removeStoredImage } from '@/lib/storage/image-manager'
import { ImageIcon, Trash2 } from 'lucide-react'
import { useState } from 'react'

export function ImageGallery() {
  const [images, setImages] = useState(getStoredImages())

  const remove = (id: string) => {
    removeStoredImage(id)
    setImages(getStoredImages())
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
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => remove(img.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
