import { useState, useEffect, useMemo, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ChartRenderer } from "./InsightsPanel";
import Sparkline from "./Sparkline";

const API_BASE = "http://localhost:8001";

const CHART_TYPE_OPTIONS = [
  { id: "bar", label: "📊" },
  { id: "column", label: "📶" },
  { id: "line", label: "📈" },
  { id: "area", label: "🌄" },
  { id: "pie", label: "🥧" },
  { id: "donut", label: "🍩" },
  { id: "scatter", label: "⚬" },
  { id: "histogram", label: "📶" },
];

function getValueKeys(row) {
  return Object.keys(row).filter((k) => typeof row[k] === "number");
}
function getLabelKey(row, valueKeys) {
  return Object.keys(row).find((k) => !valueKeys.includes(k));
}

function isDateLike(label) {
  if (label === null || label === undefined) return false;
  const str = String(label);
  return /^\d{4}-\d{2}(-\d{2})?$/.test(str) || !isNaN(Date.parse(str));
}

function computeStat(widget) {
  const results = widget.results;
  if (!results || results.length === 0) return null;
  const valueKeys = getValueKeys(results[0]);
  const labelKey = getLabelKey(results[0], valueKeys);
  if (valueKeys.length === 0) return null;
  const valueKey = valueKeys[0]; // Key Metrics card summarizes the first metric only

  const values = results.map((r) => r[valueKey]).filter((v) => v !== null && v !== undefined);
  if (values.length === 0) return null;

  const latest = values[values.length - 1];
  const latestLabel = results[results.length - 1]?.[labelKey];

  const isTimeSeries = isDateLike(latestLabel);

  let periodChange = null;
  let previous = null;
  let previousLabel = null;

  if (isTimeSeries && values.length >= 2) {
    previous = values[values.length - 2];
    previousLabel = results[results.length - 2]?.[labelKey];
    periodChange = previous !== 0 ? ((latest - previous) / Math.abs(previous)) * 100 : null;
  }

  const first = values[0];
  const overallChange = first !== 0 ? ((latest - first) / Math.abs(first)) * 100 : 0;

  return {
    latest,
    latestLabel,
    previous,
    previousLabel,
    isTimeSeries,
    periodChange: periodChange !== null ? Math.round(periodChange * 10) / 10 : null,
    periodDirection: periodChange === null ? "flat" : periodChange > 0 ? "up" : periodChange < 0 ? "down" : "flat",
    overallChange: Math.round(overallChange * 10) / 10,
    overallDirection: overallChange > 0 ? "up" : overallChange < 0 ? "down" : "flat",
    valueKey,
    metricCount: valueKeys.length,
  };
}

function formatNumber(n) {
  if (n === null || n === undefined) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

async function exportElementAsPng(element, filename) {
  const canvas = await html2canvas(element, { backgroundColor: "#0a0e17", scale: 2 });
  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

async function exportElementAsPdf(element, filename) {
  const canvas = await html2canvas(element, { backgroundColor: "#0a0e17", scale: 2 });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? "landscape" : "portrait",
    unit: "px",
    format: [canvas.width, canvas.height],
  });
  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(`${filename}.pdf`);
}

