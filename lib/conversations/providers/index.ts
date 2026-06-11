import { SubstackProvider } from './substack'
import { RSSProvider } from './rss'
import { GenericArticleProvider } from './generic'
import { RedditProvider } from './reddit'
import type { ConversationProvider } from './types'

const providers: ConversationProvider[] = [
  new SubstackProvider('articles'),
  new RSSProvider(),
  new RedditProvider(),
  new GenericArticleProvider(), // always matches — keep last
]

export function getProvider(url: string, sourceType?: string): ConversationProvider {
  if (sourceType === 'substack')       return new SubstackProvider('articles')
  if (sourceType === 'substack_notes') return new SubstackProvider('notes')
  if (sourceType === 'reddit')         return new RedditProvider()
  return providers.find(p => p.canHandle(url)) ?? new GenericArticleProvider()
}

export type { ConversationProvider, NormalizedItem } from './types'
