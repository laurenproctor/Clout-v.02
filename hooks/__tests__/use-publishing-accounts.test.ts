import { describe, it, expect } from 'vitest'
import type { PublishingAccount } from '../use-publishing-accounts'

function groupByPlatform(accounts: PublishingAccount[]): Record<string, PublishingAccount[]> {
  return accounts.reduce<Record<string, PublishingAccount[]>>((acc, a) => {
    if (!acc[a.platform]) acc[a.platform] = []
    acc[a.platform].push(a)
    return acc
  }, {})
}

const ACCOUNTS: PublishingAccount[] = [
  { credentialId: 'c1', channelId: 'ch1', platform: 'linkedin', accountId: 'a1', displayName: 'Corporate' },
  { credentialId: 'c2', channelId: 'ch2', platform: 'linkedin', accountId: 'a2', displayName: 'CEO' },
  { credentialId: 'c3', channelId: 'ch3', platform: 'twitter', accountId: 'a3', displayName: '@amlon' },
]

describe('groupByPlatform', () => {
  it('groups accounts by platform', () => {
    const result = groupByPlatform(ACCOUNTS)
    expect(result['linkedin']).toHaveLength(2)
    expect(result['twitter']).toHaveLength(1)
  })

  it('returns empty object for no accounts', () => {
    expect(groupByPlatform([])).toEqual({})
  })
})
