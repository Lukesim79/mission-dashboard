import { fetchAll } from "@/lib/data";
import Dashboard from "@/components/Dashboard";
export const revalidate = 600;
export default async function Home() {
  const [customers, units, consultations, contracts, ads] = await Promise.all([
    fetchAll("customers", "customer_id,grade,lead_source"),
    fetchAll("units", "unit_id,type,status,price_10k_krw"),
    fetchAll("consultations", "consult_id,consultant,channel,consult_date,outcome,is_future,duration_min"),
    fetchAll("contracts", "contract_id,customer_id,contract_date,price_10k_krw,status,sales_rep,is_future"),
    fetchAll("ad_spend"),
  ]);
  return <Dashboard {...{ customers, units, consultations, contracts, ads }} />;
}
