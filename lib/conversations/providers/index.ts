import { SubstackProvider } from './substack'
import { RSSProvider } from './rss'
import { GenericArticleProvider } from './generic'
import type { ConversationProvider } from './types'

const providers: ConversationProvider[] = [
  new SubstackProvider(),
  new RSSProvider(),
  new GenericArticleProvider(), // always matches — keep last
]

export function getProvider(url: string): ConversationProvider {
  return providers.find(p => p.canHandle(url)) ?? new GenericArticleProvider()
}

export type { ConversationProvider, NormalizedItem } from './types'
