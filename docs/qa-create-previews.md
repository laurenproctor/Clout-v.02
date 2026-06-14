# Manual QA — Network previews in `/create` flows

Verifies the live `SocialPreviewInline` shown across scoped `/create` result flows (Threads,
LinkedIn, Instagram, Note, Substack, Substack Email, Blog). The bar is not "does it look good" —
it's **can the preview be trusted as a representation of what will publish**: no fake identity, no
stale state, no silent replacement of user edits, and no divergence from the editable content.

> The new component is the **"PREVIEW"** block at the top of each result card / result view.

## 0. Setup (once)

- [ ] Dev server running: `npm run dev` → open http://localhost:3000 and sign in (Clerk).
- [ ] **Confirm this test workspace has only LinkedIn connected** (Settings → Channels). This is the
      *current expected fixture state*, not a universal default. If other channels are connected,
      either disconnect them or update the author matrix in §8 before testing — otherwise a correctly
      behaving preview (real Instagram/Substack author) will look like a bug.

### Standard source text (paste this everywhere)

Using the same input across flows makes preview differences easy to spot:

```text
AI tools are changing how marketing teams work, but the real advantage is not speed. The advantage is building a repeatable operating system for insight, distribution, and learning. The best teams will not just publish more. They will develop sharper judgment faster.
```

## 1. Global checks (apply to every flow)

- [ ] **A. Live update** — editing the text/caption/title updates the PREVIEW instantly.
- [ ] **B. Expand → modal** — the expand icon (top-right of the preview) opens a centered
      **"Post preview"** modal at full size; ✕ or backdrop closes it.
- [ ] **Modal reflects current editable state** — the modal shows the **live-edited** content, not the
      original generated output. (Edit text, then expand: your edit must be present.)
- [ ] **C. Connected author** — connected channel → real profile **name + avatar**, or initials if no
      photo.
- [ ] **D. Disconnected author** — not connected → neutral **"Account"** + initial, **no fake @handle**.
- [ ] **No fabricated metadata (connected too)** — connected channels use only real available profile
      data; missing handle/headline/photo falls back cleanly (e.g. initials) and is **never invented**.
- [ ] **No interference with actions** — the preview is visual-only: it does not block or alter
      **Save, Queue, Schedule, Publish**, or the editor controls. Run a Save (and Queue where present)
      with the preview on screen and confirm it still works.
- [ ] **Narrow/mobile width** — shrink the window or use DevTools responsive mode: the PREVIEW stays
      readable, doesn't overflow its card/column, and the modal still opens/closes.

## 2. Threads — `/<slug>/create/threads`  (disconnected author)

- [ ] Paste source → **Generate Threads Post** (~15–30s).
- [ ] Result cards each show a PREVIEW Threads card (avatar, name, ♥/💬/🔁/➤).
- [ ] A: edit text → preview updates live.
- [ ] B + modal-state: expand → "Post preview" modal opens and shows the live-edited text.
- [ ] D: author = **"Account"**, "A" initial, no handle.

## 3. LinkedIn — `/<slug>/create/linkedin`  (CONNECTED author)

- [ ] Under **POST TYPE** click **Text Post** (Generate stays disabled until a type is picked).
- [ ] Pick an **INTENT** (e.g. Generate Leads). Paste source.
- [ ] **Generate LinkedIn Post** (~30–60s; makes 3 variations + coaching).
- [ ] A / B / modal-state.
- [ ] C: author = the **connected LinkedIn profile name + avatar** (initials if no photo).
      In this dev workspace the expected value is **"Lauren Proctor" + "LP"** initials, with
      "…see more" truncation + Like/Comment/Repost row.
- [ ] No-fabrication: since this channel has no photo, confirm it shows initials — **not** a stock
      avatar — and no invented @handle/headline.
- [ ] ⚠ If **Generate** does nothing on click, capture DevTools (F12) → Console/Network and report.

## 4. Instagram — `/<slug>/create/instagram`  (CAROUSEL)

- [ ] Under **VISUAL FORMAT** click **Educational Carousel**; pick an **INTENT**. Paste source.
- [ ] **Generate Instagram Post** (~30–60s).
- [ ] Carousel renders in the PREVIEW (slides + dots/counter + arrows).
- [ ] **Live carousel preservation** — edit a slide/caption → the live slides stay shown and are
      **not replaced** by an older saved/generated image.
- [ ] A / B / modal-state: caption edit → live update; expand → modal with current content.
- [ ] D: author = **"Account"**.
- [ ] ⚠ Same as LinkedIn: if Generate does nothing, capture console/network.

## 5. Note — `/<slug>/create/note`

- [ ] Paste source → **Generate Note**.
- [ ] PREVIEW renders (Substack-style card). A / B / modal-state work. Author disconnected unless
      Substack is connected.

## 6. Substack & Substack Email

- [ ] **Substack** — `/<slug>/create/substack`: paste source, choose Type/Length → **Generate Article**.
- [ ] **Substack Email** — `/<slug>/create/substack-email`: same setup → **Generate Substack Email**.
- [ ] For both: PREVIEW sits at the **top of the left column**, above the article body, showing
      title + body; expand → modal with current content.

## 7. Blog — `/<slug>/create/blog`  (multi-step wizard)

- [ ] Setup → Generate → choose headline → **Refine & Generate** → build article → continue to the
      **final result** step.
- [ ] PREVIEW (Article-style card) appears at the **top of the left column**, above the editor.
- [ ] A / B / modal-state work.

## 8. Author-state matrix

Generic expectation first; dev-workspace value in parentheses.

| Flow | Expected author |
|---|---|
| LinkedIn | Connected LinkedIn profile name + avatar/initials (here: **Lauren Proctor** + "LP") |
| Threads / Instagram / Note / Substack / Substack Email / Blog | **Account** + initial, no @handle (disconnected) |

- [ ] To test a *connected* non-LinkedIn author: connect that platform in **Settings → Channels**,
      re-run the flow, confirm the preview shows that channel's real name/avatar (and update this
      matrix so the disconnected expectations stay accurate).

## 9. Reporting issues

- Generate does nothing / hangs → DevTools **Console** + **Network**, copy red errors.
- Preview doesn't update → note the flow + whether the modal also fails to update.
- Wrong/invented avatar or handle → screenshot + which channel is connected.
- Overflow at mobile width → screenshot + viewport size.

---

### Automated coverage already done (for reference)

- ✅ Threads `/create`: live update, expand modal, disconnected author — verified via Playwright.
- ✅ Connected author (here "Lauren Proctor" + "LP"): verified on the Studio preview (same
  `SocialPreview` + `resolvePreviewAuthor` the `/create` cards use).
- ⚠ Instagram carousel + LinkedIn/Instagram `/create` generation: **not** verifiable headlessly
  (generation didn't initiate in a headless browser) — these are the items most worth a manual pass.
