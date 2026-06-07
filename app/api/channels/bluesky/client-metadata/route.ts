export const dynamic = 'force-static'

export function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return Response.json({
    client_id:                  `${appUrl}/api/channels/bluesky/client-metadata`,
    client_name:                'Clout',
    client_uri:                 appUrl,
    redirect_uris:              [`${appUrl}/api/channels/bluesky/callback`],
    scope:                      'atproto transition:generic',
    grant_types:                ['authorization_code', 'refresh_token'],
    response_types:             ['code'],
    token_endpoint_auth_method: 'none',
    application_type:           'web',
    dpop_bound_access_tokens:   true,
  })
}
