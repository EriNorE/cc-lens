import { NextResponse } from 'next/server'
import { readSessionMeta, readFacet } from '@/lib/claude-reader'
import { estimateCostFromUsage } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const [meta, facet] = await Promise.all([readSessionMeta(id), readFacet(id)])

  if (!meta) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const estimated_cost = estimateCostFromUsage('claude-opus-4-6', {
    input_tokens: meta.input_tokens ?? 0,
    output_tokens: meta.output_tokens ?? 0,
    cache_creation_input_tokens: meta.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: meta.cache_read_input_tokens ?? 0,
  })

  return NextResponse.json({ session: { ...meta, facet, estimated_cost } })
}
