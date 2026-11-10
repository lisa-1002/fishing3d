import assert from "node:assert/strict";
import { resolveEnding } from "../lib/kit.js";

assert.equal(resolveEnding({ phase: "play", endLock: false, win: true, lose: true }), "good");
assert.equal(resolveEnding({ phase: "play", endLock: false, win: false, lose: true }), "bad");
assert.equal(resolveEnding({ phase: "play", endLock: true, win: true, lose: true }), null);
assert.equal(resolveEnding({ phase: "end", endLock: false, win: false, lose: true }), null);
assert.equal(resolveEnding({ phase: "play", endLock: false, win: false, lose: false }), null);
console.log("resolveEnding ok");
