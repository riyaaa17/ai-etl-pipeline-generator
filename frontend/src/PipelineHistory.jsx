import { useState, useEffect } from "react";

const API_BASE = "http://localhost:8001";

export default function PipelineHistoryPanel({ token, userInfo }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/admin/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setHistory(data);
        else setError(data.detail || "Could not load history.");
      })
      .catch(() => setError("Could not load history."))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="card">
      <h2 className="card-title">📜 Pipeline History</h2>
      <p className="card-subtitle">
        All pipeline runs across <strong>{userInfo?.client_name}</strong> (most recent first)
      </p>

      {loading && (
        <div className="loading-box">
          <div className="loading-row">
            <div className="spinner" />
            Loading history...
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">⚠ {error}</div>}

      {!loading && history.length === 0 && !error && (
        <div className="empty-state">No pipeline runs yet.</div>
      )}

      {!loading &&
        history.map((h) => (
          <div key={h.history_id} className="history-item">
            <div
              className="history-row"
              onClick={() => setExpandedId(expandedId === h.history_id ? null : h.history_id)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="history-requirement">{h.requirement}</div>
                <div className="history-meta">
                  {h.user_email} · {new Date(h.created_at).toLocaleString()}
                </div>
              </div>
              <span className={`badge ${h.status === "success" ? "badge-success" : "badge-failed"}`}>
                {h.status === "success" ? `✓ ${h.row_count} rows` : "✗ failed"}
              </span>
            </div>

            {expandedId === h.history_id && (
              <div className="history-detail">
                {h.kpi_name && (
                  <div style={{ marginBottom: 8 }}>
                    <strong>KPI:</strong> {h.kpi_name}
                  </div>
                )}
                {h.sql_query && (
                  <>
                    <div className="doc-label">SQL</div>
                    <pre className="code-block code-block-dark" style={{ fontSize: 12 }}>
                      {h.sql_query}
                    </pre>
                  </>
                )}
                {h.error_message && (
                  <div className="alert alert-error" style={{ marginTop: 8 }}>
                    {h.error_message}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}