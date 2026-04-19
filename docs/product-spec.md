# Clout — Product Specification

## North Star

> Clout exists to turn messy raw thoughts into polished publish-ready authority content in under 60 seconds.

Every product decision is tested against this. If a feature doesn't serve the 60-second transformation loop, it waits.

## First Build Rule

The core loop must work before anything else ships:

1. User submits a messy thought (any modality)
2. A Lens is applied
3. A strong output is generated
4. User edits the draft
5. Output is saved

If these five steps don't work end-to-end, everything else is distraction.

## Who Is Clout For

**Primary user:** Non-technical founders, executives, and operators who have ideas worth sharing but lack time or writing skill to publish consistently. They think in insights, not in content formats. Clout is their writing partner, not their workflow tool.

**Operators:** Two tiers of operators manage client workspaces on behalf of thought leaders:
- **Clout staff (super_admin):** Internal team members who can access and assist any workspace.
- **Agency operators (agency_operator):** External partners assigned to specific client workspaces. They assist with content review, lens management, and output approval.

Both operator types use the same system — no separate product.

## Core Concepts

### Workspace
The organizational unit. In v1, one workspace per thought leader. Contains a profile, a subscription, members, captures, lenses, and outputs.

### Profile
The thought leader's identity within a workspace. Not a user account — a content identity. Includes:
- Display name, bio, industries
- Target audiences
- Tone notes (e.g. "Direct but warm. Never uses jargon.")
- Mental models: named frameworks the thought leader reasons through
- Philosophies: core beliefs that inform their worldview
- Sample content: reference writing for style matching

The profile is passed as context in every generation. Lenses amplify it — they don't replace it.

### Capture
A raw input. Modality-agnostic: text dump, voice memo, URL with context, or a structured short-form prompt. All types normalize into the same pipeline. A capture is the starting point — it is never modified after processing begins.

### Lens
A named prompt template that shapes the generation. A Lens is not just a tone preset — it encodes a way of seeing. Examples: "Contrarian Take," "First Principles Breakdown," "Story Arc." A Lens applied to a capture + profile produces output that sounds like the thought leader thinking through that lens.

Two scopes:
- **System lenses:** Curated by Clout, available to all workspaces.
- **Workspace lenses:** User-defined, private to the workspace.

### Generation
The AI processing event. Takes: a capture + a lens + a profile. Produces: a raw output. Immutable once complete. Tracked fields: model used, full prompt snapshot, token count, duration, status.

### Output
A generated piece of content. Has structured content (JSONB): body text, optional hook, hashtags, word count, and channel-specific fields. Goes through a status workflow: `draft → review → approved → published`. Outputs are versioned — every edit creates a new version snapshot, never overwrites.

### Channel
A publishing destination. In v1: LinkedIn, newsletter, X/Twitter. Stores format config (character limits, hashtag preferences, etc.). **No publishing in v1** — channels are modeled and configurable but not wired to any external API.

### Workflow Status
The lifecycle of an output: `draft` → `review` → `approved` → `published` → `archived`.

### Operator Mode
Operators access client workspaces via role assignment on the workspace record. They do not impersonate users. Actions taken by operators are logged in audit_logs with their actor_id.

## Business Model

Two delivery modes, one codebase:

- **Self-serve SaaS:** Users sign up, set up their workspace, and use Clout independently. Subscription managed via Stripe.
- **Managed service:** An operator is assigned to the workspace. They assist with content strategy, review outputs, tune lenses, and ensure quality. The thought leader still owns their workspace.

Plan limits are stored as JSONB in `subscriptions.entitlements`, not hardcoded — adjust without deploys.

## Out of Scope for v1

- Social publishing (no OAuth connections to LinkedIn, Twitter, etc.)
- Analytics integrations (no engagement tracking)
- Multi-workspace per user
- White-labeling for agency operators
- Team collaboration workflows
- Mobile app
