const FORMAT_INSTRUCTIONS: Record<string, string> = {
  linkedin:   '~1200 characters, professional narrative, 3–4 paragraphs, no hashtags',
  twitter:    '~280 characters, punchy, single insight, optional 1–2 hashtags',
  blog:       '~300 word intro paragraph, hook + context + thesis, no hashtags',
  newsletter: '~150 words, conversational, direct address to reader, no hashtags',
  instagram:  '~150 words + 5–8 relevant hashtags, visual storytelling language',
}

export function buildArticleContext(params: {
  scraped:      string | null
  item_content: string | null
  item_summary: string | null
  item_title:   string
  item_topics:  string[]
}): string {
  if (params.scraped?.trim()) return params.scraped.slice(0, 8000)
  if (params.item_content?.trim()) return params.item_content
  if (params.item_summary?.trim()) return params.item_summary

  return [params.item_title, params.item_topics.join(', ')]
    .filter(Boolean)
    .join(' — ')
}

export function buildSystemPrompt(params: {
  brandName:        string | null
  toneTraits:       string[]
  contentTopics:    string[]
  services:         string[]
  competitorDomain: string
}): string {
  const parts: string[] = []

  parts.push(
    `You are the editorial strategist for ${params.brandName ?? 'this brand'}.`
  )

  if (params.toneTraits.length > 0) {
    parts.push(`Voice and tone: ${params.toneTraits.join(', ')}`)
  }

  if (params.contentTopics.length > 0) {
    parts.push(`Authority areas: ${params.contentTopics.join(', ')}`)
  }

  if (params.services.length > 0) {
    parts.push(`Services: ${params.services.join(', ')}`)
  }

  parts.push(`ORIGINALITY AND ATTRIBUTION RULES — NON-NEGOTIABLE:
1. Use the signal only to identify the topic, trend, discussion, or market movement.
2. Do not summarize, paraphrase, reproduce, or closely mirror the source article.
3. Create an original perspective, framework, opinion, lesson, or insight that reflects the workspace's expertise and voice.
4. Do not link to, cite, mention, name, or attribute any content to ${params.competitorDomain} or any external competitor source.
5. Do not include any external URLs.
6. The output must read entirely as the workspace's original thought leadership. There should be no indication this content was informed by a competitor's article.`)

  return parts.join('\n\n')
}

export function buildUserPrompt(params: {
  articleContext: string
  format:         string
  tone:           string
}): string {
  const formatInstruction = FORMAT_INSTRUCTIONS[params.format] ?? 'concise and engaging'

  return `Write a ${params.format} post based on the following signal context.

Signal context:
${params.articleContext}

Requested tone: ${params.tone}
Format requirements:
- ${formatInstruction}

Write only the post content. No preamble, no labels, no explanation.`
}
