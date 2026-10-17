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

- [x] **6. Drag items onto the room**
  Becomes usable: Pick up the key from the satchel and drag it onto things in the room, with mouse or touch. A target glows as you drag over it. Dropping on the box opens it; dropping elsewhere gets the playful wrong-item line. Click-to-hold-then-click still works as the accessible alternative.
  Why now: The learner asked for it right after the landing page. It reuses the existing `USE_ITEM` rule, so no puzzle logic changes.
  PRD ref: `prd.md > Inventory and Using Items`
  Spec ref: `spec.md > Inventory`, `spec.md > RoomScene and Hotspot`, `spec.md > Game reducer (lib/game/reducer.ts)`
  Build: Pointer-events drag (one implementation for mouse and touch) from satchel slots, a floating drag ghost, hit-testing hotspots via `data-hotspot`, hover highlighting, and a drop dispatching `SELECT_ITEM` + `USE_ITEM`. Esc or dropping outside cancels.
  Verify (mechanical): Reducer tests cover the drop paths (key on box opens it; key elsewhere gives the wrong-item line and keeps the key). A scripted Edge playthrough drags the key onto a wrong target, then onto the box, and escapes, at desktop size and with touch emulation. `npm test` and `npm run build` pass.
  Learner check: Collect the key and drag it around the room. Do targets light up? Drop it on the door, then on the box. Then try click-to-use once.
  Commit: `Drag items from the satchel onto the room`

- [x] **7. Hints that follow your progress**
  Becomes usable: A hint button that's always available. Each press reveals the next of three levels for your current step: finding the key, opening the box, or cracking the code. Levels reset when you advance. Wrong-item use gets its in-world line.
  Why now: This completes the "clever but fair" promise on top of a working AI room. It's mostly reducer logic, so it's cheap to verify before visuals.
  PRD ref: `prd.md > Hints`, `prd.md > Inventory and Using Items`
  Spec ref: `spec.md > Game reducer (lib/game/reducer.ts)`, `spec.md > HintButton`
  Build: Add `REQUEST_HINT` and progress-derived `hintStep`/`hintLevel` to the reducer, plus the `HintButton` component. Make sure the fallback room's and Gemini's hint text are wired in.
  Verify (mechanical): Reducer tests confirm that hints walk levels 1→3 in each step, reset when the step changes, stay at level 3, and never contain the code. `npm test` and `npm run build` pass.
  Learner check: In a fresh room, press hint three times before doing anything, then find the key and press hint again. Do the levels get more specific without giving the answer away?
  Commit: `Add progress-aware three-level hints`

- [x] **8. Model fallback within a strict two-call budget**
  Becomes usable: Room generation tries a configurable list of Gemini models in order: `gemini-3.8-flash`, then `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`, `gemini-3.6-flash`. There are never more than two API calls per room. Invalid output, rate limits, timeouts, 5xx, and missing models move to the next model; key/permission errors stop at once. If both calls fail, the classic room comes back with a reason (`rate_limited`, `unavailable`, `invalid_output`, `config`) the UI can explain.
  Why now: The learner asked for an audit. The old code retried the same model, gave up on any API error, and couldn't tell the player why.
  PRD ref: `prd.md > Room Generation and Validation`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > POST /api/generate-room (route handler)`, `spec.md > Gemini client (lib/ai/gemini.ts)`, `spec.md > External Services and Dependencies`, `spec.md > Important Failure Modes`
  Build: `lib/ai/config.ts` (model list, `MAX_GENERATION_CALLS = 2`, env overrides that can only lower it), `lib/ai/errors.ts` (pure classification), `lib/ai/gemini.ts` (`createGeminiWriter`; SDK retries explicitly off; injectable fetch), `lib/ai/generateRoom.ts` (budgeted model loop, per-call diagnostics with redaction), and a route that logs diagnostics server-side and returns only `{ room, usedFallback, fallbackReason? }`.
  Verify (mechanical): `tests/generateRoom.test.ts` (model switching, invalid output, rate limits, timeouts/5xx, 404, non-retryable key errors, two-call ceiling with 20 models or `maxCalls: 10`, empty list, key redaction), `tests/aiConfig.test.ts` (config + classification), and `tests/geminiHttp.test.ts` (the real SDK against a counting fake `fetch`: 429/503 → exactly 2 HTTP requests, bad key → 1, no key → 0). A mutation check (turning SDK retries on) made the HTTP tests fail as expected. Live: model availability probed with the learner's key.
  Learner check: Generate a room normally, then open `/play?fallback` to see the fallback path.
  Commit: `Model fallback with a strict two-call budget`

- [x] **9. Gamify every screen and state**
  Becomes usable: One moonlit storybook look across every route and state. Object setup feels like preparing an adventure (relic slots, a "surprise me" roll). Loading is a themed portal with playful rotating messages. A failed generation appears as "a disturbance in the dungeon's magic" with the real reason and Retry / Enter the classic room / Change objects. In the room, objects react when inspected, items fly to the satchel, the machine celebrates a correct code, and the door visibly swings open, light spilling out, before the escape. The escape screen is illustrated and shows your stats. Wrong guesses, locked things, hints, and confirmations (like leaving a room) are all in-world. Keyboard and touch work throughout, and reduced motion is respected.
  Why now: The learner asked for the whole experience to feel like a polished point-and-click adventure, not a dashboard with a game inside it.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Look and Feel`, `prd.md > States and Boundaries`, `prd.md > The Combination Machine`, `prd.md > Escape Screen`
  Spec ref: `spec.md > Look and Feel`, `spec.md > StartScreen`, `spec.md > LoadingScreen`, `spec.md > IntroCard`, `spec.md > EscapeScreen`, `spec.md > CodeMachine`
  Build: Rebuild StartScreen, LoadingScreen, a new DisturbanceScreen (fallback/error), EscapeScreen, in-room feedback (inspect reaction, collect fly-in, machine success, door-open sequence), a leave-room confirmation, and keyboard dial controls. Win condition unchanged: the correct code escapes; the door animation plays before the escape screen.
  Verify (mechanical): `npm test` and `npm run build` pass. Scripted Edge runs at 1000×733 and 390×844 cover start → loading → room → escape with no console errors; each forced fallback reason shows the disturbance screen and both recovery actions work; keyboard-only dial entry works; no horizontal overflow.
  Learner check: Play from the landing page to escape. Then force a rate-limit fallback with `/play?fallback=rate_limited` and try both recovery options.
  Commit: `Gamify every screen and state`

