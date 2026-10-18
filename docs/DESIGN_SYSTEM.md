# Namma Civic — Design System: "Civic Record"

Art direction: **warm editorial community × spatial civic record**. The owner expanded the product into a social experience on 18 October 2026; the community feed is now the home screen, with the earlier city presentation at `/city`.
Neutral surfaces and ink actions; a clay accent identifies community actions and the **civic status palette retains its own meanings**. The signature element is
**bilingual typography** — every primary heading pairs English with ಕನ್ನಡ, set as equals, not as a subtitle afterthought.

Tokens live in `apps/web/src/styles/tokens.css` (Tailwind v4 `@theme static`, including tokens consumed by lazy-route CSS). **Token names are a contract**; values may be
refined by the design-system owner. Components never use raw hex.

## Colour
| Token | Light | Dark | Use |
|---|---|---|---|
| canvas | #f7f5f1 | #191816 | page background |
| surface / surface-2 | #ffffff / #eeebe5 | #23211e / #2d2a25 | cards, sheets |
| ink / ink-2 / ink-3 / ink-4 | #17212b / #394957 / #596978 / #86868b | #f2f5f8 / #d1dae4 / #a6b3c2 / #86868b | text tiers (ink-4 = non-essential only) |
| hairline | 10% black | 12% white | 0.5–1 px separators |
| primary / on-primary | #17212b / #fff | #f2f5f8 / #17212b | primary buttons (ink pill) |
| link, focus | #0066cc, #0071e3 | #2997ff, #0a84ff | links, focus ring |
| community-accent / tint | #a8492d / #f7e9e1 | #eca783 / 12% accent | community actions, separate from civic status |

**Status palette** (text colour ≥ 4.5:1 on surface; `-tint` for pill backgrounds):
`st-reported` orange · `st-ack` blue · `st-progress` indigo · `st-awaiting` amber · `st-verified` green · `st-reopened` red ·
`st-closed` grey. Map markers use the same hues. Status is never conveyed by colour alone — always a label or icon shape too.

## Type
Inter Variable (Latin) + Noto Sans Kannada Variable (Kannada), both OFL. Community display headings use Georgia for an Anthropic-inspired editorial treatment. Exact Anthropic Sans/Serif/Mono redistribution rights have not been verified, so no proprietary font files are shipped. If the relevant families are installed locally, the optional family names can resolve first. SF Pro is not licensed for web use.
| Role | Size / line / weight / tracking |
|---|---|
| Display (hero) | 44–64 px / 1.06 / 600 / −0.055em |
| Title 1 | 40 px / 1.1 / 600 / −0.025em |
| Title 2 | 28 px / 1.15 / 600 / −0.02em |
| Title 3 | 21 px / 1.25 / 600 / −0.015em |
| Body | 17 px / 1.47 / 400 / −0.022em |
| Callout | 15 px / 1.4 / 400 |
| Footnote / caption | 13 px / 1.38 / 400–500 |
| Eyebrow | 12 px / 600 / +0.08em uppercase |
Kannada lines: tracking 0, line-height ≥ 1.6, never italic, never all-caps. Numbers in metrics: tabular figures.

## Spacing, radius, elevation
4-pt grid (4, 8, 12, 16, 20, 24, 32, 40, 56, 80, 120). Radii: xs 6 · sm 10 · md 14 · lg 20 · xl 28 · pill.
Elevation is rare: cards are separated by surface contrast and hairlines first; `shadow-card` for floating cards on the map,
`shadow-float` for sheets and popovers only.

## Materials
`.material-chrome` (frosted, 85% surface + saturate(180%) blur(20px)) is used **only for chrome that floats over the map**:
top nav, map filter bar, map sheet header, tab bar. Never behind body text blocks. Solid fallback when backdrop-filter is
unsupported and under `prefers-reduced-transparency`.

## Motion
Springs for spatial movement (sheets, cards): stiffness ~380, damping ~34. Fades/colour: 160–240 ms, `ease-standard`.
Content enters with a 12–16 px rise + fade, staggered ≤ 40 ms. Everything collapses to instant under `prefers-reduced-motion`.
No bouncing loaders: use skeletons with a slow shimmer (disabled under reduced motion).

## Components (contract names in `apps/web/src/components/ui`)
Button (primary ink pill / secondary fill / plain link / destructive), IconButton, SegmentedControl, Chip/FilterChip,
StatusPill, Card, Sheet (bottom sheet on mobile, side panel ≥ 1024 px), Dialog, Popover/"How this is computed",
MetricCard (value, unit, n, definition popover, small-sample caution), Timeline, BeforeAfter slider, Skeleton,
EmptyState, Toast (sonner), BilingualHeading, Avatar (initials for personas), DemoBadge, KeyValue list.

## Accessibility (blocking)
Hit targets ≥ 44×44 px. Text contrast ≥ 4.5:1 (≥ 3:1 for ≥ 24 px text and UI glyphs). Visible focus ring everywhere.
Every map action has a list equivalent. Forms have labels; errors are inline text, not colour only. `lang="kn"` on Kannada
text. Respect reduced motion/transparency. Works at 320 px width and 200% zoom.

## Anti-generic rules (from the brief — these make it look AI-made)
No purple/blue gradients, no glowing blobs, no icon-in-rounded-square feature grids, no centred hero with two equal buttons,
no uniform 3-up card grids as the main layout, no emoji, no drop shadows on everything, no "AI sparkle" icons on every AI
feature, no lorem-style marketing copy. Instead: real data on screen (the live map, a real issue record, the ledger gap),
editorial asymmetric layouts, numbers set large in tabular figures, bilingual headings, generous whitespace.
