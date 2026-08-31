/* ============================================================================
 * PRODUCT CHOREOGRAPHY — one coordinated scroll-scrubbed master timeline.
 *
 * The 3D jar never talks to React. GSAP tweens the plain `stateRef.current`
 * object below; <ProductModel> reads it every frame and writes straight to the
 * three.js pivots. Every value here is a tuning knob.
 *
 * Group hierarchy the state drives (see ProductModel.jsx):
 *
 *   floatGroup      idle float + pointer only — NEVER touched by GSAP
 *     productGroup  px/py/pz + rx/ry/rz + scale   (whole-assembly orientation)
 *       jarPivot    jarRy                          (counter-rotation)
 *       capPivot    capX/capY/capZ + capRx/capRy/capRz  (independent cap)
 *
 * Phase map (scroll progress → timeline position, 0..1):
 *   0.00  entry → hero pose
 *   0.10  hero settled, holds so the viewer reads the product
 *   0.15  begin true-3D rotation
 *   0.35  cap/top tilted toward the camera
 *   0.45  cap begins separating
 *   0.60  cap floating beside the jar (jar counter-rotates)
 *   0.72  fully-open showcase (subtle dolly-in, cream visible)
 *   0.82  reassembly begins
 *   0.95  cap reconnects (curved return)
 *   1.00  final three-quarter hero pose (+ 1.0 → 1.05 scale)
 * ==========================================================================*/

export const MODEL_URL = "/model/mary-nassif-glow-cream.glb"

/* Camera — mostly static. `camDolly` in the state adds to position.z. */
export const CAMERA = { fov: 34, position: [0, 0.5, 6.6], near: 0.1, far: 24 }
export const CAMERA_Z = CAMERA.position[2]
export const EXPOSURE = 1.06

/* Warm studio lighting. keyIntensity / rimIntensity are animated by the timeline
 * so highlights stay attractive as the assembly rotates through 3D. */
export const LIGHTS = {
  ambient: { intensity: 0.66, color: "#fff4e8" },
  key: { position: [3.2, 4.2, 5.0], color: "#fff1df" },
  fill: { position: [-4.5, 0.8, 2.4], intensity: 0.5, color: "#f5e9dd" },
  rim: { position: [-1.8, 3.4, -4.2], color: "#ffe7cc" },
  top: { position: [0.6, 5.0, 1.2], intensity: 0.5, color: "#fff2e2" }, // catches the cap top on the tilt
  under: { position: [0, -2.2, 3.0], intensity: 0.32, color: "#ffeede" }, // lifts the cap's underside when it floats
  envIntensity: 0.62,
}

/* Full state shape. GSAP mutates this object in place; ProductModel reads it. */
export const INITIAL_STATE = {
  // productGroup
  px: 0, py: -1.25, pz: -0.7,
  rx: 0.06, ry: -0.55, rz: 0,
  scale: 0.6,
  // jarPivot
  jarRy: 0,
  // capPivot (offsets from its rest position, in model units)
  capX: 0, capY: 0, capZ: 0,
  capRx: 0, capRy: 0, capRz: 0,
  // camera dolly (added to CAMERA_Z; negative = closer)
  camDolly: 0,
  // lighting + decoration
  keyIntensity: 0.9,
  rimIntensity: 0.35,
  shadowOpacity: 0.0,
  shadowScale: 1.15,
  canvasOpacity: 0.0,
  glowOpacity: 0.0,
  petalOpacity: 0.1,
}

/* prefers-reduced-motion — a single calm three-quarter hero shot, no timeline. */
export const STATIC_STATE = {
  px: 0, py: 0, pz: 0,
  rx: 0.05, ry: -0.42, rz: 0,
  scale: 0.92,
  jarRy: 0,
  capX: 0, capY: 0, capZ: 0,
  capRx: 0, capRy: 0, capRz: 0,
  camDolly: 0,
  keyIntensity: 1.32,
  rimIntensity: 0.9,
  shadowOpacity: 0.26,
  shadowScale: 1.1,
  canvasOpacity: 1,
  glowOpacity: 0.6,
  petalOpacity: 0.08,
}

/* ---------------------------------------------------------------------------
 * Desktop keyframes (full cinematic amplitude). Tablet / mobile are derived
 * from these by damping the rotation + cap-travel fields (see deriveFrames).
 * ------------------------------------------------------------------------- */
