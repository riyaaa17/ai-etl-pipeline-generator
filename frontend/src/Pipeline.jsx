import { useState } from "react";

export default function Pipeline({ token, userInfo }) {
  const [requirement, setRequirement] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("http://localhost:8001/generate-pipeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requirement }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Something went wrong.");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2>ETL Pipeline Generator</h2>
      <p style={{ color: "#555" }}>
        Logged in as <strong>{userInfo?.email}</strong> ({userInfo?.role} at {userInfo?.client_name})
      </p>

      <textarea
        value={requirement}
        onChange={(e) => setRequirement(e.target.value)}
        placeholder="e.g. Calculate monthly revenue for 2025, excluding cancelled and refunded orders."
        rows={4}
        style={{ width: "100%", padding: 10, marginBottom: 10, fontFamily: "inherit" }}
      />

      <button
        onClick={handleGenerate}
        disabled={loading || !requirement}
        style={{ padding: "10px 20px", cursor: "pointer" }}
      >
        {loading ? "Generating pipeline..." : "Generate KPI Pipeline"}
      </button>

      {error && (
        <div style={{ marginTop: 20, padding: 10, background: "#fee", color: "#900", borderRadius: 4 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 30 }}>
          <h3>KPI Definition</h3>
          <pre style={{ background: "#f5f5f5", padding: 10, overflow: "auto", fontSize: 13 }}>
            {JSON.stringify(result.kpi_definition, null, 2)}
          </pre>

          <h3>Transformation Plan</h3>
          <pre style={{ background: "#f5f5f5", padding: 10, overflow: "auto", fontSize: 13 }}>
            {JSON.stringify(result.transformation_plan, null, 2)}
          </pre>

          <h3>Generated SQL</h3>
          <pre style={{ background: "#1e1e1e", color: "#dcdcdc", padding: 10, overflow: "auto", fontSize: 13 }}>
            {result.sql_query}
          </pre>

          <h3>Results ({result.row_count} rows)</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {result.results.length > 0 &&
                  Object.keys(result.results[0]).map((key) => (
                    <th key={key} style={{ border: "1px solid #ccc", padding: 6, textAlign: "left", background: "#eee" }}>
                      {key}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {result.results.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => (
                    <td key={j} style={{ border: "1px solid #ccc", padding: 6 }}>
                      {String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}