import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useTranslation } from '@/contexts/LanguageContext'
import type { ReportSection, ReportTemplate } from '@/lib/reports/generate-pdf'

interface ReportOptionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sections: ReportSection[]
  onSectionsChange: (sections: ReportSection[]) => void
  periodType: 'weekly' | 'monthly' | 'custom'
  onPeriodTypeChange: (type: 'weekly' | 'monthly' | 'custom') => void
  template: ReportTemplate
  onTemplateChange: (template: ReportTemplate) => void
  onGenerate: () => void
}

export function ReportOptionsModal({
  open,
  onOpenChange,
  sections,
  onSectionsChange,
  periodType,
  onPeriodTypeChange,
  template,
  onTemplateChange,
  onGenerate,
}: ReportOptionsModalProps) {
  const { t } = useTranslation()

  function toggleSection(id: string) {
    onSectionsChange(
      sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s)
    )
  }

  function selectAll() {
    onSectionsChange(sections.map(s => ({ ...s, visible: true })))
  }

  function deselectAll() {
    onSectionsChange(sections.map(s => ({ ...s, visible: false })))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('reports.options')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('reports.periodType')}</Label>
            <Select value={periodType} onValueChange={(v) => onPeriodTypeChange(v as 'weekly' | 'monthly' | 'custom')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{t('reports.weekly')}</SelectItem>
                <SelectItem value="monthly">{t('reports.monthly')}</SelectItem>
                <SelectItem value="custom">{t('reports.custom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('reports.sections')}</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>{t('common.all')}</Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>{t('common.none')}</Button>
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sections.map(section => (
                <div key={section.id} className="flex items-center justify-between py-1">
                  <span className="text-sm">{section.title}</span>
                  <Switch
                    checked={section.visible}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>{t('reports.template')}</Label>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">{t('reports.headerText')}</Label>
                <Input
                  value={template.headerText}
                  onChange={(e) => onTemplateChange({ ...template, headerText: e.target.value })}
                  placeholder="LifeOS Report"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('reports.footerText')}</Label>
                <Input
                  value={template.footerText}
                  onChange={(e) => onTemplateChange({ ...template, footerText: e.target.value })}
                  placeholder={t('reports.footerPlaceholder')}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('reports.showLogo')}</span>
                <Switch
                  checked={template.showLogo}
                  onCheckedChange={(checked) => onTemplateChange({ ...template, showLogo: checked })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('reports.accentColor')}</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={template.accentColor}
                    onChange={(e) => onTemplateChange({ ...template, accentColor: e.target.value })}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground">{template.accentColor}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => { onGenerate(); onOpenChange(false) }}>
            {t('reports.generate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
