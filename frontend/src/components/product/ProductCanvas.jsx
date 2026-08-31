import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Environment, Lightformer, Preload } from "@react-three/drei"
import ProductModel from "./ProductModel"
import { CAMERA, CAMERA_Z, EXPOSURE, LIGHTS } from "./productChoreography"

/* Soft, diffused contact shadow — a radial gradient on a ground plane. Cheaper
 * and softer than a real shadow map, and fully drivable from `stateRef`. */
function SoftShadow({ stateRef }) {
  const ref = useRef(null)
  const texture = useMemo(() => {
    const size = 256
    const c = document.createElement("canvas")
    c.width = c.height = size
    const ctx = c.getContext("2d")
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, "rgba(74,58,42,0.85)")
    g.addColorStop(0.45, "rgba(74,58,42,0.35)")
    g.addColorStop(1, "rgba(74,58,42,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])

  useEffect(() => () => texture.dispose(), [texture])

  useFrame(() => {
    const m = ref.current
    if (!m) return
    const s = stateRef.current
    m.material.opacity = s.shadowOpacity
    const sc = 2.6 * s.shadowScale
    m.scale.set(sc, sc, sc)
  })

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} opacity={0} />
    </mesh>
  )
}

/* Lighting rig + per-frame reads of the animated state. Also owns the
 * canvas-layer fade so opacity stays out of React. */
function Rig({ stateRef, reduced }) {
  const keyRef = useRef(null)
  const rimRef = useRef(null)
  const invalidate = useThree((state) => state.invalidate)

  // Reduced-motion runs on-demand — nudge a few frames so the scene settles.
  useEffect(() => {
    if (!reduced) return
    const id = setInterval(invalidate, 120)
    const stop = setTimeout(() => clearInterval(id), 1800)
    return () => { clearInterval(id); clearTimeout(stop) }
  }, [invalidate, reduced])

  useFrame((state, delta) => {
    const s = stateRef.current
    if (keyRef.current) keyRef.current.intensity = s.keyIntensity
    if (rimRef.current) rimRef.current.intensity = s.rimIntensity
    // Subtle dolly — eased toward CAMERA_Z + camDolly so it can't snap.
    const cam = state.camera
    const targetZ = CAMERA_Z + s.camDolly
    const kk = reduced ? 1 : 1 - Math.pow(0.02, delta)
    cam.position.z += (targetZ - cam.position.z) * kk
  })

  return (
    <>
      <ambientLight intensity={LIGHTS.ambient.intensity} color={LIGHTS.ambient.color} />
      <directionalLight ref={keyRef} position={LIGHTS.key.position} color={LIGHTS.key.color} intensity={1} />
      <directionalLight position={LIGHTS.fill.position} color={LIGHTS.fill.color} intensity={LIGHTS.fill.intensity} />
      <directionalLight ref={rimRef} position={LIGHTS.rim.position} color={LIGHTS.rim.color} intensity={0.4} />
      <directionalLight position={LIGHTS.top.position} color={LIGHTS.top.color} intensity={LIGHTS.top.intensity} />
      <directionalLight position={LIGHTS.under.position} color={LIGHTS.under.color} intensity={LIGHTS.under.intensity} />

      {/* Inline soft-box environment — no external HDR, keeps reflections gentle.
          Lightformers surround the product so the champagne cap keeps clean
          highlights from every angle as it tilts and floats. */}
      <Environment resolution={128} environmentIntensity={LIGHTS.envIntensity}>
        <Lightformer form="rect" intensity={3.0} color="#fff6ec" position={[0, 3, 2]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#f6e6d2" position={[-4, 1, 2]} scale={[3, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#ffedd8" position={[4, 0.5, 3]} scale={[3, 3, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#fff4e6" position={[0, 4.5, 0.5]} scale={[4, 2, 1]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer form="circle" intensity={1.8} color="#ffffff" position={[0, 1, -4]} scale={[5, 5, 1]} />
      </Environment>
    </>
  )
}

export default function ProductCanvas({ stateRef, reduced, pointerEnabled, onReady }) {
  const hostRef = useRef(null)
  const [active, setActive] = useState(true)

  // Only run the render loop while the section is near the viewport.
  useEffect(() => {
    const el = hostRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: "40% 0px 40% 0px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const frameloop = reduced ? "demand" : active ? "always" : "never"

  return (
    <div ref={hostRef} style={{ position: "absolute", inset: 0 }}>
      <Canvas
        frameloop={frameloop}
        dpr={[1, reduced ? 1.5 : 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={CAMERA}
        style={{ pointerEvents: "none" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = EXPOSURE
        }}
      >
        <Rig stateRef={stateRef} reduced={reduced} />
        <SoftShadow stateRef={stateRef} />
        <Suspense fallback={null}>
          <ProductModel
            stateRef={stateRef}
            reduced={reduced}
            pointerEnabled={pointerEnabled}
            onReady={onReady}
          />
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  )
}
