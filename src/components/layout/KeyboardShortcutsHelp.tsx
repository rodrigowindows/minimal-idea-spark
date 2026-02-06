import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Keyboard } from 'lucide-react'

const shortcuts = [
  { keys: ['Alt', '1'], description: 'Go to Dashboard' },
  { keys: ['Alt', '2'], description: 'Go to Consultant' },
  { keys: ['Alt', '3'], description: 'Go to Opportunities' },
  { keys: ['Alt', '4'], description: 'Go to Journal' },
  { keys: ['Alt', '5'], description: 'Go to Analytics' },
  { keys: ['Alt', '6'], description: 'Go to Habits' },
  { keys: ['Alt', '7'], description: 'Go to Goals' },
  { keys: ['Alt', '8'], description: 'Go to Weekly Review' },
  { keys: ['F'], description: 'Toggle Deep Work Mode' },
  { keys: ['Esc'], description: 'Exit Deep Work Mode' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
]

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handler() {
      setOpen(prev => !prev)
    }
    window.addEventListener('toggle-shortcuts-help', handler)
    return () => window.removeEventListener('toggle-shortcuts-help', handler)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((key) => (
                  <kbd
                    key={key}
                    className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
