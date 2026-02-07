import { NavLink } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, Target, BarChart3, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

const items = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/consultant', icon: MessageSquare, label: 'Advisor' },
  { to: '/opportunities', icon: Target, label: 'Tasks' },
  { to: '/analytics', icon: BarChart3, label: 'Stats' },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-center justify-around border-t bg-background/95 backdrop-blur md:hidden">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 py-2 text-xs',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="fixed right-4 top-4 z-50 hidden md:block">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <div className="mt-6 flex flex-col gap-2">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                      isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
