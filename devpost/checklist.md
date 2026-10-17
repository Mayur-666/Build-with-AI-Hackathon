---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast (checkpoints after slice 2 and at final review; explain anything important to understand or verify)

## Slices

- [x] **1. Escape a classic room, start to finish**
  Becomes usable: A running Next.js app where you type three objects, click generate, and play the handwritten fallback room end to end. You can inspect things, find the clue, take the key, use it on the box, read the order clue, enter the code on the machine (wrong codes get a playful line), and reach a plain escape screen with a room code. The styling is basic, with no AI yet.
  Why now: The learner's priority is "a full playable puzzle first." This proves the rules half of the kernel: the engine picks the solution, fills placeholders, and the reducer enforces the chain. It also builds the fallback room the AI path depends on. Bootstrapping lives here.
  PRD ref: `prd.md > The Core Journey` (steps 1, 5–10), `prd.md > Starting a Room`, `prd.md > Exploring and Inspecting`, `prd.md > Inventory and Using Items`, `prd.md > The Combination Machine`, `prd.md > Escape Screen`
  Spec ref: `spec.md > Solution engine (lib/game/solution.ts)`, `spec.md > Room filler (lib/game/fill.ts)`, `spec.md > Fallback room (lib/game/fallbackRoom.ts)`, `spec.md > Game reducer (lib/game/reducer.ts)`, `spec.md > Data Model`, `spec.md > File Structure`, `spec.md > Where It Runs and How Someone Tries It`
  Build: Scaffold Next.js 16 + TypeScript + Tailwind 4 + Vitest in the project folder, plus `.env.example` and a README stub. Write `lib/game/types.ts`, `solution.ts`, `fill.ts`, `validate.ts` (placeholder rules), `fallbackRoom.ts`, and `reducer.ts` (inspect/collect/select/use/enter-code/escape; hints come in slice 3). Build `GameShell` in `app/page.tsx` with screens start → room → escaped, and minimal `StartScreen`, a simple room (hotspot buttons), `InspectPanel`, `Inventory`, `ClueJournal`, `CodeMachine`, and `EscapeScreen`. Generate loads the fallback room directly.
  Verify (mechanical): `npm test` passes `solution`, `fill`, `fallbackRoom` (passes the validator), and `reducer` (a scripted playthrough reaches `escaped`; a wrong code keeps the inventory and journal) tests. `npm run build` succeeds. `npm run dev` serves `/` with no errors, and a fetch of `/` returns the start screen HTML.
  Learner check: Run `npm run dev`, open http://localhost:3000, type any three objects, and play the classic room all the way out. Try a wrong code first. Does the chain feel fair and logical?
  Commit: `Playable classic room with engine-picked solution`

