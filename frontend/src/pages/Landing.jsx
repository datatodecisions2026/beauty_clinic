import { Link } from "react-router-dom"
import { useRef, useEffect, useState } from "react"
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { fadeUp, fadeIn, slideLeft, slideRight, stagger, letterUp, ease } from "../lib/motion"
import api from "../lib/api"
import GoogleReviewsWidget from "../components/GoogleReviewsWidget"
import DepthCarousel from "../components/DepthCarousel"
import FloatingParticles from "../components/FloatingParticles"
import FloralAtmosphere from "../components/FloralAtmosphere"
import Orb from "../components/Orb"
import ProductExperience from "../components/product/ProductExperience"

const MotionLink = motion.create(Link)

function ServiceTile({ s, i }) {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 350, damping: 30 })
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { stiffness: 350, damping: 30 })

  return (
    <MotionLink
      to="/bookings"
      className="service-tile"
      variants={fadeUp}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        mx.set((e.clientX - r.left) / r.width - 0.5)
        my.set((e.clientY - r.top) / r.height - 0.5)
      }}
      onMouseLeave={() => { mx.set(0); my.set(0) }}
    >
      <img src={s.img} alt={s.title} onError={e => e.target.src = "/img/makeup.jpg"} />
      <div className="service-tile-overlay" />
      <div className="service-tile-content">
        <span className="service-tile-num">{String(i + 1).padStart(2, "0")}</span>
        <h3 className="service-tile-name">{s.title}</h3>
        <p className="service-tile-desc">{s.desc}</p>
        <span className="service-tile-arrow">Book Now <i className="fas fa-arrow-right" /></span>
      </div>
    </MotionLink>
  )
}

// Featured services for the cinematic pinned scroll (La Prairie–style)
const FEATURED = [
  { title: "Artistic Makeup", img: "/img/makeup5.jpg", desc: "Natural looks that let your skin glow with a romantic, radiant finish — crafted for any occasion.", tag: "Makeup" },
  { title: "Facial Care", img: "/img/services-2.jpg", desc: "Personalized facial treatments for smoother, healthier, more luminous skin.", tag: "Skincare" },
  { title: "Bridal Makeup", img: "/img/makeup2.jpg", desc: "Stunning bridal looks designed to make you glow on your most special day.", tag: "Bridal" },
  { title: "Mesotherapy", img: "/img/services-4.jpg", desc: "A rejuvenating treatment combining advanced techniques for radiant, youthful skin.", tag: "Advanced" },
]

