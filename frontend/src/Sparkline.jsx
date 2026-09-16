import { LineChart, Line, ResponsiveContainer } from "recharts";

export default function Sparkline({ data, valueKey, color = "#8b5cf6" }) {
  if (!data || data.length < 2) return null;

  return (
    <div style={{ height: 32, marginTop: 6 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey={valueKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}