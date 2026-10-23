export type R = Record<string, any>;
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
export const sum = (xs: R[], k: string) => xs.reduce((n, x) => n + (x[k] ?? 0), 0);
export const won = (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${Math.round(v).toLocaleString()}만`);
export const groupBy = <T,>(xs: T[], f: (x: T) => string) =>
  xs.reduce<Record<string, T[]>>((m, x) => ((m[f(x)] ||= []).push(x), m), {});

export type Tone = "good" | "info" | "warn" | "bad" | "gold" | "mute";
const TONES: Record<string, Tone> = {
  완료: "good", 계약완료: "good", 활성: "good", 계약희망: "good", 관심고객: "good",
  진행중: "info", 예약: "info", 재상담예정: "info", 신규: "info",
  보류: "warn", 휴면: "warn",
  해지: "bad", 이탈: "bad", 거절: "bad",
  VIP: "gold", VVIP: "gold",
};
export const toneOf = (v: string): Tone => TONES[v] ?? "mute";
