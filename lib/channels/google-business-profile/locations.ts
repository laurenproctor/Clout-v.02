import { createGBPClient } from './client'
import type { GBPAccount, GBPLocation } from './types'

const ACCOUNT_MGMT_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1'
const BIZ_INFO_BASE      = 'https://mybusinessbusinessinformation.googleapis.com/v1'

const LOCATION_READ_MASK = 'name,title,storefrontAddress,metadata,profile'

export async function listAccounts(accessToken: string): Promise<GBPAccount[]> {
  const client = createGBPClient(accessToken)
  const data = await client.get<{ accounts?: GBPAccount[] }>(
    `${ACCOUNT_MGMT_BASE}/accounts`,
  )
  return data.accounts ?? []
}

export async function listLocations(
  accountName: string,
  accessToken: string,
): Promise<GBPLocation[]> {
  const client = createGBPClient(accessToken)
  const url = `${BIZ_INFO_BASE}/${accountName}/locations?readMask=${LOCATION_READ_MASK}`
  const data = await client.get<{ locations?: GBPLocation[] }>(url)
  return data.locations ?? []
}

export async function listAllLocations(
  accessToken: string,
): Promise<{ account: GBPAccount; locations: GBPLocation[] }[]> {
  const accounts = await listAccounts(accessToken)

  const results = await Promise.allSettled(
    accounts.map(async (account) => ({
      account,
      locations: await listLocations(account.name, accessToken),
    })),
  )

  return results
    .filter((r): r is PromiseFulfilledResult<{ account: GBPAccount; locations: GBPLocation[] }> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(pair => pair.locations.length > 0)
}
