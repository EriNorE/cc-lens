'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'

const NAV = [
  { href: '/',          label: 'home',     icon: '⌂' },
  { href: '/sessions',  label: 'sessions', icon: '💬' },
  { href: '/costs',     label: 'costs',    icon: '💰' },
  { href: '/projects',  label: 'projects', icon: '📁' },
  { href: '/activity',  label: 'activity', icon: '📅' },
]

export function BottomNav() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border flex">
      {NAV.map(({ href, label, icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={[
              'flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors',
              active ? 'text-sidebar-primary' : 'text-sidebar-foreground/40 hover:text-sidebar-foreground',
            ].join(' ')}
          >
            <span className="text-base leading-none">{icon}</span>
            <span className="text-[10px] font-mono leading-none">{label}</span>
          </Link>
        )
      })}
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors text-sidebar-foreground/40 hover:text-sidebar-foreground cursor-pointer"
      >
        {theme === 'dark'
          ? <Sun className="w-4 h-4" />
          : <Moon className="w-4 h-4" />}
        <span className="text-[10px] font-mono leading-none">theme</span>
      </button>
    </nav>
  )
}
