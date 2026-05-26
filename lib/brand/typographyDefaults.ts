import type { TypographySettings } from '@/types/typography'

export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  h1: { fontFamily: null, fontSize: '48px', fontWeight: '700', lineHeight: '1.15', letterSpacing: '-0.02em', textTransform: 'none', color: null },
  h2: { fontFamily: null, fontSize: '36px', fontWeight: '700', lineHeight: '1.2',  letterSpacing: '-0.01em', textTransform: 'none', color: null },
  h3: { fontFamily: null, fontSize: '30px', fontWeight: '600', lineHeight: '1.25', letterSpacing: '0em',     textTransform: 'none', color: null },
  h4: { fontFamily: null, fontSize: '24px', fontWeight: '600', lineHeight: '1.3',  letterSpacing: '0em',     textTransform: 'none', color: null },
  h5: { fontFamily: null, fontSize: '20px', fontWeight: '600', lineHeight: '1.35', letterSpacing: '0em',     textTransform: 'none', color: null },
  h6: { fontFamily: null, fontSize: '16px', fontWeight: '600', lineHeight: '1.4',  letterSpacing: '0em',     textTransform: 'none', color: null },
  body: { fontFamily: null, fontSize: '16px', fontWeight: '400', lineHeight: '1.6',  letterSpacing: '0em',     textTransform: 'none', color: null },
  ui:   { fontFamily: null, fontSize: '14px', fontWeight: '500', lineHeight: '1.4',  letterSpacing: '0.01em',  textTransform: 'none', color: null },
}
