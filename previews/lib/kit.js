/**
 * Shared playtest helpers for the four preview games.
 * No Three.js import here so ending rules can be tested in plain Node.
 * Render helpers receive the THREE namespace from the game module.
 */

export function resolveEnding(state) {
  if (!state || state.phase !== "play" || state.endLock) return null;
  if (state.win) return "good";
  if (state.lose) return "bad";
  return null;
}

export function farBehind(hero, x, z) {
  const fx = Math.sin(hero.rotation.y);
  const fz = Math.cos(hero.rotation.y);
  const dx = x - hero.position.x;
  const dz = z - hero.position.z;
  return dx * fx + dz * fz < -0.45 && Math.hypot(dx, dz) > 5;
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function tryStep(x, z, nx, nz, walkable) {
  if (walkable(nx, nz)) return { x: nx, z: nz, moved: true };
  if (walkable(nx, z)) return { x: nx, z, moved: true };
  if (walkable(x, nz)) return { x, z: nz, moved: true };
  return { x, z, moved: false };
}

export function stepToward(pos, target, speed, dt, walkable) {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.08) return { x: pos.x, z: pos.z, arrived: true, moving: false, blocked: false };
  const step = Math.min(speed * dt, dist);
  const nx = pos.x + (dx / dist) * step;
  const nz = pos.z + (dz / dist) * step;
  const slid = tryStep(pos.x, pos.z, nx, nz, walkable);
  const left = Math.hypot(target.x - slid.x, target.z - slid.z);
  return {
    x: slid.x,
    z: slid.z,
    arrived: left < 0.12,
    moving: slid.moved,
    blocked: !slid.moved,
  };
}

