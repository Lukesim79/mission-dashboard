import DataTable from "@/components/DataTable";
import { loadCore } from "@/lib/analysis";
export const revalidate = 600;

export default async function Consultations() {
  const { consultations } = await loadCore();
  const rows = consultations
    .filter((c) => !c.is_future)
    .sort((a, b) => (a.consult_date < b.consult_date ? 1 : -1))
    .map((r) => ({ ...r, ref: r.orphan_customer || r.orphan_unit ? "⚠ 참조 없음" : "" }));
  return (
    <>
      <div className="page-h">
        <h1>상담 이력</h1>
        <p className="sub">기준일 이전 {rows.length.toLocaleString()}건. 상담시간이 비정상(0 이하·240분)인 건은 &quot;–&quot;, 마스터에 없는 고객/호실은 ⚠ 표시.</p>
      </div>
      <DataTable
        rows={rows}
        searchKeys={["consult_id", "customer_id", "unit_id", "consultant"]}
        filters={[{ key: "channel", label: "채널" }, { key: "outcome", label: "결과" }, { key: "consultant", label: "상담사" }]}
        cols={[
          { key: "consult_date", label: "상담일", type: "mono" }, { key: "consult_id", label: "상담 ID", type: "mono" },
          { key: "customer_id", label: "고객 ID", type: "mono" }, { key: "unit_id", label: "호실 ID", type: "mono" },
          { key: "consultant", label: "상담사" }, { key: "channel", label: "채널" }, { key: "duration_min", label: "시간(분)", type: "num" },
          { key: "outcome", label: "결과", type: "badge" }, { key: "ref", label: "참조" },
        ]}
      />
    </>
  );
}
