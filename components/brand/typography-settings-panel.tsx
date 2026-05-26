'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { TypographyLevelEditor } from '@/components/brand/typography-level-editor'
import type { TypographyLevel, TypographySettings } from '@/types/typography'

const LEVELS: { level: TypographyLevel; label: string; role: 'heading' | 'body' }[] = [
  { level: 'h1',   label: 'H1',   role: 'heading' },
  { level: 'h2',   label: 'H2',   role: 'heading' },
  { level: 'h3',   label: 'H3',   role: 'heading' },
  { level: 'h4',   label: 'H4',   role: 'heading' },
  { level: 'h5',   label: 'H5',   role: 'heading' },
  { level: 'h6',   label: 'H6',   role: 'heading' },
  { level: 'body', label: 'Body', role: 'body' },
  { level: 'ui',   label: 'UI',   role: 'body' },
]

const WEIGHT_LABELS: Record<string, string> = {
  '100': 'Thin', '200': 'Extralight', '300': 'Light', '400': 'Regular',
  '500': 'Medium', '600': 'Semibold', '700': 'Bold', '800': 'Extrabold', '900': 'Black',
}

interface TypographySettingsPanelProps {
  value: TypographySettings
  globalHeadingFont: string
  globalBodyFont: string
  brandColors: { primary: string; secondary: string; accent: string }
  onChange: (next: TypographySettings) => void
}

export function TypographySettingsPanel({
  value,
  globalHeadingFont,
  globalBodyFont,
  brandColors,
  onChange,
}: TypographySettingsPanelProps) {
  return (
    <Accordion type="single" collapsible className="rounded-md border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
      {LEVELS.map(({ level, label, role }) => {
        const settings = value[level]
        const weightLabel = WEIGHT_LABELS[settings.fontWeight] ?? settings.fontWeight
        const summary = `${settings.fontSize} · ${weightLabel}`

        return (
          <AccordionItem key={level} value={level} className="border-b-0">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline hover:bg-zinc-50 [&[data-state=open]>svg]:rotate-180">
              <span className="text-zinc-800">{label}</span>
              <span className="ml-auto mr-3 text-xs font-normal text-zinc-400">{summary}</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-0">
              <TypographyLevelEditor
                value={settings}
                globalHeadingFont={globalHeadingFont}
                globalBodyFont={globalBodyFont}
                defaultFontRole={role}
                brandColors={brandColors}
                onChange={next => onChange({ ...value, [level]: next })}
              />
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
