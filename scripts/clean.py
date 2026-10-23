"""Raw CSV -> cleaned CSV + cleaning log.

Usage: py -I scripts/clean.py [raw_dir]
Outputs: data/clean/*.csv, data/cleaning_log.json, cleaning_log.md
Nothing is silently dropped: bad values are NULLed and flagged, orphans are flagged.
"""
import json
import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "mission-data"
OUT = ROOT / "data" / "clean"
OUT.mkdir(parents=True, exist_ok=True)
TODAY = pd.Timestamp("2026-10-23")

LOG = []  # {table, step, issue, action, rows, reason}


def log(table, issue, action, rows, reason=""):
    LOG.append(dict(table=table, issue=issue, action=action, rows=int(rows), reason=reason))


def read(name):
    return pd.read_csv(RAW / name, encoding="utf-8-sig", dtype=str, keep_default_na=False)


def parse_date(s):
    s = s.strip()
    for f in ("%Y-%m-%d", "%Y/%m/%d", "%Y%m%d", "%m-%d-%Y"):  # NN-NN-YYYY is MM-DD-YYYY (2nd part reaches >12, 1st never)
        try:
            return pd.to_datetime(s, format=f)
        except ValueError:
            pass
    return pd.NaT


def norm_dates(df, col, table):
    fmts = df[col].map(lambda s: re.sub(r"\d", "9", s.strip())).value_counts()
    non_iso = int((df[col].map(lambda s: re.sub(r"\d", "9", s.strip())) != "9999-99-99").sum())
    d = df[col].map(parse_date)
    bad = int(d.isna().sum())
    log(table, f"{col} 날짜 포맷 {len(fmts)}종 혼재 ({', '.join(f'{k}:{v}' for k, v in fmts.items())})",
        "ISO(YYYY-MM-DD)로 통일", non_iso,
        "NN-NN-YYYY는 두 번째 값이 12 초과인 경우가 있고 첫 값은 없어 MM-DD-YYYY로 해석")
    if bad:
        log(table, f"{col} 파싱 불가", "NULL", bad)
    fut = int((d > TODAY).sum())
    log(table, f"{col}가 기준일({TODAY.date()}) 이후 미래 날짜", "삭제하지 않고 is_future 플래그만 부여", fut,
        "합성 데이터가 2026-12까지 생성됨. 시계열 추이 차트는 기준일까지만 사용")
    return d


# ---------------- customers ----------------
c = read("customers_raw.csv")
n0 = len(c)
grade_dirty = int((c.grade != c.grade.str.strip()).sum() + c.grade.str.strip().isin(["vip", "Vip"]).sum())
for col in c.columns:
    c[col] = c[col].str.strip()
c["_order"] = range(len(c))

# 전화번호 숫자만
c["phone"] = c["phone"].str.replace(r"\D", "", regex=True)
log("customers", "전화번호 포맷 3종(010-0000-0000 / 01000000000 / 010.0000.0000)", "숫자 11자리로 통일", (c.phone != "").sum())

# 등급
grade_map = {"vip": "VIP"}
c["grade"] = c["grade"].map(lambda g: "VIP" if g.lower() == "vip" else g)
log("customers", "등급 표기 불일치(VIP/vip/Vip, '일반 ', ' 일반')", "공백 제거 + VIP 대소문자 통일 (VVIP·관심고객·신규는 별개 등급으로 유지)", grade_dirty,
    "VVIP는 VIP와 다른 등급일 수 있어 병합하지 않음")

# 유입경로
src_map = {"Blog": "블로그", "광고(네이버)": "광고"}
b = c.lead_source.isin(src_map)
c["lead_source"] = c.lead_source.replace(src_map)
log("customers", "유입경로 표기(블로그/Blog, 광고/광고(네이버))", "블로그로 통일, 광고(네이버)→광고", b.sum(),
    "네이버 구분은 하위분류라 광고로 합침(세부 구분이 필요하면 raw 참조)")

# 지역
reg_map = {"부산시": "부산", "Busan": "부산", "경기도": "경기", "Gyeonggi": "경기", "seoul": "서울", "Seoul": "서울", "서울시": "서울"}
r = c.region.isin(reg_map)
c["region"] = c.region.replace(reg_map)
log("customers", "지역 표기 불일치(서울/Seoul/seoul/서울시 등)", "17개 시도 약칭으로 통일", r.sum())