export default function DashboardBuilder({ token, userInfo }) {
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dashboardRef = useRef(null);
  const widgetRefs = useRef({});

  const isViewer = userInfo?.role === "Viewer";

  const loadWidgets = () => {
    setLoading(true);
    fetch(`${API_BASE}/dashboard/widgets`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setWidgets(data);
        else setError(data.detail || "Could not load dashboard.");
      })
      .catch(() => setError("Could not load dashboard."))
      .finally(() => setLoading(false));
  };

  useEffect(loadWidgets, [token]);

  const handleDelete = async (widgetId) => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/widgets/${widgetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setWidgets((prev) => prev.filter((w) => w.widget_id !== widgetId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChartTypeChange = async (widgetId, newType) => {
    setWidgets((prev) =>
      prev.map((w) => (w.widget_id === widgetId ? { ...w, chart_type: newType } : w))
    );
    try {
      await fetch(`${API_BASE}/dashboard/widgets/${widgetId}/chart-type`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chart_type: newType }),
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const stats = useMemo(() => {
    const seenTitles = new Set();
    const unique = [];
    for (const w of widgets) {
      if (seenTitles.has(w.title)) continue;
      seenTitles.add(w.title);
      const stat = computeStat(w);
      if (stat) unique.push({ widget: w, stat });
    }
    return unique;
  }, [widgets]);

  const scrollToWidget = (widgetId) => {
    widgetRefs.current[widgetId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    const el = widgetRefs.current[widgetId];
    if (el) {
      el.classList.add("widget-highlight");
      setTimeout(() => el.classList.remove("widget-highlight"), 1500);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }} ref={dashboardRef}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 className="card-title">📌 KPI Dashboard</h2>
            <p className="card-subtitle">
              Executive summary for <strong>{userInfo?.client_name}</strong> — {widgets.length} saved chart{widgets.length !== 1 ? "s" : ""}
            </p>
          </div>
          {widgets.length > 0 && (
            <button
              className="btn btn-secondary"
              style={{ width: "auto", padding: "8px 16px", fontSize: 12 }}
              onClick={() => exportElementAsPdf(dashboardRef.current, `${userInfo?.client_name}-dashboard`)}
            >
              📄 Export Dashboard PDF
            </button>
          )}
        </div>

        {loading && (
          <div className="loading-box">
            <div className="loading-row">
              <div className="spinner" />
              Loading dashboard...
            </div>
          </div>
        )}

        {error && <div className="alert alert-error">⚠ {error}</div>}

        {!loading && widgets.length === 0 && !error && (
          <div className="empty-canvas">
            <div className="empty-canvas-icon">📌</div>
            <div className="empty-canvas-title">No KPIs pinned yet</div>
            <div className="empty-canvas-sub">
              Go to the Generator tab, run a query, pick a chart type, and click "Add to Dashboard" to build your KPI summary.
            </div>
          </div>
        )}
      </div>

      {!loading && stats.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 24 }}>Key Metrics</div>
          <div className="stat-summary-grid">
            {stats.map(({ widget, stat }) => {
              const hasAnomaly = widget.monitoring_report?.anomaly_count > 0;
              return (
                <div
                  key={widget.widget_id}
                  className={`stat-summary-card ${hasAnomaly ? "stat-anomaly" : ""}`}
                  onClick={() => scrollToWidget(widget.widget_id)}
                  title="Click to view full chart"
                >
                  {hasAnomaly && <div className="stat-anomaly-badge">🚨 {widget.monitoring_report.anomaly_count}</div>}
                  <div className="stat-summary-title">
                    {widget.title}
                    {stat.metricCount > 1 && <span className="stat-multi-badge"> +{stat.metricCount - 1} more</span>}
                  </div>
                  <div className="stat-summary-value">{formatNumber(stat.latest)}</div>

                  {stat.isTimeSeries ? (
                    <>
                      {stat.periodChange !== null ? (
                        <div className={`stat-summary-change ${stat.periodDirection}`}>
                          {stat.periodDirection === "up" ? "▲" : stat.periodDirection === "down" ? "▼" : "—"} {Math.abs(stat.periodChange)}%
                          <span className="stat-summary-period">
                            {" "}vs {stat.previousLabel} ({stat.latestLabel})
                          </span>
                        </div>
                      ) : (
                        <div className="stat-summary-change flat">
                          <span className="stat-summary-period">Only one period available</span>
                        </div>
                      )}
                      <div className={`stat-summary-change-secondary ${stat.overallDirection}`}>
                        {stat.overallDirection === "up" ? "▲" : stat.overallDirection === "down" ? "▼" : "—"} {Math.abs(stat.overallChange)}% overall
                      </div>
                    </>
                  ) : (
                    <div className={`stat-summary-change ${stat.overallDirection}`}>
                      {stat.overallDirection === "up" ? "▲" : stat.overallDirection === "down" ? "▼" : "—"} {Math.abs(stat.overallChange)}%
                      <span className="stat-summary-period"> across categories</span>
                    </div>
                  )}

                  <Sparkline
                    data={widget.results}
                    valueKey={stat.valueKey}
                    color={hasAnomaly ? "#fbbf24" : "#8b5cf6"}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && widgets.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 28 }}>Charts & Trends</div>
          <div className="widget-grid-full">
            {widgets.map((w) => {
              const results = w.results;
              if (!results || results.length === 0) return null;
              const valueKeys = getValueKeys(results[0]);
              const labelKey = getLabelKey(results[0], valueKeys);
              if (valueKeys.length === 0) return null;

              const hasAnomaly = w.monitoring_report?.anomaly_count > 0;

              return (
                <div
                  key={w.widget_id}
                  ref={(el) => (widgetRefs.current[w.widget_id] = el)}
                  className={`widget-card-full ${hasAnomaly ? "widget-anomaly" : ""}`}
                >
                  <div className="widget-header">
                    <div>
                      <div className="widget-title">
                        {hasAnomaly && <span style={{ marginRight: 6 }}>🚨</span>}
                        {w.title}
                        {valueKeys.length > 1 && (
                          <span className="widget-metric-tags">
                            {valueKeys.map((k) => (
                              <span key={k} className="widget-metric-tag">{k}</span>
                            ))}
                          </span>
                        )}
                      </div>
                      <div className="widget-query">"{w.requirement}"</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        className="widget-icon-btn"
                        title="Download as PNG"
                        onClick={() => exportElementAsPng(widgetRefs.current[w.widget_id], w.title)}
                      >
                        📷
                      </button>
                      {!isViewer && (
                        <button className="widget-delete" onClick={() => handleDelete(w.widget_id)} title="Remove">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {!isViewer && (
                    <div className="widget-chart-switcher">
                      {CHART_TYPE_OPTIONS.map((c) => (
                        <span
                          key={c.id}
                          className={`widget-chart-chip ${w.chart_type === c.id ? "active" : ""}`}
                          onClick={() => handleChartTypeChange(w.widget_id, c.id)}
                          title={c.id}
                        >
                          {c.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <ChartRenderer type={w.chart_type || "bar"} results={results} valueKeys={valueKeys} labelKey={labelKey} height={220} />

                  {hasAnomaly && (
                    <div className="widget-anomaly-alert">
                      {w.monitoring_report.alerts?.[0] || "Anomaly detected in this metric."}
                    </div>
                  )}

                  {w.insight?.key_points?.length > 0 && (
                    <>
                      <div className="doc-label" style={{ marginTop: 12 }}>Key Insights</div>
                      <ul className="insight-bullets" style={{ marginTop: 4 }}>
                        {w.insight.key_points.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="widget-footer">
                    {results.length} rows · {new Date(w.created_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}