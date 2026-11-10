/**
 * Original dusk glade for 林间试炼.
 * Geometry is procedural. bg-forest-dusk.png is painted into the sky only.
 * Apple colors follow ref-apple-pair-hero.png: sweet #CC3730, poison #6B1434.
 */

const SWEET = 0xcc3730;
const POISON = 0x6b1434;

function rand(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function valueNoise(x, y) {
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

function smooth(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1)));
  return t * t * (3 - 2 * t);
}

function canvasTexture(THREE, canvas, { color = true, repeat = 1 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 4;
  if (repeat !== 1) tex.repeat.set(repeat, repeat);
  return tex;
}

function paintSky(canvas, image) {
  const g = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#161d2b");
  sky.addColorStop(0.38, "#3c4656");
  sky.addColorStop(0.62, "#6d6a70");
  sky.addColorStop(1, "#4e5144");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  if (image && image.width) {
    g.save();
    g.globalAlpha = 0.9;
    g.drawImage(image, 0, 0, image.width, image.height * 0.42, 0, 0, w, h * 0.58);
    g.restore();
    const fade = g.createLinearGradient(0, h * 0.28, 0, h * 0.7);
    fade.addColorStop(0, "rgba(60,70,86,0)");
    fade.addColorStop(0.45, "rgba(78,80,88,0.2)");
    fade.addColorStop(1, "rgba(92,90,84,0.96)");
    g.fillStyle = fade;
    g.fillRect(0, h * 0.22, w, h * 0.55);
  }
  const glow = g.createRadialGradient(w * 0.72, h * 0.46, 8, w * 0.72, h * 0.46, w * 0.22);
  glow.addColorStop(0, "rgba(255,206,156,0.42)");
  glow.addColorStop(1, "rgba(255,206,156,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);
}

function makeSky(THREE, scene) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  paintSky(canvas, null);
  const tex = canvasTexture(THREE, canvas, { repeat: 1 });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  const geo = new THREE.SphereGeometry(72, 32, 20);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false, fog: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const loader = new THREE.TextureLoader();
  loader.load("./assets/bg-forest-dusk.png", (loaded) => {
    paintSky(canvas, loaded.image);
    tex.needsUpdate = true;
    loaded.dispose();
  });
  return mesh;
}

function makeEnv(THREE, renderer, scene) {
  const envScene = new THREE.Scene();
  const top = new THREE.Color(0x1a2230);
  const mid = new THREE.Color(0x6a625f);
  const ground = new THREE.Color(0x2a3324);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: top },
      mid: { value: mid },
      ground: { value: ground },
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
      uniform vec3 ground;
      void main() {
        float h = normalize(vP).y;
        vec3 c = mix(ground, mid, smoothstep(-0.2, 0.15, h));
        c = mix(c, top, smoothstep(0.15, 0.75, h));
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(12, 16, 10), mat));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(envScene, 0.04);
  scene.environment = target.texture;
  scene.environmentIntensity = 0.62;
  pmrem.dispose();
}

function addLights(THREE, scene) {
  const hemi = new THREE.HemisphereLight(0xc9d2de, 0x3a4632, 0.78);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.85);
  sun.position.set(7.5, 16.5, 9.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 2.4;
  const cam = sun.shadow.camera;
  cam.near = 2;
  cam.far = 48;
  cam.left = -14;
  cam.right = 14;
  cam.top = 14;
  cam.bottom = -14;
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0x8ea0c4, 0.42);
  fill.position.set(-8, 6, -4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffc39a, 0.28);
  rim.position.set(-3, 4, 12);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0x243040, 0.16));
  return sun;
}

