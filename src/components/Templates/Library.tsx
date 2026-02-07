import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, FileText } from 'lucide-react'
import { TEMPLATE_CATEGORIES } from '@/lib/db/schema-templates'

const MOCK_TEMPLATES = [
  { id: '1', name: 'Daily standup', description: 'Quick daily log', category: 'journal', body: '## Standup\n- Done: {{done}}\n- Today: {{today}}' },
  { id: '2', name: 'Project kickoff', description: 'New project template', category: 'project', body: '# {{title}}\nGoal: {{goal}}\nDomain: {{domain}}' },
  { id: '3', name: 'Task', description: 'Single task', category: 'task', body: 'Task: {{title}}\nDue: {{date}}' },
]

export function TemplatesLibrary() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')

  const filtered = MOCK_TEMPLATES.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'all' || t.category === category
    return matchSearch && matchCat
  })

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Template Library</h1>
        <p className="text-muted-foreground">Reusable templates for projects, tasks, and journal.</p>
      </header>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={category === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setCategory('all')}>All</Button>
          {TEMPLATE_CATEGORIES.map(c => (
            <Button key={c} variant={category === c ? 'default' : 'outline'} size="sm" onClick={() => setCategory(c)}>{c}</Button>
          ))}
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New template</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(t => (
          <Card key={t.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{t.name}</CardTitle>
              </div>
              <Badge variant="secondary" className="w-fit">{t.category}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>
              <Button variant="outline" size="sm" className="mt-3 w-full">Use template</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
