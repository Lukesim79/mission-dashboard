import Dashboard from "@/components/Dashboard";
import { analyze, loadCore } from "@/lib/analysis";
export const revalidate = 600;

export default async function Home() {
  const core = await loadCore();
  const a = analyze(core);
  const lead = Object.fromEntries(core.customers.map((c) => [c.customer_id, c]));
  const recent = core.contracts
    .filter((c) => !c.is_future)
    .sort((x, y) => (x.contract_date < y.contract_date ? 1 : -1))
    .slice(0, 10)
    .map((c) => ({ ...c, customer: lead[c.customer_id]?.name ?? "–", lead_source: lead[c.customer_id]?.lead_source ?? "–" }));
  return (
    <Dashboard
      customers={core.customers.map((c) => ({ customer_id: c.customer_id, lead_source: c.lead_source }))}
      units={core.units.map((u) => ({ unit_id: u.unit_id, type: u.type, status: u.status }))}
      consultations={core.consultations.map((c) => ({ consultant: c.consultant, consult_date: c.consult_date, outcome: c.outcome, is_future: c.is_future }))}
      contracts={core.contracts.map((c) => ({ customer_id: c.customer_id, contract_date: c.contract_date, price_10k_krw: c.price_10k_krw, status: c.status, is_future: c.is_future }))}
      ads={core.ads}
      recent={recent}
      alerts={a.alerts}
      funnel={a.funnel}
      insights={a.insights}
      highlight={a.highlight}
    />
  );
}
