import { addLights, makeMarker, paintTexture, valueNoise } from "../lib/kit.js";

/**
 * In-game sheets are opaque RGB (no alpha, no tRNS):
 * assets/bg-broken-bridge.png, assets/bg-lei-feng-tower.png,
 * assets/char-white-robe-back.png.
 * The robe painting includes mist and rock, so it is not used as a billboard.
 * Bridge and tower paintings sit as fogged mattes behind navigable meshes.
 */

const MIST = 0x6a8499;
const TEAL = 0x7eb8b0;
const ROBE = 0xf2f4f7;
const TOWER = 0x6b3e2e;

function rand(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function glowTexture(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext("2d");
  const r = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  r.addColorStop(0, "rgba(255,226,186,0.95)");
  r.addColorStop(0.35, "rgba(255,196,130,0.28)");
  r.addColorStop(1, "rgba(255,196,130,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function mistEnvironment(THREE, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      top: { value: new THREE.Color(0xc5d2dc) },
      mid: { value: new THREE.Color(MIST) },
      low: { value: new THREE.Color(0x2c3a38) },
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
      uniform vec3 low;
      void main() {
        float h = normalize(vP).y;
        vec3 c = mix(low, mid, smoothstep(-0.35, 0.18, h));
        c = mix(c, top, smoothstep(0.12, 0.75, h));
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(8, 24, 16), mat));
  const target = pmrem.fromScene(envScene, 0.05);
  pmrem.dispose();
  return target.texture;
}

function makeSky(THREE) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(0x9aafbc) },
      mid: { value: new THREE.Color(0x7e97a6) },
      low: { value: new THREE.Color(MIST) },
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
      uniform vec3 low;
      void main() {
        vec3 n = normalize(vP);
        float h = n.y;
        vec3 c = mix(low, mid, smoothstep(-0.05, 0.28, h));
        c = mix(c, top, smoothstep(0.22, 0.82, h));
        float cloud = sin(n.x * 7.0 + n.z * 4.0) * sin(n.z * 6.0 - n.x * 2.0);
        c += vec3(0.03, 0.035, 0.04) * smoothstep(0.15, 0.9, cloud) * smoothstep(0.05, 0.4, h);
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(78, 28, 18), mat);
  sky.frustumCulled = false;
  return sky;
}

function matteMaterial(THREE, url, opacity) {
  const map = new THREE.TextureLoader().load(url);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: {
      uMap: { value: map },
      uMist: { value: new THREE.Color(MIST) },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uMist;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec3 col = texture2D(uMap, vUv).rgb;
        float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
        float lift = smoothstep(0.0, 0.42, vUv.y);
        col = mix(uMist, col, 0.55);
        col = mix(col, uMist, lift * 0.35);
        gl_FragColor = vec4(col, uOpacity * edge * lift);
      }
    `,
  });
}

function waterMaterial(THREE) {
  return new THREE.ShaderMaterial({
    transparent: true,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x14343c) },
      uShallow: { value: new THREE.Color(0x3e7c84) },
      uMist: { value: new THREE.Color(0x8ea6b2) },
      uLight: { value: new THREE.Vector3(-0.35, 0.82, 0.45) },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorld;
      varying vec3 vNormal;
      void main() {
        vec3 p = position;
        float w1 = sin(p.x * 1.35 + uTime * 0.9) * cos(p.y * 1.15 - uTime * 0.7);
        float w2 = sin((p.x + p.y) * 2.4 - uTime * 1.15);
        p.z += w1 * 0.035 + w2 * 0.018;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        vNormal = normalize(mat3(modelMatrix) * vec3(-w1 * 0.15, -w2 * 0.12, 1.0));
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uMist;
      uniform vec3 uLight;
      varying vec3 vWorld;
      varying vec3 vNormal;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorld);
        vec3 n = normalize(vNormal);
        float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
        float ripple = sin(vWorld.x * 5.5 + uTime * 1.4) * sin(vWorld.z * 4.2 - uTime * 1.1);
        ripple += sin(vWorld.x * 13.0 - vWorld.z * 11.0 + uTime * 2.6) * 0.35;
        float rain = smoothstep(0.72, 0.98, sin(vWorld.x * 19.0 + uTime * 3.0) * sin(vWorld.z * 17.0 - uTime * 2.4));
        vec3 col = mix(uDeep, uShallow, clamp(0.5 + ripple * 0.18, 0.0, 1.0));
        col = mix(col, uMist, fres * 0.62);
        float spec = pow(max(dot(reflect(-normalize(uLight), n), viewDir), 0.0), 48.0);
        col += vec3(0.55, 0.62, 0.6) * spec;
        col += vec3(0.75, 0.82, 0.84) * rain * 0.18;
        float shore = smoothstep(4.15, 4.85, length(vWorld.xz - vec2(0.0, 0.5)));
        col = mix(col, vec3(0.62, 0.74, 0.76), shore * 0.45);
        gl_FragColor = vec4(col, 0.94);
      }
    `,
  });
}

