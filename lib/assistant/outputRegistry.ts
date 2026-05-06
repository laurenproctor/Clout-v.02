import type { OutputFormat } from '@/types/domain'

export interface FormatConfig {
  maxTokens: number
  systemSuffix: string
}

export const OUTPUT_REGISTRY: Record<OutputFormat, FormatConfig> = {
  post: {
    maxTokens: 800,
    systemSuffix: 'Return the post as plain text. No JSON wrapper. No headers.',
  },
  thread: {
    maxTokens: 1400,
    systemSuffix: 'Return each tweet/post on its own line, prefixed with a number (1/, 2/, etc.). Plain text only.',
  },
  newsletter: {
    maxTokens: 2500,
    systemSuffix: 'Return structured sections separated by blank lines. Use ## for section headers. Plain text.',
  },
  article: {
    maxTokens: 3000,
    systemSuffix: 'Return a long-form article. Use ## for subheadings. Plain text, markdown ok.',
  },
  note: {
    maxTokens: 800,
    systemSuffix: 'Return plain reflective text. No headers, no CTA, no hashtags.',
  },
}