- [x] **2. Gemini builds a room around your three objects**
  Becomes usable: Generate now calls `/api/generate-room`, which picks the solution, has Gemini write the room around *your* objects with placeholders, validates it (retrying once), fills in the facts, and returns it. If anything fails, you get the classic room. A simple loading message shows while it works.
  Why now: This is the AI half of the kernel and the riskiest unknown (the SDK's structured-output config, latency, how often validation passes). The learner asked to test real Gemini responses and the fallback path *before* spending time on visuals.
  PRD ref: `prd.md > The Core Journey` (steps 2–4), `prd.md > Room Generation and Validation`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > POST /api/generate-room (route handler)`, `spec.md > Gemini client (lib/ai/gemini.ts)`, `spec.md > Prompt builder (lib/ai/prompt.ts)`, `spec.md > Room validator (lib/game/validate.ts)`, `spec.md > External Services and Dependencies`, `spec.md > Important Failure Modes`
  Build: Add `@google/genai` and `zod`. Write `lib/ai/schema.ts` (Zod `RoomText` + JSON schema), `prompt.ts` (roles, placeholder rules, objects woven into the story, objects quoted as nouns), and `gemini.ts` (`gemini-3.8-flash`, JSON output, ~20s timeout). Write the route handler (sanitize → solution → generate → parse → validate → retry once → fill → fallback). Extend the validator (intro names all three objects, no bare numerals, emoji repair). Wire `GameShell` to POST, show a loading message, and fall back locally if the fetch fails.
  Verify (mechanical): `validate.test.ts` passes: a good room passes, and missing or misordered placeholders, stray numerals, or a missing object name fail. Then, with the learner's key in `.env.local`, POST to the running endpoint at least 3 times with different objects. Confirm each returns `usedFallback: false` with filled text containing the objects, and log the latency and validator results. Force a failure (invalid key via env override) and confirm `usedFallback: true` with no error status. Confirm the structured-output config field works and record the finding in Revisions if it differs from the spec.
  Learner check: Generate two or three rooms with weird object combos and read the intro, descriptions, and clues. Do the three objects feel meaningfully connected to the story, not just digit-holders? Then play one AI room to the exit.
  Commit: `Generate validated rooms with Gemini, with fallback`

- [ ] **3. Hints that follow your progress**
  Becomes usable: A hint button that's always available. Each press reveals the next of three levels for your current step: finding the key, opening the box, or cracking the code. Levels reset when you advance. Wrong-item use gets its in-world line.
  Why now: This completes the "clever but fair" promise on top of a working AI room. It's mostly reducer logic, so it's cheap to verify before visuals.
  PRD ref: `prd.md > Hints`, `prd.md > Inventory and Using Items`
  Spec ref: `spec.md > Game reducer (lib/game/reducer.ts)`, `spec.md > HintButton`
  Build: Add `REQUEST_HINT` and progress-derived `hintStep`/`hintLevel` to the reducer, plus the `HintButton` component. Make sure the fallback room's and Gemini's hint text are wired in.
  Verify (mechanical): Reducer tests confirm that hints walk levels 1→3 in each step, reset when the step changes, stay at level 3, and never contain the code. `npm test` and `npm run build` pass.
  Learner check: In a fresh room, press hint three times before doing anything, then find the key and press hint again. Do the levels get more specific without giving the answer away?
  Commit: `Add progress-aware three-level hints`

- [ ] **4. The illustrated storybook room**
  Becomes usable: The room looks like Pocket Dungeon. The midnight-blue and plum scene has warm golden light and drifting fireflies. Three glowing pedestals hold your objects (emoji plus a name plaque), with the machine, the box, and an arched door. Clickable things glow and pulse, and storybook headings appear throughout. The inventory, journal, inspect panel, and machine are styled as in-world panels.
  Why now: The mechanics and AI are proven, so visual time is now well spent. It's time-boxed per the scope: "simple enough that we can finish the full playable experience."
  PRD ref: `prd.md > Look and Feel`, `prd.md > Screens and Layout`, `prd.md > Exploring and Inspecting`
  Spec ref: `spec.md > Look and Feel`, `spec.md > RoomScene and Hotspot`, `spec.md > InspectPanel`, `spec.md > Inventory`, `spec.md > ClueJournal`, `spec.md > CodeMachine`
  Build: Palette variables and fonts (IM Fell English, Nunito) in `layout.tsx`/`globals.css`. `RoomScene` from CSS shapes and inline SVG, a `Hotspot` with glow/pulse/hover/inspected states, and restyled panels. The layout must work at laptop width and stay usable on a narrow screen.
  Verify (mechanical): `npm run build` and `npm test` pass. The dev server serves `/` with no console or server errors. The rendered room HTML contains six hotspots with accessible labels.
  Learner check: Play a full room. Does it feel like a cozy, mysterious storybook room rather than a dashboard? Is it always clear what's clickable?
  Commit: `Illustrated storybook room scene`

- [ ] **5. Themed screens and motion**
  Becomes usable: A themed loading screen with a lantern animation and rotating in-world messages. An intro card, which shows the playful "classic room" note when the fallback was used. Discovery sparkles in the journal, a box lid-lift, a shake on a wrong code, and a light-spilling door-swing into a styled escape screen with the room code and "New room." Reduced-motion is respected. The README covers how to run and play.
  Why now: This is the polish layer on a complete, working game. If time runs short, it's the safest to trim.
  PRD ref: `prd.md > The Core Journey` (steps 2, 4, 10), `prd.md > Starting a Room`, `prd.md > Escape Screen`, `prd.md > States and Boundaries`, `prd.md > Look and Feel`
  Spec ref: `spec.md > LoadingScreen`, `spec.md > IntroCard`, `spec.md > EscapeScreen`, `spec.md > Look and Feel`, `spec.md > Where It Runs and How Someone Tries It`
  Build: `LoadingScreen`, `IntroCard`, and a restyled `StartScreen`/`EscapeScreen`. CSS keyframes for the sparkle, lid, shake, and door, with a `prefers-reduced-motion` override. Update the README.
  Verify (mechanical): `npm run build` and `npm test` pass. A forced-fallback request shows the fallback note in the intro (check the HTML/state). The dev server runs a full journey with no errors.
  Learner check: Play from the start screen to escape and back to a new room, once with Gemini and once with the fallback forced. Do the loading screen, unlock moments, and escape feel satisfying?
  Commit: `Themed loading, intro, escape screens and animations`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2: try several very different object sets and check, for each, that (1) the clues make sense, (2) the objects feel connected to the story, and (3) the room is actually solvable. The feedback shapes the prompt and the remaining slices.
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence:
Route and stops:
Edit outcome:
Reflection:
Activity mode:

## Revisions
- Structured output confirmed as planned: `ai.models.generateContent` with `responseMimeType: "application/json"` + `responseJsonSchema` (from `z.toJSONSchema`, `$schema` stripped) works on `gemini-3.8-flash` with `thinkingLevel: LOW`. Real rooms took 10–15s, and all 7 live test rooms passed validation on the first attempt.
- Per-attempt timeout raised to 25s and `maxDuration` to 60 — measured latency (up to ~15s) made the planned ~20s/30s too tight for a retry.
- Pipeline moved from `route.ts` into `lib/ai/generateRoom.ts` — Next.js route files may only export handlers/config, and a separate module is unit-testable with a fake Gemini.
- Gemini's schema omits object names; the engine supplies the player's (cleaned) names — names are facts, so the AI can't rename them.
- API/network errors fall back immediately without a retry; only bad JSON, schema mismatch, or validator rejection retry — an auth or quota error won't fix itself on retry.
- The engine now inserts "the" before name placeholders and capitalizes at sentence starts (`nounPhrase` in `fill.ts`) — live rooms showed Gemini writing "observe toaster" even when told to add articles; the engine owning facts now also owns that grammar.
- Next.js 16 allows only one `next dev` per project folder — if a dev server is already running, use it rather than starting another.

