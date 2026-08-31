import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { fadeUp, scaleIn, slideLeft, slideRight, stagger, ease } from "../lib/motion"

const SPECIALTIES = [
  { icon: "fa-paint-brush", title: "Artistic Makeup",   desc: "From natural everyday looks to full glamour, we craft makeup that celebrates your unique beauty.", color: "#FF4F9D" },
  { icon: "fa-spa",         title: "Facial Treatments", desc: "Rejuvenating facials and skincare routines designed to give you glowing, healthy skin.",           color: "#C5A880" },
  { icon: "fa-gem",         title: "Nail Care",          desc: "Expert nail care with premium products, from classic polish to intricate nail art designs.",        color: "#FF4F9D" },
  { icon: "fa-eye",         title: "Eyelash Perming",    desc: "Natural-looking lash lifts and perms that make your eyes pop without the daily maintenance.",       color: "#C5A880" },
  { icon: "fa-magic",       title: "Wax Care",           desc: "Smooth, gentle waxing treatments for lasting results with minimal discomfort.",                     color: "#FF4F9D" },
  { icon: "fa-star",        title: "Mesotherapy",        desc: "Advanced rejuvenation treatments for radiant, youthful, glowing skin.",                             color: "#C5A880" },
]

export default function About() {
  return (
    <div className="about-page">

      <section className="about-page-hero">
        <div className="container">
          <div className="about-page-grid">

            <motion.div
              variants={stagger(0.1, 0.1)} initial="hidden" animate="show">
              <motion.span className="section-tag" variants={fadeUp}>About Us</motion.span>
              <motion.h1 className="section-title" variants={fadeUp}>
                Mary Nassif Chbat<br />
                <em style={{ color: "var(--pink)", fontStyle: "italic" }}>Beauty Clinic</em>
              </motion.h1>
              <motion.p variants={fadeUp} style={{ color: "var(--muted)", lineHeight: 1.8, marginBottom: 8 }}>
                At Mary Nassif Chbat, we bring you the best in beauty. We specialize in providing high-quality treatments tailored to your needs, whether you are looking for a rejuvenating facial, advanced skincare, or a complete beauty transformation.
              </motion.p>
              <motion.p variants={fadeUp} style={{ color: "var(--muted)", lineHeight: 1.8, marginBottom: 32 }}>
                Our expert team is committed to delivering results that not only meet but exceed your expectations. With years of experience and a passion for enhancing natural beauty, we are here to help you look and feel your best.
              </motion.p>
              <motion.div className="about-info-list" variants={fadeUp}>
                <div className="about-info-row">
                  <i className="fas fa-map-marker-alt about-info-icon" />
                  <span>Sed El Boushrieh, Ossaily Street, Lebanon</span>
                </div>
                <div className="about-info-row">
                  <i className="fas fa-phone about-info-icon" />
                  <a href="https://wa.me/9613799407" style={{ color: "var(--muted)" }}>+961 3 799 407</a>
                </div>
                <div className="about-info-row">
                  <i className="fas fa-envelope about-info-icon" />
                  <a href="mailto:customerservice@marynassifchbat.com" style={{ color: "var(--muted)" }}>customerservice@marynassifchbat.com</a>
                </div>
              </motion.div>
              <motion.div className="about-socials" variants={fadeUp}>
                <a href="https://web.facebook.com/marynassifchbat" className="btn btn-ghost btn-sm"><i className="fab fa-facebook-f" /> Facebook</a>
                <a href="https://www.instagram.com/marynassifchbat" className="btn btn-pink btn-sm"><i className="fab fa-instagram" /> Instagram</a>
                <a href="https://www.tiktok.com/@marynassifchbat" className="btn btn-ghost btn-sm"><i className="fab fa-tiktok" /> TikTok</a>
              </motion.div>
            </motion.div>

            <motion.div className="about-visual-col"
              variants={scaleIn} initial="hidden" animate="show">
              <div className="about-logo-badge">
                <div style={{
                  position: "absolute", inset: -16, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255,79,157,0.12) 0%, transparent 70%)",
                  animation: "aboutPulse 3s ease-in-out infinite",
                }} />
                <div style={{
                  position: "absolute", inset: -32, borderRadius: "50%",
                  border: "1px solid rgba(197,168,128,0.2)",
                  animation: "aboutSpin 18s linear infinite",
                }} />
                <div style={{
                  position: "absolute", inset: -56, borderRadius: "50%",
                  border: "1px dashed rgba(255,79,157,0.15)",
                  animation: "aboutSpin 28s linear infinite reverse",
                }} />
                <img src="/images/logo.png" alt="Mary Nassif Chbat Beauty Clinic"
                  style={{ width: 240, height: 240, objectFit: "cover", borderRadius: "50%",
                    boxShadow: "0 0 0 6px rgba(197,168,128,0.15), 0 16px 64px rgba(197,168,128,0.25)",
                    display: "block", position: "relative", zIndex: 1 }} />
              </div>

              <div className="about-map-card">
                <iframe
                  className="about-map-frame"
                  title="Mary Nassif Chbat Beauty Clinic — Sed El Boushrieh, Lebanon"
                  src="https://maps.google.com/maps?q=Mary%20Nassif%20Chbat%20Beauty%20Clinic%2C%20Ossaily%20Street%2C%20Sed%20El%20Boushrieh%2C%20Lebanon&z=15&output=embed"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
                <a className="about-map-open"
                  href="https://maps.google.com/maps?q=Mary+Nassif+Chbat+Beauty+Clinic,+Ossaily+Street,+Sed+El+Boushrieh,+Lebanon"
                  target="_blank" rel="noreferrer">
                  <i className="fas fa-map-marker-alt" /> Sed El Boushrieh, Ossaily Street — Get Directions
                </a>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      <section style={{ padding: "100px 0", background: "var(--surface)" }}>
        <div className="container">
          <motion.div className="section-center" style={{ marginBottom: 64 }}
            variants={stagger(0.1)} initial="hidden"
            whileInView="show" viewport={{ once: true, margin: "-60px" }}>
            <motion.span className="section-tag" variants={fadeUp}>What We Do</motion.span>
            <motion.h2 className="section-title" variants={fadeUp}>Our Specialties</motion.h2>
            <motion.p className="section-desc" variants={fadeUp} style={{ maxWidth: 480, margin: "0 auto" }}>
              Every treatment is a ritual crafted with care, precision, and a deep passion for beauty.
            </motion.p>
          </motion.div>

          <motion.div className="specialties-grid"
            variants={stagger(0.08, 0.05)} initial="hidden"
            whileInView="show" viewport={{ once: true, margin: "-60px" }}>
            {SPECIALTIES.map(({ icon, title, desc, color }) => (
              <motion.div key={title} className="specialty-card" variants={fadeUp}>
                <div className="specialty-card-inner">
                  <div className="specialty-icon-wrap" style={{ "--color": color }}>
                    <i className={"fas " + icon} />
                    <div className="specialty-icon-ring" />
                  </div>
                  <h3 className="specialty-title">{title}</h3>
                  <p className="specialty-desc">{desc}</p>
                  <div className="specialty-line" style={{ background: color }} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <motion.section style={{ padding: "100px 0", background: "var(--bg)", textAlign: "center", borderTop: "1px solid var(--border)" }}
        initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.8, ease }}>
        <div className="container">
          <span className="section-tag">Get Started</span>
          <h2 style={{ color: "var(--dark)", marginBottom: 16, fontFamily: "'Bodoni Moda', serif", fontSize: "clamp(1.8rem,4vw,2.8rem)" }}>Ready to Experience the Difference?</h2>
          <p style={{ color: "var(--muted)", marginBottom: 40, maxWidth: 480, margin: "0 auto 40px" }}>
            Book your appointment today and discover why clients keep coming back.
          </p>
          <Link to="/bookings" className="btn btn-pink btn-lg">Book Now</Link>
        </div>
      </motion.section>

    </div>
  )
}