function PinnedShowcase() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })
  const [active, setActive] = useState(0)

  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      const idx = Math.min(FEATURED.length - 1, Math.floor(v * FEATURED.length))
      setActive(idx)
    })
  }, [scrollYProgress])

  const barScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section className="pinned-showcase" ref={ref} style={{ height: `${FEATURED.length * 100}vh` }}>
      <div className="pinned-sticky">
        <div className="container pinned-grid">
          {/* Left: crossfading images */}
          <div className="pinned-visual">
            {FEATURED.map((s, i) => (
              <motion.img
                key={s.title}
                src={s.img}
                alt={s.title}
                className="pinned-img"
                onError={(e) => (e.target.src = "/img/makeup.jpg")}
                animate={{
                  opacity: active === i ? 1 : 0,
                  scale: active === i ? 1 : 1.08,
                }}
                transition={{ duration: 0.8, ease }}
              />
            ))}
            <div className="pinned-visual-frame" />
            <div className="pinned-progress">
              <motion.div className="pinned-progress-fill" style={{ scaleY: barScale }} />
            </div>
          </div>

          {/* Right: changing text */}
          <div className="pinned-text">
            <span className="section-tag">Signature Treatments</span>
            <div className="pinned-index">
              <span className="pinned-index-cur">{String(active + 1).padStart(2, "0")}</span>
              <span className="pinned-index-sep">/</span>
              <span className="pinned-index-tot">{String(FEATURED.length).padStart(2, "0")}</span>
            </div>
            <div className="pinned-slides">
              {FEATURED.map((s, i) => (
                <motion.div
                  key={s.title}
                  className="pinned-slide"
                  animate={{
                    opacity: active === i ? 1 : 0,
                    y: active === i ? 0 : 24,
                    pointerEvents: active === i ? "auto" : "none",
                  }}
                  transition={{ duration: 0.55, ease }}
                >
                  <span className="pinned-slide-tag">{s.tag}</span>
                  <h2 className="pinned-slide-title">{s.title}</h2>
                  <p className="pinned-slide-desc">{s.desc}</p>
                  <Link to="/bookings" className="btn-premium">
                    <span>Book This</span>
                    <i className="fas fa-arrow-right" />
                  </Link>
                </motion.div>
              ))}
            </div>
            <div className="pinned-dots">
              {FEATURED.map((s, i) => (
                <span key={s.title} className={"pinned-dot" + (active === i ? " active" : "")} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const SERVICES = [
  { title: "Nail Care", img: "/img/nailcare.jpg", desc: "Expert nail care from classic treatments to stunning nail art. Enjoy healthy, stylish nails with personalized care and premium products." },
  { title: "Artistic Makeup", img: "/img/makeup5.jpg", desc: "Natural looks that let your skin glow with that romantic and sweet radiance perfect for any occasion." },
  { title: "Wax Care", img: "/img/waxcare.jpg", desc: "Professional wax care for smooth, flawless skin. Gentle, effective treatments tailored specifically to your needs." },
  { title: "Curling Eyelashes", img: "/img/services3.jpg", desc: "Eyelash perming that makes your eyes look bigger and brighter so effortless you can skip the mascara." },
  { title: "Facial Hair Removal", img: "/img/services-1.jpg", desc: "Fully licensed beauticians offering both temporary and permanent hair removal solutions." },
  { title: "Bridal Makeup", img: "/img/makeup2.jpg", desc: "Stunning bridal looks crafted to make you glow on your most special day." },
  { title: "Regular Makeup", img: "/img/makeup4.jpg", desc: "Cocktail parties, evening events, date nights, we bring out your best look for any occasion." },
  { title: "Facial Care", img: "/img/services-2.jpg", desc: "Personalized facial treatments for smoother, healthier, more radiant skin." },
  { title: "Mesotherapy", img: "/img/services-4.jpg", desc: "A rejuvenating treatment combining advanced techniques to deliver radiant, youthful skin." },
  { title: "Full Makeup", img: "/img/makeup1.jpg", desc: "A full spectrum of makeup services, bridal, regular, and artistic, tailored to your personal style." },
]

const HOURS = [
  ["Saturday","08:30 am - 6:00 pm"],["Sunday","08:30 am - 12:00 pm"],
  ["Monday","Closed"],["Tuesday","08:30 am - 6:00 pm"],
  ["Wednesday","Closed"],["Thursday","08:30 am - 6:00 pm"],["Friday","08:30 am - 6:00 pm"],
]


function CountUp({ target, suffix = "" }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!inView) return
    const end = parseInt(target)
    const startTime = performance.now()
    const duration = 1800
    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setCount(Math.round(eased * end))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, target])
  return <span ref={ref}>{count}{suffix}</span>
}

