import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { DEMO_TOPICS, DEMO_RELATIONSHIPS } from '@/lib/knowledge/demo-data'

// TODO: Future — generate workspace-specific topics from workspace_feed_settings.services/content_topics
// Seed topics per the user's field/industry using AI analysis of their profile.
// Example: Healthcare Architecture → Trauma-Informed Design, Biophilic Design
//          Marketing Agency → Positioning, Demand Generation, Category Design
//
// TODO: Knowledge Graph — future visualization of KnowledgeRelationship edges:
//   Positioning → depends_on → Market Segmentation → related_to → Brand Strategy
//   Render as interactive node graph in /knowledge/graph route.
//
// TODO: Knowledge Intelligence Vision — long-term architecture:
//   Industry Signals (what's happening?)
//     → Knowledge Signals (why does it matter? what should I understand?)
//       → Website Intelligence (what should I promote?)
//         → Content Generation (what should I publish?)
//   All Signal Intelligence products should feed into this vertical.

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    topics: DEMO_TOPICS,
    relationships: DEMO_RELATIONSHIPS,
  })
}
