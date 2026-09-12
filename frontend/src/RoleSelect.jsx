import { useState, useEffect } from "react";

const API_BASE = "http://localhost:8001";

const CLIENT_META = {
  RetailMart: { icon: "🛒", desc: "Retail / E-commerce" },
  FoodGo: { icon: "🍔", desc: "Food Delivery" },
  TravelEase: { icon: "✈️", desc: "Travel & Bookings" },
  TechStore: { icon: "💻", desc: "Electronics / Retail" },
  HealthPlus: { icon: "🏥", desc: "Healthcare" },
};

const ROLES = [
  { name: "Admin", icon: "🛡️", desc: "Manage users and authorized datasets" },
  { name: "Data Engineer", icon: "⚙️", desc: "Create and modify ETL pipelines" },
  { name: "Business Analyst", icon: "📊", desc: "Generate KPIs and view results" },
  { name: "Viewer", icon: "👁️", desc: "View dashboards and results" },
];

export default function RoleSelect({ token, onRegistered }) {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(null);
  const [role, setRole] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/clients`)
      .then((res) => res.json())
      .then(setClients)
      .catch(() => setError("Could not load client list."));
  }, []);

  const handleSubmit = async () => {
    if (!clientId || !role) {
      setError("Please select both a client and a role.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/register-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role, client_id: Number(clientId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Registration failed.");
        return;
      }
      onRegistered();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      <div className="card">
        <h2 className="card-title">Set up your access</h2>
        <p className="card-subtitle">Choose your organization and role to continue</p>

        <div className="section-label">1. Select your organization</div>
        <div className="picker-grid">
          {clients.map((c) => {
            const meta = CLIENT_META[c.client_name] || { icon: "🏢", desc: "" };
            const selected = clientId === c.client_id;
            return (
              <div
                key={c.client_id}
                className={`picker-card ${selected ? "selected" : ""}`}
                onClick={() => setClientId(c.client_id)}
              >
                <div className="picker-icon">{meta.icon}</div>
                <div className="picker-name">{c.client_name}</div>
                <div className="picker-desc">{meta.desc}</div>
              </div>
            );
          })}
        </div>

        <div className="section-label">2. Select your role</div>
        <div className="picker-grid picker-grid-roles">
          {ROLES.map((r) => {
            const selected = role === r.name;
            return (
              <div
                key={r.name}
                className={`picker-card ${selected ? "selected" : ""}`}
                onClick={() => setRole(r.name)}
              >
                <div className="picker-icon">{r.icon}</div>
                <div className="picker-name">{r.name}</div>
                <div className="picker-desc">{r.desc}</div>
              </div>
            );
          })}
        </div>

        <button
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center", marginTop: 24 }}
          onClick={handleSubmit}
          disabled={busy || !clientId || !role}
        >
          {busy ? "Setting up..." : "Continue to Dashboard"}
        </button>

        {error && <div className="alert alert-error">⚠ {error}</div>}
      </div>
    </div>
  );
}