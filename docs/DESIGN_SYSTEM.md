# LeadNet — Design System: "Civic Record"

Art direction: **apple.com restraint × Apple Maps × Apple Health**. A calm public record, not a social app.
Neutral surfaces and ink-black actions; the **civic status palette carries all the chroma**. The signature element is
**bilingual typography** — every primary heading pairs English with ಕನ್ನಡ, set as equals, not as a subtitle afterthought.

Tokens live in `apps/web/src/styles/tokens.css` (Tailwind v4 `@theme`). **Token names are a contract**; values may be
refined by the design-system owner. Components never use raw hex.

## Colour
| Token | Light | Dark | Use |
|---|---|---|---|
| canvas | #f5f5f7 | #000000 | page background |
| surface / surface-2 | #ffffff / #fbfbfd | #1c1c1e / #2c2c2e | cards, sheets |
| ink / ink-2 / ink-3 / ink-4 | #1d1d1f / #424245 / #6e6e73 / #86868b | #f5f5f7 / #d2d2d7 / #a1a1a6 / #86868b | text tiers (ink-4 = non-essential only) |
| hairline | 10% black | 12% white | 0.5–1 px separators |
| primary / on-primary | #1d1d1f / #fff | #f5f5f7 / #1d1d1f | primary buttons (ink pill) |
| link, focus | #0066cc, #0071e3 | #2997ff, #0a84ff | links, focus ring |

**Status palette** (text colour ≥ 4.5:1 on surface; `-tint` for pill backgrounds):
`st-reported` orange · `st-ack` blue · `st-progress` indigo · `st-awaiting` amber · `st-verified` green · `st-reopened` red ·
`st-closed` grey. Map markers use the same hues. Status is never conveyed by colour alone — always a label or icon shape too.

## Type
Inter Variable (Latin) + Noto Sans Kannada Variable (Kannada), both OFL. SF Pro is not licensed for web use.
| Role | Size / line / weight / tracking |
|---|---|
| Display (hero) | 56–80 px / 1.05 / 600 / −0.03em |
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
`.material-chrome` (frosted, 72% surface + saturate(180%) blur(20px)) is used **only for chrome that floats over the map**:
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