- [x] **10. Sound and extra game feel** *(delivered by slices 12 and 15: the door finale and sound; the drag, poke, and lock interactions came earlier)*
  Becomes usable: Subtle sounds for inspecting, collecting, unlocking, a wrong code, and escaping, plus optional ambient music. Everything is off until the player turns sound on with a visible toggle. Includes a few extra interactions beyond clicking, to be agreed with the learner.
  Why now: The learner wants more game feel. It goes after hints so the core experience is complete first.
  PRD ref: `prd.md > Look and Feel`
  Spec ref: `spec.md > Look and Feel`
  Build: To be detailed once the learner picks the extra interactions and decides the door question.
  Verify (mechanical): `npm test` and `npm run build` pass. A scripted playthrough with sound enabled shows no console errors. Audio stays silent until the toggle is pressed.
  Learner check: Turn sound on and play a room. Are the sounds pleasant and not repetitive? Does the toggle work?
  Commit: `Sound and extra interactions`

- [x] **11. Your adventure survives refresh and Back**
  Becomes usable: Every action autosaves in this browser. Refresh, Back, or coming back later restores the exact room and progress (key, clues, open box, hints, dials, ending) with no regeneration. The landing page shows Continue Adventure / New Adventure, or the escaped status with See your ending. The room code reopens that saved room from the landing page or via `/play?room=CODE`, in the same browser only.
  Why now: The learner found that Back or refresh lost the game, and that the room code did nothing.
  PRD ref: `prd.md > States and Boundaries`, `prd.md > Escape Screen`
  Spec ref: `spec.md > Persistence (added during the build)`, `spec.md > Data Model`
  Build: `lib/game/save.ts` (versioned file, zod + consistency validation, 8-room cap, quota fallback, safe storage access); `/play` restore-on-mount, autosave effect, `?room=` / `?new` URL via `replaceState`, controlled machine dials, unknown-code notice; landing `AdventureActions` (Continue / New / escaped status / open by code); copy on the leave dialog and escape screen explaining what the code does.
  Verify (mechanical): `tests/save.test.ts` (exact restore, no regenerated facts, restored game plays to the win, one record per code, resume by code, 8-room cap, completed ending + stats, missing/unreadable/outdated/partly broken/tampered saves, throwing storage, no secrets). Edge: progress → refresh → identical (code, title, key, clue, hint level, dial = 4) → Back → landing Continue card → Continue → same room → escape → refresh → same ending and stats → landing escaped card → bad code message → code opens room → unknown `?room=` notice → corrupted storage cleared gracefully; 1 generation request total, no console errors.
  Learner check: Play partway, refresh, press Back, then Continue. Finish, refresh on the ending, then reopen the room from the landing page with its code.
  Commit: `Autosave adventures in the browser; resume by room code`

