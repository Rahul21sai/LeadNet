# Spatial city design

The owner requested a more dynamic, 3D website and selected an Apple-style spatial city on 17 October 2026. Credentials and cloud work remain deferred.

## Direction

Keep Inter and Noto Sans Kannada, the neutral Civic Record palette, ink actions, and semantic status colours. Canvas `#f5f5f7`, surface `#ffffff`, ink `#1d1d1f`, secondary ink `#6e6e73`, and verified green `#1a7f37` remain the base tokens. Existing dark-theme tokens remain authoritative.

The signature is an interactive raised city plane built from the real shipped ward polygons. Issue pins select an actual record and lift its information card above the plane. Perspective follows deliberate pointer input, with touch/keyboard controls and a stable reduced-motion view. It is a spatial map, not a chart of invented ward heights.

The home page pairs an editorial bilingual introduction with the spatial scene, then shows the actual ledger, an interactive report/act/verify walkthrough, and a filterable issue feed. MapLibre gains real 3D camera controls and building extrusion only when the vector dataset supplies actual heights. Navigation, cards and ledger interactions use springs and short fades, rather than constant ambient animation.

## Implementation

- `components/spatial`: ward geometry projection, CSS 3D plane, interactive issue markers and selected-record card.
- `components/map` and map route: 2D/3D view controls, camera transitions, real vector building heights, ward focus and accessible list.
- Shared UI/layout: press/hover feedback, active-navigation transitions, mobile navigation and reduced-motion configuration.
- Home route: composition, actual-record filters and interactive lifecycle walkthrough.
- Ledger: a depth-based comparison using existing shared-computed claimed and verified metrics, with labels and sample sizes.

No dependencies, API contracts, domain calculations, authentication or backend writes change. Spatial transformations are presentation only. Existing demo labels, source credits, real record links, keyboard focus and 44px controls remain visible.

## Verification

Run all-workspace typecheck, existing tests and production builds. Check geometry/projection invariants where new computation is introduced. Review rendered 390px and 1440px layouts in light/dark, touch/keyboard interactions, actual selection/navigation and reduced motion when browser permissions allow. The local origin remains blocked by a saved browser policy at the start of this work, including after the owner confirmed it was enabled; do not bypass that policy or claim visual verification.
