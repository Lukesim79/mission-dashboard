"use client";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type R = Record<string, any>;
const C = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)"];
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const won = (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${Math.round(v).toLocaleString()}만`);
const groupBy = <T,>(xs: T[], f: (x: T) => string) => xs.reduce<Record<string, T[]>>((m, x) => ((m[f(x)] ||= []).push(x), m), {});

export default function Dashboard({ customers, units, consultations, contracts, ads }: { customers: R[]; units: R[]; consultations: R[]; contracts: R[]; ads: R[] }) {
  const [year, setYear] = useState("전체");

  const d = useMemo(() => {
    const inYear = (s: string) => year === "전체" || s.startsWith(year);
    const ct = contracts.filter((c) => !c.is_future && inYear(c.contract_date));
    const valid = ct.filter((c) => c.status !== "해지");
    const cons = consultations.filter((c) => !c.is_future && inYear(c.consult_date));
    const ad = ads.filter((a) => inYear(a.month));
    const lead = Object.fromEntries(customers.map((c) => [c.customer_id, c.lead_source]));

    const monthly = Object.entries(groupBy(ct, (c) => c.contract_date.slice(0, 7))).sort().map(([m, xs]) => ({
      month: m, 완료: xs.filter((x) => x.status === "완료").length, 진행중: xs.filter((x) => x.status === "진행중").length, 해지: xs.filter((x) => x.status === "해지").length }));
    const chan = Object.entries(groupBy(ad, (a) => a.channel)).map(([ch, xs]) => {
      const s = xs.reduce((n, x) => n + x.spend_10k_krw, 0), l = xs.reduce((n, x) => n + x.leads, 0);
      return { channel: ch, 리드당비용: Math.round((s / l) * 100) / 100 };
    }).sort((a, b) => a.리드당비용 - b.리드당비용);
    const typ = Object.entries(groupBy(units, (u) => u.type)).map(([t, xs]) => ({
      type: t, 분양률: pct(xs.filter((x) => x.status === "계약완료").length, xs.length) })).sort((a, b) => b.분양률 - a.분양률);
    const cancel = Object.entries(groupBy(ct.filter((c) => lead[c.customer_id]), (c) => lead[c.customer_id])).map(([s, xs]) => ({
      source: s, 해지율: pct(xs.filter((x) => x.status === "해지").length, xs.length) })).sort((a, b) => b.해지율 - a.해지율);
    const cons2 = Object.entries(groupBy(cons, (c) => c.consultant)).map(([n, xs]) => ({
      consultant: n, 계약희망률: pct(xs.filter((x) => x.outcome === "계약희망").length, xs.length) })).sort((a, b) => b.계약희망률 - a.계약희망률);
    const adMonthly = Object.entries(groupBy(ad, (a) => a.month)).sort().map(([m, xs]) => ({
      month: m, 광고비: xs.reduce((n, x) => n + x.spend_10k_krw, 0), 리드: xs.reduce((n, x) => n + x.leads, 0) }));

    const spend = ad.reduce((n, x) => n + x.spend_10k_krw, 0), leads = ad.reduce((n, x) => n + x.leads, 0);
    const kpi: [string, string][] = [
      ["유효 계약(해지 제외)", `${valid.length}건`],
      ["계약금액 합계", won(valid.reduce((n, c) => n + (c.price_10k_krw ?? 0), 0))],
      ["해지율", `${pct(ct.length - valid.length, ct.length)}%`],
      ["분양률(호실 기준)", `${pct(units.filter((u) => u.status === "계약완료").length, units.length)}%`],
      ["상담 건수", `${cons.length.toLocaleString()}건`],
      ["상담 후 계약희망", `${pct(cons.filter((c) => c.outcome === "계약희망").length, cons.length)}%`],
      ["광고비 / 리드", ad.length ? `${won(spend)} / ${leads.toLocaleString()}` : "광고 데이터 없음(~2025)"],
    ];
    return { monthly, chan, typ, cancel, cons2, adMonthly, kpi };
  }, [year, contracts, consultations, ads, customers, units]);

  const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink)" } };
  const ax = { stroke: "var(--mut)", fontSize: 12 };

  return (
    <>
      <h1>분양 CRM 대시보드</h1>
      <p className="sub">100% 합성 데이터 · 기준일 2026-10-23(이후 일자 제외) · 금액 단위 만원/억 · 정리 방법은 &quot;데이터 정리 로그&quot; 참고</p>
      <div className="filters" role="group" aria-label="기간">
        {["전체", "2024", "2025", "2026"].map((y) => (<button key={y} className={y === year ? "on" : ""} onClick={() => setYear(y)}>{y === "전체" ? "전체 기간" : `${y}년`}</button>))}
      </div>
      <div className="kpis">{d.kpi.map(([k, v]) => (<div className="card kpi" key={k}><b>{v}</b><span>{k}</span></div>))}</div>

      <h2>시각화</h2>
      <div className="grid">
        <div className="card"><h3>월별 계약 건수 (상태별)</h3><div className="chart"><ResponsiveContainer><BarChart data={d.monthly}><CartesianGrid stroke="var(--line)" /><XAxis dataKey="month" {...ax} /><YAxis {...ax} /><Tooltip {...tip} /><Legend /><Bar dataKey="완료" stackId="a" fill={C[0]} /><Bar dataKey="진행중" stackId="a" fill={C[2]} /><Bar dataKey="해지" stackId="a" fill={C[3]} /></BarChart></ResponsiveContainer></div></div>
        <div className="card"><h3>광고 채널별 리드당 비용 (만원, 낮을수록 효율)</h3><div className="chart">{d.chan.length ? <ResponsiveContainer><BarChart data={d.chan} layout="vertical"><CartesianGrid stroke="var(--line)" /><XAxis type="number" domain={[0, "auto"]} {...ax} /><YAxis type="category" dataKey="channel" width={90} {...ax} /><Tooltip {...tip} /><Bar dataKey="리드당비용" fill={C[1]} /></BarChart></ResponsiveContainer> : <p className="sub">선택 기간에 광고 데이터가 없습니다 (광고 데이터: 2024~2025).</p>}</div></div>
        <div className="card"><h3>타입별 분양률 (%, units 기준 · 기간 필터 미적용)</h3><div className="chart"><ResponsiveContainer><BarChart data={d.typ}><CartesianGrid stroke="var(--line)" /><XAxis dataKey="type" {...ax} /><YAxis {...ax} domain={[0, 100]} /><Tooltip {...tip} /><Bar dataKey="분양률" fill={C[0]} /></BarChart></ResponsiveContainer></div></div>
        <div className="card"><h3>고객 유입경로별 계약 해지율 (%)</h3><div className="chart"><ResponsiveContainer><BarChart data={d.cancel}><CartesianGrid stroke="var(--line)" /><XAxis dataKey="source" {...ax} /><YAxis {...ax} /><Tooltip {...tip} /><Bar dataKey="해지율" fill={C[3]} /></BarChart></ResponsiveContainer></div></div>
        <div className="card"><h3>상담사별 &quot;계약희망&quot; 비율 (%)</h3><div className="chart"><ResponsiveContainer><BarChart data={d.cons2}><CartesianGrid stroke="var(--line)" /><XAxis dataKey="consultant" {...ax} /><YAxis {...ax} domain={[0, 60]} /><Tooltip {...tip} /><Bar dataKey="계약희망률" fill={C[2]} /></BarChart></ResponsiveContainer></div></div>
        <div className="card"><h3>월별 광고비 vs 리드 (2024~2025)</h3><div className="chart">{d.adMonthly.length ? <ResponsiveContainer><LineChart data={d.adMonthly}><CartesianGrid stroke="var(--line)" /><XAxis dataKey="month" {...ax} /><YAxis yAxisId="l" {...ax} /><YAxis yAxisId="r" orientation="right" {...ax} /><Tooltip {...tip} /><Legend /><Line yAxisId="l" dataKey="광고비" stroke={C[1]} dot={false} /><Line yAxisId="r" dataKey="리드" stroke={C[0]} dot={false} /></LineChart></ResponsiveContainer> : <p className="sub">선택 기간에 광고 데이터가 없습니다.</p>}</div></div>
      </div>

      <h2>인사이트 (발견 → 근거 → 제안)</h2>
      <p className="sub">아래 수치는 &quot;전체 기간&quot; 필터 기준입니다.</p>
      <Insights />
    </>
  );
}

function Ins({ n, title, find, basis, act, caveat }: { n: number; title: string; find: string; basis: string; act: string; caveat: string }) {
  return (
    <div className="card ins">
      <h3>인사이트 {n} · {title}</h3>
      <p><span className="tag">발견</span>{find}</p>
      <p><span className="tag">근거</span>{basis}</p>
      <p><span className="tag">제안</span>{act}</p>
      <p className="sub">한계: {caveat}</p>
    </div>
  );
}

function Insights() {
  return (
    <div className="grid">
      <Ins n={1} title="포털검색광고가 가장 비싼 리드 채널"
        find="2024~2025 누적 리드당 비용이 포털검색광고 2.37만원으로 가장 높고 지인추천이벤트 1.99만원이 가장 낮다(+19%). 광고비는 비슷(5.2억 vs 5.3억)한데 리드는 지인추천이 21% 더 많다."
        basis="ad_spend 144행(24개월×6채널) · 채널별 광고비 합 ÷ 리드 합 · '광고 채널별 리드당 비용' 차트, 필터=전체 기간"
        act="포털검색 예산의 약 20%를 지인추천 이벤트로 옮겨 8주간 A/B 테스트하고, 리드당 비용과 함께 계약 전환까지 추적한다."
        caveat="광고 채널(ad_spend)과 고객 유입경로(customers)에 연결 키가 없어 리드→계약 전환 효율은 검증 불가. 리드 수 기준 효율만 해당." />
      <Ins n={2} title="59B 타입이 재고 병목"
        find="분양률이 102A 60%·74A 59%인 반면 59B는 22%(18세대 중 4세대)로 가장 낮다. 59B는 11세대가 미계약 상태다."
        basis="units 220행 · 타입별 status=계약완료 비율 · '타입별 분양률' 차트 (59B n=18, 102A n=30)"
        act="59B 대상 한정 프로모션(계약금 완화·옵션 제공)을 먼저 시도하고, 관심 고객 중 84A/84B 대기자에게 59B 대안을 안내한다."
        caveat="59B는 18세대로 표본이 작아 우연일 수 있음. units.status와 contracts가 서로 일치하지 않아(정리 로그 참고) 분양률은 units 기준 수치." />
      <Ins n={3} title="방문 유입 고객의 계약 해지율이 높음"
        find="방문 유입 고객의 해지율은 19.4%(7/36)로 나머지 합계 8.8%(26/294)의 2배 이상이다. 광고 3.8%(3/79)·지인소개 3.2%(1/31)는 가장 낮다."
        basis="contracts(기준일 이전 330건) × customers.lead_source 조인 · 해지/전체 · '유입경로별 해지율' 차트, 필터=전체 기간"
        act="방문 계약 건에 계약 후 7일 내 재상담 콜을 의무화하고, 현장 방문 시 대출·잔금 일정 안내를 체크리스트로 표준화한다."
        caveat="방문 n=36으로 작고 해지 사유가 데이터에 없어 원인은 미확인." />
      <Ins n={4} title="상담사별 계약희망 비율 격차 약 11%p"
        find="상담 결과 '계약희망' 비율이 김서준 44.8%, 임동현 42.3%인 반면 장채원 33.9%, 조도윤 34.5%로 최대 약 11%p 차이가 난다."
        basis="consultations(기준일 이전 2,339건) · 상담사별 outcome=계약희망 비율(상담사당 214~257건) · '상담사별 계약희망' 차트"
        act="상위 3인의 상담 스크립트·후속 일정 제안 방식을 하위 상담사 코칭 자료로 만들고 월 단위로 같은 지표를 재측정한다."
        caveat="고객 배정이 무작위인지 알 수 없고, 계약희망이 실제 계약으로 이어졌는지는 미검증." />
      <Ins n={5} title="신규 고객의 계약 전환이 가장 높음"
        find="신규 등급 고객의 완료 계약 보유 비율이 39.3%(33/84)로 VIP 28.6%(55/192), 일반 31.9%(81/254)보다 높다."
        basis="customers 600행(중복 정리 후) × contracts(status=완료, 기준일 이전) · 고객 중 완료 계약 보유 비율 · 등급은 표기 통일 후 기준"
        act="신규 등록 고객에게 24시간 내 상담 예약을 배정하는 SLA를 두고, VIP는 전용 혜택 제안으로 전환 격차를 줄인다."
        caveat="등급이 계약 이후 부여·변경됐을 가능성이 있어 인과 해석은 불가." />
    </div>
  );
}
