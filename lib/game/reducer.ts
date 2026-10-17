import type { GameAction, GameState, HotspotId, JournalEntry, Message, ObjectId, Room } from "./types";

export function initialGameState(room: Room): GameState {
  return {
    room,
    inspected: [],
    keyOffered: false,
    keyCollected: false,
    inventory: [],
    selectedItem: null,
    boxOpen: false,
    journal: [],
    hintStep: "findKey",
    hintLevel: 0,
    wrongAttempts: 0,
    machineOpen: false,
    message: { title: room.title, lines: [room.intro], tone: "intro" },
    escaped: false,
  };
}

const isObject = (id: HotspotId): id is ObjectId => id === "a" || id === "b" || id === "c";

function addJournal(journal: JournalEntry[], entry: JournalEntry): JournalEntry[] {
  return journal.some((j) => j.id === entry.id) ? journal : [...journal, entry];
}

function markInspected(state: GameState, id: HotspotId): HotspotId[] {
  return state.inspected.includes(id) ? state.inspected : [...state.inspected, id];
}

function inspect(state: GameState, target: HotspotId): GameState {
  const { room } = state;
  const inspected = markInspected(state, target);

  if (isObject(target)) {
    const obj = room.objects[target];
    const lines = [obj.description];
    let { journal, keyOffered } = state;
    let tone: Message["tone"] = "normal";
    if (target === room.solution.clueHolder) {
      lines.push(room.clueText);
      if (!journal.some((j) => j.id === "clue")) tone = "discovery";
      journal = addJournal(journal, { id: "clue", text: room.clueText });
    }
    if (target === room.solution.keyHolder && !state.keyCollected) {
      lines.push(room.keyFoundText);
      keyOffered = true;
      tone = "discovery";
    }
    return { ...state, inspected, journal, keyOffered, message: { title: obj.name, lines, tone } };
  }

  if (target === "box") {
    const lines = state.boxOpen ? [room.box.openText, room.box.orderClue] : [room.box.lockedText];
    return { ...state, inspected, message: { title: "The box", lines } };
  }

  if (target === "machine") {
    return {
      ...state,
      inspected,
      machineOpen: true,
      message: { title: "The strange machine", lines: [room.machine.description] },
    };
  }

  // exit
  return { ...state, inspected, message: { title: "The door", lines: [room.exit.lockedText] } };
}

function applyItem(state: GameState, target: HotspotId): GameState {
  const { room } = state;
  if (state.selectedItem === "key" && target === "box" && !state.boxOpen) {
    return {
      ...state,
      boxOpen: true,
      selectedItem: null,
      inventory: state.inventory.filter((i) => i.id !== "key"),
      inspected: markInspected(state, "box"),
      journal: addJournal(state.journal, { id: "order", text: room.box.orderClue }),
      message: { title: "The box", lines: [room.box.openText, room.box.orderClue], tone: "discovery" },
    };
  }
  return { ...state, selectedItem: null, message: { title: "Hmm…", lines: [room.wrongItemLine], tone: "wrong" } };
}

/** All play rules. Same in every room — the AI never touches this. */
export function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.escaped) return state;
  const { room } = state;

  switch (action.type) {
    case "INSPECT":
      return inspect(state, action.target);

    case "COLLECT_KEY": {
      if (!state.keyOffered || state.keyCollected) return state;
      return {
        ...state,
        keyOffered: false,
        keyCollected: true,
        inventory: [...state.inventory, { id: "key", ...room.keyItem }],
        message: { title: "Collected", lines: [`You take the ${room.keyItem.name}.`], tone: "discovery" },
      };
    }

    case "SELECT_ITEM":
      return { ...state, selectedItem: action.item };

    case "USE_ITEM":
      return applyItem(state, action.target);

    case "DROP_ITEM": {
      // Dragging is just "hold it, use it" in one gesture — same rules as clicking.
      if (!state.inventory.some((i) => i.id === action.item)) return state;
      return applyItem({ ...state, selectedItem: action.item }, action.target);
    }

    case "ENTER_CODE": {
      if (action.code === room.solution.code) {
        return { ...state, escaped: true, machineOpen: false, message: null };
      }
      const lines = room.machine.wrongCodeLines;
      return {
        ...state,
        wrongAttempts: state.wrongAttempts + 1,
        message: { title: "The strange machine", lines: [lines[state.wrongAttempts % lines.length]], tone: "wrong" },
      };
    }

    case "CLOSE_MACHINE":
      return { ...state, machineOpen: false };

    case "REQUEST_HINT":
      return state; // slice 3

    default:
      return state;
  }
}
