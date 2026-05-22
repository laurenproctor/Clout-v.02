import { describe, it, expect } from 'vitest'
import { mapVoicesToTone, mapToneToVoices } from '../toneMapping'
import type { TonePreference } from '@/types/feed'

describe('mapVoicesToTone', () => {
  it('returns authoritative for analytical voices', () => {
    expect(mapVoicesToTone(['Analytical', 'Executive'])).toBe('authoritative')
  })

  it('returns conversational for educational voices', () => {
    expect(mapVoicesToTone(['Educational', 'Cultural'])).toBe('conversational')
  })

  it('returns provocative for contrarian voices', () => {
    expect(mapVoicesToTone(['Contrarian', 'Visionary'])).toBe('provocative')
  })

  it('defaults to authoritative for empty array', () => {
    expect(mapVoicesToTone([])).toBe('authoritative')
  })
})

describe('mapToneToVoices', () => {
  it('returns authoritative voices for authoritative tone', () => {
    expect(mapToneToVoices('authoritative')).toEqual(['Analytical', 'Executive', 'Technical'])
  })

  it('returns conversational voices for conversational tone', () => {
    expect(mapToneToVoices('conversational')).toEqual(['Educational', 'Cultural'])
  })

  it('returns provocative voices for provocative tone', () => {
    expect(mapToneToVoices('provocative')).toEqual(['Contrarian', 'Visionary'])
  })

  it('round-trips through mapVoicesToTone', () => {
    const tones: TonePreference[] = ['authoritative', 'conversational', 'provocative']
    for (const tone of tones) {
      expect(mapVoicesToTone(mapToneToVoices(tone))).toBe(tone)
    }
  })
})
