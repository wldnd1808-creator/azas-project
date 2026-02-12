#!/usr/bin/env python3
"""
엘엔에프(L&F) 사원번호 샘플 데이터 생성 스크립트
- 8자리 사번 체계: 입사연도 4자리 + 일련번호 4자리
- 100명 분량 CSV 생성
- 관리자/일반사원 비율 약 1:9
"""

import csv
import random
from pathlib import Path

# 한국 이름 샘플 (성이름 조합)
FAMILY_NAMES = [
    "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
    "한", "오", "서", "신", "권", "황", "안", "송", "류", "전"
]

GIVEN_NAMES = [
    "민준", "서연", "도윤", "지우", "현우", "미소", "준호", "아름", "성민", "유진",
    "재현", "수빈", "지훈", "예진", "동현", "하은", "승우", "지현", "민지", "준영",
    "수현", "은지", "시우", "유나", "태형", "서영", "영호", "지원", "민서", "현준",
    "소희", "성준", "다은", "지민", "찬우", "서윤", "준서", "예나", "성현", "하윤",
    "민호", "지아", "시현", "유정", "동욱", "수진", "재윤", "은서", "태민", "서우",
    "정우", "지은", "현서", "민규", "예린", "승현", "유림", "시윤", "준혁", "다현",
    "영진", "서현", "지욱", "수민", "태윤", "예은", "동준", "하린", "성우", "유나",
    "민성", "지수", "시원", "재민", "수아", "은혜", "준호", "현지", "태현", "서진",
    "정민", "지효", "동혁", "예지", "승민", "유진", "시현", "다솔", "영수", "서연",
    "민재", "지영", "현성", "수혜", "태경", "은영", "재호", "하늘", "성민", "지우"
]

# 부서 목록
DEPT_LIST = [
    "공정관리팀", "품질보증팀", "설비기술팀", "생산운영팀", "R&D센터",
    "품질분석팀", "생산기술팀", "인사팀", "재무팀", "구매팀", "물류팀"
]

def generate_emp_id(year: int, serial: int) -> str:
    """8자리 사번 생성 (YYYY + NNNN)"""
    return f"{year}{serial:04d}"

def main():
    random.seed(42)
    used_names = set()
    records = []

    # 2020~2024년 입사, 연도별 20명씩
    serial_per_year = {}
    for year in range(2020, 2025):
        serial_per_year[year] = 1

    name_pool = [(f, g) for f in FAMILY_NAMES for g in GIVEN_NAMES]
    random.shuffle(name_pool)
    name_idx = 0

    admin_count = 0
    target_admins = 10  # 100명 중 약 10명 관리자

    for i in range(100):
        year = 2020 + (i // 25)  # 0-24: 2020, 25-49: 2021, ...
        if year > 2024:
            year = 2024
        serial = serial_per_year.get(year, 1)
        serial_per_year[year] = serial + 1

        emp_id = generate_emp_id(year, serial)

        # 이름 (중복 방지)
        while name_idx < len(name_pool):
            f, g = name_pool[name_idx]
            name_idx += 1
            full_name = f + g
            if full_name not in used_names:
                used_names.add(full_name)
                break
        else:
            full_name = f"사원{i+1:03d}"

        # 관리자 10명, 나머지 일반사원
        if admin_count < target_admins and random.random() < 0.15:
            role = "관리자"
            admin_count += 1
        else:
            role = "일반사원"

        dept = random.choice(DEPT_LIST)
        records.append({
            "emp_id": emp_id,
            "name": full_name,
            "role": role,
            "dept": dept
        })

    # 관리자가 10명 미만이면 일부를 관리자로 변경
    while admin_count < target_admins:
        idx = random.randint(0, 99)
        if records[idx]["role"] == "일반사원":
            records[idx]["role"] = "관리자"
            admin_count += 1

    # 출력 경로
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    data_dir = project_root / "data"
    data_dir.mkdir(exist_ok=True)
    csv_path = data_dir / "lnf-employees-sample.csv"

    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=["emp_id", "name", "role", "dept"])
        writer.writeheader()
        writer.writerows(records)

    print(f"✓ 생성 완료: {csv_path}")
    print(f"  - 총 {len(records)}명 (관리자 {sum(1 for r in records if r['role']=='관리자')}명, 일반사원 {sum(1 for r in records if r['role']=='일반사원')}명)")

if __name__ == "__main__":
    main()
