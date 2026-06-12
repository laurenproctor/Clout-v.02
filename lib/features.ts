export const FEATURES = {
  substackPublishing: process.env.SUBSTACK_PUBLISHING_ENABLED === 'true',
  // Master switch for the LinkedIn beta connector (Unipile). When false, no Unipile
  // route or client method may run, regardless of per-workspace beta settings.
  linkedinUnipileEnabled: process.env.LINKEDIN_UNIPILE_ENABLED === 'true',
}
