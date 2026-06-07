// lib/channels/apple-business-connect/locations.ts
import { createABCClient } from './client'
import { ENDPOINTS } from './api-contract'
import type { ABCCompanyRaw, ABCBusinessRaw, ABCLocationRaw, PageParam, PagedResponse } from './api-contract'
import type { ABCCredentials, ABCCompany, ABCBusiness, ABCLocation } from './types'

function normalizeCompany(raw: ABCCompanyRaw): ABCCompany {
  return { id: raw.id, name: raw.name }
}

function normalizeBusiness(raw: ABCBusinessRaw, companyId: string): ABCBusiness {
  return { id: raw.id, name: raw.name, companyId }
}

function normalizeLocation(raw: ABCLocationRaw, companyId: string, businessId: string): ABCLocation {
  return {
    id:         raw.id,
    name:       raw.name,
    companyId,
    businessId,
    address: raw.address ? {
      city:            raw.address.city,
      stateOrProvince: raw.address.stateOrProvince,
    } : undefined,
  }
}

async function fetchAllPages<T>(
  fetcher: (params: PageParam) => Promise<PagedResponse<T>>,
): Promise<T[]> {
  const results: T[] = []
  let pageToken: string | undefined
  do {
    const page = await fetcher({ pageToken, pageSize: 100 })
    results.push(...(page.results ?? []))
    pageToken = page.nextPageToken
  } while (pageToken)
  return results
}

export async function listCompanies(creds: ABCCredentials): Promise<ABCCompany[]> {
  const client = createABCClient(creds)
  const raws   = await fetchAllPages<ABCCompanyRaw>(({ pageToken, pageSize }) => {
    const params = new URLSearchParams()
    if (pageToken) params.set('pageToken', pageToken)
    if (pageSize)  params.set('pageSize', String(pageSize))
    const qs = params.toString()
    return client.get<PagedResponse<ABCCompanyRaw>>(`${ENDPOINTS.companies}${qs ? `?${qs}` : ''}`)
  })
  return raws.map(normalizeCompany)
}

export async function listBusinesses(
  creds:     ABCCredentials,
  companyId: string,
): Promise<ABCBusiness[]> {
  const client = createABCClient(creds)
  const raws   = await fetchAllPages<ABCBusinessRaw>(({ pageToken, pageSize }) => {
    const params = new URLSearchParams()
    if (pageToken) params.set('pageToken', pageToken)
    if (pageSize)  params.set('pageSize', String(pageSize))
    const qs = params.toString()
    return client.get<PagedResponse<ABCBusinessRaw>>(
      `${ENDPOINTS.businesses(companyId)}${qs ? `?${qs}` : ''}`
    )
  })
  return raws.map(r => normalizeBusiness(r, companyId))
}

export async function listLocations(
  creds:      ABCCredentials,
  companyId:  string,
  businessId: string,
): Promise<ABCLocation[]> {
  const client = createABCClient(creds)
  const raws   = await fetchAllPages<ABCLocationRaw>(({ pageToken, pageSize }) => {
    const params = new URLSearchParams()
    if (pageToken) params.set('pageToken', pageToken)
    if (pageSize)  params.set('pageSize', String(pageSize))
    const qs = params.toString()
    return client.get<PagedResponse<ABCLocationRaw>>(
      `${ENDPOINTS.locations(companyId, businessId)}${qs ? `?${qs}` : ''}`
    )
  })
  return raws.map(r => normalizeLocation(r, companyId, businessId))
}

export interface ABCLocationGroup {
  company:   ABCCompany
  business:  ABCBusiness
  locations: ABCLocation[]
}

export async function listAllLocations(
  creds: ABCCredentials,
): Promise<ABCLocationGroup[]> {
  const companies = await listCompanies(creds)
  const groups: ABCLocationGroup[] = []

  const businessResults = await Promise.allSettled(
    companies.map(async company => {
      const businesses = await listBusinesses(creds, company.id)
      return { company, businesses }
    }),
  )

  for (const result of businessResults) {
    if (result.status !== 'fulfilled') continue
    const { company, businesses } = result.value

    const locationResults = await Promise.allSettled(
      businesses.map(async business => {
        const locations = await listLocations(creds, company.id, business.id)
        return { company, business, locations }
      }),
    )

    for (const locResult of locationResults) {
      if (locResult.status !== 'fulfilled') continue
      const { company: c, business, locations } = locResult.value
      if (locations.length > 0) {
        groups.push({ company: c, business, locations })
      }
    }
  }

  return groups
}