# 예산 이상치
bud = pd.to_numeric(c.budget_10k_krw, errors="coerce")
out = (bud <= 0) | (bud >= 999999)
c["budget_10k_krw"] = bud.mask(out)
c["budget_outlier"] = out
log("customers", "예산 이상치(-1, 999999)", "NULL 처리 + budget_outlier=true (평균 계산에서 제외)", out.sum(),
    "센티널 값이라 실제 예산이 아님. 중앙값으로 대체하지 않음(왜곡 방지)")

c["signup_date"] = norm_dates(c, "signup_date", "customers")
c["signup_is_future"] = c.signup_date > TODAY

# 결측
log("customers", "이메일 결측", "NULL 유지(임의 값 채우지 않음)", (c.email == "").sum())
log("customers", "전화 결측", "NULL 유지", (c.phone == "").sum())
for col in ("email", "phone"):
    c[col] = c[col].replace("", pd.NA)

# 중복: customer_id 기준. 행 간 차이는 전화번호뿐
c["_nulls"] = c[["phone", "email"]].isna().sum(axis=1)
c = c.sort_values(["customer_id", "_nulls", "_order"])
dup_ids = c[c.customer_id.duplicated(keep=False)].customer_id.unique()
conflict = 0
alt = {}
for cid in dup_ids:
    g = c[c.customer_id == cid]
    phones = g.phone.dropna().unique()
    if len(phones) > 1:
        conflict += 1
        alt[cid] = phones[1]
c["phone_alt"] = c.customer_id.map(alt)
c = c.drop_duplicates("customer_id", keep="first").sort_values("customer_id")
log("customers", f"중복 고객 행 (같은 customer_id가 여러 행, {len(dup_ids)}개 ID)", "customer_id당 1행 유지(결측이 적은 행 우선, 동률이면 먼저 나온 행)", n0 - len(c),
    "name+phone으로도 ID 간 중복 없음 확인. 중복 행끼리 다른 건 전화번호 포맷/번호뿐")
log("customers", "중복 행끼리 전화번호 값이 서로 다름", "유지한 번호는 phone, 다른 번호는 phone_alt에 보존", conflict,
    "어느 번호가 맞는지 판단 근거 없음 → 삭제하지 않고 보존")
c = c.drop(columns=["_order", "_nulls"])
c.to_csv(OUT / "customers.csv", index=False, encoding="utf-8")
log("customers", "정리 결과", f"{n0}행 → {len(c)}행", len(c))
cust_ids = set(c.customer_id)

# ---------------- units ----------------
u = read("units.csv")
for col in u.columns:
    u[col] = u[col].str.strip()
assert u.unit_id.is_unique
u["price_10k_krw"] = pd.to_numeric(u.price_10k_krw)
u["floor"] = pd.to_numeric(u.floor)
u["area_m2"] = pd.to_numeric(u.area_m2)
u.to_csv(OUT / "units.csv", index=False, encoding="utf-8")
log("units", "정합성 검증", "unit_id 유일, 값 변환만 수행", len(u), "수정 없음(마스터)")
unit_ids = set(u.unit_id)

# ---------------- consultations ----------------
k = read("consultations_raw.csv")
n0 = len(k)
outcome_dirty = int((k.outcome != k.outcome.str.strip()).sum())
for col in k.columns:
    k[col] = k[col].str.strip()
k["consult_date"] = norm_dates(k, "consult_date", "consultations")
k["is_future"] = k.consult_date > TODAY
ch_map = {"phone": "전화", "Phone": "전화", "방문상담": "방문"}
m = k.channel.isin(ch_map)
k["channel"] = k.channel.replace(ch_map)
log("consultations", "채널 표기 불일치(전화/phone/Phone, 방문/방문상담, 끝 공백)", "전화·방문·SNS·온라인 4종으로 통일", m.sum())
log("consultations", "outcome 끝 공백('계약희망 ')", "공백 제거", outcome_dirty)

dur = pd.to_numeric(k.duration_min)
k["duration_raw"] = dur
neg = dur <= 0
cap = dur >= 240
k["duration_flag"] = pd.Series(pd.NA, index=k.index, dtype="object").mask(neg, "invalid").mask(cap, "cap240")
k["duration_min"] = dur.mask(neg | cap)
log("consultations", "상담시간 음수/0", "NULL + duration_flag=invalid (원본은 duration_raw)", neg.sum(), "상담시간은 양수여야 함")
log("consultations", "상담시간 240분", "NULL + duration_flag=cap240", cap.sum(),
    "전체의 약 9%가 정확히 240 → 입력 상한값 의심. 평균 상담시간 계산에서 제외")

