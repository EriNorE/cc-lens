'use client'

import { useState, useRef, useCallback } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import type { ImportDiff } from '@/types/claude'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded bg-card p-4">
      <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default function ExportPage() {
  const [exporting, setExporting] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [importDiff, setImportDiff] = useState<ImportDiff | null>(null)
  const [importError, setImportError] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    setExporting(true)
    try {
      const body: Record<string, unknown> = {}
      if (dateFrom || dateTo) body.dateRange = { from: dateFrom || undefined, to: dateTo || undefined }

      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `ccboard-export-${date}.ccboard.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function processFile(file: File) {
    setImportError('')
    setImportDiff(null)
    setImportLoading(true)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })
      if (!res.ok) {
        const err = await res.json()
        setImportError(err.error ?? 'Import failed')
        return
      }
      const diff = await res.json() as ImportDiff
      setImportDiff(diff)
    } catch (e) {
      setImportError(String(e))
    } finally {
      setImportLoading(false)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="claude-code-analytics · export / import" subtitle="export your data or merge from another machine" />
      <div className="p-6 space-y-6 max-w-2xl">
        {/* Export panel */}
        <Card title="Export Your cc-board Data">
          <div className="space-y-4">
            <div>
              <p className="text-[13px] text-muted-foreground mb-3">
                Exports stats, sessions, facets, and history as a portable <code className="text-foreground/80">.ccboard.json</code> file.
                You can import this on another machine to merge session data.
              </p>
            </div>

            <div className="flex gap-3 items-end">
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">From date (optional)</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="bg-muted border border-border rounded px-2 py-1 text-[13px] text-foreground outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">To date (optional)</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="bg-muted border border-border rounded px-2 py-1 text-[13px] text-foreground outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded bg-primary text-black text-[13px] font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? '⏳ Exporting...' : '⬇ Download Export (.ccboard.json)'}
            </button>
          </div>
        </Card>

        {/* Import panel */}
        <Card title="Import / Merge from Another Machine">
          <div className="space-y-4">
            <p className="text-[13px] text-muted-foreground">
              Import a <code className="text-foreground/80">.ccboard.json</code> file exported from another machine.
              This is an <strong className="text-foreground/80">additive merge only</strong> — existing sessions are never overwritten.
            </p>

            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragging
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <p className="text-[13px] text-muted-foreground">
                Drag <code>.ccboard.json</code> here or <span className="text-primary hover:underline">click to browse</span>
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.ccboard.json"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) processFile(file)
                }}
              />
            </div>

            {importLoading && (
              <div className="text-[13px] text-muted-foreground animate-pulse">Analyzing import file...</div>
            )}

            {importError && (
              <div className="text-[13px] text-[#f87171] border border-[#f87171]/30 rounded p-3">
                ✗ {importError}
              </div>
            )}

            {importDiff && (
              <div className="border border-border rounded p-4 space-y-2 text-[13px]">
                <p className="font-bold text-foreground">Merge Preview</p>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Sessions in export</span>
                    <span className="text-foreground font-bold">{importDiff.total_in_export}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Already present (skipped)</span>
                    <span className="text-muted-foreground/60">{importDiff.already_present}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New sessions to add</span>
                    <span className={importDiff.new_sessions > 0 ? 'text-[#34d399] font-bold' : 'text-muted-foreground/60'}>
                      {importDiff.new_sessions}
                    </span>
                  </div>
                </div>

                {importDiff.new_sessions === 0 ? (
                  <p className="text-muted-foreground/50 text-[12px] pt-1">
                    All sessions from this export are already present. Nothing to merge.
                  </p>
                ) : (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-[12px] text-amber-400">
                      ⚠ Actual merge writing to ~/.claude/ is not implemented in this version.
                      This preview shows what would be merged.
                    </p>
                    <div className="mt-2 max-h-32 overflow-auto space-y-1">
                      {importDiff.sessions_to_add.slice(0, 10).map(s => (
                        <div key={s.session_id} className="text-[12px] text-muted-foreground/60 font-mono">
                          + {s.session_id.slice(0, 8)} · {s.start_time.slice(0, 10)} · {s.project_path?.split('/').slice(-1)[0]}
                        </div>
                      ))}
                      {importDiff.sessions_to_add.length > 10 && (
                        <p className="text-[12px] text-muted-foreground/40">
                          ...and {importDiff.sessions_to_add.length - 10} more
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
