import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// Static experiment results — updated after Phase 6 runs
const EXPERIMENT_DATA = [
  { epsilon: 0.1, mae: 18.4, label: "ε=0.1" },
  { epsilon: 0.5, mae: 11.2, label: "ε=0.5" },
  { epsilon: 1.0, mae: 6.8,  label: "ε=1.0" },
  { epsilon: 2.0, mae: 4.1,  label: "ε=2.0" },
  { epsilon: 5.0, mae: 2.3,  label: "ε=5.0" },
];

export function AccuracyTradeoff() {
  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={EXPERIMENT_DATA} margin={{ top: 4, right: 16, bottom: 16, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis dataKey="epsilon" tick={{ fill: "#888", fontSize: 11 }}
            label={{ value: "Epsilon (ε)", position: "insideBottom", offset: -8, fill: "#666", fontSize: 11 }} />
          <YAxis tick={{ fill: "#888", fontSize: 11 }}
            label={{ value: "MAE %", angle: -90, position: "insideLeft", offset: 12, fill: "#666", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6 }}
            formatter={(v: any) => [`${v}%`, "Mean Absolute Error"]}
            labelFormatter={(v) => `ε = ${v}`}
          />
          <ReferenceLine y={3} stroke="#4ade8044" strokeDasharray="4 4" label={{ value: "3% target", fill: "#4ade80", fontSize: 10 }} />
          <Line type="monotone" dataKey="mae" stroke="#7c7cff" strokeWidth={2} dot={{ fill: "#7c7cff", r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-600 text-center mt-1">Lower ε = more privacy, higher error. Run experiments to update.</p>
    </div>
  );
}
