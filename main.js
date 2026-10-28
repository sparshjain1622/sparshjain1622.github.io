import { createScene, POSES } from "./scene.js";
import { createSoundscape } from "./sound.js";
import { initMotion } from "./motion.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasGsap = !!window.gsap;
if (reduced || !hasGsap) document.documentElement.classList.add("no-motion");

// ---------- the live world ----------
const canvas = document.getElementById("world");
let world = null;
try { world = createScene(canvas, { reduced }); } catch (e) { canvas.style.background = "#0d1530"; }

// each chapter marks where its camera pose sits on the page
let poseKeys = null;
function computeKeys() {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const keys = POSES.map(() => null);
  document.querySelectorAll("[data-pose]").forEach((el) => {
    const top = el.getBoundingClientRect().top + scrollY;
    keys[+el.dataset.pose] = Math.min(1, Math.max(0, (el.classList.contains("pose-mark") ? top - innerHeight : top) / max));
  });
  keys[0] = 0;
  for (let i = 1; i < keys.length; i++) if (keys[i] == null || keys[i] <= keys[i - 1]) keys[i] = Math.min(1, keys[i - 1] + 0.001);
  poseKeys = keys;
  world && world.setKeys(keys);
}
const bar = document.getElementById("progressBar");
function onScroll() {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const p = scrollY / max;
  world && world.setProgress(p);
  sound.update(p, poseKeys);
  bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
}
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", () => { computeKeys(); onScroll(); });

// ---------- soundscape: changes with the place on the trail and with night or day ----------
const sound = createSoundscape();
let soundOn = false;
if (new URLSearchParams(location.search).has("debug")) window.__sound = sound;
const soundBtn = document.getElementById("soundBtn");
function setSound(on) { soundOn = on; soundBtn.setAttribute("aria-pressed", String(on)); soundBtn.textContent = on ? "Sound on" : "Sound off"; sound.update(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight), poseKeys); sound.setOn(on); try { localStorage.setItem("sj-sound", on ? "on" : "off"); } catch (e) {} }
soundBtn.addEventListener("click", () => setSound(soundBtn.getAttribute("aria-pressed") !== "true"));

// ---------- the gate ----------
const gate = document.getElementById("gate");
function enter(withSound) {
  if (withSound) setSound(true);
  document.body.classList.remove("gated");
  world && world.ignite();
  computeKeys(); onScroll();
  if (hasGsap && !reduced) { gsap.to(gate, { opacity: 0, duration: 0.9, ease: "power2.out", onComplete: () => gate.remove() }); introHero(); }
  else gate.remove();
}
document.getElementById("enterSound").addEventListener("click", () => enter(true));
document.getElementById("enterQuiet").addEventListener("click", () => enter(false));

// ---------- challenge form ----------
document.getElementById("challengeForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const f = ev.target;
  location.href = "mailto:jsparsh11@gmail.com?subject=" + encodeURIComponent("Challenge for SJ: " + f.type.value) + "&body=" + encodeURIComponent(f.msg.value + "\n\nFrom: " + f.name.value);
});

// ---------- constellation ----------
const card = document.getElementById("starCard");
const starBtns = [...document.querySelectorAll("#starList button")];
starBtns.forEach((b, i) => {
  b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
  b.addEventListener("click", () => {
    starBtns.forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true");
    card.innerHTML = "<b>" + b.textContent + "</b><span>" + b.dataset.d + "</span>";
    if (hasGsap && !reduced) gsap.fromTo(card, { y: 10, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.25, ease: "power2.out" });
  });
});

// ---------- story words ----------
const emberWords = [];
document.querySelectorAll(".ember-text").forEach((p) => { p.innerHTML = p.textContent.split(" ").map((w) => '<span class="w">' + w + "</span>").join(" "); emberWords.push(...p.querySelectorAll(".w")); });

