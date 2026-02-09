/**
 * Core Web Vitals reporting using the Performance API.
 * Targets: LCP < 2.5s, FID < 100ms, CLS < 0.1
 *
 * Uses native PerformanceObserver (no external dependencies).
 * Reports metrics to console in development and can be extended
 * to send to analytics in production.
 */

interface WebVitalMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

type ReportCallback = (metric: WebVitalMetric) => void

const LCP_THRESHOLD = { good: 2500, poor: 4000 }
const FID_THRESHOLD = { good: 100, poor: 300 }
const CLS_THRESHOLD = { good: 0.1, poor: 0.25 }
const FCP_THRESHOLD = { good: 1800, poor: 3000 }
const TTFB_THRESHOLD = { good: 800, poor: 1800 }

function getRating(
  value: number,
  thresholds: { good: number; poor: number }
): WebVitalMetric['rating'] {
  if (value <= thresholds.good) return 'good'
  if (value <= thresholds.poor) return 'needs-improvement'
  return 'poor'
}

function observeLCP(onReport: ReportCallback) {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1] as PerformanceEntry
      if (last) {
        const value = last.startTime
        onReport({
          name: 'LCP',
          value,
          rating: getRating(value, LCP_THRESHOLD),
        })
      }
    })
    observer.observe({ type: 'largest-contentful-paint', buffered: true })
  } catch {
    // PerformanceObserver not supported
  }
}

function observeFID(onReport: ReportCallback) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming
        const value = fidEntry.processingStart - fidEntry.startTime
        onReport({
          name: 'FID',
          value,
          rating: getRating(value, FID_THRESHOLD),
        })
      }
    })
    observer.observe({ type: 'first-input', buffered: true })
  } catch {
    // PerformanceObserver not supported
  }
}

function observeCLS(onReport: ReportCallback) {
  try {
    let clsValue = 0
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value
        }
      }
      onReport({
        name: 'CLS',
        value: clsValue,
        rating: getRating(clsValue, CLS_THRESHOLD),
      })
    })
    observer.observe({ type: 'layout-shift', buffered: true })
  } catch {
    // PerformanceObserver not supported
  }
}

function observeFCP(onReport: ReportCallback) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          onReport({
            name: 'FCP',
            value: entry.startTime,
            rating: getRating(entry.startTime, FCP_THRESHOLD),
          })
        }
      }
    })
    observer.observe({ type: 'paint', buffered: true })
  } catch {
    // PerformanceObserver not supported
  }
}

function observeTTFB(onReport: ReportCallback) {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (nav) {
      const value = nav.responseStart - nav.requestStart
      onReport({
        name: 'TTFB',
        value,
        rating: getRating(value, TTFB_THRESHOLD),
      })
    }
  } catch {
    // Not supported
  }
}

const RATING_EMOJI: Record<WebVitalMetric['rating'], string> = {
  good: '[GOOD]',
  'needs-improvement': '[NEEDS IMPROVEMENT]',
  poor: '[POOR]',
}

export function reportWebVitals() {
  const report: ReportCallback = (metric) => {
    if (import.meta.env.DEV) {
      const tag = RATING_EMOJI[metric.rating]
      const unit = metric.name === 'CLS' ? '' : 'ms'
      const val = metric.name === 'CLS' ? metric.value.toFixed(3) : Math.round(metric.value)
      console.log(`[Web Vitals] ${metric.name}: ${val}${unit} ${tag}`)
    }
  }

  observeLCP(report)
  observeFID(report)
  observeCLS(report)
  observeFCP(report)
  observeTTFB(report)
}
