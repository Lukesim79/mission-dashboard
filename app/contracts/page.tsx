import DataTable from "@/components/DataTable";
import { loadCore } from "@/lib/analysis";
export const revalidate = 600;

export default async function Contracts() {
  const { contracts } = await loadCore();
  const rows = contracts
    .filter((c) => !c.is_future)
    .sort((a, b) => (a.contract_date < b.contract_date ? 1 : -1))
    .map((r) => ({ ...r, flag: [r.price_zero_flag && "분양가 0원", r.loan_missing && "대출 결측"].filter(Boolean).join(" · ") }));
  return (
    <>
      <div className="page-h">
        <h1>계약 현황</h1>
        <p className="sub">기준일 이전 {rows.length}건. 분양가 0원 계약은 금액을 비우고 플래그, 대출 결측은 0원으로 간주하지 않고 플래그로 남겼습니다.</p>
      </div>
      <DataTable
        rows={rows}
        searchKeys={["contract_id", "customer_id", "unit_id", "sales_rep"]}
        filters={[{ key: "status", label: "상태" }, { key: "sales_rep", label: "담당" }]}
        cols={[
          { key: "contract_date", label: "계약일", type: "mono" }, { key: "contract_id", label: "계약 ID", type: "mono" },
          { key: "customer_id", label: "고객 ID", type: "mono" }, { key: "unit_id", label: "호실 ID", type: "mono" },
          { key: "status", label: "상태", type: "badge" }, { key: "price_10k_krw", label: "계약금액", type: "won" },
          { key: "down_payment_10k_krw", label: "계약금", type: "won" }, { key: "loan_amount_10k_krw", label: "대출", type: "won" },
          { key: "sales_rep", label: "담당" }, { key: "flag", label: "데이터 플래그" },
        ]}
      />
    </>
  );
}
