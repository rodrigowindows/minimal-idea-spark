import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Bookmark, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

function generateBookmarkletCode(appUrl: string): string {
  // The bookmarklet grabs the page title and selected text, then opens Idea Spark
  // with pre-filled title and description
  const code = `
    (function(){
      var t=document.title||'';
      var s=window.getSelection?window.getSelection().toString():'';
      var u=window.location.href;
      var d=encodeURIComponent(s?s+'\\n\\nSource: '+u:'Source: '+u);
      var title=encodeURIComponent(t);
      window.open('${appUrl}/opportunities?quickadd=1&title='+title+'&description='+d,'_blank','width=600,height=500');
    })();
  `.replace(/\s+/g, ' ').trim()
  return `javascript:${encodeURIComponent(code)}`
}

export function BookmarkletGenerator() {
  const [appUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return 'https://lifeos.app'
  })

  const bookmarkletHref = generateBookmarkletCode(appUrl)

  function handleCopyBookmarklet() {
    navigator.clipboard.writeText(bookmarkletHref).then(() => {
      toast.success('Bookmarklet code copied! Create a new bookmark and paste as the URL.')
    }).catch(() => {
      toast.error('Failed to copy')
    })
  }

  function handleCopyQuickAddUrl() {
    const url = `${appUrl}/opportunities?quickadd=1`
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Quick-add URL copied!')
    }).catch(() => {
      toast.error('Failed to copy')
    })
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bookmark className="h-5 w-5 text-primary" />
          Quick Add from Browser
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Add ideas to Idea Spark from any webpage using a bookmarklet or browser extension link.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Bookmarklet</Label>
          <p className="text-xs text-muted-foreground">
            Drag the button below to your bookmarks bar, or copy and create a bookmark manually.
          </p>
          <div className="flex items-center gap-2">
            <a
              href={bookmarkletHref}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-grab"
              onClick={(e) => {
                e.preventDefault()
                toast.info('Drag this button to your bookmarks bar to install')
              }}
            >
              <Bookmark className="h-4 w-4" />
              Add to Idea Spark
            </a>
            <Button variant="outline" size="sm" onClick={handleCopyBookmarklet}>
              <Copy className="h-4 w-4 mr-1" /> Copy
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Quick-add link</Label>
          <p className="text-xs text-muted-foreground">
            Open this URL to quickly add a new idea with a pre-filled form.
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={`${appUrl}/opportunities?quickadd=1`}
              className="font-mono text-xs bg-muted/50"
            />
            <Button variant="outline" size="icon" onClick={handleCopyQuickAddUrl}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <p className="text-sm font-medium">How the bookmarklet works</p>
          <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
            <li>Click it on any page to open Idea Spark with the page title as the idea title</li>
            <li>Any selected text becomes the description</li>
            <li>The source URL is automatically included</li>
          </ul>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">Tip</Badge>
          <span>Works on Chrome, Firefox, Edge, and Safari</span>
        </div>
      </CardContent>
    </Card>
  )
}
