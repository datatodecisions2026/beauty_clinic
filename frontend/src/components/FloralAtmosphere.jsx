import { useEffect, useMemo, useRef, useState } from "react"

/* ============================================================================
 * FLORAL ATMOSPHERE — luxury floating rose & petal backdrop for the hero.
 *
 * Uses the real SVG assets in /public: rose.svg + petal.svg (CSS-masked so the
 * black silhouettes take on the page's warm champagne / blush / gold palette).
 *
 * Everything tunable lives in CONFIG below. Nothing here re-renders React on
 * mouse move — cursor response is written straight to the DOM inside one rAF
 * loop that parks itself when the scene settles.
 * ==========================================================================*/

const CONFIG = {
  // How many elements per viewport class.
  counts: {
    desktop: { roses: 4, petals: 9 },
    tablet: { roses: 3, petals: 6 },
    mobile: { roses: 2, petals: 3 },
  },

  // Opacity windows — kept low so flowers read as atmosphere, not graphics.
  opacity: {
    rose: [0.08, 0.18],
    petal: [0.12, 0.3],
  },

  // Autonomous floating drift.
  float: {
    distance: [15, 40], // px travelled across a full cycle
    rotate: [8, 20], // deg of extra sway at mid-cycle
    scalePulse: [1.02, 1.06], // subtle breathing at mid-cycle
    delayMax: 12, // s of negative offset so nothing starts in sync
  },

  // Pointer interaction (desktop / fine-pointer only).
  cursor: {
    radius: 190, // px — influence distance around the cursor
    push: 22, // px — max displacement of the closest element
    ease: 0.075, // approach / return easing (soft + slow)
    lightSize: 640, // px — diameter of the ambient cursor glow
    lightEase: 0.12,
  },

  // Depth layers. `push` scales the cursor reaction; foreground reacts most.
  layers: {
    bg: { sizeBase: 320, dur: [15, 20], push: 0.3, z: 0 },
    mid: { sizeBase: 150, dur: [12, 17], push: 0.65, z: 1 },
    fg: { sizeBase: 70, dur: [10, 15], push: 1, z: 2 },
  },

  // Per-shape size multiplier against its layer's sizeBase.
  shapeScale: {
    rose: [1.9, 2.7],
    petal: [0.5, 0.95],
  },

  // Warm tints (page tokens: gold #C5A880, champagne #DAC0A3, soft blush).
  tint: {
    bg: "#C5A880",
    mid: "#DAC0A3",
    fg: "#E7CBC1",
  },

  // Rects (fractions of the hero box) that hold real content. Elements that
  // land inside are dimmed rather than moved, so text/illustration always win.
  protect: [
    { x: [0.02, 0.46], y: [0.12, 0.92] }, // headline / script / sub / CTA
    { x: [0.5, 0.99], y: [0.06, 0.98] }, // hero illustration + orb
  ],
  protectDim: 0.42, // multiplier applied to opacity inside a protected rect
}

/* mulberry32 — tiny deterministic PRNG so the layout is stable across renders */
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function getBucket() {
  if (typeof window === "undefined") return "desktop"
  const w = window.innerWidth
  if (w <= 600) return "mobile"
  if (w <= 1024) return "tablet"
  return "desktop"
}

function inProtected(x, y) {
  return CONFIG.protect.some(
    (r) => x >= r.x[0] && x <= r.x[1] && y >= r.y[0] && y <= r.y[1]
  )
}

// Bias a uniform value toward the edges of the [0,1] range (keeps flowers in
// the negative space around the centred hero content).
function edgeBias(u, strength) {
  const k = strength
  return u < 0.5
    ? Math.pow(u * 2, k) / 2
    : 1 - Math.pow((1 - u) * 2, k) / 2
}

function buildScene(bucket) {
  const rng = mulberry32(0x9e37 + bucket.length * 101)
  const rand = (a, b) => a + rng() * (b - a)
  const pick = ([a, b]) => rand(a, b)
  const sign = () => (rng() < 0.5 ? -1 : 1)

  const { roses, petals } = CONFIG.counts[bucket]
  const items = []

  const make = (shape, idx, layer) => {
    const L = CONFIG.layers[layer]
    const size = L.sizeBase * pick(CONFIG.shapeScale[shape])

    // position, pushed toward the edges; y biased less than x
    const px = edgeBias(rng(), 1.7)
    const py = edgeBias(rng(), 1.25)
    const dim = inProtected(px, py) ? CONFIG.protectDim : 1
    const baseOpacity = pick(CONFIG.opacity[shape]) * dim

    const r0 = rand(-25, 25)
    return {
      key: `${shape}-${layer}-${idx}`,
      shape,
      layer,
      z: L.z,
      size,
      left: px * 100,
      top: py * 100,
      opacity: baseOpacity,
      push: L.push,
      style: {
        "--src": `url(/${shape}.svg)`,
        "--tint": CONFIG.tint[layer],
        "--fx": `${sign() * pick(CONFIG.float.distance)}px`,
        "--fy": `${sign() * pick(CONFIG.float.distance)}px`,
        "--r0": `${r0}deg`,
        "--r1": `${r0 + sign() * pick(CONFIG.float.rotate)}deg`,
        "--s1": pick(CONFIG.float.scalePulse),
        "--dur": `${pick(L.dur)}s`,
        "--delay": `${-rand(0, CONFIG.float.delayMax)}s`,
      },
    }
  }

  const roseBg = Math.ceil(roses * 0.5)
  for (let i = 0; i < roses; i++) {
    items.push(make("rose", i, i < roseBg ? "bg" : "mid"))
  }
  const petalMid = Math.floor(petals * 0.35)
  for (let i = 0; i < petals; i++) {
    items.push(make("petal", i, i < petalMid ? "mid" : "fg"))
  }
  return items
}

