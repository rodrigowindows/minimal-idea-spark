import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Keyboard, RotateCcw, X } from 'lucide-react'
import { useShortcutContext, getEffectiveKeys } from '@/contexts/ShortcutContext'
import { GLOBAL_SHORTCUTS } from '@/hooks/useKeyboardShortcuts'
import { toast } from 'sonner'

export function ShortcutSettings() {
  const { t } = useTranslation()
  const { customBindings, setCustomBinding, resetBinding, resetAllBindings, setHelpOpen } = useShortcutContext()
  const [recording, setRecording] = useState<string | null>(null)

  const customizableShortcuts = GLOBAL_SHORTCUTS.filter(s => s.customizable)

  function startRecording(shortcutId: string) {
    setRecording(shortcutId)

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault()
      e.stopPropagation()

      // Ignore modifier-only presses
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return

      const keys: string[] = []
      if (e.ctrlKey || e.metaKey) keys.push('Ctrl')
      if (e.altKey) keys.push('Alt')

      // Map key names
      const keyMap: Record<string, string> = {
        'Escape': 'Esc',
        ' ': 'Space',
      }
      const mainKey = keyMap[e.key] || (e.key.length === 1 ? e.key.toUpperCase() : e.key)
      keys.push(mainKey)

      setCustomBinding(shortcutId, keys)
      setRecording(null)
      toast.success(t('settings.shortcutUpdated', `Atalho atualizado: ${keys.join('+')}`))
      window.removeEventListener('keydown', handleKeyDown, true)
    }

    window.addEventListener('keydown', handleKeyDown, true)

    // Auto-cancel after 5 seconds
    setTimeout(() => {
      setRecording(prev => {
        if (prev === shortcutId) {
          window.removeEventListener('keydown', handleKeyDown, true)
          return null
        }
        return prev
      })
    }, 5000)
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            {t('settings.shortcuts', 'Atalhos de Teclado')}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={() => setHelpOpen(true)}
            >
              <Keyboard className="h-3 w-3" />
              {t('settings.viewAll', 'Ver todos')}
            </Button>
            {Object.keys(customBindings).length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 text-xs text-destructive"
                onClick={() => {
                  resetAllBindings()
                  toast.success(t('settings.shortcutsReset', 'Atalhos restaurados'))
                }}
              >
                <RotateCcw className="h-3 w-3" />
                {t('settings.resetAll', 'Restaurar')}
              </Button>
            )}
          </div>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('settings.shortcutsDescription', 'Clique em um atalho para redefini-lo. Pressione a nova combinacao de teclas.')}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {customizableShortcuts.map(shortcut => {
          const keys = getEffectiveKeys(shortcut, customBindings)
          const isCustom = !!customBindings[shortcut.id]
          const isRecordingThis = recording === shortcut.id

          return (
            <div
              key={shortcut.id}
              className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5"
            >
              <span className="text-sm">{shortcut.description}</span>
              <div className="flex items-center gap-2">
                {isCustom && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      resetBinding(shortcut.id)
                      toast.success(t('settings.shortcutReset', 'Atalho restaurado'))
                    }}
                    title={t('settings.resetToDefault', 'Restaurar padrao')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
                <button
                  onClick={() => isRecordingThis ? setRecording(null) : startRecording(shortcut.id)}
                  className={`flex items-center gap-1 rounded border px-2 py-1 font-mono text-xs transition-colors ${
                    isRecordingThis
                      ? 'border-primary bg-primary/10 text-primary animate-pulse'
                      : 'border-border bg-muted hover:border-primary/50'
                  }`}
                >
                  {isRecordingThis ? (
                    <span>{t('settings.pressKey', 'Pressione...')}</span>
                  ) : (
                    keys.map(key => (
                      <kbd key={key} className="rounded border border-border bg-background px-1.5 py-0.5">
                        {key}
                      </kbd>
                    ))
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