export function ndcFromEvent(e, el) {
  const rect = el.getBoundingClientRect();
  const src = e.touches && e.touches.length ? e.touches[0] : e;
  return {
    x: ((src.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((src.clientY - rect.top) / rect.height) * 2 + 1,
  };
}

const _plane = { normal: null, plane: null, hit: null };

export function groundHit(THREE, raycaster, camera, ndc, planeY, target) {
  raycaster.setFromCamera(ndc, camera);
  if (!_plane.plane) {
    _plane.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  }
  _plane.plane.set(new THREE.Vector3(0, 1, 0), -planeY);
  return raycaster.ray.intersectPlane(_plane.plane, target);
}

export function pickByScreen(camera, canvas, THREE, ndc, items, pixelRadius) {
  const rect = canvas.getBoundingClientRect();
  const px = (ndc.x * 0.5 + 0.5) * rect.width;
  const py = (-ndc.y * 0.5 + 0.5) * rect.height;
  const v = new THREE.Vector3();
  let best = null;
  let bestD = pixelRadius;
  for (const item of items) {
    if (!item.alive) continue;
    v.set(item.x, item.y == null ? 0.4 : item.y, item.z);
    v.project(camera);
    if (v.z > 1) continue;
    const sx = (v.x * 0.5 + 0.5) * rect.width;
    const sy = (-v.y * 0.5 + 0.5) * rect.height;
    const d = Math.hypot(sx - px, sy - py);
    if (d < bestD) {
      bestD = d;
      best = item;
    }
  }
  return best;
}

export function aimCamera(camera, player, dt, snap, opts = {}) {
  const back = opts.back ?? 8.6;
  const height = opts.height ?? 6.8;
  const ahead = opts.ahead ?? 4.4;
  const lookH = opts.lookH ?? 1.2;
  const yaw = player.rotation.y;
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const tx = player.position.x - fx * back;
  const ty = player.position.y + height;
  const tz = player.position.z - fz * back;
  if (snap) {
    camera.position.set(tx, ty, tz);
  } else {
    const a = Math.min(1, dt * 3.4);
    camera.position.x += (tx - camera.position.x) * a;
    camera.position.y += (ty - camera.position.y) * a;
    camera.position.z += (tz - camera.position.z) * a;
  }
  camera.lookAt(
    player.position.x + fx * ahead,
    player.position.y + lookH,
    player.position.z + fz * ahead
  );
  return { fx, fz };
}

export function cameraForward(camera, THREE) {
  const f = new THREE.Vector3();
  camera.getWorldDirection(f);
  return { x: f.x, y: f.y, z: f.z };
}

export function sampleCenter(renderer) {
  const gl = renderer.getContext();
  const w = gl.drawingBufferWidth;
  const h = gl.drawingBufferHeight;
  const size = 24;
  const x = Math.max(0, (w - size) >> 1);
  const y = Math.max(0, (h - size) >> 1);
  const pix = new Uint8Array(size * size * 4);
  gl.readPixels(x, y, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pix);
  let sum = 0;
  let max = 0;
  let min = 255;
  const n = size * size;
  for (let i = 0; i < pix.length; i += 4) {
    const l = (pix[i] + pix[i + 1] + pix[i + 2]) / 3;
    sum += l;
    if (l > max) max = l;
    if (l < min) min = l;
  }
  return { avg: sum / n, max, min, span: max - min, w, h };
}

export function publishQA(canvas, camera, THREE, state) {
  if (!window.__qa) {
    const v = new THREE.Vector3();
    window.__qa = {
      project(x, y, z) {
        v.set(x, y, z);
        v.project(camera);
        const r = canvas.getBoundingClientRect();
        return {
          x: r.left + (v.x * 0.5 + 0.5) * r.width,
          y: r.top + (-v.y * 0.5 + 0.5) * r.height,
          behind: v.z > 1,
        };
      },
      sample() {
        return sampleCenter(state.renderer);
      },
    };
  }
  const fwd = cameraForward(camera, THREE);
  window.__qa.camForward = fwd;
  Object.assign(window.__qa, state.fields);
}

export function hash2(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function valueNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export function paintTexture(THREE, renderer, size, painter, repeat) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const col = painter(x, y, size);
      const i = (y * size + x) * 4;
      img.data[i] = col[0];
      img.data[i + 1] = col[1];
      img.data[i + 2] = col[2];
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  if (repeat) tex.repeat.set(repeat, repeat);
  return tex;
}

export function makeSky(THREE, top, mid, bottom) {
  const geo = new THREE.SphereGeometry(90, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(top) },
      mid: { value: new THREE.Color(mid) },
      bottom: { value: new THREE.Color(bottom) },
    },
    vertexShader: `
      varying vec3 vP;
      void main() {
        vP = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vP;
      uniform vec3 top;
      uniform vec3 mid;
      uniform vec3 bottom;
      void main() {
        float h = normalize(vP).y;
        vec3 c = mix(bottom, mid, smoothstep(-0.15, 0.25, h));
        c = mix(c, top, smoothstep(0.15, 0.75, h));
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

export function setupRenderer(THREE, parent) {
  const qa = new URLSearchParams(location.search).has("qa");
  const renderer = new THREE.WebGLRenderer({
    antialias: !qa,
    alpha: false,
    preserveDrawingBuffer: true,
    failIfMajorPerformanceCaveat: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(qa ? 1 : Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x101418, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  parent.appendChild(renderer.domElement);
  return renderer;
}

export function resizeRenderer(renderer, camera, parent) {
  const w = parent.clientWidth || 360;
  const h = parent.clientHeight || 640;
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

export function addLights(THREE, scene, opts) {
  const hemi = new THREE.HemisphereLight(opts.sky, opts.ground, opts.hemi ?? 0.78);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(opts.sun, opts.sunIntensity ?? 1.25);
  sun.position.set(opts.sx ?? 8, opts.sy ?? 18, opts.sz ?? 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0004;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 48;
  const ext = opts.shadow ?? 16;
  sun.shadow.camera.left = -ext;
  sun.shadow.camera.right = ext;
  sun.shadow.camera.top = ext;
  sun.shadow.camera.bottom = -ext;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(opts.ambient ?? 0x405060, opts.ambientIntensity ?? 0.22));
  const rim = new THREE.DirectionalLight(opts.rim ?? 0x9eb4d0, opts.rimIntensity ?? 0.35);
  rim.position.set(-6, 8, -8);
  scene.add(rim);
  return { hemi, sun, rim };
}

export function makePine(THREE, scale, color) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12 * scale, 0.2 * scale, 1.15 * scale, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.92 })
  );
  trunk.position.y = 0.55 * scale;
  trunk.castShadow = true;
  g.add(trunk);
  const leaf = new THREE.MeshStandardMaterial({ color, roughness: 0.86 });
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry((0.95 - i * 0.18) * scale, 1.25 * scale, 7),
      leaf
    );
    cone.position.y = (1.25 + i * 0.72) * scale;
    cone.castShadow = true;
    g.add(cone);
  }
  return g;
}

export function makeWillow(THREE, scale) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1 * scale, 0.18 * scale, 2.1 * scale, 6),
    new THREE.MeshStandardMaterial({ color: 0x3e3428, roughness: 0.9 })
  );
  trunk.position.y = 1.05 * scale;
  trunk.castShadow = true;
  g.add(trunk);
  const leaf = new THREE.MeshStandardMaterial({ color: 0x2f5d4a, roughness: 0.84 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const strand = new THREE.Mesh(new THREE.ConeGeometry(0.16 * scale, 1.5 * scale, 5), leaf);
    strand.position.set(Math.cos(a) * 0.28 * scale, 1.55 * scale, Math.sin(a) * 0.28 * scale);
    strand.rotation.z = Math.cos(a) * 0.35;
    strand.rotation.x = Math.sin(a) * 0.35;
    strand.castShadow = true;
    g.add(strand);
  }
  return g;
}

export function makeHills(THREE, color, radius) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 1 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const h = 2.4 + (i % 3) * 1.1;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2 + (i % 3), h, 5), mat);
    cone.position.set(Math.cos(a) * radius, h * 0.15, Math.sin(a) * radius);
    g.add(cone);
  }
  return g;
}

export function makeCottage(THREE, opts = {}) {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1.55, 2.15),
    new THREE.MeshStandardMaterial({ color: opts.wall ?? 0xd7c4a4, roughness: 0.88 })
  );
  wall.position.y = 0.95;
  wall.castShadow = true;
  wall.receiveShadow = true;
  g.add(wall);
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x5a3d2a, roughness: 0.85 });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.12, 0.12), beamMat);
  beam.position.y = 1.55;
  g.add(beam);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.05, 1.35, 4),
    new THREE.MeshStandardMaterial({ color: opts.roof ?? 0x8d3d32, roughness: 0.8 })
  );
  roof.position.y = 2.25;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  g.add(roof);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.86, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x4a2e1e, roughness: 0.8 })
  );
  door.position.set(0, 0.5, 1.1);
  g.add(door);
  const glass = new THREE.MeshStandardMaterial({
    color: 0xffe1a8,
    emissive: 0xffb45a,
    emissiveIntensity: 0.85,
    roughness: 0.3,
  });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), glass);
  win.position.set(0.72, 1.15, 1.09);
  g.add(win);
  const step = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.16, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x6d655c, roughness: 0.95 })
  );
  step.position.set(0, 0.08, 1.35);
  g.add(step);
  const lamp = new THREE.PointLight(0xffc58a, 1.4, 7, 2);
  lamp.position.set(0.4, 1.4, 1.4);
  g.add(lamp);
  return g;
}

export function makeFigure(THREE, spec) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: spec.skin ?? 0xf0c9b0, roughness: 0.62 });
  const cloth = new THREE.MeshStandardMaterial({ color: spec.dress, roughness: 0.74 });
  const hairM = new THREE.MeshStandardMaterial({ color: spec.hair ?? 0x1b120f, roughness: 0.82 });
  const dark = new THREE.MeshStandardMaterial({ color: spec.legs ?? 0x2a211c, roughness: 0.84 });
  const hips = new THREE.Group();
  g.add(hips);

  const legGeo = new THREE.CapsuleGeometry(0.07, 0.32, 3, 6);
  const legL = new THREE.Mesh(legGeo, dark);
  legL.position.set(-0.12, 0.28, 0);
  legL.castShadow = true;
  const legR = legL.clone();
  legR.position.x = 0.12;
  hips.add(legL, legR);

  let torso;
  if (spec.dressShape === "robe") {
    torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.48, 1.08, 9), cloth);
    torso.position.y = 0.98;
  } else if (spec.dressShape === "cape") {
    torso = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.02, 8), cloth);
    torso.position.y = 0.98;
  } else {
    torso = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.92, 8), cloth);
    torso.position.y = 0.94;
  }
  torso.castShadow = true;
  hips.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), skin);
  head.position.y = 1.58;
  head.castShadow = true;
  hips.add(head);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a120e });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), eyeMat);
  eye.position.set(-0.07, 1.6, 0.16);
  const eye2 = eye.clone();
  eye2.position.x = 0.07;
  hips.add(eye, eye2);

  if (spec.hairStyle === "hood") {
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
      cloth
    );
    hood.position.y = 1.66;
    hood.castShadow = true;
    hips.add(hood);
  } else if (spec.hairStyle === "bun") {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), hairM);
    hair.position.y = 1.7;
    hair.scale.set(1, 0.72, 1.02);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), hairM);
    bun.position.set(0, 1.92, -0.02);
    hips.add(hair, bun);
  } else {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), hairM);
    hair.position.y = 1.68;
    hair.scale.set(1.02, 0.92, 1.08);
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 2, 6), hairM);
    tail.position.set(0.04, 1.32, -0.14);
    tail.rotation.z = 0.15;
    hips.add(hair, tail);
  }

  const armGeo = new THREE.CapsuleGeometry(0.055, 0.28, 2, 6);
  const armL = new THREE.Mesh(armGeo, spec.bareArms ? skin : cloth);
  armL.position.set(-0.32, 1.18, 0);
  armL.castShadow = true;
  const armR = armL.clone();
  armR.position.x = 0.32;
  hips.add(armL, armR);

  if (spec.prop === "basket") {
    const basket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.11, 0.16, 8),
      new THREE.MeshStandardMaterial({ color: 0xb8894f, roughness: 0.86 })
    );
    basket.position.set(0.38, 0.78, 0.12);
    basket.castShadow = true;
    const clothTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.7 })
    );
    clothTop.position.set(0.38, 0.9, 0.12);
    clothTop.scale.y = 0.45;
    hips.add(basket, clothTop);
  } else if (spec.prop === "sword") {
    const wood = new THREE.MeshStandardMaterial({ color: 0xc4a574, roughness: 0.7 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.72, 0.02), wood);
    blade.position.set(0.36, 0.95, 0.06);
    blade.rotation.z = 0.35;
    const hilt = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.045, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x6a4028, roughness: 0.8 })
    );
    hilt.position.set(0.22, 0.66, 0.05);
    hilt.rotation.z = 0.35;
    hips.add(blade, hilt);
  }

  if (spec.sash != null) {
    const sash = new THREE.Mesh(
      new THREE.TorusGeometry(0.27, 0.028, 6, 16),
      new THREE.MeshStandardMaterial({ color: spec.sash, roughness: 0.5 })
    );
    sash.rotation.x = Math.PI / 2;
    sash.position.y = 1.08;
    hips.add(sash);
  }
  if (spec.bow != null) {
    const bow = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.05),
      new THREE.MeshStandardMaterial({ color: spec.bow, roughness: 0.55 })
    );
    bow.position.set(0, 1.9, 0.1);
    hips.add(bow);
  }

  g.userData.animate = (moving, t) => {
    const s = moving ? Math.sin(t * 9.2) : Math.sin(t * 1.8) * 0.18;
    legL.rotation.x = s * 0.75;
    legR.rotation.x = -s * 0.75;
    armL.rotation.x = -s * 0.5;
    armR.rotation.x = s * 0.5;
    hips.position.y = moving ? Math.abs(Math.sin(t * 9.2)) * 0.045 : Math.sin(t * 1.8) * 0.02;
  };
  g.userData.cloth = cloth;
  g.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = true;
  });
  return g;
}

export function makeMarker(THREE, color) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.34, 20),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  ring.visible = false;
  return ring;
}

let audioCtx = null;

export function chime(kind) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const now = audioCtx.currentTime;
    o.type = "sine";
    const freq = kind === "bad" ? 196 : kind === "good" ? 698 : kind === "warn" ? 311 : 523;
    o.frequency.setValueAtTime(freq, now);
    if (kind === "good") o.frequency.exponentialRampToValueAtTime(880, now + 0.16);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(now);
    o.stop(now + 0.24);
  } catch (err) {
    /* audio is optional feedback */
  }
}

export function bindResize(renderer, camera, frame) {
  const apply = () => resizeRenderer(renderer, camera, frame);
  window.addEventListener("resize", apply);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(apply);
    ro.observe(frame);
  }
  apply();
}
