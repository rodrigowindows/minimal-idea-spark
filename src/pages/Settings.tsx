import { useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocalData } from '@/hooks/useLocalData'
import { useAuth } from '@/contexts/AuthContext'
import { DEFAULT_DOMAIN_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Settings2,
  Download,
  Upload,
  Trash2,
  Database,
  Palette,
  Info,
  Plus,
  Globe,
  Target,
  Save,
  LogOut,
} from 'lucide-react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { TranscriptionHistory } from '@/components/TranscriptionHistory'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

export function Settings() {
  const { exportData, importData, opportunities, dailyLogs, habits, goals, domains, addDomain, weeklyTargets, setWeeklyTarget } = useLocalData()
  const { user, signOut } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [showDomainDialog, setShowDomainDialog] = useState(false)
  const [newDomainName, setNewDomainName] = useState('')
  const [newDomainColor, setNewDomainColor] = useState<string>(DEFAULT_DOMAIN_COLORS[0])
  const [newDomainTarget, setNewDomainTarget] = useState(20)

  // Weekly targets local editing state
  const [editingTargets, setEditingTargets] = useState<Record<string, { opp: number; hours: number }>>(() => {
    const initial: Record<string, { opp: number; hours: number }> = {}
    weeklyTargets.forEach(t => {
      initial[t.domain_id] = { opp: t.opportunities_target, hours: t.hours_target }
    })
    return initial
  })

  function handleSaveWeeklyTargets() {
    Object.entries(editingTargets).forEach(([domainId, { opp, hours }]) => {
      if (opp > 0 || hours > 0) {
        setWeeklyTarget(domainId, opp, hours)
      }
    })
    toast.success('Weekly goals saved!')
  }

  function handleExport() {
    exportData()
    toast.success('Data exported successfully!')
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      const success = importData(text)
      if (success) {
        toast.success('Data imported! Refresh the page to see changes.')
      } else {
        toast.error('Invalid backup file.')
      }
    } catch {
      toast.error('Failed to read file.')
    }
    setImporting(false)
    e.target.value = ''
  }

  function handleClearAll() {
    if (!window.confirm('This will permanently delete ALL your data. Are you sure?')) return
    localStorage.clear()
    toast.success('All data cleared. Refreshing...')
    setTimeout(() => window.location.reload(), 1000)
  }

  function handleAddDomain(e: React.FormEvent) {
    e.preventDefault()
    if (!newDomainName.trim()) return
    addDomain(newDomainName.trim(), newDomainColor, newDomainTarget)
    toast.success(`Domain "${newDomainName.trim()}" created!`)
    setNewDomainName('')
    setNewDomainColor(DEFAULT_DOMAIN_COLORS[0])
    setNewDomainTarget(20)
    setShowDomainDialog(false)
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Theme */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5 text-primary" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-muted-foreground">Toggle between dark and light mode</p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Data stats */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              Data Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between rounded-lg bg-muted/50 p-2">
                <span className="text-muted-foreground">Domains</span>
                <Badge variant="secondary">{domains.length}</Badge>
              </div>
              <div className="flex justify-between rounded-lg bg-muted/50 p-2">
                <span className="text-muted-foreground">Opportunities</span>
                <Badge variant="secondary">{opportunities.length}</Badge>
              </div>
              <div className="flex justify-between rounded-lg bg-muted/50 p-2">
                <span className="text-muted-foreground">Journal Entries</span>
                <Badge variant="secondary">{dailyLogs.length}</Badge>
              </div>
              <div className="flex justify-between rounded-lg bg-muted/50 p-2">
                <span className="text-muted-foreground">Habits</span>
                <Badge variant="secondary">{habits.length}</Badge>
              </div>
              <div className="flex justify-between rounded-lg bg-muted/50 p-2">
                <span className="text-muted-foreground">Goals</span>
                <Badge variant="secondary">{goals.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domain Management */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Life Domains
              </span>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowDomainDialog(true)}>
                <Plus className="h-3 w-3" />Add
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {domains.map((domain) => (
              <div key={domain.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2">
                <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: domain.color_theme }} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{domain.name}</p>
                  {domain.target_percentage != null && domain.target_percentage > 0 && (
                    <p className="text-xs text-muted-foreground">Target: {domain.target_percentage}%</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Weekly Goals */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Weekly Goals
              </span>
              <Button size="sm" className="gap-1" onClick={handleSaveWeeklyTargets}>
                <Save className="h-3 w-3" />Save
              </Button>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Define how many tasks to complete and hours of focus per domain each week.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {domains.map((domain) => {
              const current = editingTargets[domain.id] || { opp: 0, hours: 0 }
              return (
                <div key={domain.id} className="rounded-lg bg-muted/50 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: domain.color_theme }} />
                    <span className="text-sm font-medium">{domain.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Tasks / week</Label>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={current.opp}
                        onChange={(e) => setEditingTargets(prev => ({
                          ...prev,
                          [domain.id]: { ...prev[domain.id] || { opp: 0, hours: 0 }, opp: Number(e.target.value) },
                        }))}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Hours / week</Label>
                      <Input
                        type="number"
                        min={0}
                        max={80}
                        step={0.5}
                        value={current.hours}
                        onChange={(e) => setEditingTargets(prev => ({
                          ...prev,
                          [domain.id]: { ...prev[domain.id] || { opp: 0, hours: 0 }, hours: Number(e.target.value) },
                        }))}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Export/Import */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5 text-primary" />
              Backup & Restore
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleExport} className="w-full gap-2">
              <Download className="h-4 w-4" />Export All Data
            </Button>
            <Button onClick={handleImportClick} variant="outline" className="w-full gap-2" disabled={importing}>
              <Upload className="h-4 w-4" />{importing ? 'Importing...' : 'Import Backup'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-xs text-muted-foreground">
              Exports all opportunities, journal entries, habits, goals, and XP progress as a JSON file.
            </p>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="rounded-xl border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="destructive" onClick={handleClearAll} className="w-full gap-2">
              <Trash2 className="h-4 w-4" />Clear All Data
            </Button>
            <p className="text-xs text-muted-foreground">
              This will permanently delete all your data including opportunities, journal, habits, goals, and XP progress.
            </p>
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <LogOut className="h-5 w-5 text-primary" />
              Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user && (
              <p className="text-sm text-muted-foreground">
                Logado como: <span className="font-medium text-foreground">{user.email}</span>
              </p>
            )}
            <Button variant="outline" onClick={signOut} className="w-full gap-2">
              <LogOut className="h-4 w-4" />Sair da conta
            </Button>
          </CardContent>
        </Card>

        {/* Transcription History */}
        <TranscriptionHistory />

        {/* About */}
        <Card className="rounded-xl lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5 text-primary" />
              About LifeOS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              LifeOS is a gamified personal growth platform combining GTD, strategic planning, and gamification.
              Data is stored locally in your browser. Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">?</kbd> to view keyboard shortcuts.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Domain Dialog */}
      <Dialog open={showDomainDialog} onOpenChange={setShowDomainDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Life Domain</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddDomain} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newDomainName}
                onChange={(e) => setNewDomainName(e.target.value)}
                placeholder="e.g. Spirituality, Side Projects"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_DOMAIN_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewDomainColor(color)}
                    className={cn(
                      'h-8 w-8 rounded-full transition-all',
                      newDomainColor === color && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Target Percentage (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={newDomainTarget}
                onChange={(e) => setNewDomainTarget(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">The ideal balance percentage for this domain.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDomainDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={!newDomainName.trim()}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
