import { createHash } from 'crypto'
import { callClaude } from '@/lib/ai/generate'
import { getRecentConversationItems, upsertConversationTheme, ageConversationThemes } from '@/lib/domain/conversations'
import type { ConversationItem } from '@/types/domain'
import type { ActiveThemeSummary } from './analysis'

interface ThemeCluster {
  title: string
  summary: string
  themeScore: number
  itemIds: string[]
  sourceIds: string[]
}

function themeHash(workspaceId: string, title: string): string {
  const normalized = title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
  return createHash('sha256').update(`${workspaceId}:${normalized}`).digest('hex').slice(0, 64)
}

export async function detectAndSaveThemes(workspaceId: string): Promise<ActiveThemeSummary[]> {
  const itemsResult = await getRecentConversationItems(workspaceId, 7)
  if (!itemsResult.ok || itemsResult.data.length < 3) return []

  const themes = await detectThemes(itemsResult.data)
  const saved: ActiveThemeSummary[] = []

  for (const theme of themes) {
    if (theme.sourceIds.length < 2) continue

    await upsertConversationTheme({
      workspaceId,
      title: theme.title,
      summary: theme.summary,
      themeScore: theme.themeScore,
      contentHash: themeHash(workspaceId, theme.title),
      itemIds: theme.itemIds,
    })

    saved.push({
      title: theme.title,
      themeScore: theme.themeScore,
      sourceCount: theme.sourceIds.length,
    })
  }

  await ageConversationThemes(workspaceId)

  return saved
}

async function detectThemes(items: ConversationItem[]): Promise<ThemeCluster[]> {
  const capped = items.slice(0, 30)
  const itemList = capped
    .map((item, i) => `[${i}] ID:${item.id} | SRC:${item.sourceId} | ${item.title ?? 'Untitled'} | ${item.excerpt?.slice(0, 100) ?? ''}`)
    .join('\n')

  const result = await callClaude({
    systemPrompt: `You identify emerging themes across a set of recently published articles from different sources.

Return a JSON array of 2-5 theme clusters. Each theme must have:
- title: concise theme name (max 60 chars)
- summary: 1-2 sentences describing what this theme is about and why it matters
- themeScore: 0-100, higher if more sources cover it and topic is timely
- itemIndices: array of item indices (the numbers in brackets) that belong to this theme

Items from the same source (SRC field) count less than items from different sources.
A strong theme has articles from multiple different sources discussing the same topic.
Skip themes where all items share the same SRC value.

Return ONLY valid JSON — no commentary:
[{"title":"<title>","summary":"<summary>","themeScore":<n>,"itemIndices":[<indices>]}]`,
    userMessage: `Articles to cluster:\n${itemList}`,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 1024,
  })

  return parseThemeResult(result.content, capped)
}

function parseThemeResult(raw: string, items: ConversationItem[]): ThemeCluster[] {
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    return (Array.isArray(parsed) ? parsed : [])
      .slice(0, 5)
      .map((t: Record<string, unknown>) => {
        const indices = (Array.isArray(t.itemIndices) ? t.itemIndices : [])
          .filter((i: unknown) => typeof i === 'number' && i >= 0 && i < items.length) as number[]
        const clusterItems = indices.map(i => items[i])
        return {
          title: String(t.title ?? '').slice(0, 100),
          summary: String(t.summary ?? ''),
          themeScore: Math.min(100, Math.max(0, Number(t.themeScore) || 0)),
          itemIds: clusterItems.map(item => item.id),
          sourceIds: [...new Set(clusterItems.map(item => item.sourceId))],
        }
      })
      .filter(t => t.title && t.itemIds.length >= 2)
  } catch {
    return []
  }
}
