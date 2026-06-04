import { scrapeUrl } from '@/lib/scraper'
import { callClaude } from '@/lib/ai/generate'
import type { WebsiteOpportunity, WebsiteContentGap, WebsiteAsset } from '@/types/feed'

export interface WebsiteAnalysisResult {
  items: WebsiteOpportunity[]
  gaps: WebsiteContentGap[]
  assets: WebsiteAsset[]
}

const SYSTEM_PROMPT = `You are a content strategist analyzing a company's website to identify high-impact content opportunities for LinkedIn and other professional channels.

Given the scraped content of a website homepage or page, return a JSON object with this exact structure:

{
  "assets": [
    {
      "id": "asset-1",
      "type": "homepage" | "service" | "product" | "case_study" | "testimonial" | "report" | "blog" | "resource" | "about",
      "title": "string",
      "url": "string (use the page URL)",
      "services": ["string"],
      "extracted_quotes": ["string"],
      "extracted_statistics": ["string"],
      "extracted_proof_points": ["string"]
    }
  ],
  "items": [
    {
      "id": "opp-1",
      "asset_id": "asset-1",
      "title": "string (compelling content opportunity title)",
      "score": 0-100,
      "confidence": 0-100,
      "status": "new",
      "level": "high" | "medium" | "emerging",
      "category": "promotion" | "repurpose" | "gap" | "trend_match" | "thought_leadership",
      "tags": ["string"],
      "matched_service": "string",
      "source_type": "string (e.g. 'Homepage', 'Service Page', 'Blog Post')",
      "why_this_matters": "string (1-2 sentences explaining the business opportunity)",
      "reasons": [
        {
          "type": "never_promoted" | "contains_statistics" | "contains_testimonials" | "service_alignment" | "high_momentum" | "evergreen_content" | "trend_match",
          "score": 0-100,
          "explanation": "string"
        }
      ],
      "formats": ["LinkedIn post", "Thread", "Short-form video", "Newsletter section"]
    }
  ],
  "gaps": [
    {
      "id": "gap-1",
      "headline": "string (content gap title)",
      "detail": "string (what's missing and why it matters)",
      "opportunity": "string (what to create)",
      "matched_service": "string",
      "tags": ["string"]
    }
  ]
}

Rules:
- Identify 2-5 assets from the page content
- Generate 3-8 content opportunities with scores 60-100 for high-value content
- Generate 2-4 content gaps (topics they should be talking about but aren't)
- Score based on: proof points (stats, testimonials), promotional potential, freshness
- level "high" = score 80+, "medium" = 60-79, "emerging" = below 60
- Be specific and actionable — base everything on actual content found on the page
- If the page has very little content, still try to identify at least 1-2 opportunities
- Output ONLY valid JSON. No markdown, no explanation.`

function parseAnalysisResponse(content: string): WebsiteAnalysisResult {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('[website-intelligence/analyze] no JSON in Claude response, first 500 chars:', content.slice(0, 500))
    throw new Error('ANALYSIS_PARSE_FAILED: Claude did not return valid JSON')
  }
  let parsed: WebsiteAnalysisResult
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('[website-intelligence/analyze] JSON.parse failed:', err, '— snippet:', jsonMatch[0].slice(0, 500))
    throw new Error('ANALYSIS_PARSE_FAILED: Could not parse Claude response as JSON')
  }
  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
    assets: Array.isArray(parsed.assets) ? parsed.assets : [],
  }
}

export async function analyzeWebsiteForOpportunities(url: string): Promise<WebsiteAnalysisResult> {
  const scraped = await scrapeUrl(url)

  const userMessage = `Website URL: ${url}
Page title: ${scraped.title ?? 'Unknown'}
Site name: ${scraped.siteName ?? 'Unknown'}

## Page content (up to 6000 chars):
${scraped.markdownContent.slice(0, 6000)}`

  const result = await callClaude({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    model: 'claude-sonnet-4-6',
    maxTokens: 8192,
  })

  return parseAnalysisResponse(result.content)
}

export async function analyzeContentForOpportunities(
  text: string,
  sourceUrl: string,
  sourceName: string,
): Promise<WebsiteAnalysisResult> {
  const userMessage = `Source name: ${sourceName}
Source URL: ${sourceUrl}

## Content (up to 6000 chars):
${text.slice(0, 6000)}`

  const result = await callClaude({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    model: 'claude-sonnet-4-6',
    maxTokens: 8192,
  })

  return parseAnalysisResponse(result.content)
}
