// lib/pinterest/media.ts
// Pinterest fetches the Pin image by URL server-side, so the image MUST be publicly
// reachable. Verify it before publishing rather than letting Pinterest fail opaquely.
import { PinterestApiError } from './types'

function isImageContentType(ct: string | null): boolean {
  return !!ct && ct.toLowerCase().startsWith('image/')
}

/**
 * Confirms `url` resolves to a publicly fetchable image. Tries HEAD first; some CDNs
 * reject HEAD with 403/405, so falls back to a 1-byte ranged GET before failing.
 * Throws PinterestApiError(code 'media_url_not_fetchable') when unreachable/non-image.
 */
export async function assertImageFetchable(url: string): Promise<void> {
  try {
    const head = await fetch(url, { method: 'HEAD' })
    if (head.ok) {
      if (!isImageContentType(head.headers.get('content-type'))) {
        throw new PinterestApiError(`Image URL is not an image: ${url}`, 415, 'media_url_not_fetchable')
      }
      return
    }
    // Only retry with GET for methods/permission rejections that may still allow GET.
    if (head.status !== 403 && head.status !== 405) {
      throw new PinterestApiError(`Image URL not reachable (${head.status})`, head.status, 'media_url_not_fetchable')
    }
  } catch (err) {
    if (err instanceof PinterestApiError) throw err
    // Network error on HEAD — fall through to GET attempt below.
  }

  const get = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } }).catch(() => null)
  if (!get || !get.ok) {
    throw new PinterestApiError(`Image URL not reachable: ${url}`, get?.status ?? 0, 'media_url_not_fetchable')
  }
  if (!isImageContentType(get.headers.get('content-type'))) {
    throw new PinterestApiError(`Image URL is not an image: ${url}`, 415, 'media_url_not_fetchable')
  }
}
