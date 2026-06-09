export interface ScrapedArticle {
  url: string
  title: string
  author?: string
  siteName?: string
  publishedAt?: string
  htmlContent: string
  markdownContent: string
  excerpt?: string
  wordCount: number
  extractionMethod: 'readability' | 'jina'
}

export interface ExtractionResult {
  title: string
  author?: string
  siteName?: string
  publishedAt?: string
  html: string
  excerpt?: string
}
