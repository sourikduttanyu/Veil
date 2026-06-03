import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { BudgetRow } from "../api";

export function BudgetGauge({ rows }: { rows: BudgetRow[] }) {
  if (!rows.length) return <Empty />;

  const total = rows.reduce((s, r) => s + r.max_budget, 0);
  const spent = rows.reduce((s, r) => s + r.spent, 0);
  const pct = total > 0 ? Math.round((1 - spent / total) * 100) : 100;
  const data = [{ name: "Remaining", value: pct, fill: pct > 40 ? "#4ade80" : pct > 15 ? "#fbbf24" : "#f87171" }];

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={160}>
        <RadialBarChart cx="50%" cy="80%" innerRadius="60%" outerRadius="90%" startAngle={180} endAngle={0} data={data}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: "#222" }} dataKey="value" angleAxisId={0} />
          <Tooltip
            contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6 }}
            formatter={(v: any) => [`${v}%`, "Budget remaining"]}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="text-2xl font-bold -mt-8" style={{ color: data[0].fill }}>{pct}%</div>
      <div className="text-xs text-gray-500 mt-1">ε remaining</div>
      <div className="text-xs text-gray-600 mt-2">{rows.length} cohort{rows.length !== 1 ? "s" : ""} tracked</div>
    </div>
  );
}

function Empty() {
  return <div className="flex items-center justify-center h-48 text-gray-600 text-sm">No budget data yet</div>;
}
