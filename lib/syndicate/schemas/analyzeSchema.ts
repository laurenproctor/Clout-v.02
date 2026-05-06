import { z } from 'zod'

export const analyzeInputSchema = z.object({
  url: z.string().url({ message: 'Please provide a valid URL.' }),
})

export type AnalyzeInput = z.infer<typeof analyzeInputSchema>
