import DataTable from "@/components/DataTable";
import { loadCore } from "@/lib/analysis";
export const revalidate = 600;

export default async function Customers() {
  const { customers } = await loadCore();
  const rows = customers.filter((c) => !c.signup_is_future).sort((a, b) => (a.signup_date < b.signup_date ? 1 : -1));
  return (
    <>
      <div className="page-h">
        <h1>고객</h1>
        <p className="sub">중복 정리 후 {customers.length}명 중 가입일이 기준일(2026-10-23) 이전인 {rows.length}명. 연락처는 개인정보 성격이라 표시하지 않습니다.</p>
      </div>
      <DataTable
        rows={rows}
        searchKeys={["customer_id", "name", "region"]}
        filters={[{ key: "grade", label: "등급" }, { key: "status", label: "상태" }, { key: "lead_source", label: "유입경로" }, { key: "interest_type", label: "관심타입" }]}
        cols={[
          { key: "customer_id", label: "고객 ID", type: "mono" }, { key: "name", label: "이름" }, { key: "grade", label: "등급", type: "badge" },
          { key: "status", label: "상태", type: "badge" }, { key: "lead_source", label: "유입경로" }, { key: "interest_type", label: "관심타입" },
          { key: "region", label: "지역" }, { key: "budget_10k_krw", label: "예산", type: "won" }, { key: "signup_date", label: "가입일", type: "mono" },
        ]}
      />
    </>
  );
}