- [x] **12. A data-driven adventure engine, with the classic room migrated**
  Becomes usable: Rooms are data (`AdventureDef`): hotspots with conditional descriptions, item-use rules, locks with any dials (digits, letters, times, symbols), conditional hints, and an explicit escape. One engine (`lib/engine/engine.ts`) runs every room. Gemini and classic rooms are compiled into it (`fromChainRoom`) with the same puzzle facts, plus the requested door finale: the machine releases the door's last lock, then the player opens the door.
  Why now: The hard-coded reducer could only express one puzzle chain; the catalogue needs different logic.
  PRD ref: `prd.md > The Core Journey`, `prd.md > The Combination Machine`
  Spec ref: `spec.md > Adventure engine (added during the build)`
  Build: `lib/engine/{types,engine,solve,validate,fromChainRoom}.ts`. The validator checks schema, references, the stored solution, the solver, and that no lock can be bypassed (the solver may only enter an answer once its `knowledge` clues are in the journal).
  Verify (mechanical): `tests/engine.test.ts`, and `tests/migration.test.ts`, which runs the original reducer and the engine side by side on 40 random classic rooms with identical text and state at every step; the only difference is the new door step.
  Learner check: Play the classic room; after the code, the door glows unlocked; click it to escape.
  Commit: `Data-driven adventure engine with solver; classic room migrated with parity tests`

- [x] **13. Per-playthrough saves on the engine**
  Becomes usable: Room definitions and player progress are stored separately (catalogue rooms stay in JSON; custom rooms are stored once). Each playthrough has its own save ID (`PD-XXXXXX`, URL `/play?save=…`), so replaying never overwrites. Restart is confirmed and only resets that playthrough. Back/Forward re-route through `popstate`.
  Why now: The catalogue and replays need playthroughs, not one save per room.
  PRD ref: `prd.md > States and Boundaries`
  Spec ref: `spec.md > Persistence (added during the build)`
  Build: `lib/engine/saves.ts` (save format v2; v1 is treated as outdated and cleared), the rewritten `/play` page, `LockDialog`, and `ConfirmDialog`.
  Verify (mechanical): `tests/saves.test.ts` (catalogue and custom restore, separate playthroughs, restart isolation, codes, endings, outdated/corrupt/tampered/version-bumped saves, throwing storage, no secrets). Edge `stage2` run: locked door, drag refusals, box, wrong/right code (door unlocks without escaping), refresh, door swing, ending refresh, play-again new save, Back to the earlier ending, cancelled and confirmed restart, the other playthrough untouched.
  Learner check: Play a room twice; check both saves exist; restart one.
  Commit: `Run the game on the engine: door finale, per-playthrough saves, restart`

