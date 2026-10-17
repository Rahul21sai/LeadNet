# Spatial city design

The owner requested a more dynamic, 3D website and selected an Apple-style spatial city on 17 October 2026. A second pass responds to the owner's rendered screenshots and team feedback; its composition and rationale are in `DESIGN_REFRESH.md`. Credentials and cloud work remain deferred.

## Direction

Keep Inter and Noto Sans Kannada, the neutral Civic Record palette, ink actions, and semantic status colours. The refined materials are light blue-gray and charcoal, with distinct canvas, card and instrument surfaces. `DESIGN_SYSTEM.md` and `tokens.css` specify the current values; the light verified green is darkened to retain contrast against the secondary surface.

The signature is an interactive raised city plane built from the real shipped ward polygons. Issue pins select an actual record, highlight its ward and update an attached record dock. Perspective follows deliberate pointer input, with touch/keyboard controls and a stable reduced-motion view. It is a spatial map, not a chart of invented ward heights.

The home page pairs a compact bilingual introduction with the spatial scene, then shows the actual ledger, an issue's interactive photo comparison/timeline/citizen tally, and a filterable selection across available categories. MapLibre uses a bundled ward atlas with 2D/3D camera perspective and an SVG fallback; it makes no claim to street or building coverage. Navigation, selection and ledger interactions use short transitions. No idle motion or invented activity is added.

## Implementation

- `components/spatial`: ward geometry projection, CSS 3D plane, interactive issue markers and selected-record card.
- `components/map` and map route: inline local atlas style, SVG fallback, 2D/3D view controls, camera transitions, ward focus and accessible list.
- Shared UI/layout: press/hover feedback, active-navigation transitions, mobile navigation and reduced-motion configuration.
- Home route: compact composition, varied actual-record filters and interactive current-claim evidence review.
- Ledger: a depth-based comparison using existing shared-computed claimed and verified metrics, with labels and sample sizes.

No dependencies, API contracts, domain calculations, authentication or backend writes change. Spatial transformations are presentation only. Existing demo labels, source credits, real record links, keyboard focus and 44px controls remain visible.

## Verification

Run all-workspace typecheck, existing tests and production builds. Check geometry/projection invariants where new computation is introduced. Review rendered 390px and 1440px layouts in light/dark, touch/keyboard interactions, actual selection/navigation and reduced motion when browser permissions allow. The local origin remains blocked by a saved browser policy at the start of this work, including after the owner confirmed it was enabled; do not bypass that policy or claim visual verification.