function paintDetail(size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = valueNoise(x / 14, y / 14);
      const f = valueNoise(x / 3.5, y / 3.5);
      const pebble = valueNoise(x / 1.4 + 4, y / 1.4) > 0.82 ? 0.18 : 0;
      const v = Math.max(0, Math.min(255, 168 + n * 50 + f * 28 - pebble * 80));
      const i = (y * size + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return canvas;
}

function pathMask(x, z) {
  const radial = Math.hypot(x, z);
  const ring = 1 - smooth(0.15, 0.72, Math.abs(radial - 2.82));
  const spur = (1 - smooth(0.15, 0.78, Math.abs(x))) * smooth(1.7, 2.5, z) * (1 - smooth(5.7, 6.3, z));
  const n = valueNoise(x * 1.7, z * 1.7);
  return Math.max(ring, spur) * (0.88 + n * 0.12);
}

function makeGround(THREE, scene) {
  const detail = canvasTexture(THREE, paintDetail(256), { color: false, repeat: 10 });
  const seg = 72;
  const geo = new THREE.PlaneGeometry(34, 34, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const grassA = new THREE.Color(0x3e5a34);
  const grassB = new THREE.Color(0x5d7340);
  const moss = new THREE.Color(0x2c402c);
  const dirt = new THREE.Color(0xa78458);
  const dirtB = new THREE.Color(0x8a6844);
  const col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n = valueNoise(x * 0.35, z * 0.35);
    const f = valueNoise(x * 1.4 + 2, z * 1.4);
    const mask = pathMask(x, z);
    const edge = Math.hypot(x, z);
    col.copy(grassA).lerp(grassB, n).lerp(moss, smooth(0.55, 0.9, f) * 0.45);
    col.lerp(dirt.clone().lerp(dirtB, f), mask);
    col.multiplyScalar(0.78 + n * 0.28);
    if (edge > 11) col.multiplyScalar(0.72);
    const lift = (n - 0.5) * 0.07 * (1 - mask) + (f - 0.5) * 0.02;
    pos.setY(i, lift);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      map: detail,
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.94,
      metalness: 0,
      bumpMap: detail,
      bumpScale: 0.12,
    })
  );
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function makePathStones(THREE, scene) {
  const rnd = rand(11);
  const geo = new THREE.IcosahedronGeometry(0.09, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x6d675f, roughness: 0.9, flatShading: true });
  const count = 70;
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  let n = 0;
  while (n < count) {
    const along = rnd();
    const ring = along < 0.72;
    let x;
    let z;
    if (ring) {
      const a = rnd() * Math.PI * 2;
      const r = 2.15 + rnd() * 1.35;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
    } else {
      x = (rnd() - 0.5) * 1.35;
      z = 2.2 + rnd() * 3.3;
    }
    dummy.position.set(x, 0.02, z);
    dummy.rotation.set(rnd(), rnd(), rnd());
    const s = 0.45 + rnd() * 0.9;
    dummy.scale.set(s, s * (0.45 + rnd() * 0.4), s);
    dummy.updateMatrix();
    mesh.setMatrixAt(n, dummy.matrix);
    n += 1;
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function makePine(THREE, bark, leaf, leafDeep, scale, lean) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * scale, 0.18 * scale, 1.25 * scale, 6), bark);
  trunk.position.y = 0.62 * scale;
  trunk.castShadow = true;
  g.add(trunk);
  for (let i = 0; i < 5; i++) {
    const h = (1.05 - i * 0.08) * scale;
    const radius = (0.92 - i * 0.14) * scale;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, h, 7), i % 2 ? leafDeep : leaf);
    cone.position.y = (1.05 + i * 0.52) * scale;
    cone.rotation.y = i * 0.9;
    cone.castShadow = true;
    cone.receiveShadow = true;
    g.add(cone);
  }
  const side = new THREE.Mesh(new THREE.ConeGeometry(0.28 * scale, 0.7 * scale, 6), leaf);
  side.position.set(0.22 * scale, 1.55 * scale, 0.08 * scale);
  side.rotation.z = -0.35;
  side.castShadow = true;
  g.add(side);
  g.rotation.z = lean;
  return g;
}

