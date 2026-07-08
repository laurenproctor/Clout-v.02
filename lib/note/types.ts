export type NoteSourceType = 'url' | 'text' | 'clout_capture'
export type NoteRegister   = 'observation' | 'insight' | 'provocation' | 'story'

export interface NoteGenerationRequest {
  sourceContent:  string
  sourceType:     NoteSourceType
  sourceUrl?:     string
  audience?:      string
  customAudience?: string
  lensIds?:        string[]
  campaignId?:    string | null  // optional campaign attribution; read at the top level by the route
}

export interface NoteVariation {
  id:        string
  body:      string
  register:  NoteRegister
  wordCount: number
}
