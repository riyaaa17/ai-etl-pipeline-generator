import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const TREND_ICONS = { upward: "📈", downward: "📉", stable: "➡️", volatile: "⚡" };
const PIE_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#3b82f6"];

const CHART_TYPES = [
  { id: "bar", label: "📊 Bar" },
  { id: "column", label: "📶 Column" },
  { id: "line", label: "📈 Line" },
  { id: "area", label: "🌄 Area" },
  { id: "pie", label: "🥧 Pie" },
  { id: "donut", label: "🍩 Donut" },
  { id: "scatter", label: "⚬ Scatter" },
  { id: "histogram", label: "📶 Histogram" },
];

function getValueKeys(row) {
  return Object.keys(row).filter((k) => typeof row[k] === "number");
}
function getLabelKey(row, valueKeys) {
  return Object.keys(row).find((k) => !valueKeys.includes(k));
}

function buildHistogramBins(results, valueKey, binCount = 6) {
  const values = results.map((r) => r[valueKey]).filter((v) => typeof v === "number");
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binSize = (max - min) / binCount || 1;

  const bins = Array.from({ length: binCount }, (_, i) => ({
    range: `${Math.round(min + i * binSize)}–${Math.round(min + (i + 1) * binSize)}`,
    count: 0,
  }));

  values.forEach((v) => {
    let idx = Math.floor((v - min) / binSize);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count += 1;
  });

  return bins;
}

