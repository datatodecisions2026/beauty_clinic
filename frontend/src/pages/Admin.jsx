import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "../lib/api"
import { useMe } from "../hooks/useAuth"

const today = new Date().toISOString().split("T")[0]

// ── Access guard ─────────────────────────────────────────────────────────────
function useAdminGuard() {
  const navigate = useNavigate()
  const { data: user, isLoading, isError } = useMe()

  useEffect(() => {
    if (!isLoading && (!user || isError)) navigate("/login")
  }, [isLoading, user, isError, navigate])

  if (!isLoading && user && !user.is_staff && !user.is_superuser) return "forbidden"
  return user
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "var(--pink)" }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat-icon" style={{ background: `${color}18`, color }}>
        <i className={"fas " + icon} />
      </div>
      <div>
        <div className="admin-stat-num">{value}</div>
        <div className="admin-stat-label">{label}</div>
        {sub && <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = ["Appointments", "Services", "Clients", "Reviews"]

// ─────────────────────────────────────────────────────────────────────────────
export default function Admin() {
  const user = useAdminGuard()
  const qc = useQueryClient()
  const [tab, setTab] = useState("Appointments")

  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ["admin-appointments"],
    queryFn: async () => { const { data } = await api.get("/appointments"); return data },
  })
  const { data: services = [], isLoading: loadingSvcs } = useQuery({
    queryKey: ["services"],
    queryFn: async () => { const { data } = await api.get("/services"); return data },
  })
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => { const { data } = await api.get("/users"); return data },
  })
  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ["reviews"],
    queryFn: async () => { const { data } = await api.get("/reviews"); return data },
  })

  // Stats
  const todayAppts = appointments.filter(a => a.date === today && a.status !== "Cancelled")
  const revenue = appointments
    .filter(a => a.status === "Scheduled")
    .reduce((sum, a) => sum + parseFloat(a.final_price ?? a.service?.price ?? 0), 0)

  if (!user) return <div className="loading-wrap"><div className="spinner" /></div>
  if (user === "forbidden") return (
    <div className="admin-page">
      <div className="container" style={{ textAlign: "center", paddingTop: 80 }}>
        <i className="fas fa-lock" style={{ fontSize: "3rem", color: "var(--muted)", marginBottom: 20, display: "block" }} />
        <h2>Access Denied</h2>
        <p style={{ color: "var(--muted)" }}>You need staff privileges to view this page.</p>
      </div>
    </div>
  )

  return (
    <div className="admin-page">
      <div className="container">

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <span className="section-tag">Management</span>
          <h1 className="section-title" style={{ marginBottom: 4 }}>Admin Dashboard</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>Welcome back, {user.first_name}</p>
        </div>

        {/* Stats */}
        <div className="admin-stats" style={{ marginBottom: 36 }}>
          <StatCard icon="fa-calendar-check" label="Active Today" value={todayAppts.length} sub={`of ${appointments.length} total`} />
          <StatCard icon="fa-users" label="Clients" value={clients.length} color="#4ade80" />
          <StatCard icon="fa-cut" label="Services" value={services.length} color="#60a5fa" />
          <StatCard icon="fa-dollar-sign" label="Est. Revenue" value={`$${revenue.toFixed(0)}`} sub="scheduled appts" color="#f59e0b" />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "2px solid var(--border)", marginBottom: 28 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 22px", background: "none", border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: "0.88rem", fontFamily: "inherit",
              color: tab === t ? "var(--pink)" : "var(--muted)",
              borderBottom: tab === t ? "2px solid var(--pink)" : "2px solid transparent",
              marginBottom: -2, transition: "all 0.2s"
            }}>{t}</button>
          ))}
        </div>

        {tab === "Appointments" && <AppointmentsTab appointments={appointments} services={services} clients={clients} loading={loadingAppts} qc={qc} />}
        {tab === "Services"     && <ServicesTab services={services} loading={loadingSvcs} qc={qc} />}
        {tab === "Clients"      && <ClientsTab clients={clients} loading={loadingClients} />}
        {tab === "Reviews"      && <ReviewsTab reviews={reviews} loading={loadingReviews} qc={qc} />}

      </div>
    </div>
  )
}

