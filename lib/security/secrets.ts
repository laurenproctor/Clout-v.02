// lib/security/secrets.ts
// AES-256-GCM encryption for long-lived workspace secrets.
// Uses WORKSPACE_SECRETS_KEY (32 bytes, hex-encoded in env).
// Format: "<iv_hex>.<ciphertext_hex>.<tag_hex>"
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALG = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.WORKSPACE_SECRETS_KEY
  if (!hex) throw new Error('WORKSPACE_SECRETS_KEY is not configured')
  const buf = Buffer.from(hex, 'hex')
  if (buf.length !== 32) {
    throw new Error('WORKSPACE_SECRETS_KEY must be exactly 32 bytes (64 hex chars). Generate with: openssl rand -hex 32')
  }
  return buf
}

export function encryptWorkspaceSecret(plaintext: string): string {
  const iv      = randomBytes(12)
  const cipher  = createCipheriv(ALG, getKey(), iv)
  const enc     = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag     = cipher.getAuthTag()
  return [iv.toString('hex'), enc.toString('hex'), tag.toString('hex')].join('.')
}

export function decryptWorkspaceSecret(ciphertext: string): string {
  const parts = ciphertext.split('.')
  if (parts.length !== 3) throw new Error('Malformed ciphertext — expected iv.enc.tag')
  const [ivHex, encHex, tagHex] = parts
  const decipher = createDecipheriv(ALG, getKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(encHex, 'hex')).toString('utf8') + decipher.final('utf8')
}
