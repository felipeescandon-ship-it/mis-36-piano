import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toLegacyChord } from "../src/application/chord-constructor/legacy-chord-adapter.js";

function note(pitchClass, octave, spelling, hand, finger) {
  return { pitchClass, octave, spelling, hand, finger };
}

describe("Adaptador de acorde a formato heredado", () => {
  it("traduce Do Mayor con bajo en Do y tríada en la mano derecha", () => {
    const result = toLegacyChord({
      root: { pitchClass: 0, spelling: "C" },
      quality: "Mayor",
      bass: null,
      notes: [
        note(0, 2, "C", "left"),
        note(4, 4, "E", "right"),
        note(7, 4, "G", "right"),
        note(0, 5, "C", "right"),
      ],
    });

    assert.equal(result.englishName, "C");
    assert.equal(result.spanishName, "Do Mayor");
    assert.equal(result.l, "C2");
    assert.deepEqual(result.r, [["E4", 1], ["G4", 2], ["C5", 3]]);
  });

  it("incluye el bajo alternativo en la clave y en el nombre", () => {
    const result = toLegacyChord({
      root: { pitchClass: 0, spelling: "C" },
      quality: "Mayor",
      bass: { pitchClass: 7, spelling: "G" },
      notes: [
        note(7, 2, "G", "left"),
        note(0, 4, "C", "right"),
        note(4, 4, "E", "right"),
      ],
    });

    assert.equal(result.englishName, "C/G");
    assert.equal(result.spanishName, "Do Mayor (Sol/Do)");
    assert.equal(result.l, "G2");
  });

  it("conserva el dedo elegido y solo autonumera el que falta", () => {
    const result = toLegacyChord({
      root: { pitchClass: 2, spelling: "D" },
      quality: "menor",
      bass: null,
      notes: [
        note(2, 2, "D", "left"),
        note(5, 4, "F", "right", 3),
        note(9, 4, "A", "right"),
      ],
    });

    assert.equal(result.englishName, "Dm");
    assert.deepEqual(result.r, [["F4", 3], ["A4", 2]]);
  });

  it("ordena las notas de cada mano por altura, no por orden de creación", () => {
    const result = toLegacyChord({
      root: { pitchClass: 4, spelling: "E" },
      quality: "m7",
      bass: null,
      notes: [
        note(7, 4, "G", "right"),
        note(4, 4, "E", "right"),
        note(11, 4, "B", "right"),
        note(4, 2, "E", "left"),
      ],
    });

    assert.deepEqual(result.r, [["E4", 1], ["G4", 2], ["B4", 3]]);
  });

  it("usa siempre sostenidos, nunca bemoles, en la clave", () => {
    const result = toLegacyChord({
      root: { pitchClass: 1, spelling: "C#" },
      quality: "7",
      bass: null,
      notes: [note(1, 2, "C#", "left"), note(5, 4, "F", "right")],
    });

    assert.equal(result.englishName, "C#7");
  });

  it("rechaza construir sin fundamental o cualidad", () => {
    assert.throws(
      () => toLegacyChord({ root: null, quality: "Mayor", bass: null, notes: [] }),
      /fundamental|cualidad/i
    );
  });

  it("rechaza una cualidad no reconocida", () => {
    assert.throws(
      () => toLegacyChord({ root: { pitchClass: 0, spelling: "C" }, quality: "inventada", bass: null, notes: [] }),
      /Cualidad no reconocida/
    );
  });

  it("exige al menos una nota en cada mano", () => {
    assert.throws(
      () => toLegacyChord({
        root: { pitchClass: 0, spelling: "C" },
        quality: "Mayor",
        bass: null,
        notes: [note(0, 4, "C", "right")],
      }),
      /mano izquierda/
    );
    assert.throws(
      () => toLegacyChord({
        root: { pitchClass: 0, spelling: "C" },
        quality: "Mayor",
        bass: null,
        notes: [note(0, 2, "C", "left")],
      }),
      /mano derecha/
    );
  });
});