const DESKTOP_FRAMES = {
  hero: {
    px: 0, py: 0, pz: 0, rx: 0.05, ry: -0.12, rz: 0, scale: 1.0,
    jarRy: 0, capX: 0, capY: 0, capZ: 0, capRx: 0, capRy: 0, capRz: 0, camDolly: 0,
    keyIntensity: 1.12, rimIntensity: 0.4, shadowOpacity: 0.32, shadowScale: 1.15,
    canvasOpacity: 1, glowOpacity: 0.55, petalOpacity: 0.1,
  },
  // 15 → 35 %: tilt the whole assembly so the cap top faces the camera
  tilt: {
    rx: 1.05, ry: 0.16, rz: 0.08,
    keyIntensity: 1.2, rimIntensity: 0.5, glowOpacity: 0.56, petalOpacity: 0.08, shadowScale: 1.2,
  },
  // 35 → 45 %: cap lifts a touch off the rim, small tumble as it releases
  separate: {
    rx: 1.0, ry: 0.14, rz: 0.06,
    capY: 0.16, capRx: -0.08, capRz: 0.05,
    shadowScale: 1.28,
  },
  // 45 → 60 %: cap rises above the jar with a slight drift right; jar counter-rotates
  floatBeside: {
    py: 0.06, rx: 0.82, ry: 0.1, rz: 0.04, jarRy: -0.5,
    capX: 0.4, capY: 0.62, capZ: 0.2, capRx: -0.5, capRy: 0.55, capRz: 0.12,
    camDolly: -0.2,
    keyIntensity: 1.3, rimIntensity: 0.72, shadowOpacity: 0.24, shadowScale: 1.42,
    glowOpacity: 0.6, petalOpacity: 0.05,
  },
  // 60 → 72 %: open showcase — jar angled to camera, cream visible, dolly closest
  openShow: {
    py: 0.08, rx: 0.5, ry: 0.05, rz: 0.02, jarRy: -0.34,
    capX: 0.44, capY: 0.72, capZ: 0.24, capRx: -0.32, capRy: 0.4, capRz: 0.08,
    camDolly: -0.44, scale: 1.03,
    keyIntensity: 1.38, rimIntensity: 0.82, shadowOpacity: 0.19, shadowScale: 1.5,
    glowOpacity: 0.66, petalOpacity: 0.04,
  },
  // 72 → 82 %: reassembly begins — cap starts its curved return
  reassembly: {
    py: 0.2, rx: 0.34, ry: 0.03, rz: 0.02, jarRy: -0.18,
    capX: 0.2, capY: 0.44, capZ: 0.12, capRx: -0.16, capRy: 0.18, capRz: 0.05,
    camDolly: -0.24, scale: 1.02,
  },
  // 82 → 95 %: cap reconnects — swings in first, then lowers into place
  reconnect: {
    py: 0.46, rx: 0.14, ry: -0.06, rz: 0, jarRy: 0,
    capX: 0, capY: 0.04, capZ: 0, capRx: 0, capRy: 0, capRz: 0,
    camDolly: -0.05, scale: 1.0, shadowOpacity: 0.26, shadowScale: 1.2,
  },
  // 95 → 100 %: final recognizable three-quarter hero, small scale bump
  finalHero: {
    py: 0.52, rx: 0.08, ry: -0.5, rz: 0, jarRy: 0,
    capX: 0, capY: 0, capZ: 0, capRx: 0, capRy: 0, capRz: 0, camDolly: 0,
    scale: 1.05,
    keyIntensity: 1.42, rimIntensity: 0.95, shadowOpacity: 0.16, shadowScale: 1.3,
    glowOpacity: 0.64, petalOpacity: 0.05,
  },
}

/* ---------------------------------------------------------------------------
 * Mobile keyframes — a deliberately simpler sequence: the jar arrives, the
 * lid opens, holds open, then closes back to a three-quarter hero. No orbit,
 * no counter-rotation, no camera move — fewer animated properties per frame
 * keeps the scrub light so it never chunks or lags, while the lighting +
 * easing keep the premium feel.
 * ------------------------------------------------------------------------- */