function foliageMaterial(THREE) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    fog: true,
    uniforms: {
      uTime: { value: 0 },
      fogColor: { value: new THREE.Color(MIST) },
      fogDensity: { value: 0.03 },
    },
    vertexShader: `
      uniform float uTime;
      attribute float aPhase;
      varying float vShade;
      varying float vFog;
      void main() {
        vShade = aPhase;
        vec3 p = position;
        float tip = 1.0 - uv.y;
        p.x += sin(uTime * 1.25 + aPhase) * tip * 0.2;
        p.z += cos(uTime * 0.95 + aPhase * 1.3) * tip * 0.14;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFog = mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying float vShade;
      varying float vFog;
      uniform vec3 fogColor;
      uniform float fogDensity;
      void main() {
        float band = fract(vShade * 3.7);
        vec3 leaf = mix(vec3(0.24, 0.33, 0.30), vec3(0.45, 0.56, 0.48), band);
        float f = 1.0 - exp(-fogDensity * fogDensity * vFog * vFog);
        gl_FragColor = vec4(mix(leaf, fogColor, clamp(f, 0.0, 1.0)), 1.0);
      }
    `,
  });
}

function pushStrand(positions, uvs, phases, indices, origin, yaw, length, width, phase) {
  const segs = 6;
  const base = positions.length / 3;
  const ca = Math.cos(yaw);
  const sa = Math.sin(yaw);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const y = origin.y - t * length;
    const bend = Math.sin(t * 1.15) * 0.22;
    const lx = -width * 0.5;
    const rx = width * 0.5;
    const z = bend;
    for (const x of [lx, rx]) {
      positions.push(origin.x + x * ca - z * sa, y, origin.z + x * sa + z * ca);
      uvs.push(x < 0 ? 0 : 1, 1 - t);
      phases.push(phase);
    }
  }
  for (let i = 0; i < segs; i++) {
    const a = base + i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
}

