# Admin Sidebar Refactor — Design Spec

**Date:** 2026-05-14  
**Status:** Approved

---

## Context

The left sidebar currently has 13 main nav items plus 4 footer links (Brand, Channels, Publishing, Settings) and a Help button — 18 interactive targets in total. This creates clutter and blurs the line between "using the app" and "configuring the app." The goal is to separate daily-driver navigation from admin/configuration by introducing a dedicated Admin mode that fully replaces the sidebar, similar to the Google Ads Admin pattern.

---

## Design

### Behavior

The sidebar has two modes, driven entirely by the current pathname — no React state required.

**Main mode** (default): Shows the main nav. The footer is replaced by a single "Admin →" entry that links to `/settings/brand`. When the user navigates to any admin path, the sidebar automatically switches to Admin mode.

**Admin mode**: Activated when the pathname matches any admin path (see list below). Shows a compact header with a "← Back" link to `/dashboard` and the word "Admin", followed by the 7 admin nav items. Clicking "← Back" returns to main mode.

### Admin paths (trigger admin mode)

- `/settings/brand`
- `/channels` and `/channels/*`
- `/settings/publishing`
- `/schedule`
- `/billing`
- `/settings/workspace` and remaining `/settings/*`

### Main nav items (after refactor)

Schedule and Billing are removed from the main nav and moved to Admin.

| Label | Path | Icon |
|---|---|---|
| Dashboard | `/dashboard` | LayoutDashboard |
| Inbox | `/inbox` | Inbox |
| Queue | `/queue` | ListOrdered |
| Capture | `/capture` | Zap |
| Create | `/create` | Sparkles |
| Private | `/private` | Lock |
| Content Analyzer | `/analyze` | Network |
| Syndicate | `/syndicate` | Share2 |
| Studio | `/studio` | PenSquare |
| Lenses | `/lenses` | Layers |
| Analytics | `/analytics` | BarChart2 |

### Admin nav items

| Label | Path / Action | Icon |
|---|---|---|
| Brand | `/settings/brand` | Palette |
| Channels | `/channels` | Radio |
| Publishing | `/settings/publishing` | Send |
| Schedule | `/schedule` | CalendarClock |
| Billing | `/billing` | CreditCard |
| Settings | `/settings/workspace` | Settings |
| Help | Opens SupportModal | HelpCircle |

### Visual style

Admin sidebar uses the same white/light styling as the main sidebar — same background, same active state (`bg-zinc-100`), same font weights. The only structural difference is the header row (Back button + "Admin" title).

### Keyboard shortcuts hint

The `⌘K` / `G + letter` hint block currently lives in the footer. It moves to just above the "Admin →" entry in the main sidebar footer, keeping it discoverable.

---

## Files Changed

**Only one file changes:**

- `components/shell/sidebar.tsx`
  - Remove `Schedule` and `Billing` from `navItems`
  - Add `adminItems` array (7 items above)
  - Add `ADMIN_PATHS` constant for path detection
  - Split `NavContent` into two render paths based on `isAdminMode` (derived from `usePathname()`)
  - Main footer: keyboard hint block + single "Admin →" `<Link>` to `/settings/brand`
  - Admin header: "← Back" `<Link>` to `/dashboard` + "Admin" label
  - Admin nav: maps `adminItems`; Help item renders as `<button>` triggering `SupportModal`

---

## Verification

1. Navigate to `/dashboard` — main sidebar shows 11 items, footer shows keyboard hints and "Admin →"
2. Click "Admin →" — sidebar switches to admin mode, Brand is active, Back button is present
3. Click each admin item — correct page loads, item highlights as active
4. Click "← Back" — returns to `/dashboard`, main sidebar restores
5. Navigate directly to `/billing` via URL — sidebar is automatically in admin mode
6. Navigate directly to `/channels` via URL — sidebar is automatically in admin mode
7. Click Help in admin mode — SupportModal opens
8. Open mobile drawer — both modes work in the Sheet as before