export default function Landing() {
  const { scrollY } = useScroll()
  const heroImgY = useTransform(scrollY, [0, 600], [0, -70])
  const heroBgY = useTransform(scrollY, [0, 600], [0, 40])

  // Hero mouse parallax
  const heroMouseX = useMotionValue(0)
  const heroMouseY = useMotionValue(0)
  const heroSpringX = useSpring(heroMouseX, { stiffness: 70, damping: 22 })
  const heroSpringY = useSpring(heroMouseY, { stiffness: 70, damping: 22 })
  const contentDriftX = useTransform(heroSpringX, [-0.5, 0.5], [-18, 18])
  const contentDriftY = useTransform(heroSpringY, [-0.5, 0.5], [-10, 10])
  const imgDriftX = useTransform(heroSpringX, [-0.5, 0.5], [28, -28])
  const imgDriftY = useTransform(heroSpringY, [-0.5, 0.5], [16, -16])

  const onHeroMouseMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    heroMouseX.set((e.clientX - r.left) / r.width - 0.5)
    heroMouseY.set((e.clientY - r.top) / r.height - 0.5)
  }
  const onHeroMouseLeave = () => { heroMouseX.set(0); heroMouseY.set(0) }

  // Google reviews for the depth carousel (proxied + cached by the backend)
  const { data: googleReviews } = useQuery({
    queryKey: ["google-reviews"],
    queryFn: async () => { const { data } = await api.get("/reviews/google"); return data },
    staleTime: 60 * 60 * 1000,
    retry: 1,
  })
  const reviewItems = (googleReviews?.reviews ?? []).filter(r => r.text)

  return (
    <>
      <section className="hero" onMouseMove={onHeroMouseMove} onMouseLeave={onHeroMouseLeave} style={{ position: "relative" }}>
        {/* Flowing aurora mesh — always-moving immersive background */}
        <div className="hero-orbs">
          <div className="aurora-blob aurora-blob--1" />
          <div className="aurora-blob aurora-blob--2" />
          <div className="aurora-blob aurora-blob--3" />
          <div className="aurora-blob aurora-blob--4" />
        </div>
        <FloatingParticles count={30} />
        <FloralAtmosphere />

        <motion.div className="container" style={{ y: heroBgY, position: "relative", zIndex: 2 }}>
          <div className="hero-inner">
            <motion.div className="hero-content" style={{ x: contentDriftX, y: contentDriftY }}>
              <motion.p className="hero-eyebrow"
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease }}>
                Beauty Clinic
              </motion.p>

              <div style={{ overflow: "hidden", lineHeight: 1, whiteSpace: "nowrap" }}>
                <motion.h1 className="hero-title"
                  variants={stagger(0.09, 0.25)} initial="hidden" animate="show">
                  {"GLOW".split("").map((l, i) => (
                    <motion.span key={i} variants={letterUp} style={{ display: "inline-block" }}>{l}</motion.span>
                  ))}
                </motion.h1>
              </div>

              <motion.p className="hero-script"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.72, ease }}>
                Mary Nassif Chbat
              </motion.p>

              <motion.p className="hero-sub"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.88, ease }}>
                Discover the secret to radiant beauty with our premium services, designed to make you shine with confidence and elegance.
              </motion.p>

              <motion.div className="hero-cta"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.05, ease }}>
                <Link to="/bookings" className="btn-premium">
                  <span>Book Appointment</span>
                  <i className="fas fa-arrow-right" />
                </Link>
              </motion.div>
            </motion.div>

            <motion.div className="hero-img-wrap" style={{ y: heroImgY, x: imgDriftX }}
              initial={{ opacity: 0, scale: 0.92, x: 40 }} animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3, ease }}>
              <div className="hero-img-circle" />
              <div className="hero-orb" aria-hidden="true">
                <Orb hue={20} hoverIntensity={1} rotateOnHover forceHoverState={false} backgroundColor="#1A1519" />
              </div>
              <img src="/images/marychbatIcon.webp" alt="Beauty" className="hero-img" />
            </motion.div>
          </div>
        </motion.div>
      </section>

      <ProductExperience />

      <section className="services-section">
        <div className="container">
          <motion.div className="services-intro"
            variants={stagger(0.12)} initial="hidden"
            whileInView="show" viewport={{ once: true, margin: "-80px" }}>
            <div>
              <motion.span className="section-tag" variants={fadeUp}>What We Offer</motion.span>
              <motion.h2 className="section-title" variants={fadeUp}>Our Services</motion.h2>
              <motion.p className="section-desc" variants={fadeUp}>
                Each treatment is carefully crafted to enhance your natural beauty and leave you feeling confident and radiant.
              </motion.p>
            </div>
            <motion.div className="services-intro-cta" variants={fadeUp}>
              <Link to="/bookings" className="btn-premium">
                <span>Book Now</span>
                <i className="fas fa-arrow-right" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div className="services-masonry"
            variants={stagger(0.06, 0.1)} initial="hidden"
            whileInView="show" viewport={{ once: true, margin: "-60px" }}>
            {SERVICES.map((s, i) => <ServiceTile key={i} s={s} i={i} />)}
          </motion.div>
        </div>
      </section>

      <section className="about-teaser">
        <div className="container">
          <div className="about-grid">
            <motion.div className="about-logo-col"
              variants={slideLeft} initial="hidden"
              whileInView="show" viewport={{ once: true, margin: "-80px" }}>
              <div className="about-logo-wrap">
                <div className="about-logo-ring about-logo-ring--outer" />
                <div className="about-logo-ring about-logo-ring--inner" />
                <div className="about-logo-glow" />
                <img src="/images/logo.png" alt="Mary Nassif Chbat" className="about-main-img" />
                <div className="about-logo-dot about-logo-dot--1"><i className="fas fa-star" /></div>
                <div className="about-logo-dot about-logo-dot--2"><i className="fas fa-gem" /></div>
                <div className="about-logo-dot about-logo-dot--3"><i className="fas fa-spa" /></div>
              </div>
              <motion.div className="about-stats-row"
                variants={stagger(0.15, 0.2)} initial="hidden"
                whileInView="show" viewport={{ once: true }}>
                {[["500","+","Happy Clients"],["5","+","Years"],["10","","Services"]].map(([n,suf,l]) => (
                  <motion.div key={l} className="about-stat" variants={fadeUp}>
                    <span className="about-stat-num"><CountUp target={n} suffix={suf} /></span>
                    <span className="about-stat-lbl">{l}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div className="about-text-col"
              variants={stagger(0.1, 0.1)} initial="hidden"
              whileInView="show" viewport={{ once: true, margin: "-80px" }}>
              <motion.span className="section-tag" variants={fadeUp} style={{ color: "var(--pink)" }}>About Us</motion.span>
              <motion.p className="about-script-name" variants={fadeUp}>Mary Nassif Chbat</motion.p>
              <motion.h2 className="about-heading" variants={fadeUp}>Your Trusted<br /><em>Beauty Clinic</em></motion.h2>
              <motion.div className="about-divider" variants={fadeIn} />
              <motion.p className="about-body" variants={fadeUp}>
                We specialize in high-quality treatments tailored to your needs from rejuvenating facials and advanced skincare to complete beauty transformations.
              </motion.p>
              <motion.div className="about-pillars" variants={stagger(0.1, 0.1)}>
                {[{icon:"fa-star",label:"Premium expertise"},{icon:"fa-heart",label:"Personalized care"},{icon:"fa-spa",label:"Relaxing atmosphere"}].map(({icon,label}) => (
                  <motion.div key={label} className="about-pillar" variants={fadeUp}>
                    <span className="about-pillar-icon"><i className={"fas " + icon} /></span>
                    <span>{label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <motion.section className="reviews-section"
        initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.8, ease }}>
        <div className="container">
          <div className="section-center" style={{ marginBottom: 40 }}>
            <span className="section-tag">Testimonials</span>
            <h2 className="section-title">What Clients Say</h2>
          </div>
        </div>
        {reviewItems.length >= 3 ? (
          <>
            <div className="reviews-depth">
              <DepthCarousel
                items={reviewItems}
                cardWidth={340}
                cardHeight={400}
                radius={20}
                tint="#241a12"
                depth={200}
                spread={96}
                tilt={20}
                tiltDirection="right"
                perspective={1500}
                visibleCards={4}
                falloff={0.18}
                blur={5}
                autoplay
                autoplayDelay={4200}
                loop
              />
            </div>
            <p className="reviews-depth-attr">
              {googleReviews?.rating ? `${googleReviews.rating.toFixed(1)} ★ · ` : ""}
              {googleReviews?.total ? `${googleReviews.total} reviews on ` : "Reviews from "}Google
            </p>
          </>
        ) : (
          <div className="container">
            <GoogleReviewsWidget showHeader={false} />
          </div>
        )}
      </motion.section>

      <section className="cta-contact-section">
        <div className="cta-contact-top">
          <div className="container">
            <div className="cta-contact-grid">
              <motion.div className="cta-left"
                variants={stagger(0.12)} initial="hidden"
                whileInView="show" viewport={{ once: true, margin: "-80px" }}>
                <motion.span className="section-tag" variants={fadeUp} style={{ color: "var(--pink)" }}>Book a Session</motion.span>
                <motion.h2 className="cta-big-title" variants={fadeUp}>Ready to<br /><em>Glow?</em></motion.h2>
                <motion.p className="cta-big-sub" variants={fadeUp}>Let our expert team craft the perfect beauty experience for you.</motion.p>
                <motion.div variants={fadeUp}>
                  <Link to="/bookings" className="btn-premium">
                    <span>Book Appointment</span>
                    <i className="fas fa-arrow-right" />
                  </Link>
                </motion.div>
              </motion.div>
              <motion.div className="cta-right"
                variants={slideRight} initial="hidden"
                whileInView="show" viewport={{ once: true, margin: "-80px" }}>
                <div className="hours-panel">
                  <div className="hours-panel-head"><i className="fas fa-clock" /><span>Opening Hours</span></div>
                  <div className="hours-panel-rows">
                    {HOURS.map(([d, h]) => (
                      <div key={d} className={"hours-panel-row" + (h === "Closed" ? " closed" : "")}>
                        <span className="hours-panel-day">{d}</span>
                        <span className="hours-panel-time">{h}</span>
                        <span className={"hours-dot" + (h === "Closed" ? " hours-dot--closed" : " hours-dot--open")} />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="cta-contact-bottom">
          <motion.div className="contact-cards"
            variants={stagger(0.12)} initial="hidden"
            whileInView="show" viewport={{ once: true, margin: "-40px" }}>
            <motion.a href="https://maps.google.com/?q=Sed+El+Boushrieh+Ossaily+Street+Lebanon" className="contact-card" target="_blank" rel="noreferrer" variants={fadeUp}>
              <i className="fas fa-map-marker-alt contact-card-ico" />
              <span className="contact-card-label">Find Us</span>
              <span className="contact-card-val">Sed El Boushrieh, Ossaily Street, Lebanon</span>
              <span className="contact-card-cta">Get Directions <i className="fas fa-arrow-right" /></span>
            </motion.a>
            <motion.a href="https://wa.me/9613799407" className="contact-card contact-card--pink" target="_blank" rel="noreferrer" variants={fadeUp}>
              <i className="fab fa-whatsapp contact-card-ico" />
              <span className="contact-card-label">WhatsApp Us</span>
              <span className="contact-card-val">+961 3 799 407</span>
              <span className="contact-card-cta">Message Now <i className="fas fa-arrow-right" /></span>
            </motion.a>
            <motion.a href="mailto:customerservice@marynassifchbat.com" className="contact-card" variants={fadeUp}>
              <i className="fas fa-envelope contact-card-ico" />
              <span className="contact-card-label">Email</span>
              <span className="contact-card-val">customerservice@marynassifchbat.com</span>
              <span className="contact-card-cta">Send Email <i className="fas fa-arrow-right" /></span>
            </motion.a>
          </motion.div>
        </div>
      </section>

      <motion.footer className="footer"
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        transition={{ duration: 0.8 }}>
        <div className="container">
          <div className="footer-body">
            <div className="footer-brand-col">
              <img src="/images/logo.png" alt="Logo" className="footer-logo-circle" onError={e => e.target.style.display = "none"} />
              <p className="footer-tagline">Beauty Institute<br /><em>Lebanon</em></p>
              <div className="footer-socials">
                <a href="https://web.facebook.com/marynassifchbat" className="social-btn"><i className="fab fa-facebook-f" /></a>
                <a href="https://www.instagram.com/marynassifchbat" className="social-btn"><i className="fab fa-instagram" /></a>
                <a href="https://www.tiktok.com/@marynassifchbat" className="social-btn"><i className="fab fa-tiktok" /></a>
              </div>
            </div>
            <div className="footer-links-col">
              <p className="footer-col-title">Services</p>
              <div className="footer-links">
                {["Nail Care","Makeup","Facial Care","Wax Care","Eyelashes","Mesotherapy"].map(s => (
                  <Link key={s} to="/bookings" className="footer-link">{s}</Link>
                ))}
              </div>
            </div>
            <div className="footer-links-col">
              <p className="footer-col-title">Quick Links</p>
              <div className="footer-links">
                <Link to="/" className="footer-link">Home</Link>
                <Link to="/about" className="footer-link">About Us</Link>
                <Link to="/reviews" className="footer-link">Reviews</Link>
                <Link to="/bookings" className="footer-link">Book Now</Link>
                <Link to="/appointments" className="footer-link">My Appointments</Link>
              </div>
            </div>
            <div className="footer-cta-col">
              <p className="footer-col-title">Ready to Glow?</p>
              <p className="footer-cta-sub">Book your next beauty session with us.</p>
              <Link to="/bookings" className="btn-premium" style={{ fontSize: "0.78rem", padding: "14px 24px" }}>
                <span>Book Now</span>
                <i className="fas fa-arrow-right" />
              </Link>
            </div>
          </div>
          <div className="footer-bar">
            <span>&copy; {new Date().getFullYear()} Mary Nassif Chbat. All rights reserved.</span>
            <div className="footer-bar-links">
              <a href="https://web.facebook.com/marynassifchbat" className="footer-link">Facebook</a>
              <a href="https://www.instagram.com/marynassifchbat" className="footer-link">Instagram</a>
              <a href="https://www.tiktok.com/@marynassifchbat" className="footer-link">TikTok</a>
            </div>
          </div>
        </div>
      </motion.footer>
    </>
  )
}
