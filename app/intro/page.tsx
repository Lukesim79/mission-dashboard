import Link from "next/link";
import { AlertTriangle, Building2, ClipboardList, FileText, LayoutDashboard, Megaphone, MessageSquare, Users } from "lucide-react";
import { analyze, loadCore } from "@/lib/analysis";
export const revalidate = 600;

const FEATS = [
  { href: "/", label: "대시보드", desc: "KPI·알림·파이프라인·차트·인사이트", Icon: LayoutDashboard },
  { href: "/customers", label: "고객", desc: "등급·유입경로·상태 필터", Icon: Users },
  { href: "/consultations", label: "상담 이력", desc: "채널·결과별 검색", Icon: MessageSquare },
  { href: "/contracts", label: "계약 현황", desc: "상태·담당자별 계약 목록", Icon: FileText },
  { href: "/units", label: "호실 재고", desc: "타입·상태별 재고 현황", Icon: Building2 },
  { href: "/ads", label: "광고 성과", desc: "채널별 효율과 월별 리드", Icon: Megaphone },
  { href: "/log", label: "데이터 정리 로그", desc: "무엇을 왜 고쳤는지 기록", Icon: ClipboardList },
];

export default async function Intro() {
  const a = analyze(await loadCore());
  return (
    <>
      <div className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span className="logo" style={{ width: 40, height: 40, fontSize: 18 }}>B</span>
        <div>
          <h1 style={{ margin: 0 }}>분양 CRM</h1>
          <p className="sub">상담·계약·광고 데이터로 오늘 손볼 곳을 알려주는 영업팀장용 의사결정 대시보드</p>
        </div>
      </div>
      <div className="card sec">
        <h2>배경</h2>
        <p style={{ margin: 0 }}>분양 영업은 광고 채널, 상담사, 호실 재고, 계약 해지가 따로 관리돼 &quot;지금 어디가 문제인지&quot;를 한눈에 보기 어렵습니다. 표기가 제각각인 원본 데이터를 정리해 한 곳에 모으고, 숫자에서 바로 실행 가능한 제안까지 이어지도록 만들었습니다.</p>
      </div>
      <div className="card sec">
        <h2 style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--bad)" }}><AlertTriangle size={16} aria-hidden /> Pain Points <span className="sub">(데이터에서 계산)</span></h2>
        <div className="grid4">
          {a.pains.map((p) => (<div key={p.title} className="card pain"><h3>{p.title}</h3><p>{p.desc}</p></div>))}
        </div>
      </div>
      <div className="card sec">
        <h2>목적</h2>
        <p style={{ margin: 0 }}>정리된 고객·상담·계약·광고 데이터를 기준으로 영업 현황을 요약하고, 알림과 인사이트(발견 → 근거 → 제안)를 통해 우선순위를 정하도록 돕습니다.</p>
      </div>
      <div className="card sec">
        <h2>분양 영업 프로세스</h2>
        <p className="sub" style={{ marginBottom: 10 }}>이 대시보드는 <b>상담 → 계약 → 해지 관리</b> 구간의 의사결정을 지원합니다.</p>
        <div className="flow">
          <div>광고 집행</div><i>›</i><div>고객 유입</div><i>›</i>
          <div className="focus">상담</div><i>›</i><div className="focus">계약 체결</div><i>›</i><div className="focus">해지 관리</div><i>›</i><div>입주·완료</div>
        </div>
      </div>
      <h2 style={{ marginTop: 16 }}>주요 기능</h2>
      <div className="grid4">
        {FEATS.map(({ href, label, desc, Icon }) => (
          <Link key={href} href={href} className="card feat"><h3><Icon size={16} aria-hidden />{label}</h3><p>{desc}</p></Link>
        ))}
      </div>
    </>
  );
}
