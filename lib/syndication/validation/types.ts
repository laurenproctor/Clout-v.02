export interface ValidationResult {
  publishable: boolean        // whether the post can be sent to the API at all
  technicalErrors: string[]   // hard blockers: over character limit, invalid media type
  qualityWarnings: string[]   // soft issues: corporate phrasing, weak hook, emoji overuse
  platformRisks: string[]     // cross-platform contamination: sounds like LinkedIn, tweetstorm cadence
}
