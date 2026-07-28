function eventContext(playbackDocument, eventId) {
  if (!playbackDocument || !eventId) return null;
  const indexed = playbackDocument.eventsById.get(eventId);
  if (!indexed) return null;
  return {
    chord: indexed.chord,
    voicing: indexed.voicing,
    sectionId: indexed.sectionId,
    lineId: indexed.event.lineId,
    event: indexed.event,
  };
}

function sectionPosition(playbackDocument, sectionId, eventId) {
  const indexedSection = playbackDocument.sectionsById.get(sectionId);
  if (!indexedSection) return null;
  const ordered = [...indexedSection.section.events].sort((a, b) => a.position - b.position);
  const index = ordered.findIndex(event => event.id === eventId);
  if (index < 0) return null;
  return Object.freeze({ index, length: ordered.length });
}

export function selectTocarViewModel(snapshot, playbackDocument) {
  if (!playbackDocument || snapshot.status === "empty") return null;

  const current = eventContext(playbackDocument, snapshot.eventId);
  const next = snapshot.nextEventId ? eventContext(playbackDocument, snapshot.nextEventId) : null;
  const position = current
    ? sectionPosition(playbackDocument, current.sectionId, snapshot.eventId)
    : null;

  return Object.freeze({
    status: snapshot.status,
    mode: snapshot.mode,
    phase: snapshot.phase,
    currentChord: current?.chord ?? null,
    currentVoicing: current?.voicing ?? null,
    nextChord: next?.chord ?? null,
    nextVoicing: next?.voicing ?? null,
    heldNotes: current?.voicing.notes ?? [],
    upcomingNotes: next?.voicing.notes ?? [],
    sectionId: snapshot.sectionId,
    lineId: snapshot.lineId,
    positionInSection: position,
    tempo: snapshot.tempo,
    elapsedBeats: snapshot.elapsedBeats,
    remainingBeats: snapshot.remainingBeats,
    transportState: Object.freeze({
      status: snapshot.status,
      pauseReason: snapshot.pauseReason,
      audioStatus: snapshot.audioStatus,
      canPlay: ["ready", "paused", "ended"].includes(snapshot.status),
      canPause: snapshot.status === "playing",
      canResume: ["paused", "blocked"].includes(snapshot.status),
      canStop: snapshot.status !== "empty",
    }),
  });
}

export function selectPracticaViewModel(snapshot, playbackDocument) {
  if (!playbackDocument || snapshot.status === "empty") return null;

  const current = eventContext(playbackDocument, snapshot.eventId);
  const next = snapshot.nextEventId ? eventContext(playbackDocument, snapshot.nextEventId) : null;

  return Object.freeze({
    status: snapshot.status,
    mode: snapshot.mode,
    phase: snapshot.phase,
    isCountingIn: snapshot.phase === "countIn",
    countInRemaining: snapshot.countInRemaining,
    repetition: snapshot.practiceRepetition,
    totalRepetitions: snapshot.practiceTotal,
    departureChord: current?.chord ?? null,
    departureVoicing: current?.voicing ?? null,
    arrivalChord: next?.chord ?? null,
    arrivalVoicing: next?.voicing ?? null,
    tempo: snapshot.tempo,
    elapsedBeats: snapshot.elapsedBeats,
    remainingBeats: snapshot.remainingBeats,
    canStop: snapshot.mode === "practice" && snapshot.status !== "empty",
  });
}

export function buildLetraTree(playbackDocument) {
  return Object.freeze({
    songId: playbackDocument.song.id,
    songRevision: playbackDocument.song.revision,
    sections: playbackDocument.song.sections.map(section => Object.freeze({
      id: section.id,
      name: section.name,
      lines: section.lines.map(line => Object.freeze({ id: line.id, text: line.text })),
      events: [...section.events]
        .sort((a, b) => a.position - b.position)
        .map(event => {
          const indexed = playbackDocument.eventsById.get(event.id);
          return Object.freeze({
            eventId: event.id,
            lineId: event.lineId,
            position: event.position,
            chordId: indexed.chord.id,
            chordSymbol: indexed.chord.symbol,
          });
        }),
    })),
  });
}

export function selectLetraPatch(snapshot, previousSnapshot, playbackDocument) {
  if (!playbackDocument || snapshot.status === "empty") return null;

  const shouldRebuild = !previousSnapshot ||
    previousSnapshot.songId !== snapshot.songId ||
    previousSnapshot.songRevision !== snapshot.songRevision;

  const current = eventContext(playbackDocument, snapshot.eventId);
  const next = snapshot.nextEventId ? eventContext(playbackDocument, snapshot.nextEventId) : null;
  const currentLine = current ? playbackDocument.linesById.get(current.lineId)?.line : null;
  const nextLine = next && next.lineId !== current?.lineId
    ? playbackDocument.linesById.get(next.lineId)?.line
    : null;

  const previousEventId = previousSnapshot ? previousSnapshot.eventId : null;

  const meaningfulChange = shouldRebuild ||
    !previousSnapshot ||
    previousSnapshot.eventId !== snapshot.eventId ||
    previousSnapshot.status !== snapshot.status ||
    previousSnapshot.pauseReason !== snapshot.pauseReason;

  return Object.freeze({
    shouldRebuild,
    previousEventId,
    currentEventId: snapshot.eventId,
    nextEventId: snapshot.nextEventId,
    currentLineId: snapshot.lineId,
    currentSectionId: snapshot.sectionId,
    liveLyricCurrentText: currentLine?.text ?? null,
    liveLyricNextText: nextLine?.text ?? null,
    followState: snapshot.status === "playing" ? "following"
      : snapshot.status === "paused" ? "paused"
      : "idle",
    announcement: meaningfulChange
      ? Object.freeze({
          type: snapshot.status,
          eventId: snapshot.eventId,
          chordSymbol: current?.chord.symbol ?? null,
        })
      : null,
  });
}
