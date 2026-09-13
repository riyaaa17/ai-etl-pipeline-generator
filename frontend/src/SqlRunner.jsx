import { useState } from "react";

const API_BASE = "http://localhost:8001";

export default function SqlRunner({ token, userInfo }) {
  const [sql, setSql] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleRun = async () => {
    if (!sql.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/run-sql`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sql_query: sql }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Query failed.");
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleRun();
  };

  return (
    <div className="card">
      <h2 className="card-title">🖥️ Run Custom SQL</h2>
      <p className="card-subtitle">
        Write and execute SQL directly against <strong>{userInfo?.client_name}</strong>'s dataset
      </p>

      <textarea
        className="textarea code-block-dark"
        style={{ fontFamily: "'SF Mono', 'Fira Code', Consolas, monospace", minHeight: 120 }}
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`SELECT * FROM \`${userInfo?.bigquery_dataset}.orders\` LIMIT 10`}
        disabled={loading}
      />

      <div style={{ marginTop: 12, display: "flex", alignItems: "center" }}>
        <button className="btn btn-primary" onClick={handleRun} disabled={loading || !sql.trim()}>
          {loading ? "Running..." : "Run Query"}
        </button>
        <span className="hint">Ctrl+Enter to run · Queries outside your dataset are blocked</span>
      </div>

      {error && <div className="alert alert-error">⚠ {error}</div>}

      {result && !loading && (
        <div style={{ marginTop: 20 }}>
          <div className="section-label">Results ({result.row_count} rows)</div>
          {result.row_count === 0 ? (
            <div className="empty-state">Query ran successfully but returned no rows.</div>
          ) : (
            <div className="result-table-wrap">
              <table className="result-table">
                <thead>
                  <tr>
                    {Object.keys(result.results[0]).map((k) => (
                      <th key={k}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((v, j) => (
                        <td key={j}>{v === null ? <span className="null-value">null</span> : String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}