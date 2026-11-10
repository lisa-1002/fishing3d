// Faceted dusk forest for 林间红帽. The readable path plate only grades the sky.
// Cloak and wolf plates are RGB photos with backdrops, so the figures are modeled, not cards.
import { valueNoise } from "../lib/kit.js";

const READABLE_SKY = new URL("./assets/ingame/bg-forest-path-readable.png", import.meta.url).href;
const DARK_SKY = new URL("./assets/ingame/bg-forest-path.png", import.meta.url).href;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rndRange(rng, a, b) {
  return a + (b - a) * rng();
}

function canvasTex(THREE, renderer, w, h, draw, srgb) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.needsUpdate = true;
  return tex;
}

function paintNoise(ctx, w, h, shade) {
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = shade(x, y, w, h);
      const i = (y * w + x) * 4;
      img.data[i] = col[0];
      img.data[i + 1] = col[1];
      img.data[i + 2] = col[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function mergeParts(THREE, parts) {
  const geos = parts.map((geo) => (geo.index ? geo.toNonIndexed() : geo));
  let count = 0;
  for (const geo of geos) count += geo.attributes.position.count;
  const pos = new Float32Array(count * 3);
  let offset = 0;
  for (const geo of geos) {
    pos.set(geo.attributes.position.array, offset);
    offset += geo.attributes.position.count * 3;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  merged.computeVertexNormals();
  return merged;
}

function instances(THREE, geo, mat, items, cast, colorOf) {
  if (!items.length) return null;
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const euler = new THREE.Euler();
  const color = new THREE.Color();
  items.forEach((item, index) => {
    euler.set(item.rx || 0, item.ry || 0, 0);
    quat.setFromEuler(euler);
    scale.set(item.sx, item.sy, item.sz);
    pos.set(item.x, item.y || 0, item.z);
    matrix.compose(pos, quat, scale);
    mesh.setMatrixAt(index, matrix);
    color.set(colorOf(item));
    mesh.setColorAt(index, color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function pineCanopy(THREE, wide) {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const radius = (wide ? 1.35 : 1.05) - i * (wide ? 0.16 : 0.14);
    const cone = new THREE.ConeGeometry(radius, wide ? 1.15 : 1.02, 7);
    cone.translate(0, 1.65 + i * 0.62, 0);
    parts.push(cone);
  }
  return mergeParts(THREE, parts);
}

function trunkGeo(THREE) {
  const geo = new THREE.CylinderGeometry(0.16, 0.3, 1.7, 6);
  geo.translate(0, 0.85, 0);
  return geo;
}

function bushGeo(THREE) {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const blob = new THREE.IcosahedronGeometry(0.32, 0);
    blob.translate((i - 1.5) * 0.18, 0.18, ((i % 2) - 0.5) * 0.16);
    parts.push(blob);
  }
  return mergeParts(THREE, parts);
}

function softCircle(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.4, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSky(THREE, scene) {
  const dummy = new THREE.DataTexture(new Uint8Array([180, 150, 190, 255]), 1, 1);
  dummy.needsUpdate = true;
  dummy.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      map: { value: dummy },
      useMap: { value: 0 },
        top: { value: new THREE.Color(0x2c2458) },
        mid: { value: new THREE.Color(0x7a5c92) },
        hor: { value: new THREE.Color(0xd7a8c4) },
        low: { value: new THREE.Color(0x6e628c) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D map;
      uniform float useMap;
      uniform vec3 top;
      uniform vec3 mid;
      uniform vec3 hor;
      uniform vec3 low;
      void main() {
        float h = vUv.y;
        vec3 col = mix(low, hor, smoothstep(0.30, 0.48, h));
        col = mix(col, mid, smoothstep(0.46, 0.70, h));
        col = mix(col, top, smoothstep(0.64, 0.92, h));
        if (useMap > 0.5 && h > 0.52) {
          float k = smoothstep(0.52, 0.74, h);
          vec2 uv = vec2(fract(vUv.x), mix(0.74, 0.995, clamp((h - 0.52) / 0.48, 0.0, 1.0)));
          col = mix(col, texture2D(map, uv).rgb, k * 0.82);
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(78, 28, 16), mat);
  sky.frustumCulled = false;
  scene.add(sky);
  const loader = new THREE.TextureLoader();
  const apply = (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    mat.uniforms.map.value = tex;
    mat.uniforms.useMap.value = 1;
  };
  loader.load(READABLE_SKY, apply, undefined, () => {
    loader.load(DARK_SKY, apply);
  });
}

function makeLights(THREE, scene) {
  scene.add(new THREE.HemisphereLight(0xc4b6dc, 0x5a4e3c, 0.92));
  const sun = new THREE.DirectionalLight(0xffd2ae, 1.75);
  sun.position.set(-8, 16, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.045;
  sun.shadow.radius = 2.5;
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 46;
  const ext = 14;
  sun.shadow.camera.left = -ext;
  sun.shadow.camera.right = ext;
  sun.shadow.camera.top = ext;
  sun.shadow.camera.bottom = -ext;
  sun.target.position.set(0.3, 0.5, -1);
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xffe4cc, 0.62);
  fill.position.set(2, 9, 16);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x9eadd8, 0.32);
  rim.position.set(7, 6, -12);
  scene.add(rim);
}

function makeGround(THREE, renderer, scene) {
  const grass = canvasTex(THREE, renderer, 256, 256, (ctx, w, h) => {
    paintNoise(ctx, w, h, (x, y) => {
      const n = valueNoise(x / 18, y / 18);
      const m = valueNoise(x / 5, y / 5);
      return [58 + n * 28 + m * 8, 96 + n * 34, 58 + n * 16];
    });
  }, true);
  grass.repeat.set(8, 8);
  const dirt = canvasTex(THREE, renderer, 256, 256, (ctx, w, h) => {
    paintNoise(ctx, w, h, (x, y) => {
      const u = x / (w - 1);
      const edge = Math.min(1, Math.min(u, 1 - u) / 0.22);
      const n = valueNoise(x / 16, y / 24);
      const f = valueNoise(x / 4, y / 5);
      const shade = 0.78 + 0.22 * edge;
      let r = (196 + n * 36) * shade;
      let g = (148 + n * 24) * shade;
      let b = (96 + n * 14) * shade;
      if (f > 0.8) {
        r -= 16;
        g -= 12;
        b -= 8;
      }
      return [r, g, b];
    });
  }, true);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(28, 48),
    new THREE.MeshStandardMaterial({ map: grass, roughness: 0.94, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  dirt.repeat.set(1, 6);
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 17.8),
    new THREE.MeshStandardMaterial({ map: dirt, roughness: 0.8, metalness: 0 })
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(0.35, 0.045, -0.5);
  path.receiveShadow = true;
  scene.add(path);
}

function forestBlocked(x, z, berries) {
  if (z < 8.9 && z > -9.7 && Math.abs(x - 0.32) < 3.5) return true;
  if (Math.hypot(x, z + 8.55) < 2.65) return true;
  for (const berry of berries) {
    if (Math.hypot(x - berry.x, z - berry.z) < 0.9) return true;
  }
  return false;
}

function makeForest(THREE, renderer, scene, berries) {
  const rng = mulberry32(0x51ed11);
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.84,
    metalness: 0,
    emissive: 0x16321c,
    emissiveIntensity: 0.22,
    flatShading: true,
  });
  const wideMat = canopyMat.clone();
  wideMat.emissive = new THREE.Color(0x1a3a22);
  const bark = canvasTex(THREE, renderer, 128, 256, (ctx, w, h) => {
    ctx.fillStyle = "#7a5340";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      ctx.strokeStyle = `rgba(${40 + (i % 5) * 8},${24 + (i % 3) * 6},16,0.45)`;
      ctx.lineWidth = 1 + (i % 3);
      ctx.beginPath();
      const x0 = (i * 17) % w;
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0 + Math.sin(i) * 6, h);
      ctx.stroke();
    }
  }, true);
  bark.repeat.set(1, 2);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: bark,
    roughness: 0.92,
    flatShading: true,
  });
  const bushMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    emissive: 0x142818,
    emissiveIntensity: 0.16,
    flatShading: true,
  });
  const tight = pineCanopy(THREE, false);
  const wide = pineCanopy(THREE, true);
  const trunk = trunkGeo(THREE);
  const near = [];
  const far = [];
  const greens = [0x4d7a46, 0x3e6c3c, 0x56884c, 0x356238, 0x2f5c34];
  const browns = [0xffffff, 0xf0e0d4, 0xe4d0c0, 0xd8c4b0];
  for (let i = 0; i < 14; i++) {
    const z = 7.6 - i * 1.22;
    near.push({
      x: -4.15 - rndRange(rng, 0, 1.35),
      z: z + rndRange(rng, -0.15, 0.15),
      sx: rndRange(rng, 0.95, 1.35),
      sy: rndRange(rng, 1.05, 1.45),
      sz: rndRange(rng, 0.95, 1.3),
      ry: rndRange(rng, 0, 6.2),
      wide: i % 4 === 0,
      canopy: greens[i % greens.length],
      trunk: browns[i % browns.length],
    });
    near.push({
      x: 4.05 + rndRange(rng, 0, 1.45),
      z: z - 0.35,
      sx: rndRange(rng, 0.9, 1.3),
      sy: rndRange(rng, 1.0, 1.4),
      sz: rndRange(rng, 0.9, 1.25),
      ry: rndRange(rng, 0, 6.2),
      wide: i % 5 === 0,
      canopy: greens[(i + 2) % greens.length],
      trunk: browns[(i + 1) % browns.length],
    });
  }
  let guard = 0;
  while (far.length < 40 && guard < 400) {
    guard += 1;
    const ang = rng() * Math.PI * 2;
    const rad = 8.5 + rng() * 12;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad * 0.9 - 0.5;
    if (forestBlocked(x, z, berries)) continue;
    far.push({
      x,
      z,
      sx: rndRange(rng, 0.85, 1.55),
      sy: rndRange(rng, 0.9, 1.7),
      sz: rndRange(rng, 0.85, 1.5),
      ry: rng() * 6.2,
      wide: rng() > 0.72,
      canopy: greens[far.length % greens.length],
      trunk: browns[far.length % browns.length],
    });
  }
  const addPair = (list, cast) => {
    const tightItems = list.filter((item) => !item.wide);
    const wideItems = list.filter((item) => item.wide);
    for (const mesh of [
      instances(THREE, tight, canopyMat, tightItems, cast, (item) => item.canopy),
      instances(THREE, wide, wideMat, wideItems, cast, (item) => item.canopy),
      instances(THREE, trunk, trunkMat, list, cast, (item) => item.trunk),
    ]) {
      if (mesh) scene.add(mesh);
    }
  };
  addPair(near, true);
  addPair(far, false);

  const bushes = [];
  for (let i = 0; i < 36; i++) {
    const z = 8.1 - i * 0.48;
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * rndRange(rng, 1.85, 3.25) + 0.15;
    if (forestBlocked(x, z, []) && Math.hypot(x - 2.1, 0) < 0.2) continue;
    let skip = false;
    for (const berry of berries) {
      if (Math.hypot(x - berry.x, z - berry.z) < 0.85) skip = true;
    }
    if (skip || Math.abs(x) < 1.55) continue;
    bushes.push({
      x,
      z,
      y: 0,
      sx: rndRange(rng, 0.7, 1.25),
      sy: rndRange(rng, 0.45, 0.8),
      sz: rndRange(rng, 0.7, 1.2),
      ry: rng() * 6,
      color: greens[(i + 1) % greens.length],
    });
  }
  const bush = instances(THREE, bushGeo(THREE), bushMat, bushes, false, (item) => item.color);
  if (bush) scene.add(bush);

  const tuft = new THREE.ConeGeometry(0.07, 0.32, 4);
  tuft.translate(0, 0.16, 0);
  const tufts = [];
  for (let i = 0; i < 90; i++) {
    const z = 8.2 - rng() * 17.2;
    const side = rng() > 0.5 ? 1 : -1;
    const x = 0.32 + side * rndRange(rng, 1.35, 3.1);
    tufts.push({
      x,
      z,
      sx: rndRange(rng, 0.7, 1.3),
      sy: rndRange(rng, 0.7, 1.4),
      sz: rndRange(rng, 0.7, 1.3),
      ry: rng() * 3,
      color: rng() > 0.5 ? 0x6a8a40 : 0x3f6a34,
    });
  }
  const grass = instances(
    THREE,
    tuft,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }),
    tufts,
    false,
    (item) => item.color
  );
  if (grass) scene.add(grass);

  const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x8a80aa, roughness: 1, flatShading: true });
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.3;
    const h = 4.2 + (i % 3) * 2.1;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(4.2, h, 5), ridgeMat);
    hill.position.set(Math.cos(ang) * 30, h * 0.2, Math.sin(ang) * 30);
    scene.add(hill);
  }
}

