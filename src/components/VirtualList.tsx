import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  overscan?: number
  className?: string
  renderItem: (item: T, index: number) => ReactNode
  getItemKey?: (item: T, index: number) => string | number
}

export function VirtualList<T>({
  items,
  itemHeight,
  overscan = 3,
  className,
  renderItem,
  getItemKey = (_, i) => i,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [height, setHeight] = useState(400)

  const updateHeight = useCallback(() => {
    if (containerRef.current) setHeight(containerRef.current.clientHeight)
  }, [])

  useEffect(() => {
    updateHeight()
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(updateHeight)
    ro.observe(el)
    return () => ro.disconnect()
  }, [updateHeight])

  const handleScroll = useCallback(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop)
  }, [])

  const totalHeight = items.length * itemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + height) / itemHeight) + overscan
  )
  const visibleItems = items.slice(startIndex, endIndex + 1)
  const offsetY = startIndex * itemHeight

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      onScroll={handleScroll}
      style={{ height: '100%', minHeight: 200 }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => {
            const index = startIndex + i
            return (
              <div
                key={getItemKey(item, index)}
                style={{ height: itemHeight }}
                className="flex items-center"
              >
                {renderItem(item, index)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
