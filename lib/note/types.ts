export type NoteSourceType = 'url' | 'text' | 'clout_capture'
export type NoteRegister   = 'observation' | 'insight' | 'provocation' | 'story'

export interface NoteGenerationRequest {
  sourceContent:  string
  sourceType:     NoteSourceType
  sourceUrl?:     string
  audience?:      string
  customAudience?: string
  lensIds?:        string[]
}

export interface NoteVariation {
  id:        string
  body:      string
  register:  NoteRegister
  wordCount: number
}
