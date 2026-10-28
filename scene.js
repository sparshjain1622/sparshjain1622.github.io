// One night, one trail: a camp, a lantern-lit trail through the pines, a lake with someone sitting by it,
// thoughts rising, a flock of hopes across the moon, and dawn. Scroll moves the camera along the story.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { createAvatar } from "./avatar.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// camera poses, in story order (main.js maps each to a scroll position)
export const POSES = [
  { name: "camp",     pos: V(-1.2, 1.9, 9.8),  look: V(0.6, 3.2, -20) },
  { name: "fire",     pos: V(0.2, 1.25, 6.6),  look: V(-0.9, 1.0, -3) },
  { name: "trail",    pos: V(3.2, 2.1, -3),    look: V(7, 1.0, -20) },
  { name: "forest",   pos: V(8.5, 2.3, -17),   look: V(12.5, 1.4, -32) },
  { name: "clearing", pos: V(13, 2.6, -30),    look: V(18, 1.2, -50) },
  { name: "lake",     pos: V(15.5, 3.0, -40),  look: V(15.8, 1.4, -62) },
  { name: "figure",   pos: V(16.6, 2.1, -46.2), look: V(17.4, 2.3, -52) },
  { name: "thoughts", pos: V(16.4, 2.3, -45.6), look: V(16.9, 8.5, -58) },
  { name: "sky",      pos: V(17, 2.6, -45.5),  look: V(20, 34, -110) },
  { name: "dawn",     pos: V(16.5, 3.2, -44),  look: V(21, 6, -130) },
];