function makeCottage(THREE, scene) {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: 0xd7c4a4, roughness: 0.86, flatShading: true });
  const timber = new THREE.MeshStandardMaterial({ color: 0x6a4632, roughness: 0.84, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x6e3830, roughness: 0.78, flatShading: true, side: THREE.DoubleSide });
  const stone = new THREE.MeshStandardMaterial({ color: 0x8d8478, roughness: 0.95, flatShading: true });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.28, 2.25), stone);
  base.position.y = 0.14;
  base.castShadow = true;
  base.receiveShadow = true;
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.45, 1.95), wall);
  body.position.y = 1.0;
  body.castShadow = true;
  body.receiveShadow = true;
  const beamV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.45, 0.08), timber);
  beamV.position.set(-0.7, 1.0, 0.98);
  const beamV2 = beamV.clone();
  beamV2.position.x = 0.7;
  const beamH = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.1, 0.1), timber);
  beamH.position.set(0, 1.68, 0.96);
  const hw = 1.45;
  const hd = 1.2;
  const rh = 1.05;
  const roofPos = [
    -hw, 0, -hd, 0, rh, -hd, -hw, 0, hd,
    0, rh, -hd, 0, rh, hd, -hw, 0, hd,
    hw, 0, hd, 0, rh, hd, hw, 0, -hd,
    0, rh, hd, 0, rh, -hd, hw, 0, -hd,
    -hw, 0, hd, 0, rh, hd, hw, 0, hd,
    hw, 0, -hd, 0, rh, -hd, -hw, 0, -hd,
  ];
  const roofGeo = new THREE.BufferGeometry();
  roofGeo.setAttribute("position", new THREE.Float32BufferAttribute(roofPos, 3));
  roofGeo.computeVertexNormals();
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 1.72;
  roof.castShadow = true;
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.32), stone);
  chimney.position.set(0.62, 2.35, -0.25);
  chimney.castShadow = true;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.82, 0.08), timber);
  door.position.set(-0.15, 0.55, 1.02);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.48),
    new THREE.MeshStandardMaterial({
      color: 0xffe0a8,
      emissive: 0xffb45a,
      emissiveIntensity: 1.35,
      roughness: 0.25,
    })
  );
  glass.position.set(0.55, 1.22, 1.01);
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.02), timber);
  mullion.position.set(0.55, 1.22, 1.03);
  const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.52, 0.02), timber);
  mullionV.position.set(0.55, 1.22, 1.03);
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.42), stone);
  step.position.set(-0.1, 0.06, 1.28);
  step.receiveShadow = true;
  const lamp = new THREE.PointLight(0xffb15a, 2.6, 16, 2);
  lamp.position.set(0.4, 1.45, 1.55);
  const glowMap = softCircle(THREE);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowMap,
    color: 0xffc56a,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  glow.position.set(0.55, 1.25, 1.2);
  glow.scale.set(1.1, 1.1, 1);
  const smokes = [];
  for (let i = 0; i < 4; i++) {
    const smoke = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowMap,
      color: 0xd9d3e4,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }));
    smoke.position.set(0.62, 2.7 + i * 0.25, -0.25);
    smoke.scale.set(0.45, 0.45, 1);
    smoke.userData.phase = i * 0.27;
    smokes.push(smoke);
  }
  g.add(base, body, beamV, beamV2, beamH, roof, chimney, door, glass, mullion, mullionV, step, lamp, glow, ...smokes);
  g.position.set(0, 0, -8.55);
  scene.add(g);
  const yard = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 16),
    new THREE.MeshBasicMaterial({ color: 0xffc48a, transparent: true, opacity: 0.28, depthWrite: false })
  );
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(0, 0.05, -7.35);
  scene.add(yard);
  return { lamp, smokes };
}

