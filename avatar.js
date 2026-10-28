// SJ, the avatar: a rounded, Bitmoji-style 3D character built from simple shapes.
// It blinks, breathes, waves, follows the pointer with its eyes, wears a beanie at night and sunglasses by day.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export function createAvatar() {
  const mat = (color, rough = 0.6) => new THREE.MeshStandardMaterial({ color, roughness: rough });
  const skin = mat(0xc98b62, 0.55), hair = mat(0x1d1512, 0.8), hoodie = mat(0xff7a2f, 0.7), hoodieDark = mat(0xd9601c, 0.7),
    pants = mat(0x26324f, 0.8), shoe = mat(0xece6d6, 0.6), sole = mat(0x3a3330, 0.9), white = mat(0xffffff, 0.3), ink = mat(0x14100e, 0.3),
    beanieMat = mat(0x2f5d7c, 0.9), lens = new THREE.MeshStandardMaterial({ color: 0x0d1530, roughness: 0.15, metalness: 0.4 }), frame = mat(0x14100e, 0.4), cheek = new THREE.MeshStandardMaterial({ color: 0xe0866a, roughness: 0.8, transparent: true, opacity: 0.55 });

  const root = new THREE.Group(); root.name = "sj-avatar";
  const body = new THREE.Group(); root.add(body);

  // legs: sitting, knees forward
  const legs = new THREE.Group(); body.add(legs);
  [-0.14, 0.14].forEach((x) => {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.26, 6, 12), pants); thigh.rotation.x = Math.PI / 2; thigh.position.set(x, 0.42, 0.14); legs.add(thigh);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.24, 6, 12), pants); shin.position.set(x, 0.22, 0.3); legs.add(shin);
    const shoeM = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.12, 6, 12), shoe); shoeM.rotation.x = Math.PI / 2; shoeM.position.set(x, 0.06, 0.36); legs.add(shoeM);
    const soleM = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.03, 0.27), sole); soleM.position.set(x, 0.0, 0.36); legs.add(soleM);
  });

  // torso: a soft hoodie with a front pocket and drawstrings
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.28, 8, 20), hoodie); torso.position.y = 0.72; torso.scale.set(1.08, 1, 0.82); body.add(torso);
  const pocket = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.18, 4, 12), hoodieDark); pocket.rotation.z = Math.PI / 2; pocket.position.set(0, 0.62, 0.19); pocket.scale.set(1, 1, 0.35); body.add(pocket);
  [-0.05, 0.05].forEach((x) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 6), white); s.position.set(x, 0.86, 0.2); body.add(s); });
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.06, 10, 24, Math.PI * 1.3), hoodieDark); hood.rotation.set(Math.PI / 2, 0, Math.PI * 1.15); hood.position.set(0, 0.98, -0.04); body.add(hood);

  // arms: left rests on the knee, right is free to wave
  const mkArm = (side) => {
    const shoulder = new THREE.Group(); shoulder.position.set(side * 0.27, 0.9, 0); body.add(shoulder);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.2, 6, 12), hoodie); upper.position.y = -0.14; shoulder.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -0.27; shoulder.add(elbow);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.18, 6, 12), hoodie); fore.position.y = -0.12; elbow.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 12), skin); hand.position.y = -0.26; elbow.add(hand);
    return { shoulder, elbow };
  };
  const armL = mkArm(-1), armR = mkArm(1);
  armL.shoulder.rotation.set(-0.7, 0, 0.2); armL.elbow.rotation.x = -0.6;

  // head: big and round, Bitmoji proportions
  const headG = new THREE.Group(); headG.position.y = 1.32; body.add(headG);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 12), skin); neck.position.y = -0.3; headG.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), skin); head.scale.set(1, 1.06, 0.95); headG.add(head);
  [-1, 1].forEach((s) => { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), skin); ear.scale.set(0.6, 1, 0.8); ear.position.set(s * 0.33, -0.02, -0.02); headG.add(ear); });
  // hair: a full top with a swoosh at the front, short sides, and a light beard
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.355, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hair); hairTop.position.set(0, 0.05, -0.02); hairTop.scale.set(1.02, 0.85, 1.02); headG.add(hairTop);
  const swoosh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), hair); swoosh.scale.set(1.5, 0.55, 0.9); swoosh.position.set(0.06, 0.29, 0.12); swoosh.rotation.z = -0.25; headG.add(swoosh);
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), hair); back.position.set(0, 0.0, -0.06); back.scale.set(1.02, 1, 0.9); headG.add(back);
  const beard = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 16, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.66, Math.PI * 0.26), new THREE.MeshStandardMaterial({ color: 0x2a1d17, roughness: 0.9, transparent: true, opacity: 0.35 }));
  beard.position.set(0, 0.0, 0.035); beard.scale.set(1.08, 1.1, 1.05); headG.add(beard);

  // face
  const face = new THREE.Group(); face.position.z = 0.3; headG.add(face);
  const eyes = [-0.11, 0.11].map((x) => {
    const g = new THREE.Group(); g.position.set(x, 0.03, 0); face.add(g);
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), white); w.scale.set(1, 1.15, 0.5); g.add(w);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), ink); pupil.position.z = 0.025; g.add(pupil);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), white); shine.position.set(0.012, 0.015, 0.055); g.add(shine);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), skin); lid.position.z = 0.002; lid.scale.set(1, 0.05, 0.6); g.add(lid);
    return { g, pupil, lid };
  });
  [-0.11, 0.11].forEach((x, i) => { const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.07, 4, 8), hair); brow.rotation.z = Math.PI / 2 + (i ? -0.12 : 0.12); brow.position.set(x, 0.12, 0.01); face.add(brow); });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), skin); nose.position.set(0, -0.03, 0.04); nose.scale.set(1, 0.9, 0.9); face.add(nose);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 8, 20, Math.PI), ink); smile.rotation.z = Math.PI; smile.position.set(0, -0.1, 0.0); face.add(smile);
  [-0.17, 0.17].forEach((x) => { const c = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), cheek); c.position.set(x, -0.05, -0.005); face.add(c); });

  // night: a beanie with a pom-pom
  const beanie = new THREE.Group(); headG.add(beanie);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.37, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), beanieMat); cap.position.y = 0.08; cap.scale.set(1, 0.9, 1); beanie.add(cap);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 10, 32), beanieMat); cuff.rotation.x = Math.PI / 2; cuff.position.y = 0.1; beanie.add(cuff);
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 12), mat(0xf3b562, 1)); pom.position.y = 0.42; beanie.add(pom);

  // day: round sunglasses
  const shades = new THREE.Group(); shades.position.set(0, 0.035, 0.07); face.add(shades);
  [-0.11, 0.11].forEach((x) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 24), lens); l.rotation.x = Math.PI / 2; l.position.x = x; shades.add(l);
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.01, 8, 24), frame); r.position.x = x; shades.add(r); });
  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 6), frame); bridge.rotation.z = Math.PI / 2; shades.add(bridge);

  // a laptop on the knees, screen glowing with code
  const laptop = new THREE.Group(); laptop.position.set(0, 0.52, 0.4); laptop.visible = false; body.add(laptop);
  const shell = mat(0x9aa3b5, 0.35);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.025, 0.32), shell); laptop.add(base);
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), mat(0x1b2030, 0.8)); keys.rotation.x = -Math.PI / 2; keys.position.set(0, 0.014, 0.02); laptop.add(keys);
  const lid = new THREE.Group(); lid.position.set(0, 0.012, -0.16); lid.rotation.x = -0.28; laptop.add(lid);
  const lidM = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.02), shell); lidM.position.y = 0.16; lid.add(lidM);
  const scr = document.createElement("canvas"); scr.width = 256; scr.height = 160; const sg = scr.getContext("2d");
  const screenTex = new THREE.CanvasTexture(scr); screenTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.28), new THREE.MeshBasicMaterial({ map: screenTex })); screen.position.set(0, 0.16, 0.011); lid.add(screen);
  const glow = new THREE.PointLight(0x9ec5ff, 0.18, 0.9, 2); glow.position.set(0, 0.25, 0.35); lid.add(glow);
  const CODE = ["const sj = new Builder();", "sj.listen(problem);", "sj.drawTheTrail();", "while (!done) {", "  ship(); learn();", "}", "agent.run(tasks);", "trip.plan('spiti');", "// stay calm, it will break", "deploy();"];
  let codeLine = 0, codeChar = 0, lastType = 0;
  function drawScreen() {
    sg.fillStyle = "#0b1124"; sg.fillRect(0, 0, 256, 160);
    sg.font = "bold 13px monospace";
    const start = Math.max(0, codeLine - 7);
    for (let i = start; i <= codeLine; i++) {
      const text = i === codeLine ? CODE[i % CODE.length].slice(0, codeChar) : CODE[i % CODE.length];
      sg.fillStyle = i % 3 === 0 ? "#f3b562" : i % 3 === 1 ? "#ece6d6" : "#9ec5ff";
      sg.fillText(text, 12, 22 + (i - start) * 17);
    }
    sg.fillStyle = "#ff7a2f"; sg.fillRect(12 + sg.measureText(CODE[codeLine % CODE.length].slice(0, codeChar)).width, 12 + (codeLine - start) * 17, 7, 13);
    screenTex.needsUpdate = true;
  }
  drawScreen();

  const state = { day: 0, wave: 1, pose: "sit", look: new THREE.Vector2(0, 0), blinkAt: 1.5, t: 0 };

  function update(dt, t) {
    state.t = t;
    // breathing
    body.position.y = Math.sin(t * 1.6) * 0.008; torso.scale.y = 1 + Math.sin(t * 1.6) * 0.012;
    // head follows the pointer a little
    headG.rotation.y += (state.look.x * 0.5 - headG.rotation.y) * Math.min(1, dt * 4);
    headG.rotation.x += (state.look.y * 0.25 - headG.rotation.x) * Math.min(1, dt * 4);
    headG.rotation.z = Math.sin(t * 0.7) * 0.03;
    eyes.forEach((e) => { e.pupil.position.x = state.look.x * 0.015; e.pupil.position.y = -state.look.y * 0.012; });
    // blink every few seconds
    if (t > state.blinkAt) state.blinkAt = t + 2.5 + Math.random() * 3;
    const b = Math.max(0, 1 - Math.abs(t - (state.blinkAt - 0.0)) / 0.08);
    const closing = t > state.blinkAt - 0.16 && t < state.blinkAt ? Math.sin(((t - (state.blinkAt - 0.16)) / 0.16) * Math.PI) : 0;
    eyes.forEach((e) => { e.lid.scale.y = 0.05 + closing * 1.1; e.lid.position.y = 0.03 * (1 - closing); });
    void b;
    // typing: both hands on the keyboard, head tipped toward the screen, code appearing line by line
    if (state.pose === "typing") {
      laptop.visible = true;
      [armL, armR].forEach((arm, i) => { arm.shoulder.rotation.set(-1.05, 0, i ? -0.18 : 0.18); arm.elbow.rotation.set(-0.35 + Math.sin(t * 14 + i * 2) * 0.05, 0, 0); });
      headG.rotation.x = 0.22 + state.look.y * 0.1;
      if (t - lastType > 0.07) { lastType = t; codeChar++; if (codeChar > CODE[codeLine % CODE.length].length + 6) { codeChar = 0; codeLine++; } drawScreen(); }
      if (state.wave < 0.05) { beanie.visible = false; hairTop.visible = swoosh.visible = true; shades.visible = false; return; }
    } else laptop.visible = false;
    // wave: a friendly hello, then the arm rests
    const w = state.wave;
    armR.shoulder.rotation.z = -0.2 - w * 2.3; armR.shoulder.rotation.x = -0.7 * (1 - w);
    armR.elbow.rotation.x = -0.6 * (1 - w); armR.elbow.rotation.z = w * (-0.4 + Math.sin(t * 9) * 0.45);
    // night beanie, day sunglasses
    beanie.visible = state.day < 0.5; hairTop.visible = swoosh.visible = state.day >= 0.5;
    shades.visible = state.day >= 0.5;
  }

  return {
    root, update,
    setDay(v) { state.day = v; },
    setLook(x, y) { state.look.set(x, y); },
    setWave(v) { state.wave = v; },
    setPose(p) { state.pose = p; },
  };
}
