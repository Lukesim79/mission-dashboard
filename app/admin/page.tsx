import { fetchAll } from "@/lib/data";
import LoginForm from "@/components/LoginForm";
import { isAdmin, logout } from "./actions";
export const dynamic = "force-dynamic";

export default async function Admin() {
  if (!(await isAdmin())) return (<><div className="page-h"><h1>관리자</h1></div><LoginForm /></>);
  const [k, t, c] = await Promise.all([
    fetchAll<any>("consultations", "consult_id,customer_id,unit_id,duration_raw,duration_flag,orphan_customer,orphan_unit,is_future"),
    fetchAll<any>("contracts", "contract_id,price_zero_flag,loan_missing,unit_multi_contract,is_future"),
    fetchAll<any>("customers", "customer_id,budget_outlier,phone_alt,signup_is_future"),
  ]);
  const rows: [string, string, number][] = [
    ["consultations", "고아 customer_id", k.filter((x) => x.orphan_customer).length],
    ["consultations", "고아 unit_id", k.filter((x) => x.orphan_unit).length],
    ["consultations", "상담시간 invalid(≤0)", k.filter((x) => x.duration_flag === "invalid").length],
    ["consultations", "상담시간 cap240", k.filter((x) => x.duration_flag === "cap240").length],
    ["consultations", "미래 일자", k.filter((x) => x.is_future).length],
    ["contracts", "분양가 0원", t.filter((x) => x.price_zero_flag).length],
    ["contracts", "대출 결측", t.filter((x) => x.loan_missing).length],
    ["contracts", "동일 호실 복수 계약", t.filter((x) => x.unit_multi_contract).length],
    ["contracts", "미래 일자", t.filter((x) => x.is_future).length],
    ["customers", "예산 이상치", c.filter((x) => x.budget_outlier).length],
    ["customers", "중복 병합 시 전화 상이(phone_alt)", c.filter((x) => x.phone_alt).length],
    ["customers", "가입일 미래", c.filter((x) => x.signup_is_future).length],
  ];
  const orphans = k.filter((x) => x.orphan_customer || x.orphan_unit).slice(0, 30);
  return (
    <>
      <div className="page-h"><h1>관리자 · 데이터 품질 현황</h1></div>
      <form action={logout}><button className="pri">로그아웃</button></form>
      <h2 style={{ marginTop: 16 }}>플래그된 이상치 건수</h2>
      <div className="card pad0 scroll"><table><thead><tr><th>테이블</th><th>항목</th><th>건수</th></tr></thead><tbody>{rows.map((r) => (<tr key={r[0] + r[1]}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>))}</tbody></table></div>
      <h2 style={{ marginTop: 16 }}>고아 참조 상담 (상위 30건)</h2>
      <div className="card pad0 scroll"><table><thead><tr><th>consult_id</th><th>customer_id</th><th>unit_id</th></tr></thead><tbody>{orphans.map((o) => (<tr key={o.consult_id}><td>{o.consult_id}</td><td className={o.orphan_customer ? "warn" : ""}>{o.customer_id}</td><td className={o.orphan_unit ? "warn" : ""}>{o.unit_id}</td></tr>))}</tbody></table></div>
    </>
  );
}