// ── Appointments Tab ──────────────────────────────────────────────────────────
function AppointmentsTab({ appointments, services, clients, loading, qc }) {
  const [showForm, setShowForm] = useState(false)
  const [clientMode, setClientMode] = useState("existing") // "existing" | "new"
  const [newAppt, setNewAppt] = useState({ client_id: "", service_id: "", date: today, time: "09:00", final_price: "" })
  const [newClient, setNewClient] = useState({ first_name: "", last_name: "", email: "", phone_number: "" })
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [filter, setFilter] = useState("All")

  const createClient = useMutation({
    mutationFn: (body) => api.post("/users/admin", body),
  })
  const createAppt = useMutation({
    mutationFn: (body) => api.post("/appointments/admin", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-appointments"] })
      qc.invalidateQueries({ queryKey: ["admin-users"] })
      setShowForm(false)
      setNewAppt({ client_id: "", service_id: "", date: today, time: "09:00", final_price: "" })
      setNewClient({ first_name: "", last_name: "", email: "", phone_number: "" })
    },
  })
  const updateAppt = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/appointments/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-appointments"] }); setEditId(null) },
  })
  const cancelAppt = useMutation({
    mutationFn: (id) => api.patch(`/appointments/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-appointments"] }),
  })

  const filtered = filter === "All" ? appointments : appointments.filter(a => a.status === filter)
  const isSubmitting = createClient.isPending || createAppt.isPending
  const bookError = createClient.error?.response?.data?.detail || createAppt.error?.response?.data?.detail

  const handleBookSubmit = async (e) => {
    e.preventDefault()
    let clientId = parseInt(newAppt.client_id)
    if (clientMode === "new") {
      const { data: created } = await createClient.mutateAsync(newClient)
      clientId = created.id
    }
    createAppt.mutate({
      client_id: clientId,
      service_id: parseInt(newAppt.service_id),
      date: newAppt.date,
      time: newAppt.time,
      final_price: newAppt.final_price === "" ? null : parseFloat(newAppt.final_price),
    })
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["All", "Scheduled", "Pending", "Cancelled"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 14px", borderRadius: 999, border: "1.5px solid",
              borderColor: filter === f ? "var(--pink)" : "var(--border)",
              background: filter === f ? "rgba(255,79,157,0.08)" : "#fff",
              color: filter === f ? "var(--pink)" : "var(--muted)",
              fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit"
            }}>{f}</button>
          ))}
        </div>
        <button className="btn btn-pink btn-sm" onClick={() => setShowForm(!showForm)}>
          <i className={`fas ${showForm ? "fa-times" : "fa-plus"}`} /> {showForm ? "Close" : "New Appointment"}
        </button>
      </div>

      {showForm && (
        <div className="admin-panel" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <h3 style={{ fontFamily: "'Bodoni Moda',serif", fontSize: "1.15rem", margin: 0 }}>Book Appointment</h3>
            <div style={{ display: "flex", gap: 0, border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              {[["existing", "Existing Client"], ["new", "Walk-in / New"]].map(([mode, label]) => (
                <button key={mode} type="button" onClick={() => setClientMode(mode)} style={{
                  padding: "6px 14px", border: "none", cursor: "pointer", fontFamily: "inherit",
                  fontSize: "0.78rem", fontWeight: 700, transition: "all 0.15s",
                  background: clientMode === mode ? "var(--pink)" : "#fff",
                  color: clientMode === mode ? "#fff" : "var(--muted)",
                }}>{label}</button>
              ))}
            </div>
          </div>

          <form onSubmit={handleBookSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {clientMode === "new" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, padding: "16px 20px", background: "var(--bg)", borderRadius: 10, border: "1.5px dashed var(--border)" }}>
                <div style={{ gridColumn: "1/-1", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "var(--muted)", marginBottom: -4 }}>New Client Details</div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">First Name</label>
                  <input className="form-input" required placeholder="Lara" value={newClient.first_name} onChange={e => setNewClient({ ...newClient, first_name: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Last Name</label>
                  <input className="form-input" required placeholder="Khalil" value={newClient.last_name} onChange={e => setNewClient({ ...newClient, last_name: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" required placeholder="lara@example.com" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Phone (optional)</label>
                  <input className="form-input" placeholder="+961 70 000000" value={newClient.phone_number} onChange={e => setNewClient({ ...newClient, phone_number: e.target.value })} />
                </div>
              </div>
            )}

            {clientMode === "existing" && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Client</label>
                <select className="form-select" required value={newAppt.client_id} onChange={e => setNewAppt({ ...newAppt, client_id: e.target.value })}>
                  <option value="">Select client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} — {c.email}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, alignItems: "end" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Service</label>
                <select className="form-select" required value={newAppt.service_id} onChange={e => setNewAppt({ ...newAppt, service_id: e.target.value })}>
                  <option value="">Select service</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.servicetype} (${s.price})</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Date</label>
                <input className="form-input" type="date" required value={newAppt.date} onChange={e => setNewAppt({ ...newAppt, date: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Time</label>
                <input className="form-input" type="time" required value={newAppt.time} onChange={e => setNewAppt({ ...newAppt, time: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Agreed Price <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span>
                </label>
                <input
                  className="form-input" type="number" min="0" step="0.01"
                  placeholder={`Default $${services.find(s => s.id === parseInt(newAppt.service_id))?.price ?? "—"}`}
                  value={newAppt.final_price}
                  onChange={e => setNewAppt({ ...newAppt, final_price: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-pink" style={{ height: 48, justifyContent: "center" }} disabled={isSubmitting}>
                {isSubmitting ? "Booking…" : clientMode === "new" ? "Create & Book" : "Book"}
              </button>
            </div>
          </form>
          {bookError && <p style={{ color: "red", marginTop: 10, fontSize: "0.82rem" }}>{bookError}</p>}
        </div>
      )}

      <div className="admin-panel">
        {loading ? <div className="loading-wrap"><div className="spinner" /></div> : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr><th>Client</th><th>Service</th><th>Price</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    {editId === a.id ? (
                      <>
                        <td style={{ fontWeight: 600 }}>{a.client?.first_name} {a.client?.last_name}</td>
                        <td>
                          <select className="form-select" style={{ padding: "5px 8px" }} value={editForm.service_id} onChange={e => setEditForm({ ...editForm, service_id: e.target.value })}>
                            {services.map(s => <option key={s.id} value={s.id}>{s.servicetype}</option>)}
                          </select>
                        </td>
                        <td>
                          <input
                            className="form-input" style={{ padding: "5px 8px", width: 90 }} type="number" min="0" step="0.01"
                            placeholder={`$${services.find(s => s.id === parseInt(editForm.service_id))?.price ?? a.service?.price}`}
                            value={editForm.final_price}
                            onChange={e => setEditForm({ ...editForm, final_price: e.target.value })}
                          />
                          <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }}>Blank = list price</div>
                        </td>
                        <td><input className="form-input" style={{ padding: "5px 8px" }} type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} /></td>
                        <td><input className="form-input" style={{ padding: "5px 8px" }} type="time" value={editForm.time} onChange={e => setEditForm({ ...editForm, time: e.target.value })} /></td>
                        <td>
                          <select className="form-select" style={{ padding: "5px 8px" }} value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                            <option>Scheduled</option><option>Pending</option><option>Cancelled</option>
                          </select>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="btn-success-sm" disabled={updateAppt.isPending}
                              onClick={() => updateAppt.mutate({
                                id: editId,
                                service_id: parseInt(editForm.service_id),
                                date: editForm.date,
                                time: editForm.time,
                                status: editForm.status,
                                final_price: editForm.final_price === "" ? null : parseFloat(editForm.final_price),
                              })}
                            >Save</button>
                            <button className="btn-danger-sm" onClick={() => setEditId(null)}>Back</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <div style={{ fontWeight: 600 }}>{a.client?.first_name} {a.client?.last_name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{a.client?.email}</div>
                        </td>
                        <td>{a.service?.servicetype}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: "var(--pink)", fontWeight: 700 }}>
                              ${parseFloat(a.final_price ?? a.service?.price ?? 0).toFixed(2)}
                            </span>
                            {a.final_price != null && (
                              <span className="badge badge-warning" style={{ fontSize: "0.62rem" }} title={`List price: $${parseFloat(a.service?.price ?? 0).toFixed(2)}`}>
                                Agreed
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{a.date}</td>
                        <td>{a.time}</td>
                        <td><span className={"badge " + (a.status === "Cancelled" ? "badge-danger" : a.status === "Pending" ? "badge-warning" : "badge-success")}>{a.status}</span></td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="btn-success-sm"
                              onClick={() => {
                                setEditId(a.id)
                                setEditForm({
                                  service_id: a.service?.id, date: a.date, time: a.time, status: a.status,
                                  final_price: a.final_price != null ? String(a.final_price) : "",
                                })
                              }}
                            >Edit</button>
                            {a.status !== "Cancelled" && <button className="btn-danger-sm" disabled={cancelAppt.isPending} onClick={() => cancelAppt.mutate(a.id)}>Cancel</button>}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: "0.88rem" }}>No appointments.</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Services Tab ──────────────────────────────────────────────────────────────
function ServicesTab({ services, loading, qc }) {
  const [form, setForm] = useState({ servicetype: "", price: "" })
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ servicetype: "", price: "" })

  const createSvc = useMutation({
    mutationFn: (body) => api.post("/services", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); setForm({ servicetype: "", price: "" }) },
  })
  const updateSvc = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/services/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); setEditId(null) },
  })
  const deleteSvc = useMutation({
    mutationFn: (id) => api.delete(`/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
  })

  return (
    <div className="admin-services-grid">
      <div className="admin-panel">
        <div className="admin-panel-header">
          <span className="admin-panel-title">All Services</span>
          <span className="badge badge-success">{services.length} total</span>
        </div>
        {loading ? <div className="loading-wrap"><div className="spinner" /></div> : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead><tr><th>#</th><th>Service Name</th><th>Price</th><th>Actions</th></tr></thead>
              <tbody>
                {services.map((s, i) => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--muted)", width: 40 }}>{i + 1}</td>
                    {editId === s.id ? (
                      <>
                        <td><input className="form-input" style={{ padding: "5px 8px" }} value={editForm.servicetype} onChange={e => setEditForm({ ...editForm, servicetype: e.target.value })} /></td>
                        <td><input className="form-input" style={{ padding: "5px 8px", width: 90 }} type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} /></td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn-success-sm" disabled={updateSvc.isPending} onClick={() => updateSvc.mutate({ id: s.id, servicetype: editForm.servicetype, price: parseFloat(editForm.price) })}>Save</button>
                            <button className="btn-danger-sm" onClick={() => setEditId(null)}>Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 600 }}>{s.servicetype}</td>
                        <td style={{ color: "var(--pink)", fontWeight: 700 }}>${parseFloat(s.price).toFixed(2)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn-success-sm" onClick={() => { setEditId(s.id); setEditForm({ servicetype: s.servicetype, price: s.price }) }}><i className="fas fa-pen" /></button>
                            <button className="btn-danger-sm" onClick={() => deleteSvc.mutate(s.id)} disabled={deleteSvc.isPending}><i className="fas fa-trash" /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-panel" style={{ padding: 24 }}>
        <h3 style={{ fontFamily: "'Bodoni Moda',serif", fontSize: "1.15rem", marginBottom: 20 }}>Add Service</h3>
        <form onSubmit={e => { e.preventDefault(); createSvc.mutate({ servicetype: form.servicetype, price: parseFloat(form.price) }) }}>
          <div className="form-group">
            <label className="form-label">Service Name</label>
            <input className="form-input" placeholder="e.g. Skin Hydration" required value={form.servicetype} onChange={e => setForm({ ...form, servicetype: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Price (USD)</label>
            <input className="form-input" type="number" placeholder="50" required min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-pink" style={{ width: "100%", justifyContent: "center" }} disabled={createSvc.isPending}>
            <i className="fas fa-plus" /> {createSvc.isPending ? "Adding…" : "Add Service"}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Clients Tab ───────────────────────────────────────────────────────────────
function ClientsTab({ clients, loading }) {
  const [search, setSearch] = useState("")
  const filtered = clients.filter(c =>
    `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <span className="admin-panel-title">All Clients</span>
        <input className="form-input" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: 200, padding: "6px 12px", fontSize: "0.85rem" }} />
      </div>
      {loading ? <div className="loading-wrap"><div className="spinner" /></div> : (
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Country</th><th>Gender</th><th>Role</th></tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.first_name} {c.last_name}</td>
                  <td style={{ color: "var(--muted)" }}>{c.email}</td>
                  <td>{c.phone_number || <span style={{ color: "var(--border)" }}>—</span>}</td>
                  <td>{c.country || <span style={{ color: "var(--border)" }}>—</span>}</td>
                  <td>{c.gender || <span style={{ color: "var(--border)" }}>—</span>}</td>
                  <td>
                    {c.is_superuser
                      ? <span className="badge badge-danger">Admin</span>
                      : c.is_staff
                        ? <span className="badge badge-warning">Staff</span>
                        : <span className="badge badge-success">Client</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: "0.88rem" }}>No clients found.</p>}
        </div>
      )}
    </div>
  )
}

// ── Reviews Tab ───────────────────────────────────────────────────────────────
function ReviewsTab({ reviews, loading, qc }) {
  const deleteReview = useMutation({
    mutationFn: (id) => api.delete(`/reviews/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }),
  })

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <span className="admin-panel-title">Site Reviews</span>
        <span className="badge badge-success">{reviews.length} total</span>
      </div>
      {loading ? <div className="loading-wrap"><div className="spinner" /></div> : (
        <table className="admin-table">
          <thead><tr><th>Client</th><th>Rating</th><th>Review</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {reviews.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{r.user?.first_name} {r.user?.last_name}</td>
                <td style={{ color: "#FFC107", letterSpacing: 2 }}>{"★".repeat(parseInt(r.rating) || 5)}</td>
                <td style={{ maxWidth: 320, color: "var(--muted)", fontSize: "0.85rem" }}>{r.comment}</td>
                <td style={{ whiteSpace: "nowrap", color: "var(--muted)", fontSize: "0.8rem" }}>{new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                <td><button className="btn-danger-sm" onClick={() => deleteReview.mutate(r.id)} disabled={deleteReview.isPending}><i className="fas fa-trash" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {reviews.length === 0 && !loading && <p style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: "0.88rem" }}>No reviews yet.</p>}
    </div>
  )
}