function jaggedCape(THREE) {
  const pts = [
    new THREE.Vector2(0.12, 1.38),
    new THREE.Vector2(0.34, 1.12),
    new THREE.Vector2(0.5, 0.72),
    new THREE.Vector2(0.58, 0.32),
    new THREE.Vector2(0.5, 0.06),
  ];
  const geo = new THREE.LatheGeometry(pts, 9, Math.PI * 0.62, Math.PI * 0.76);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < 0.24) {
      const nick = ((i * 13) % 6) * 0.028;
      pos.setY(i, pos.getY(i) - nick);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

export function createHero(THREE) {
  const root = new THREE.Group();
  const hips = new THREE.Group();
  root.add(hips);
  const capeMat = new THREE.MeshPhysicalMaterial({
    color: 0xd3222a,
    roughness: 0.56,
    metalness: 0,
    sheen: 1,
    sheenColor: new THREE.Color(0xffb4a8),
    sheenRoughness: 0.4,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.86, flatShading: true });
  const basketMat = new THREE.MeshStandardMaterial({ color: 0x8d5a34, roughness: 0.76, flatShading: true });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc48968, roughness: 0.7, flatShading: true });

  const legL = new THREE.Group();
  legL.position.set(-0.1, 0.36, 0.02);
  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.22), bootMat);
  boot.position.set(0, -0.18, 0.03);
  const calf = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), bootMat);
  calf.position.y = -0.02;
  legL.add(boot, calf);
  const legR = legL.clone();
  legR.position.x = 0.1;
  hips.add(legL, legR);

  const cape = new THREE.Mesh(jaggedCape(THREE), capeMat);
  cape.castShadow = true;
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 6), capeMat);
  hood.position.y = 1.62;
  hood.castShadow = true;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 6), capeMat);
  neck.position.y = 1.4;
  hips.add(cape, hood, neck);

  const arm = new THREE.Group();
  arm.position.set(-0.26, 1.08, 0.04);
  const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.18, 2, 5), capeMat);
  sleeve.rotation.z = 0.7;
  sleeve.position.set(-0.08, -0.1, 0.02);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), skin);
  hand.position.set(-0.16, -0.22, 0.05);
  const basket = new THREE.Group();
  basket.position.set(-0.18, -0.28, 0.08);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.12, 8, 1, true), basketMat);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.014, 4, 8), basketMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.06;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 4, 8), basketMat);
  handle.position.y = 0.12;
  basket.add(bowl, rim, handle);
  arm.add(sleeve, hand, basket);
  hips.add(arm);

  root.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = true;
  });
  root.userData.animate = (moving, t) => {
    const swing = moving ? Math.sin(t * 9.2) : Math.sin(t * 1.7) * 0.18;
    legL.rotation.x = swing * 0.8;
    legR.rotation.x = -swing * 0.8;
    arm.rotation.x = -swing * 0.22;
    hips.position.y = moving ? Math.abs(Math.sin(t * 9.2)) * 0.04 : Math.sin(t * 1.7) * 0.012;
  };
  return root;
}

