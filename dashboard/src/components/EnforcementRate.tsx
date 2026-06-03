import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function EnforcementRate({ served, suppressed }: { served: number; suppressed: number }) {
  const total = served + suppressed;
  if (total === 0) return <div className="flex items-center justify-center h-48 text-gray-600 text-sm">No enforcement data yet</div>;

  const data = [
    { name: "Served", value: served },
    { name: "Suppressed", value: suppressed },
  ];
  const COLORS = ["#4ade80", "#f87171"];

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6 }}
            formatter={(v: any) => [`${v} (${(((v as number) / total) * 100).toFixed(1)}%)`, ""]}
          />
          <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-400">{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center text-xs text-gray-600">{total} total decisions</div>
    </div>
  );
}