const MOBILE_FRAMES = {
  hero: {
    px: 0, py: 0.1, pz: 0, rx: 0.06, ry: -0.16, rz: 0, scale: 0.62,
    jarRy: 0, capX: 0, capY: 0, capZ: 0, capRx: 0, capRy: 0, capRz: 0, camDolly: 0,
    keyIntensity: 1.14, rimIntensity: 0.42, shadowOpacity: 0.3, shadowScale: 1.15,
    canvasOpacity: 1, glowOpacity: 0.55, petalOpacity: 0.1,
  },
  // lid lifts up with a gentle tilt so you can see in; jar eases toward camera
  open: {
    py: 0.12, rx: 0.28, ry: -0.1, rz: 0.01, scale: 0.63,
    capY: 0.6, capZ: 0.05, capRx: -0.26, capRz: 0.02,
    keyIntensity: 1.3, rimIntensity: 0.62, shadowOpacity: 0.2, shadowScale: 1.34,
    glowOpacity: 0.62, petalOpacity: 0.06,
  },
  // seated again, settled into a clean three-quarter hero (+ small scale bump)
  closed: {
    py: 0.32, rx: 0.07, ry: -0.5, rz: 0, scale: 0.66,
    capY: 0, capZ: 0, capRx: 0, capRz: 0,
    keyIntensity: 1.36, rimIntensity: 0.88, shadowOpacity: 0.18, shadowScale: 1.24,
    glowOpacity: 0.64, petalOpacity: 0.06,
  },
}

const ROT_FIELDS = ["rx", "ry", "rz", "capRx", "capRy", "capRz", "jarRy"]
const TRAVEL_FIELDS = ["capX", "capY", "capZ", "camDolly"]

function deriveFrames(frames, { rot, travel, scaleMul }) {
  const out = {}
  for (const [name, frame] of Object.entries(frames)) {
    const g = { ...frame }
    for (const key of ROT_FIELDS) if (key in g) g[key] *= rot
    for (const key of TRAVEL_FIELDS) if (key in g) g[key] *= travel
    if ("scale" in g) g.scale *= scaleMul
    if ("py" in g) g.py *= scaleMul // keep the vertical lift proportional to jar size
    out[name] = g
  }
  return out
}

export const BREAKPOINTS = {
  desktop: { scrollVh: 3.2, scrub: 1.1, frames: deriveFrames(DESKTOP_FRAMES, { rot: 1, travel: 1, scaleMul: 1 }) },
  tablet: { scrollVh: 3.0, scrub: 1.1, frames: deriveFrames(DESKTOP_FRAMES, { rot: 0.72, travel: 0.72, scaleMul: 0.74 }) },
  mobile: { scrollVh: 2.0, scrub: 1.0, simple: true, frames: MOBILE_FRAMES },
}

/* ---------------------------------------------------------------------------
 * buildProductTimeline — one master GSAP timeline bound to ScrollTrigger.
 * gsap is injected so this module stays framework-free.
 * ------------------------------------------------------------------------- */
