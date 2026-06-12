import { SubstackProvider } from './substack'
import { RSSProvider } from './rss'
import { GenericArticleProvider } from './generic'
import { RedditProvider } from './reddit'
import { LinkedInProvider } from './linkedin'
import type { ConversationProvider } from './types'

const providers: ConversationProvider[] = [
  new SubstackProvider('articles'),
  new RSSProvider(),
  new RedditProvider(),
  new LinkedInProvider(),
  new GenericArticleProvider(), // always matches — keep last
]

export function getProvider(url: string, sourceType?: string, provider?: string | null): ConversationProvider {
  if (sourceType === 'keyword') {
    switch (provider) {
      case 'reddit': return new RedditProvider()
      default:       throw new Error(`Unsupported keyword provider: ${provider}`)
    }
  }
  if (sourceType === 'substack')       return new SubstackProvider('articles')
  if (sourceType === 'substack_notes') return new SubstackProvider('notes')
  if (sourceType === 'reddit')         return new RedditProvider()
  if (sourceType === 'linkedin')       return new LinkedInProvider()
  return providers.find(p => p.canHandle(url)) ?? new GenericArticleProvider()
}

export type { ConversationProvider, NormalizedItem } from './types'
