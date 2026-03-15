'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'

const NAV = [
  { href: '/',          label: 'overview'  },
  { href: '/projects',  label: 'projects'  },
  { href: '/sessions',  label: 'sessions'  },
  { href: '/costs',     label: 'costs'     },
  { href: '/tools',     label: 'tools'     },
  { href: '/activity',  label: 'activity'  },
  { href: '/history',   label: 'history'   },
  { href: '/todos',     label: 'todos'     },
  { href: '/plans',     label: 'plans'     },
  { href: '/memory',    label: 'memory'    },
  { href: '/settings',  label: 'settings'  },
  { href: '/export',    label: 'export'    },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 flex-col border-r border-sidebar-border bg-sidebar z-40">
      <div className="px-4 pt-5 pb-4 border-b border-sidebar-border">
        <span
          className="text-[#c2703a] text-[12px] leading-none whitespace-nowrap"
          style={{
            fontFamily: 'var(--font-press-start)',
            WebkitTextStroke: '0.5px #c2703a',
            textShadow: '1px 1px 0 #7a3a1a',
          }}
        >
          Claude Code Lens
        </span>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-2.5 px-4 py-3 rounded-r text-base font-mono transition-colors relative',
                active
                  ? 'text-sidebar-primary bg-sidebar-accent border-l-2 border-l-sidebar-primary pl-[14px]'
                  : 'text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/80',
              ].join(' ')}
            >
              <span className={active ? 'text-sidebar-primary' : 'text-sidebar-foreground/40'}>›</span>
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-sidebar-border flex items-center justify-between">
        <p className="text-sm text-sidebar-foreground/50 font-mono">Made by Arindam</p>
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="p-1.5 rounded text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  )
}
