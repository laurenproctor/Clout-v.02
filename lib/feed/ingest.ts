import { createServiceClient } from '@/lib/supabase/service'
import { searchLatest } from '@/lib/newsdata/client'
import { articleToSignalInsert, signalToCardInsert } from '@/lib/newsdata/mapper'
import type { FeedTab } from '@/types/feed'

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

export interface WorkspaceIngestParams {
  topics: string[]
  services: string[]
}

export async function ingestWorkspaceTopics({ topics, services }: WorkspaceIngestParams): Promise<void> {
  if (topics.length === 0 && services.length === 0) return

  const supabase = createServiceClient()

  type QueueItem = { tab: FeedTab; query: string; service?: string }
  const queue: QueueItem[] = [
    ...topics.map(t => ({ tab: 'news' as FeedTab, query: t })),
    ...services.map(s => ({ tab: 'services' as FeedTab, query: `${s} strategy OR trends`, service: s })),
  ]

  for (const item of queue) {
    try {
      await delay(300)
      const { articles } = await searchLatest(item.query)

      for (const article of articles) {
        const signalInsert = articleToSignalInsert(article)

        const { data: existingSignal } = await supabase
          .from('signals')
          .select('id')
          .eq('external_id', signalInsert.external_id)
          .maybeSingle()

        let signalId: string
        if (existingSignal) {
          signalId = existingSignal.id
        } else {
          const { data: newSignal } = await supabase
            .from('signals')
            .insert({
              external_id: signalInsert.external_id,
              source: signalInsert.source,
              title: signalInsert.title,
              source_url: signalInsert.source_url,
              published_at: signalInsert.published_at,
              tone: signalInsert.tone,
              coverage_48h_pct: signalInsert.coverage_48h_pct,
              refreshed_at: new Date().toISOString(),
            })
            .select('id')
            .single()
          if (!newSignal) continue
          signalId = newSignal.id
        }

        const { data: existingCard } = await supabase
          .from('signal_cards')
          .select('id')
          .eq('signal_id', signalId)
          .eq('tab', item.tab)
          .maybeSingle()

        const cardInsert = signalToCardInsert(
          { ...signalInsert, id: signalId },
          item.tab,
          item.service ?? item.query,
          article.keywords,
          { service: item.service }
        )

        if (existingCard) {
          await supabase
            .from('signal_cards')
            .update({ refreshed_at: new Date().toISOString(), ...cardInsert })
            .eq('id', existingCard.id)
        } else {
          await supabase
            .from('signal_cards')
            .insert({ signal_id: signalId, ...cardInsert })
        }
      }
    } catch (err) {
      console.error('[ingestWorkspaceTopics] error for query "%s":', item.query, err)
    }
  }
}
