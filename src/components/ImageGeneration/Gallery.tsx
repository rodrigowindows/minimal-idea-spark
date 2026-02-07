import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ImageIcon,
  Trash2,
  Copy,
  Maximize2,
  Eraser,
  Download,
  Heart,
  Search,
  Tag,
  X,
  Grid3X3,
  List,
  BarChart3,
} from 'lucide-react'
import {
  getStoredImages,
  removeStoredImage,
  addStoredImage,
  toggleFavorite,
  addTag,
  removeTag,
  getAllTags,
  filterImages,
  getImageStats,
  clearAllImages,
  type StoredImage,
} from '@/lib/storage/image-manager'
import { createVariation, upscaleImage, removeBackground } from '@/lib/ai/image-generation'
import { toast } from 'sonner'

type ViewMode = 'grid' | 'list'

export function ImageGallery() {
  const [images, setImages] = useState(getStoredImages())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTag, setFilterTag] = useState<string>('all')
  const [filterModel, setFilterModel] = useState<string>('all')
  const [showFavorites, setShowFavorites] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedImage, setSelectedImage] = useState<StoredImage | null>(null)
  const [newTag, setNewTag] = useState('')
  const [showStats, setShowStats] = useState(false)

  const refresh = () => setImages(getStoredImages())

  const allTags = useMemo(() => getAllTags(), [images])
  const stats = useMemo(() => getImageStats(), [images])

  const filteredImages = useMemo(() => {
    return filterImages({
      query: searchQuery,
      tags: filterTag !== 'all' ? [filterTag] : undefined,
      favorites: showFavorites || undefined,
      model: filterModel !== 'all' ? filterModel : undefined,
    })
  }, [searchQuery, filterTag, filterModel, showFavorites, images])

  const handleRemove = (id: string) => {
    removeStoredImage(id)
    if (selectedImage?.id === id) setSelectedImage(null)
    refresh()
    toast.success('Image removed')
  }

  const handleToggleFavorite = (id: string) => {
    toggleFavorite(id)
    refresh()
    if (selectedImage?.id === id) {
      setSelectedImage((prev) => (prev ? { ...prev, favorite: !prev.favorite } : null))
    }
  }

  const handleAddTag = (id: string) => {
    if (!newTag.trim()) return
    addTag(id, newTag.trim().toLowerCase())
    setNewTag('')
    refresh()
    const updated = getStoredImages().find((i) => i.id === id)
    if (updated && selectedImage?.id === id) setSelectedImage(updated)
  }

  const handleRemoveTag = (id: string, tag: string) => {
    removeTag(id, tag)
    refresh()
    const updated = getStoredImages().find((i) => i.id === id)
    if (updated && selectedImage?.id === id) setSelectedImage(updated)
  }

  const handleVariation = async (img: StoredImage) => {
    const result = await createVariation(img.url, img.prompt)
    if (result) {
      addStoredImage(result)
      refresh()
      toast.success('Variation created!')
    }
  }

  const handleUpscale = async (img: StoredImage) => {
    const url = await upscaleImage(img.url)
    if (url) {
      addStoredImage({
        id: `up-${Date.now()}`,
        url,
        prompt: `Upscaled: ${img.prompt}`,
        model: img.model,
        size: img.size,
        style: img.style,
        quality: img.quality,
        createdAt: new Date().toISOString(),
        tags: ['upscaled'],
        favorite: false,
      })
      refresh()
      toast.success('Upscaled image saved!')
    }
  }

  const handleRemoveBg = async (img: StoredImage) => {
    const url = await removeBackground(img.url)
    if (url) {
      addStoredImage({
        id: `bg-${Date.now()}`,
        url,
        prompt: `No BG: ${img.prompt}`,
        model: img.model,
        size: img.size,
        style: img.style,
        quality: img.quality,
        createdAt: new Date().toISOString(),
        tags: ['no-background'],
        favorite: false,
      })
      refresh()
      toast.success('Background removed!')
    }
  }

  const handleDownload = (img: StoredImage) => {
    const a = document.createElement('a')
    a.href = img.url
    a.download = `canvas-image-${img.id}.png`
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }

  const handleClearAll = () => {
    clearAllImages()
    setSelectedImage(null)
    refresh()
    toast.success('All images cleared')
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ImageIcon className="h-5 w-5" />
              Image Library
              <Badge variant="secondary" className="ml-1 text-xs">
                {filteredImages.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={showStats ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowStats(!showStats)}
                title="Stats"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          {showStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/50">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.favorites}</p>
                <p className="text-xs text-muted-foreground">Favorites</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.byModel['dall-e-3']}</p>
                <p className="text-xs text-muted-foreground">DALL-E 3</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.byModel['dall-e-2']}</p>
                <p className="text-xs text-muted-foreground">DALL-E 2</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search images..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterModel} onValueChange={setFilterModel}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All models</SelectItem>
                <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                <SelectItem value="dall-e-2">DALL-E 2</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showFavorites ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFavorites(!showFavorites)}
              className="gap-1"
            >
              <Heart className={`h-4 w-4 ${showFavorites ? 'fill-current' : ''}`} />
              Favorites
            </Button>
          </div>

          {/* Image grid / list */}
          {filteredImages.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {images.length === 0
                  ? 'No images yet. Generate some above!'
                  : 'No images match your filters.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredImages.map((img) => (
                <div
                  key={img.id}
                  className="rounded-lg border overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  onClick={() => setSelectedImage(img)}
                >
                  <div className="relative">
                    <img
                      src={img.url}
                      alt={img.prompt}
                      className="w-full h-40 object-cover"
                    />
                    <button
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleFavorite(img.id)
                      }}
                    >
                      <Heart
                        className={`h-4 w-4 ${img.favorite ? 'fill-red-500 text-red-500' : ''}`}
                      />
                    </button>
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-xs text-muted-foreground line-clamp-2">{img.prompt}</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px] h-5">
                        {img.model}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {img.style}
                      </Badge>
                      {(img.tags ?? []).slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] h-5">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredImages.map((img) => (
                <div
                  key={img.id}
                  className="flex items-center gap-3 rounded-lg border p-2 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedImage(img)}
                >
                  <img
                    src={img.url}
                    alt={img.prompt}
                    className="w-16 h-16 rounded object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{img.prompt}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline" className="text-[10px] h-5">
                        {img.model}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {img.size}
                      </Badge>
                      {(img.tags ?? []).slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] h-5">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleFavorite(img.id)
                      }}
                    >
                      <Heart
                        className={`h-4 w-4 ${img.favorite ? 'fill-red-500 text-red-500' : ''}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(img.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Clear all */}
          {images.length > 0 && (
            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" className="text-destructive gap-1" onClick={handleClearAll}>
                <Trash2 className="h-3 w-3" />
                Clear all images
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedImage && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base line-clamp-1">
                  {selectedImage.prompt}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Image */}
                <div className="rounded-lg overflow-hidden border bg-muted/30">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.prompt}
                    className="w-full h-auto max-h-[400px] object-contain mx-auto"
                  />
                </div>

                {/* Info */}
                <div className="space-y-2">
                  <p className="text-sm">{selectedImage.prompt}</p>
                  {selectedImage.revisedPrompt &&
                    selectedImage.revisedPrompt !== selectedImage.prompt && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Revised:</span>{' '}
                        {selectedImage.revisedPrompt}
                      </p>
                    )}
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{selectedImage.model}</Badge>
                    <Badge variant="secondary">{selectedImage.size}</Badge>
                    <Badge variant="secondary">{selectedImage.style}</Badge>
                    {selectedImage.quality === 'hd' && (
                      <Badge variant="secondary">HD</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(selectedImage.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(selectedImage.tags ?? []).map((tag) => (
                      <Badge key={tag} variant="outline" className="gap-1">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(selectedImage.id, tag)}
                          className="ml-0.5 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTag(selectedImage.id)
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddTag(selectedImage.id)}
                      disabled={!newTag.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleFavorite(selectedImage.id)}
                    className="gap-1"
                  >
                    <Heart
                      className={`h-4 w-4 ${selectedImage.favorite ? 'fill-red-500 text-red-500' : ''}`}
                    />
                    {selectedImage.favorite ? 'Unfavorite' : 'Favorite'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVariation(selectedImage)}
                    className="gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Variation
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpscale(selectedImage)}
                    className="gap-1"
                  >
                    <Maximize2 className="h-3 w-3" />
                    Upscale
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveBg(selectedImage)}
                    className="gap-1"
                  >
                    <Eraser className="h-3 w-3" />
                    Remove BG
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(selectedImage)}
                    className="gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-destructive ml-auto"
                    onClick={() => handleRemove(selectedImage.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
