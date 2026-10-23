import { fetchAll } from "@/lib/data";
export const revalidate = 600;
export default async function Log() {
  const rows = await fetchAll<any>("cleaning_log");
  rows.sort((a, b) => a.id - b.id);
  return (
    <>
      <div className="page-h"><h1>데이터 정리 로그</h1></div>
      <p className="sub" style={{ marginBottom: 12 }}>원본 CSV → 정리 CSV 처리 내역. 행 삭제는 중복 고객 48행뿐이며 나머지는 NULL+플래그로 보존했습니다. 스크립트: scripts/clean.py · customers 건수는 중복 제거 전 648행 기준(제거 후 600행, 예: 예산 이상치 129→118).</p>
      <div className="card pad0 scroll">
        <table>
          <thead><tr><th>테이블</th><th>문제</th><th>처리</th><th>건수</th><th>이유</th></tr></thead>
          <tbody>{rows.map((r) => (<tr key={r.id}><td>{r.table}</td><td className="wrap">{r.issue}</td><td className="wrap">{r.action}</td><td className="num">{r.rows}</td><td className="wrap">{r.reason}</td></tr>))}</tbody>
        </table>
      </div>
    </>
  );
}
