import { useState, useRef, useEffect } from "react";
import PipelineFlow from "./PipelineFlow";
import DataBrowser from "./DataBrowser";
import SqlRunner from "./SqlRunner";
import UserManagement from "./UserManagement";
import PipelineHistoryPanel from "./PipelineHistory";
import InsightsPanel from "./InsightsPanel";

const API_BASE = "http://localhost:8001";

const PIPELINE_STEPS = [
  { label: "Understanding your requirement...", icon: "🧠" },
  { label: "Fetching dataset schema...", icon: "🗂️" },
  { label: "Planning transformations...", icon: "🔧" },
  { label: "Generating SQL...", icon: "📝" },
  { label: "Validating query against BigQuery...", icon: "✅" },
];

const SAMPLE_PROMPTS = [
  "Calculate monthly revenue for 2025, excluding cancelled and refunded orders.",
  "What is the average order value by month?",
  "How many orders were placed per customer city?",
];

export default function Dashboard({ token, userInfo, onLogout }) {
  const [requirement, setRequirement] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [selectedChartType, setSelectedChartType] = useState("bar");
  const [saving, setSaving] = useState(false);
  const stepIntervalRef = useRef(null);

  const isViewer = userInfo?.role === "Viewer";
  const isDataEngineer = userInfo?.role === "Data Engineer";
  const isAdmin = userInfo?.role === "Admin";

  useEffect(() => () => clearInterval(stepIntervalRef.current), []);

  const handleGenerate = async (overrideText) => {
    const text = overrideText ?? requirement;
    if (!text.trim() || isViewer) return;
    if (overrideText) setRequirement(overrideText);

    setLoading(true);
    setError("");
    setResult(null);
    setStepIndex(0);
    setSavedMessage("");
    setSelectedChartType("bar");

    stepIntervalRef.current = setInterval(() => {
      setStepIndex((p) => (p < PIPELINE_STEPS.length - 1 ? p + 1 : p));
    }, 3500);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch(`${API_BASE}/generate-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requirement: text }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Server returned an invalid response.");
      }

      if (!res.ok) {
        if (res.status === 401) setError("Your session has expired. Please log in again.");
        else if (res.status === 403) setError(data.detail || "You're not authorized to run this query.");
        else if (res.status === 422) setError(`Pipeline could not complete: ${data.detail || "Unknown error."}`);
        else if (res.status === 503) setError(data.detail || "The AI service is temporarily unavailable.");
        else setError(data.detail || `Request failed (status ${res.status}).`);
        return;
      }
      setResult(data);
    } catch (err) {
      if (err.name === "AbortError") setError("The pipeline is taking longer than expected. Try again.");
      else if (err.message === "Failed to fetch") setError("Could not reach the backend server.");
      else setError(err.message || "Something went wrong.");
    } finally {
      clearInterval(stepIntervalRef.current);
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleAddToDashboard = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/dashboard/widgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: result.kpi_definition?.kpi_name || "Untitled KPI",
          requirement,
          chart_type: selectedChartType,
          kpi_definition: result.kpi_definition,
          results: result.results,
          insight: result.insight,
          monitoring_report: result.monitoring_report,
          sql_query: result.sql_query,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSavedMessage("✓ Added to Dashboard");
        setTimeout(() => setSavedMessage(""), 3000);
      } else {
        setSavedMessage(data.detail || "Could not save widget.");
      }
    } catch (err) {
      setSavedMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate();
  };

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <div className="dashboard-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="avatar">{userInfo?.email?.[0]?.toUpperCase()}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{userInfo?.email}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
              <span className="badge badge-role">{userInfo?.role}</span>{" "}
              <span style={{ marginLeft: 4 }}>at {userInfo?.client_name}</span>
            </div>
          </div>
        </div>
        <button className="btn btn-secondary" style={{ width: "auto" }} onClick={onLogout}>
          Log out
        </button>
      </div>

      <div className="card">
        <h2 className="card-title">✨ ETL Pipeline Generator</h2>
        <p className="card-subtitle">Describe the KPI you need in plain English</p>

        {isViewer && (
          <div className="alert alert-info" style={{ marginBottom: 16, marginTop: 0 }}>
            👁️ You're logged in as a <strong>Viewer</strong>. This role has read-only access —
            contact your Admin for pipeline generation permissions. You can still browse raw data
            and view past pipeline history below.
          </div>
        )}

        <textarea
          className="textarea"
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isViewer
              ? "Viewers cannot generate new pipelines."
              : "e.g. Calculate monthly revenue for 2025, excluding cancelled and refunded orders."
          }
          disabled={loading || isViewer}
        />

        {!result && !loading && !isViewer && (
          <div className="sample-prompts">
            {SAMPLE_PROMPTS.map((p) => (
              <span key={p} className="sample-chip" onClick={() => handleGenerate(p)}>
                {p}
              </span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 14, display: "flex", alignItems: "center" }}>
          <button
            className="btn btn-primary"
            onClick={() => handleGenerate()}
            disabled={loading || !requirement.trim() || isViewer}
          >
            {loading ? "Generating..." : "Generate KPI Pipeline"}
          </button>
          <span className="hint">Ctrl+Enter to submit</span>
        </div>

        {loading && (
          <div className="loading-box">
            <div className="loading-row">
              <div className="spinner" />
              <span className="loading-step-icon">{PIPELINE_STEPS[stepIndex].icon}</span>
              {PIPELINE_STEPS[stepIndex].label}
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${((stepIndex + 1) / PIPELINE_STEPS.length) * 100}%` }}
              />
            </div>
            <div className="loading-sub">This can take 10–30 seconds depending on complexity.</div>
          </div>
        )}

        {error && <div className="alert alert-error">⚠ {error}</div>}

        {!result && !loading && !error && !isViewer && (
          <div className="empty-canvas">
            <div className="empty-canvas-icon">📊</div>
            <div className="empty-canvas-title">No pipeline generated yet</div>
            <div className="empty-canvas-sub">
              Type a business requirement above, or click one of the sample prompts to get started.
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="results-fade-in">
            {result.monitoring_report?.anomaly_count > 0 && (
              <div className="monitor-alert">
                <div className="monitor-alert-header">
                  🚨 {result.monitoring_report.anomaly_count} anomal
                  {result.monitoring_report.anomaly_count === 1 ? "y" : "ies"} detected
                </div>
                <ul className="monitor-alert-list">
                  {result.monitoring_report.alerts.map((alert, i) => (
                    <li key={i}>{alert}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="section-label">🎯 KPI Definition</div>
            <pre className="code-block">{JSON.stringify(result.kpi_definition, null, 2)}</pre>

            <div className="section-label">🔧 Transformation Plan</div>
            <pre className="code-block">{JSON.stringify(result.transformation_plan, null, 2)}</pre>

            <div className="section-label">📝 Generated SQL</div>
            <pre className="code-block code-block-dark">{result.sql_query}</pre>

            <div className="section-label">🔀 Pipeline Flow</div>
            <PipelineFlow
              documentation={result.documentation}
              transformationPlan={result.transformation_plan}
              kpiDefinition={result.kpi_definition}
            />

            {result.row_count > 0 && (
              <>
                <div
                  className="section-label"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span>💡 Insights & Chart</span>
                  <button
                    className="btn btn-secondary"
                    style={{ width: "auto", padding: "6px 14px", fontSize: 12 }}
                    onClick={handleAddToDashboard}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "📌 Add to Dashboard"}
                  </button>
                </div>
                {savedMessage && (
                  <div className="alert alert-success" style={{ marginTop: 0, marginBottom: 12 }}>
                    {savedMessage}
                  </div>
                )}
                <InsightsPanel
                  insight={result.insight}
                  results={result.results}
                  onChartTypeChange={setSelectedChartType}
                />
              </>
            )}

            {result.documentation && !result.documentation.error && (
              <>
                <div className="section-label">📄 Documentation</div>
                <div className="doc-card">
                  <div className="doc-title">{result.documentation.title}</div>
                  <p className="doc-summary">{result.documentation.summary}</p>

                  <div className="doc-grid">
                    <div>
                      <div className="doc-label">Data Sources</div>
                      <div className="doc-tags">
                        {result.documentation.data_sources.map((s) => (
                          <span key={s} className="doc-tag">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="doc-label">Columns Used</div>
                      <div className="doc-tags">
                        {result.documentation.columns_used.map((c) => (
                          <span key={c} className="doc-tag">{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="doc-label" style={{ marginTop: 14 }}>Filters Applied</div>
                  <ul className="doc-list">
                    {result.documentation.filters_applied.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>

                  <div className="doc-label">Transformations</div>
                  <ul className="doc-list">
                    {result.documentation.transformations_applied.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>

                  {result.documentation.notes?.length > 0 && (
                    <>
                      <div className="doc-label">⚠ Notes & Caveats</div>
                      <ul className="doc-list doc-notes">
                        {result.documentation.notes.map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="doc-footer">
                    Generated {new Date(result.documentation.generated_at).toLocaleString()}
                  </div>
                </div>
              </>
            )}

            <div className="section-label">📈 Results ({result.row_count} rows)</div>
            {result.row_count === 0 ? (
              <div className="empty-state">No rows returned. Try adjusting your requirement.</div>
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
                      <tr key={i} style={{ animationDelay: `${i * 30}ms` }} className="result-row">
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

      {isViewer && (
        <div style={{ marginTop: 24 }}>
          <DataBrowser token={token} userInfo={userInfo} />
        </div>
      )}

      {(isDataEngineer || isAdmin) && (
        <div style={{ marginTop: 24 }}>
          <SqlRunner token={token} userInfo={userInfo} />
        </div>
      )}

      {isAdmin && (
        <div style={{ marginTop: 24 }}>
          <UserManagement token={token} userInfo={userInfo} />
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <PipelineHistoryPanel token={token} userInfo={userInfo} />
      </div>
    </div>
  );
}