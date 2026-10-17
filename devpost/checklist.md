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

- [x] **3. Clues you have to decode**
  Becomes usable: Clues stop naming objects. Each object has a riddle and a signature trait woven into its description. The key clue and the box's order note describe objects only by riddle, in varied forms (a rhyme, a recipe, a scratched warning...). Players must inspect, notice traits, and connect them. The puzzle sequence is unchanged.
  Why now: The early checkpoint found the puzzle "too predictable... just following a fixed checklist." This is a change to the kernel's clue layer, chosen by the learner, done before visuals so the game is fun to play underneath the art.
  PRD ref: `prd.md > Room Generation and Validation`, `prd.md > The Core Journey` (steps 6–7), `prd.md > Hints`, `prd.md > Product Decisions`
  Spec ref: `spec.md > Room validator (lib/game/validate.ts)`, `spec.md > Room filler (lib/game/fill.ts)`, `spec.md > Prompt builder (lib/ai/prompt.ts)`, `spec.md > Fallback room (lib/game/fallbackRoom.ts)`, `spec.md > Data Model`
  Build: Add `riddle` and `signatureWord` to object text and to the Gemini schema. Update the prompt (riddles, objects relating to each other, varied clue forms, hint-level rules). Extend the validator with the riddle rules, the no-names-in-clues rule, and the hint-level rules. Make `fillRoom` fill clue/order placeholders with riddles and the rest with names. Rewrite the fallback room's clues and hints in the same style.
  Verify (mechanical): Validator tests cover each new rule (a signature word missing or shared, a name in a riddle, a name in a clue, a name in a level-1/2 hint, a missing placeholder in a level-3 hint). Fill tests show riddles in clues and names in hints. The fallback room passes, and `npm test` and `npm run build` pass. Then at least 3 live rooms with very different objects: record the validation pass rate, and read each clue and riddle to confirm it's decodable from the descriptions.
  Learner check: Play two or three new rooms without hints first. Did you have to observe and connect traits to figure out where the key is and what order to read? Was it still fair? Then use the hints to check they escalate properly.
  Commit: `Riddle clues decoded from object traits`

- [x] **4. The illustrated storybook room**
  Becomes usable: The room looks like Pocket Dungeon. The midnight-blue and plum scene has warm golden light and drifting fireflies. Three glowing pedestals hold your objects (emoji plus a name plaque), with the machine, the box, and an arched door. Clickable things glow and pulse, and storybook headings appear throughout. The inventory, journal, inspect panel, and machine are styled as in-world panels.
  Why now: The mechanics and AI are proven, and the learner asked to prioritize the visual redesign ("the UI hasn't visibly changed at all"), so it moved ahead of hints. It's time-boxed per the scope.
  PRD ref: `prd.md > Look and Feel`, `prd.md > Screens and Layout`, `prd.md > Exploring and Inspecting`
  Spec ref: `spec.md > Look and Feel`, `spec.md > RoomScene and Hotspot`, `spec.md > InspectPanel`, `spec.md > Inventory`, `spec.md > ClueJournal`, `spec.md > CodeMachine`
  Build: Palette variables and fonts (IM Fell English, Nunito) in `layout.tsx`/`globals.css`. `RoomScene` from CSS shapes and inline SVG, a `Hotspot` with glow/pulse/hover/inspected states, and restyled panels. The layout must work at laptop width and stay usable on a narrow screen.
  Verify (mechanical): `npm run build` and `npm test` pass. The dev server serves `/` with no console or server errors. The rendered room HTML contains six hotspots with accessible labels.
  Learner check: Play a full room. Does it feel like a cozy, mysterious storybook room rather than a dashboard? Is it always clear what's clickable?
  Commit: `Illustrated storybook room scene`

