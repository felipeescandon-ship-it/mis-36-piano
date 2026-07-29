import { validateNote, ContractError } from "../../domain/validation.js";

const BASE_QUALITIES = new Set(["Mayor", "menor", "7", "maj7", "m7", "sus4"]);
const EXTENDED_QUALITIES = new Set(["dim", "m7b5", "aug"]);
const ALL_QUALITIES = new Set([...BASE_QUALITIES, ...EXTENDED_QUALITIES]);

export function createChordBuilder() {
  let state = {
    root: null,
    quality: null,
    bass: null,
    notes: [],
  };

  return {
    state() {
      return { ...state, notes: [...state.notes] };
    },

    setRoot(root) {
      validateNote({
        ...root,
        octave: 4,
        hand: "left",
      });
      state.root = { ...root };
    },

    setQuality(quality) {
      if (!ALL_QUALITIES.has(quality)) {
        throw new ContractError("invalid_quality", `Cualidad no reconocida: ${quality}.`, "quality");
      }
      state.quality = quality;
    },

    setBass(bass) {
      if (bass === null) {
        state.bass = null;
        return;
      }
      validateNote({
        ...bass,
        octave: 4,
        hand: "left",
      });
      state.bass = { ...bass };
    },

    addNote(note) {
      validateNote(note);

      if (note.octave < 2 || note.octave > 7) {
        throw new ContractError(
          "out_of_range",
          "La octava debe estar entre 2 y 7 (Do2–Do7).",
          "octave"
        );
      }

      if (state.notes.length >= 32) {
        throw new ContractError("invalid_notes", "El voicing no puede exceder 32 notas.", "notes");
      }

      state.notes.push({ ...note });
    },

    removeNote(index) {
      if (index < 0 || index >= state.notes.length) {
        throw new ContractError("invalid_index", "El índice no es válido.", "index");
      }
      state.notes.splice(index, 1);
    },

    clearNotes() {
      state.notes = [];
    },

    build(scope, name) {
      if (!state.root || !state.quality) {
        throw new ContractError("incomplete_chord", "Falta seleccionar fundamental y cualidad.", "chord");
      }
      if (state.notes.length === 0) {
        throw new ContractError("invalid_notes", "El voicing debe contener al menos una nota.", "notes");
      }
      if (!["library", "song"].includes(scope)) {
        throw new ContractError("invalid_scope", "El alcance debe ser 'library' o 'song'.", "scope");
      }

      return {
        scope,
        name,
        state: this.state(),
      };
    },
  };
}
