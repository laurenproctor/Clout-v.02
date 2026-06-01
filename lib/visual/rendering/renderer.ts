// lib/visual/rendering/renderer.ts
// Renderer abstraction — allows swapping rendering backends without touching callers.

export interface Renderer {
  render(html: string, width: number, height: number, templateId?: string): Promise<Buffer>
}
