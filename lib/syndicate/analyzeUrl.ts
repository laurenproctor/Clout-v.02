import { createClient } from '@/lib/supabase/server'
import { extractContent } from './extract/extractContent'
import { extractSignals } from './signals/extractSignals'
import { generateNarrativeShape } from './analysis/generateNarrativeShape'
import { generateStrategicRead } from './analysis/generateStrategicRead'
import { generateCounterfactual } from './analysis/generateCounterfactual'
import type { SyndicateAnalysisResult, ExtractedContent, NarrativeShape, StrategicRead, CounterfactualAnalysis, AnalysisPhase } from './types/analysis'
import type { ContentSignal } from './types/signals'

export const ANALYSIS_VERSION = '1.0.0'
export const SIGNAL_VERSION = '1.0.0'
export const ONTOLOGY_VERSION = '1.0.0'
export const PROMPT_VERSION = '1.0.0'

export type ProgressCallback = (phase: AnalysisPhase) => void

export async function analyzeUrl(
  url: string,
  workspaceId: string,
  userId: string,
  onProgress?: ProgressCallback,
): Promise<SyndicateAnalysisResult> {
  const timingMs: Record<string, number> = {}

  async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now()
    const result = await fn()
    timingMs[label] = Date.now() - start
    return result
  }

  // Create session record immediately — types cast to any since migration hasn't run yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any

  const { data: session, error: sessionError } = await supabase
    .from('syndicate_sessions')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      source_url: url,
      status: 'processing',
      analysis_version: ANALYSIS_VERSION,
      signal_version: SIGNAL_VERSION,
      ontology_version: ONTOLOGY_VERSION,
      prompt_version: PROMPT_VERSION,
    })
    .select('id')
    .single()

  if (sessionError) throw new Error(`Failed to create session: ${sessionError.message}`)
  const sessionId = session.id as string

  try {
    onProgress?.('extracting')
    const content: ExtractedContent = await timed('extract', () => extractContent(url))

    onProgress?.('signal_analysis')
    const signals: ContentSignal[] = await timed('signals', () => extractSignals(content))

    onProgress?.('narrative_analysis')
    const narrativeShape: NarrativeShape = await timed('narrative', () => generateNarrativeShape(content))

    onProgress?.('strategic_synthesis')
    const strategicRead: StrategicRead = await timed('strategic', () =>
      generateStrategicRead(content, signals, narrativeShape),
    )

    onProgress?.('counterfactual')
    const counterfactual: CounterfactualAnalysis = await timed('counterfactual', () =>
      generateCounterfactual(content, signals, narrativeShape),
    )

    onProgress?.('complete')

    const result: SyndicateAnalysisResult = {
      content,
      signals,
      narrativeShape,
      strategicRead,
      counterfactual,
      meta: {
        analysisVersion: ANALYSIS_VERSION,
        signalVersion: SIGNAL_VERSION,
        ontologyVersion: ONTOLOGY_VERSION,
        promptVersion: PROMPT_VERSION,
        modelSignals: 'claude-haiku-4-5-20251001',
        modelSynthesis: 'claude-sonnet-4-6',
        timingMs,
        sessionId,
      },
    }

    await supabase
      .from('syndicate_sessions')
      .update({
        source_title: content.title,
        source_type: detectSourceType(url),
        status: 'complete',
        extracted_content: content,
        raw_signals: signals,
        narrative_analysis: narrativeShape,
        strategic_read: strategicRead,
        counterfactual_analysis: counterfactual,
        timing_data: timingMs,
      })
      .eq('id', sessionId)

    return result
  } catch (err) {
    await supabase
      .from('syndicate_sessions')
      .update({ status: 'failed' })
      .eq('id', sessionId)
    throw err
  }
}

function detectSourceType(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    if (hostname.includes('substack.com')) return 'substack'
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube'
    if (hostname.includes('medium.com')) return 'medium'
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter'
    if (hostname.includes('linkedin.com')) return 'linkedin'
    return 'article'
  } catch {
    return 'unknown'
  }
}
