"use client";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const C = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)"];

export default function AdsChart({ data, channels }: { data: Record<string, any>[]; channels: string[] }) {
  return (
    <div className="chart" style={{ height: 320 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid stroke="var(--line)" />
          <XAxis dataKey="month" stroke="var(--mut)" fontSize={11} />
          <YAxis stroke="var(--mut)" fontSize={11} />
          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink)", fontSize: 12 }} />
          <Legend />
          {channels.map((c, i) => (<Bar key={c} dataKey={c} stackId="a" fill={C[i % 6]} />))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
