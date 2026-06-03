import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import type {
  WebsiteOpportunity,
  WebsiteContentGap,
  WebsiteAsset,
  TopicCluster,
} from '@/types/feed'

// TODO: Future — accept POST /api/website-intelligence/analyze to trigger real
// website crawl via lib/scraper/. Store assets in website_assets table, derive
// opportunities via AI analysis, cache results per workspace.
// TODO: Future Knowledge Intelligence Architecture:
//   Source (website URL) → Asset (WebsiteAsset, scraped/indexed) →
//   Opportunity (WebsiteOpportunity, AI-scored) → Content Generation (capture/new with opportunity_id)
//   All asset sources (homepage, blog, case studies, testimonials) create Asset objects.
//   The generate flow uses opportunity_id for server-side context loading.

const DEMO_ASSETS: WebsiteAsset[] = [
  {
    id: 'asset-1',
    type: 'report',
    title: 'The Future of B2B Revenue Intelligence',
    url: '/reports/b2b-revenue-intelligence-2024',
    services: ['Revenue Operations', 'Sales Strategy'],
    extracted_quotes: [
      'Companies using AI-driven revenue intelligence see 34% faster pipeline velocity.',
      'The average B2B deal cycle has shortened by 18% since 2022 for teams with unified data.',
    ],
    extracted_statistics: ['34% faster pipeline velocity', '18% shorter deal cycles', '$2.4M average deal value uplift'],
    extracted_proof_points: ['Surveyed 400+ revenue leaders', 'Validated by Gartner 2024 report'],
    last_promoted_at: '2023-11-15T00:00:00Z',
    published_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'asset-2',
    type: 'case_study',
    title: 'How Meridian Group Cut Sales Cycle by 40%',
    url: '/case-studies/meridian-group',
    services: ['Sales Enablement', 'Revenue Operations'],
    extracted_quotes: [
      '"We went from 90-day average cycles to 54 days in under six months." — CRO, Meridian Group',
    ],
    extracted_statistics: ['40% reduction in sales cycle', '3× pipeline coverage', '22% increase in win rate'],
    extracted_proof_points: ['Fortune 500 client', 'Validated by independent audit'],
    last_promoted_at: '2023-08-22T00:00:00Z',
    published_at: '2023-06-01T00:00:00Z',
    updated_at: '2023-08-22T00:00:00Z',
  },
  {
    id: 'asset-3',
    type: 'service',
    title: 'Revenue Operations Consulting',
    url: '/services/revenue-operations',
    services: ['Revenue Operations'],
    extracted_quotes: [],
    extracted_statistics: [],
    extracted_proof_points: ['10+ years industry experience', 'Certified HubSpot & Salesforce partners'],
    published_at: '2022-03-15T00:00:00Z',
    updated_at: '2024-05-20T00:00:00Z',
  },
  {
    id: 'asset-4',
    type: 'blog',
    title: '5 Signs Your Sales Stack Is Holding You Back',
    url: '/blog/sales-stack-warning-signs',
    services: ['Sales Strategy', 'Technology Consulting'],
    extracted_quotes: [],
    extracted_statistics: ['67% of sales reps say their CRM slows them down'],
    extracted_proof_points: ['Cited by 3 industry publications'],
    last_promoted_at: undefined,
    published_at: '2023-12-05T00:00:00Z',
    updated_at: '2023-12-05T00:00:00Z',
  },
  {
    id: 'asset-5',
    type: 'testimonial',
    title: 'Client Testimonials — Revenue Leaders',
    url: '/testimonials',
    services: ['Revenue Operations', 'Sales Strategy', 'Sales Enablement'],
    extracted_quotes: [
      '"Best ROI on any consulting engagement we\'ve made in the past decade." — VP Sales, Series C startup',
      '"They transformed how our entire GTM team operates." — Head of RevOps, Enterprise SaaS',
    ],
    extracted_statistics: [],
    extracted_proof_points: ['12 testimonials from named clients'],
    last_promoted_at: undefined,
    published_at: '2022-01-01T00:00:00Z',
    updated_at: '2024-04-10T00:00:00Z',
  },
]

