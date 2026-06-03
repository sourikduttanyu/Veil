import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Bucket } from "../api";

export function FrequencyChart({ data }: { data: Bucket[] }) {
  if (!data.length) return <Empty label="No impression data yet" />;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
        <XAxis dataKey="count" tick={{ fill: "#888", fontSize: 11 }} label={{ value: "Noisy count", position: "insideBottom", offset: -2, fill: "#666", fontSize: 11 }} />
        <YAxis tick={{ fill: "#888", fontSize: 11 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
        <Tooltip
          contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6 }}
          labelStyle={{ color: "#aaa" }}
          formatter={(v: any) => [`${((v as number) * 100).toFixed(1)}%`, "Frequency"]}
        />
        <Bar dataKey="frequency" radius={[3, 3, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={`hsl(${220 + i * 15}, 70%, 60%)`} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="flex items-center justify-center h-48 text-gray-600 text-sm">{label}</div>;
}
