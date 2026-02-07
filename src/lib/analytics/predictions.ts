/**
 * Simple trend and predictions for analytics (no ML; linear extrapolation).
 */

export interface DataPoint {
  date: string
  value: number
}

export interface PredictionResult {
  trend: 'up' | 'down' | 'stable'
  changePercent: number
  nextPeriodEstimate: number
  message: string
}

function linearSlope(points: DataPoint[]): number {
  if (points.length < 2) return 0
  const n = points.length
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  points.forEach((p, i) => {
    const x = i, y = p.value
    sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x
  })
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return 0
  return (n * sumXY - sumX * sumY) / denom
}

export function predictTrend(points: DataPoint[], label = 'value'): PredictionResult {
  if (points.length === 0) {
    return { trend: 'stable', changePercent: 0, nextPeriodEstimate: 0, message: 'Not enough data' }
  }
  const slope = linearSlope(points)
  const last = points[points.length - 1]?.value ?? 0
  const first = points[0]?.value ?? 0
  const changePercent = first !== 0 ? Math.round(((last - first) / first) * 100) : (last > 0 ? 100 : 0)
  const nextEstimate = Math.max(0, Math.round(last + slope))
  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (changePercent > 5) trend = 'up'
  else if (changePercent < -5) trend = 'down'
  const message = trend === 'up'
    ? `Trending up. Next period estimate: ~${nextEstimate} ${label}.`
    : trend === 'down'
      ? `Trending down. Consider adjusting goals. Next estimate: ~${nextEstimate} ${label}.`
      : `Stable. Next period estimate: ~${nextEstimate} ${label}.`
  return { trend, changePercent, nextPeriodEstimate: nextEstimate, message }
}