function buildWillows(THREE, scene, leafMat) {
  const rng = rand(19);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x4a3c32,
    roughness: 0.92,
    flatShading: true,
  });
  const trunkGeo = new THREE.CylinderGeometry(0.07, 0.16, 2.15, 6);
  const positions = [];
  const uvs = [];
  const phases = [];
  const indices = [];
  const spots = [
    [-3.4, 6.4],
    [3.6, 6.55],
    [-8.4, 4.2],
    [8.7, 4.4],
    [-9.1, -1.2],
    [9.15, -0.4],
    [-7.6, -5.4],
    [8.2, -6.3],
    [-2.8, -8.6],
    [3.1, -8.7],
    [6.4, 7.6],
    [-6.2, 7.4],
  ];
  spots.forEach((spot, index) => {
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(spot[0], 1.05, spot[1]);
    trunk.rotation.z = (rng() - 0.5) * 0.18;
    trunk.rotation.x = (rng() - 0.5) * 0.12;
    trunk.castShadow = true;
    scene.add(trunk);
    const scale = 0.85 + (index % 3) * 0.12;
    const strands = 9 + (index % 3);
    for (let s = 0; s < strands; s++) {
      const yaw = (s / strands) * Math.PI * 2 + rng();
      const reach = (0.18 + rng() * 0.28) * scale;
      pushStrand(
        positions,
        uvs,
        phases,
        indices,
        {
          x: spot[0] + Math.cos(yaw) * reach,
          y: 2.05 * scale + 0.15,
          z: spot[1] + Math.sin(yaw) * reach,
        },
        yaw,
        (1.15 + rng() * 0.55) * scale,
        0.1 + rng() * 0.05,
        index * 2.1 + s
      );
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("aPhase", new THREE.Float32BufferAttribute(phases, 1));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const leaves = new THREE.Mesh(geo, leafMat);
  leaves.frustumCulled = false;
  scene.add(leaves);
}

function buildEave(THREE, innerR, outerR, lift) {
  const n = 8;
  const pos = [];
  const idx = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const ring = [
      [Math.cos(a0) * innerR, 0, Math.sin(a0) * innerR],
      [Math.cos(a1) * innerR, 0, Math.sin(a1) * innerR],
      [Math.cos(a0) * outerR, lift, Math.sin(a0) * outerR],
      [Math.cos(am) * outerR * 1.04, lift * 0.28, Math.sin(am) * outerR * 1.04],
      [Math.cos(a1) * outerR, lift, Math.sin(a1) * outerR],
    ];
    const b = pos.length / 3;
    ring.forEach((p) => pos.push(p[0], p[1], p[2]));
    idx.push(b, b + 1, b + 3, b + 1, b + 4, b + 3, b, b + 3, b + 2);
    ring.forEach((p) => pos.push(p[0], p[1] - 0.055, p[2]));
    const u = b + 5;
    idx.push(u + 1, u, u + 3, u + 4, u + 1, u + 3, u + 3, u, u + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function buildTower(THREE, wallMat, roofMat, stoneMat) {
  const g = new THREE.Group();
  const podium = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.62, 0.42, 8), stoneMat);
  podium.position.y = 0.21;
  podium.castShadow = true;
  podium.receiveShadow = true;
  g.add(podium);
  for (let step = 0; step < 5; step++) {
    const stair = new THREE.Mesh(new THREE.BoxGeometry(1.15 - step * 0.06, 0.1, 0.34), stoneMat);
    stair.position.set(-1.55 - step * 0.28, 0.06 + step * 0.08, 0);
    stair.receiveShadow = true;
    g.add(stair);
  }
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.62, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x241810, roughness: 0.8, emissive: 0x3a2418, emissiveIntensity: 0.35 })
  );
  door.position.set(-0.72, 0.72, 0);
  g.add(door);
  const stories = 5;
  for (let i = 0; i < stories; i++) {
    const shrink = i * 0.1;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62 - shrink, 0.74 - shrink, 0.7, 8),
      wallMat
    );
    body.position.y = 0.78 + i * 0.86;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    const eave = new THREE.Mesh(buildEave(THREE, 0.5 - shrink * 0.6, 1.18 - shrink, 0.2), roofMat);
    eave.position.y = 1.08 + i * 0.86;
    eave.castShadow = true;
    g.add(eave);
    for (let s = 0; s < 4; s++) {
      const a = (s / 4) * Math.PI * 2 + Math.PI / 8;
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.2, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x1a120e, roughness: 0.6, emissive: 0x2a1c14, emissiveIntensity: 0.25 })
      );
      const r = 0.7 - shrink;
      win.position.set(Math.cos(a) * r, 0.82 + i * 0.86, Math.sin(a) * r);
      win.lookAt(0, win.position.y, 0);
      g.add(win);
    }
  }
  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.85, 6),
    roofMat
  );
  spire.position.y = 0.78 + stories * 0.86 + 0.35;
  spire.castShadow = true;
  g.add(spire);
  const finial = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xd4b56a, roughness: 0.4, metalness: 0.35 })
  );
  finial.position.y = spire.position.y + 0.48;
  g.add(finial);
  g.position.set(8.55, 0, -3.35);
  return g;
}

