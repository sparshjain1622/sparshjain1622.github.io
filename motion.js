// Shared motion for the content sections and inner pages: headings wipe in, blocks rise, cards tilt toward the hand.
export function initMotion() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !window.gsap) { document.documentElement.classList.add("no-motion"); return; }
  gsap.registerPlugin(ScrollTrigger);

  gsap.utils.toArray(".wipe").forEach((el) => gsap.to(el, { clipPath: "inset(0 0% 0 0)", duration: 1.1, ease: "power4.out", scrollTrigger: { trigger: el, start: "top 85%", once: true } }));

  // rise in groups, so siblings stagger instead of arriving one by one
  const groups = new Map();
  gsap.utils.toArray(".rise").forEach((el) => { const k = el.parentElement; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(el); });
  groups.forEach((els, parent) => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: parent, start: "top 82%", once: true } }));

  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    gsap.utils.toArray(".tilt").forEach((card) => {
      const base = getComputedStyle(card).transform;
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, { rotateY: x * 14, rotateX: -y * 12, transformPerspective: 900, duration: 0.35, ease: "power2.out" });
      });
      card.addEventListener("pointerleave", () => gsap.to(card, { rotateX: 0, rotateY: card.classList.contains("cover-3d") ? (card.classList.contains("alt") ? 18 : -18) : 0, duration: 0.6, ease: "power3.out" }));
      void base;
    });
  }
}
