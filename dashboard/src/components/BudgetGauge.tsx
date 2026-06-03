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
      <div className="text-xs text-[#555] mt-1">privacy budget remaining</div>
      <div className="text-[10px] text-[#3a3a3a] mt-1.5 text-center max-w-48 leading-relaxed">
        {pct > 40 ? "Plenty of budget left. Queries are unrestricted." : pct > 15 ? "Budget running low. Queries will be limited soon." : "Critical: nearly exhausted. Most queries are now blocked."}
      </div>
      <div className="text-[10px] text-[#2e2e2e] mt-2">{rows.length} user group{rows.length !== 1 ? "s" : ""} tracked</div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-2">
      <div className="text-[#333] text-sm">No budget data yet</div>
      <div className="text-[10px] text-[#2a2a2a] text-center max-w-52 leading-relaxed">
        The gauge will show how much privacy budget the selected user group has spent. Budget resets daily.
      </div>
    </div>
  );
}
