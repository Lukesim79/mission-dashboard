"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ClipboardList, FileText, Info, LayoutDashboard, Lightbulb, Lock, Megaphone, MessageSquare, Users } from "lucide-react";

const GROUPS = [
  [
    { href: "/intro", label: "Introduction", Icon: Info },
    { href: "/", label: "대시보드", Icon: LayoutDashboard },
    { href: "/#insights", label: "인사이트", Icon: Lightbulb },
  ],
  [
    { href: "/customers", label: "고객", Icon: Users },
    { href: "/consultations", label: "상담 이력", Icon: MessageSquare },
    { href: "/contracts", label: "계약 현황", Icon: FileText },
    { href: "/units", label: "호실 재고", Icon: Building2 },
    { href: "/ads", label: "광고 성과", Icon: Megaphone },
  ],
  [
    { href: "/log", label: "데이터 정리 로그", Icon: ClipboardList },
    { href: "/admin", label: "관리자", Icon: Lock },
  ],
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      <header className="top">
        <Link href="/" className="brand"><span className="logo">B</span>분양 CRM</Link>
        <div className="user"><i>5</i><span>5조 전팀장과 심팀장들, 마케팅팀</span></div>
      </header>
      <div className="shell">
        <nav className="side" aria-label="메뉴">
          {GROUPS.map((g, i) => (
            <div key={i}>
              {i > 0 && <hr />}
              {g.map(({ href, label, Icon }) => (
                <Link key={href} href={href} className={href === path ? "on" : ""} aria-current={href === path ? "page" : undefined}>
                  <Icon size={16} aria-hidden />{label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <main>{children}</main>
      </div>
    </>
  );
}
