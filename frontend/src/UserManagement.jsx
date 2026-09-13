import { useState, useEffect } from "react";

const API_BASE = "http://localhost:8001";
const ROLES = ["Admin", "Data Engineer", "Business Analyst", "Viewer"];

export default function UserManagement({ token, userInfo }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const loadUsers = () => {
    setLoading(true);
    fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
        else setError(data.detail || "Could not load users.");
      })
      .catch(() => setError("Could not load users."))
      .finally(() => setLoading(false));
  };

  useEffect(loadUsers, [token]);

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Could not update role.");
        return;
      }
      setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">👥 Manage Users</h2>
      <p className="card-subtitle">
        Users registered under <strong>{userInfo?.client_name}</strong>
      </p>

      {loading && (
        <div className="loading-box">
          <div className="loading-row">
            <div className="spinner" />
            Loading users...
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">⚠ {error}</div>}

      {!loading && users.length > 0 && (
        <div className="result-table-wrap">
          <table className="result-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td>{u.email}</td>
                  <td>
                    <select
                      className="input"
                      style={{ padding: "6px 10px", fontSize: 13, width: "auto" }}
                      value={u.role}
                      disabled={updatingId === u.user_id}
                      onChange={(e) => handleRoleChange(u.user_id, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && users.length === 0 && !error && (
        <div className="empty-state">No other users found in your organization yet.</div>
      )}
    </div>
  );
}