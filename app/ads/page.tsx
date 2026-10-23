import AdsChart from "@/components/AdsChart";
import { loadCore } from "@/lib/analysis";
import { groupBy, pct, sum, won } from "@/lib/util";
export const revalidate = 600;

export default async function Ads() {
  const { ads } = await loadCore();
  const rows = Object.entries(groupBy(ads, (a) => a.channel))
    .map(([channel, xs]) => {
      const spend = sum(xs, "spend_10k_krw"), leads = sum(xs, "leads"), clicks = sum(xs, "clicks"), imp = sum(xs, "impressions");
      return { channel, spend, imp, clicks, leads, cpl: spend / leads, ctr: pct(clicks, imp), lpc: pct(leads, clicks) };
    })
    .sort((a, b) => a.cpl - b.cpl);
  const channels = rows.map((r) => r.channel);
  const monthly = Object.entries(groupBy(ads, (a) => a.month)).sort()
    .map(([month, xs]) => ({ month, ...Object.fromEntries(xs.map((x) => [x.channel, x.leads])) }));
  return (
    <>
      <div className="page-h">
        <h1>광고 성과</h1>
        <p className="sub">2024-01~2025-12, 6채널. 리드당 비용 = 광고비 ÷ 리드(낮을수록 효율). 이 데이터는 고객 데이터와 연결 키가 없어 계약 전환은 알 수 없습니다.</p>
      </div>
      <div className="card pad0">
        <div className="scroll">
          <table>
            <thead>
              <tr><th>채널(효율 순)</th><th className="num">광고비</th><th className="num">노출</th><th className="num">클릭</th><th className="num">리드</th><th className="num">리드당 비용</th><th className="num">CTR</th><th className="num">클릭→리드</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.channel}>
                  <td>
                    {r.channel}
                    {i === 0 && <> <span className="badge t-good">최고 효율</span></>}
                    {i === rows.length - 1 && <> <span className="badge t-bad">최저 효율</span></>}
                  </td>
                  <td className="num">{won(r.spend)}</td><td className="num">{r.imp.toLocaleString()}</td><td className="num">{r.clicks.toLocaleString()}</td>
                  <td className="num">{r.leads.toLocaleString()}</td><td className="num">{r.cpl.toFixed(2)}만</td><td className="num">{r.ctr}%</td><td className="num">{r.lpc}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card sec">
        <div className="chart-h"><h3>월별 리드 수 (채널별 누적)</h3></div>
        <AdsChart data={monthly} channels={channels} />
      </div>
    </>
  );
}
