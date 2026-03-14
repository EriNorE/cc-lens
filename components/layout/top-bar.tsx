'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { mutate } from 'swr'
import { Star } from 'lucide-react'

interface TopBarProps {
  title: string
  subtitle?: string
  showStarButton?: boolean
}

const GITHUB_REPO = 'https://github.com/Arindam200/cc-lens'

function formatTimestamp(d: Date) {
  return d.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function TopBar({ title, subtitle, showStarButton = false }: TopBarProps) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [now, setNow] = useState<string>('')

  useEffect(() => {
    setNow(formatTimestamp(new Date()))
    const id = setInterval(() => setNow(formatTimestamp(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    await mutate(() => true, undefined, { revalidate: true })
    router.refresh()
    setTimeout(() => setRefreshing(false), 800)
  }

  const displayTime = now || '—'

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur px-4 md:px-8 py-4 md:py-5 flex items-start justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <span className="text-primary text-lg leading-none">●</span>
          <h1 className="text-lg font-bold text-foreground tracking-tight font-mono">{title}</h1>
        </div>
        {subtitle && (
          <p className="text-base text-muted-foreground font-mono pl-6">{subtitle}</p>
        )}
        <p className="text-sm text-muted-foreground/60 font-mono pl-6">
          last update: {displayTime}
        </p>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={handleRefresh}
          className={[
            'flex items-center gap-2 px-3 md:px-5 py-2 text-sm md:text-base font-mono border rounded',
            refreshing
              ? 'text-primary border-primary/50'
              : 'text-muted-foreground border-border hover:text-foreground hover:border-primary/40',
            'transition-colors cursor-pointer',
          ].join(' ')}
        >
          {refreshing ? '↻ refreshing...' : 'refresh charts'}
        </button>
        {showStarButton && (
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2 text-base font-mono border border-[#fbbf24]/60 rounded text-[#fbbf24] bg-[#fbbf24]/10 hover:bg-[#fbbf24]/20 hover:border-[#fbbf24] transition-colors"
          >
            <Star className="w-4 h-4" />
            Star on GitHub
          </a>
        )}
      </div>
    </header>
  )
}
