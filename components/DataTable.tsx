"use client";
import { useMemo, useState } from "react";
import Badge from "./Badge";

type R = Record<string, any>;
export type Col = { key: string; label: string; type?: "badge" | "num" | "mono" | "won" };

const fmt = (v: any, t?: Col["type"]) => {
  if (v === null || v === undefined || v === "") return "–";
  if (t === "num") return Number(v).toLocaleString();
  if (t === "won") return `${Number(v).toLocaleString()}만`;
  return String(v);
};

export default function DataTable({ cols, rows, searchKeys, filters = [], pageSize = 15 }: {
  cols: Col[]; rows: R[]; searchKeys: string[]; filters?: { key: string; label: string }[]; pageSize?: number;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const options = useMemo(
    () => Object.fromEntries(filters.map((f) => [f.key, [...new Set(rows.map((r) => r[f.key]).filter(Boolean))].sort() as string[]])),
    [rows, filters],
  );
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter(
      (r) => filters.every((f) => !sel[f.key] || r[f.key] === sel[f.key]) &&
        (!needle || searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(needle))),
    );
    if (sort) {
      const { key, dir } = sort;
      out = [...out].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * dir);
    }
    return out;
  }, [rows, q, sel, sort, filters, searchKeys]);

  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const cur = Math.min(page, pages - 1);
  const view = shown.slice(cur * pageSize, (cur + 1) * pageSize);
  const reset = () => setPage(0);

  return (
    <div className="card pad0">
      <div className="tools">
        <input type="search" placeholder="검색" aria-label="검색" value={q} onChange={(e) => { setQ(e.target.value); reset(); }} />
        {filters.map((f) => (
          <select key={f.key} aria-label={f.label} value={sel[f.key] ?? ""} onChange={(e) => { setSel({ ...sel, [f.key]: e.target.value }); reset(); }}>
            <option value="">{f.label} 전체</option>
            {options[f.key].map((o) => (<option key={o} value={o}>{o}</option>))}
          </select>
        ))}
        <span className="sub">{shown.length.toLocaleString()} / {rows.length.toLocaleString()}건</span>
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key} className={`sortable ${c.type === "num" || c.type === "won" ? "num" : ""}`} onClick={() => setSort(sort?.key === c.key ? { key: c.key, dir: (-sort.dir) as 1 | -1 } : { key: c.key, dir: 1 })}
                  aria-sort={sort?.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                  {c.label}{sort?.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c.key} className={c.type === "num" || c.type === "won" ? "num" : c.type === "mono" ? "mono" : ""}>
                    {c.type === "badge" && r[c.key] ? <Badge v={r[c.key]} /> : fmt(r[c.key], c.type)}
                  </td>
                ))}
              </tr>
            ))}
            {!view.length && (<tr><td colSpan={cols.length} className="wrap sub">조건에 맞는 데이터가 없습니다.</td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <button disabled={cur === 0} onClick={() => setPage(cur - 1)}>← 이전</button>
        <span>{cur + 1} / {pages}</span>
        <button disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>다음 →</button>
      </div>
    </div>
  );
}