function formatChartNumber(n) {
  if (n === null || n === undefined) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function InvalidChartMessage({ reason }) {
  return (
    <div style={{
      height: 200, display: "flex", alignItems: "center", justifyContent: "center",
      color: "var(--color-text-dim)", fontSize: 13, fontStyle: "italic", textAlign: "center", padding: 20
    }}>
      ⚠ Invalid visualization for this query{reason ? ` — ${reason}` : ""}
    </div>
  );
}

// Note: Grouped Bar, Heatmap, and Box Plot are intentionally excluded.
// Those chart types need multi-series or multi-dimensional data, but
// every KPI pipeline here produces a single label + one or more values
// per row. Rendering those chart types on this data shape would be
// misleading rather than useful.
export function ChartRenderer({ type, results, valueKeys, labelKey, height = 280 }) {
  const tooltipStyle = { background: "#141a2b", border: "1px solid #262f47", borderRadius: 8, fontSize: 12 };
  const axisProps = { stroke: "#8b93ab", fontSize: 12 };
  const keys = Array.isArray(valueKeys) ? valueKeys : [valueKeys];
  const primaryKey = keys[0];

  // Wide-format detection: a single row where the metrics themselves are
  // the thing being compared (e.g. "revenue 2025 vs revenue 2026" returns
  // one row with two numeric columns and no separate label column). In
  // this case we pivot the metric names into categories so every chart
  // type can render all values meaningfully.
  const isWideFormat = keys.length > 1 && (results.length === 1 || !labelKey);

  if (isWideFormat) {
    const pivoted = keys.map((k) => ({ metric: k, value: results[0][k] }));

    if (type === "histogram") {
      return <InvalidChartMessage reason="not enough data points for a distribution" />;
    }

    if (type === "pie" || type === "donut") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={pivoted}
              dataKey="value"
              nameKey="metric"
              cx="50%"
              cy="50%"
              innerRadius={type === "donut" ? height / 5 : 0}
              outerRadius={height / 2.8}
              label={({ name, value, percent }) => `${name}: ${formatChartNumber(value)} (${(percent * 100).toFixed(1)}%)`}
            >
              {pivoted.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#8b93ab" }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (type === "scatter") {
      const scatterData = pivoted.map((r, i) => ({ x: i, y: r.value, label: r.metric }));
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262f47" />
            <XAxis dataKey="x" {...axisProps} tickFormatter={(i) => pivoted[i]?.metric ?? ""} />
            <YAxis dataKey="y" {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(i) => pivoted[i]?.metric ?? ""} />
            <Scatter data={scatterData} fill="#f59e0b" />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    if (type === "line") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={pivoted} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262f47" />
            <XAxis dataKey="metric" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e8ebf5" }} />
            <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (type === "area") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={pivoted} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262f47" />
            <XAxis dataKey="metric" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e8ebf5" }} />
            <Area type="monotone" dataKey="value" stroke="#06b6d4" fill="rgba(6,182,212,0.2)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (type === "column") {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={pivoted} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262f47" />
            <XAxis type="number" {...axisProps} />
            <YAxis type="category" dataKey="metric" {...axisProps} width={100} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e8ebf5" }} />
            <Bar dataKey="value" fill="#ec4899" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // default: bar (also covers explicit "bar" type)
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={pivoted} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262f47" />
          <XAxis dataKey="metric" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e8ebf5" }} />
          <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ---- Normal (multi-row) rendering below ----

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={results} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262f47" />
          <XAxis dataKey={labelKey} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e8ebf5" }} />
          {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "#8b93ab" }} />}
          {keys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={results} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262f47" />
          <XAxis dataKey={labelKey} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e8ebf5" }} />
          {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "#8b93ab" }} />}
          {keys.map((k, i) => (
            <Area key={k} type="monotone" dataKey={k} stroke={PIE_COLORS[i % PIE_COLORS.length]} fill={PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.2} strokeWidth={2} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "pie" || type === "donut") {
    return (
      <div>
        {keys.length > 1 && (
          <div style={{ fontSize: 11, color: "#8b93ab", marginBottom: 8, fontStyle: "italic" }}>
            Showing "{primaryKey}" only — pie/donut charts display one metric at a time across categories.
          </div>
        )}
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={results}
              dataKey={primaryKey}
              nameKey={labelKey}
              cx="50%"
              cy="50%"
              innerRadius={type === "donut" ? height / 5 : 0}
              outerRadius={height / 2.8}
              label={({ name, value, percent }) => `${name}: ${formatChartNumber(value)} (${(percent * 100).toFixed(1)}%)`}
            >
              {results.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#8b93ab" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "scatter") {
    if (results.length < 2) {
      return <InvalidChartMessage reason="scatter plots need more than one data point" />;
    }
    const scatterData = results.map((r, i) => ({ x: i, y: r[primaryKey], label: r[labelKey] }));
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262f47" />
          <XAxis dataKey="x" {...axisProps} tickFormatter={(i) => results[i]?.[labelKey] ?? ""} />
          <YAxis dataKey="y" {...axisProps} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(i) => results[i]?.[labelKey] ?? ""} />
          <Scatter data={scatterData} fill="#f59e0b" />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (type === "histogram") {
    if (results.length < 4) {
      return <InvalidChartMessage reason="not enough data points for a meaningful distribution" />;
    }
    const bins = buildHistogramBins(results, primaryKey);
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={bins} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262f47" />
          <XAxis dataKey="range" {...axisProps} />
          <YAxis {...axisProps} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e8ebf5" }} />
          <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "column") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={results} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262f47" />
          <XAxis type="number" {...axisProps} />
          <YAxis type="category" dataKey={labelKey} {...axisProps} width={80} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e8ebf5" }} />
          {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "#8b93ab" }} />}
          {keys.map((k, i) => (
            <Bar key={k} dataKey={k} fill={PIE_COLORS[i % PIE_COLORS.length]} radius={[0, 6, 6, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // default: bar
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={results} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262f47" />
        <XAxis dataKey={labelKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e8ebf5" }} />
        {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: "#8b93ab" }} />}
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={PIE_COLORS[i % PIE_COLORS.length]} radius={[6, 6, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function InsightsPanel({ insight, results, onChartTypeChange }) {
  const [chartType, setChartType] = useState("bar");

  useEffect(() => {
    onChartTypeChange?.(chartType);
  }, [chartType]);

  if (!results || results.length === 0) return null;

  const valueKeys = getValueKeys(results[0]);
  const labelKey = getLabelKey(results[0], valueKeys);
  if (valueKeys.length === 0) return null;

  return (
    <div>
      {insight && (
        <div className="insight-card">
          <div className="insight-header">
            <span style={{ fontSize: 20 }}>{TREND_ICONS[insight.trend] || "💡"}</span>
            <span className="insight-label">Business Insight</span>
          </div>
          <p className="insight-text">{insight.insight}</p>
          {insight.key_points?.length > 0 && (
            <ul className="insight-bullets">
              {insight.key_points.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="chart-type-selector">
        {CHART_TYPES.map((c) => (
          <span
            key={c.id}
            className={`chart-type-chip ${chartType === c.id ? "active" : ""}`}
            onClick={() => setChartType(c.id)}
          >
            {c.label}
          </span>
        ))}
      </div>

      <div className="chart-wrap">
        <ChartRenderer type={chartType} results={results} valueKeys={valueKeys} labelKey={labelKey} />
      </div>
    </div>
  );
}