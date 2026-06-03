import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// Static experiment results — updated after Phase 6 experiments run
const EXPERIMENT_DATA = [
  { epsilon: 0.1, mae: 18.4 },
  { epsilon: 0.5, mae: 11.2 },
  { epsilon: 1.0, mae: 6.8  },
  { epsilon: 2.0, mae: 4.1  },
  { epsilon: 5.0, mae: 2.3  },
];

const PRIVACY_LABELS: Record<number, string> = {
  0.1: "Maximum privacy",
  0.5: "High privacy",
  1.0: "Balanced",
  2.0: "High accuracy",
  5.0: "Maximum accuracy",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const mae = payload[0].value as number;
  const desc = PRIVACY_LABELS[label] || "";
  return (
    <div className="bg-[#1c1c1e] border border-[#2e2e2e] rounded-lg px-3 py-2.5 text-xs shadow-xl">
      <div className="font-semibold text-[#e2e2e8] mb-1">ε = {label} — {desc}</div>
      <div className="text-[#f87171]">~{mae}% average error in frequency counts</div>
      <div className="text-[#666] mt-1 leading-relaxed max-w-44">
        {mae > 10
          ? "Heavy noise: caps may fire too early or too late."
          : mae > 4
          ? "Moderate noise: acceptable for most campaigns."
          : "Low noise: counts are nearly accurate."}
      </div>
    </div>
  );
}

export function AccuracyTradeoff() {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-[#444] mb-2 px-1">
        <span>← More private, less accurate</span>
        <span>Less private, more accurate →</span>
      </div>
      <ResponsiveContainer width="100%" height={185}>
        <LineChart data={EXPERIMENT_DATA} margin={{ top: 4, right: 16, bottom: 20, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1e" />
          <XAxis
            dataKey="epsilon"
            tick={{ fill: "#555", fontSize: 11 }}
            label={{ value: "Privacy setting (ε)", position: "insideBottom", offset: -10, fill: "#444", fontSize: 10 }}
          />
          <YAxis
            tick={{ fill: "#555", fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
            label={{ value: "Count error", angle: -90, position: "insideLeft", offset: 14, fill: "#444", fontSize: 10 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={3}
            stroke="#4ade8033"
            strokeDasharray="5 4"
            label={{ value: "3% target", fill: "#4ade8088", fontSize: 10, position: "right" }}
          />
          <Line
            type="monotone"
            dataKey="mae"
            stroke="#7c7cff"
            strokeWidth={2}
            dot={{ fill: "#7c7cff", r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "#a0a0ff" }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-[#333] text-center mt-0.5">
        Hover each point for plain-English interpretation · Based on 100k simulated impressions
      </p>
    </div>
  );
}
