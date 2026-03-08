import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart as PieChartIcon } from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import type { Opportunity, LifeDomain } from '@/types'

const COLORS = [
  'hsl(217, 91%, 60%)',  // primary blue
  'hsl(258, 90%, 66%)',  // accent purple
  'hsl(142, 71%, 45%)',  // green
  'hsl(38, 92%, 50%)',   // amber
  'hsl(0, 84%, 60%)',    // red
  'hsl(199, 89%, 48%)',  // cyan
]

interface DomainDistributionProps {
  opportunities: Opportunity[] | undefined
  domains: LifeDomain[] | undefined
}

export function DomainDistribution({ opportunities, domains }: DomainDistributionProps) {
  const data = useMemo(() => {
    if (!opportunities?.length || !domains?.length) return []
    const counts = new Map<string, { name: string; value: number }>()
    for (const opp of opportunities) {
      const domain = domains.find(d => d.id === opp.domain_id)
      const name = domain?.name || 'Uncategorized'
      const current = counts.get(name) || { name, value: 0 }
      current.value++
      counts.set(name, current)
    }
    return Array.from(counts.values()).sort((a, b) => b.value - a.value)
  }, [opportunities, domains])

  if (data.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
        <Card className="rounded-xl h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Domain Focus
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Add opportunities to see distribution</p>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
      <Card className="rounded-xl h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="h-4 w-4 text-primary" />
            Domain Focus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="h-[140px] w-[140px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={3}
                    animationDuration={1000}
                    strokeWidth={0}
                  >
                    {data.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '0.75rem',
                    }}
                    formatter={(value: number) => [`${value} (${Math.round(value / total * 100)}%)`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5">
              {data.slice(0, 5).map((entry, idx) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-xs truncate flex-1">{entry.name}</span>
                  <span className="text-xs font-semibold tabular-nums">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