function buildBridge(THREE, stoneMat, darkMat, glow) {
  const g = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.16, 0.48), i % 2 ? stoneMat : darkMat);
    slab.position.set(0, 0.22, -2.15 + i * 0.48);
    slab.castShadow = true;
    slab.receiveShadow = true;
    g.add(slab);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.16, 5, 14, Math.PI), stoneMat);
  arch.rotation.z = Math.PI;
  arch.rotation.y = Math.PI / 2;
  arch.position.set(0, 0.08, 1.35);
  arch.castShadow = true;
  g.add(arch);
  for (const side of [-1.22, 1.22]) {
    const abutment = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.7, 0.7), stoneMat);
    abutment.position.set(side, 0.28, 1.35);
    abutment.castShadow = true;
    g.add(abutment);
  }
  const railMat = darkMat;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const broken = side < 0 && (i === 3 || i === 4);
      const z = -1.85 + i * 0.58;
      if (!broken) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.12), railMat);
        post.position.set(side * 1.12, 0.5, z);
        post.castShadow = true;
        g.add(post);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.18), stoneMat);
        cap.position.set(side * 1.12, 0.76, z);
        g.add(cap);
      } else {
        const stub = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.16), stoneMat);
        stub.position.set(side * 1.05, 0.34, z);
        stub.rotation.z = side * 0.5;
        stub.rotation.y = 0.4;
        g.add(stub);
      }
      if (i < 7 && !(side < 0 && i >= 2 && i <= 4)) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), railMat);
        rail.position.set(side * 1.12, 0.62, z + 0.29);
        g.add(rail);
      }
    }
  }
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.06, 1.05, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: 0.8, flatShading: true })
  );
  pole.position.set(0.82, 0.85, -1.7);
  g.add(pole);
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.28, 0.22),
    new THREE.MeshStandardMaterial({
      color: 0xf0d7a6,
      emissive: 0xf0c48a,
      emissiveIntensity: 0.85,
      roughness: 0.4,
    })
  );
  lamp.position.set(0.82, 1.42, -1.7);
  g.add(lamp);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glow,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
    })
  );
  sprite.position.set(0.82, 1.46, -1.7);
  sprite.scale.set(1.8, 1.8, 1.8);
  g.add(sprite);
  const light = new THREE.PointLight(0xffd7a4, 2.4, 8.5, 2);
  light.position.set(0.82, 1.45, -1.7);
  g.add(light);
  g.position.set(0, 0, -7.15);
  return g;
}

function buildHero(THREE) {
  const g = new THREE.Group();
  const hips = new THREE.Group();
  g.add(hips);
  const cloth = new THREE.MeshStandardMaterial({
    color: ROBE,
    roughness: 0.72,
    metalness: 0,
    flatShading: true,
    envMapIntensity: 0.4,
  });
  const teal = new THREE.MeshStandardMaterial({
    color: TEAL,
    roughness: 0.42,
    metalness: 0.04,
    flatShading: true,
    envMapIntensity: 0.55,
  });
  const hairM = new THREE.MeshStandardMaterial({ color: 0x161311, roughness: 0.8, flatShading: true });
  const skin = new THREE.MeshStandardMaterial({ color: 0xf0d2c0, roughness: 0.6, flatShading: true });
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.58, 1.18, 8), cloth);
  skirt.position.y = 0.62;
  skirt.castShadow = true;
  hips.add(skirt);
  const gore = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.95, 0.08), teal);
  gore.position.set(-0.22, 0.58, -0.18);
  gore.rotation.z = 0.18;
  gore.rotation.x = 0.15;
  hips.add(gore);
  const gore2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.05), teal);
  gore2.position.set(0.16, 0.5, -0.28);
  gore2.rotation.z = -0.35;
  hips.add(gore2);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.42, 7), cloth);
  torso.position.y = 1.22;
  torso.castShadow = true;
  hips.add(torso);
  const sash = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 5, 10), teal);
  sash.rotation.x = Math.PI / 2;
  sash.position.y = 1.05;
  hips.add(sash);
  const bow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.06), teal);
  bow.position.set(0, 1.08, -0.18);
  hips.add(bow);
  const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, 0.62, 5), cloth);
  sleeveL.position.set(-0.28, 1.05, 0.02);
  sleeveL.rotation.z = 0.55;
  sleeveL.castShadow = true;
  const sleeveR = sleeveL.clone();
  sleeveR.position.x = 0.28;
  sleeveR.rotation.z = -0.7;
  hips.add(sleeveL, sleeveR);
  const ribbon = new THREE.Group();
  const tailA = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.72, 0.02), teal);
  tailA.position.set(-0.12, 0.62, -0.22);
  tailA.rotation.z = 0.15;
  const tailB = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.64, 0.02), cloth);
  tailB.position.set(0.08, 0.55, -0.26);
  tailB.rotation.z = -0.2;
  ribbon.add(tailA, tailB);
  hips.add(ribbon);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), skin);
  head.position.y = 1.56;
  head.castShadow = true;
  hips.add(head);
  const bun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), hairM);
  bun.position.y = 1.74;
  bun.castShadow = true;
  hips.add(bun);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 4, 8), teal);
  band.position.y = 1.7;
  band.rotation.x = Math.PI / 2;
  hips.add(band);
  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4),
    new THREE.MeshStandardMaterial({ color: 0xd4b56a, roughness: 0.4, metalness: 0.4 })
  );
  pin.position.set(0.06, 1.76, 0);
  pin.rotation.z = Math.PI / 2.4;
  hips.add(pin);
  g.userData.animate = (moving, t) => {
    const step = moving ? Math.sin(t * 8.2) : Math.sin(t * 1.5) * 0.22;
    hips.position.y = moving ? Math.abs(Math.sin(t * 8.2)) * 0.035 : Math.sin(t * 1.5) * 0.012;
    sleeveL.rotation.x = step * 0.25;
    sleeveR.rotation.x = -step * 0.25;
    ribbon.rotation.y = Math.sin(t * 1.3) * 0.18;
    ribbon.rotation.x = Math.sin(t * 1.7) * 0.06;
    skirt.rotation.y = step * 0.03;
  };
  g.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = true;
  });
  return g;
}

