"use client";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ChevronRight, Lightbulb } from "lucide-react";
import Badge from "./Badge";
import { Insight } from "@/lib/analysis";
import { groupBy, pct, R, sum, won } from "@/lib/util";

const C = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)"];
const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink)", fontSize: 12 } };
const ax = { stroke: "var(--mut)", fontSize: 11 };
const ALERT = { bad: ["위험", "t-bad"], warn: ["주의", "t-warn"], info: ["참고", "t-info"] } as const;

export default function Dashboard(p: {
  customers: R[]; units: R[]; consultations: R[]; contracts: R[]; ads: R[]; recent: R[];
  alerts: { tone: "bad" | "warn" | "info"; text: string }[];
  funnel: { label: string; value: number; sub: string }[];
  insights: Insight[]; highlight: Insight;
}) {
  const [year, setYear] = useState("전체");

  const d = useMemo(() => {
    const inYear = (s: string) => year === "전체" || s.startsWith(year);
    const ct = p.contracts.filter((c) => !c.is_future && inYear(c.contract_date));
    const valid = ct.filter((c) => c.status !== "해지");
    const cons = p.consultations.filter((c) => !c.is_future && inYear(c.consult_date));
    const ad = p.ads.filter((a) => inYear(a.month));
    const lead = Object.fromEntries(p.customers.map((c) => [c.customer_id, c.lead_source]));

    const monthly = Object.entries(groupBy(ct, (c) => c.contract_date.slice(0, 7))).sort().map(([m, xs]) => ({
      month: m, 완료: xs.filter((x) => x.status === "완료").length, 진행중: xs.filter((x) => x.status === "진행중").length, 해지: xs.filter((x) => x.status === "해지").length }));
    const chan = Object.entries(groupBy(ad, (a) => a.channel)).map(([ch, xs]) => ({
      channel: ch, 리드당비용: Math.round((sum(xs, "spend_10k_krw") / sum(xs, "leads")) * 100) / 100 })).sort((a, b) => a.리드당비용 - b.리드당비용);
    const typ = Object.entries(groupBy(p.units, (u) => u.type)).map(([t, xs]) => ({
      type: t, 분양률: pct(xs.filter((x) => x.status === "계약완료").length, xs.length) })).sort((a, b) => b.분양률 - a.분양률);
    const cancel = Object.entries(groupBy(ct.filter((c) => lead[c.customer_id]), (c) => lead[c.customer_id])).map(([s, xs]) => ({
      source: s, 해지율: pct(xs.filter((x) => x.status === "해지").length, xs.length) })).sort((a, b) => b.해지율 - a.해지율);
    const cons2 = Object.entries(groupBy(cons, (c) => c.consultant)).map(([n, xs]) => ({
      consultant: n, 계약희망률: pct(xs.filter((x) => x.outcome === "계약희망").length, xs.length) })).sort((a, b) => b.계약희망률 - a.계약희망률);
    const adMonthly = Object.entries(groupBy(ad, (a) => a.month)).sort().map(([m, xs]) => ({
      month: m, 광고비: sum(xs, "spend_10k_krw"), 리드: sum(xs, "leads") }));

    const kpi = {
      n: valid.length, amount: sum(valid, "price_10k_krw"), cancel: pct(ct.length - valid.length, ct.length),
      sold: pct(p.units.filter((u) => u.status === "계약완료").length, p.units.length),
      cons: cons.length, hope: pct(cons.filter((c) => c.outcome === "계약희망").length, cons.length),
    };
    return { monthly, chan, typ, cancel, cons2, adMonthly, kpi };
  }, [year, p.contracts, p.consultations, p.ads, p.customers, p.units]);

  const k = d.kpi;
  const cards: [string, string, string, string, boolean][] = [
    ["유효 계약(해지 제외)", String(k.n), "건", "기간 필터 적용", true],
    ["계약금액 합계", won(k.amount), "", "해지 제외 · 0원 계약 제외", true],
    ["계약 해지율", String(k.cancel), "%", "해지 ÷ 전체 계약", false],
    ["분양률", String(k.sold), "%", "호실 기준(units)", false],
    ["상담 건수", k.cons.toLocaleString(), "건", "기준일 이전", false],
    ["상담 후 계약희망", String(k.hope), "%", "계약희망 ÷ 상담", false],
  ];
  const fmax = Math.max(...p.funnel.map((f) => f.value));

  return (
    <>
      <div className="page-h">
        <h1>대시보드</h1>
        <p className="sub">100% 합성 데이터 · 기준일 2026-10-23(이후 일자 제외) · 금액은 만원/억 · 정리 방법은 &quot;데이터 정리 로그&quot;</p>
      </div>
      <div className="filters" role="group" aria-label="기간" style={{ marginBottom: 12 }}>
        {["전체", "2024", "2025", "2026"].map((y) => (<button key={y} className={y === year ? "on" : ""} onClick={() => setYear(y)}>{y === "전체" ? "전체 기간" : `${y}년`}</button>))}
      </div>
      <div className="kpis">
        {cards.map(([label, v, unit, note, hi]) => (
          <div key={label} className={`card kpi ${hi ? "hi" : ""}`}><span>{label}</span><b>{v}<small>{unit}</small></b><p>{note}</p></div>
        ))}
      </div>

      <div className="grid2 sec">
        <div className="card callout">
          <h2><AlertTriangle size={16} aria-hidden /> 오늘의 주의 알림 <span className="sub">(전체 기간 기준)</span></h2>
          {p.alerts.map((a, i) => (<div key={i} className="alert-li"><b className={ALERT[a.tone][1]}>{ALERT[a.tone][0]}</b><span>{a.text}</span></div>))}
        </div>
        <div className="card callout info">
          <h2><Lightbulb size={16} aria-hidden /> 데이터 인사이트 하이라이트</h2>
          <h3>{p.highlight.title}</h3>
          <p style={{ margin: 0, fontSize: 13 }}>{p.highlight.find}</p>
          <p className="sub" style={{ marginTop: 6 }}><a href="#insights">전체 인사이트 5개 보기 →</a></p>
        </div>
      </div>

      <div className="card sec">
        <h2>영업 파이프라인 <span className="sub">(전체 기간 · 기준일 이전)</span></h2>
        <div className="pipe">
          {p.funnel.map((f, i) => (
            <div key={f.label} style={{ display: "contents" }}>
              {i > 0 && <i><ChevronRight size={16} aria-hidden /></i>}
              <div><span>{f.label}</span><b>{f.value.toLocaleString()}</b><span>{f.sub}</span>
                <div style={{ height: 4, borderRadius: 4, background: "var(--line)", marginTop: 6, padding: 0, border: 0, minWidth: 0 }}>
                  <div style={{ height: 4, borderRadius: 4, background: "var(--acc)", width: `${(f.value / fmax) * 100}%`, padding: 0, border: 0, minWidth: 0 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid2 sec">
        <div className="card"><div className="chart-h"><h3>월별 계약 건수</h3><span className="sub">상태별 누적</span></div><div className="chart"><ResponsiveContainer><BarChart data={d.monthly}><CartesianGrid stroke="var(--line)" /><XAxis dataKey="month" {...ax} /><YAxis {...ax} /><Tooltip {...tip} /><Legend /><Bar dataKey="완료" stackId="a" fill={C[2]} /><Bar dataKey="진행중" stackId="a" fill={C[1]} /><Bar dataKey="해지" stackId="a" fill={C[3]} /></BarChart></ResponsiveContainer></div></div>
        <div className="card"><div className="chart-h"><h3>광고 채널별 리드당 비용</h3><span className="sub">만원 · 낮을수록 효율</span></div><div className="chart">{d.chan.length ? <ResponsiveContainer><BarChart data={d.chan} layout="vertical"><CartesianGrid stroke="var(--line)" /><XAxis type="number" domain={[0, "auto"]} {...ax} /><YAxis type="category" dataKey="channel" width={90} {...ax} /><Tooltip {...tip} /><Bar dataKey="리드당비용" fill={C[0]} /></BarChart></ResponsiveContainer> : <p className="sub">선택 기간에 광고 데이터가 없습니다 (광고 데이터: 2024~2025).</p>}</div></div>
        <div className="card"><div className="chart-h"><h3>타입별 분양률</h3><span className="sub">% · units 기준 · 기간 필터 미적용</span></div><div className="chart"><ResponsiveContainer><BarChart data={d.typ}><CartesianGrid stroke="var(--line)" /><XAxis dataKey="type" {...ax} /><YAxis {...ax} domain={[0, 100]} /><Tooltip {...tip} /><Bar dataKey="분양률" fill={C[2]} /></BarChart></ResponsiveContainer></div></div>
        <div className="card"><div className="chart-h"><h3>유입경로별 계약 해지율</h3><span className="sub">%</span></div><div className="chart"><ResponsiveContainer><BarChart data={d.cancel}><CartesianGrid stroke="var(--line)" /><XAxis dataKey="source" {...ax} /><YAxis {...ax} /><Tooltip {...tip} /><Bar dataKey="해지율" fill={C[3]} /></BarChart></ResponsiveContainer></div></div>
        <div className="card"><div className="chart-h"><h3>상담사별 계약희망 비율</h3><span className="sub">%</span></div><div className="chart"><ResponsiveContainer><BarChart data={d.cons2}><CartesianGrid stroke="var(--line)" /><XAxis dataKey="consultant" {...ax} /><YAxis {...ax} domain={[0, 60]} /><Tooltip {...tip} /><Bar dataKey="계약희망률" fill={C[1]} /></BarChart></ResponsiveContainer></div></div>
        <div className="card"><div className="chart-h"><h3>월별 광고비 vs 리드</h3><span className="sub">2024~2025</span></div><div className="chart">{d.adMonthly.length ? <ResponsiveContainer><LineChart data={d.adMonthly}><CartesianGrid stroke="var(--line)" /><XAxis dataKey="month" {...ax} /><YAxis yAxisId="l" {...ax} /><YAxis yAxisId="r" orientation="right" {...ax} /><Tooltip {...tip} /><Legend /><Line yAxisId="l" dataKey="광고비" stroke={C[0]} dot={false} /><Line yAxisId="r" dataKey="리드" stroke={C[1]} dot={false} /></LineChart></ResponsiveContainer> : <p className="sub">선택 기간에 광고 데이터가 없습니다.</p>}</div></div>
      </div>

      <div className="card pad0 sec">
        <div className="tools"><h2 style={{ margin: 0 }}>최근 계약 로그</h2><span className="sub">최근 10건 · 기준일 이전</span></div>
        <div className="scroll"><table>
          <thead><tr><th>계약일</th><th>계약 ID</th><th>고객</th><th>유입경로</th><th>상태</th><th className="num">계약금액</th><th>담당</th></tr></thead>
          <tbody>{p.recent.map((r) => (
            <tr key={r.contract_id}><td className="mono">{r.contract_date}</td><td className="mono">{r.contract_id}</td><td>{r.customer}</td><td>{r.lead_source}</td>
              <td><Badge v={r.status} /></td><td className="num">{r.price_10k_krw ? `${Number(r.price_10k_krw).toLocaleString()}만` : "–"}</td><td>{r.sales_rep}</td></tr>))}</tbody>
        </table></div>
      </div>

      <h2 id="insights" style={{ marginTop: 24 }}>인사이트 <span className="sub">발견 → 근거 → 제안 · 전체 기간 필터 기준 · 수치는 DB 집계로 자동 계산</span></h2>
      <div className="grid2">
        {p.insights.map((n, i) => (
          <div key={i} className="card ins">
            <h3>인사이트 {i + 1} · {n.title}</h3>
            <p><span className="tag">발견</span>{n.find}</p>
            <p><span className="tag">근거</span>{n.basis}</p>
            <p><span className="tag">제안</span>{n.act}</p>
            <p className="sub">한계: {n.caveat}</p>
          </div>
        ))}
      </div>
    </>
  );
}