export function createWolf(THREE) {
  const g = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x4e3a32, roughness: 0.78, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c211c, roughness: 0.86, flatShading: true });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 5), fur);
  body.scale.set(0.9, 0.78, 1.55);
  body.position.y = 0.46;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 5), fur);
  head.scale.set(0.9, 0.85, 1.15);
  head.position.set(0, 0.58, 0.4);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 5), dark);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0.52, 0.58);
  const earL = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 4), fur);
  earL.position.set(0.07, 0.74, 0.34);
  const earR = earL.clone();
  earR.position.x = -0.07;
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xffd56a,
    emissive: 0xffc04a,
    emissiveIntensity: 1.3,
  });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), eyeMat);
  eye.position.set(0.1, 0.6, 0.5);
  const eye2 = eye.clone();
  eye2.position.x = -0.1;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.38, 5), fur);
  tail.rotation.x = Math.PI / 2.4;
  tail.position.set(0, 0.52, -0.48);
  const legs = [];
  const pivots = [];
  const spots = [[0.28, 0.12], [0.28, -0.12], [-0.22, 0.12], [-0.22, -0.12]];
  for (const [z, x] of spots) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.36, z);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.32, 5), fur);
    leg.position.y = -0.14;
    const paw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.1), dark);
    paw.position.set(0, -0.3, 0.02);
    pivot.add(leg, paw);
    pivots.push(pivot);
    legs.push(pivot);
  }
  g.add(body, head, snout, earL, earR, eye, eye2, tail, ...legs);
  g.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = true;
  });
  g.userData.step = (moving, t) => {
    const swing = moving ? Math.sin(t * 8) : 0;
    pivots.forEach((pivot, index) => {
      pivot.rotation.x = (index % 2 === 0 ? swing : -swing) * 0.45;
    });
  };
  return g;
}

