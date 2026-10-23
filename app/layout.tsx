import "./globals.css";
import Shell from "@/components/Shell";
export const metadata = { title: "분양 CRM", description: "합성 데이터 기반 분양 CRM 업무 대시보드" };
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
