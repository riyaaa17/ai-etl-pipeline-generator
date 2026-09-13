import { useState, useEffect, useMemo } from "react";

const API_BASE = "http://localhost:8001";

export default function DataBrowser({ token, userInfo }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [rows, setRows] = useState(null);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/tables`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setTables(data.tables || []))
      .catch(() => setError("Could not load table list."));
  }, [token]);

  const handleSelectTable = async (table) => {
    setSelectedTable(table);
    setLoading(true);
    setError("");
    setRows(null);
    setStats(null);
    setSearchTerm("");

    try {
      const [previewRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/tables/${table}/preview`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/tables/${table}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const previewData = await previewRes.json();
      const statsData = await statsRes.json();

      if (!previewRes.ok) {
        setError(previewData.detail || "Could not load table data.");
        return;
      }

      setRows(previewData.rows);
      if (statsRes.ok) setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (!rows) return null;
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(term))
    );
  }, [rows, searchTerm]);

  return (
    <div className="card">
      <h2 className="card-title">📁 Browse Data</h2>
      <p className="card-subtitle">
        Viewing tables in <strong>{userInfo?.client_name}</strong>'s authorized dataset
      </p>

      <div className="table-chip-row">
        {tables.map((t) => (
          <span
            key={t}
            className={`table-chip ${selectedTable === t ? "active" : ""}`}
            onClick={() => handleSelectTable(t)}
          >
            {t}
          </span>
        ))}
      </div>

      {loading && (
        <div className="loading-box">
          <div className="loading-row">
            <div className="spinner" />
            Loading {selectedTable}...
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">⚠ {error}</div>}

      {stats && !loading && (
        <div className="stats-row">
          <div className="stat-pill">
            <span className="stat-value">{stats.row_count.toLocaleString()}</span>
            <span className="stat-label">total rows</span>
          </div>
          <div className="stat-pill">
            <span className="stat-value">{stats.column_count}</span>
            <span className="stat-label">columns</span>
          </div>
          <div className="stat-pill stat-pill-wide">
            <span className="stat-label" style={{ marginBottom: 4 }}>Schema</span>
            <div className="doc-tags">
              {stats.columns.map((col) => (
                <span key={col.name} className="doc-tag" title={col.type}>
                  {col.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {rows && !loading && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div className="section-label" style={{ margin: 0 }}>
              Preview — {selectedTable} (showing {filteredRows.length} of {rows.length} sampled rows)
            </div>
          </div>

          <input
            className="input"
            placeholder="Search within this preview..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: 14 }}
          />

          {filteredRows.length === 0 ? (
            <div className="empty-state">No matching rows in this preview.</div>
          ) : (
            <div className="result-table-wrap">
              <table className="result-table">
                <thead>
                  <tr>
                    {Object.keys(filteredRows[0]).map((k) => (
                      <th key={k}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => (
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
          <div className="hint" style={{ marginLeft: 0, marginTop: 8, display: "block" }}>
            Note: search only filters the 10 sampled rows shown here, not the entire table.
          </div>
        </div>
      )}

      {!selectedTable && !loading && (
        <div className="empty-canvas" style={{ marginTop: 20 }}>
          <div className="empty-canvas-icon">🗂️</div>
          <div className="empty-canvas-title">Select a table above to preview its data</div>
        </div>
      )}
    </div>
  );
}