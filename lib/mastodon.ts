import { createServiceClient } from '@/lib/supabase/service'
import type { OutputContent } from '@/types/domain'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL!

export function getRedirectUri(): string {
  return `${APP_URL()}/api/channels/mastodon/callback`
}

// ─── Instance URL normalization ────────────────────────────────────────────────

export function normalizeInstanceUrl(raw: string): string {
  let url = raw.trim()

  // Strip leading @username@ if someone pastes a full fediverse handle
  url = url.replace(/^@[^@]+@/, '')

  // Prepend scheme if missing
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`"${raw}" is not a valid Mastodon instance URL.`)
  }

  if (!parsed.hostname || parsed.hostname.includes(' ') || !parsed.hostname.includes('.')) {
    throw new Error(`"${raw}" does not look like a valid domain.`)
  }

  // Return just scheme + lowercase host — strip path, port (80/443), and trailing slash
  return `${parsed.protocol}//${parsed.hostname.toLowerCase()}`
}

// ─── Instance info + app registration ─────────────────────────────────────────

interface AppRegistration {
  clientId: string
  clientSecret: string
  maxCharacters: number
}

async function fetchInstanceInfo(instanceUrl: string): Promise<{ softwareName: string; softwareVersion: string; maxCharacters: number }> {
  // Try v2 first (Mastodon 4.x), fall back to v1 (3.x)
  let body: Record<string, unknown> | null = null

  try {
    const res = await fetch(`${instanceUrl}/api/v2/instance`, { next: { revalidate: 0 } })
    if (res.ok) body = await res.json()
  } catch { /* fall through */ }

  if (!body) {
    const res = await fetch(`${instanceUrl}/api/v1/instance`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`Could not reach ${instanceUrl}. Check the URL and try again.`)
    body = await res.json()
  }

  // Shape of the fields we read from the v1/v2 instance response.
  interface InstanceInfoResponse {
    source_url?: string
    software?: { name?: string; version?: string }
    version?: string
    configuration?: { statuses?: { max_characters?: number } }
    max_toot_chars?: number
  }
  const info = body! as InstanceInfoResponse

  // Software validation — Mastodon only
  const source = info.source_url ?? ''
  const softwareName = info.software?.name
    ?? info.version?.split(' ')[0]?.toLowerCase()
    ?? 'mastodon'
  const softwareVersion = info.software?.version
    ?? info.version
    ?? ''

  // Reject known incompatible Fediverse software
  const incompatible = ['pleroma', 'akkoma', 'misskey', 'calckey', 'iceshrimp', 'firefish', 'gotosocial']
  if (incompatible.some(s => softwareName.toLowerCase().includes(s) || source.toLowerCase().includes(s))) {
    throw Object.assign(
      new Error(`${instanceUrl} runs ${softwareName}, which is not supported. Only Mastodon instances are supported.`),
      { code: 'unsupported_software' }
    )
  }

  // Extract char limit — v2 path vs v1 path vs legacy root field
  const maxCharacters: number =
    info.configuration?.statuses?.max_characters ??
    info.max_toot_chars ??
    500

  return { softwareName, softwareVersion, maxCharacters }
}