export default function FloralAtmosphere() {
  const [bucket, setBucket] = useState(getBucket)
  const [reduced, setReduced] = useState(false)

  const rootRef = useRef(null)
  const lightRef = useRef(null)
  const itemRefs = useRef([])
  const pointer = useRef({ x: 0, y: 0, inside: false })
  const offsets = useRef([]) // current lerped displacement per item
  const light = useRef({ x: 0, y: 0 })
  const raf = useRef(0)

  // viewport class + reduced-motion, kept in sync
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const syncMotion = () => setReduced(mq.matches)
    const syncBucket = () => setBucket(getBucket())
    syncMotion()
    mq.addEventListener("change", syncMotion)
    window.addEventListener("resize", syncBucket)
    return () => {
      mq.removeEventListener("change", syncMotion)
      window.removeEventListener("resize", syncBucket)
    }
  }, [])

  const interactive = useMemo(() => {
    if (typeof window === "undefined") return false
    if (reduced || bucket === "mobile") return false
    return !window.matchMedia("(pointer: coarse)").matches
  }, [reduced, bucket])

  const items = useMemo(
    () => buildScene(reduced ? "mobile" : bucket),
    [bucket, reduced]
  )

  useEffect(() => {
    offsets.current = items.map(() => ({ x: 0, y: 0 }))
    itemRefs.current = itemRefs.current.slice(0, items.length)
  }, [items])

  useEffect(() => {
    if (!interactive) return

    const { radius, push, ease, lightEase } = CONFIG.cursor

    const frame = () => {
      const p = pointer.current
      let busy = false

      for (let i = 0; i < items.length; i++) {
        const el = itemRefs.current[i]
        if (!el) continue
        const off = offsets.current[i]
        let tx = 0
        let ty = 0

        if (p.inside) {
          const r = el.getBoundingClientRect()
          const dx = r.left + r.width / 2 - p.x
          const dy = r.top + r.height / 2 - p.y
          const dist = Math.hypot(dx, dy)
          if (dist < radius && dist > 0.01) {
            const f = (1 - dist / radius) * push * items[i].push
            tx = (dx / dist) * f
            ty = (dy / dist) * f
          }
        }

        off.x += (tx - off.x) * ease
        off.y += (ty - off.y) * ease
        if (Math.abs(off.x - tx) > 0.05 || Math.abs(off.y - ty) > 0.05) busy = true
        el.style.transform = `translate3d(${off.x.toFixed(2)}px, ${off.y.toFixed(2)}px, 0)`
      }

      const L = light.current
      L.x += (p.x - L.x) * lightEase
      L.y += (p.y - L.y) * lightEase
      if (lightRef.current) {
        lightRef.current.style.transform = `translate3d(${L.x.toFixed(1)}px, ${L.y.toFixed(1)}px, 0)`
      }
      if (Math.abs(p.x - L.x) > 0.5 || Math.abs(p.y - L.y) > 0.5) busy = true

      raf.current = busy ? requestAnimationFrame(frame) : 0
    }

    const wake = () => {
      if (!raf.current) raf.current = requestAnimationFrame(frame)
    }
    const onMove = (e) => {
      const root = rootRef.current
      if (!root) return
      const b = root.getBoundingClientRect()
      const inside =
        e.clientX >= b.left &&
        e.clientX <= b.right &&
        e.clientY >= b.top &&
        e.clientY <= b.bottom
      pointer.current = { x: e.clientX, y: e.clientY, inside }
      root.classList.toggle("is-active", inside)
      wake()
    }
    const onLeave = (e) => {
      // only when the pointer actually leaves the document / window
      if (e && e.type === "pointerout" && e.relatedTarget) return
      pointer.current.inside = false
      rootRef.current?.classList.remove("is-active")
      wake()
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    document.addEventListener("pointerout", onLeave, { passive: true })
    window.addEventListener("blur", onLeave)
    return () => {
      window.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerout", onLeave)
      window.removeEventListener("blur", onLeave)
      if (raf.current) cancelAnimationFrame(raf.current)
      raf.current = 0
    }
  }, [interactive, items])

  return (
    <div
      ref={rootRef}
      className={"floral-atmosphere" + (reduced ? " is-reduced" : "")}
      aria-hidden="true"
    >
      {interactive && (
        <div
          ref={lightRef}
          className="floral-cursor-light"
          style={{ "--cl-size": `${CONFIG.cursor.lightSize}px` }}
        />
      )}

      {items.map((it, i) => (
        <div
          key={it.key}
          ref={(el) => (itemRefs.current[i] = el)}
          className="floral-item"
          style={{
            left: `${it.left}%`,
            top: `${it.top}%`,
            width: `${it.size}px`,
            height: `${it.size}px`,
            zIndex: it.z,
          }}
        >
          <span
            className="floral-item__inner"
            style={{ ...it.style, opacity: it.opacity }}
          />
        </div>
      ))}
    </div>
  )
}