const DEMO_OPPORTUNITIES: WebsiteOpportunity[] = [
  {
    id: 'opp-1',
    asset_id: 'asset-1',
    title: 'Revenue Intelligence Report Has Never Been Promoted — 34% Pipeline Velocity Stat Is Trending',
    score: 94,
    confidence: 88,
    status: 'new',
    level: 'high',
    category: 'thought_leadership',
    momentum: '+340%',
    tags: ['revenue intelligence', 'AI', 'pipeline velocity', 'B2B'],
    matched_service: 'Revenue Operations',
    source_type: 'Research Report',
    source_url: '/reports/b2b-revenue-intelligence-2024',
    why_this_matters: 'Your 2024 Revenue Intelligence Report contains proprietary statistics that directly align with a trending conversation about AI-driven sales. Coverage of this topic jumped 340% in 48 hours, and your data has never been promoted — giving you a first-mover angle with credible proof.',
    reasons: [
      {
        type: 'never_promoted',
        score: 35,
        explanation: 'This asset has not been shared or promoted since it was published 8 months ago.',
      },
      {
        type: 'contains_statistics',
        score: 30,
        explanation: 'Contains 3 original statistics including "34% faster pipeline velocity" — high-value for credibility.',
      },
      {
        type: 'trend_match',
        score: 29,
        explanation: 'Coverage of AI revenue intelligence increased 340% in the last 48 hours across 1,200+ publications.',
      },
    ],
    formats: ['LinkedIn article', 'Data-led post', 'Thread', 'Newsletter section'],
    trend_signal_title: 'AI revenue intelligence discussion up 340% in 48 hours',
    trend_asset_count: { 'Research Reports': 1, 'Service Pages': 1 },
    score_breakdown: {
      business_alignment: 92,
      proof_strength: 88,
      content_potential: 95,
      momentum: 90,
      freshness: 72,
      confidence_contribution: 8,
    },
  },
  {
    id: 'opp-2',
    asset_id: 'asset-2',
    title: 'Meridian Case Study: "40% Sales Cycle Reduction" Quote Is Your Strongest Untapped Proof',
    score: 87,
    confidence: 92,
    status: 'new',
    level: 'high',
    category: 'promotion',
    tags: ['case study', 'sales cycle', 'proof', 'B2B'],
    matched_service: 'Sales Enablement',
    source_type: 'Case Study',
    source_url: '/case-studies/meridian-group',
    why_this_matters: 'The Meridian Group case study contains a named CRO quote with specific metrics — the most credible type of proof in B2B content. It was last promoted 10 months ago and has never been repurposed into a standalone post.',
    reasons: [
      {
        type: 'contains_testimonials',
        score: 40,
        explanation: 'Named CRO quote with specific percentage outcome — highest-credibility proof type.',
      },
      {
        type: 'never_promoted',
        score: 30,
        explanation: 'Last promoted 10 months ago. Audience has largely turned over since then.',
      },
      {
        type: 'service_alignment',
        score: 17,
        explanation: 'Directly matches your Sales Enablement service offering.',
      },
    ],
    formats: ['Customer story post', 'Quote card', 'LinkedIn carousel', 'Email feature'],
    score_breakdown: {
      business_alignment: 90,
      proof_strength: 95,
      content_potential: 82,
      momentum: 60,
      freshness: 65,
      confidence_contribution: 12,
    },
  },
  {
    id: 'opp-3',
    asset_id: 'asset-4',
    title: 'Repurpose "5 Signs Your Sales Stack Is Holding You Back" — 67% Stat Never Quoted',
    score: 78,
    confidence: 80,
    status: 'new',
    level: 'medium',
    category: 'repurpose',
    tags: ['sales technology', 'CRM', 'productivity'],
    matched_service: 'Technology Consulting',
    source_type: 'Blog Post',
    source_url: '/blog/sales-stack-warning-signs',
    why_this_matters: 'This evergreen blog post contains a striking statistic — 67% of reps say their CRM slows them down — that has never been highlighted as a standalone post. The piece has been cited by 3 industry publications, indicating external validation.',
    reasons: [
      {
        type: 'contains_statistics',
        score: 32,
        explanation: '"67% of sales reps say their CRM slows them down" is a shareable, debate-sparking stat.',
      },
      {
        type: 'evergreen_content',
        score: 28,
        explanation: 'Topic remains consistently relevant — not time-sensitive, has long shelf life.',
      },
      {
        type: 'never_promoted',
        score: 18,
        explanation: 'Never promoted despite being cited externally — audience has not seen it from you.',
      },
    ],
    formats: ['Statistic post', 'Poll', 'Opinion piece', 'Short video script'],
    score_breakdown: {
      business_alignment: 75,
      proof_strength: 72,
      content_potential: 80,
      momentum: 55,
      freshness: 70,
      confidence_contribution: 5,
    },
  },
  {
    id: 'opp-4',
    asset_id: 'asset-5',
    title: 'Client Testimonials Page Has 12 Quotes — Zero Have Been Posted as Content',
    score: 72,
    confidence: 95,
    status: 'new',
    level: 'medium',
    category: 'promotion',
    tags: ['social proof', 'testimonials', 'trust'],
    matched_service: 'Revenue Operations',
    source_type: 'Testimonials',
    source_url: '/testimonials',
    why_this_matters: 'You have 12 named client testimonials including C-suite voices from a Series C startup and Enterprise SaaS. None have been promoted as content. Testimonials are the #1 most-trusted content type for B2B buyers.',
    reasons: [
      {
        type: 'contains_testimonials',
        score: 38,
        explanation: '12 named testimonials including C-suite titles — premium social proof.',
      },
      {
        type: 'never_promoted',
        score: 34,
        explanation: 'Testimonials page exists but quotes have never been featured in content.',
      },
    ],
    formats: ['Quote post', 'Client spotlight', 'Carousel', 'Newsletter feature'],
    score_breakdown: {
      business_alignment: 85,
      proof_strength: 90,
      content_potential: 70,
      momentum: 40,
      freshness: 60,
      confidence_contribution: 15,
    },
  },
  {
    id: 'opp-5',
    asset_id: 'asset-3',
    title: 'RevOps Service Page Aligns With Trending "Revenue Intelligence" Discussion',
    score: 65,
    confidence: 74,
    status: 'new',
    level: 'emerging',
    category: 'trend_match',
    momentum: '+180%',
    tags: ['revenue operations', 'AI', 'trend'],
    matched_service: 'Revenue Operations',
    source_type: 'Service Page',
    source_url: '/services/revenue-operations',
    why_this_matters: 'Revenue Operations discussions are up 180% in the past week, driven by AI automation announcements. Your service page addresses the exact capability buyers are researching right now.',
    reasons: [
      {
        type: 'trend_match',
        score: 35,
        explanation: 'RevOps topic surge aligns directly with your service offering page.',
      },
      {
        type: 'service_alignment',
        score: 30,
        explanation: 'Service page is the canonical asset for this trend — strong authority signal.',
      },
    ],
    formats: ['Timely insight post', 'LinkedIn comment thread', 'Short take'],
    trend_signal_title: 'Revenue Operations automation discussion up 180% this week',
    trend_asset_count: { 'Service Pages': 1 },
    score_breakdown: {
      business_alignment: 80,
      proof_strength: 50,
      content_potential: 65,
      momentum: 85,
      freshness: 78,
      confidence_contribution: -4,
    },
  },
]

