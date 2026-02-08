import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { getSessions, revokeSession, type SessionInfo } from '@/lib/auth/sessions'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'

export function SessionsList() {
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSessions().then(setSessions).finally(() => setLoading(false))
  }, [])

  async function handleRevoke(sessionId: string) {
    const { error } = await revokeSession(sessionId)
    if (error) toast.error(error)
    else {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      toast.success('Session revoked')
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading sessions...</p>
  if (sessions.length === 0) return <p className="text-sm text-muted-foreground">No other sessions.</p>

  return (
    <ul className="space-y-2">
      {sessions.map((s) => (
        <li
          key={s.id}
          className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
        >
          <span>
            {s.device ?? 'Device'} {s.current && <span className="text-muted-foreground">(this device)</span>}
          </span>
          {!s.current && (
            <Button variant="ghost" size="sm" onClick={() => handleRevoke(s.id)}>
              <LogOut className="h-4 w-4" /> Revoke
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
