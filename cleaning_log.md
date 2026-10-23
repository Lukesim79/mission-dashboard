# 데이터 정리 로그

기준일 2026-10-23 · 원본 `mission-data/*_raw.csv` · 생성: `scripts/clean.py`

| 테이블 | 문제 | 처리 | 건수 | 이유/비고 |
|---|---|---|---:|---|
| customers | 전화번호 포맷 3종(010-0000-0000 / 01000000000 / 010.0000.0000) | 숫자 11자리로 통일 | 612 |  |
| customers | 등급 표기 불일치(VIP/vip/Vip, '일반 ', ' 일반') | 공백 제거 + VIP 대소문자 통일 (VVIP·관심고객·신규는 별개 등급으로 유지) | 178 | VVIP는 VIP와 다른 등급일 수 있어 병합하지 않음 |
| customers | 유입경로 표기(블로그/Blog, 광고/광고(네이버)) | 블로그로 통일, 광고(네이버)→광고 | 125 | 네이버 구분은 하위분류라 광고로 합침(세부 구분이 필요하면 raw 참조) |
| customers | 지역 표기 불일치(서울/Seoul/seoul/서울시 등) | 17개 시도 약칭으로 통일 | 37 |  |
| customers | 예산 이상치(-1, 999999) | NULL 처리 + budget_outlier=true (평균 계산에서 제외) | 129 | 센티널 값이라 실제 예산이 아님. 중앙값으로 대체하지 않음(왜곡 방지) |
| customers | signup_date 날짜 포맷 4종 혼재 (9999-99-99:476, 9999/99/99:60, 99999999:58, 99-99-9999:54) | ISO(YYYY-MM-DD)로 통일 | 172 | NN-NN-YYYY는 두 번째 값이 12 초과인 경우가 있고 첫 값은 없어 MM-DD-YYYY로 해석 |
| customers | signup_date가 기준일(2026-10-23) 이후 미래 날짜 | 삭제하지 않고 is_future 플래그만 부여 | 36 | 합성 데이터가 2026-12까지 생성됨. 시계열 추이 차트는 기준일까지만 사용 |
| customers | 이메일 결측 | NULL 유지(임의 값 채우지 않음) | 38 |  |
| customers | 전화 결측 | NULL 유지 | 36 |  |
| customers | 중복 고객 행 (같은 customer_id가 여러 행, 48개 ID) | customer_id당 1행 유지(결측이 적은 행 우선, 동률이면 먼저 나온 행) | 48 | name+phone으로도 ID 간 중복 없음 확인. 중복 행끼리 다른 건 전화번호 포맷/번호뿐 |
| customers | 중복 행끼리 전화번호 값이 서로 다름 | 유지한 번호는 phone, 다른 번호는 phone_alt에 보존 | 22 | 어느 번호가 맞는지 판단 근거 없음 → 삭제하지 않고 보존 |
| customers | 정리 결과 | 648행 → 600행 | 600 |  |
| units | 정합성 검증 | unit_id 유일, 값 변환만 수행 | 220 | 수정 없음(마스터) |
| consultations | consult_date 날짜 포맷 4종 혼재 (9999-99-99:1863, 99-99-9999:214, 9999/99/99:212, 99999999:211) | ISO(YYYY-MM-DD)로 통일 | 637 | NN-NN-YYYY는 두 번째 값이 12 초과인 경우가 있고 첫 값은 없어 MM-DD-YYYY로 해석 |
| consultations | consult_date가 기준일(2026-10-23) 이후 미래 날짜 | 삭제하지 않고 is_future 플래그만 부여 | 161 | 합성 데이터가 2026-12까지 생성됨. 시계열 추이 차트는 기준일까지만 사용 |
| consultations | 채널 표기 불일치(전화/phone/Phone, 방문/방문상담, 끝 공백) | 전화·방문·SNS·온라인 4종으로 통일 | 953 |  |
| consultations | outcome 끝 공백('계약희망 ') | 공백 제거 | 501 |  |
| consultations | 상담시간 음수/0 | NULL + duration_flag=invalid (원본은 duration_raw) | 493 | 상담시간은 양수여야 함 |
| consultations | 상담시간 240분 | NULL + duration_flag=cap240 | 225 | 전체의 약 9%가 정확히 240 → 입력 상한값 의심. 평균 상담시간 계산에서 제외 |
| consultations | 마스터에 없는 customer_id (C99xxx 등) | 삭제하지 않고 orphan_customer=true 플래그 | 74 | 고객 단위 분석에서만 제외, 채널·상담 건수 집계는 유지 |
| consultations | 마스터에 없는 unit_id | orphan_unit=true 플래그 | 83 | 호실 단위 분석에서만 제외 |
| consultations | 정리 결과 | 2500행 → 2500행 (행 삭제 없음) | 2500 |  |
| contracts | 상태 표기 불일치(완료/complete/Completed, 끝 공백) | 완료·진행중·해지 3종으로 통일 | 81 |  |
| contracts | contract_date 날짜 포맷 4종 혼재 (9999-99-99:254, 99999999:42, 99-99-9999:28, 9999/99/99:26) | ISO(YYYY-MM-DD)로 통일 | 96 | NN-NN-YYYY는 두 번째 값이 12 초과인 경우가 있고 첫 값은 없어 MM-DD-YYYY로 해석 |
| contracts | contract_date가 기준일(2026-10-23) 이후 미래 날짜 | 삭제하지 않고 is_future 플래그만 부여 | 20 | 합성 데이터가 2026-12까지 생성됨. 시계열 추이 차트는 기준일까지만 사용 |
| contracts | 분양가 0원 (계약금·대출도 0) | 가격·계약금·대출 NULL + price_zero_flag=true | 4 | units 가격으로 대체하지 않음: 계약 금액이 호실가의 약 12%(7~30%)라 같은 척도가 아님 |
| contracts | 대출금액 결측 | NULL 유지 + loan_missing=true (0원으로 간주하지 않음) | 40 | 현금 결제인지 미입력인지 구분 불가 |
| contracts | 동일 unit_id에 계약 여러 건 (호실 1개에 최대 4건) | 삭제하지 않고 unit_multi_contract 플래그. 호실 단위 분석 시 해지 제외·최신 1건 사용 | 224 | 합성 데이터 특성. units.status(계약완료 103호)와도 불일치하므로 호실 상태는 units, 매출은 contracts로 분리 집계 |
| contracts | 마스터 참조 정합성 | customer_id/unit_id 모두 존재 확인 | 0 | 고아 0건 |
| contracts | 정리 결과 | 350행 → 350행 (행 삭제 없음) | 350 |  |
| ad_spend | 정합성 검증 (월×채널 유일, clicks≤impressions, leads≤clicks) | 수정 없음 | 144 |  |
