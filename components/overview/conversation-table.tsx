'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatTokens, formatRelativeDate, projectDisplayName } from '@/lib/decode'
import type { SessionWithFacet } from '@/types/claude'

type FilterType = 'active' | 'recent' | 'inactive' | 'all'

interface Props {
  sessions: SessionWithFacet[]
}

function shortId(id: string): string {
  return id.slice(0, 8) + '...'
}

function shortModel(): string {
  return 'claude-sonnet-4-...'
}

export function OverviewConversationTable({ sessions }: Props) {
  const [filter, setFilter] = useState<FilterType>('recent')

  const filtered = useMemo(() => {
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    const oneWeek = 7 * oneDay

    let result: SessionWithFacet[]
    switch (filter) {
      case 'active':
        result = sessions.filter((s) => {
          const t = new Date(s.start_time).getTime()
          return now - t < oneDay
        })
        break
      case 'recent':
        result = sessions.filter((s) => {
          const t = new Date(s.start_time).getTime()
          return now - t < oneWeek
        })
        break
      case 'inactive':
        result = sessions.filter((s) => {
          const t = new Date(s.start_time).getTime()
          return now - t >= oneWeek
        })
        break
      default:
        result = sessions
    }
    return result.sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    )
  }, [sessions, filter])

  const displaySessions = filtered.slice(0, 10)

  const FilterButton = ({ value, label }: { value: FilterType; label: string }) => (
    <button
      onClick={() => setFilter(value)}
      className={[
        'px-3 py-1.5 text-[13px] font-mono rounded border transition-colors',
        filter === value
          ? 'bg-primary text-primary-foreground border-primary font-bold'
          : 'bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground',
      ].join(' ')}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FilterButton value="active" label="active" />
        <FilterButton value="recent" label="recent" />
        <FilterButton value="inactive" label="inactive" />
        <FilterButton value="all" label="all" />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                  conversation id
                </th>
                <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                  project
                </th>
                <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                  model
                </th>
                <th className="px-3 py-2.5 text-right text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                  messages
                </th>
                <th className="px-3 py-2.5 text-right text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                  tokens
                </th>
                <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                  last activity
                </th>
                <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                  conversation state
                </th>
                <th className="px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                  status
                </th>
              </tr>
            </thead>
            <tbody>
              {displaySessions.map((s, i) => {
                const totalMsgs = (s.user_message_count ?? 0) + (s.assistant_message_count ?? 0)
                const totalTokens = (s.input_tokens ?? 0) + (s.output_tokens ?? 0)
                const projectName = projectDisplayName(s.project_path ?? '')
                const isRecent = Date.now() - new Date(s.start_time).getTime() < 24 * 60 * 60 * 1000
                const status = isRecent ? 'active' : 'inactive'

                return (
                  <tr
                    key={s.session_id}
                    className={`border-b border-border/60 hover:bg-muted/50 transition-colors ${
                      i % 2 === 0 ? '' : 'bg-muted/30'
                    }`}
                  >
                    <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block w-2 h-2 rounded-sm shrink-0 bg-primary/50"
                          title={s.session_id}
                        />
                        <Link
                          href={`/sessions/${s.session_id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {shortId(s.session_id)}
                        </Link>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/sessions/${s.session_id}`}
                        className="text-foreground hover:text-primary transition-colors font-medium"
                      >
                        {projectName}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground font-mono">{shortModel()}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {totalMsgs.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-primary">
                      {formatTokens(totalTokens)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatRelativeDate(s.start_time) === 'just now' ? 'now' : formatRelativeDate(s.start_time)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">Completed</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          status === 'active'
                            ? 'text-[#34d399] font-medium'
                            : 'text-muted-foreground/50'
                        }
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {displaySessions.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-muted-foreground/60 text-[13px]"
                  >
                    No conversations match filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
