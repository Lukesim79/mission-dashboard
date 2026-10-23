import "./globals.css";
export const metadata = { title: "분양 CRM 대시보드", description: "합성 데이터 기반 분양 CRM 미션 대시보드" };
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <nav className="nav">
          <a href="/">대시보드</a>
          <a href="/log">데이터 정리 로그</a>
          <a href="/admin">관리자</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
