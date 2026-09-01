import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import api from "../lib/api"

const STEPS = ["Service", "Date", "Time", "Confirm"]

const HOURS = [
  ["Saturday","08:30 am – 6:00 pm"],["Sunday","08:30 am – 12:00 pm"],
  ["Monday","Closed"],["Tuesday","08:30 am – 6:00 pm"],
  ["Wednesday","Closed"],["Thursday","08:30 am – 6:00 pm"],["Friday","08:30 am – 6:00 pm"],
]

const slide = {
  enter: (d) => ({ x: d > 0 ? 48 : -48, opacity: 0 }),
  center:      { x: 0, opacity: 1 },
  exit:  (d) => ({ x: d > 0 ? -48 : 48, opacity: 0 }),
}

export default function Bookings() {
  const [step, setStep] = useState(0)
  const [dir, setDir]   = useState(1)
  const [sel, setSel]   = useState({ service: null, date: null, time: null })
  const [booked, setBooked] = useState(null)

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => { const { data } = await api.get("/services"); return data },
  })
  const { data: days = [] } = useQuery({
    queryKey: ["available-days"],
    queryFn: async () => { const { data } = await api.get("/appointments/available-days"); return data.days },
  })
  const { data: times = [], isFetching: loadingTimes } = useQuery({
    queryKey: ["available-times", sel.service?.id, sel.date],
    queryFn: async () => {
      const { data } = await api.get("/appointments/available-times", {
        params: { service_id: sel.service.id, date: sel.date },
      })
      return data.available_times
    },
    enabled: !!sel.service && !!sel.date,
  })

  const book = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/appointments", {
        service_id: sel.service.id,
        date: sel.date,
        time: sel.time + ":00",
      })
      return data
    },
    onSuccess: (data) => setBooked(data),
  })

  const parsedDays = days.map(d => {
    const dt = new Date(d + "T00:00")
    return {
      raw: d,
      wday: dt.toLocaleDateString("en-US", { weekday: "short" }),
      num:  dt.getDate(),
      mon:  dt.toLocaleDateString("en-US", { month: "short" }),
    }
  })

  const canNext = [!!sel.service, !!sel.date, !!sel.time, true][step]

  const go = (next) => {
    setDir(next > step ? 1 : -1)
    setStep(next)
  }

  const reset = () => { setBooked(null); setSel({ service: null, date: null, time: null }); setStep(0) }

  if (booked) return (
    <div className="confirm-wrap">
      <div className="confirm-card">
        <div className="confirm-icon"><i className="fas fa-check" /></div>
        <h2 className="confirm-title">Booking Confirmed!</h2>
        <p className="confirm-desc">
          Your <strong>{booked.service.servicetype}</strong> appointment is scheduled for{" "}
          <strong>{new Date(booked.date + "T00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</strong>{" "}
          at <strong>{booked.time}</strong>.<br /><br />A confirmation email has been sent to you.
        </p>
        <div className="confirm-actions">
          <button className="btn btn-outline" onClick={reset}>Book Another</button>
          <Link to="/appointments" className="btn btn-pink">My Appointments</Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className="bookings-page">
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span className="section-tag">Schedule</span>
          <h1 className="section-title">Book an Appointment</h1>
          <p className="section-desc" style={{ margin: "0 auto" }}>
            Choose your service, pick a date and time that works for you, and we'll take care of the rest.
          </p>
        </div>

        <div className="bookings-layout">
          {/* ── Wizard ─────────────────────────────────────────── */}
          <div className="wizard-card">

            {/* Step indicators */}
            <div className="wizard-steps">
              {STEPS.map((label, i) => (
                <div key={label} className="wizard-step-item">
                  <button
                    className={"wizard-step-dot" + (i === step ? " active" : i < step ? " done" : "")}
                    onClick={() => i < step && go(i)}
                    style={{ cursor: i < step ? "pointer" : "default" }}
                  >
                    {i < step ? <i className="fas fa-check" style={{ fontSize: "0.65rem" }} /> : i + 1}
                  </button>
                  <span className={"wizard-step-label" + (i === step ? " active" : "")}>{label}</span>
                  {i < STEPS.length - 1 && <div className={"wizard-step-line" + (i < step ? " done" : "")} />}
                </div>
              ))}
            </div>

            {/* Animated content */}
            <div className="wizard-body">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={step}
                  custom={dir}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  {step === 0 && (
                    <div>
                      <p className="wizard-step-heading">Choose a Service</p>
                      <div className="service-opts">
                        {services.map(s => (
                          <button
                            key={s.id}
                            className={"service-opt" + (sel.service?.id === s.id ? " sel" : "")}
                            onClick={() => { setSel({ service: s, date: null, time: null }) }}
                          >
                            <span className="service-opt-name">{s.servicetype}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div>
                      <p className="wizard-step-heading">Pick a Date</p>
                      <div className="date-opts">
                        {parsedDays.map(d => (
                          <button
                            key={d.raw}
                            className={"date-opt" + (sel.date === d.raw ? " sel" : "")}
                            onClick={() => setSel(s => ({ ...s, date: d.raw, time: null }))}
                          >
                            <div className="date-wday">{d.wday}</div>
                            <div className="date-num">{d.num}</div>
                            <div className="date-mon">{d.mon}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div>
                      <p className="wizard-step-heading">Select a Time</p>
                      {loadingTimes ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                          <div className="spinner" />
                        </div>
                      ) : times.length === 0 ? (
                        <p style={{ color: "var(--muted)", fontSize: "0.9rem", padding: "24px 0" }}>
                          No available times for this date. Go back and pick another day.
                        </p>
                      ) : (
                        <div className="time-opts">
                          {times.map(t => (
                            <button
                              key={t}
                              className={"time-opt" + (sel.time === t ? " sel" : "")}
                              onClick={() => setSel(s => ({ ...s, time: t }))}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {step === 3 && (
                    <div>
                      <p className="wizard-step-heading">Confirm Booking</p>
                      {book.isError && (
                        <div className="form-error" style={{ marginBottom: 16 }}>
                          {book.error?.response?.data?.detail || "Failed to book. Please try again."}
                        </div>
                      )}
                      <div className="summary-card" style={{ marginBottom: 0 }}>
                        <div className="summary-row">
                          <span className="summary-label">Service</span>
                          <span className="summary-val">{sel.service?.servicetype}</span>
                        </div>
                        <div className="summary-row">
                          <span className="summary-label">Date</span>
                          <span className="summary-val">
                            {sel.date && new Date(sel.date + "T00:00").toLocaleDateString("en-US", {
                              weekday: "long", month: "long", day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="summary-row">
                          <span className="summary-label">Time</span>
                          <span className="summary-val">{sel.time}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="wizard-nav">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => go(step - 1)}
                style={{ visibility: step === 0 ? "hidden" : "visible" }}
              >
                ← Back
              </button>

              {step < 3 ? (
                <button
                  className="btn btn-pink btn-sm"
                  disabled={!canNext}
                  onClick={() => go(step + 1)}
                >
                  Next →
                </button>
              ) : (
                <button
                  className="btn btn-pink"
                  disabled={book.isPending}
                  onClick={() => book.mutate()}
                  style={{ minWidth: 180, justifyContent: "center" }}
                >
                  {book.isPending ? "Booking…" : "Confirm Appointment"}
                </button>
              )}
            </div>
          </div>

          {/* ── Hours sidebar ───────────────────────────────────── */}
          <div>
            <div className="hours-card">
              <p className="hours-title">Opening Hours</p>
              {HOURS.map(([d, h]) => (
                <div key={d} className="hours-row">
                  <span className="hours-day">{d}</span>
                  <span className="hours-time" style={h === "Closed" ? { color: "var(--border)" } : {}}>{h}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
