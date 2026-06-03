import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Removes signal_cards that are financial/stock-market spam:
// - cards where any keyword tag matches "symbol:" or "category: earnings|small cap|..."
// - cards whose titles look like earnings reports or stock offering announcements
const SPAM_TAG_PATTERNS = [
  /^"?symbol:/i,
  /^"?category:\s*(earnings|small cap|large cap|mid cap)/i,
]

const SPAM_TITLE_PATTERNS =
  /\b(announces? pricing of|reports (first|second|third|fourth|q[1-4]) quarter|provides capital markets update|fy\d{2} results)\b/i

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Fetch all signal_cards in batches
  let deletedCount = 0
  let from = 0
  const batchSize = 500

  while (true) {
    const { data: cards, error } = await supabase
      .from('signal_cards')
      .select('id, title, tags')
      .range(from, from + batchSize - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!cards || cards.length === 0) break

    const spamIds = cards
      .filter((card) => {
        const tags = card.tags ?? []
        const hasSpamTag = tags.some((t: string) =>
          SPAM_TAG_PATTERNS.some(p => p.test(t))
        )
        const hasSpamTitle = SPAM_TITLE_PATTERNS.test(card.title ?? '')
        return hasSpamTag || hasSpamTitle
      })
      .map((card) => card.id)

    if (spamIds.length > 0) {
      await supabase.from('signal_cards').delete().in('id', spamIds)
      deletedCount += spamIds.length
    }

    if (cards.length < batchSize) break
    from += batchSize
  }

  return NextResponse.json({ deleted: deletedCount })
}
