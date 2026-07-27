import assert from "node:assert/strict";
import test from "node:test";
import { features } from "../src/config/features.js";

test("Entrega 0 mantiene desactivadas la biblioteca y sus escrituras remotas", () => {
  assert.deepEqual(features, {
    pianoLibrary: false,
    pianoLibraryCloudWrites: false,
  });
  assert.equal(Object.isFrozen(features), true);
});
