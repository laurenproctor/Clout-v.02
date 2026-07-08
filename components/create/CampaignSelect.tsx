'use client'

import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CampaignCreateDialog } from '@/components/campaigns/CampaignCreateDialog'
import type { Campaign } from '@/types/domain'

// Minimal, reusable campaign picker. Lists active campaigns and returns
// `campaignId | null`. Supports creating a campaign inline via a dialog so
// users don't have to leave the create flow. On any load failure it quietly
// falls back to "No campaign".
interface CampaignOption {
  id: string
  name: string
}

const NONE = '__none__'
const CREATE = '__create__'

interface CampaignSelectProps {
  value: string | null
  onChange: (campaignId: string | null) => void
  disabled?: boolean
}

export function CampaignSelect({ value, onChange, disabled }: CampaignSelectProps) {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

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

  function handleValueChange(v: string) {
    if (v === CREATE) {
      setDialogOpen(true)
      return
    }
    onChange(v === NONE ? null : v)
  }

  function handleCreated(campaign: Campaign) {
    setCampaigns(prev =>
      prev.some(c => c.id === campaign.id)
        ? prev
        : [{ id: campaign.id, name: campaign.name }, ...prev]
    )
    onChange(campaign.id)
  }

  return (
    <>
      <Select
        value={value ?? NONE}
        onValueChange={handleValueChange}
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
          <SelectSeparator />
          <SelectItem value={CREATE}>+ Create new campaign</SelectItem>
        </SelectContent>
      </Select>

      <CampaignCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
      />
    </>
  )
}
