import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const TREND_ICONS = { upward: "📈", downward: "📉", stable: "➡️", volatile: "⚡" };
const PIE_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#3b82f6"];

// Note: Grouped Bar, Heatmap, and Box Plot are intentionally excluded.
// Those chart types need multi-series or multi-dimensional data (e.g. a
// metric broken down by two categories at once), but every KPI pipeline
// here produces a single label + single value per row. Rendering those
// chart types on this data shape would be misleading rather than useful.
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

export function ChartRenderer({ type, results, valueKey, labelKey, height = 280 }) {
  const tooltipStyle = { background: "#141a2b", border: "1px solid #262f47", borderRadius: 8, fontSize: 12 };
  const axisProps = { stroke: "#8b93ab", fontSize: 12 };

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={results} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262f47" />
          <XAxis dataKey={labelKey} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e8ebf5" }} />
          <Line type="monotone" dataKey={valueKey} stroke="#8b5cf6" strokeWidth={2} dot={{ fill: "#8b5cf6", r: 4 }} />
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
          <Area type="monotone" dataKey={valueKey} stroke="#06b6d4" fill="rgba(6,182,212,0.2)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "pie" || type === "donut") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={results}
            dataKey={valueKey}
            nameKey={labelKey}
            cx="50%"
            cy="50%"
            innerRadius={type === "donut" ? height / 5 : 0}
            outerRadius={height / 2.8}
            label={(entry) => entry[labelKey]}
          >
            {results.map((_, index) => (
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
    const scatterData = results.map((r, i) => ({ x: i, y: r[valueKey], label: r[labelKey] }));
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
    const bins = buildHistogramBins(results, valueKey);
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
          <Bar dataKey={valueKey} fill="#ec4899" radius={[0, 6, 6, 0]} />
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
        <Bar dataKey={valueKey} fill="#6366f1" radius={[6, 6, 0, 0]} />
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

  const keys = Object.keys(results[0]);
  const valueKey = keys.find((k) => typeof results[0][k] === "number");
  const labelKey = keys.find((k) => k !== valueKey);
  if (!valueKey) return null;

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
        <ChartRenderer type={chartType} results={results} valueKey={valueKey} labelKey={labelKey} />
      </div>
    </div>
  );
}