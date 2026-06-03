'use server'

import { cookies } from 'next/headers'

const COOKIE_NAME = 'last-workspace'
const ONE_YEAR = 60 * 60 * 24 * 365

export async function trackLastWorkspace(slug: string) {
  const jar = await cookies()
  jar.set(COOKIE_NAME, slug, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR,
  })
}
