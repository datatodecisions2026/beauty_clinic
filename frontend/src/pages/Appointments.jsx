import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import api from "../lib/api"

const statusClass = (s) => s === "Cancelled" ? "badge badge-danger" : s === "Pending" ? "badge badge-warning" : "badge badge-success"

const FILTERS = ["All", "Upcoming", "Cancelled"]

export default function Appointments() {
  const [filter, setFilter] = useState("All")
  const queryClient = useQueryClient()
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => { const { data } = await api.get("/appointments"); return data },
  })
  const cancel = useMutation({
    mutationFn: async (id) => { const { data } = await api.patch(`/appointments/${id}/cancel`); return data },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  })

  const filtered = appointments.filter(a => {
    if (filter === "Cancelled") return a.status === "Cancelled"
    if (filter === "Upcoming") return a.status !== "Cancelled"
    return true
  })

  if (isLoading) return <div className="loading-wrap"><div className="spinner" /></div>

  return (
    <div className="appts-page">
      <div className="container">
        <div className="page-header">
          <span className="section-tag">Your Schedule</span>
          <h1 className="section-title">My Appointments</h1>
        </div>

        <div className="appts-filters">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`appts-filter-btn${filter === f ? " active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
              {f === "Upcoming" && (
                <span className="appts-filter-count">{appointments.filter(a => a.status !== "Cancelled").length}</span>
              )}
              {f === "Cancelled" && (
                <span className="appts-filter-count">{appointments.filter(a => a.status === "Cancelled").length}</span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-calendar-times empty-icon" />
            <h3 style={{ marginBottom: 12 }}>
              {filter === "All" ? "No appointments yet" : `No ${filter.toLowerCase()} appointments`}
            </h3>
            {filter === "All" && (
              <>
                <p style={{ marginBottom: 24 }}>Book your first beauty treatment and it will appear here.</p>
                <Link to="/bookings" className="btn btn-pink">Book Now</Link>
              </>
            )}
          </div>
        ) : (
          <div className="appts-grid">
            {filtered.map(a => (
              <div key={a.id} className="appt-card">
                <h3 className="appt-service">{a.service.servicetype}</h3>
                <div className="appt-meta">
                  <div className="appt-meta-row">
                    <i className="fas fa-calendar appt-meta-icon" />
                    <span>{new Date(a.date+"T00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</span>
                  </div>
                  <div className="appt-meta-row">
                    <i className="fas fa-clock appt-meta-icon" />
                    <span>{a.time}</span>
                  </div>
                  {a.final_price != null && (
                    <div className="appt-meta-row">
                      <i className="fas fa-tag appt-meta-icon" />
                      <span>${parseFloat(a.final_price).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="appt-footer">
                  <span className={statusClass(a.status)}>{a.status}</span>
                  {a.status !== "Cancelled" ? (
                    <button
                      className="btn-danger-sm"
                      onClick={() => cancel.mutate(a.id)}
                      disabled={cancel.isPending}
                    >
                      {cancel.isPending ? (
                        <><i className="fas fa-circle-notch fa-spin" style={{ marginRight: 6 }} />Cancelling…</>
                      ) : "Cancel"}
                    </button>
                  ) : (
                    <Link to="/bookings" className="btn btn-outline btn-sm">Rebook</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