- [x] **14. Choose your adventure: three catalogue rooms**
  Becomes usable: `/play` is a hub with two paths: **Explore rooms** (The Midnight Library: light, invisible ink, letter lock, key on the door; The Clockmaker's Last Hour: gear assembly, then a time lock that draws the door bolt; The Sleeping Greenhouse: item transformation, feeding, symbol reveals, a symbol lock that withers the vines) and **Create your own** (Gemini). Cards show difficulty and new / in-progress / escaped status, with Continue, Restart (confirmed), Play again, and See ending.
  Why now: The learner asked for ready-made rooms that need no waiting, and distinct puzzle logic.
  PRD ref: `prd.md > Screens and Layout`
  Spec ref: `spec.md > Catalogue (added during the build)`
  Build: `lib/catalogue/rooms/*.json`, `lib/catalogue/index.ts` (only validated rooms are offered), `components/AdventureHub.tsx`, and the disturbance screen's Explore prebuilt rooms exit.
  Verify (mechanical): `tests/catalogue.test.ts` (validation, stable IDs, stored and solver wins, locked door, no bypass, knowledge-backed answers, **no dead ends from any reachable state**, invalid item use changes nothing, distinct lock kinds and win sequences). Edge `catalogue` run: all three rooms played through the UI (clicks, drags, keyboard dials) with 0 generation requests and no console errors.
  Learner check: Play each catalogue room from the hub.
  Commit: `Choose-your-adventure hub and three distinct catalogue rooms`

- [x] **15. Sound and music, off until enabled**
  Becomes usable: Synthesized (Web Audio, no files) effects for inspect, collect, discovery, unlock, wrong, locked, hint, dial ticks, and escape, with slight pitch variation and throttling. Optional music-box ambience. Visible toggles on every game screen; both off by default; the preference is remembered, but nothing plays until the player clicks.
  Why now: The learner asked for game feel after the core loop worked.
  PRD ref: `prd.md > Look and Feel`
  Spec ref: `spec.md > Sound (added during the build)`
  Build: `lib/audio.ts`, `components/SoundControls.tsx`, `app/play/layout.tsx`. Only player actions trigger sounds; restores are silent.
  Verify (mechanical): Edge `sound` run with an instrumented AudioContext: 0 contexts/oscillators before enabling (while playing); sounds on interactions after; preference remembered but silent until a click after reload; music notes while on, none after off.
  Learner check: Turn on sound effects and music and play a room.
  Commit: `Synthesized sound effects and optional music, off until enabled`

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
- Drag-and-drop uses a single `DROP_ITEM` reducer action (= hold + use) rather than two dispatches, so it's unit-testable and can't diverge from click-to-use. Targets don't reveal validity while hovering (that would give the puzzle away); every hotspot glows and the one under the item lifts and shows its plaque. A wrong drop wiggles the target. Verified with real mouse input at 1366×768 and real CDP touch events at 390×844.
- Stopping a backgrounded `npx next dev` can leave its child Next.js process holding the port, and a dev server running across a page move served stale HTML (hydration error). Restarting the server fixed it, with no code change needed.
- Hints: the step is derived from progress (`currentHintStep`), so levels reset automatically when the player advances; there's no separate reset logic to get wrong. The owl button sits in the sidebar with three level pips, and the sidebar's bottom row wraps when it's narrow (260px at 1000px wide). Verified in Edge: levels 1→2→3, then stays at 3.
- Model availability probed with the learner's key: `gemini-3.8-flash`, `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`, and `gemini-3.6-flash` all answered a structured-output call; `gemini-2.5-flash-lite` returned 404 "no longer available to new users" and is excluded. The SDK retries only when `retryOptions` is passed (default 5 attempts on 408/429/5xx), so the writer now sets `attempts: 1` explicitly, and the HTTP-level tests guard it.
- Old slice 9 (themed screens) is replaced by slice 9 "Gamify every screen and state" (the learner's broader request). Sound (now slice 10) is still waiting on the learner's door and extra-interaction decisions.
- Fallback UX change (learner request): a failed generation no longer drops the player silently into the classic room; it shows an in-world disturbance screen with the reason and recovery choices. This updates `prd.md > States and Boundaries`.
- Gamified screens: `StartScreen` (relic pedestals, dice roll, prefill on return), `LoadingScreen` (portal with orbiting relics, rotating lines), new `DisturbanceScreen` (reason-specific copy plus Retry / Enter the classic room / Choose different relics; Retry is de-emphasised for `config`), `EscapeScreen` (night-sky arch, stats, copyable room code, replay options), new `LeaveRoom` confirmation, and in-room reactions (poke on inspect, locked wiggle, satchel fly-in, machine celebration, 3D door swing with light flood). Win condition is unchanged: the reducer still sets `escaped` on the correct code; the page holds the room for a 2.3s door sequence (0.3s with reduced motion) before the escape screen. Reducer gained `hintsUsed` and `locked`/`success` tones (tested). Code dials are now keyboard spinbuttons (↑/↓, digits, ←/→, Enter) and accept the scroll wheel.
- Verified in Edge: full journey (setup → dice → loading → forced `rate_limited` and `config` disturbances → retry → classic room → leave-confirm → locked wiggle → poke → keyboard-only code → door → escape stats) at 1000×733 and 390×844 with no console errors and no horizontal overflow; drag/touch, hints, and click-play regressions all pass; a real Gemini room via the UI (`gemini-3.8-flash`, 11.3s); `/` and `/play` load with zero console errors.
- Not done in this pass: sound and the extra interactions (slice 10, waiting on the learner's door/interaction decisions). The door-piece puzzle proposal is also undecided; the door now visibly opens but isn't a puzzle step.
- Added slice 11 (persistence, learner request). The room code now identifies a save in this browser's localStorage. It reopens that room (in progress or finished) from the same browser only; nothing is uploaded, so it doesn't work on another device. Back from `/play` returns to the previous page because `/play` updates its URL with `replaceState`; generation only ever runs from the Enter button.
- Test-script lesson: the landing page's decorative room peek also uses `.scene`, so e2e waits must target `.room-stage .scene` or the `/play` URL.
- Slices 12–15 added at the learner's request (catalogue, engine, door role, sound). The door decision is resolved by the learner's spec: the machine (or each room's final lock) releases the door, and the player opens it.
- Live Gemini during final verification: the primary model returned 503 (high demand), and the first fallback returned hints with invented placeholders, which the validator rejected; a later request hit 429 quota exhaustion, then a 25s timeout. Both requests used exactly two calls and showed the correct disturbance screen. The custom-room path was verified end to end with a validated room injected at the network layer, to avoid spending more quota.
- Known gap: Gemini rooms all use the classic chain layout; only catalogue rooms have bespoke puzzle logic.