function buildMonk(THREE) {
  const g = new THREE.Group();
  const robeMat = new THREE.MeshStandardMaterial({ color: 0x2c2830, roughness: 0.86, flatShading: true });
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.4, 1.2, 7), robeMat);
  robe.position.y = 0.64;
  robe.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 8, 7),
    new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.7, flatShading: true })
  );
  head.position.y = 1.38;
  head.castShadow = true;
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.16, 7),
    new THREE.MeshStandardMaterial({ color: 0x6a5438, roughness: 0.8, flatShading: true })
  );
  hat.position.y = 1.54;
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.03, 8),
    new THREE.MeshStandardMaterial({ color: 0x5a4630, roughness: 0.85, flatShading: true })
  );
  brim.position.y = 1.46;
  const staff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 1.65, 5),
    new THREE.MeshStandardMaterial({ color: 0x6a5030, roughness: 0.7, flatShading: true })
  );
  staff.position.set(0.32, 0.9, 0.04);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.015, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xd4b56a, metalness: 0.45, roughness: 0.35 })
  );
  ring.position.set(0.32, 1.7, 0.04);
  g.add(robe, head, hat, brim, staff, ring);
  return g;
}

function buildHerb(THREE) {
  const g = new THREE.Group();
  const leafMat = new THREE.MeshStandardMaterial({
    color: TEAL,
    emissive: 0x1a4a44,
    emissiveIntensity: 0.45,
    roughness: 0.45,
    flatShading: true,
  });
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.03, 0.22, 5),
    new THREE.MeshStandardMaterial({ color: 0x2f4a3e, roughness: 0.8, flatShading: true })
  );
  stem.position.y = 0.1;
  g.add(stem);
  for (let i = 0; i < 3; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), leafMat);
    leaf.scale.set(1.3, 0.35, 0.7);
    leaf.position.set(Math.cos(i * 2.1) * 0.08, 0.16 + i * 0.02, Math.sin(i * 2.1) * 0.06);
    leaf.rotation.z = (i - 1) * 0.4;
    g.add(leaf);
  }
  const bud = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 6, 5),
    new THREE.MeshStandardMaterial({ color: 0xe6d7a4, emissive: 0xd4b56a, emissiveIntensity: 0.4, flatShading: true })
  );
  bud.position.y = 0.28;
  g.add(bud);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.26, 16),
    new THREE.MeshBasicMaterial({ color: 0x9ad0c6, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  g.add(ring);
  return g;
}

function buildRocks(THREE, scene, stoneMat, herbs) {
  const geo = new THREE.IcosahedronGeometry(0.34, 0);
  const count = 64;
  const mesh = new THREE.InstancedMesh(geo, stoneMat, count);
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const rng = rand(7);
  let placed = 0;
  let guard = 0;
  while (placed < count && guard < 400) {
    guard += 1;
    const ang = rng() * Math.PI * 2;
    const radius = 4.35 + rng() * 5.4;
    const x = Math.cos(ang) * radius;
    const z = Math.sin(ang) * radius * 0.96 + 0.2;
    const onBridge = Math.abs(x) < 1.7 && z < -4.2 && z > -9.4;
    const nearHerb = herbs.some((h) => Math.hypot(h.x - x, h.z - z) < 0.85);
    const nearSpawn = Math.hypot(x - 0.2, z - 8.15) < 1.3;
    if (onBridge || nearHerb || nearSpawn) continue;
    const s = 0.35 + rng() * 0.85;
    dummy.position.set(x, -0.05 + rng() * 0.08, z);
    dummy.rotation.set(rng(), rng(), rng());
    dummy.scale.set(s * (0.8 + rng()), s * (0.45 + rng() * 0.5), s * (0.8 + rng()));
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    placed += 1;
  }
  mesh.count = placed;
  scene.add(mesh);
}

function buildRidges(THREE, scene) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x7d909e,
    roughness: 1,
    flatShading: true,
    transparent: true,
    opacity: 0.72,
  });
  const positions = [];
  const indices = [];
  const segs = 28;
  const radius = 26;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const h0 = 1.1 + Math.pow(valueNoise(Math.cos(a0) * 3, Math.sin(a0) * 3), 1.4) * 3.2;
    const h1 = 1.1 + Math.pow(valueNoise(Math.cos(a1) * 3, Math.sin(a1) * 3), 1.4) * 3.2;
    const b = positions.length / 3;
    positions.push(
      Math.cos(a0) * (radius - 3), 0.2, Math.sin(a0) * (radius - 3),
      Math.cos(a0) * radius, h0, Math.sin(a0) * radius,
      Math.cos(a1) * radius, h1, Math.sin(a1) * radius,
      Math.cos(a1) * (radius - 3), 0.2, Math.sin(a1) * (radius - 3)
    );
    indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
}

