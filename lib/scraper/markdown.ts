import TurndownService from 'turndown'

let _td: TurndownService | null = null

function getTurndown(): TurndownService {
  if (_td) return _td
  _td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '_',
    strongDelimiter: '**',
  })

  // Preserve code blocks
  _td.addRule('fencedCodeBlock', {
    filter: (node) =>
      node.nodeName === 'PRE' &&
      node.firstChild?.nodeName === 'CODE',
    replacement: (_, node) => {
      const code = node as HTMLElement
      const lang = (code.firstChild as HTMLElement)?.className?.replace('language-', '') ?? ''
      const content = (code.firstChild as HTMLElement)?.textContent ?? ''
      return `\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\n`
    },
  })

  // Preserve blockquotes cleanly
  _td.addRule('blockquote', {
    filter: 'blockquote',
    replacement: (content) => {
      const lines = content.trim().split('\n')
      return '\n\n' + lines.map(l => `> ${l}`).join('\n') + '\n\n'
    },
  })

  // Remove empty links but keep link text
  _td.addRule('cleanLinks', {
    filter: (node) =>
      node.nodeName === 'A' && !(node as HTMLAnchorElement).href,
    replacement: (content) => content,
  })

  return _td
}

export function toMarkdown(html: string): string {
  const td = getTurndown()
  const md = td.turndown(html)
  // Collapse excessive blank lines
  return md.replace(/\n{3,}/g, '\n\n').trim()
}
