import { bingGet } from './client'

export interface BingSite {
  siteUrl:  string
  verified: boolean
}

export interface BingKeyword {
  query:       string
  clicks:      number
  impressions: number
  position:    number
}

interface RawSite {
  Url:      string
  Verified: boolean
}

interface RawKeyword {
  Query:       string
  Clicks:      number
  Impressions: number
  Position:    number
  Ctr:         number
}

export async function listBingSites(workspaceId: string): Promise<BingSite[]> {
  const data = await bingGet<{ GetUserSitesResult: RawSite[] | null }>(
    workspaceId,
    'GetUserSites',
  )
  return (data.GetUserSitesResult ?? []).map(s => ({
    siteUrl:  s.Url,
    verified: s.Verified,
  }))
}

export async function fetchBingKeywords(
  workspaceId: string,
  siteUrl:     string,
  startDate:   string,
  endDate:     string,
): Promise<BingKeyword[]> {
  interface KeywordsResult {
    GetTopKeywordsResult: {
      KeywordList:  RawKeyword[] | null
      TotalCount:   number
    } | null
  }

  const data = await bingGet<KeywordsResult>(workspaceId, 'GetTopKeywords', {
    siteUrl,
    startDate,
    endDate,
    rows:        '10',
    page:        '0',
    country:     '',
    language:    '',
    currentPage: '0',
  })

  const list = data.GetTopKeywordsResult?.KeywordList ?? []
  return list.map(k => ({
    query:       k.Query,
    clicks:      k.Clicks,
    impressions: k.Impressions,
    position:    k.Position,
  }))
}