function makeForest(THREE, scene) {
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a4032, roughness: 0.92, flatShading: true });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3f6a40, roughness: 0.86, flatShading: true });
  const leafDeep = new THREE.MeshStandardMaterial({ color: 0x2c4e38, roughness: 0.9, flatShading: true });
  const farLeaf = new THREE.MeshStandardMaterial({ color: 0x4d625c, roughness: 1, flatShading: true });
  const farBark = new THREE.MeshStandardMaterial({ color: 0x4a403c, roughness: 1, flatShading: true });
  const rnd = rand(29);
  const group = new THREE.Group();
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2 + (rnd() - 0.5) * 0.08;
    const r = 8.15 + rnd() * 1.15;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (z > 6.4 && Math.abs(x) < 2.4) continue;
    const tree = makePine(THREE, bark, leaf, leafDeep, 0.95 + rnd() * 0.5, (rnd() - 0.5) * 0.08);
    tree.position.set(x, 0, z);
    tree.rotation.y = rnd() * Math.PI * 2;
    group.add(tree);
  }
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + 0.2;
    const r = 16.2 + (i % 3) * 0.85;
    const tree = makePine(THREE, farBark, farLeaf, farLeaf, 1.45 + (i % 4) * 0.2, 0);
    tree.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    tree.traverse((obj) => {
      if (obj.isMesh) obj.castShadow = false;
    });
    group.add(tree);
  }
  scene.add(group);
}

function makeRocks(THREE, scene) {
  const rnd = rand(7);
  const mat = new THREE.MeshStandardMaterial({ color: 0x5e635f, roughness: 0.94, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3e4448, roughness: 0.96, flatShading: true });
  const spots = [
    [2.1, 4.6], [-2.4, 4.4], [4.6, 2.2], [-5.1, 1.4], [5.4, -1.2],
    [-5.6, -2.2], [3.2, -5.2], [-1.6, -5.6], [6.2, 4.2], [-6.4, 3.6],
  ];
  for (const [x, z] of spots) {
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + rnd() * 0.22, 0), rnd() > 0.5 ? mat : dark);
    rock.position.set(x + (rnd() - 0.5) * 0.2, 0.08, z);
    rock.rotation.set(rnd(), rnd() * 3, rnd());
    rock.scale.set(1, 0.55 + rnd() * 0.25, 1);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }
}

function makeGrass(THREE, scene) {
  const rnd = rand(41);
  const geo = new THREE.ConeGeometry(0.045, 0.26, 3);
  geo.translate(0, 0.13, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true, vertexColors: false });
  const count = 420;
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let n = 0;
  let guard = 0;
  while (n < count && guard < 4000) {
    guard += 1;
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * 7.6;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (pathMask(x, z) > 0.45) continue;
    if (Math.hypot(x + 4.2, z + 3.15) < 1.7) continue;
    dummy.position.set(x, 0, z);
    dummy.rotation.y = rnd() * Math.PI;
    const s = 0.7 + rnd() * 0.8;
    dummy.scale.set(s, 0.75 + rnd() * 0.9, s);
    dummy.updateMatrix();
    mesh.setMatrixAt(n, dummy.matrix);
    color.setHSL(0.28 + rnd() * 0.06, 0.38, 0.28 + rnd() * 0.12);
    mesh.setColorAt(n, color);
    n += 1;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);
}

function makeFerns(THREE, scene) {
  const rnd = rand(53);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3f6a3c,
    roughness: 0.8,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  const geo = new THREE.PlaneGeometry(0.34, 0.16, 1, 1);
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 4.3 + rnd() * 2.6;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (pathMask(x, z) > 0.4) continue;
    const fan = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const leaf = new THREE.Mesh(geo, mat);
      leaf.position.y = 0.08;
      leaf.rotation.x = -1.15;
      leaf.rotation.y = k * 0.7;
      leaf.castShadow = true;
      fan.add(leaf);
    }
    fan.position.set(x, 0, z);
    fan.rotation.y = rnd() * 6;
    scene.add(fan);
  }
}

