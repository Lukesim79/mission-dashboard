# 분양 CRM 미션 대시보드

합성 데이터(mission-data) 정리 → Supabase 적재 → Next.js 대시보드 → Vercel 배포.

- `scripts/clean.py` 원본 CSV 정리 + `cleaning_log.md` 생성 (행 삭제는 중복 고객뿐, 나머지는 NULL+플래그)
- `scripts/load.py` 정리본을 Supabase REST로 적재 (환경변수 SUPABASE_URL/SUPABASE_KEY)
- `app/` 대시보드(`/`), 정리 로그(`/log`), 비밀번호 보호 관리자(`/admin`)
- 환경변수: `.env.example` 참고. `ADMIN_PASSWORD`는 Vercel 환경변수로만 설정, 커밋 금지
- 대시보드는 RLS로 SELECT만 허용된 anon(publishable) 키를 사용