if (hasGsap && !reduced) {
  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.create({ trigger: ".story", start: "top 65%", end: "bottom 80%", scrub: true,
    onUpdate: (s) => { const n = Math.round(s.progress * emberWords.length); emberWords.forEach((w, i) => { w.classList.toggle("lit", i < n - 4); w.classList.toggle("hot", i >= n - 4 && i < n); }); } });

  gsap.utils.toArray(".ch").forEach((sec) => {
    const items = sec.querySelectorAll(".reveal");
    if (items.length) gsap.to(items, { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, ease: "power3.out", scrollTrigger: { trigger: sec, start: "top 70%", once: true } });
  });

  // trail markers swing in like lanterns as you pass them
  gsap.utils.toArray(".marker").forEach((m) => gsap.to(m, { opacity: 1, x: 0, duration: 0.6, ease: "power3.out", scrollTrigger: { trigger: m, start: "top 78%", toggleActions: "play none none reverse" } }));

  // builds pinned in the forest, sliding sideways
  gsap.matchMedia().add("(min-width: 761px)", () => {
    const track = document.getElementById("track"), dist = () => Math.max(0, track.scrollWidth - innerWidth);
    gsap.to(track, { x: () => -dist(), ease: "none", scrollTrigger: { trigger: ".builds", start: "top top", end: () => "+=" + dist(), pin: ".builds-pin", scrub: 0.6, invalidateOnRefresh: true } });
  });

  // thoughts: one at a time, each rising out of the figure and fading into the sky
  const lines = gsap.utils.toArray("#thoughtList li");
  const tl = gsap.timeline({ scrollTrigger: { trigger: ".thoughts", start: "top top", end: "bottom bottom", scrub: 0.5 } });
  lines.forEach((li, i) => {
    tl.fromTo(li, { opacity: 0, y: 60, scale: 0.94, filter: "blur(6px)" }, { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.5, ease: "power2.out" }, i)
      .to(li, { opacity: 0, y: -70, scale: 1.04, filter: "blur(4px)", duration: 0.5, ease: "power2.in" }, i + 0.6);
  });

  // constellation draws itself
  const path = document.getElementById("starPath"), L = path.getTotalLength();
  gsap.set(path, { strokeDasharray: L, strokeDashoffset: L });
  gsap.to(path, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: ".constellation", start: "top 75%", end: "bottom 60%", scrub: true } });
  gsap.from("#starList li", { opacity: 0, scale: 0.6, stagger: 0.08, duration: 0.5, ease: "back.out(2)", scrollTrigger: { trigger: ".constellation", start: "top 70%", once: true } });

  gsap.from(".foot-name", { yPercent: 35, opacity: 0, ease: "none", scrollTrigger: { trigger: ".foot", start: "top 85%", end: "bottom bottom", scrub: true } });
  ScrollTrigger.create({ start: 80, end: "max", onToggle: (s) => document.querySelector(".bar").classList.toggle("solid", s.isActive) });

  // the journey ends at dawn: the world fades and rests while the regular sections take over
  gsap.to(canvas, { opacity: 0, ease: "none", scrollTrigger: { trigger: "#after", start: "top 90%", end: "top 20%", scrub: true } });
  ScrollTrigger.create({ trigger: "#after", start: "top top", onEnter: () => world && world.pause(), onLeaveBack: () => world && world.resume() });
  initMotion();

  ScrollTrigger.addEventListener("refresh", () => { computeKeys(); onScroll(); });
  addEventListener("load", () => ScrollTrigger.refresh());
} else {
  world && world.ignite();
}
computeKeys(); onScroll();

function introHero() {
  const name = document.querySelector(".hero-name");
  name.setAttribute("aria-label", "Sparsh Jain");
  name.querySelectorAll(".line").forEach((line) => { line.setAttribute("aria-hidden", "true"); line.innerHTML = line.textContent.split("").map((c) => '<span class="ch">' + c + "</span>").join(""); });
  gsap.timeline({ delay: 0.1 })
    .from(".hero-name .ch", { yPercent: 105, opacity: 0, rotate: 8, duration: 0.8, stagger: 0.035, ease: "power4.out" })
    .from(".hero-lead", { y: 24, opacity: 0, duration: 0.7, ease: "power3.out" }, "-=0.5")
    .from(".hero-cta", { y: 16, opacity: 0, duration: 0.6, ease: "power3.out" }, "-=0.45")
    .from(".bar", { y: -24, opacity: 0, duration: 0.6, ease: "power3.out" }, "-=0.6");
}

// ---------- night / day switch ----------
const skySwitch = document.getElementById("skySwitch");
const wash = document.createElement("div"); wash.className = "daywash"; document.body.appendChild(wash);
function setDay(on, instant) {
  skySwitch.setAttribute("aria-checked", String(on));
  document.body.classList.toggle("day", on);
  document.querySelector('meta[name="theme-color"]').content = on ? "#7fb6e8" : "#070a14";
  document.querySelectorAll("[data-day]").forEach((el) => { el.textContent = on ? el.dataset.day : el.dataset.night; });
  world && world.setDay(on, instant);
  if (!instant && hasGsap && !reduced) gsap.fromTo(wash, { opacity: 0 }, { opacity: on ? 0.35 : 0.0, duration: 0.5, ease: "power2.out", yoyo: true, repeat: 1 });
  sound.setDay(on);
  try { localStorage.setItem("sj-sky", on ? "day" : "night"); } catch (e) {}
}
skySwitch.addEventListener("click", () => setDay(skySwitch.getAttribute("aria-checked") !== "true"));
try { if (localStorage.getItem("sj-sky") === "day") setDay(true, true); } catch (e) {}

if (new URLSearchParams(location.search).has("enter")) enter(false);
if (new URLSearchParams(location.search).has("day")) setDay(true, true);
