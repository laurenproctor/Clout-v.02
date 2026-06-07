export interface BlueSkyProfile {
  did: string
  handle: string
  displayName: string | null
  description: string | null
  avatar: string | null
}

export interface BlueSkyChannelConfig {
  handle: string
  displayName: string | null
  description: string | null
  char_limit: number
  connect_handle: string  // original handle entered at connect time
}
