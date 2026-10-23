import { toneOf } from "@/lib/util";
export default function Badge({ v }: { v: string }) {
  return <span className={`badge t-${toneOf(v)}`}>{v}</span>;
}
