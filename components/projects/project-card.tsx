'use client'

import Link from 'next/link'
import { formatCost, formatDuration, formatRelativeDate } from '@/lib/decode'
import { CATEGORY_COLORS, categorizeTool } from '@/lib/tool-categories'
import type { ProjectSummary } from '@/types/claude'

const LANG_COLORS: Record<string, string> = {
  TypeScript:  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
  JavaScript:  'bg-yellow-400/10 text-yellow-700 dark:text-yellow-400 border-yellow-400/30',
  Python:      'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25',
  Rust:        'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/25',
  Go:          'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/25',
  Java:        'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25',
  'C++':       'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/25',
  C:           'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/25',
  'C#':        'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/25',
  Ruby:        'bg-red-400/10 text-red-600 dark:text-red-400 border-red-400/25',
  PHP:         'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/25',
  Swift:       'bg-orange-400/10 text-orange-600 dark:text-orange-400 border-orange-400/25',
  Kotlin:      'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25',
  CSS:         'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25',
  HTML:        'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
  Shell:       'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
  Bash:        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
  Markdown:    'bg-gray-400/10 text-gray-600 dark:text-gray-400 border-gray-400/25',
  JSON:        'bg-amber-400/10 text-amber-700 dark:text-amber-400 border-amber-400/25',
  YAML:        'bg-lime-500/10 text-lime-700 dark:text-lime-500 border-lime-500/25',
  Dockerfile:  'bg-blue-400/10 text-blue-600 dark:text-blue-400 border-blue-400/25',
  Scala:       'bg-red-600/10 text-red-700 dark:text-red-400 border-red-600/25',
  Elixir:      'bg-purple-600/10 text-purple-700 dark:text-purple-400 border-purple-600/25',
  Haskell:     'bg-violet-600/10 text-violet-700 dark:text-violet-400 border-violet-600/25',
  Lua:         'bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-600/25',
  TOML:        'bg-orange-300/10 text-orange-600 dark:text-orange-400 border-orange-300/25',
}

const FALLBACK_PALETTE = [
  'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/25',
  'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-500/25',
  'bg-lime-500/10 text-lime-700 dark:text-lime-400 border-lime-500/25',
  'bg-sky-600/10 text-sky-700 dark:text-sky-400 border-sky-600/25',
  'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
  'bg-amber-600/10 text-amber-700 dark:text-amber-400 border-amber-600/25',
]

function langColor(lang: string): string {
  if (LANG_COLORS[lang]) return LANG_COLORS[lang]
  let hash = 0
  for (let i = 0; i < lang.length; i++) hash = (hash * 31 + lang.charCodeAt(i)) >>> 0
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length]
}

interface Props {
  project: ProjectSummary
}

export function ProjectCard({ project }: Props) {
  const topTools = Object.entries(project.tool_counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
  const maxToolCount = topTools[0]?.[1] ?? 1

  const topLangs = Object.entries(project.languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="block border border-border rounded-lg bg-card p-4 hover:border-primary/40 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
          {project.display_name}
        </h3>
        <span className="text-[12px] text-muted-foreground/60 whitespace-nowrap flex-shrink-0">
          {formatRelativeDate(project.last_active)}
        </span>
      </div>

      <p className="text-[12px] text-muted-foreground/50 font-mono truncate mb-2">
        {project.project_path}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3 text-[12px]">
        {topLangs.map(([lang]) => (
          <span key={lang} className={`px-1.5 py-0.5 rounded border ${langColor(lang)}`}>
            {lang}
          </span>
        ))}
        {project.uses_mcp && (
          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[12px]">
            🔌 mcp
          </span>
        )}
        {project.uses_task_agent && (
          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[12px]">
            🤖 agent
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-[12px] text-muted-foreground mb-3">
        <span>{project.session_count} sessions</span>
        <span>·</span>
        <span>{project.total_messages.toLocaleString()} msgs</span>
        <span>·</span>
        <span>{formatDuration(project.total_duration_minutes)}</span>
        {(project.total_lines_added ?? 0) > 0 && (
          <>
            <span>·</span>
            <span className="text-green-400">+{project.total_lines_added.toLocaleString()}</span>
            <span className="text-red-400">-{project.total_lines_removed.toLocaleString()}</span>
          </>
        )}
      </div>

      {/* Mini tool bar */}
      {topTools.length > 0 && (
        <div className="space-y-0.5">
          {topTools.map(([tool, count]) => {
            const cat = categorizeTool(tool)
            const color = CATEGORY_COLORS[cat]
            const width = Math.max(8, Math.round((count / maxToolCount) * 100))
            return (
              <div key={tool} className="flex items-center gap-1.5 text-[11px]">
                <span className="text-muted-foreground/50 w-16 truncate">{tool}</span>
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color + '80' }} />
                </div>
                <span className="text-muted-foreground/40 w-8 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Branches */}
      {project.branches.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/30">
          {project.branches.slice(0, 4).map(b => (
            <span key={b} className="text-[11px] px-1 py-0.5 rounded bg-muted text-muted-foreground/50 border border-border/30">
              {b}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-border/30 flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground/50">est. cost</span>
        <span className="text-[12px] font-bold text-primary">{formatCost(project.estimated_cost)}</span>
      </div>
    </Link>
  )
}