const DEMO_GAPS: WebsiteContentGap[] = [
  {
    id: 'gap-1',
    headline: '12 Client Success Stories Exist',
    detail: 'Only 2 have been promoted in the last 12 months. Most of your audience has never seen them.',
    opportunity: 'Create a monthly customer spotlight series — one featured client per month with a short-form story post, a quote card, and a "lessons learned" angle.',
    matched_service: 'Sales Enablement',
    tags: ['social proof', 'case studies', 'content series'],
  },
  {
    id: 'gap-2',
    headline: 'No Content Addresses Mid-Funnel Buyers',
    detail: 'Your top-of-funnel thought leadership content is strong, but there are no posts that address evaluation-stage questions buyers ask (pricing philosophy, implementation timeline, team fit).',
    opportunity: 'Create a "What to expect working with us" series covering onboarding, ROI timeline, and team structure — the questions that convert consideration into conversation.',
    matched_service: 'Revenue Operations',
    tags: ['funnel', 'conversion', 'mid-funnel'],
  },
]

const DEMO_CLUSTERS: TopicCluster[] = [
  {
    id: 'cluster-1',
    name: 'Revenue Velocity',
    assets: ['asset-1', 'asset-2', 'asset-3'],
    services: ['Revenue Operations', 'Sales Enablement'],
    opportunity_score: 91,
  },
]

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    items: DEMO_OPPORTUNITIES,
    gaps: DEMO_GAPS,
    assets: DEMO_ASSETS,
    clusters: DEMO_CLUSTERS,
    last_analyzed_at: null,
    website_url: null,
  })
}