k["orphan_customer"] = ~k.customer_id.isin(cust_ids)
k["orphan_unit"] = ~k.unit_id.isin(unit_ids)
log("consultations", "마스터에 없는 customer_id (C99xxx 등)", "삭제하지 않고 orphan_customer=true 플래그", k.orphan_customer.sum(),
    "고객 단위 분석에서만 제외, 채널·상담 건수 집계는 유지")
log("consultations", "마스터에 없는 unit_id", "orphan_unit=true 플래그", k.orphan_unit.sum(), "호실 단위 분석에서만 제외")
k.to_csv(OUT / "consultations.csv", index=False, encoding="utf-8")
log("consultations", "정리 결과", f"{n0}행 → {len(k)}행 (행 삭제 없음)", len(k))

# ---------------- contracts ----------------
t = read("contracts_raw.csv")
n0 = len(t)
for col in t.columns:
    t[col] = t[col].str.strip()
st_map = {"complete": "완료", "Completed": "완료"}
m = t.status.isin(st_map)
t["status"] = t.status.replace(st_map)
log("contracts", "상태 표기 불일치(완료/complete/Completed, 끝 공백)", "완료·진행중·해지 3종으로 통일", m.sum())
t["contract_date"] = norm_dates(t, "contract_date", "contracts")
t["is_future"] = t.contract_date > TODAY

for col in ("price_10k_krw", "down_payment_10k_krw", "loan_amount_10k_krw"):
    t[col] = pd.to_numeric(t[col], errors="coerce")
z = t.price_10k_krw == 0
t["price_zero_flag"] = z
for col in ("price_10k_krw", "down_payment_10k_krw", "loan_amount_10k_krw"):
    t.loc[z, col] = pd.NA
log("contracts", "분양가 0원 (계약금·대출도 0)", "가격·계약금·대출 NULL + price_zero_flag=true", z.sum(),
    "units 가격으로 대체하지 않음: 계약 금액이 호실가의 약 12%(7~30%)라 같은 척도가 아님")
t["loan_missing"] = t.loan_amount_10k_krw.isna() & ~z
log("contracts", "대출금액 결측", "NULL 유지 + loan_missing=true (0원으로 간주하지 않음)", t.loan_missing.sum(),
    "현금 결제인지 미입력인지 구분 불가")

dup_unit = t.unit_id.duplicated(keep=False)
t["unit_multi_contract"] = dup_unit
log("contracts", "동일 unit_id에 계약 여러 건 (호실 1개에 최대 4건)", "삭제하지 않고 unit_multi_contract 플래그. 호실 단위 분석 시 해지 제외·최신 1건 사용", dup_unit.sum(),
    "합성 데이터 특성. units.status(계약완료 103호)와도 불일치하므로 호실 상태는 units, 매출은 contracts로 분리 집계")
t["orphan_customer"] = ~t.customer_id.isin(cust_ids)
t["orphan_unit"] = ~t.unit_id.isin(unit_ids)
log("contracts", "마스터 참조 정합성", "customer_id/unit_id 모두 존재 확인", t.orphan_customer.sum() + t.orphan_unit.sum(), "고아 0건")
t.to_csv(OUT / "contracts.csv", index=False, encoding="utf-8")
log("contracts", "정리 결과", f"{n0}행 → {len(t)}행 (행 삭제 없음)", len(t))

# ---------------- ad_spend ----------------
a = read("ad_spend.csv")
for col in a.columns[2:]:
    a[col] = pd.to_numeric(a[col])
assert not a.duplicated(["month", "channel"]).any() and (a.clicks <= a.impressions).all() and (a.leads <= a.clicks).all()
a.to_csv(OUT / "ad_spend.csv", index=False, encoding="utf-8")
log("ad_spend", "정합성 검증 (월×채널 유일, clicks≤impressions, leads≤clicks)", "수정 없음", len(a))

# ---------------- write log ----------------
(ROOT / "data").mkdir(exist_ok=True)
(ROOT / "data" / "cleaning_log.json").write_text(json.dumps(LOG, ensure_ascii=False, indent=1), encoding="utf-8")
md = ["# 데이터 정리 로그", "", f"기준일 {TODAY.date()} · 원본 `mission-data/*_raw.csv` · 생성: `scripts/clean.py`", "",
      "| 테이블 | 문제 | 처리 | 건수 | 이유/비고 |", "|---|---|---|---:|---|"]
for e in LOG:
    md.append(f"| {e['table']} | {e['issue']} | {e['action']} | {e['rows']} | {e['reason']} |")
(ROOT / "cleaning_log.md").write_text("\n".join(md) + "\n", encoding="utf-8")
print("done", {p.name: len(pd.read_csv(p)) for p in OUT.glob("*.csv")})
