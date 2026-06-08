import { describe, it, expect } from 'vitest'
import { detectLang } from '@/lib/bluesky/richtext'

describe('detectLang', () => {
  it('returns en for plain English text', () => {
    expect(detectLang('Hello world this is a test')).toBe('en')
  })

  it('returns zh for CJK text', () => {
    expect(detectLang('这是一个测试')).toBe('zh')
  })

  it('returns ko for Korean text', () => {
    expect(detectLang('안녕하세요 테스트입니다')).toBe('ko')
  })

  it('returns ar for Arabic text', () => {
    expect(detectLang('مرحبا بالعالم')).toBe('ar')
  })

  it('returns ru for Cyrillic text', () => {
    expect(detectLang('Привет мир')).toBe('ru')
  })

  it('returns he for Hebrew text', () => {
    expect(detectLang('שלום עולם')).toBe('he')
  })

  it('returns hi for Devanagari text', () => {
    expect(detectLang('नमस्ते दुनिया')).toBe('hi')
  })

  it('defaults to en for mixed or unknown scripts', () => {
    expect(detectLang('café résumé')).toBe('en')
  })
})
