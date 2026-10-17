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
