import { createServiceClient } from '@/lib/supabase/service'

export function toTitleCase(text: string): string {
  return text.trim().replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function saveCustomAudience(
  workspaceId: string,
  rawText: string,
): Promise<void> {
  const value = toTitleCase(rawText)
  if (!value) return

  const supabase = createServiceClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('custom_audiences')
    .eq('id', workspaceId)
    .single()

  const existing: string[] = workspace?.custom_audiences ?? []
  const alreadySaved = existing.some(
    (a) => a.toLowerCase() === value.toLowerCase(),
  )
  if (alreadySaved) return

  await supabase
    .from('workspaces')
    .update({ custom_audiences: [...existing, value] })
    .eq('id', workspaceId)
}
