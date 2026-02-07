import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import type { CalendarEvent, Opportunity } from '@/types'

interface EventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (event: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>) => void
  onDelete?: (id: string) => void
  initialDate?: Date
  editEvent?: CalendarEvent | null
  opportunities?: Opportunity[]
}

const CATEGORIES: { value: CalendarEvent['category']; label: string; color: string }[] = [
  { value: 'task', label: 'Tarefa', color: '#3b82f6' },
  { value: 'meeting', label: 'Reuniao', color: '#f59e0b' },
  { value: 'focus', label: 'Foco', color: '#8b5cf6' },
  { value: 'personal', label: 'Pessoal', color: '#22c55e' },
  { value: 'reminder', label: 'Lembrete', color: '#ef4444' },
]

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Nenhuma' },
  { value: 'daily', label: 'Diaria' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
]

const REMINDER_OPTIONS = [
  { value: '0', label: 'Sem lembrete' },
  { value: '5', label: '5 minutos antes' },
  { value: '15', label: '15 minutos antes' },
  { value: '30', label: '30 minutos antes' },
  { value: '60', label: '1 hora antes' },
]

export function EventModal({
  open,
  onOpenChange,
  onSave,
  onDelete,
  initialDate,
  editEvent,
  opportunities = [],
}: EventModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState<Date>(initialDate || new Date())
  const [endDate, setEndDate] = useState<Date>(initialDate || new Date())
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [category, setCategory] = useState<CalendarEvent['category']>('task')
  const [opportunityId, setOpportunityId] = useState<string | null>(null)
  const [recurrence, setRecurrence] = useState<string>('none')
  const [reminderMinutes, setReminderMinutes] = useState<string>('15')
  const [color, setColor] = useState('#3b82f6')

  const isEditing = !!editEvent

  // Populate form when editing
  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title)
      setDescription(editEvent.description || '')
      const start = parseISO(editEvent.start)
      const end = parseISO(editEvent.end)
      setStartDate(start)
      setEndDate(end)
      setStartTime(format(start, 'HH:mm'))
      setEndTime(format(end, 'HH:mm'))
      setCategory(editEvent.category)
      setOpportunityId(editEvent.opportunity_id)
      setRecurrence(editEvent.recurrence || 'none')
      setReminderMinutes(editEvent.reminder_minutes?.toString() || '0')
      setColor(editEvent.color)
    } else {
      resetForm()
      if (initialDate) {
        setStartDate(initialDate)
        setEndDate(initialDate)
      }
    }
  }, [editEvent, initialDate, open])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setStartDate(new Date())
    setEndDate(new Date())
    setStartTime('09:00')
    setEndTime('10:00')
    setCategory('task')
    setOpportunityId(null)
    setRecurrence('none')
    setReminderMinutes('15')
    setColor('#3b82f6')
  }

  const handleCategoryChange = (value: CalendarEvent['category']) => {
    setCategory(value)
    const cat = CATEGORIES.find(c => c.value === value)
    if (cat) setColor(cat.color)
  }

  const handleOpportunitySelect = (value: string) => {
    if (value === 'none') {
      setOpportunityId(null)
      return
    }
    setOpportunityId(value)
    const opp = opportunities.find(o => o.id === value)
    if (opp) {
      if (!title) setTitle(opp.title)
      if (!description && opp.description) setDescription(opp.description)
      if (opp.domain?.color_theme) setColor(opp.domain.color_theme)
    }
  }

  const handleSave = () => {
    if (!title.trim()) return

    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)

    const start = new Date(startDate)
    start.setHours(startHour, startMinute, 0, 0)

    const end = new Date(endDate)
    end.setHours(endHour, endMinute, 0, 0)

    onSave({
      title: title.trim(),
      description: description.trim() || null,
      start: start.toISOString(),
      end: end.toISOString(),
      color,
      category,
      opportunity_id: opportunityId,
      reminder_minutes: parseInt(reminderMinutes) || null,
      recurrence: recurrence === 'none' ? null : recurrence as CalendarEvent['recurrence'],
    })

    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize os detalhes do evento' : 'Adicione um novo evento ao seu calendario'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">Titulo</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Reuniao com equipe"
            />
          </div>

          {/* Category */}
          <div className="grid gap-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Link to Opportunity */}
          {opportunities.length > 0 && (
            <div className="grid gap-2">
              <Label>Vincular a Oportunidade</Label>
              <Select
                value={opportunityId || 'none'}
                onValueChange={handleOpportunitySelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {opportunities.filter(o => o.status !== 'done').map(opp => (
                    <SelectItem key={opp.id} value={opp.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: opp.domain?.color_theme || '#888' }}
                        />
                        <span className="truncate">{opp.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Descricao</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes do evento..."
              rows={2}
            />
          </div>

          {/* Start Date + Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Data de inicio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, 'PP', { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(date)
                        setEndDate(date)
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="start-time">Horario</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          {/* End Date + Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Data de termino</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, 'PP', { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-time">Horario</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Recurrence + Reminder */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Recorrencia</Label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Lembrete</Label>
              <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2">
          {isEditing && onDelete && editEvent && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete(editEvent.id)
                onOpenChange(false)
              }}
              className="mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {isEditing ? 'Atualizar' : 'Salvar evento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
