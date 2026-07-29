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

export function selectChordName(builderState) {
  if (!builderState.root || !builderState.quality) {
    return null;
  }

  const rootName = PITCH_CLASS_TO_SPANISH[builderState.root.pitchClass];
  const bassName = builderState.bass
    ? PITCH_CLASS_TO_SPANISH[builderState.bass.pitchClass]
    : null;

  return bassName
    ? `${rootName} ${builderState.quality} (${bassName}/${rootName})`
    : `${rootName} ${builderState.quality}`;
}

export function selectNotes(builderState) {
  return builderState.notes.map((note, index) => ({
    index,
    pitchClass: note.pitchClass,
    octave: note.octave,
    spelling: note.spelling,
    hand: note.hand,
    finger: note.finger,
    midiNumber: note.pitchClass + (note.octave + 1) * 12,
  }));
}

export function selectIsComplete(builderState) {
  return (
    builderState.root !== null &&
    builderState.quality !== null &&
    builderState.notes.length > 0
  );
}

export function selectCanAddNote(builderState) {
  return builderState.notes.length < 32;
}

export function selectNoteCount(builderState) {
  return builderState.notes.length;
}

export function selectRoot(builderState) {
  return builderState.root ? { ...builderState.root } : null;
}

export function selectQuality(builderState) {
  return builderState.quality;
}

export function selectBass(builderState) {
  return builderState.bass ? { ...builderState.bass } : null;
}
