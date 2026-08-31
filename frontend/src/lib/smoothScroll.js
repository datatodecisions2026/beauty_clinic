import Lenis from "lenis"

/* Single global Lenis instance. Kept in its own module so animation code
 * (GSAP ScrollTrigger) can import the same instance without pulling in the
 * app entry point. */
export const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
})

function raf(time) {
  lenis.raf(time)
  requestAnimationFrame(raf)
}
requestAnimationFrame(raf)
