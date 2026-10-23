import Badge from "@/components/Badge";
import DataTable from "@/components/DataTable";
import { loadCore } from "@/lib/analysis";
import { groupBy, pct } from "@/lib/util";
export const revalidate = 600;

export default async function Units() {
  const { units } = await loadCore();
  const by = groupBy(units, (u) => u.status);
  const types = Object.entries(groupBy(units, (u) => u.type))
    .map(([t, xs]) => ({ t, n: xs.length, r: pct(xs.filter((x) => x.status === "계약완료").length, xs.length) }))
    .sort((a, b) => a.r - b.r);
  return (
    <>
      <div className="page-h"><h1>호실 재고</h1><p className="sub">units 마스터 {units.length}세대 기준(계약 이력과 별도 집계).</p></div>
      <div className="kpis">
        {["계약완료", "예약", "보류", "미계약"].map((s) => (
          <div key={s} className="card kpi"><span><Badge v={s} /></span><b>{(by[s] ?? []).length}<small>세대</small></b><p>{pct((by[s] ?? []).length, units.length)}%</p></div>
        ))}
      </div>
      <div className="card sec">
        <h2>타입별 분양률 (낮은 순)</h2>
        <div className="flow">
          {types.map((x, i) => (<div key={x.t} className={i === 0 ? "focus" : ""}><b>{x.t}</b><br /><span className="sub">{x.r}% · {x.n}세대</span></div>))}
        </div>
      </div>
      <div className="sec">
        <DataTable
          rows={units}
          searchKeys={["unit_id", "building", "type"]}
          filters={[{ key: "type", label: "타입" }, { key: "status", label: "상태" }, { key: "direction", label: "향" }, { key: "view", label: "조망" }]}
          cols={[
            { key: "unit_id", label: "호실 ID", type: "mono" }, { key: "building", label: "동" }, { key: "floor", label: "층", type: "num" },
            { key: "type", label: "타입" }, { key: "area_m2", label: "면적(㎡)", type: "num" }, { key: "price_10k_krw", label: "분양가", type: "won" },
            { key: "status", label: "상태", type: "badge" }, { key: "direction", label: "향" }, { key: "view", label: "조망" },
          ]}
        />
      </div>
    </>
  );
}
