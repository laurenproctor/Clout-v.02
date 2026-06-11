import { SubstackProvider } from './substack'
import { RSSProvider } from './rss'
import { GenericArticleProvider } from './generic'
import type { ConversationProvider } from './types'

const providers: ConversationProvider[] = [
  new SubstackProvider('articles'),
  new RSSProvider(),
  new GenericArticleProvider(), // always matches — keep last
]

export function getProvider(url: string, sourceType?: string): ConversationProvider {
  if (sourceType === 'substack')       return new SubstackProvider('articles')
  if (sourceType === 'substack_notes') return new SubstackProvider('notes')
  return providers.find(p => p.canHandle(url)) ?? new GenericArticleProvider()
}

export type { ConversationProvider, NormalizedItem } from './types'
