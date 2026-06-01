export type FontWeight =
  | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'

export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize' | 'sentence-case' | 'title-case'

export type TypographyLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'ui'

export interface TypographyLevelSettings {
  fontFamily: string | null
  fontSize: string
  fontWeight: FontWeight
  lineHeight: string
  letterSpacing: string
  textTransform: TextTransform
  color: string | null
}

export type TypographySettings = Record<TypographyLevel, TypographyLevelSettings>