function buildRain(THREE) {
  const n = 460;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - 0.5) * 18;
    const z = (Math.random() - 0.5) * 18;
    const y = Math.random() * 12;
    pos[i * 6] = x;
    pos[i * 6 + 1] = y;
    pos[i * 6 + 2] = z;
    pos[i * 6 + 3] = x + 0.07;
    pos[i * 6 + 4] = y - 0.55;
    pos[i * 6 + 5] = z + 0.03;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color: 0xd7e4ee, transparent: true, opacity: 0.38 })
  );
  rain.frustumCulled = false;
  rain.userData.count = n;
  rain.userData.pos = pos;
  return rain;
}

export function createScene(THREE, renderer, scene, herbSpecs) {
  scene.fog = new THREE.FogExp2(MIST, 0.03);
  scene.background = new THREE.Color(MIST);
  scene.add(makeSky(THREE));
  scene.environment = mistEnvironment(THREE, renderer);
  scene.environmentIntensity = 0.7;

  const lights = addLights(THREE, scene, {
    sky: 0xd5e2ea,
    ground: 0x3a4038,
    sun: 0xf4f0e8,
    sunIntensity: 1.15,
    ambient: MIST,
    ambientIntensity: 0.22,
    rim: 0xb7c8d4,
    rimIntensity: 0.55,
    sx: -7,
    sy: 16,
    sz: 11,
    shadow: 22,
  });
  scene.add(lights.sun.target);
  lights.sun.shadow.mapSize.set(2048, 2048);
  lights.sun.shadow.bias = -0.0003;
  lights.sun.shadow.normalBias = 0.04;

  const shoreTex = paintTexture(THREE, renderer, 256, (x, y) => {
    const n = valueNoise(x / 28, y / 28);
    const m = valueNoise(x / 7, y / 9);
    const wet = valueNoise(x / 40 + 4, y / 40);
    const g = 78 + n * 28 + m * 14 - wet * 10;
    return [g + 6, g + 8, g + 4];
  }, 8);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(64, 64, 1, 1),
    new THREE.MeshStandardMaterial({ map: shoreTex, roughness: 0.94, envMapIntensity: 0.25 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x6d7882,
    roughness: 0.48,
    metalness: 0.04,
    flatShading: true,
    envMapIntensity: 0.7,
  });
  const darkStone = new THREE.MeshStandardMaterial({
    color: 0x4c565f,
    roughness: 0.55,
    metalness: 0.05,
    flatShading: true,
    envMapIntensity: 0.6,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: TOWER,
    roughness: 0.78,
    flatShading: true,
    envMapIntensity: 0.35,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x3c322c,
    roughness: 0.62,
    flatShading: true,
    envMapIntensity: 0.4,
  });

  const waterMat = waterMaterial(THREE);
  const lake = new THREE.Mesh(new THREE.CircleGeometry(4.62, 64), waterMat);
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(0, 0.045, 0.5);
  scene.add(lake);

  const bridgeMatte = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 14),
    matteMaterial(THREE, "./assets/bg-broken-bridge.png", 0.42)
  );
  bridgeMatte.position.set(0.4, 7.4, -19);
  scene.add(bridgeMatte);
  const towerMatte = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 10.5),
    matteMaterial(THREE, "./assets/bg-lei-feng-tower.png", 0.34)
  );
  towerMatte.position.set(12.2, 4.6, -7.4);
  scene.add(towerMatte);

  buildRidges(THREE, scene);
  buildRocks(THREE, scene, darkStone, herbSpecs);
  const leafMat = foliageMaterial(THREE);
  buildWillows(THREE, scene, leafMat);
  scene.add(buildBridge(THREE, stoneMat, darkStone, glowTexture(THREE)));
  scene.add(buildTower(THREE, wallMat, roofMat, stoneMat));

  const rng = rand(3);
  for (let i = 0; i < 7; i++) {
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(0.22 + rng() * 0.12, 7),
      new THREE.MeshStandardMaterial({ color: 0x2f5a52, roughness: 0.7, flatShading: true })
    );
    pad.rotation.x = -Math.PI / 2;
    const a = rng() * Math.PI * 2;
    const r = 0.8 + rng() * 2.6;
    pad.position.set(Math.cos(a) * r, 0.06, 0.5 + Math.sin(a) * r);
    scene.add(pad);
  }

  const hero = buildHero(THREE);
  const monk = buildMonk(THREE);
  scene.add(hero, monk);
  const herbs = herbSpecs.map((spec) => {
    const mesh = buildHerb(THREE);
    mesh.position.set(spec.x, 0.02, spec.z);
    scene.add(mesh);
    return mesh;
  });
  const marker = makeMarker(THREE, 0xf0e2b0);
  scene.add(marker);

  const rain = buildRain(THREE);
  scene.add(rain);
  const mistGeo = new THREE.BufferGeometry();
  const mistCount = 36;
  const mistPos = new Float32Array(mistCount * 3);
  for (let i = 0; i < mistCount; i++) {
    mistPos[i * 3] = (Math.random() - 0.5) * 18;
    mistPos[i * 3 + 1] = 0.4 + Math.random() * 2.4;
    mistPos[i * 3 + 2] = (Math.random() - 0.5) * 18;
  }
  mistGeo.setAttribute("position", new THREE.BufferAttribute(mistPos, 3));
  const mist = new THREE.Points(
    mistGeo,
    new THREE.PointsMaterial({
      color: 0xd5e2ea,
      size: 0.18,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
  );
  scene.add(mist);

  return {
    hero,
    monk,
    marker,
    herbs,
    sun: lights.sun,
    update(t, dt, focus) {
      waterMat.uniforms.uTime.value = t;
      leafMat.uniforms.uTime.value = t;
      const pos = rain.geometry.attributes.position.array;
      const n = rain.userData.count;
      for (let i = 0; i < n; i++) {
        pos[i * 6 + 1] -= dt * 11;
        pos[i * 6 + 4] -= dt * 11;
        if (pos[i * 6 + 1] < 0) {
          const x = focus.x + (Math.random() - 0.5) * 16;
          const z = focus.z + (Math.random() - 0.5) * 16;
          const y = 8 + Math.random() * 6;
          pos[i * 6] = x;
          pos[i * 6 + 1] = y;
          pos[i * 6 + 2] = z;
          pos[i * 6 + 3] = x + 0.07;
          pos[i * 6 + 4] = y - 0.55;
          pos[i * 6 + 5] = z + 0.03;
        }
      }
      rain.geometry.attributes.position.needsUpdate = true;
      mist.position.y = Math.sin(t * 0.25) * 0.08;
    },
  };
}
