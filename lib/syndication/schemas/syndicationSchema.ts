import { z } from 'zod'

export const syndicationRequestSchema = z.object({
  input: z
    .string()
    .min(1, 'Please provide a URL or paste your content.')
    .max(50_000, 'Content is too long.'),
  platforms: z
    .array(z.enum(['x', 'linkedin', 'substack', 'blog']))
    .min(1, 'Select at least one platform.'),
  lenses: z.array(z.string()).max(2, 'Select a maximum of 2 lenses.').default([]),
})

export type SyndicationRequestInput = z.infer<typeof syndicationRequestSchema>