function makeShafts(THREE, scene) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    side: THREE.DoubleSide,
    uniforms: { uOpacity: { value: 0.07 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uOpacity;
      void main() {
        float across = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
        float along = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.2, vUv.y);
        gl_FragColor = vec4(1.0, 0.84, 0.62, across * along * uOpacity);
      }
    `,
  });
  const group = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.7 + (i % 3) * 0.35, 11), mat);
    plane.position.set(-2.4 + i * 1.15, 6.2, -1.2 + (i % 2) * 1.4);
    plane.rotation.z = -0.18 + i * 0.04;
    plane.rotation.x = 0.15;
    group.add(plane);
  }
  group.position.set(0.4, 0, 0.6);
  scene.add(group);
  return {
    update(t) {
      mat.uniforms.uOpacity.value = 0.055 + Math.sin(t * 0.35) * 0.012;
    },
  };
}

function makeMotes(THREE, scene) {
  const count = 46;
  const pos = new Float32Array(count * 3);
  const rnd = rand(17);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rnd() - 0.5) * 12;
    pos[i * 3 + 1] = 0.4 + rnd() * 3.2;
    pos[i * 3 + 2] = (rnd() - 0.5) * 12;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffe6bf,
    size: 0.045,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  scene.add(points);
  const base = pos.slice();
  return {
    update(t) {
      const arr = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        arr[i * 3] = base[i * 3] + Math.sin(t * 0.4 + i) * 0.12;
        arr[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.8 + i * 0.7) * 0.08;
        arr[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.35 + i) * 0.12;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

function makeCottage(THREE) {
  const g = new THREE.Group();
  const plaster = new THREE.MeshStandardMaterial({ color: 0xe4d5bc, roughness: 0.86 });
  const timber = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.82 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x6a675f, roughness: 0.95, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8e3a2e, roughness: 0.72, flatShading: true });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.7, 0.28, 8), stone);
  base.position.y = 0.12;
  base.receiveShadow = true;
  base.castShadow = true;
  g.add(base);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.35, 1.85), plaster);
  wall.position.y = 0.95;
  wall.castShadow = true;
  wall.receiveShadow = true;
  g.add(wall);
  const beams = [
    [2.22, 0.1, 0.12, 0, 1.55, 0.94],
    [0.1, 1.28, 0.12, -1.05, 0.95, 0.94],
    [0.1, 1.28, 0.12, 1.05, 0.95, 0.94],
    [0.12, 1.15, 0.1, -0.72, 1.05, 0.95],
    [0.12, 1.15, 0.1, 0.72, 1.05, 0.95],
  ];
  for (const [w, h, d, x, y, z] of beams) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), timber);
    beam.position.set(x, y, z);
    beam.castShadow = true;
    g.add(beam);
  }
  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.1), timber);
  brace.position.set(-0.62, 1.15, 0.95);
  brace.rotation.z = 0.75;
  g.add(brace);
  const brace2 = brace.clone();
  brace2.position.x = 0.62;
  brace2.rotation.z = -0.75;
  g.add(brace2);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.72, 1.55, 8), roofMat);
  roof.position.y = 2.25;
  roof.rotation.y = Math.PI / 8;
  roof.castShadow = true;
  g.add(roof);
  const eave = new THREE.Mesh(new THREE.ConeGeometry(1.82, 0.22, 8), roofMat);
  eave.position.y = 1.62;
  eave.rotation.y = Math.PI / 8;
  g.add(eave);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.78, 0.06), timber);
  door.position.set(0, 0.52, 0.96);
  g.add(door);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.36),
    new THREE.MeshPhysicalMaterial({
      color: 0xffd7a2,
      emissive: 0xffb15a,
      emissiveIntensity: 1.15,
      roughness: 0.18,
      metalness: 0,
      transmission: 0,
    })
  );
  glass.position.set(0.62, 1.12, 0.94);
  g.add(glass);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    new THREE.MeshBasicMaterial({
      color: 0xffb15a,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  glow.position.set(0.62, 1.12, 0.9);
  g.add(glow);
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.78 - i * 0.08, 0.1, 0.28), stone);
    step.position.set(0, 0.06 + i * 0.1, 1.22 + i * 0.18);
    step.castShadow = true;
    step.receiveShadow = true;
    g.add(step);
  }
  const lamp = new THREE.PointLight(0xffb15a, 2.4, 8.5, 2);
  lamp.position.set(0.55, 1.25, 1.35);
  g.add(lamp);
  const spill = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 18),
    new THREE.MeshBasicMaterial({
      color: 0xffb060,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(0.2, 0.04, 1.7);
  g.add(spill);
  return g;
}

function shapeApple(THREE) {
  const geo = new THREE.IcosahedronGeometry(0.28, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.hypot(x, y, z) || 1;
    const ny = y / len;
    const pinch = ny > 0.45 ? (ny - 0.45) * 0.55 : 0;
    const belly = 1 + Math.max(0, 0.12 - Math.abs(ny) * 0.12);
    pos.setXYZ(i, x * belly * (1 - pinch * 0.35), y * 0.9 - pinch * 0.05, z * belly * (1 - pinch * 0.35));
  }
  geo.computeVertexNormals();
  return geo;
}

function makeApple(THREE, kind) {
  const sweet = kind === "sweet";
  let color = SWEET;
  let emissive = 0x4a100c;
  let ringColor = 0xe07a4a;
  if (kind === "poison") {
    color = POISON;
    emissive = 0x2a0814;
    ringColor = 0x6b1434;
  } else if (kind !== "sweet") {
    const unexpected = kind;
    throw new Error("Unknown apple kind: " + unexpected);
  }
  const g = new THREE.Group();
  const fruit = new THREE.Mesh(
    shapeApple(THREE),
    new THREE.MeshPhysicalMaterial({
      color,
      emissive,
      emissiveIntensity: sweet ? 0.22 : 0.16,
      roughness: sweet ? 0.28 : 0.36,
      metalness: 0.02,
      clearcoat: sweet ? 0.85 : 0.55,
      clearcoatRoughness: 0.22,
      flatShading: true,
      sheen: 0.25,
      sheenColor: new THREE.Color(sweet ? 0xffb0a0 : 0xc48aa8),
      sheenRoughness: 0.6,
    })
  );
  fruit.position.y = 0.28;
  fruit.castShadow = true;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, 0.14, 5),
    new THREE.MeshStandardMaterial({ color: 0x6a4428, roughness: 0.7 })
  );
  stem.position.y = 0.5;
  stem.rotation.z = 0.15;
  const leafMat = new THREE.MeshStandardMaterial({
    color: sweet ? 0x7d9a3e : 0x6d8a44,
    roughness: 0.55,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4), leafMat);
  leaf.scale.set(1.35, 1, 0.28);
  leaf.position.set(0.09, 0.52, 0);
  leaf.rotation.z = -1.05;
  const cushion = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x2f4a30, roughness: 1 })
  );
  cushion.scale.set(1.3, 0.28, 1.3);
  cushion.position.y = 0.04;
  cushion.receiveShadow = true;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.36, 18),
    new THREE.MeshBasicMaterial({
      color: ringColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: sweet ? 0.55 : 0.42,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.025;
  g.add(cushion, fruit, stem, leaf, ring);
  g.userData.fruit = fruit;
  return g;
}

function makeMushroom(THREE, hue) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.1, 0.28, 7),
    new THREE.MeshStandardMaterial({ color: 0xf0e2d0, roughness: 0.72 })
  );
  stem.position.y = 0.14;
  stem.castShadow = true;
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, 0.42, 0.42),
      roughness: 0.62,
      flatShading: true,
    })
  );
  cap.position.y = 0.28;
  cap.castShadow = true;
  const spotMat = new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.5 });
  for (let i = 0; i < 3; i++) {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 4), spotMat);
    const a = i * 2.1;
    spot.position.set(Math.cos(a) * 0.08, 0.36, Math.sin(a) * 0.08);
    g.add(spot);
  }
  g.add(stem, cap);
  return g;
}

function makePrincess(THREE) {
  const g = new THREE.Group();
  const hips = new THREE.Group();
  g.add(hips);
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xf0c9b0, roughness: 0.55, sheen: 0.15, sheenColor: new THREE.Color(0xffe0d0), sheenRoughness: 0.7 });
  const cloth = new THREE.MeshPhysicalMaterial({
    color: 0xf6f1e8,
    roughness: 0.62,
    metalness: 0,
    sheen: 0.45,
    sheenColor: new THREE.Color(0xfff6ee),
    sheenRoughness: 0.45,
    clearcoat: 0.08,
    clearcoatRoughness: 0.6,
  });
  const hairM = new THREE.MeshStandardMaterial({ color: 0x1a120f, roughness: 0.72 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a211c, roughness: 0.8 });
  const skirtPts = [
    [0.02, 0.02],
    [0.5, 0.02],
    [0.46, 0.16],
    [0.36, 0.36],
    [0.26, 0.54],
    [0.18, 0.7],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const skirtGeo = new THREE.LatheGeometry(skirtPts, 18);
  const skirtPos = skirtGeo.attributes.position;
  for (let i = 0; i < skirtPos.count; i++) {
    const x = skirtPos.getX(i);
    const z = skirtPos.getZ(i);
    const ang = Math.atan2(z, x);
    const pleat = 1 + Math.cos(ang * 6) * 0.035;
    skirtPos.setX(i, x * pleat);
    skirtPos.setZ(i, z * pleat);
  }
  skirtGeo.computeVertexNormals();
  const skirt = new THREE.Mesh(skirtGeo, cloth);
  skirt.castShadow = true;
  skirt.receiveShadow = true;
  hips.add(skirt);
  const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.32, 12), cloth);
  bodice.position.y = 0.86;
  bodice.castShadow = true;
  hips.add(bodice);
  const sash = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.028, 6, 16),
    new THREE.MeshStandardMaterial({ color: 0x7ec8cf, roughness: 0.42, metalness: 0.05 })
  );
  sash.rotation.x = Math.PI / 2;
  sash.position.y = 0.74;
  hips.add(sash);
  const legGeo = new THREE.CapsuleGeometry(0.055, 0.22, 3, 6);
  const legL = new THREE.Mesh(legGeo, dark);
  legL.position.set(-0.1, 0.2, 0);
  const legR = legL.clone();
  legR.position.x = 0.1;
  hips.add(legL, legR);
  const armGeo = new THREE.CapsuleGeometry(0.045, 0.22, 2, 6);
  const armL = new THREE.Mesh(armGeo, cloth);
  armL.position.set(-0.26, 0.92, 0);
  const armR = armL.clone();
  armR.position.x = 0.26;
  hips.add(armL, armR);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 14), skin);
  head.position.y = 1.22;
  head.scale.set(1, 1.05, 1);
  head.castShadow = true;
  hips.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.175, 14, 12), hairM);
  hair.position.y = 1.28;
  hair.scale.set(1.02, 0.78, 1.05);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), hairM);
  bun.position.set(0, 1.46, -0.02);
  hips.add(hair, bun);
  const bowMat = new THREE.MeshStandardMaterial({ color: 0xc45c7a, roughness: 0.48 });
  const bow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.04), bowMat);
  bow.position.set(0, 1.46, 0.06);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), bowMat);
  knot.position.set(0, 1.46, 0.07);
  hips.add(bow, knot);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a120e });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), eyeMat);
  eye.position.set(-0.055, 1.23, 0.14);
  const eye2 = eye.clone();
  eye2.position.x = 0.055;
  hips.add(eye, eye2);
  g.userData.animate = (moving, t) => {
    const s = moving ? Math.sin(t * 9.2) : Math.sin(t * 1.8) * 0.18;
    legL.rotation.x = s * 0.75;
    legR.rotation.x = -s * 0.75;
    armL.rotation.x = -s * 0.5;
    armR.rotation.x = s * 0.5;
    hips.position.y = moving ? Math.abs(Math.sin(t * 9.2)) * 0.045 : Math.sin(t * 1.8) * 0.02;
    skirt.rotation.y = moving ? Math.sin(t * 9.2) * 0.04 : Math.sin(t * 1.4) * 0.02;
  };
  g.userData.cloth = cloth;
  g.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = true;
  });
  return g;
}

export function buildGlade(THREE, renderer, scene) {
  scene.fog = new THREE.Fog(0x6e7380, 12, 36);
  scene.background = new THREE.Color(0x3c4654);
  renderer.toneMappingExposure = 1.02;
  makeSky(THREE, scene);
  makeEnv(THREE, renderer, scene);
  addLights(THREE, scene);
  makeGround(THREE, scene);
  makePathStones(THREE, scene);
  makeForest(THREE, scene);
  makeRocks(THREE, scene);
  makeGrass(THREE, scene);
  makeFerns(THREE, scene);
  const shafts = makeShafts(THREE, scene);
  const motes = makeMotes(THREE, scene);
  const cottage = makeCottage(THREE);
  return {
    cottage,
    update(t) {
      shafts.update(t);
      motes.update(t);
    },
  };
}

export { makeApple, makeMushroom, makePrincess };
