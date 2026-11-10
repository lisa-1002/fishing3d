import assert from "node:assert/strict";
import {
  PLAYER_SPEED,
  REACH,
  WOLF_CHASE_SPEED,
  canCollect,
  endingChoice,
  pickEnding,
  simulate,
} from "./rules.js";

assert.equal(pickEnding(true, true), "good");
assert.equal(pickEnding(true, false), "good");
assert.equal(pickEnding(false, true), "bad");
assert.equal(pickEnding(false, false), null);

const samples = [
  { grace: 0, distW: 0.2, z: -7.6, homeD: 1.0 },
  { grace: 0, distW: 0.2, z: -7.0, homeD: 2.2 },
  { grace: 0, distW: 0.4, z: -7.2, homeD: 1.2 },
  { grace: 1, distW: 0.2, z: -7.0, homeD: 1.0 },
  { grace: 0, distW: 3, z: 2, homeD: 10 },
];
for (const sample of samples) {
  const choice = endingChoice(sample);
  assert.equal(choice.win && choice.lose, false);
  assert.equal(choice.kind, pickEnding(choice.win, choice.lose));
}
assert.equal(endingChoice({ grace: 0, distW: 0.2, z: -7.6, homeD: 1 }).kind, "good");
assert.equal(endingChoice({ grace: 0, distW: 0.4, z: -7.2, homeD: 1.2 }).kind, "bad");
assert.equal(endingChoice({ grace: 0.4, distW: 0.2, z: 1, homeD: 8 }).kind, null);

assert.equal(canCollect(REACH), true);
assert.equal(canCollect(REACH + 0.01), false);
assert.equal(canCollect(1.15), false);
assert.ok(WOLF_CHASE_SPEED < PLAYER_SPEED * 0.35);

const run = simulate("run");
assert.equal(run.kind, "good", "fair run should reach the cottage");
const brush = simulate("brush");
assert.equal(brush.kind, "good", "brushing the wolf then running should still reach the cottage");
const stand = simulate("stand", 8);
assert.equal(stand.kind, "bad", "standing in reach of the wolf should lose");
const intoWolf = simulate("intoWolf", 8);
assert.equal(intoWolf.kind, "bad", "walking into the wolf should lose");

console.log("red-hood rules ok", {
  run: run.t.toFixed(2),
  brush: brush.t.toFixed(2),
  stand: stand.t.toFixed(2),
  intoWolf: intoWolf.t.toFixed(2),
  chase: WOLF_CHASE_SPEED,
});
