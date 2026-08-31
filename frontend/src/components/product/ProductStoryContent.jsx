import { Link } from "react-router-dom"

/* Two scroll states bookending the 3D cap choreography. Positioned by CSS
 * (.pe-state--a / --d) and faded in/out by the shared GSAP timeline, which
 * finds them by class. The middle of the section is carried by the 3D film. */
export default function ProductStoryContent() {
  return (
    <div className="pe-stage-inner">
      <div className="pe-state pe-state--a">
        <span className="section-tag">The Ritual</span>
        <h2 className="pe-headline">Glow</h2>
        <p className="pe-copy">Your daily ritual for skin that looks lit from within.</p>
      </div>

      <div className="pe-state pe-state--d">
        <span className="pe-script">Mary Nassif Chbat</span>
        <h2 className="pe-headline pe-headline--finale">Glow</h2>
        <p className="pe-copy">The finishing touch to a confident, radiant complexion.</p>
        <Link to="/bookings" className="btn-premium">
          <span>Book a Consultation</span>
          <i className="fas fa-arrow-right" />
        </Link>
      </div>
    </div>
  )
}

/* Reduced-motion / fallback: one calm, fully-accessible campaign block. */
export function ProductStaticContent() {
  return (
    <div className="pe-stage-inner pe-stage-inner--static">
      <div className="pe-state pe-state--static">
        <span className="pe-script">Mary Nassif Chbat</span>
        <h2 className="pe-headline">Glow</h2>
        <p className="pe-copy">
          A warm, cream-textured daily ritual — deep hydration and light-reflecting
          radiance for skin that looks lit from within.
        </p>
        <Link to="/bookings" className="btn-premium">
          <span>Book a Consultation</span>
          <i className="fas fa-arrow-right" />
        </Link>
      </div>
    </div>
  )
}
