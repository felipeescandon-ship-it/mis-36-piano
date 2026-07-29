const PITCH_CLASS_TO_SPANISH = {
  0: "Do",
  1: "Do#",
  2: "Re",
  3: "Re#",
  4: "Mi",
  5: "Fa",
  6: "Fa#",
  7: "Sol",
  8: "Sol#",
  9: "La",
  10: "La#",
  11: "Si",
};

export function createChordFactory() {
  return {
    createChord(builderState) {
      const id = crypto.randomUUID();
      const revision = crypto.randomUUID();

      const rootName = PITCH_CLASS_TO_SPANISH[builderState.root.pitchClass];
      const bassName = builderState.bass
        ? PITCH_CLASS_TO_SPANISH[builderState.bass.pitchClass]
        : null;

      const symbol = bassName
        ? `${rootName} ${builderState.quality} (${bassName}/${rootName})`
        : `${rootName} ${builderState.quality}`;

      return {
        format: "piano-chord",
        schemaVersion: 1,
        id,
        revision,
        symbol,
        root: { ...builderState.root },
        quality: builderState.quality,
        bass: builderState.bass ? { ...builderState.bass } : null,
        extensions: [],
        alterations: [],
        source: "custom",
        tags: [],
        archivedAt: null,
      };
    },

    createVoicing(chordId, builderState, scope, name) {
      const id = crypto.randomUUID();
      const revision = crypto.randomUUID();
      const now = new Date().toISOString();

      return {
        format: "piano-voicing",
        schemaVersion: 1,
        id,
        revision,
        chordId,
        name,
        scope,
        notes: builderState.notes.map(note => ({ ...note })),
        pedagogy: {
          inversionLabel: "",
          explanation: "",
          handSizeNote: "",
        },
        createdAt: now,
        updatedAt: now,
      };
    },
  };
}
