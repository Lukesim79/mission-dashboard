"""Load data/clean/*.csv + cleaning log into Supabase via REST (needs SUPABASE_URL, SUPABASE_KEY env)."""
import json, os, urllib.request
import pandas as pd
URL, KEY = os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"]
def post(table, rows):
    for i in range(0, len(rows), 500):
        req = urllib.request.Request(f"{URL}/rest/v1/{table}", data=json.dumps(rows[i:i+500]).encode(), method="POST",
            headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json", "Prefer": "return=minimal"})
        urllib.request.urlopen(req).read()
for t in ["customers", "units", "consultations", "contracts", "ad_spend"]:
    df = pd.read_csv(f"data/clean/{t}.csv", dtype={"building": str, "unit_no": str})
    rows = json.loads(df.astype(object).where(df.notna(), None).to_json(orient="records", force_ascii=False))
    post(t, rows); print(t, len(rows))
post("cleaning_log", json.load(open("data/cleaning_log.json", encoding="utf-8"))); print("log ok")
