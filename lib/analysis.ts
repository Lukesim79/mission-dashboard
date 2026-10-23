import { fetchAll } from "./data";
import { groupBy, pct, R, sum, won } from "./util";

export type Core = { customers: R[]; units: R[]; consultations: R[]; contracts: R[]; ads: R[] };
export type Insight = { title: string; find: string; basis: string; act: string; caveat: string };
export type Alert = { tone: "bad" | "warn" | "info"; text: string };

export async function loadCore(): Promise<Core> {
  const [customers, units, consultations, contracts, ads] = await Promise.all([
    fetchAll("customers", "customer_id,name,grade,lead_source,interest_type,region,status,signup_date,budget_10k_krw,signup_is_future"),
    fetchAll("units"),
    fetchAll("consultations", "consult_id,customer_id,unit_id,consultant,channel,consult_date,duration_min,outcome,is_future,orphan_customer,orphan_unit"),
    fetchAll("contracts", "contract_id,customer_id,unit_id,contract_date,price_10k_krw,down_payment_10k_krw,loan_amount_10k_krw,status,sales_rep,is_future,loan_missing,price_zero_flag"),
    fetchAll("ad_spend"),
  ]);
  return { customers, units, consultations, contracts, ads };
}

/** 모든 인사이트·알림 수치는 DB 집계에서 계산한다(하드코딩 없음). */
export function analyze({ customers, units, consultations, contracts, ads }: Core) {
  const lead = Object.fromEntries(customers.map((c) => [c.customer_id, c.lead_source]));
  const ct = contracts.filter((c) => !c.is_future);
  const cons = consultations.filter((c) => !c.is_future);

  const ch = Object.entries(groupBy(ads, (a) => a.channel))
    .map(([channel, xs]) => {
      const spend = sum(xs, "spend_10k_krw"), leads = sum(xs, "leads");
      return { channel, spend, leads, cpl: spend / leads };
    })
    .sort((a, b) => a.cpl - b.cpl);
  const best = ch[0], worst = ch[ch.length - 1];
  const months = ads.map((a) => a.month).sort();

  const typ = Object.entries(groupBy(units, (u) => u.type))
    .map(([type, xs]) => {
      const sold = xs.filter((x) => x.status === "계약완료").length;
      return { type, n: xs.length, sold, unsold: xs.filter((x) => x.status === "미계약").length, rate: pct(sold, xs.length) };
    })
    .sort((a, b) => a.rate - b.rate);
  const lowT = typ[0], hiT = typ[typ.length - 1], hiT2 = typ[typ.length - 2];

  const leadCt = ct.filter((c) => lead[c.customer_id]);
  const src = Object.entries(groupBy(leadCt, (c) => lead[c.customer_id]))
    .map(([source, xs]) => {
      const cancel = xs.filter((x) => x.status === "해지").length;
      return { source, n: xs.length, cancel, rate: pct(cancel, xs.length) };
    })
    .sort((a, b) => b.rate - a.rate);
  const topS = src[0];
  const rest = src.slice(1);
  const restN = rest.reduce((n, s) => n + s.n, 0), restC = rest.reduce((n, s) => n + s.cancel, 0);
  const lows = src.slice(-2).reverse();
  const cancelAll = pct(ct.filter((c) => c.status === "해지").length, ct.length);

  const cs = Object.entries(groupBy(cons, (c) => c.consultant))
    .map(([name, xs]) => ({ name, n: xs.length, rate: pct(xs.filter((x) => x.outcome === "계약희망").length, xs.length) }))
    .sort((a, b) => b.rate - a.rate);
  const csTop = cs[0], csBot = cs[cs.length - 1];

  const done = new Set(ct.filter((c) => c.status === "완료").map((c) => c.customer_id));
  const gr = Object.entries(groupBy(customers, (c) => c.grade))
    .map(([grade, xs]) => {
      const conv = xs.filter((x) => done.has(x.customer_id)).length;
      return { grade, n: xs.length, conv, rate: pct(conv, xs.length) };
    })
    .filter((g) => g.n >= 30)
    .sort((a, b) => b.rate - a.rate);
  const gTop = gr[0];
  const gOthers = gr.slice(1).sort((a, b) => b.n - a.n).slice(0, 2);

  const orphans = consultations.filter((c) => c.orphan_customer || c.orphan_unit).length;

  const insights: Insight[] = [
    {
      title: `리드당 비용 최고 채널: ${worst.channel}`,
      find: `${months[0]}~${months[months.length - 1]} 누적 리드당 비용이 ${worst.channel} ${worst.cpl.toFixed(2)}만원으로 가장 높고 ${best.channel} ${best.cpl.toFixed(2)}만원이 가장 낮다(+${pct(worst.cpl - best.cpl, best.cpl)}%). 광고비 ${best.channel} ${won(best.spend)} vs ${worst.channel} ${won(worst.spend)}, 리드는 ${best.channel}이 ${pct(best.leads - worst.leads, worst.leads)}% 더 많다.`,
      basis: `ad_spend ${ads.length}행(${months.length / ch.length}개월×${ch.length}채널) · 채널별 광고비 합 ÷ 리드 합 · 대시보드 '광고 채널별 리드당 비용' 차트(전체 기간)`,
      act: `${worst.channel} 예산의 약 20%를 ${best.channel}로 옮겨 8주간 A/B 테스트하고, 리드당 비용과 함께 계약 전환까지 추적한다.`,
      caveat: "광고 채널(ad_spend)과 고객 유입경로(customers)에 연결 키가 없어 리드→계약 전환 효율은 검증할 수 없음. 리드 수 기준 효율만 해당.",
    },
    {
      title: `${lowT.type} 타입이 재고 병목`,
      find: `분양률이 ${hiT.type} ${hiT.rate}%·${hiT2.type} ${hiT2.rate}%인 반면 ${lowT.type}은 ${lowT.rate}%(${lowT.n}세대 중 ${lowT.sold}세대)로 가장 낮다. ${lowT.type}은 ${lowT.unsold}세대가 미계약 상태다.`,
      basis: `units ${units.length}행 · 타입별 status=계약완료 비율 · '타입별 분양률' 차트 (${lowT.type} n=${lowT.n}, ${hiT.type} n=${hiT.n})`,
      act: `${lowT.type} 대상 한정 프로모션(계약금 완화·옵션 제공)을 먼저 시도하고, 같은 면적대 관심 고객에게 ${lowT.type} 대안을 안내한다.`,
      caveat: `${lowT.type}은 ${lowT.n}세대로 표본이 작아 우연일 수 있음. units.status와 contracts가 서로 일치하지 않아(정리 로그 참고) 분양률은 units 기준 수치.`,
    },
    {
      title: `${topS.source} 유입 고객의 계약 해지율이 높음`,
      find: `${topS.source} 유입 고객의 해지율은 ${topS.rate}%(${topS.cancel}/${topS.n})로 나머지 합계 ${pct(restC, restN)}%(${restC}/${restN})의 ${(topS.rate / pct(restC, restN)).toFixed(1)}배다. ${lows[0].source} ${lows[0].rate}%(${lows[0].cancel}/${lows[0].n})·${lows[1].source} ${lows[1].rate}%(${lows[1].cancel}/${lows[1].n})는 가장 낮다.`,
      basis: `contracts(기준일 이전 ${ct.length}건) × customers.lead_source 조인 · 해지/전체 · '유입경로별 해지율' 차트, 필터=전체 기간`,
      act: `${topS.source} 계약 건에 계약 후 7일 내 재상담 콜을 의무화하고, 대출·잔금 일정 안내를 체크리스트로 표준화한다.`,
      caveat: `${topS.source} n=${topS.n}으로 작고 해지 사유가 데이터에 없어 원인은 미확인.`,
    },
    {
      title: `상담사별 계약희망 비율 격차 약 ${Math.round(csTop.rate - csBot.rate)}%p`,
      find: `상담 결과 '계약희망' 비율이 ${csTop.name} ${csTop.rate}%, ${cs[1].name} ${cs[1].rate}%인 반면 ${csBot.name} ${csBot.rate}%, ${cs[cs.length - 2].name} ${cs[cs.length - 2].rate}%로 최대 ${(csTop.rate - csBot.rate).toFixed(1)}%p 차이가 난다.`,
      basis: `consultations(기준일 이전 ${cons.length.toLocaleString()}건) · 상담사별 outcome=계약희망 비율(상담사당 ${Math.min(...cs.map((c) => c.n))}~${Math.max(...cs.map((c) => c.n))}건) · '상담사별 계약희망' 차트`,
      act: "상위 3인의 상담 스크립트·후속 일정 제안 방식을 하위 상담사 코칭 자료로 만들고 월 단위로 같은 지표를 재측정한다.",
      caveat: "고객 배정이 무작위인지 알 수 없고, 계약희망이 실제 계약으로 이어졌는지는 미검증.",
    },
    {
      title: `${gTop.grade} 고객의 계약 전환이 가장 높음`,
      find: `${gTop.grade} 등급 고객의 완료 계약 보유 비율이 ${gTop.rate}%(${gTop.conv}/${gTop.n})로 ${gOthers.map((g) => `${g.grade} ${g.rate}%(${g.conv}/${g.n})`).join(", ")}보다 높다.`,
      basis: `customers ${customers.length}행(중복 정리 후) × contracts(status=완료, 기준일 이전) · 고객 중 완료 계약 보유 비율 · 등급은 표기 통일 후 기준`,
      act: `${gTop.grade} 등록 고객에게 24시간 내 상담 예약을 배정하는 SLA를 두고, 전환이 낮은 등급은 전용 혜택 제안으로 격차를 줄인다.`,
      caveat: "등급이 계약 이후 부여·변경됐을 가능성이 있어 인과 해석은 불가.",
    },
  ];

  const alerts: Alert[] = [
    { tone: "bad", text: `${topS.source} 유입 계약 해지율 ${topS.rate}% — 나머지 평균 ${pct(restC, restN)}%의 ${(topS.rate / pct(restC, restN)).toFixed(1)}배` },
    { tone: "bad", text: `${lowT.type} 분양률 ${lowT.rate}% — ${lowT.n}세대 중 미계약 ${lowT.unsold}세대` },
    { tone: "warn", text: `${worst.channel} 리드당 비용 ${worst.cpl.toFixed(2)}만원 — 최저 채널(${best.channel}) 대비 +${pct(worst.cpl - best.cpl, best.cpl)}%` },
    { tone: "info", text: `상담 ${orphans}건이 마스터에 없는 고객/호실을 참조 — 플래그 처리(분석에서 부분 제외)` },
  ];

  const funnel = [
    { label: "상담", value: cons.length, sub: "건" },
    { label: "계약희망", value: cons.filter((c) => c.outcome === "계약희망").length, sub: "건" },
    { label: "계약 체결", value: ct.filter((c) => c.status !== "해지").length, sub: "건(해지 제외)" },
    { label: "계약 완료", value: ct.filter((c) => c.status === "완료").length, sub: "건" },
  ];

  const pains = [
    { title: "해지 증가", desc: `전체 계약 해지율 ${cancelAll}%, ${topS.source} 유입은 ${topS.rate}%` },
    { title: "광고비 비효율", desc: `채널 간 리드당 비용 격차 +${pct(worst.cpl - best.cpl, best.cpl)}%` },
    { title: "재고 편중", desc: `${lowT.type} 분양률 ${lowT.rate}% vs ${hiT.type} ${hiT.rate}%` },
    { title: "상담 품질 편차", desc: `계약희망 비율 상담사 간 ${(csTop.rate - csBot.rate).toFixed(1)}%p 차이` },
  ];

  return { insights, alerts, funnel, pains, highlight: insights[2], cancelAll };
}
