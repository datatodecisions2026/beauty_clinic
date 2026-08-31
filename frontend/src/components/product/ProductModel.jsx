import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { useFrame, useThree } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import { MODEL_URL } from "./productChoreography"

// Load the GLB once, up front. drei caches by URL so every consumer reuses it.
useGLTF.preload(MODEL_URL)

const TARGET_SIZE = 2.2 // normalised world size of the assembly's largest axis

function boxTop(obj) {
  return new THREE.Box3().setFromObject(obj).max.y
}

/**
 * Renders the cosmetic jar as a 3-level pivot rig and drives it from
 * `stateRef` (mutated by GSAP). No React state is touched on scroll / pointer.
 *
 *   floatGroup   idle float + pointer only        (never touched by GSAP)
 *     productGroup  overall orientation / pos / scale
 *       jarPivot    jar body + cream, counter-rotation
 *       capPivot    champagne lid, independent separation + spin
 */
export default function ProductModel({ stateRef, reduced, pointerEnabled, onReady }) {
  const floatRef = useRef(null)
  const productRef = useRef(null)
  const { scene } = useGLTF(MODEL_URL)
  const invalidate = useThree((s) => s.invalidate)

  // Clone the GLB and rebuild it as our own pivot hierarchy so the cap and jar
  // each rotate around a visually correct origin.
  const built = useMemo(() => {
    const src = scene.clone(true)
    src.updateMatrixWorld(true)

    let cap = null
    let jar = null
    let cream = null
    src.traverse((o) => {
      if (!o.isMesh) return
      const n = o.name.toLowerCase()
      if (n.includes("lid") || n.includes("cap")) cap = o
      else if (n.includes("jar")) jar = o
      else if (n.includes("cream")) cream = o
      o.castShadow = false
      o.receiveShadow = false
      o.frustumCulled = false
      if (o.material) {
        o.material.envMapIntensity = 0.55
        o.material.needsUpdate = true
      }
    })

    // Fallback if the mesh names ever change: the cap is the highest mesh.
    if (!cap || !jar) {
      const meshes = []
      src.traverse((o) => o.isMesh && meshes.push(o))
      meshes.sort((a, b) => boxTop(b) - boxTop(a))
      cap = cap || meshes[0]
      jar = jar || meshes[1] || meshes[0]
    }

    // Pivot points in the GLB's own (identity) space.
    const capRest = new THREE.Box3().setFromObject(cap).getCenter(new THREE.Vector3())
    const jarBox = new THREE.Box3().setFromObject(jar)
    if (cream) jarBox.expandByObject(cream)
    const jarRest = jarBox.getCenter(new THREE.Vector3())

    const capPivot = new THREE.Group()
    capPivot.name = "capPivot"
    capPivot.position.copy(capRest)
    cap.position.sub(capRest)
    capPivot.add(cap)

    const jarPivot = new THREE.Group()
    jarPivot.name = "jarPivot"
    jarPivot.position.copy(jarRest)
    ;[jar, cream].filter(Boolean).forEach((m) => {
      m.position.sub(jarRest)
      jarPivot.add(m)
    })

    const assembly = new THREE.Group()
    assembly.add(jarPivot, capPivot)
    assembly.updateMatrixWorld(true)

    // Recentre the whole assembly on the origin.
    const aBox = new THREE.Box3().setFromObject(assembly)
    const aCenter = aBox.getCenter(new THREE.Vector3())
    const aSize = aBox.getSize(new THREE.Vector3())
    jarPivot.position.sub(aCenter)
    capPivot.position.sub(aCenter)
    const capRestLocal = capRest.clone().sub(aCenter)

    const norm = new THREE.Group()
    norm.add(assembly)
    norm.scale.setScalar(TARGET_SIZE / Math.max(aSize.x, aSize.y, aSize.z))

    return { norm, capPivot, jarPivot, capRestLocal }
  }, [scene])

  useEffect(() => {
    onReady?.()
    // nudge a few frames so on-demand (reduced-motion) renders settle
    let n = 0
    const pump = () => {
      invalidate()
      if (++n < 12) requestAnimationFrame(pump)
    }
    pump()
  }, [onReady, invalidate])

  // ---- pointer parallax (desktop, fine pointer, motion allowed) -----------
  const ptr = useRef({ x: 0, y: 0 })
  const ptrTarget = useRef({ x: 0, y: 0 })
  useEffect(() => {
    if (!pointerEnabled) {
      ptrTarget.current = { x: 0, y: 0 }
      return
    }
    const onMove = (e) => {
      ptrTarget.current.x = (e.clientX / window.innerWidth) * 2 - 1
      ptrTarget.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => window.removeEventListener("pointermove", onMove)
  }, [pointerEnabled])

  useFrame((_, delta) => {
    const s = stateRef.current
    const t = performance.now() * 0.001
    const k = 1 - Math.pow(0.0015, delta)
    ptr.current.x += (ptrTarget.current.x - ptr.current.x) * k
    ptr.current.y += (ptrTarget.current.y - ptr.current.y) * k

    // FLOAT GROUP — idle bob + pointer only. GSAP never writes here, so the
    // subtle motion can't fight the scroll-driven transforms.
    const f = floatRef.current
    if (f) {
      f.position.y = reduced ? 0 : Math.sin(t * 0.5) * 0.03
      f.rotation.set(
        reduced ? 0 : ptr.current.y * 0.045,
        reduced ? 0 : ptr.current.x * 0.08,
        reduced ? 0 : Math.sin(t * 0.4) * 0.012
      )
    }

    // PRODUCT GROUP — GSAP-driven overall orientation / position / scale
    const p = productRef.current
    if (p) {
      p.position.set(s.px, s.py, s.pz)
      p.rotation.set(s.rx, s.ry, s.rz)
      p.scale.setScalar(s.scale)
    }

    // JAR PIVOT — counter-rotation against the cap
    built.jarPivot.rotation.set(0, s.jarRy, 0)

    // CAP PIVOT — independent separation + spin around its own centre
    const r = built.capRestLocal
    built.capPivot.position.set(r.x + s.capX, r.y + s.capY, r.z + s.capZ)
    built.capPivot.rotation.set(s.capRx, s.capRy, s.capRz)
  })

  return (
    <group ref={floatRef} dispose={null}>
      <group ref={productRef}>
        <primitive object={built.norm} />
      </group>
    </group>
  )
}
