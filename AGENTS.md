# AGENTS.md — how to work in this repo

LeadNet is a hackathon build (Google Cloud × Hack2Skill **AI Builder Cup**, deadline **18 Oct 2026 23:59 IST**).
Product intent lives in `docs/PRD.md`, system shape in `docs/ARCHITECTURE.md`, visual rules in
`docs/DESIGN_SYSTEM.md`. Read the one that answers your question before writing code.

## Commands
| Task | Command (repo root) |
|---|---|
| Install (already done — do NOT add dependencies without approval) | `npm install` |
| Dev (API :8080 + web :5173, web proxies /api) | `npm run dev` |
| Typecheck everything | `npm run typecheck` |
| Unit tests (shared + api) | `npm test` |
| Build web | `npm run build -w @leadnet/web` |
| Build API | `npm run build -w @leadnet/api` |
| AI eval harness | `npm run eval -w @leadnet/api` |
| Seed Firestore | `npm run seed -w @leadnet/api` |

Windows 11 host. Use the Bash tool with POSIX paths (`/c/Users/...`) or PowerShell with Windows paths.

## Non-negotiable architecture rules
1. **Bounded AI.** Gemini only *selects*: categories/hazards from closed enums, a duplicate candidate from a code-supplied list,
   observations about photos, wording of text. **Code computes** ward assignment, distance, priority, SLA, every transition
   and every metric. Never let a model output a number that is published, choose a status, or decide control flow.
2. **Verifier on every AI call.** Output must pass the zod schema + task checks in `apps/api/src/ai/verify/*`. On failure:
   one repair retry with the error, then the deterministic fallback. Every call writes an `aiRuns` doc.
3. **The state machine is law.** `packages/shared/src/stateMachine.ts` decides allowed transitions. Only `system` can
   produce `verified` / `reopened`, via the citizen quorum in `verification.ts`. Nothing auto-closes on silence.
4. **Browsers never write Firestore.** All mutations go through the API (`firebase-admin`). Rules are read-only.
5. **One source of truth for domain logic:** `packages/shared`. Do not re-implement priority/SLA/metrics anywhere else;
   import them. If a contract is wrong, report it to the orchestrator instead of forking it.
6. **Privacy.** Strip EXIF/GPS from every upload (`sharp().rotate()` re-encode). Scrub PII (`scrubPII`) from every public text.
   Citizens are shown as "Citizen" — never a name. Voice clips are never public.
7. **Honesty in data.** Leaders and projects are **fictional demo personas** (`isDemo: true`) and the UI says so.
   Never use a real politician's name or invent real-world statistics. Ward boundaries come from the dataset in
   `docs/research/wards.md`, with attribution in the footer.

## Code conventions
- TypeScript strict, ESM, `.ts`/`.tsx` extension imports inside a package; `@leadnet/shared` across packages.
- Timestamps are epoch **milliseconds** (`number`). Bilingual strings are `{ en, kn }`.
- API: Hono, routes under `/api/v1`, zod-validated bodies, errors as `{ error: { code, message } }`.
- Web: React 19 function components, Tailwind v4 utilities bound to tokens in `apps/web/src/styles/tokens.css`
  (use `bg-surface`, `text-ink-3`, `bg-st-verified-tint`, `rounded-lg` … — **no raw hex in components**).
  Motion via `motion/react`; respect `prefers-reduced-motion`. Icons: `lucide-react` only. No emoji in UI.
- Data reads in the web app use the live hooks in `apps/web/src/lib/data.ts`; writes use `apps/web/src/lib/api.ts`.
- Comments explain *why*, sparingly. No dead code, no TODOs left behind without an owner.

## Folder ownership (parallel build)
Each build agent owns specific folders and must not edit outside them. Shared files
(`packages/shared/**`, `router.tsx`, `tokens.css`, `package.json`, `firebase.json`, rules) belong to the orchestrator —
request changes in your final report instead of editing them.

## Needs approval (ask the orchestrator / owner first)
- Adding or upgrading any dependency.
- Changing any shared contract, route path, collection name, or security rule.
- Anything that deploys, deletes cloud resources, or costs money.
- Pushing to GitHub or making the repository public.

## Definition of done for any change
`npm run typecheck` passes, relevant tests pass, the feature works in the browser at 390px and 1440px in light and dark,
and no console errors. Report what you verified — and what you could not.
