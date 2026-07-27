import { effectiveLegacySections, legacyChordParts, parseLegacyNote } from "../legacy-mis36.js";
import { compareCanonical } from "../canonical.js";
import { deterministicUuid, sha256, stableStringify } from "../stable.js";
import { validateLibrary } from "../validation.js";

const MIGRATION = "mis36-to-piano-library-v1";
const NAMESPACE = "piano-library:mis36:v1";

const inversionLabels = {
  root: "Fundamental",
  first: "1.ª inversión",
  second: "2.ª inversión",
};

async function resourceRevision(kind, value) {
  return deterministicUuid(`${NAMESPACE}:${kind}:revision`, stableStringify(value));
}

export async function migrateMis36ToLibrary(source) {
  const effectiveSections = effectiveLegacySections(source);
  const sourceHash = await sha256(source);
  const timestamp = source.updatedAt;
  // La identidad de “Mis 36” no cambia cuando cambia una revisión del origen.
  const songId = await deterministicUuid(`${NAMESPACE}:song`, "legacy:mis36");
  const chordSymbols = [...new Set(effectiveSections.flatMap(section => section.events.map(event => event.chord)))].sort();
  const chordBySymbol = new Map();
  const chords = [];

  for (const symbol of chordSymbols) {
    const id = await deterministicUuid(`${NAMESPACE}:chord`, symbol);
    const body = {
      symbol,
      ...legacyChordParts(symbol),
      extensions: [],
      alterations: [],
      source: "legacy",
      tags: [],
      archivedAt: null,
    };
    const chord = {
      format: "piano-chord",
      schemaVersion: 1,
      id,
      revision: await resourceRevision("chord", body),
      ...body,
    };
    chordBySymbol.set(symbol, chord);
    chords.push(chord);
  }

  const voicingByKey = new Map();
  const voicings = [];
  for (const symbol of chordSymbols) {
    const chord = chordBySymbol.get(symbol);
    const base = source.defaults.baseVoicings[symbol];
    const variants = source.defaults.voicingVariants[symbol];
    for (const inversion of ["root", "first", "second"]) {
      const key = `${symbol}:${inversion}`;
      const id = await deterministicUuid(`${NAMESPACE}:voicing`, key);
      const notes = [
        parseLegacyNote(base.l, "left", 5, base.spell),
        ...variants[inversion].map(([note, finger]) => parseLegacyNote(note, "right", finger, base.spell)),
      ];
      const body = {
        chordId: chord.id,
        name: `${symbol} · ${inversionLabels[inversion]}`,
        scope: "library",
        notes,
        pedagogy: {
          inversionLabel: inversionLabels[inversion],
          explanation: "",
          handSizeNote: "",
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const voicing = {
        format: "piano-voicing",
        schemaVersion: 1,
        id,
        revision: await resourceRevision("voicing", body),
        ...body,
      };
      voicingByKey.set(key, voicing);
      voicings.push(voicing);
    }
  }

  const sections = [];
  for (const [sectionIndex, legacySection] of effectiveSections.entries()) {
    const sectionId = await deterministicUuid(`${NAMESPACE}:section`, `${songId}:${sectionIndex}`);
    const lines = [];
    for (const [lineIndex, lineText] of legacySection.lines.entries()) {
      lines.push({
        id: await deterministicUuid(`${NAMESPACE}:line`, `${songId}:${sectionIndex}:${lineIndex}`),
        text: lineText,
      });
    }
    const events = [];
    for (const legacyEvent of legacySection.events) {
      const chord = chordBySymbol.get(legacyEvent.chord);
      const voicing = voicingByKey.get(`${legacyEvent.chord}:${legacyEvent.inversion}`);
      events.push({
        id: await deterministicUuid(`${NAMESPACE}:event`, `${songId}:${legacyEvent.legacyKey}`),
        lineId: lines[legacyEvent.line].id,
        anchor: legacyEvent.anchor,
        position: legacyEvent.position,
        beats: legacyEvent.beats,
        chord: {
          chordId: chord.id,
          voicingId: voicing.id,
          voicingRevision: voicing.revision,
        },
      });
    }
    sections.push({ id: sectionId, name: legacySection.name, lines, events });
  }

  const songBody = {
    metadata: {
      title: source.metadata.title,
      artist: source.metadata.artist || "",
      key: source.metadata.key || "",
      tempo: source.metadata.tempo,
      timeSignature: [...source.metadata.timeSignature],
      notation: source.metadata.notation,
      tags: [...source.metadata.tags],
    },
    sections,
    archivedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const song = {
    format: "piano-song",
    schemaVersion: 1,
    id: songId,
    revision: await resourceRevision("song", songBody),
    ...songBody,
  };

  const library = validateLibrary({ song, chords, voicings });
  const comparison = compareCanonical(source, library);
  if (!comparison.equal) throw new Error("La migración no coincide con la representación canónica heredada.");
  return {
    ...library,
    migration: {
      migration: MIGRATION,
      sourceHash,
      sourceRevision: source.revision,
      targetSongId: song.id,
      targetRevision: song.revision,
      status: "shadow",
      checks: comparison.checks,
      audit: {
        deletedEventKeys: [...source.songSync.deleted],
        addedEventKeys: source.songSync.added.map(value => `${value.section}:${value.uid}`),
      },
      executedAt: timestamp,
    },
  };
}

export function migrationOperationKey(sourceHash) {
  return `mis36:1:${sourceHash}`;
}
