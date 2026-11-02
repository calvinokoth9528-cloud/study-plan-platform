"use client";

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

interface DonutChartProps {
  data: { name: string; value: number }[];
  colors: Record<string, string>;
}

export function DonutChart({ data, colors }: DonutChartProps) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={54} outerRadius={82} paddingAngle={2} dataKey="value">
          {data.map((entry) => (
            <Cell key={entry.name} fill={colors[entry.name] ?? "#94a3b8"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: "8px", border: "1px solid var(--border-strong)", background: "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: "12px" }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => <span className="text-xs text-text-secondary">{String(value)}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface BarChartProps {
  data: { label: string; hours: number }[];
  color?: string;
}

export function BarChart({ data, color = "#6366f1" }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ReBarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-strong)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
        <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} width={44} />
        <Tooltip
          contentStyle={{ borderRadius: "8px", border: "1px solid var(--border-strong)", background: "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: "12px" }}
          formatter={(value) => [Number(value).toFixed(1) + "h", "Hours"]}
        />
        <Bar dataKey="hours" fill={color} radius={[4, 4, 0, 0]} />
      </ReBarChart>
    </ResponsiveContainer>
  );
}
