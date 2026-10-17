# Pocket Dungeon

Name three objects. Escape the strange little room they make.

A tiny point-and-click escape room. The game engine picks the puzzle's solution first; Gemini writes a whimsical room around your three objects; the game validates the room before you play it.

## Run it

```bash
npm install
cp .env.example .env.local   # then add your GEMINI_API_KEY
npm run dev                  # open http://localhost:3000 (landing) → Play Now → /play
npm test                     # unit tests for the game engine
```

## How to play

- **Explore rooms:** three hand-made adventures (The Midnight Library, The Clockmaker's Last Hour, The Sleeping Greenhouse). No AI wait.
- **Create your own:** name three objects; Gemini writes a room, and the game checks it's solvable before you enter.
- Click things to inspect them, drag items from the satchel onto the room (or click an item, then a target), ask the 🦉 owl for hints, and open the door once its last lock is released.
- Progress saves automatically in this browser. Each playthrough has a save code (`PD-XXXXXX`) that reopens it in the same browser.

MIT licensed. See `LICENSE`.

