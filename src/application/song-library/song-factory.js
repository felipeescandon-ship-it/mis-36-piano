function cloneSection(section) {
  const lineIdMap = new Map(section.lines.map(line => [line.id, crypto.randomUUID()]));
  return {
    id: crypto.randomUUID(),
    name: section.name,
    lines: section.lines.map(line => ({ id: lineIdMap.get(line.id), text: line.text })),
    // El acorde referenciado (chordId/voicingId/voicingRevision) apunta a un
    // recurso de la biblioteca compartida, no a esta canción: se conserva tal
    // cual, solo cambian los identificadores propios de la copia.
    events: section.events.map(event => ({
      ...event,
      id: crypto.randomUUID(),
      lineId: lineIdMap.get(event.lineId),
      chord: { ...event.chord },
    })),
  };
}

export function createSongFactory() {
  return {
    createSong({ title, artist = "", key = "", tempo = 120, timeSignature = [4, 4], notation = "es", tags = [] }) {
      const now = new Date().toISOString();
      return {
        format: "piano-song",
        schemaVersion: 1,
        id: crypto.randomUUID(),
        revision: crypto.randomUUID(),
        metadata: { title, artist, key, tempo, timeSignature: [...timeSignature], notation, tags: [...tags] },
        sections: [{ id: crypto.randomUUID(), name: "Sección 1", lines: [{ id: crypto.randomUUID(), text: "" }], events: [] }],
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      };
    },

    duplicateSong(song, title) {
      const now = new Date().toISOString();
      return {
        ...song,
        id: crypto.randomUUID(),
        revision: crypto.randomUUID(),
        metadata: { ...song.metadata, title: title ?? `${song.metadata.title} (copia)` },
        sections: song.sections.map(cloneSection),
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      };
    },

    archiveSong(song) {
      return { ...song, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    },

    restoreSong(song) {
      return { ...song, archivedAt: null, updatedAt: new Date().toISOString() };
    },
  };
}
