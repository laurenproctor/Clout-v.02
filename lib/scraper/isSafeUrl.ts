export function isSafeUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (parsed.protocol !== 'https:') return false

  const host = parsed.hostname?.toLowerCase() || ''

  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') return false
  if (/^10\./.test(host)) return false
  if (/^192\.168\./.test(host)) return false
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false
  if (host === '169.254.169.254') return false
  if (host === 'metadata.google.internal') return false

  return true
}
