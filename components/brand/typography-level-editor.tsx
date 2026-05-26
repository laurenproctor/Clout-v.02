'use client'

import { ColorPicker } from '@/components/brand/color-picker'
import type { FontWeight, TextTransform, TypographyLevelSettings } from '@/types/typography'

const ALL_FONTS = [
  'Playfair Display', 'Fraunces', 'DM Serif Display',
  'Libre Baskerville', 'Cormorant Garamond',
  'Montserrat', 'Raleway', 'Space Grotesk',
  'Inter', 'DM Sans', 'Plus Jakarta Sans', 'Nunito',
  'IBM Plex Sans', 'Source Sans 3', 'Lato', 'Merriweather',
]

const WEIGHT_OPTIONS: { value: FontWeight; label: string }[] = [
  { value: '100', label: '100 — Thin' },
  { value: '200', label: '200 — Extralight' },
  { value: '300', label: '300 — Light' },
  { value: '400', label: '400 — Regular' },
  { value: '500', label: '500 — Medium' },
  { value: '600', label: '600 — Semibold' },
  { value: '700', label: '700 — Bold' },
  { value: '800', label: '800 — Extrabold' },
  { value: '900', label: '900 — Black' },
]

const TRANSFORM_OPTIONS: { value: TextTransform; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'capitalize', label: 'Capitalize' },
]

interface TypographyLevelEditorProps {
  value: TypographyLevelSettings
  globalHeadingFont: string
  globalBodyFont: string
  defaultFontRole: 'heading' | 'body'
  brandColors: { primary: string; secondary: string; accent: string }
  onChange: (next: TypographyLevelSettings) => void
}

const selectClass = 'h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400'
const inputClass = 'h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400'
const labelClass = 'block text-[10px] font-medium uppercase tracking-wide text-zinc-400 mb-1'

export function TypographyLevelEditor({
  value,
  globalHeadingFont,
  globalBodyFont,
  defaultFontRole,
  brandColors,
  onChange,
}: TypographyLevelEditorProps) {
  const inheritFont = defaultFontRole === 'heading' ? globalHeadingFont : globalBodyFont

  function set<K extends keyof TypographyLevelSettings>(key: K, val: TypographyLevelSettings[K]) {
    onChange({ ...value, [key]: val })
  }

  return (
    <div className="space-y-3 py-3">
      {/* Row 1: font family, size, weight */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Font</label>
          <select
            className={selectClass}
            value={value.fontFamily ?? ''}
            onChange={e => set('fontFamily', e.target.value === '' ? null : e.target.value)}
          >
            <option value="">Inherit ({inheritFont})</option>
            {ALL_FONTS.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Size</label>
          <input
            type="text"
            className={inputClass}
            value={value.fontSize}
            placeholder="16px"
            onChange={e => set('fontSize', e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Weight</label>
          <select
            className={selectClass}
            value={value.fontWeight}
            onChange={e => set('fontWeight', e.target.value as FontWeight)}
          >
            {WEIGHT_OPTIONS.map(w => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: line height, letter spacing, transform */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Line Height</label>
          <input
            type="text"
            className={inputClass}
            value={value.lineHeight}
            placeholder="1.5"
            onChange={e => set('lineHeight', e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Letter Spacing</label>
          <input
            type="text"
            className={inputClass}
            value={value.letterSpacing}
            placeholder="0em"
            onChange={e => set('letterSpacing', e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Capitalization</label>
          <select
            className={selectClass}
            value={value.textTransform}
            onChange={e => set('textTransform', e.target.value as TextTransform)}
          >
            {TRANSFORM_OPTIONS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 3: color */}
      <div>
        <label className={labelClass}>Color</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => set('color', value.color === null ? brandColors.primary : null)}
            className={`h-8 rounded-md border px-3 text-xs font-medium transition-colors ${
              value.color === null
                ? 'border-zinc-800 bg-zinc-800 text-white'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400'
            }`}
          >
            Inherit
          </button>
          {value.color !== null && (
            <div className="flex-1">
              <ColorPicker
                label=""
                value={value.color}
                onChange={v => set('color', v)}
                className="!gap-0"
              />
            </div>
          )}
          {value.color === null && (
            <span className="text-xs text-zinc-400">Using brand/theme color</span>
          )}
        </div>
      </div>
    </div>
  )
}
