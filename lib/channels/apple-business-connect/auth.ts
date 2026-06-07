// lib/channels/apple-business-connect/auth.ts
// ABC uses OAuth2 client_credentials grant.
// The JWT is a client_assertion POSTed to the token endpoint to obtain an access token.
// The access token (3600s TTL) is what gets sent as Bearer in API requests.
import { createSign } from 'crypto'
import { JWT_AUDIENCE } from './api-contract'
import { ABCTokenExpiredError } from './types'

const TOKEN_ENDPOINT = 'https://account.apple.com/auth/oauth2/v2/token'
const tokenCache = new Map<string, { token: string; exp: number }>()

function toBase64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function derToP1363(der: Buffer): Buffer {
  // DER ECDSA: 30 <totalLen> 02 <rLen> <r> 02 <sLen> <s>
  // JWT ES256 needs 64-byte P1363: <r_padded_32><s_padded_32>
  let pos    = 2
  const rLen = der[pos + 1]; pos += 2
  const r    = der.slice(pos, pos + rLen); pos += rLen
  const sLen = der[pos + 1]; pos += 2
  const s    = der.slice(pos, pos + sLen)
  const out  = Buffer.alloc(64)
  const rTrim = r[0] === 0 ? r.slice(1) : r
  const sTrim = s[0] === 0 ? s.slice(1) : s
  rTrim.copy(out, 32 - rTrim.length)
  sTrim.copy(out, 64 - sTrim.length)
  return out
}

function buildClientAssertion(keyId: string, issuerId: string, privateKey: string): string {
  const now    = Math.floor(Date.now() / 1000)
  const header  = toBase64url(Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })))
  const payload = toBase64url(Buffer.from(JSON.stringify({
    iss: issuerId,
    iat: now,
    exp: now + 300, // client assertions are short-lived (5 minutes)
    aud: JWT_AUDIENCE,
  })))
  const input  = `${header}.${payload}`
  const signer = createSign('SHA256')
  signer.update(input)
  return `${input}.${toBase64url(derToP1363(signer.sign(privateKey)))}`
}

export async function getABCAccessToken(
  keyId:      string,
  issuerId:   string,
  privateKey: string,
): Promise<string> {
  const cacheKey = `${issuerId}:${keyId}`
  const now      = Math.floor(Date.now() / 1000)
  const cached   = tokenCache.get(cacheKey)
  if (cached && cached.exp > now + 60) return cached.token

  const assertion = buildClientAssertion(keyId, issuerId, privateKey)
  const res = await fetch(TOKEN_ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type:            'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion:      assertion,
    }).toString(),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ABCTokenExpiredError(`OAuth2 token request failed ${res.status}: ${body}`)
  }

  const json = await res.json() as { access_token: string; expires_in?: number }
  const ttl  = json.expires_in ?? 3600
  tokenCache.set(cacheKey, { token: json.access_token, exp: now + ttl })
  return json.access_token
}

// For use during credential validation — tries to get a token to verify credentials work
export async function validateABCCredentials(
  keyId:      string,
  issuerId:   string,
  privateKey: string,
): Promise<void> {
  await getABCAccessToken(keyId, issuerId, privateKey)
}
