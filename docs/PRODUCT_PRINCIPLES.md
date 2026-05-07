# Clout — Product Principles

These principles govern every feature decision. When a proposed feature violates one of these, that is the reason to not build it.

---

## Core Philosophy

> The interface should feel like a strategic conversation, not a control panel.

Clout is not AI writing software. It is narrative positioning infrastructure for thought leaders. The moat is editorial decomposition, narrative orchestration, and audience psychology — not generation speed. Generation speed will commoditize. Strategic alignment will not.

---

## The Five Principles

### 1. Inference over configuration

The system should infer more than it asks. Smart defaults should be pre-filled from context — audience identity, narrative temperature, brand voice — not left blank for the user to configure. Every visible control implies the user needs to manage it. Most controls should be invisible.

> More controls visible = less perceived intelligence.

### 2. Collaboration over automation

The pause after Narrative Strategy is not a loading state. It is the product. The highest-value interaction is not generation — it is editorial alignment before execution: shaping positioning, refining conviction, selecting narrative tension, calibrating rhetoric. The article is the output artifact of that alignment, not the goal itself.

> The workflow is: strategy → collaboration → execution. Not: prompt → output.

### 3. Positioning over production

Users do not want content. They want articulation, positioning clarity, conviction, sharper framing, and strategic leverage. Hook Exploration may be more valuable than article generation. Narrative strategy discovery may be more valuable than hook exploration. Optimize for the cognitive layer, not the output layer.

> The scarce resource is differentiated perspective, not word count.

### 4. Orchestration over prompting

Narrative Temperature, rhetorical calibration, emotional pacing, strategic weighting — these are orchestration primitives, not user-facing controls. They belong inside `buildBlogPrompt.ts`, not inside the UI. Users should feel "this system understands what I'm trying to do" — not "I am manually configuring a persuasion engine."

> Sophistication lives in the engine, not the surface.

### 5. Clarity over control density

Qualitative signals over numeric scores. Directional explanations over arbitrary ratings. The system should feel like an intelligent editorial collaborator, not an optimization engine. Fake precision destroys trust. `Argument Coherence: 84` is dashboard theater. `Argument Coherence: Strong — the article maintains consistent strategic tension throughout all major sections` is editorial intelligence.

> When in doubt, say less and mean more.

---

## What This System Is Not

- Not an SEO suite
- Not a CMS
- Not an AI copy generator
- Not an analytics dashboard
- Not a content scheduling tool

Adding features from those categories violates the product's center of gravity.

---

## The Illusion of Effortless Intelligence

The final risk is the hardest to protect against: breaking the illusion of effortless intelligence through visible machinery. The best version of Clout is calm, minimal, and editorially sharp — while doing extraordinary orchestration underneath. Every accordion, every toggle, every visible configuration option is a small tax on that illusion.

When adding features, ask: does this make the system feel smarter, or does it make the user feel like an operator?

---

## Protected Core (non-negotiable in v1)

These are the genuinely differentiated layers. Do not ship without them:

1. **Narrative review pause** — the moment Clout becomes a strategic collaborator instead of a generator
2. **Hook Exploration** — narrative discovery, not just headline writing
3. **Platform psychology** — behavioral adaptation per environment, not format reformatting
4. **Per-section regeneration** — targeted editing, not full regeneration cycles
5. **Qualitative strategic insights** — editorial intelligence, not fake numeric scores

Everything else can remain lightweight until real usage reveals where the emotional gravity of the product actually sits.