export function buildProductTimeline({ gsap, cfg, refs }) {
  const { sectionEl, pinEl, stateRef } = refs
  const s = stateRef.current
  const F = cfg.frames
  const textA = pinEl.querySelector(".pe-state--a")
  const textD = pinEl.querySelector(".pe-state--d")

  const makeTl = () =>
    gsap.timeline({
      defaults: { ease: "power2.inOut" },
      scrollTrigger: {
        trigger: sectionEl,
        start: "top top",
        end: () => "+=" + window.innerHeight * cfg.scrollVh,
        pin: pinEl,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: cfg.scrub,
        invalidateOnRefresh: true,
      },
    })

  // ---- MOBILE: arrive → open → hold → close. Few tweens, calm motion. -----
  if (cfg.simple) {
    Object.assign(s, INITIAL_STATE, {
      ...F.hero,
      py: F.hero.py - 1.25,
      pz: -0.7,
      rx: 0.06,
      ry: -0.55,
      scale: F.hero.scale * 0.6,
      canvasOpacity: 0,
      glowOpacity: 0,
      shadowOpacity: 0,
    })

    const tl = makeTl()
    // 0 → 14 %  entry → hero (rise in, fade the layer up)
    tl.to(s, { ...F.hero, duration: 0.14, ease: "power2.out" }, 0)
    tl.to(s, { canvasOpacity: 1, duration: 0.08, ease: "none" }, 0)
    // 14 → 22 %  hero holds (dead scroll — the jar just sits)
    // 22 → 48 %  lid opens
    tl.to(s, { ...F.open, duration: 0.26, ease: "power2.inOut" }, 0.22)
    // 48 → 66 %  holds open (premium dwell — no tween)
    // 66 → 92 %  lid closes, settles to a three-quarter hero
    tl.to(s, { ...F.closed, duration: 0.26, ease: "power2.inOut" }, 0.66)

    if (textA) {
      gsap.set(textA, { autoAlpha: 0, y: 18 })
      tl.fromTo(textA, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.05, ease: "power2.out" }, 0.03)
      tl.to(textA, { autoAlpha: 0, y: -14, duration: 0.06, ease: "power2.in" }, 0.2)
    }
    if (textD) {
      gsap.set(textD, { autoAlpha: 0, y: 18 })
      tl.fromTo(textD, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.06, ease: "power2.out" }, 0.82)
    }
    return tl
  }

  // Entry pose — derived from the hero frame so every breakpoint enters in
  // proportion. Reset here so resize re-builds start clean.
  Object.assign(s, INITIAL_STATE, {
    ...F.hero,
    py: F.hero.py - 1.25,
    pz: -0.7,
    rx: 0.06,
    ry: -0.55,
    scale: F.hero.scale * 0.6,
    canvasOpacity: 0,
    glowOpacity: 0,
    shadowOpacity: 0,
  })

  const tl = makeTl()

  // 0 → 10 %  ENTRY → HERO (rise in, fade the layer up). 10 → 15 % holds.
  tl.to(s, { ...F.hero, duration: 0.1, ease: "power2.out" }, 0)
  tl.to(s, { canvasOpacity: 1, duration: 0.06, ease: "none" }, 0)

  // 15 → 35 %  TILT TOWARD VIEWER — X rotation leads, small Y/Z for physicality
  tl.to(s, { ...F.tilt, duration: 0.2 }, 0.15)

  // 35 → 45 %  CAP SEPARATES — lifts off the rim with a small tumble
  tl.to(s, { ...F.separate, duration: 0.1 }, 0.35)

  // 45 → 60 %  CAP ARCS OUT beside the jar; jar counter-rotates.
  // capY / rotation lead; capX / capZ follow slightly later → curved path.
  tl.to(s, {
    py: F.floatBeside.py, rx: F.floatBeside.rx, ry: F.floatBeside.ry, rz: F.floatBeside.rz, jarRy: F.floatBeside.jarRy,
    capY: F.floatBeside.capY, capRx: F.floatBeside.capRx, capRy: F.floatBeside.capRy, capRz: F.floatBeside.capRz,
    camDolly: F.floatBeside.camDolly, keyIntensity: F.floatBeside.keyIntensity, rimIntensity: F.floatBeside.rimIntensity,
    shadowOpacity: F.floatBeside.shadowOpacity, shadowScale: F.floatBeside.shadowScale,
    glowOpacity: F.floatBeside.glowOpacity, petalOpacity: F.floatBeside.petalOpacity,
    duration: 0.15, ease: "sine.inOut",
  }, 0.45)
  tl.to(s, { capX: F.floatBeside.capX, capZ: F.floatBeside.capZ, duration: 0.12, ease: "power2.inOut" }, 0.47)

  // 60 → 72 %  OPEN SHOWCASE — jar angles to camera, subtle dolly-in
  tl.to(s, { ...F.openShow, duration: 0.12, ease: "sine.inOut" }, 0.6)

  // 72 → 82 %  REASSEMBLY BEGINS
  tl.to(s, { ...F.reassembly, duration: 0.1 }, 0.72)

  // 82 → 95 %  CAP RECONNECTS — curved return: swings in, then lowers
  tl.to(s, {
    capX: F.reconnect.capX, capZ: F.reconnect.capZ,
    capRx: F.reconnect.capRx, capRy: F.reconnect.capRy, capRz: F.reconnect.capRz,
    jarRy: F.reconnect.jarRy, ry: F.reconnect.ry, rz: F.reconnect.rz, camDolly: F.reconnect.camDolly,
    duration: 0.09, ease: "power2.inOut",
  }, 0.82)
  tl.to(s, {
    py: F.reconnect.py, capY: F.reconnect.capY, rx: F.reconnect.rx, scale: F.reconnect.scale,
    shadowOpacity: F.reconnect.shadowOpacity, shadowScale: F.reconnect.shadowScale,
    duration: 0.11, ease: "power2.inOut",
  }, 0.84)

  // 95 → 100 %  FINAL THREE-QUARTER HERO (+ 1.0 → 1.05 scale)
  tl.to(s, { ...F.finalHero, duration: 0.05, ease: "power2.out" }, 0.95)

  // --- Copy: intro line reads during the hero hold; sign-off holds at the end
  if (textA) {
    gsap.set(textA, { autoAlpha: 0, y: 20 })
    tl.fromTo(textA, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.04, ease: "power2.out" }, 0.02)
    tl.to(textA, { autoAlpha: 0, y: -18, duration: 0.05, ease: "power2.in" }, 0.16)
  }
  if (textD) {
    gsap.set(textD, { autoAlpha: 0, y: 20 })
    tl.fromTo(textD, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.05, ease: "power2.out" }, 0.9)
  }

  return tl
}
