import { useState, useCallback, useEffect } from 'react'
import type { Template, TemplateCategory } from '@/lib/db/schema-templates'
import { STORAGE_KEY_TEMPLATES } from '@/lib/db/schema-templates'

function loadTemplates(): Template[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TEMPLATES)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

function saveTemplates(templates: Template[]) {
  localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates))
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>(loadTemplates)

  useEffect(() => {
    saveTemplates(templates)
  }, [templates])

  const addTemplate = useCallback((template: Template) => {
    setTemplates(prev => [template, ...prev])
  }, [])

  const updateTemplate = useCallback((id: string, updates: Partial<Template>) => {
    setTemplates(prev => prev.map(t =>
      t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
    ))
  }, [])

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id))
  }, [])

  const duplicateTemplate = useCallback((id: string) => {
    setTemplates(prev => {
      const source = prev.find(t => t.id === id)
      if (!source) return prev
      const now = new Date().toISOString()
      const copy: Template = {
        ...source,
        id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: `${source.name} (Copy)`,
        version: 1,
        versions: [],
        created_at: now,
        updated_at: now,
      }
      return [copy, ...prev]
    })
  }, [])

  const saveNewVersion = useCallback((id: string, newBody: string) => {
    setTemplates(prev => prev.map(t => {
      if (t.id !== id) return t
      const now = new Date().toISOString()
      const versions = [...t.versions, { version: t.version, body: t.body, updated_at: t.updated_at }]
      return { ...t, body: newBody, version: t.version + 1, versions, updated_at: now }
    }))
  }, [])

  const togglePublic = useCallback((id: string) => {
    setTemplates(prev => prev.map(t =>
      t.id === id ? { ...t, is_public: !t.is_public, updated_at: new Date().toISOString() } : t
    ))
  }, [])

  const filterByCategory = useCallback((category: TemplateCategory | 'all') => {
    if (category === 'all') return templates
    return templates.filter(t => t.category === category)
  }, [templates])

  const searchTemplates = useCallback((query: string) => {
    if (!query.trim()) return templates
    const q = query.toLowerCase()
    return templates.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q)) ||
      t.category.toLowerCase().includes(q)
    )
  }, [templates])

  return {
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    saveNewVersion,
    togglePublic,
    filterByCategory,
    searchTemplates,
  }
}
