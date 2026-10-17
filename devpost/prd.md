---
doc: prd
status: approved
---

# Pocket Dungeon — Product Requirements

A tiny point-and-click escape room for people who enjoy puzzle games, escape rooms, and strange ideas. The player enters three objects, the AI builds a whimsical room around them, and a fixed puzzle chain guarantees the room can be escaped.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
Source: `scope.md > What "Working" Looks Like`, `scope.md > The Core Loop`.

1. **Start.** The player sees a start screen with three object inputs (e.g., rubber duck, toaster, tiny moon) and a generate button.
2. **Generate.** The engine first decides the solution: which object hides the clue, which hides the key, which three things hold the digits, the order to read them, and the three digits themselves. The AI then writes the theme, story, descriptions, and clues around that solution. A themed loading screen shows while this happens.
3. **Validate.** The game checks the generated room against the solution before showing it. If generation or validation fails, the fallback room loads with a brief playful message.
4. **Intro.** A short intro explains the strange situation the player is in.
5. **Explore.** The player is in the room: their three objects, a strange machine, a locked box, and a locked exit. They click things to inspect them.
6. **Find the clue and the key.** One object reveals a clue. The clue never names the key's hiding place; it describes it in a riddle the player must match to an object by observing descriptions. Another object holds a small key (or tool), which the player collects into their inventory.
7. **Open the box.** The player uses the key on the locked box. Inside is a clue describing three things in the room, by riddle rather than by name, and the order to read them.
8. **Work out the code.** Each of those three things shows one digit when inspected. Read in the box's order, they form the three-digit code.
9. **Unlock.** The player enters the code on the strange machine, which is the combination lock. A wrong code gets a playful response, and they can try again.
10. **Escape.** The right code opens the exit with a satisfying animation, followed by an escape screen showing a room code.

## Screens and Layout

1. **Start screen.** Title, three object inputs, and a generate button.
2. **Loading screen.** A themed, atmospheric loading animation with in-world messages that make clear the room is being created. Not a plain spinner.
3. **Intro.** A short story beat setting up the situation, then entry into the room. *(Confirmed: an overlay or card the player dismisses to enter the room.)*
4. **Room screen** (the main screen):
   - An illustrated room with clickable hotspots: the three player objects (each an illustrated curio spot, such as a shelf or glowing pedestal, with an icon or emoji and its name), the strange machine, the locked box, and the exit.
   - An **inventory** showing collected items.
   - A **clue journal** listing clues the player has found.
   - A **hint button**.
   - An area where inspection descriptions appear.
   - Entering the code on the machine opens a combination input for three digits.
5. **Escape screen.** A celebratory screen shown after the exit animation, with the room code and a way to start a new room.

## Look and Feel
Source: `scope.md > Inspiration & Identity`.

- **Mood:** a cozy, slightly mysterious room in a strange storybook world. Quirky objects with personality, not a realistic escape room.
- **Color:** deep midnight blues and muted purples, warm golden light, and little glowing details.
- **Type:** storybook-style headings with readable body text.
- **Visuals:** one cohesive illustrated room with illustrated objects. No generated artwork per room. CSS, simple illustrations, and icons are fine. Keep it simple enough to finish the full experience.
- **Motion:** subtle animations when clues are discovered and things unlock. A satisfying exit-opening animation.
- **Clickability:** atmospheric but easy to navigate, with clear visual hints showing what can be clicked.
- **Avoid:** anything that looks like a generic dashboard or chatbot. Aim for a cohesive indie-game feel.

## Features and Behavior

### Starting a Room
- [ ] The start screen shows three object inputs and a generate button.
- [ ] Generate can't be used until all three inputs have text. *(Confirmed for the POC)*
- [ ] Clicking generate shows the themed loading screen until the room is ready.

### Room Generation and Validation
Source: `scope.md > The Unique Kernel` (the handoff).
- [ ] The engine picks the solution before the AI writes anything: the clue-holder, the key-holder, the three digit-holders and their order, and the digits.
- [ ] The AI writes the theme, intro, descriptions, and clues, and decides how the three objects fit into the world. It does not choose the solution.
- [ ] The room's story and descriptions visibly reference the player's three objects, and the objects relate to one another (one reacts to, depends on, or affects another).
- [ ] Each object has a **riddle phrase** and a **signature word**. The signature word appears in that object's riddle and description and in no other object's; the riddle never contains the object's own name.
- [ ] The key clue and the box's order clue refer to objects only by their riddles, never by name. Clue presentation varies by room (a rhyme, a recipe, a scratched warning, a whisper...).
- [ ] Before the room is shown, the game checks that:
  - the box clue describes the correct three things, by riddle, in the correct order;
  - each digit-holder's description shows its correct digit;
  - the key-holder's description reveals the key.
- [ ] If generation fails or the check fails, the fallback room loads with a brief playful message (e.g., the player gets "a classic room instead").

### Exploring and Inspecting
- [ ] Clickable things are visibly marked as clickable.
- [ ] Clicking a hotspot shows its description.
- [ ] Inspecting the clue-holder reveals a clue, which is added to the clue journal with a subtle discovery animation.
- [ ] Inspecting a digit-holder reveals its digit. *(Confirmed: digits are visible whenever inspected, even before the box is opened. The box clue supplies the meaning and order.)*
- [ ] Clicking the exit before it's unlocked shows that it's locked.

