import assert from "node:assert/strict";
import test from "node:test";
import { ContractError, validateNote } from "../src/domain/validation.js";

test("la nota conserva escritura enarmónica coherente", () => {
  assert.doesNotThrow(() => validateNote({
    pitchClass: 1,
    octave: 4,
    spelling: "Db",
    hand: "right",
    finger: 2,
  }));
  assert.throws(() => validateNote({
    pitchClass: 1,
    octave: 4,
    spelling: "D",
    hand: "right",
  }), error => error instanceof ContractError && error.code === "invalid_spelling");
});

test("la digitación es opcional pero, si existe, está entre 1 y 5", () => {
  assert.doesNotThrow(() => validateNote({
    pitchClass: 0,
    octave: 4,
    spelling: "C",
    hand: "left",
  }));
  assert.throws(() => validateNote({
    pitchClass: 0,
    octave: 4,
    spelling: "C",
    hand: "left",
    finger: 0,
  }), error => error instanceof ContractError && error.code === "invalid_finger");
});

test("los contratos rechazan propiedades desconocidas", () => {
  assert.throws(() => validateNote({
    pitchClass: 0,
    octave: 4,
    spelling: "C",
    hand: "left",
    token: "no permitido",
  }), error => error instanceof ContractError && error.code === "unknown_property");
});
