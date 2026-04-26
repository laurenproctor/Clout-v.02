# Inbox Post Preview Drawer — Design Spec

**Date:** 2026-04-26
**Status:** Approved

---

## Problem

The Inbox (This Week's Plan) shows post cards with truncated excerpts (~140 chars). Users cannot read the full post before deciding to approve or skip, and there is no visible indicator of which network/channel each post targets.

---

## Solution

A **side drawer** that slides in from the right when a card is clicked, showing the full post body alongside the list. The list stays visible and interactive on the left. The drawer is the primary reading and action surface.

---

## Layout

- **Two-pane:** list on the left, drawer overlaid on the right
- **Drawer width:** 920px (fixed), slides in from the right edge of the main content area
- **List pane:** remains visible behind the drawer with a dim overlay (`rgba(24,24,27,0.12)`) and `filter: blur(3px)` applied directly to the list-pane element
- **Blur scoping:** blur is a CSS `filter` on `.list-pane` (a sibling of the drawer), never a `backdrop-filter`, ensuring the drawer stays crisp
- **Transition:** drawer uses `cubic-bezier(0.16, 1, 0.3, 1)` slide-in; overlay and blur fade in together at `0.22s ease`

---

## Drawer Structure

### Header

- **Meta row:** `Reviewing N of 6 this week` (uppercase, muted) — left
- **Prev / Next chevron buttons** + **Close (✕)** — right
- **Post title:** 22px semibold, `letter-spacing: -0.02em`, multi-line allowed
- **Channel row:** monochrome channel badge + suggested slot timestamp
- Header padding: `16px 50px 14px`

### Body

- Font: 19px, line-height 1.85, color `#27272a`, `white-space: pre-wrap`
- Padding: `20px 50px 0`
- Scrollable independently
- **Keyboard shortcuts hint** at bottom of body: J · K · A · E · Esc displayed as `<kbd>` chips

### Footer (sticky)

- Padding: `14px 50px`
- Border-top: `1px solid #f4f4f5`
- Layout: `[Skip]` — spacer — `[Edit in Studio]` `[Approve & Queue]`
- **Skip:** ghost button (border `#e4e4e7`, text `#71717a`)
- **Edit in Studio:** secondary button (`#f4f4f5` bg)
- **Approve & Queue:** primary button (`#18181b` bg, white text)

---

## Active Card Styling

When a card is open in the drawer:

- Left accent bar: 3px `#18181b` strip on the card's left edge (via `::before` pseudo-element)
- Border: `1px solid #18181b` + `box-shadow: 0 0 0 1px #18181b`
- Checkbox: filled `#18181b` with white checkmark SVG

---

## Channel Badge

Replaces any platform-colored chip. All channels use the same monochrome style:

- Uppercase label (e.g. `LINKEDIN`, `NEWSLETTER`)
- Background `#f4f4f5`, border `1px solid #e4e4e7`, text `#52525b`
- Font: 10px, weight 500, letter-spacing 0.02em

---

## Navigation

### Prev / Next controls

- Chevron buttons in the drawer header
- `prevBtn` disabled when on first post; `nextBtn` disabled when on last
- Navigating updates: title, channel badge, slot, body, meta row counter, active card in list
- Drawer body scrolls to top on each navigation

### Keyboard shortcuts

| Key   | Action              |
| ----- | ------------------- |
| `J`   | Next post           |
| `K`   | Previous post       |
| `A`   | Approve & Queue     |
| `E`   | Edit in Studio      |
| `S`   | Skip (close drawer) |
| `Esc` | Close drawer        |

Shortcuts work whether or not the drawer is open (J/K open it when closed).

---

## Interaction Flow

1. User lands on Inbox — list of cards, no drawer open
2. User clicks a card (or presses J/K) → drawer slides in, overlay + blur activates on list
3. User reads full post, sees channel + suggested time
4. User acts via footer buttons or keyboard:
   - **Approve & Queue** → post disappears from list, drawer advances to next post (or closes if last)
   - **Skip** → drawer closes, card remains in list
   - **Edit in Studio** → navigate to Studio with this post loaded
5. Clicking the dimmed list area closes the drawer

---

## Design Aesthetic

Linear × Superhuman × editorial software. No loud colors, no clutter. Premium, calm confidence. All interactive states use monochrome transitions.

---

## Open Questions

- **Channel name resolution:** `Output.channelId` is a string ID, not a display name. The weekly-plan API response must either join channel data (platform + name) or the drawer falls back to displaying `channelId` directly. Recommend joining channel in the API route.
- **Approve & advance:** after approving the last post in the list, the drawer closes and the list shows the empty state. Confirm this is the desired behavior.

---

## Files

- Mockup: `.superpowers/brainstorm/58213-1777212295/content/panel-refined.html`
- Implementation target: `app/(dashboard)/inbox/page.tsx`
