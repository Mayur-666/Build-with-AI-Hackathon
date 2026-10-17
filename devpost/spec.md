---
doc: spec
status: approved
---

# Pocket Dungeon — Technical Spec

## How This Works, In Plain Language

Pocket Dungeon is one **Next.js** app written in TypeScript. It has two halves living in the same project:

- **The browser side** draws the screens (start, loading, intro, room, escape) and runs the game while you play: what you've inspected, what's in your inventory, which hint level you're on, whether the code is right.
- **The server side** is a single **route handler**, `/api/generate-room`. It's a small function that runs on the server, so it can safely hold the Gemini API key. The browser never sees the key.

When you type three objects and press generate, the browser sends them to `/api/generate-room`. There, the **engine** decides the solution *first*: which object holds the clue, which holds the key, the order the objects should be read in, and the three digits. Only then does it ask **Gemini** to write the room's theme, story, and descriptions.

Gemini doesn't get to write the facts. It writes text with **placeholders** like `{digit}` and `{first}` in it, for example "The toaster's crumb dial is stuck on {digit}." Then three layers of checking run:

1. **Shape.** Gemini is told to return JSON in a fixed shape.
2. **Parse.** **Zod**, a TypeScript library that checks data matches a shape at runtime, confirms every field is there with the right type.
3. **Rules.** The validator confirms every placeholder is exactly where it needs to be. Each object's description has its `{digit}`, and the box clue has `{first}`, `{second}`, and `{third}` in that order.

If everything passes, the engine fills in the real digits and names and sends the finished room to the browser. If anything fails, it tries Gemini once more. If that also fails, it sends the handwritten **fallback room** with a playful message.

The game itself is a set of rules in plain TypeScript, called a **reducer**: "given the current game and what the player just did, what's the new game?" Because those rules don't involve the AI at all, they behave the same in every room, and they're easy to test.

**Why this shape:** one project, one start command, one external service. The AI is fenced in on the server, and everything that decides whether a room is solvable is plain code we can test.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. **Start.** `StartScreen` collects three objects. Generate stays disabled until all three have text.
2. **Generate.** The browser `POST`s `{ objects: [a, b, c] }` to `/api/generate-room` and shows `LoadingScreen`.
3. **The engine picks the solution.** `createSolution()` assigns the clue-holder, the key-holder, a shuffled reading order of the three objects, and three random digits.
4. **Gemini writes.** `generateRoomText()` sends a prompt describing the roles, plus the placeholder rules and the JSON schema, to `gemini-3.8-flash`.
5. **Check.** Zod parses the response, then `validateRoomText()` checks the placeholders. On failure, it retries once. On a second failure, the handler uses `fallbackRoom`.
6. **Fill.** `fillRoom()` swaps the placeholders for real values. The handler returns `{ room, usedFallback }`.
7. **Intro.** The browser shows `IntroCard`, with a playful fallback note if `usedFallback` is true. The player dismisses it to enter the room.
8. **Play.** Every click dispatches an action to the game reducer: inspect, collect, select item, use item, enter code, request hint. The room components redraw from the new game state.
9. **Escape.** On the correct code, the reducer sets `escaped`. `RoomScene` plays the door animation, then `EscapeScreen` shows the room code and a "New room" button that resets to the start screen.

```
Browser                               Server (route handler)               Gemini
───────                               ──────────────────────               ──────
StartScreen ──POST objects──────────→ createSolution()
LoadingScreen                         generateRoomText() ────prompt──────→ JSON text
                                      Zod parse ←─────────────────────────┘
                                      validateRoomText()  (retry once → else fallbackRoom)
                                      fillRoom()
IntroCard ←──{ room, usedFallback }───┘
RoomScene + reducer (all play happens here, no more server calls)
EscapeScreen
```

## Stack