export function createScene(canvas, opts = {}) {
  const reduced = !!opts.reduced;
  const phone = () => innerWidth / innerHeight < 0.8;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, phone() ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const glowTex = (stops) => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
    const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, col]) => rg.addColorStop(o, col)); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); };
  const warmGlow = glowTex([[0, "rgba(255,170,90,0.9)"], [0.3, "rgba(255,130,50,0.25)"], [1, "rgba(255,110,40,0)"]]);
  const coolGlow = glowTex([[0, "rgba(255,240,210,1)"], [0.25, "rgba(255,210,150,0.35)"], [1, "rgba(255,200,140,0)"]]);

  const scene = new THREE.Scene();
  const fogNight = new THREE.Color(0x0a1022), fogDawn = new THREE.Color(0x5a4a5e), fogDay = new THREE.Color(0.70, 0.80, 0.88);
  scene.fog = new THREE.FogExp2(fogNight.clone(), 0.014);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 500);

  // ---------- sky (follows the camera) ----------
  const skyU = { uTop: { value: new THREE.Color(0x03050c) }, uMid: { value: new THREE.Color(0x0d1834) }, uLow: { value: new THREE.Color(0x3a2a3a) }, uGlow: { value: new THREE.Color(0xb8573a) }, uDawn: { value: 0 }, uDay: { value: 0 }, uSun: { value: V(0, 1, 0) } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: `varying vec3 vP; uniform vec3 uTop,uMid,uLow,uGlow,uSun; uniform float uDawn, uDay;
      void main(){ float h = vP.y;
        vec3 top = mix(uTop, vec3(0.16,0.22,0.42), uDawn), mid = mix(uMid, vec3(0.55,0.42,0.52), uDawn), low = mix(uLow, vec3(1.0,0.62,0.38), uDawn);
        vec3 c = mix(mid, top, smoothstep(0.06, 0.6, h)); c = mix(low, c, smoothstep(-0.02, 0.16 + uDawn*0.12, h));
        float sun = exp(-pow(h*9.0,2.0)) * smoothstep(-0.9, 0.0, -abs(vP.x - 0.05));
        c += mix(uGlow*0.35, vec3(1.0,0.72,0.42)*0.9, uDawn) * sun;
        vec3 day = mix(vec3(0.62,0.80,0.96), vec3(0.20,0.47,0.86), smoothstep(0.0, 0.7, h));
        day = mix(vec3(0.86,0.90,0.94), day, smoothstep(-0.02, 0.22, h));
        float sd = max(dot(normalize(vP), normalize(uSun)), 0.0);
        day += vec3(1.0,0.93,0.78) * (pow(sd, 64.0)*0.9 + pow(sd, 6.0)*0.18);
        c = mix(c, day, uDay); gl_FragColor = vec4(c,1.); }`,
  }));
  scene.add(sky);

  const starCount = 2800, sp = new Float32Array(starCount * 3), ss = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.94), r = 280;
    sp[i * 3] = r * Math.sin(ph) * Math.cos(th); sp[i * 3 + 1] = r * Math.cos(ph) + 6; sp[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th); ss[i] = Math.random();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3)); starGeo.setAttribute("seed", new THREE.BufferAttribute(ss, 1));
  const starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uFade: { value: 1 } },
    vertexShader: `attribute float seed; uniform float uTime, uPx; varying float vA;
      void main(){ gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.);
        vA = (0.55 + 0.45*sin(uTime*(0.6+seed*2.2) + seed*40.0)) * (0.35 + seed*0.65); gl_PointSize = (0.8 + seed*seed*2.8) * uPx; }`,
    fragmentShader: `varying float vA; uniform float uFade; void main(){ float a = smoothstep(0.5,0.0,length(gl_PointCoord-0.5)); gl_FragColor = vec4(vec3(0.93,0.9,1.0), a*vA*uFade); }`,
  });
  const stars = new THREE.Points(starGeo, starMat); scene.add(stars);

  // moon, high over the lake, with a halo
  const moon = new THREE.Group(); scene.add(moon);
  const moonDisk = new THREE.Mesh(new THREE.CircleGeometry(7, 48), new THREE.MeshBasicMaterial({ color: 0xf3eee2, fog: false, transparent: true }));
  const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex([[0, "rgba(225,232,255,0.6)"], [0.22, "rgba(200,215,255,0.18)"], [1, "rgba(200,215,255,0)"]]), depthWrite: false, fog: false, transparent: true }));
  moonHalo.scale.set(110, 110, 1); moon.add(moonHalo); moon.add(moonDisk);
  const MOON = V(46, 58, -190); moon.position.copy(MOON);
  const sunG = new THREE.Group(); scene.add(sunG);
  const sunDisk = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshBasicMaterial({ color: 0xfff4d6, fog: false, transparent: true }));
  const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex([[0, "rgba(255,240,200,0.9)"], [0.2, "rgba(255,220,150,0.35)"], [1, "rgba(255,210,140,0)"]]), depthWrite: false, fog: false, transparent: true, blending: THREE.AdditiveBlending }));
  sunHalo.scale.set(140, 140, 1); sunG.add(sunHalo); sunG.add(sunDisk);
  const sunLight = new THREE.DirectionalLight(0xfff1d6, 0); scene.add(sunLight);

  // ---------- mountains beyond the lake ----------
  function ridge(z, height, color, seed, width = 420, cx = 15) {
    const shape = new THREE.Shape(), n = 140; shape.moveTo(cx - width / 2, -10);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = cx - width / 2 + width * t;
      const y = height * (0.45 + 0.35 * Math.sin(t * 9.1 + seed) * Math.sin(t * 2.7 + seed * 2) + 0.2 * Math.abs(Math.sin(t * 23.3 + seed * 5)))
        + height * 0.6 * Math.exp(-Math.pow((t - 0.55 - Math.sin(seed) * 0.15) * 6.0, 2));
      shape.lineTo(x, y);
    }
    shape.lineTo(cx + width / 2, -10);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color })); m.position.z = z; scene.add(m); return m;
  }
  const ridges = [ridge(-200, 62, 0x22305e, 1.3), ridge(-140, 36, 0x18224a, 4.1), ridge(-95, 16, 0x0e1530, 2.2, 300)];

  // ---------- ground and the trail ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x14120f, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(15, 0, -60); scene.add(ground);
  const hemi = new THREE.HemisphereLight(0x2a3d6e, 0x0a0805, 0.55); scene.add(hemi);
  const moonLight = new THREE.DirectionalLight(0x9fb2e0, 0.45); moonLight.position.set(46, 58, -100); scene.add(moonLight);

  const trail = new THREE.CatmullRomCurve3([V(2.6, 0, 1.6), V(4, 0, -6), V(7.5, 0, -14), V(9.5, 0, -22), V(13, 0, -29), V(15.5, 0, -37), V(17.6, 0, -44), V(18.6, 0, -49)]);
  const tp = trail.getSpacedPoints(160), tpos = [], tidx = [];
  tp.forEach((p, i) => {
    const nxt = tp[Math.min(i + 1, tp.length - 1)], prv = tp[Math.max(i - 1, 0)];
    const dir = nxt.clone().sub(prv).normalize(), side = V(-dir.z, 0, dir.x).multiplyScalar(0.75 + 0.15 * Math.sin(i * 0.7));
    tpos.push(p.x + side.x, 0.015, p.z + side.z, p.x - side.x, 0.015, p.z - side.z);
    if (i < tp.length - 1) { const a = i * 2; tidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute("position", new THREE.Float32BufferAttribute(tpos, 3)); trailGeo.setIndex(tidx); trailGeo.computeVertexNormals();
  const trailMat = new THREE.MeshStandardMaterial({ color: 0x3a2f22, roughness: 1, side: THREE.DoubleSide }); scene.add(new THREE.Mesh(trailGeo, trailMat));

  // trail lanterns: small warm lights that come on as you walk past
  const lanterns = [];
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd38a });
  for (let i = 1; i < 12; i++) {
    const t = i / 12, p = trail.getPointAt(t), tan = trail.getTangentAt(t), side = V(-tan.z, 0, tan.x).multiplyScalar(i % 2 ? 1.25 : -1.25);
    const g = new THREE.Group(); g.position.copy(p).add(side);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.9, 6), new THREE.MeshStandardMaterial({ color: 0x1c1712 })); post.position.y = 0.45; g.add(post);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), lampMat); lamp.position.y = 0.95; g.add(lamp);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    glow.position.y = 0.95; glow.scale.set(2.2, 2.2, 1); g.add(glow);
    g.userData = { glow, t }; scene.add(g); lanterns.push(g);
  }
  const walkLight = new THREE.PointLight(0xffb060, 0, 14, 1.6); scene.add(walkLight);

  // pine forest along both sides of the trail (instanced)
  const pineGeo = new THREE.ConeGeometry(1, 2, 6); pineGeo.translate(0, 1, 0);
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x0b1410, roughness: 1, flatShading: true });
  const PINES = phone() ? 260 : 520, pines = new THREE.InstancedMesh(pineGeo, pineMat, PINES * 3);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); let k = 0;
  const near = (x, z) => tp.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 9) || ((x - 21) ** 2 + (z + 73) ** 2 < 470) || ((x - 3) ** 2 + (z - 1) ** 2 < 90) || ((x - 19.6) ** 2 + (z + 51.5) ** 2 < 30) || (x > 8 && x < 32 && z < -24 && z > -60);
  for (let n = 0; k < PINES * 3 && n < PINES * 8; n++) {
    const x = -40 + Math.random() * 100, z = 12 - Math.random() * 80;
    if (near(x, z)) continue;
    const s = 1.1 + Math.random() * 2.4;
    for (let layer = 0; layer < 3; layer++) {
      const ls = s * (1 - layer * 0.24);
      m4.compose(V(x, s * (0.2 + layer * 0.75), z), q, sc.set(ls * 0.9, ls * 0.9, ls * 0.9)); pines.setMatrixAt(k++, m4);
    }
  }
  pines.count = k; scene.add(pines);

  // ---------- the camp ----------
  const fire = new THREE.Group(); fire.position.set(2.4, 0, 2.6); scene.add(fire);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 0.95, flatShading: true });
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.05, 0), stoneMat); st.position.set(Math.cos(a) * 0.72, 0.09, Math.sin(a) * 0.72); st.rotation.set(Math.random() * 3, Math.random() * 3, 0); fire.add(st); }
  const logMat = new THREE.MeshStandardMaterial({ color: 0x3b2716, roughness: 0.9, emissive: 0x3a0e00, emissiveIntensity: 0.6 });
  for (let i = 0; i < 6; i++) { const log = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.15, 7), logMat), a = (i / 6) * Math.PI * 2; log.position.set(Math.cos(a) * 0.2, 0.45, Math.sin(a) * 0.2); log.rotation.z = Math.cos(a) * 0.42; log.rotation.x = -Math.sin(a) * 0.42; fire.add(log); }
  const embersBed = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0.85 })); embersBed.rotation.x = -Math.PI / 2; embersBed.position.y = 0.03; fire.add(embersBed);
  const flameMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uTime: { value: 0 }, uLevel: { value: reduced ? 1 : 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: `varying vec2 vUv; uniform float uTime, uLevel;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.03; a*=.5; } return v; }
      void main(){ vec2 uv = vUv; float y = uv.y, x = (uv.x-0.5)*2.0, t = uTime*1.6;
        float d = fbm(vec2(uv.x*3.0, y*2.6 - t)), width = (1.0 - y) * (0.55 + 0.45*uLevel);
        float shape = smoothstep(width, width*0.25, abs(x + (d-0.5)*0.9*y));
        float body = shape * smoothstep(1.0, 0.15, y + (1.0-uLevel)*0.6 + (d-0.5)*0.35) * smoothstep(0.0, 0.08, y);
        vec3 col = mix(vec3(0.9,0.16,0.01), vec3(1.0,0.62,0.18), smoothstep(0.15,0.8,body)); col = mix(col, vec3(1.0,0.88,0.6), smoothstep(0.9,1.0,body)*0.6);
        gl_FragColor = vec4(col*1.25, body*uLevel*0.85); }`,
  });
  const flames = [];
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(1.0 + i * 0.12, 1.9 - i * 0.18), flameMat); f.userData.off = V((i - 1.5) * 0.08, 0.95 - i * 0.05, (i % 2) * 0.06); fire.add(f); flames.push(f); }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); halo.position.y = 0.9; halo.scale.set(6, 6, 1); fire.add(halo);
  const fireLight = new THREE.PointLight(0xff8a3d, 0, 26, 1.7); fireLight.position.set(0, 1.4, 0); fire.add(fireLight);

  const SPARKS = 160, spPos = new Float32Array(SPARKS * 3), spVel = [], spLife = new Float32Array(SPARKS);
  function resetSpark(i, initial) { spPos[i * 3] = (Math.random() - 0.5) * 0.6; spPos[i * 3 + 1] = 0.6 + Math.random() * (initial ? 6 : 0.4); spPos[i * 3 + 2] = (Math.random() - 0.5) * 0.6; spVel[i] = V((Math.random() - 0.5) * 0.25, 0.9 + Math.random() * 1.6, (Math.random() - 0.5) * 0.25); spLife[i] = Math.random(); }
  for (let i = 0; i < SPARKS; i++) resetSpark(i, true);
  const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xffa24a, size: 0.07, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); fire.add(sparks);
  const smokeTex = glowTex([[0, "rgba(200,205,220,0.35)"], [1, "rgba(200,205,220,0)"]]);
  const smoke = [];
  for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false })); s.userData.t = i / 14; fire.add(s); smoke.push(s); }

  const tent = new THREE.Group(); tent.position.set(6.4, 0, -2.6); tent.rotation.y = -0.6; scene.add(tent);
  const tri = new THREE.Shape(); tri.moveTo(-1.5, 0); tri.lineTo(0, 1.9); tri.lineTo(1.5, 0); tri.lineTo(-1.5, 0);
  const tentBody = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 2.6, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0x5b5340, roughness: 0.9, flatShading: true, emissive: 0x3a2208, emissiveIntensity: 0.5 })); tentBody.position.z = -1.3; tent.add(tentBody);
  const door = new THREE.Shape(); door.moveTo(-0.6, 0); door.lineTo(0, 1.2); door.lineTo(0.6, 0); door.lineTo(-0.6, 0);
  const doorMesh = new THREE.Mesh(new THREE.ShapeGeometry(door), new THREE.MeshBasicMaterial({ color: 0xffb35c })); doorMesh.position.z = 1.31; tent.add(doorMesh);
  const tentGlow = new THREE.PointLight(0xffb45a, 2.2, 5, 2); tentGlow.position.set(0, 0.6, 1.8); tent.add(tentGlow);
  const campLamp = new THREE.Group(); campLamp.position.set(0.9, 0, 3.6); scene.add(campLamp);
  const lampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.3, 8), lampMat); lampBody.position.y = 0.22; campLamp.add(lampBody);
  const lampLight = new THREE.PointLight(0xffc06a, 1.1, 5, 2); lampLight.position.y = 0.3; campLamp.add(lampLight);
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x2e2114, roughness: 1 });
  [[0.6, 0.0, 0.5], [4.2, 0.2, -0.5]].forEach(([x, z, r]) => { const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 1.4, 10), seatMat); seat.rotation.z = Math.PI / 2; seat.rotation.y = r; seat.position.set(x, 0.2, z + 2.6); scene.add(seat); });

  // SJ himself, sitting on the far log by the fire
  const sj = createAvatar(); sj.root.position.set(4.25, -0.1, 2.05); sj.root.rotation.y = -0.55; sj.root.scale.setScalar(1.05); scene.add(sj.root);
  const sjWave = { v: 0 };

  // ---------- the lake ----------
  const LAKE = V(21, 0.03, -73);
  const lakeU = { uTime: { value: 0 }, uMoonX: { value: 0 }, uDawn: { value: 0 }, uDay: { value: 0 }, uCam: { value: V(0, 0, 0) } };
  const lake = new THREE.Mesh(new THREE.CircleGeometry(19, 96), new THREE.ShaderMaterial({
    uniforms: lakeU, fog: false, transparent: false,
    vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }",
    fragmentShader: `varying vec3 vW; uniform float uTime, uDawn, uDay; uniform vec3 uCam;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9,78.2)))*43758.5); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 p = vW.xz; float rip = n(p*1.6 + vec2(uTime*0.25, uTime*0.1))*0.6 + n(p*4.0 - uTime*0.4)*0.4;
        vec3 deep = mix(vec3(0.03,0.05,0.12), vec3(0.32,0.26,0.36), uDawn);
        vec3 sky = mix(vec3(0.08,0.12,0.26), vec3(0.95,0.62,0.42), uDawn);
        vec3 c = mix(deep, sky, 0.35 + rip*0.25);
        // moon road: a shimmering column on the water between the viewer and the moon
        vec2 toMoon = normalize(vec2(46.0, -190.0) - uCam.xz); vec2 rel = p - uCam.xz;
        float along = dot(rel, toMoon); float across = abs(rel.x*toMoon.y - rel.y*toMoon.x);
        float road = smoothstep(2.2 + along*0.08, 0.0, across) * step(0.0, along) * (0.5 + rip);
        c += vec3(0.95,0.92,0.82) * road * 0.6 * (1.0 - uDawn*0.6) * (1.0 - uDay);
        vec3 dayWater = mix(vec3(0.10,0.36,0.48), vec3(0.42,0.66,0.82), 0.3 + rip*0.4);
        float glit = step(0.86, n(p*6.0 + uTime*0.8)) * road * 2.2;
        c = mix(c, dayWater + vec3(1.0,0.97,0.88)*glit, uDay);
        float edge = smoothstep(18.6, 16.4, length(p - vec2(21.0,-73.0)));
        gl_FragColor = vec4(mix(mix(vec3(0.08,0.07,0.06), vec3(0.42,0.38,0.28), uDay), c, edge), 1.0); }`,
  }));
  lake.rotation.x = -Math.PI / 2; lake.position.copy(LAKE); scene.add(lake);

  // the one who sits by the water: a calm silhouette on a rock, back to us
  const figure = new THREE.Group(); figure.position.set(19.6, 0, -51.5); figure.rotation.y = 0.15; scene.add(figure);
  const ink = new THREE.MeshBasicMaterial({ color: 0x04060c });
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 1), new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 1, flatShading: true })); rock.scale.set(1.4, 0.55, 1.1); rock.position.y = 0.35; figure.add(rock);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.55, 6, 12), ink); torso.position.set(0, 1.25, 0); torso.rotation.x = -0.12; figure.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), ink); head.position.set(0, 1.85, -0.06); figure.add(head);
  [-0.17, 0.17].forEach((x) => {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.45, 4, 8), ink); thigh.position.set(x, 0.92, -0.32); thigh.rotation.x = Math.PI / 2.1; figure.add(thigh);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.42, 4, 8), ink); shin.position.set(x, 0.62, -0.6); shin.rotation.x = 0.35; figure.add(shin);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.5, 4, 8), ink); arm.position.set(x * 1.9, 1.2, -0.18); arm.rotation.x = 0.7; figure.add(arm);
  });
  const rodMat = new THREE.MeshBasicMaterial({ color: 0x2a1d12, transparent: true, opacity: 0 });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 3.4, 6), rodMat);
  rod.geometry.translate(0, 1.7, 0); rod.position.set(0.15, 1.15, -0.35); rod.rotation.x = -1.0; figure.add(rod);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xe8e4da, transparent: true, opacity: 0 });
  const lineGeo = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 0, 0)]);
  const fishLine = new THREE.Line(lineGeo, lineMat); scene.add(fishLine);
  const bobber = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0 })); scene.add(bobber);
  const tipLocal = V(0, 3.4, 0), tipW = V(0, 0, 0);
  const rimLight = new THREE.PointLight(0xbcd0ff, 0.8, 6, 2); rimLight.position.set(20, 3, -55); scene.add(rimLight);

  // thoughts: soft lights that rise from the figure and drift up into the sky
  const THOUGHTS = 26, thoughts = [];
  for (let i = 0; i < THOUGHTS; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: coolGlow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
    s.userData = { t: i / THOUGHTS, sx: (Math.random() - 0.5) * 2, sz: (Math.random() - 0.5) * 2, sp: 0.6 + Math.random() * 0.8 };
    scene.add(s); thoughts.push(s);
  }

  // ---------- a flock of hopes crossing the moon ----------
  const FLOCK = phone() ? 22 : 38, birds = [];
  const wingGeo = new THREE.BufferGeometry(); wingGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, -0.35, 0.15, 0, 0.35], 3));
  const birdMat = new THREE.MeshBasicMaterial({ color: 0xf3c27a, side: THREE.DoubleSide, transparent: true, opacity: 0, fog: false });
  for (let i = 0; i < FLOCK; i++) {
    const b = new THREE.Group(), L = new THREE.Mesh(wingGeo, birdMat), R = new THREE.Mesh(wingGeo, birdMat); R.scale.x = -1;
    b.add(L, R); b.userData = { L, R, off: V((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 14), ph: Math.random() * 6.28, sp: 0.85 + Math.random() * 0.3 };
    b.scale.setScalar(2.2 + Math.random() * 1.4); scene.add(b); birds.push(b);
  }

  // ---------- state ----------
  const state = { day: 0, dayTarget: 0, mx: 0, my: 0, p: 0, keys: POSES.map((_, i) => i / (POSES.length - 1)), level: reduced ? 1 : 0, ignited: false, t0: performance.now() };
  addEventListener("pointermove", (e) => { state.mx = e.clientX / innerWidth - 0.5; state.my = e.clientY / innerHeight - 0.5; });
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 64 : 48; camera.updateProjectionMatrix(); }
  addEventListener("resize", resize); resize();

  const pos = V(0, 0, 0), look = V(0, 0, 0), tmp = V(0, 0, 0), cur = { x: 0, y: 0 }, smoothP = { v: 0 };
  function poseAt(p) {
    const K = state.keys; let i = 0;
    while (i < K.length - 2 && p > K[i + 1]) i++;
    const e = smooth(K[i], K[i + 1], p);
    pos.lerpVectors(POSES[i].pos, POSES[i + 1].pos, e); look.lerpVectors(POSES[i].look, POSES[i + 1].look, e);
    if (phone()) { pos.z += 2.2; pos.y += 0.5; look.x = pos.x + (look.x - pos.x) * 0.6 + 1.2; }
  }
  const segP = (a, b) => smooth(state.keys[a], state.keys[b], smoothP.v);

  let running = true, last = performance.now();
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = (now - state.t0) / 1000;
    smoothP.v += (state.p - smoothP.v) * Math.min(1, dt * (reduced ? 30 : 4));
    const P = smoothP.v;
    starMat.uniforms.uTime.value = t; flameMat.uniforms.uTime.value = t; lakeU.uTime.value = t;

    // fire
    state.day += (state.dayTarget - state.day) * Math.min(1, dt * (reduced ? 30 : 1.1));
    const D = smooth(0, 1, state.day);
    state.level += ((state.ignited ? 1 - 0.85 * D : 0.12) - state.level) * Math.min(1, dt * 1.4);
    const L = state.level, flick = 0.82 + 0.18 * Math.sin(t * 13.0) * Math.sin(t * 7.3 + 1.2) + 0.08 * Math.sin(t * 23.0);
    flameMat.uniforms.uLevel.value = L; fireLight.intensity = (2 + 26 * L) * flick; logMat.emissiveIntensity = 0.3 + 1.4 * L * flick;
    embersBed.material.opacity = 0.4 + 0.5 * L; sparks.material.opacity = 0.9 * L; halo.material.opacity = 0.9 * L * flick;
    flames.forEach((f, i) => { f.position.copy(f.userData.off); f.lookAt(camera.position.x, f.getWorldPosition(tmp).y, camera.position.z); f.scale.set(0.9 + 0.1 * Math.sin(t * 5 + i), 0.75 + 0.3 * L + 0.08 * Math.sin(t * 9 + i * 2), 1); });
    for (let i = 0; i < SPARKS; i++) { spLife[i] += dt * 0.35; spPos[i * 3] += (spVel[i].x + Math.sin(t * 2 + i) * 0.15) * dt; spPos[i * 3 + 1] += spVel[i].y * dt * (0.3 + L); spPos[i * 3 + 2] += spVel[i].z * dt; if (spPos[i * 3 + 1] > 9 || spLife[i] > 1) resetSpark(i, false); }
    sparkGeo.attributes.position.needsUpdate = true;
    smoke.forEach((s) => { s.userData.t = (s.userData.t + dt * 0.06) % 1; const k2 = s.userData.t; s.position.set(Math.sin(k2 * 6 + t * 0.3) * k2 * 1.2, 2 + k2 * 9, -k2 * 1.5); const z = 1 + k2 * 5; s.scale.set(z, z, 1); s.material.opacity = 0.22 * L * Math.sin(k2 * Math.PI); });
    lampLight.intensity = 1.0 + 0.08 * Math.sin(t * 3.1);

    // trail lanterns light up as the walk passes them; a warm light walks with you
    const walk = segP(1, 5);
    lanterns.forEach((g) => { const on = smooth(g.userData.t - 0.12, g.userData.t + 0.02, walk + 0.08); g.userData.glow.material.opacity = on * (0.8 + 0.2 * Math.sin(t * 3 + g.userData.t * 20)); });
    walkLight.intensity = 4 * smooth(0.02, 0.1, walk) * (1 - smooth(0.92, 1, walk));
    walkLight.position.copy(trail.getPointAt(Math.min(0.999, walk))).add(V(0, 1.6, 0));

    // thoughts rise once we reach the figure, then settle into the sky
    const think = segP(5, 7), settle = segP(7, 8);
    thoughts.forEach((s, i) => {
      const u = s.userData; u.t = (u.t + dt * 0.05 * u.sp) % 1;
      const rise = u.t;
      const hx = 19.6 + u.sx * rise * 3 + Math.sin(t * 0.6 + i) * 0.4, hy = 2.1 + rise * (7 + settle * 20), hz = -51.8 - rise * 4 + u.sz * rise * 2;
      s.position.set(hx, hy, hz);
      const size = 0.35 + rise * 0.9; s.scale.set(size, size, 1);
      s.material.opacity = think * Math.sin(Math.min(1, rise * 1.4) * Math.PI) * 0.95 + settle * 0.25;
    });

    // the flock of hopes: a loose V that drifts across the moon, wings beating
    const fly = segP(6, 9);
    const cx = 0 + ((t * 3.2) % 80), cy = 30 + Math.sin(t * 0.3) * 3, cz = -125;
    birds.forEach((b, i) => {
      const u = b.userData; const flap = Math.sin(t * 7 * u.sp + u.ph) * 0.7;
      u.L.rotation.z = flap; u.R.rotation.z = -flap;
      b.position.set(cx + u.off.x + Math.sin(t * 0.8 + u.ph) * 1.2, cy + u.off.y + Math.cos(t * 0.6 + u.ph) * 0.8, cz + u.off.z);
      b.rotation.y = -0.2; birdMat.opacity = Math.min(1, fly * 1.6);
    });

    // dawn at the end
    const dawn = segP(8, 9);
    skyU.uDawn.value = dawn; lakeU.uDawn.value = dawn; starMat.uniforms.uFade.value = 1 - dawn * 0.85;
    scene.fog.color.copy(fogNight).lerp(fogDawn, dawn); renderer.toneMappingExposure = 1.05 + dawn * 0.35;
    hemi.intensity = 0.55 + dawn * 0.6; moonDisk.material.color.setRGB(0.95, 0.93 - dawn * 0.1, 0.88 - dawn * 0.2);

    // avatar: says hello at camp, looks toward your pointer, beanie at night, sunglasses by day
    const atCamp = 1 - smooth(state.keys[0] + 0.01, state.keys[1], P);
    const waveTarget = state.ignited && atCamp > 0.5 && ((t % 9) < 2.6) ? 1 : 0;
    sjWave.v += (waveTarget - sjWave.v) * Math.min(1, dt * 5);
    sj.setWave(sjWave.v); sj.setLook(cur.x * 1.4 + 0.3, cur.y); sj.setDay(state.dayTarget); sj.update(dt, t);

    // ---------- day ----------
    skyU.uDay.value = D; lakeU.uDay.value = D;
    starMat.uniforms.uFade.value *= 1 - D;
    sunG.position.set(-20 + D * 10, -40 + D * 115, -200); sunG.lookAt(camera.position);
    skyU.uSun.value.copy(sunG.position).sub(camera.position).normalize();
    moon.position.set(MOON.x, MOON.y - D * 110, MOON.z); moonHalo.material.opacity *= 1 - D; moonDisk.material.opacity = 1 - smooth(0.2, 0.7, D); moon.visible = D < 0.99;
    sunLight.intensity = D * 2.4; sunLight.position.copy(sunG.position);
    hemi.color.setRGB(0.16 + D * 0.5, 0.24 + D * 0.55, 0.43 + D * 0.5); hemi.groundColor.setRGB(0.04 + D * 0.25, 0.03 + D * 0.22, 0.02 + D * 0.12);
    hemi.intensity = (0.55 + dawn * 0.6) * (1 - D) + 1.1 * D;
    scene.fog.color.lerp(fogDay, D); scene.fog.density = 0.014 - D * 0.006;
    renderer.toneMappingExposure = (1.05 + dawn * 0.35) * (1 - D) + 0.95 * D;
    pineMat.color.setRGB(0.043 + D * 0.12, 0.078 + D * 0.24, 0.063 + D * 0.12);
    ground.material.color.setRGB(0.078 + D * 0.27, 0.07 + D * 0.32, 0.06 + D * 0.12);
    trailMat.color.setRGB(0.23 + D * 0.32, 0.18 + D * 0.26, 0.13 + D * 0.16);
    ridges[0].material.color.setRGB(0.13 + D * 0.32, 0.19 + D * 0.38, 0.37 + D * 0.3);
    ridges[1].material.color.setRGB(0.09 + D * 0.2, 0.13 + D * 0.34, 0.29 + D * 0.12);
    ridges[2].material.color.setRGB(0.05 + D * 0.15, 0.08 + D * 0.27, 0.19 + D * 0.0);
    lanterns.forEach((g) => { g.userData.glow.material.opacity *= 1 - D; });
    lampMat.color.setRGB(1 - D * 0.5, 0.83 - D * 0.4, 0.54 - D * 0.3);
    walkLight.intensity *= 1 - D; tentGlow.intensity = 2.2 * (1 - D); doorMesh.material.color.setRGB(1 - D * 0.55, 0.7 - D * 0.35, 0.36 - D * 0.15);
    thoughts.forEach((th) => { th.material.opacity *= 1 - D * 0.55; });
    birdMat.color.setRGB(0.95 - D * 0.85, 0.76 - D * 0.66, 0.48 - D * 0.38);
    ink.color.setRGB(0.016 + D * 0.12, 0.024 + D * 0.14, 0.047 + D * 0.2);
    rimLight.intensity = 0.8 * (1 - D);
    // fishing: rod, line and a bobbing float
    rodMat.opacity = D; lineMat.opacity = D * 0.85; bobber.material.opacity = D;
    rod.rotation.z = Math.sin(t * 0.7) * 0.03;
    tipW.copy(tipLocal); rod.localToWorld(tipW);
    bobber.position.set(tipW.x + 0.4, 0.06 + Math.sin(t * 2.1) * 0.03, tipW.z - 0.6);
    lineGeo.attributes.position.setXYZ(0, tipW.x, tipW.y, tipW.z); lineGeo.attributes.position.setXYZ(1, bobber.position.x, bobber.position.y, bobber.position.z); lineGeo.attributes.position.needsUpdate = true;

    // camera: along the story, breathing, leaning toward the pointer
    poseAt(P);
    cur.x += (state.mx - cur.x) * Math.min(1, dt * 2.2); cur.y += (state.my - cur.y) * Math.min(1, dt * 2.2);
    camera.position.set(pos.x + cur.x * 1.2 + Math.sin(t * 0.2) * 0.12, pos.y - cur.y * 0.5 + Math.sin(t * 0.33) * 0.05, pos.z);
    look.x += cur.x * 2.4; look.y -= cur.y * 1.2; camera.lookAt(look);
    lakeU.uCam.value.copy(camera.position);
    sky.position.copy(camera.position); stars.position.copy(camera.position); stars.rotation.y = t * 0.004;
    moon.position.copy(MOON); moonHalo.material.opacity = 1 - dawn * 0.5;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    ignite() { state.ignited = true; },
    setProgress(p) { state.p = p; },
    setDay(on, instant) { state.dayTarget = on ? 1 : 0; if (instant) state.day = state.dayTarget; },
    setKeys(keys) { state.keys = keys; },
    pause() { running = false; },
    resume() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } },
  };
}