- [x] **5. Text stays in its panel, and a landing page**
  Becomes usable: Narration text wraps inside the parchment on desktop and mobile, with no horizontal overflow. A separate landing page at `/` introduces Pocket Dungeon with a moonlit storybook hero, a short explanation of how to play, and a **Play Now** button. The game moves to `/play`.
  Why now: The learner reported the overflow bug and asked for a landing page first.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Look and Feel`, `spec.md > File Structure`, `spec.md > InspectPanel`
  Build: Constrain and wrap the parchment text (no horizontal scroll). Add `app/page.tsx` as the landing page, reusing the scene art and palette. Move the game to `app/play/page.tsx`. Link back to the landing page from the start screen.
  Verify (mechanical): `npm test` and `npm run build` pass. In Edge at 1000×733, 1366×768, and 390×844, the parchment's `scrollWidth` is ≤ its `clientWidth` after inspecting each object. `/` renders the landing page, and Play Now reaches `/play`, where a scripted playthrough escapes.
  Learner check: Open http://localhost:3100. Does the landing page set the mood and make you want to play? Click Play Now, inspect objects, and confirm the text never spills sideways.
  Commit: `Landing page and wrapped narration`

- [ ] **6. Drag items onto the room**
  Becomes usable: Pick up the key from the satchel and drag it onto things in the room, with mouse or touch. A target glows as you drag over it. Dropping on the box opens it; dropping elsewhere gets the playful wrong-item line. Click-to-hold-then-click still works as the accessible alternative.
  Why now: The learner asked for it right after the landing page. It reuses the existing `USE_ITEM` rule, so no puzzle logic changes.
  PRD ref: `prd.md > Inventory and Using Items`
  Spec ref: `spec.md > Inventory`, `spec.md > RoomScene and Hotspot`, `spec.md > Game reducer (lib/game/reducer.ts)`
  Build: Pointer-events drag (one implementation for mouse and touch) from satchel slots, a floating drag ghost, hit-testing hotspots via `data-hotspot`, hover highlighting, and a drop dispatching `SELECT_ITEM` + `USE_ITEM`. Esc or dropping outside cancels.
  Verify (mechanical): Reducer tests cover the drop paths (key on box opens it; key elsewhere gives the wrong-item line and keeps the key). A scripted Edge playthrough drags the key onto a wrong target, then onto the box, and escapes, at desktop size and with touch emulation. `npm test` and `npm run build` pass.
  Learner check: Collect the key and drag it around the room. Do targets light up? Drop it on the door, then on the box. Then try click-to-use once.
  Commit: `Drag items from the satchel onto the room`

- [ ] **7. Hints that follow your progress**
  Becomes usable: A hint button that's always available. Each press reveals the next of three levels for your current step: finding the key, opening the box, or cracking the code. Levels reset when you advance. Wrong-item use gets its in-world line.
  Why now: This completes the "clever but fair" promise on top of a working AI room. It's mostly reducer logic, so it's cheap to verify before visuals.
  PRD ref: `prd.md > Hints`, `prd.md > Inventory and Using Items`
  Spec ref: `spec.md > Game reducer (lib/game/reducer.ts)`, `spec.md > HintButton`
  Build: Add `REQUEST_HINT` and progress-derived `hintStep`/`hintLevel` to the reducer, plus the `HintButton` component. Make sure the fallback room's and Gemini's hint text are wired in.
  Verify (mechanical): Reducer tests confirm that hints walk levels 1→3 in each step, reset when the step changes, stay at level 3, and never contain the code. `npm test` and `npm run build` pass.
  Learner check: In a fresh room, press hint three times before doing anything, then find the key and press hint again. Do the levels get more specific without giving the answer away?
  Commit: `Add progress-aware three-level hints`

- [ ] **8. Sound and extra game feel**
  Becomes usable: Subtle sounds for inspecting, collecting, unlocking, a wrong code, and escaping, plus optional ambient music. Everything is off until the player turns sound on with a visible toggle. Includes a few extra interactions beyond clicking, to be agreed with the learner.
  Why now: The learner wants more game feel. It goes after hints so the core experience is complete first.
  PRD ref: `prd.md > Look and Feel`
  Spec ref: `spec.md > Look and Feel`
  Build: To be detailed once the learner picks the extra interactions and decides the door question.
  Verify (mechanical): `npm test` and `npm run build` pass. A scripted playthrough with sound enabled shows no console errors. Audio stays silent until the toggle is pressed.
  Learner check: Turn sound on and play a room. Are the sounds pleasant and not repetitive? Does the toggle work?
  Commit: `Sound and extra interactions`

- [ ] **9. Themed screens and motion**
  Becomes usable: A themed loading screen with a lantern animation and rotating in-world messages. An intro card, which shows the playful "classic room" note when the fallback was used. Discovery sparkles in the journal, a box lid-lift, a shake on a wrong code, and a light-spilling door-swing into a styled escape screen with the room code and "New room." Reduced-motion is respected. The README covers how to run and play.
  Why now: This is the polish layer on a complete, working game. If time runs short, it's the safest to trim.
  PRD ref: `prd.md > The Core Journey` (steps 2, 4, 10), `prd.md > Starting a Room`, `prd.md > Escape Screen`, `prd.md > States and Boundaries`, `prd.md > Look and Feel`
  Spec ref: `spec.md > LoadingScreen`, `spec.md > IntroCard`, `spec.md > EscapeScreen`, `spec.md > Look and Feel`, `spec.md > Where It Runs and How Someone Tries It`
  Build: `LoadingScreen`, `IntroCard`, and a restyled `StartScreen`/`EscapeScreen`. CSS keyframes for the sparkle, lid, shake, and door, with a `prefers-reduced-motion` override. Update the README.
  Verify (mechanical): `npm run build` and `npm test` pass. A forced-fallback request shows the fallback note in the intro (check the HTML/state). The dev server runs a full journey with no errors.
  Learner check: Play from the start screen to escape and back to a new room, once with Gemini and once with the fallback forced. Do the loading screen, unlock moments, and escape feel satisfying?
  Commit: `Themed loading, intro, escape screens and animations`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2 (feedback given: puzzle too predictable → slice 3 riddles added; UI feedback → slices 5–6; completes when the learner retries with riddle rooms): try several very different object sets and check, for each, that (1) the clues make sense, (2) the objects feel connected to the story, and (3) the room is actually solvable. The feedback shapes the prompt and the remaining slices.
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
- Added slice 3 "Clues you have to decode" (old slices 3–5 renumbered 4–6) — at the early checkpoint the learner found the puzzle "too predictable"; they chose riddle-based clues with engine-checked signature words and kept the fixed sequence. Different puzzle sequences are deferred (`prd.md > Possible Later Enhancements`). Their UI feedback (room as the focus, objects placed naturally, smaller inspection panels, a proper inventory/journal, subtle animation) shapes slices 5–6 without adding scope.
- Live riddle rooms (4 very different object sets): all valid; 3 of 4 passed on the first attempt, and 1 was rejected for naming "tiny moon" in its clue, then passed on the retry. Latency is unchanged at ~10–14s per attempt.
- Illustrated room moved ahead of hints (now slice 4; hints are slice 5) — the learner asked to see the visual redesign in the running app before more mechanics. Built as a 16:10 CSS/inline-SVG scene (wall, window, hanging lamp, shelf, pedestal, side table, arched door, brass machine, velvet box, rug, fireflies, vignette), with object curios as hotspots plus brass name plaques, a parchment narration strip, a leather satchel, a clue-journal book overlay, and a brass dial lock overlay. The intro now opens as the first parchment message. The scene sizes to the viewport height so the HUD stays on screen. Verified by scripted playthroughs in Edge at 1366×900, 1366×768, and 390×844 (all reached the escape screen).

- Room page uses a side-by-side layout on landscape screens (scene left at full height, sidebar right with title, scrolling parchment, satchel, journal); it still stacks on portrait/narrow. Reason: the learner's ~1000×730 window couldn't fit the stacked layout on one screen. Verified at 1000×733, 1366×768, 1920×1080, and 390×844.
- Added slices 5 (wrapped narration + landing page), 6 (drag-and-drop), and 8 (sound + extra game feel); hints → 7, themed screens → 9 — learner-requested scope after seeing the illustrated room. Each slice stays independently shippable. Two decisions are pending before slice 8: the door's role (proposal: the machine releases the door's missing piece) and which extra interactions to add.
- Overflow fix done defensively: headless Edge (overlay scrollbars) couldn't reproduce the learner's horizontal scrollbar, so the narration area is `overflow-x: hidden` with inner padding, text uses `overflow-wrap: anywhere`, the take button wraps, and the discovery sparkle no longer scales the panel (scale/shake were the likely trigger with classic scrollbars). Measured: no horizontal overflow after inspecting every hotspot at 1000×733 and 390×844.
- The game moved from `/` to `/play`; `/` is the landing page. The dev fallback flag is now `/play?fallback`.