| Piece | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router) + **TypeScript** | Learner's choice and comfort zone. Route handlers keep the API key on the server, with no separate backend. [Docs](https://nextjs.org/docs) |
| UI | **React 19** (comes with Next.js) | [Docs](https://react.dev) |
| Styling | **Tailwind CSS 4** (the `create-next-app` default) plus CSS variables and keyframes in `globals.css` | An implementation choice, not the learner's. The palette and animations live as CSS variables/keyframes, and Tailwind handles layout. Easy to swap for CSS Modules if preferred. [Docs](https://tailwindcss.com/docs) |
| Fonts | `next/font/google`: **IM Fell English** for headings, **Nunito** for body | Storybook headings with readable body text (`prd.md > Look and Feel`). [Docs](https://nextjs.org/docs/app/getting-started/fonts) |
| AI | **Gemini** via **`@google/genai`** (v2.30 at time of writing), model **`gemini-3.8-flash`** | Learner's choice; they already have a key. Google lists `gemini-3.8-flash` as the recommended stable Flash model for new projects. [Models](https://ai.google.dev/gemini-api/docs/models) · [Structured output](https://ai.google.dev/gemini-api/docs/structured-output) · [SDK](https://github.com/googleapis/js-genai) |
| Runtime validation | **Zod 4** | Checks Gemini's JSON has the right shape. Gemini's docs pair it with structured output. [Docs](https://zod.dev) |
| Tests | **Vitest 5** | Fast unit tests for the engine, validator, and reducer, the parts that must be reliable. [Docs](https://vitest.dev) |
| Hosting | **Vercel** | Learner's choice, after it works locally. [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs) |

**Verify early in the build (unconfirmed):**
- **Structured-output config.** Docs examples are mid-transition. The classic `ai.models.generateContent` with `config.responseMimeType: "application/json"` and a JSON schema should work, but the newer Interactions API uses `response_format`. Confirm the exact field name on the first real call (build step: Gemini client).
- **Typical latency** of `gemini-3.8-flash` for this prompt size. It sets the timeout and how long the loading screen has to entertain.
- **Free-tier and rate-limit details** for `gemini-3.8-flash` on the learner's key.

## Where It Runs and How Someone Tries It

**Locally (build and demo recording):**
1. Node.js 20.9+ (Next.js 16 requirement; verify with `node -v`).
2. Copy `.env.example` → `.env.local` and set `GEMINI_API_KEY=...`. Never commit `.env.local`, and never paste the key into chat.
3. `npm install`, then `npm run dev`, then open **http://localhost:3000**.
4. `npm test` runs the unit tests.

**Deployed (optional, chosen by the learner):** Vercel, after the game works locally.
1. Push the public GitHub repo, then import it in Vercel.
2. Set `GEMINI_API_KEY` in Vercel → Project → Settings → Environment Variables (server-side only; never use a `NEXT_PUBLIC_` prefix).
3. Deploy, then play through once on the live URL.
4. Because strangers will use the learner's Gemini quota, set a usage or budget limit in Google AI Studio. If the quota runs out, players get the fallback room rather than an error.

**Submission:** a short demo video (recorded locally or from the live URL) plus the public GitHub repo. The Vercel URL is a bonus, not a replacement.

## Look and Feel
Carried from `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`.

- **Palette (CSS variables in `globals.css`):**
  - `--midnight` `#141a3a` (background)
  - `--dusk` `#2a2350` (panels)
  - `--plum` `#5b4a7a` (muted purple)
  - `--gold` `#f2c14e` (warm light, accents, clickable glow)
  - `--candle` `#ffe8a8` (highlights)
  - `--ink` `#f4ecdc` (body text on dark)
- **Lighting:** radial gradients for warm lamplight pooling in the room, plus a few small glowing "firefly" dots drifting via CSS keyframes.
- **Type:** IM Fell English for titles, screen headings, and object names. Nunito for descriptions, journal, and buttons, at a comfortable size with high contrast.
- **The room:** one fixed scene built from CSS shapes and inline SVG: back wall, floor, a shelf, three glowing pedestals (the curio spots), the machine, the box, and an arched door. Each curio spot shows the object's emoji plus its name on a little plaque, so it reads as a physical thing in the scene, not a card.
- **Clickable cues:** clickable things have a soft gold glow and a gentle pulse, brighten on hover, and use a pointer cursor. Already-inspected things dim their pulse.
- **Motion (CSS only):** a sparkle/fade-in when a clue enters the journal, a lid-lift when the box opens, a shake plus a playful line on a wrong code, and a light-spilling door-swing on escape. Respect `prefers-reduced-motion`.
- **Copy tone:** whimsical, warm, slightly mysterious. The machine and loading messages have personality.
- **Avoid:** anything that looks like a dashboard or chatbot. No white cards, generic grey UI, or default spinners.

## Components

### Server

#### `POST /api/generate-room` (route handler)
Takes `{ objects: string[3] }`, then trims each and caps it at 40 characters (rejecting empty ones with a 400). It runs createSolution → generateRoomText → parse → validate (retrying once) → fillRoom, and returns `{ room: Room, usedFallback: boolean }`. On any Gemini error, timeout (25s per attempt), quota error, or second validation failure, it returns the fallback room with `usedFallback: true` and never an error page. It sets `export const maxDuration = 60`. The pipeline itself lives in `lib/ai/generateRoom.ts`, because Next.js route files may only export handlers and config. A dev-only `forceFallback` body flag (sent when the page URL has `?fallback`) exercises the fallback path on purpose.
PRD ref: `prd.md > Room Generation and Validation`, `prd.md > States and Boundaries`.

#### Gemini client (`lib/ai/gemini.ts`)
Wraps `@google/genai`. It sends the prompt with JSON output config and the schema derived from the Zod schema, and returns raw text. This is where the structured-output config gets verified.
PRD ref: `prd.md > Room Generation and Validation`.

#### Prompt builder (`lib/ai/prompt.ts`)
Builds the prompt from the three objects and the solution's *roles*: which object is the clue-holder, which is the key-holder, and that all three show a digit. It never includes the digit values. It explains the placeholder rules and the tone (whimsical storybook, short descriptions). **It requires the three objects to be woven into the room's story:** the intro explains why these three things are here together, each object's description connects it to at least one other object or to the room's predicament, and the clue and key text arise from the objects' own nature (e.g. the key is hidden *because* of what a toaster does). They should never be generic containers for digits. The player's object names are treated as plain nouns. They're quoted, and the prompt tells the model to ignore any instructions inside them.
PRD ref: `prd.md > Room Generation and Validation`.

### Game engine (pure TypeScript, shared by server and browser, unit-tested)

#### Solution engine (`lib/game/solution.ts`)
`createSolution(objects)` randomly picks:
- `clueHolder` and `keyHolder`, two different objects;
- `order`, a shuffled reading order of all three objects (the digit-holders are the three player objects);
- `digits`, three random 0–9 digits assigned to the objects.

The code is the digits read in `order`.
PRD ref: `prd.md > Room Generation and Validation`, `scope.md > The Unique Kernel`.

#### Room validator (`lib/game/validate.ts`)
`validateRoomText(text, solution)` returns `{ ok: true } | { ok: false, reasons: string[] }`. The checks:
- Each object's `description` contains `{digit}` exactly once.
- `clueHolder.clueText` contains `{keyHolder}`.
- `keyHolder.keyFoundText` exists.
- `box.orderClue` contains `{first}`, `{second}`, `{third}`, each once and in that order.
- Hint text contains no `{digit}`, and code-step level 3 explains the method without containing the code.
- No AI-written text contains a bare numeral (0–9), so a stray number can't mislead the player.
- **The objects are woven into the story:** the `intro` mentions all three player object names (case-insensitive). This is a cheap yes/no proxy for "meaningfully connected." The real test is reading real rooms during the build.
- Each `emoji` field is short. A bad emoji is replaced with ✨ rather than failing the room.

PRD ref: `prd.md > Room Generation and Validation`.

#### Room filler (`lib/game/fill.ts`)
`fillRoom(text, solution)` replaces the placeholders: `{digit}` per object, `{keyHolder}`, `{first}`/`{second}`/`{third}` with object names. It builds the final `Room` and generates the display-only `roomCode` (e.g. `MOON-7QX3`: the first object's name, uppercased and trimmed, plus 4 random characters).
PRD ref: `prd.md > Room Generation and Validation`, `prd.md > Escape Screen`.

#### Fallback room (`lib/game/fallbackRoom.ts`)
Handwritten room text in the same placeholder format (a "classic" room with its own three objects), run through `createSolution` and `fillRoom`. A unit test guarantees it passes `validateRoomText`. It's also importable in the browser, so if the fetch itself fails, the client can still load it.
PRD ref: `prd.md > States and Boundaries`, `prd.md > Open Questions` (fallback theme decided during the build).

#### Game reducer (`lib/game/reducer.ts`)
`gameReducer(state, action)` holds all play rules. Actions:
- `INSPECT(hotspotId)`
- `COLLECT_KEY`
- `SELECT_ITEM(itemId)`
- `USE_ITEM(targetId)`
- `ENTER_CODE(string)`
- `REQUEST_HINT`
- `DISMISS_MESSAGE`

The rules:
- **Inspecting.** Inspecting the clue-holder adds the clue to the journal. Inspecting the key-holder offers the key.
- **Using the key.** Using the key on the box opens it and adds the order clue to the journal. Using it anywhere else gives a short in-world line (from the room text), with no state change.
- **Entering the code.** A wrong code bumps `wrongAttempts`, shows a playful line, and keeps everything else. The right code sets `escaped`.
- **Hints.** `REQUEST_HINT` advances the hint level for the current step, which is derived from progress:
  - `findKey`: the key is not yet collected.
  - `openBox`: the key is collected but the box is closed.
  - `solveCode`: the box is open.

  Hint levels reset when the step changes. Level 3 is the most detailed, and the button stays on it after that.

PRD ref: `prd.md > Exploring and Inspecting`, `prd.md > Inventory and Using Items`, `prd.md > The Combination Machine`, `prd.md > Hints`.

### Browser UI (`components/`)

#### `GameShell` (in `app/page.tsx`)
Holds the screen (`start | loading | intro | room | escaped`), the fetched `Room`, and `useReducer(gameReducer)`. It calls the API and falls back to the local fallback room if the fetch fails.
PRD ref: `prd.md > Screens and Layout`.

#### `StartScreen`
Title, three inputs (max 40 chars), and a generate button disabled until all three have text.
PRD ref: `prd.md > Starting a Room`.

#### `LoadingScreen`
A themed animation (e.g. a swirling lantern with glowing motes) and rotating in-world messages ("Persuading the toaster to cooperate…").
PRD ref: `prd.md > Starting a Room`, `prd.md > States and Boundaries`.

#### `IntroCard`
Title and intro text, plus the playful fallback note when `usedFallback` is true. "Enter the room" dismisses it.
PRD ref: `prd.md > The Core Journey` step 4.

#### `RoomScene` and `Hotspot`
The fixed illustrated scene. It places six `Hotspot`s: three curio pedestals, the machine, the box, and the door. A `Hotspot` renders the glow, pulse, hover, and inspected states and dispatches `INSPECT` or `USE_ITEM` (when an item is selected).
PRD ref: `prd.md > Exploring and Inspecting`, `prd.md > Look and Feel`.

#### `InspectPanel`
Shows the current description or message, and a "Take it" button when the key is offered.
PRD ref: `prd.md > Exploring and Inspecting`, `prd.md > Inventory and Using Items`.

#### `Inventory`
Collected items. Clicking one selects it, and the next hotspot click becomes "use on."
PRD ref: `prd.md > Inventory and Using Items`.

#### `ClueJournal`
Clues found, in discovery order, with a sparkle animation on new entries.
PRD ref: `prd.md > Exploring and Inspecting`.

#### `HintButton`
Always visible. It dispatches `REQUEST_HINT` and shows the current hint and its level.
PRD ref: `prd.md > Hints`.

#### `CodeMachine`
Opened by inspecting the machine. Three digit dials or inputs and a submit button. A wrong code triggers a shake plus a playful line; a correct one closes the machine and triggers the door animation.
PRD ref: `prd.md > The Combination Machine`.

#### `EscapeScreen`
The escape text, the room code, and a "New room" button.
PRD ref: `prd.md > Escape Screen`.

## Data Model

```ts
// The engine's secret plan — decided before Gemini writes anything
type ObjectId = "a" | "b" | "c";
type Solution = {
  clueHolder: ObjectId;
  keyHolder: ObjectId;              // !== clueHolder
  order: [ObjectId, ObjectId, ObjectId];
  digits: Record<ObjectId, number>; // 0–9
  code: string;                     // digits read in `order`, e.g. "472"
};

// What Gemini must return (Zod schema → JSON schema). Contains placeholders, no facts.
type RoomText = {
  title: string; theme: string; intro: string;
  objects: Record<ObjectId, { name: string; emoji: string; description: string /* has {digit} */ }>;
  clueText: string;          // from clueHolder; has {keyHolder}
  keyItem: { name: string; emoji: string };
  keyFoundText: string;
  machine: { description: string; wrongCodeLines: string[] };
  box: { lockedText: string; openText: string; orderClue: string /* {first}{second}{third} */ };
  exit: { lockedText: string };
  wrongItemLine: string;
  hints: { findKey: [string, string, string]; openBox: [string, string, string]; solveCode: [string, string, string] };
  escapeText: string;
};

// Sent to the browser: RoomText with placeholders filled, plus the solution and code
type Room = FilledRoomText & { solution: Solution; roomCode: string };

// Browser-only, lives in useReducer
type GameState = {
  inspected: Set<HotspotId>;
  keyOffered: boolean; inventory: Item[]; selectedItem: string | null;
  boxOpen: boolean; journal: string[];
  hintStep: "findKey" | "openBox" | "solveCode"; hintLevel: 0 | 1 | 2 | 3;
  wrongAttempts: number; message: string | null; escaped: boolean;
};
```

| Data | Where it lives | How it updates | When you leave and come back |
|---|---|---|---|
| Three object names | `StartScreen` input state, then the request body | Typing | Gone |
| Solution and room text | Created on the server per request, then held in `GameShell` state as `Room` | Once per generate | Gone (no persistence, as decided in the PRD) |
| Game progress | `useReducer` in `GameShell` | Reducer actions | Gone. Refresh means a new room |
| API key | `.env.local` locally, Vercel env vars when deployed | Set by hand | Never sent to the browser |

## File Structure

```
pocket-dungeon/ (repo root = this project folder)
├── app/
│   ├── layout.tsx              # fonts (next/font), <body> background, metadata
│   ├── page.tsx                # GameShell: screen switching, fetch, useReducer
│   ├── globals.css             # palette variables, Tailwind import, keyframes, reduced-motion
│   └── api/generate-room/
│       └── route.ts            # POST handler: solution → Gemini → validate → fill → fallback
├── components/
│   ├── StartScreen.tsx
│   ├── LoadingScreen.tsx
│   ├── IntroCard.tsx
│   ├── room/
│   │   ├── RoomScene.tsx       # the fixed illustrated room (CSS + inline SVG)
│   │   ├── Hotspot.tsx         # glow/pulse/inspected clickable wrapper
│   │   ├── InspectPanel.tsx
│   │   ├── Inventory.tsx
│   │   ├── ClueJournal.tsx
│   │   ├── HintButton.tsx
│   │   └── CodeMachine.tsx
│   └── EscapeScreen.tsx
├── lib/
│   ├── game/                   # pure logic — no React, no AI; unit-tested
│   │   ├── types.ts            # Solution, RoomText, Room, GameState, actions
│   │   ├── solution.ts         # createSolution()
│   │   ├── validate.ts         # validateRoomText()
│   │   ├── fill.ts             # fillRoom(), roomCode
│   │   ├── fallbackRoom.ts     # handwritten classic room
│   │   └── reducer.ts          # gameReducer() — all play rules
│   └── ai/                     # server-only
│       ├── schema.ts           # Zod RoomText schema + JSON schema for Gemini
│       ├── prompt.ts           # buildPrompt(objects, solution roles), cleanObjectName()
│       ├── generateRoom.ts     # pipeline: solution → Gemini → parse → validate → retry → fill → fallback
│       └── gemini.ts           # generateRoomText() via @google/genai
├── tests/
│   ├── solution.test.ts
│   ├── validate.test.ts        # good room passes; missing/misordered placeholders fail
│   ├── fill.test.ts
│   ├── fallbackRoom.test.ts    # fallback always passes the validator
│   └── reducer.test.ts         # full scripted playthrough reaches `escaped`
├── devpost/                    # Devpost learning workspace (planning docs)
├── .env.example                # GEMINI_API_KEY= (no real value)
├── .gitignore
├── package.json
└── README.md                   # what it is, how to run, how to play
```

## External Services and Dependencies

### Google Gemini API
- **Call:** `ai.models.generateContent({ model: "gemini-3.8-flash", contents: prompt, config: { responseMimeType: "application/json", responseJsonSchema: roomTextJsonSchema } })`, then read `response.text` → `JSON.parse` → Zod parse. *(The config field name must be verified; see Stack.)*
- **Auth:** `new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })`, server-side only.
- **Calls per room:** 1, or 2 if the first fails validation.
- **Cost and limits:** depend on the learner's key and tier. Check in Google AI Studio. Set a usage limit before deploying publicly.
- **Docs:** [Structured output](https://ai.google.dev/gemini-api/docs/structured-output) · [Models](https://ai.google.dev/gemini-api/docs/models) · [JS SDK](https://github.com/googleapis/js-genai)

### Vercel
- Hosting for the optional public URL. Needs `GEMINI_API_KEY` set as an environment variable. [Docs](https://vercel.com/docs/frameworks/nextjs)

## Important Failure Modes

- **Gemini is slow, errors, hits its quota, or is blocked by safety filters** → after a ~20s timeout or error, the server returns the fallback room. The intro shows the playful "classic room" note.
- **Gemini's text fails validation** (missing or misordered placeholders, a stray numeral) → it retries once, then falls back. The server logs the validator's `reasons` for debugging.
- **The browser can't reach the API at all** (offline, deploy misconfigured) → `GameShell` loads the fallback room locally.
- **A weird or hostile object name** ("ignore your instructions…") → it's capped at 40 chars, quoted as a plain noun in the prompt, and validation catches structural breakage. The worst case is the fallback room.

## What Was Simplified and Why

- **The three player objects are the digit-holders,** in an engine-shuffled order, rather than digits spread across other room features. This keeps the fixed scene to six hotspots and makes the order clue meaningful. Adding more features would mean more decorative hotspots and more AI text to validate.
- **The solution and code are sent to the browser.** A curious player could find the code in dev tools. That's acceptable for a single-player proof of concept. The fuller version would check codes on the server, which means keeping the room server-side (storage).
- **Room code is display-only** (`prd.md > Deferred From the POC`). Replaying a room would need the room encoded into the code or stored.
- **One retry, then fallback,** instead of repairing partial output. This is simpler and always yields a playable room.
- **CSS-only animations,** no animation library. This means one less dependency, and the PRD only asks for subtle motion.
- **No real rate limiting.** There's an input cap plus a Google AI Studio usage limit, and quota errors fall back gracefully. Real per-user limiting would need storage (e.g., a KV store).

## Decisions and Open Issues

**Learner decisions:**
- **Next.js + TypeScript.** Their comfort zone. Route handlers keep the key server-side in one project.
- **Gemini** for generation. They already have a key.
- **A mix of engine facts and AI voice.** The engine controls the digits and the clue order, and Gemini writes the story and natural descriptions around them, "so the puzzle stays reliable without making every room feel too repetitive." Implemented as placeholders plus yes/no validator checks.
- **Deploy to Vercel** so judges and others can play directly. They'll test locally first and deploy once the game works.

**Implementation details derived from those decisions** (agent choices, open to change): Tailwind + CSS variables; IM Fell English + Nunito; Zod; Vitest; one retry; a ~20s timeout; a 40-char input cap; the three objects as digit-holders; the `MOON-7QX3`-style room code.

**Learning focus (the learner's goal: AI content with reliable game logic):** The question was *how can the game trust AI-written text to reveal the right digit?* It was clarified by splitting the job across three layers: schema-constrained output, a Zod parse, and rule checks on placeholders. The learner chose the mix, so the AI never states a fact the engine has to interpret. **To verify during the build:** the validator tests in `tests/validate.test.ts` show good rooms passing and broken ones failing, and a few real Gemini rooms run through the validator show how often fallback triggers.

**Build-order requests from the learner (at approval):**
- **The three objects must feel meaningfully connected** to the room's story and clues, "not just digit-holders." This is handled in the prompt builder plus the intro-mentions-all-three check. Judge it by reading real Gemini rooms.
- **Test a real Gemini response early.** Verify that structured output, validation, and fallback work *before* spending significant time on visuals. `5-build` should sequence the Gemini client, validator, and fallback path ahead of the illustrated scene and animations, right after the minimal playable puzzle.

**Open:**
- Exact structured-output config field for `@google/genai` (verify on the first real call).
- `gemini-3.8-flash` latency and free-tier limits on the learner's key.
- The fallback room's theme and objects (from `prd.md > Open Questions`). Decide during the build; doesn't block anything.
