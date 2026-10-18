# LeadNet interface refinement

The owner supplied seven screenshots and requested a stronger hackathon presentation on 17 October 2026. This refines the approved Apple-style spatial city; credentials and cloud work remain deferred.

## What the screenshots establish

The complete spatial component exceeds the first viewport, vertically centering the headline too far down. The 76px header, large section gaps, repeated illustration photos and oversized closing panel make the page feel sparse. The explorer shows an empty field. Source inspection establishes that civic overlays wait for an external map style, and that map positioning also needs correction.

## Design decisions

- Keep one signature: the real Bengaluru ward model, presented as a compact instrument with selected-record controls. No fabricated roads or decorative city statistics.
- Use Inter and Noto Sans Kannada. Keep titles around 48–64px on desktop, 40–48px on mobile; navigation is 64px tall with 44px targets.
- Light materials: canvas `#f2f4f7`, surface `#ffffff`, secondary surface `#e9eef4`, ink `#17212b`. Dark materials: canvas `#101419`, surface `#191f26`, secondary surface `#222a33`, ink `#f2f5f8`. Status colours carry their original meanings.
- Put the report action, the verification promise and the selectable city scene together. Target a complete scene of 480–520px rather than an 840px stack.
- Replace the large descriptive lifecycle panel with a real issue's evidence comparison, recorded timeline and citizen tally. Tabs change the inspected view; they never simulate a status transition or submit a vote.
- Curate available categories in the home preview to avoid four identical waste illustrations. Category-specific views remain ordered by the supplied recent record feed. The explorer remains the full record list.
- Replace the empty closing slab with a compact ledger comparison, actual counts, sample sizes and a route to definitions.
- Make the explorer a self-contained civic atlas using bundled ward geometry, an inline MapLibre style and an SVG fallback. State its geographic limits plainly; no street or building coverage is implied.

```
64px navigation + compact, explicit read-only demo notice
report action / verification promise | selected city model
---------------- actual ledger snapshot ----------------
record introduction + tabs | evidence / timeline / checks
featured local record     | compact varied record list
------------- claimed / verified / ledger --------------
source credits + methodology
```

The design review rejected adding idle animation as the main answer. Motion should explain selected records, camera movement, comparison position and active panels. Existing reduced-motion behaviour remains mandatory.

## Constraints and validation

No dependencies, domain contracts, backend transitions or cloud configuration change. Reads use the existing live hooks. Real and fictional records retain their labels. Evidence comparison uses report evidence and the current claim's resolution evidence; photos alone never imply verification.

Run the workspace typechecks, relevant tests and production builds. Review the supplied screenshots against the changed composition. Live rendered mobile/desktop, light/dark, console and touch checks remain blocked by the browser service's explicit policy denial; do not use alternate browser access or claim those checks passed.
