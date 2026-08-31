import { Component, lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { lenis } from "../../lib/smoothScroll"
import {
  BREAKPOINTS,
  INITIAL_STATE,
  STATIC_STATE,
  buildProductTimeline,
} from "./productChoreography"
import ProductStoryContent, { ProductStaticContent } from "./ProductStoryContent"

const ProductCanvas = lazy(() => import("./ProductCanvas"))

gsap.registerPlugin(ScrollTrigger)

function hasWebGL() {
  try {
    const c = document.createElement("canvas")
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl"))
    )
  } catch {
    return false
  }
}

/* Keeps a GLB / WebGL failure from taking down the page — on error we simply
 * drop the canvas and let the static story content stand on its own. */
class CanvasBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err) {
    console.warn("[ProductExperience] 3D layer disabled:", err?.message || err)
    this.props.onFail?.()
  }
  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

export default function ProductExperience() {
  const reduced = useReducedMotion()
  const webgl = useMemo(() => hasWebGL(), [])

  const sectionRef = useRef(null)
  const pinRef = useRef(null)
  const glowRef = useRef(null)
  const petalsRef = useRef(null)
  const canvasHostRef = useRef(null)
  const stateRef = useRef({ ...(reduced ? STATIC_STATE : INITIAL_STATE) })

  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  const pointerEnabled = useMemo(() => {
    if (reduced || typeof window === "undefined") return false
    return window.matchMedia("(pointer: fine)").matches
  }, [reduced])

  // Phones / tablets / weak GPUs get a lighter renderer (lower DPR, no MSAA,
  // fewer lights, no clearcoat, capped framerate). Desktop is untouched.
  const lowPower = useMemo(() => {
    if (typeof window === "undefined") return false
    const coarse = window.matchMedia("(pointer: coarse)").matches
    const small = window.matchMedia("(max-width: 900px)").matches
    const weakCpu = (navigator.hardwareConcurrency || 8) <= 4
    const weakMem = (navigator.deviceMemory || 8) <= 4
    return coarse || small || weakCpu || weakMem
  }, [])

  // `useReducedMotion` can resolve after first paint — keep the shared pose
  // object in sync so the model reads the right starting state.
  useEffect(() => {
    if (reduced) Object.assign(stateRef.current, STATIC_STATE)
  }, [reduced])

  // --- Build the scrubbed timeline, one per breakpoint -------------------
  useLayoutEffect(() => {
    if (reduced || !webgl || failed) return
    if (!sectionRef.current || !pinRef.current) return

    const mm = gsap.matchMedia()
    const register = (query, key) =>
      mm.add(query, () => {
        const tl = buildProductTimeline({
          gsap,
          cfg: BREAKPOINTS[key],
          refs: {
            sectionEl: sectionRef.current,
            pinEl: pinRef.current,
            stateRef,
          },
        })
        return () => {
          tl.scrollTrigger?.kill()
          tl.kill()
        }
      })

    register("(min-width: 1025px)", "desktop")
    register("(min-width: 769px) and (max-width: 1024px)", "tablet")
    register("(max-width: 768px)", "mobile")

    return () => mm.revert()
  }, [reduced, webgl, failed])

  // --- Bridge Lenis <-> ScrollTrigger ----------------------------------
  useEffect(() => {
    if (!lenis) return
    const update = () => ScrollTrigger.update()
    lenis.on("scroll", update)
    return () => lenis.off("scroll", update)
  }, [])

  // --- Refresh triggers after async layout shifts --------------------
  useEffect(() => {
    if (!ready) return
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [ready])

  useEffect(() => {
    document.fonts?.ready?.then(() => ScrollTrigger.refresh())
    const onLoad = () => ScrollTrigger.refresh()
    window.addEventListener("load", onLoad)
    return () => window.removeEventListener("load", onLoad)
  }, [])

  // --- Drive the DOM decoration layers from the same state object -------
  useEffect(() => {
    const write = (s) => {
      if (glowRef.current) glowRef.current.style.opacity = String(s.glowOpacity)
      if (petalsRef.current) petalsRef.current.style.opacity = String(s.petalOpacity)
      if (canvasHostRef.current) canvasHostRef.current.style.opacity = String(s.canvasOpacity)
    }
    if (reduced) {
      write(STATIC_STATE)
      return
    }
    let raf = 0
    const tick = () => {
      write(stateRef.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  // --- Warm the GLB during idle time --------------------------------
  useEffect(() => {
    const run = () => import("./ProductModel")
    const ric = window.requestIdleCallback
    const id = ric ? ric(run) : setTimeout(run, 1500)
    return () => {
      if (ric && window.cancelIdleCallback) window.cancelIdleCallback(id)
      else clearTimeout(id)
    }
  }, [])

  const noCanvas = !webgl || failed

  return (
    <section
      ref={sectionRef}
      className={"product-exp" + (reduced ? " is-reduced" : "") + (noCanvas ? " is-fallback" : "")}
      aria-label="Mary Nassif Chbat GLOW cream"
    >
      <div ref={pinRef} className="product-exp__pin">
        <div ref={glowRef} className="product-exp__glow" aria-hidden="true" />
        <div ref={petalsRef} className="product-exp__petals" aria-hidden="true">
          <span />
          <span />
        </div>

        {!noCanvas && (
          <div ref={canvasHostRef} className="product-exp__canvas" style={{ opacity: 0 }} aria-hidden="true">
            <CanvasBoundary onFail={() => setFailed(true)}>
              <Suspense fallback={null}>
                <ProductCanvas
                  stateRef={stateRef}
                  reduced={!!reduced}
                  pointerEnabled={pointerEnabled}
                  lowPower={lowPower}
                  onReady={() => setReady(true)}
                />
              </Suspense>
            </CanvasBoundary>
            <div className={"pe-loader" + (ready ? " is-done" : "")} aria-hidden="true">
              <span className="pe-loader__ring" />
            </div>
          </div>
        )}

        <div className="product-exp__stage">
          {reduced || noCanvas ? <ProductStaticContent /> : <ProductStoryContent />}
        </div>
      </div>
    </section>
  )
}
