---
doc: scope
status: approved
---

# Pocket Dungeon

A tiny point-and-click escape room. Players enter three random objects, and the game builds a strange, whimsical room around them that they have to escape.

## The Unique Kernel
**The AI decorates; the rules decide.** Any three unrelated objects become a surprising little world. The AI invents the theme, story, descriptions, clues, and how the objects fit together. The puzzle mechanics and win conditions follow fixed rules, so every room is "clever but fair" and actually solvable.

**The handoff:** the game engine chooses the combination code and defines the solution *first*. The AI then generates clues that point to that answer. The game validates the generated room before showing it, and uses the fallback room if validation fails.

## Who It's For
People who enjoy puzzle games, escape rooms, and experimenting with strange ideas. They want puzzles they can solve "by paying attention rather than guessing randomly," and they'd enjoy seeing what their own weird combination of objects turns into.

## The Core Loop
Enter three objects → get a room built around them → click around, inspect things, collect items, read clues, and work out how everything connects → escape. Players come back because every new set of objects makes a different room.

## Inspiration & Identity
- Visual point-and-click with a whimsical, surreal fantasy style: funny details and unexpected connections between objects.
- One cohesive illustrated room with clickable hotspots, styled icons, and subtle animations. No generated artwork per room. CSS, simple illustrations, and icons are fine for the first version.
- Keep the visuals simple enough that the full playable experience gets finished in the time available.
- Puzzles should feel clever but fair. Hints should help without giving the answer away.

## Why This Matters to the Learner
They want to "learn how to build a complete game with AI-generated content while keeping the game logic reliable," and to get better at planning before coding. Pocket Dungeon's kernel is exactly that tension.

## What "Working" Looks Like
The player opens a start screen, types three objects (e.g., a rubber duck, a toaster, a tiny moon), and clicks generate. A short intro explains the strange situation. The main screen is a small illustrated room with clickable objects, an inventory, and a clue journal. They inspect objects to find clues, collect an item, use it on something else, and solve a combination puzzle to unlock the exit. Hints get more specific if they're stuck. The exit opens with a satisfying animation, and an escape screen shows a room code.

**The "oh, that's cool" beat:** the room's story and clues are clearly about *your* three objects, and the puzzle still works.

## The POC Boundary
Build order matters. Priority is a **full playable puzzle first**, then AI generation, then hints and animations. "I don't want to sacrifice a playable game just to fit in extra features."
1. One illustrated room with hotspots, an inventory, and a clue journal.
2. One fixed puzzle chain: inspect → collect item → use item on something → combination lock → exit.
3. Start screen with three object inputs → the engine picks the solution (including the combination code) → AI generates the theme, intro, descriptions, and clues pointing to that solution.
4. Validation of the generated room before it's shown, with a fallback room if generation or validation fails, so the player is never stuck.
5. Hints that escalate in specificity.
6. Exit animation and an escape screen that displays a unique room code.

## Later
- **Seed-based room codes that recreate the same room.** The learner's preferred version. It's harder than it sounds: AI output isn't reproducible from a seed, so replaying a room means either encoding the generated content into the code or storing it. For now, the code is displayed only, as the learner allowed.
- More puzzle types or longer puzzle chains.
- Multiple rooms.

## Explicitly Cut
- **Generated artwork per room.** The learner chose one cohesive illustrated room plus CSS and icons, which keeps the visuals manageable and consistent.
- **Database or saved rooms.** Not needed to prove the kernel.
