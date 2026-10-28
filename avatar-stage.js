// Puts the SJ avatar on any page, in its own small 3D stage.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { createAvatar } from "./avatar.js";

export function mountAvatar(canvas, { pose = "sit", day = 0, waveEvery = 8, prop = null } = {}) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0.5, 1.35, 3.3); camera.lookAt(0, 0.95, 0);
  const key = new THREE.DirectionalLight(0xffe2c4, 2.2); key.position.set(2, 3, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ec5ff, 1.6); rim.position.set(-3, 2, -2); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xbcd0ff, 0x3a2a20, 0.9));

  // what he sits on: a stool for coding, a rock for travel
  if (prop === "rock") {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 1), new THREE.MeshStandardMaterial({ color: 0x6b6158, roughness: 1, flatShading: true }));
    rock.scale.set(1.4, 0.5, 1.1); rock.position.y = 0.1; scene.add(rock);
    const pack = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.2, 6, 12), new THREE.MeshStandardMaterial({ color: 0x2f5d7c, roughness: 0.8 }));
    pack.position.set(-0.55, 0.42, 0.05); pack.rotation.z = 0.3; scene.add(pack);
  } else {
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.36, 24), new THREE.MeshStandardMaterial({ color: 0x22305a, roughness: 0.6 }));
    stool.position.y = 0.18; scene.add(stool);
  }

  const sj = createAvatar(); sj.root.position.y = prop === "rock" ? 0.05 : 0.0; scene.add(sj.root);
  sj.setPose(pose); sj.setDay(day); sj.root.rotation.y = 0.25;

  let look = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => { const r = canvas.getBoundingClientRect(); look = { x: (e.clientX - (r.left + r.width / 2)) / innerWidth, y: (e.clientY - (r.top + r.height / 2)) / innerHeight }; });
  function size() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener("resize", size); size();

  let t = 0, last = performance.now(), wave = 1, visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { last = performance.now(); requestAnimationFrame(frame); } }).observe(canvas);
  function frame(now) {
    if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const waving = t < 2.4 || (waveEvery && (t % waveEvery) < 2.2);
    wave += ((waving ? 1 : 0) - wave) * Math.min(1, dt * 5);
    sj.setWave(wave); sj.setLook(look.x * 2, look.y); sj.update(dt, t);
    sj.root.rotation.y = 0.25 + Math.sin(t * 0.3) * 0.08;
    renderer.render(scene, camera);
    if (!reduced || t < 0.1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { setDay: (d) => sj.setDay(d), setPose: (p) => sj.setPose(p) };
}
