// Pure chase / pickup / ending rules for 林间红帽. No Three.js, so node can test them.

export const PLAYER_SPEED = 4.7;
export const WOLF_CHASE_SPEED = 1.28;
export const WOLF_PATROL_SPEED = 0.75;
export const WOLF_AGGRO = 2.85;
export const WOLF_CATCH = 0.98;
export const WOLF_ALERT_GAIN = 0.7;
export const WOLF_ALERT_DECAY = 0.45;
export const WOLF_ALERT_CHASE = 0.4;
export const REACH = 0.62;
export const HOME = { x: 0, z: -8.55 };
export const SPAWN = { x: 0.75, z: 7.15 };
export const WOLF_START = { x: -3.05, z: 2.4 };

export function wolfPatrolTarget(t) {
  return { x: -3.05, z: 2.3 + Math.sin(t * 0.42) * 2.3 };
}

// One ending per check. The cottage door wins if both would be true.
export function pickEnding(win, lose) {
  if (win) return "good";
  if (lose) return "bad";
  return null;
}

export function endingChoice(input) {
  const atDoor = input.homeD < 1.45 && input.z < -7.45;
  const inJaws = input.grace <= 0 && input.distW < WOLF_CATCH && input.z > -7.3;
  const kind = pickEnding(atDoor, inJaws && !atDoor);
  return { win: kind === "good", lose: kind === "bad", kind };
}

export function canCollect(dist) {
  return dist <= REACH;
}

export function stepWolf(input) {
  const distBefore = Math.hypot(input.heroX - input.x, input.heroZ - input.z);
  let alert = input.alert;
  if (distBefore < WOLF_AGGRO && input.grace <= 0) {
    alert = Math.min(1, alert + input.dt * WOLF_ALERT_GAIN);
  } else {
    alert = Math.max(0, alert - input.dt * WOLF_ALERT_DECAY);
  }

  let x = input.x;
  let z = input.z;
  let yaw = 0;
  let chasing = false;
  if (alert > WOLF_ALERT_CHASE) {
    chasing = true;
    const dx = input.heroX - x;
    const dz = input.heroZ - z;
    const len = Math.max(0.001, Math.hypot(dx, dz));
    const step = WOLF_CHASE_SPEED * input.dt;
    x += (dx / len) * step;
    z += (dz / len) * step;
    if (z < -6.85) z = -6.85;
    if (x < -3.35) x = -3.35;
    if (x > 3.2) x = 3.2;
    yaw = Math.atan2(dx, dz);
  } else {
    const patrol = wolfPatrolTarget(input.t);
    const dx = patrol.x - x;
    const dz = patrol.z - z;
    const len = Math.hypot(dx, dz);
    if (len > 0.03) {
      const step = Math.min(WOLF_PATROL_SPEED * input.dt, len);
      x += (dx / len) * step;
      z += (dz / len) * step;
      yaw = Math.atan2(dx, dz);
    } else {
      yaw = Math.sin(input.t * 0.42) > 0 ? 0 : Math.PI;
    }
  }

  const dist = Math.hypot(input.heroX - x, input.heroZ - z);
  return { x, z, alert, yaw, chasing, dist };
}

export function simulate(mode, seconds = 14) {
  const dt = 1 / 60;
  let hero = { x: SPAWN.x, z: SPAWN.z };
  let wolf = { x: WOLF_START.x, z: WOLF_START.z };
  let alert = 0;
  let grace = 0.85;
  if (mode === "brush") hero = { x: -0.45, z: 2.55 };
  if (mode === "stand") hero = { x: -1.55, z: 2.4 };
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    const t = i * dt;
    grace = Math.max(0, grace - dt);
    if (mode === "run" || mode === "brush") {
      const dx = HOME.x - hero.x;
      const dz = HOME.z - hero.z;
      const dist = Math.hypot(dx, dz);
      const step = Math.min(PLAYER_SPEED * dt, dist);
      if (dist > 1e-4) {
        hero.x += (dx / dist) * step;
        hero.z += (dz / dist) * step;
      }
    } else if (mode === "intoWolf") {
      const dx = wolf.x - hero.x;
      const dz = wolf.z - hero.z;
      const dist = Math.hypot(dx, dz) || 1;
      const step = Math.min(PLAYER_SPEED * dt, dist);
      hero.x += (dx / dist) * step;
      hero.z += (dz / dist) * step;
    }
    const stepped = stepWolf({
      x: wolf.x,
      z: wolf.z,
      alert,
      heroX: hero.x,
      heroZ: hero.z,
      t,
      dt,
      grace,
    });
    wolf = { x: stepped.x, z: stepped.z };
    alert = stepped.alert;
    const homeD = Math.hypot(hero.x - HOME.x, hero.z - HOME.z);
    const choice = endingChoice({ grace, distW: stepped.dist, z: hero.z, homeD });
    if (choice.kind) return { ...choice, t, hero, wolf };
  }
  return { kind: null, win: false, lose: false, t: seconds, hero, wolf };
}
