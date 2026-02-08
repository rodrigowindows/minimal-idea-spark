import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Keyboard } from 'lucide-react'

const shortcuts = [
  { keys: ['N'], description: 'Dashboard (nova captura)' },
  { keys: ['J'], description: 'Journal' },
  { keys: ['C'], description: 'Consultant' },
  { keys: ['/'], description: 'Busca global' },
  { keys: ['?'], description: 'Mostrar atalhos' },
  { keys: ['Alt', '1'], description: 'Dashboard' },
  { keys: ['Alt', '2'], description: 'Consultant' },
  { keys: ['Alt', '3'], description: 'Opportunities' },
  { keys: ['Alt', '4'], description: 'Journal' },
  { keys: ['Alt', '5'], description: 'Analytics' },
  { keys: ['Alt', '6'], description: 'Habits' },
  { keys: ['Alt', '7'], description: 'Goals' },
  { keys: ['Alt', '8'], description: 'Weekly Review' },
  { keys: ['F'], description: 'Deep Work Mode' },
  { keys: ['Esc'], description: 'Sair Deep Work / fechar modal' },
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
