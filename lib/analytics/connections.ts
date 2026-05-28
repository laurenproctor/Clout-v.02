import { createServiceClient } from '@/lib/supabase/service'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const ALG = 'aes-256-gcm'

function getTokenSecret(): Buffer {
  const secret = process.env.ANALYTICS_TOKEN_SECRET
  const buf = secret ? Buffer.from(secret, 'utf8') : Buffer.alloc(0)
  if (buf.length < 32) throw new Error('ANALYTICS_TOKEN_SECRET must be at least 32 bytes')
  return buf.subarray(0, 32)
}

function encryptToken(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALG, getTokenSecret(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('hex'), encrypted.toString('hex'), tag.toString('hex')].join('.')
}

function decryptToken(ciphertext: string): string {
  const [ivHex, encHex, tagHex] = ciphertext.split('.')
  const decipher = createDecipheriv(ALG, getTokenSecret(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(encHex, 'hex')).toString('utf8') + decipher.final('utf8')
}

export async function getAnalyticsConnection(workspaceId: string, provider: 'ga4' | 'gsc' | 'bing_wmt') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient()
  // analytics_connections table added in migration — not yet in generated types
  const { data } = await (supabase as any)
    .from('analytics_connections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)
    .single()
  if (!data) return null
  return {
    ...data,
    access_token: decryptToken(data.access_token),
    refresh_token: data.refresh_token ? decryptToken(data.refresh_token) : null,
  }
}

export async function upsertAnalyticsConnection(row: {
  workspace_id: string
  provider: 'ga4' | 'gsc' | 'bing_wmt'
  access_token: string
  refresh_token: string | null
  expires_at: number | null
  connected_by: string
}) {
  const supabase = createServiceClient()
  // analytics_connections table added in migration — not yet in generated types
  const { error } = await (supabase as any)
    .from('analytics_connections')
    .upsert({
      ...row,
      access_token: encryptToken(row.access_token),
      refresh_token: row.refresh_token ? encryptToken(row.refresh_token) : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,provider' })
  if (error) throw new Error(`Failed to save analytics connection: ${error.message}`)
}

export async function deleteAnalyticsConnection(workspaceId: string, provider: 'ga4' | 'gsc' | 'bing_wmt') {
  const supabase = createServiceClient()
  // analytics_connections table added in migration — not yet in generated types
  const { error } = await (supabase as any)
    .from('analytics_connections')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)
  if (error) throw new Error(`Failed to delete analytics connection: ${error.message}`)
}

export async function getAccessToken(workspaceId: string, provider: 'ga4' | 'gsc'): Promise<string> {
  const conn = await getAnalyticsConnection(workspaceId, provider)
  if (!conn) throw new Error(`No ${provider} connection found`)

  const now = Math.floor(Date.now() / 1000)
  if (conn.expires_at && conn.expires_at > now + 60) {
    return conn.access_token
  }

  if (!conn.refresh_token) throw new Error(`No refresh token for ${provider}`)

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: conn.refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google token refresh failed (${res.status}): ${body}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }
  if (!data.access_token) {
    throw new Error(`Google token refresh returned no access_token`)
  }
  const newExpiresAt = now + data.expires_in

  const supabase = createServiceClient()
  // analytics_connections table added in migration — not yet in generated types
  await (supabase as any)
    .from('analytics_connections')
    .update({
      access_token: encryptToken(data.access_token),
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)

  return data.access_token  // return plaintext to caller
}

export async function upsertAnalyticsProperty(row: {
  workspace_id: string
  property_type: 'ga4_property' | 'gsc_site' | 'bing_wmt_site'
  property_id: string
  property_name: string | null
  metadata?: Record<string, unknown>
}) {
  const supabase = createServiceClient()
  // analytics_properties table added in migration — not yet in generated types
  const { error } = await (supabase as any)
    .from('analytics_properties')
    .upsert(row, { onConflict: 'workspace_id,property_type' })
  if (error) throw new Error(`Failed to save analytics property: ${error.message}`)
}

export async function getAnalyticsProperty(workspaceId: string, propertyType: 'ga4_property' | 'gsc_site' | 'bing_wmt_site') {
  const supabase = createServiceClient()
  // analytics_properties table added in migration — not yet in generated types
  const { data } = await (supabase as any)
    .from('analytics_properties')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('property_type', propertyType)
    .single()
  return data
}
