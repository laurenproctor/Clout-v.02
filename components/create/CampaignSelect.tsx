'use client'

import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Minimal, reusable campaign picker. Lists active campaigns and returns
// `campaignId | null`. Deliberately scoped: no create/edit/multi-select/search.
// On any load failure it quietly falls back to "No campaign".
interface CampaignOption {
  id: string
  name: string
}

const NONE = '__none__'

interface CampaignSelectProps {
  value: string | null
  onChange: (campaignId: string | null) => void
  disabled?: boolean
}

export function CampaignSelect({ value, onChange, disabled }: CampaignSelectProps) {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/campaigns?status=active')
      .then(r => (r.ok ? r.json() : []))
      .then((data: CampaignOption[]) => {
        if (!cancelled && Array.isArray(data)) {
          setCampaigns(data.map(c => ({ id: c.id, name: c.name })))
        }
      })
      .catch(() => {/* quiet fallback — "No campaign" only */})
    return () => { cancelled = true }
  }, [])

  return (
    <Select
      value={value ?? NONE}
      onValueChange={v => onChange(v === NONE ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder="No campaign" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>No campaign</SelectItem>
        {campaigns.map(c => (
          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
