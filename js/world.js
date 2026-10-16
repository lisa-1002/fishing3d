// 场景环境：天空、太阳、PBR 环境光、水面、地形、树木、芦苇、码头、云
import * as THREE from 'three';
import { Water } from '../vendor/addons/Water.js';
import { Sky } from '../vendor/addons/Sky.js';
import { mergeGeometries } from '../vendor/addons/BufferGeometryUtils.js';
import { fbm, vnoise, smooth, rand } from './util.js';

export const LAKE_CENTER = new THREE.Vector2(0, -320);
export const DECK_Y = 0.9;
export const DOCK_END_Z = -6;
const SHORE_R = 335;

// 地形高度函数（湖心在 LAKE_CENTER，码头位于南岸）
export function heightAt(x, z) {
  const dx = x - LAKE_CENTER.x, dz = z - LAKE_CENTER.y;
  const d = Math.hypot(dx, dz);
  const ang = Math.atan2(dz, dx);
  let da = Math.abs(ang - Math.PI / 2); if (da > Math.PI) da = 2 * Math.PI - da;
  const irregular = (fbm(Math.cos(ang) * 2 + 7, Math.sin(ang) * 2 + 3, 4) - 0.5) * 160 * smooth(0.12, 0.7, da);
  const e = d - (SHORE_R + irregular);           // >0 为陆地
  let h = -5 + 5.8 * smooth(-60, 25, e);
  const n = fbm(x * 0.004 + 10, z * 0.004 + 3, 5);
  h += smooth(10, 260, e) * (8 + 75 * n * n * 1.6);
  const m = fbm(x * 0.0016 + 50, z * 0.0016 + 80, 5);
  h += smooth(650, 1300, d) * (50 + 330 * m * m * 1.4);
  h += (fbm(x * 0.05, z * 0.05, 3) - 0.5) * 1.4 * smooth(-5, 30, e);
  return h;
}

function makeWoodTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#7a5a3c'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 260; i++) {
    const x0 = Math.random() * 256, amp = rand(2, 9), f = rand(0.004, 0.02), ph = Math.random() * 6;
    g.strokeStyle = `rgba(${40 + Math.random() * 40|0},${25 + Math.random() * 25|0},${10 + Math.random() * 15|0},${rand(0.08, 0.35)})`;
    g.lineWidth = rand(0.5, 2.2);
    g.beginPath();
    for (let y = 0; y <= 512; y += 8) { const x = x0 + Math.sin(y * f + ph) * amp; y === 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 6; i++) { // 木结
    const x = Math.random() * 256, y = Math.random() * 512, r = rand(3, 9);
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.5);
    gr.addColorStop(0, 'rgba(40,22,10,0.8)'); gr.addColorStop(1, 'rgba(40,22,10,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 1.4, r * 2.5, 0, 0, 7); g.fill();
  }
  const img = g.getImageData(0, 0, 256, 512);  // 风化颗粒
  for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 22; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

function makeCloudTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  for (let i = 0; i < 70; i++) {
    const x = 256 + (Math.random() - 0.5) * 340, y = 140 + (Math.random() - 0.5) * 70 - Math.abs(x - 256) * -0.05;
    const r = rand(25, 70) * (1 - Math.abs(x - 256) / 400);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createWorld(scene, renderer, Q) {
  const world = {};
  // ---------- 天空 & 太阳 ----------
  const sky = new Sky();
  sky.scale.setScalar(10000);
  const su = sky.material.uniforms;
  su.turbidity.value = 2.8; su.rayleigh.value = 2.2; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.82;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 13.5), THREE.MathUtils.degToRad(160));
  su.sunPosition.value.copy(sunDir);
  world.sunDir = sunDir;

  // PMREM 环境光照（基于天空生成）
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(sky);
  const envRT = pmrem.fromScene(envScene);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.75;
  scene.add(sky);
  pmrem.dispose();

  const hazeColor = new THREE.Color(0xaab8c4);
  scene.fog = new THREE.Fog(hazeColor, 200, 2800);

  const sun = new THREE.DirectionalLight(0xffdcb0, 2.6);
  sun.position.copy(sunDir).multiplyScalar(80).add(new THREE.Vector3(0, 0, 10));
  sun.target.position.set(0, 0, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(Q.shadow, Q.shadow);
  const sc = sun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 200;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x4a4030, 0.35));

  // ---------- 水面 ----------
  const normals = new THREE.TextureLoader().load('textures/waternormals.jpg', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
  normals.wrapS = normals.wrapT = THREE.RepeatWrapping;
  const water = new Water(new THREE.PlaneGeometry(5000, 5000), {
    textureWidth: Q.waterRes, textureHeight: Q.waterRes,
    waterNormals: normals, sunDirection: sunDir.clone(), sunColor: 0xfff1d6,
    waterColor: 0x0e2a28, distortionScale: 2.2, fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(LAKE_CENTER.x, 0, LAKE_CENTER.y);
  water.material.uniforms.size.value = 2.2;
  scene.add(water);
  world.water = water;

  // ---------- 地形 ----------
  const seg = Q.terrainSeg;
  const tg = new THREE.PlaneGeometry(4600, 4600, seg, seg);
  tg.rotateX(-Math.PI / 2);
  tg.translate(LAKE_CENTER.x, 0, LAKE_CENTER.y);
  const pos = tg.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  tg.computeVertexNormals();
  const nrm = tg.attributes.normal;
  const cols = new Float32Array(pos.count * 3);
  const C = {
    mud: new THREE.Color(0x3b3426), sand: new THREE.Color(0xa8946c), grass: new THREE.Color(0x4b5a2a),
    grass2: new THREE.Color(0x6f6a34), forest: new THREE.Color(0x2e3a1f), rock: new THREE.Color(0x6b665e), rock2: new THREE.Color(0x8d8578),
  };
  const col = new THREE.Color(), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ny = nrm.getY(i);
    const n1 = fbm(x * 0.02, z * 0.02, 3), n2 = vnoise(x * 0.2, z * 0.2);
    col.copy(C.mud);
    col.lerp(C.sand, smooth(-0.6, 0.4, y));
    tmp.copy(C.grass).lerp(C.grass2, smooth(0.35, 0.7, n1)).lerp(C.forest, smooth(0.5, 0.8, fbm(x * 0.006 + 3, z * 0.006, 3)));
    col.lerp(tmp, smooth(1.0, 2.6, y + n2 * 0.8));
    tmp.copy(C.rock).lerp(C.rock2, n1);
    col.lerp(tmp, Math.max(smooth(0.86, 0.72, ny), smooth(140, 260, y)));
    col.multiplyScalar(0.85 + n2 * 0.3);
    cols[i * 3] = col.r; cols[i * 3 + 1] = col.g; cols[i * 3 + 2] = col.b;
  }
  tg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ---------- 树木（针叶 + 秋色阔叶） ----------
  {
    const cones = [];
    for (let k = 0; k < 5; k++) {
      const r = 1.9 - k * 0.33, h = 2.6 - k * 0.2;
      const c = new THREE.ConeGeometry(r, h, 9, 2); c.translate(0, 2.2 + k * 1.35, 0);
      const p = c.attributes.position;
      for (let i = 0; i < p.count; i++) { p.setX(i, p.getX(i) * rand(0.85, 1.15)); p.setZ(i, p.getZ(i) * rand(0.85, 1.15)); }
      cones.push(c.toNonIndexed());
    }
    const pineGeo = mergeGeometries(cones); pineGeo.computeVertexNormals();
    const blobs = [];
    for (let k = 0; k < 4; k++) {
      const b = new THREE.IcosahedronGeometry(rand(1.4, 2.0), 1);
      const p = b.attributes.position;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * rand(0.85, 1.12), p.getY(i) * rand(0.8, 1.1), p.getZ(i) * rand(0.85, 1.12));
      b.translate(rand(-1, 1), 4 + rand(0, 1.8) + k * 0.4, rand(-1, 1));
      blobs.push(b.index ? b.toNonIndexed() : b);
    }
    const leafGeo = mergeGeometries(blobs); leafGeo.computeVertexNormals();
    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.3, 4, 6); trunkGeo.translate(0, 2, 0);
    const N = Q.trees;
    const leafMat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: false });
    const pines = new THREE.InstancedMesh(pineGeo, leafMat, N);
    const leafs = new THREE.InstancedMesh(leafGeo, leafMat, Math.floor(N * 0.45));
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x3d2c1e, roughness: 1 }), N + leafs.count);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const pineCols = [0x23361d, 0x2b3f22, 0x1f3020, 0x34472a], leafCols = [0x6e5a26, 0x7d6229, 0x55642a, 0x7a4a24, 0x4c5a26];
    let np = 0, nl = 0, nt = 0, tries = 0;
    while ((np < pines.count || nl < leafs.count) && tries++ < 60000) {
      const a = Math.random() * Math.PI * 2, d = 345 + Math.pow(Math.random(), 1.4) * 900;
      const x = LAKE_CENTER.x + Math.cos(a) * d, z = LAKE_CENTER.y + Math.sin(a) * d;
      if (Math.abs(x) < 14 && z > -12 && z < 70) continue;
      if (Math.hypot(x, z - 5) < 18) continue;
      const y = heightAt(x, z);
      if (y < 1.4 || y > 170) continue;
      if (fbm(x * 0.012 + 9, z * 0.012, 3) < 0.45) continue;
      const sc2 = rand(0.9, 1.9) * (d > 700 ? 1.6 : 1);
      p.set(x, y - 0.3, z); q.setFromAxisAngle(up, Math.random() * 6.28); s.set(sc2, sc2 * rand(0.9, 1.25), sc2);
      m.compose(p, q, s);
      const usePine = Math.random() < 0.6 ? np < pines.count : nl >= leafs.count;
      if (usePine && np < pines.count) { pines.setMatrixAt(np, m); pines.setColorAt(np++, new THREE.Color(pineCols[(Math.random() * 4) | 0])); }
      else if (nl < leafs.count) { leafs.setMatrixAt(nl, m); leafs.setColorAt(nl++, new THREE.Color(leafCols[(Math.random() * 5) | 0])); }
      else continue;
      trunks.setMatrixAt(nt++, m);
    }
    pines.count = np; leafs.count = nl; trunks.count = nt;
    [pines, leafs, trunks].forEach(o => { o.instanceMatrix.needsUpdate = true; if (o.instanceColor) o.instanceColor.needsUpdate = true; o.frustumCulled = false; scene.add(o); });
  }

  // ---------- 芦苇（码头附近浅滩） ----------
  {
    const blade = new THREE.ConeGeometry(0.025, 1.9, 3, 1); blade.translate(0, 0.95, 0);
    const reeds = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: 0x8a8448, roughness: 0.85 }), Q.reeds);
    const m = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    let n = 0, tries = 0;
    while (n < reeds.count && tries++ < 40000) {
      const cx = rand(-160, 160), cz = rand(-40, 40);
      if (Math.abs(cx) < 6) continue;
      const y = heightAt(cx, cz);
      if (y < -0.9 || y > 0.9) continue;
      const k = (8 + Math.random() * 20) | 0;
      for (let j = 0; j < k && n < reeds.count; j++) {
        const x = cx + rand(-1.5, 1.5), z = cz + rand(-1.5, 1.5);
        e.set(rand(-0.25, 0.25), 0, rand(-0.25, 0.25)); q.setFromEuler(e);
        const h = rand(0.6, 1.4); s.set(1, h, 1); p.set(x, heightAt(x, z) - 0.1, z);
        m.compose(p, q, s); reeds.setMatrixAt(n, m);
        reeds.setColorAt(n++, new THREE.Color().setHSL(0.15 + rand(-0.03, 0.03), 0.35, rand(0.25, 0.45)));
      }
    }
    reeds.count = n; reeds.instanceMatrix.needsUpdate = true; reeds.instanceColor.needsUpdate = true;
    scene.add(reeds);
  }

  // ---------- 木码头 ----------
  {
    const wood = makeWoodTexture();
    const plankMat = new THREE.MeshStandardMaterial({ map: wood, bumpMap: wood, bumpScale: 1.2, roughness: 0.88, metalness: 0 });
    const beamMat = new THREE.MeshStandardMaterial({ map: wood, color: 0x9a8a7a, roughness: 0.92 });
    const postMat = new THREE.MeshStandardMaterial({ map: wood, color: 0x6a5a4e, roughness: 0.95 });
    const dock = new THREE.Group();
    const startZ = 32, endZ = DOCK_END_Z, W = 2.6;
    const plankGeo = new THREE.BoxGeometry(W, 0.06, 0.2);
    const uv = plankGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * 0.4, uv.getX(i) * 2.5);
    const nPl = Math.floor((startZ - endZ) / 0.215);
    const planks = new THREE.InstancedMesh(plankGeo, plankMat, nPl);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    for (let i = 0; i < nPl; i++) {
      e.set(rand(-0.01, 0.01), rand(-0.012, 0.012), rand(-0.012, 0.012)); q.setFromEuler(e);
      p.set(rand(-0.03, 0.03), DECK_Y - 0.03 + rand(-0.008, 0.008), endZ + 0.1 + i * 0.215);
      s.set(rand(0.97, 1.02), 1, 1); m.compose(p, q, s); planks.setMatrixAt(i, m);
      const g = rand(0.72, 1.08); planks.setColorAt(i, new THREE.Color(g, g * rand(0.95, 1.0), g * rand(0.88, 0.98)));
    }
    planks.castShadow = planks.receiveShadow = true; dock.add(planks);
    for (const x of [-0.9, 0, 0.9]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, startZ - endZ), beamMat);
      b.position.set(x, DECK_Y - 0.16, (startZ + endZ) / 2); b.castShadow = b.receiveShadow = true; dock.add(b);
    }
    const postGeo = new THREE.CylinderGeometry(0.11, 0.13, 1, 10);
    for (let z = endZ + 0.15; z < startZ; z += 2.6) {
      for (const x of [-W / 2 + 0.05, W / 2 - 0.05]) {
        const ground = heightAt(x, z) - 0.6, top = DECK_Y + (z < endZ + 1 ? 0.22 : 0.02);
        const post = new THREE.Mesh(postGeo, postMat);
        post.scale.y = top - ground; post.position.set(x, (top + ground) / 2, z);
        post.rotation.y = Math.random() * 6; post.castShadow = post.receiveShadow = true; dock.add(post);
      }
      const cross = new THREE.Mesh(new THREE.BoxGeometry(W, 0.16, 0.12), beamMat);
      cross.position.set(0, DECK_Y - 0.3, z); dock.add(cross);
    }
    // 码头末端：缆桩、小木桶
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.38, 20, 1, true),
      new THREE.MeshStandardMaterial({ map: wood, color: 0x8a7a66, roughness: 0.9, side: THREE.DoubleSide }));
    bucket.position.set(0.85, DECK_Y + 0.19, endZ + 2.6); bucket.castShadow = true; dock.add(bucket);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 6, 24), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.4 }));
    band.rotation.x = Math.PI / 2; band.position.copy(bucket.position).add(new THREE.Vector3(0, 0.1, 0)); dock.add(band);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.3), new THREE.MeshStandardMaterial({ color: 0x2f5a3a, roughness: 0.5, metalness: 0.1 }));
    box.position.set(-0.85, DECK_Y + 0.13, endZ + 3.4); box.rotation.y = 0.3; box.castShadow = true; dock.add(box);
    scene.add(dock);
  }

  // ---------- 小船（远处停泊） ----------
  {
    const shape = new THREE.Shape();
    shape.moveTo(-2.2, 0); shape.quadraticCurveTo(-2.2, -0.9, 0, -0.95); shape.quadraticCurveTo(2.2, -0.9, 2.4, 0); shape.lineTo(-2.2, 0);
    const hullGeo = new THREE.ExtrudeGeometry(shape, { depth: 1.3, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.2, bevelSegments: 3, curveSegments: 16 });
    hullGeo.translate(0, 0, -0.65);
    const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ color: 0x7c3a28, roughness: 0.7 }));
    hull.scale.set(1, 0.6, 1); hull.position.y = 0.25;
    const boat = new THREE.Group(); boat.add(hull);
    boat.position.set(-38, 0.15, -70); boat.rotation.y = 0.7;
    scene.add(boat); world.boat = boat;
  }

  // ---------- 云 ----------
  {
    const tex = makeCloudTexture();
    for (let i = 0; i < 9; i++) {
      const mat = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color().setHSL(0.08, 0.3, rand(0.9, 1.0)), transparent: true, opacity: rand(0.25, 0.5), fog: false, depthWrite: false });
      const sp = new THREE.Sprite(mat);
      const a = Math.PI + rand(-1.6, 1.6), d = rand(3000, 6500);
      sp.position.set(Math.sin(a) * d, rand(900, 1800), Math.cos(a) * d);
      const w = rand(1800, 3800); sp.scale.set(w, w * 0.35, 1);
      scene.add(sp);
    }
  }

  world.update = (dt, t) => {
    water.material.uniforms.time.value += dt * 0.55;
    if (world.boat) { world.boat.rotation.z = Math.sin(t * 0.8) * 0.03; world.boat.position.y = 0.12 + Math.sin(t * 1.1) * 0.04; }
  };
  return world;
}