export async function getOrRegisterApp(
  instanceUrl: string,
  redirectUri: string,
): Promise<AppRegistration> {
  const supabase = createServiceClient()

  // Check cache first
  const { data: existing } = await supabase
    .from('mastodon_app_registrations')
    .select('client_id, client_secret, max_characters')
    .eq('instance_url', instanceUrl)
    .maybeSingle()

  if (existing) {
    return {
      clientId:      existing.client_id,
      clientSecret:  existing.client_secret,
      maxCharacters: existing.max_characters ?? 500,
    }
  }

  // Validate instance and get metadata
  const { softwareName, softwareVersion, maxCharacters } = await fetchInstanceInfo(instanceUrl)

  // Register app with the instance
  const regRes = await fetch(`${instanceUrl}/api/v1/apps`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      client_name:   'Clout',
      redirect_uris: redirectUri,
      scopes:        'read write',
      website:       APP_URL(),
    }),
  })

  if (!regRes.ok) {
    const text = await regRes.text().catch(() => '')
    throw new Error(`Failed to register with ${instanceUrl}: ${regRes.status} ${text}`)
  }

  const reg = await regRes.json() as { client_id: string; client_secret: string }

  // Cache in DB — handle concurrent race: unique constraint on instance_url
  try {
    await supabase.from('mastodon_app_registrations').insert({
      instance_url:     instanceUrl,
      client_id:        reg.client_id,
      client_secret:    reg.client_secret,
      software_name:    softwareName,
      software_version: softwareVersion,
      max_characters:   maxCharacters,
    })
  } catch {
    // Concurrent insert — re-fetch the winning row
    const { data: raceWinner } = await supabase
      .from('mastodon_app_registrations')
      .select('client_id, client_secret, max_characters')
      .eq('instance_url', instanceUrl)
      .single()

    if (raceWinner) {
      return {
        clientId:      raceWinner.client_id,
        clientSecret:  raceWinner.client_secret,
        maxCharacters: raceWinner.max_characters ?? 500,
      }
    }
  }

  return { clientId: reg.client_id, clientSecret: reg.client_secret, maxCharacters }
}

// ─── OAuth flow ────────────────────────────────────────────────────────────────

export function buildMastodonAuthUrl(
  instanceUrl: string,
  clientId: string,
  redirectUri: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'read write',
    state,
  })
  return `${instanceUrl}/oauth/authorize?${params.toString()}`
}

export async function exchangeMastodonCode(
  instanceUrl: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string }> {
  // IMPORTANT: must be form-encoded — mastodon.social rejects JSON on the token endpoint
  const body = new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    code,
    grant_type:    'authorization_code',
    redirect_uri:  redirectUri,
    scope:         'read write',
  })

  const res = await fetch(`${instanceUrl}/oauth/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Token exchange failed (${res.status}): ${text}`)
  }

  const data = await res.json() as { access_token: string }
  return { accessToken: data.access_token }
}

// ─── Account profile ───────────────────────────────────────────────────────────

export interface MastodonAccount {
  id: string
  username: string
  displayName: string
  avatar: string | null
  profileUrl: string
}

export async function fetchMastodonAccount(
  instanceUrl: string,
  accessToken: string,
): Promise<MastodonAccount> {
  const res = await fetch(`${instanceUrl}/api/v1/accounts/verify_credentials`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch Mastodon profile (${res.status})`)
  }

  const data = await res.json() as {
    id: string
    username: string
    display_name: string
    avatar: string
    url: string
  }

  return {
    id:          data.id,
    username:    data.username,
    displayName: data.display_name || data.username,
    avatar:      data.avatar || null,
    profileUrl:  data.url,
  }
}

// ─── Publishing ────────────────────────────────────────────────────────────────

export async function postToMastodon(
  instanceUrl: string,
  accessToken: string,
  text: string,
  spoilerText?: string,
): Promise<{ id: string; url: string }> {
  const body: Record<string, string> = { status: text }
  if (spoilerText) body.spoiler_text = spoilerText

  const res = await fetch(`${instanceUrl}/api/v1/statuses`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const code = res.status === 401 || res.status === 403 ? 'token_expired' : 'publish_error'
    throw Object.assign(
      new Error(`Mastodon publish failed (${res.status}): ${text}`),
      { code, retryable: res.status >= 500 }
    )
  }

  const data = await res.json() as { id: string; url: string }
  return { id: data.id, url: data.url }
}

// ─── Text formatting ───────────────────────────────────────────────────────────

export function formatMastodonText(content: OutputContent, charLimit: number): string {
  const text = content.body?.trim() ?? ''
  if (!text) return ''

  // Soft limit: generation should target charLimit - 30, but enforce hard limit here
  if (text.length <= charLimit) return text

  // Truncate at charLimit with ellipsis as a safety net
  // Mastodon API is the authoritative enforcer for edge cases (emoji, URLs)
  return text.slice(0, charLimit - 1) + '…'
}