function makeBerry(THREE) {
  const g = new THREE.Group();
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f6a38, roughness: 0.8, flatShading: true });
  const fruitMat = new THREE.MeshPhysicalMaterial({
    color: 0xd62828,
    roughness: 0.28,
    metalness: 0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.25,
    emissive: 0x8a1618,
    emissiveIntensity: 0.45,
    flatShading: true,
  });
  for (let i = 0; i < 3; i++) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), leafMat);
    leaf.position.set(Math.cos(i * 2.1) * 0.12, 0.08, Math.sin(i * 2.1) * 0.1);
    leaf.scale.y = 0.55;
    g.add(leaf);
  }
  for (let i = 0; i < 4; i++) {
    const fruit = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), fruitMat);
    fruit.position.set((i - 1.5) * 0.07, 0.22 + (i % 2) * 0.05, (i % 2) * 0.05);
    fruit.castShadow = true;
    g.add(fruit);
  }
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.26, 14),
    new THREE.MeshBasicMaterial({ color: 0xff6a6a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  g.add(ring);
  return g;
}

function makeMotes(THREE) {
  const count = 28;
  const pos = new Float32Array(count * 3);
  const seeds = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (2.4 + (i % 5) * 0.45);
    const y = 0.6 + (i % 7) * 0.35;
    const z = 6.5 - i * 0.55;
    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
    seeds.push({ x, y, z, p: i * 0.7 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xffe2a0,
      size: 0.07,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
  );
  return { points, seeds };
}

export function createScenery(THREE, renderer, scene, berries) {
  renderer.toneMappingExposure = 1.12;
  scene.background = new THREE.Color(0x8d84a8);
  scene.fog = new THREE.Fog(0x8d84a8, 20, 52);
  makeSky(THREE, scene);
  makeLights(THREE, scene);
  makeGround(THREE, renderer, scene);
  makeForest(THREE, renderer, scene, berries);
  const cottage = makeCottage(THREE, scene);
  const hero = createHero(THREE);
  const wolf = createWolf(THREE);
  scene.add(hero, wolf);
  const berryMeshes = berries.map((spec) => {
    const mesh = makeBerry(THREE);
    mesh.position.set(spec.x, 0.22, spec.z);
    scene.add(mesh);
    return mesh;
  });
  const motes = makeMotes(THREE);
  scene.add(motes.points);
  const mistMap = softCircle(THREE);
  const mists = [];
  for (let i = 0; i < 4; i++) {
    const mist = new THREE.Mesh(
      new THREE.PlaneGeometry(6.5, 2.4),
      new THREE.MeshBasicMaterial({
        map: mistMap,
        color: 0xd5d0e6,
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    mist.rotation.x = -Math.PI / 2;
    mist.position.set(0.2, 0.18, 4 - i * 3.2);
    mists.push(mist);
    scene.add(mist);
  }
  let lastX = wolf.position.x;
  let lastZ = wolf.position.z;
  return {
    hero,
    wolf,
    berries: berryMeshes,
    update(t) {
      cottage.lamp.intensity = 2.35 + Math.sin(t * 2.2) * 0.18;
      cottage.smokes.forEach((smoke) => {
        const u = (t * 0.18 + smoke.userData.phase) % 1;
        smoke.position.y = 2.55 + u * 1.25;
        smoke.material.opacity = 0.2 * (1 - u);
      });
      const attr = motes.points.geometry.attributes.position;
      motes.seeds.forEach((seed, i) => {
        attr.setY(i, seed.y + Math.sin(t * 1.4 + seed.p) * 0.18);
        attr.setX(i, seed.x + Math.sin(t * 0.7 + seed.p) * 0.08);
      });
      attr.needsUpdate = true;
      mists.forEach((mist, i) => {
        mist.position.x = 0.2 + Math.sin(t * 0.25 + i) * 0.2;
      });
      const moving = Math.hypot(wolf.position.x - lastX, wolf.position.z - lastZ) > 0.0015;
      lastX = wolf.position.x;
      lastZ = wolf.position.z;
      wolf.userData.step(moving, t);
    },
  };
}