### Inventory and Using Items
- [ ] Inspecting the key-holder lets the player collect the key, which appears in the inventory.
- [ ] The player can use the key on the locked box. *(Confirmed: select the item in the inventory, then click the target.)*
- [ ] Using the key on the box opens it with a subtle unlock animation and reveals the order clue, which is added to the journal.
- [ ] Using the key on the wrong target gives a short in-world response and nothing breaks. *(Confirmed for the POC)*

### The Combination Machine
- [ ] Clicking the strange machine opens a three-digit code entry.
- [ ] A wrong code gets a playful response that briefly says it's incorrect. Progress and inventory are kept, and attempts are unlimited.
- [ ] The correct code unlocks the exit and plays the exit-opening animation, then shows the escape screen.

### Hints
- [ ] A hint button is always available. Hints never appear on their own.
- [ ] Hints depend on progress. Before the key is found, they lead toward the key. After the box is opened, they help with the combination.
- [ ] Each step has three levels: (1) a gentle nudge about where to look, (2) a pointer to how to decode the clue (matching riddles to object traits) without naming any object, (3) an explanation that names the objects and how to work out the answer without stating the code.
- [ ] Each press of the hint button reveals the next level for the current step.

### Escape Screen
- [ ] The escape screen shows a unique room code. It is display-only for now.
- [ ] The player can start a new room from the escape screen. *(Confirmed for the POC)*

## States and Boundaries

- **Generating:** the themed loading screen, never a blank screen or plain spinner.
- **Generation or validation failure:** the fallback room loads automatically with a playful message. The player is never stuck.
- **First moments in the room:** the inventory and journal are empty, and the hint button already works.
- **Wrong item use or wrong code:** a playful response, no penalty, no lost progress.
- **Persistence:** nothing persists. Refreshing or leaving loses the current room. *(Confirmed, consistent with scope's "no database or saved rooms.")*

## Product Decisions

- **The engine picks the solution first, and the AI writes clues toward it.** This is what keeps every room solvable while still letting it feel surprising.
- **Validate before showing, with a playful fallback.** The player always gets a playable room.
- **One fixed puzzle chain:** clue → key → box → ordered digits → machine → exit. The AI changes the story, appearance, and which object plays each role, never the sequence.
- **The strange machine is the combination lock.**
- **The box clue gives the reading order, and each named thing shows one digit.** Every digit can be found by looking, not guessing.
- **Clues are riddles, not names** (decided at the early checkpoint). Players must observe and connect each riddle to an object's signature trait instead of following instructions. The puzzle sequence stays fixed for now so the working game isn't put at risk.
- **The hint button is on-demand, with three progress-aware levels.** It helps without giving the puzzle away.
- **Unlimited code attempts with playful feedback.** Fair and low-pressure.
- **A themed loading screen and a playful fallback message.** These keep the atmosphere intact even while waiting or recovering.
- **One illustrated room with CSS and icons, no per-room generated art.** This keeps visuals finishable.
- **Objects appear as illustrated curio spots.** Each of the three objects sits in the scene, on a shelf or a glowing pedestal, with a recognizable icon or emoji and its name, styled to fit the room. They should feel like physical things you click to inspect, not dashboard cards. Emoji or simple icons are the fallback when no suitable illustration exists, since players can type anything.
- **Build priority:** a playable puzzle first, then AI generation, then hints and animations (`scope.md > The POC Boundary`).

## What We're Building
- Start screen → themed loading → intro → room → escape screen.
- One illustrated room with hotspots for three player objects, the machine, the box, and the exit.
- Inventory, clue journal, and a hint button with three progress-aware levels.
- The fixed puzzle chain with engine-chosen solution and digits.
- AI-written theme, intro, descriptions, and clues, built around the player's three objects.
- Validation of the generated room, with a fallback room and playful message.
- Discovery, unlock, and exit animations.
- An escape screen with a display-only room code.

## Deferred From the POC
- **Seed-based room codes that recreate a room.** AI output isn't reproducible from a seed, so this would need the room encoded into the code or stored somewhere (`scope.md > Later`).
- **Saving or resuming a room.** This would need storage, and it isn't needed to prove the kernel.

## Possible Later Enhancements
- More puzzle types and longer chains.
- **Different puzzle sequences per room** (e.g., key inside the box, order hidden in an object). Considered at the early checkpoint and deferred: revisit if riddle clues still feel too predictable.
- Multiple rooms.
- Shareable codes that let a friend play the same room.

## Non-Goals
- **Generated artwork per room.** One cohesive illustrated room keeps the visuals consistent and finishable.
- **A database, accounts, or saved rooms.** Not needed for the demo.
- **AI-designed puzzle logic.** The AI never decides the solution or the win condition.
- **Attempt limits or fail states.** The goal is fair and fun, not punishing.

## Open Questions
- **Fallback room content.** One handwritten room built on the same chain. Its exact theme can be decided during the build. Doesn't block `4-spec`.
