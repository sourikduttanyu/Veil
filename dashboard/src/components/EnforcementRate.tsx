import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function EnforcementRate({ served, suppressed }: { served: number; suppressed: number }) {
  const total = served + suppressed;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <div className="text-[#333] text-sm">No enforcement data yet</div>
        <div className="text-[10px] text-[#2a2a2a] text-center max-w-52 leading-relaxed">
          Once ads are being processed, this shows what percentage were shown (under limit) vs. blocked (over limit).
        </div>
      </div>
    );
  }

  const serveRate = ((served / total) * 100).toFixed(1);
  const suppressRate = ((suppressed / total) * 100).toFixed(1);

  const data = [
    { name: "Served (shown to user)", value: served },
    { name: "Suppressed (blocked)", value: suppressed },
  ];
  const COLORS = ["#4ade80", "#f87171"];

  return (
    <div>
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={3}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#1c1c1e", border: "1px solid #2e2e2e", borderRadius: 8, fontSize: 12 }}
            formatter={(v: any) => {
              const pct = (((v as number) / total) * 100).toFixed(1);
              return [`${v} impressions (${pct}%)`, ""];
            }}
          />
          <Legend
            iconType="circle"
            iconSize={7}
            formatter={(v) => <span style={{ fontSize: 11, color: "#888" }}>{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-6 text-xs text-[#555] mt-1">
        <span><span className="text-[#4ade80] font-medium">{serveRate}%</span> shown</span>
        <span><span className="text-[#f87171] font-medium">{suppressRate}%</span> blocked</span>
        <span>{total.toLocaleString()} total</span>
      </div>
    </div>
  );
}
