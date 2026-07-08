import { getCapture } from '@/lib/domain/capture'

/**
 * Load the seed text for a channel creator from a universal-create brief (Capture),
 * scoped to the given workspace. Returns '' when no brief is provided, the capture
 * can't be loaded, or it belongs to a different workspace (defensive: getCapture
 * fetches by id only, and the server client bypasses RLS).
 */
export async function loadBriefSeed(
  briefCaptureId: string | undefined,
  workspaceId: string
): Promise<string> {
  if (!briefCaptureId) return ''
  const res = await getCapture(briefCaptureId)
  if (!res.ok) return ''
  if (res.data.workspaceId !== workspaceId) return ''
  return res.data.rawContent ?? res.data.transcript ?? ''
}
