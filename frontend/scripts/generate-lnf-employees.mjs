#!/usr/bin/env node
/**
 * 엘엔에프(L&F) 사원번호 샘플 데이터 생성
 * - 8자리 사번: 입사연도 4자리 + 일련번호 4자리
 * - 100명 CSV 생성 (data/lnf-employees-sample.csv)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FAMILY_NAMES = [
  '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임',
  '한', '오', '서', '신', '권', '황', '안', '송', '류', '전',
];

const GIVEN_NAMES = [
  '민준', '서연', '도윤', '지우', '현우', '미소', '준호', '아름', '성민', '유진',
  '재현', '수빈', '지훈', '예진', '동현', '하은', '승우', '지현', '민지', '준영',
  '수현', '은지', '시우', '유나', '태형', '서영', '영호', '지원', '민서', '현준',
  '소희', '성준', '다은', '지민', '찬우', '서윤', '준서', '예나', '성현', '하윤',
  '민호', '지아', '시현', '유정', '동욱', '수진', '재윤', '은서', '태민', '서우',
  '정우', '지은', '현서', '민규', '예린', '승현', '유림', '시윤', '준혁', '다현',
  '영진', '서현', '지욱', '수민', '태윤', '예은', '동준', '하린', '성우', '유나',
  '민성', '지수', '시원', '재민', '수아', '은혜', '준호', '현지', '태현', '서진',
  '정민', '지효', '동혁', '예지', '승민', '유진', '시현', '다솔', '영수', '서연',
  '민재', '지영', '현성', '수혜', '태경', '은영', '재호', '하늘', '성민', '지우',
];

const DEPT_LIST = [
  '공정관리팀', '품질보증팀', '설비기술팀', '생산운영팀', 'R&D센터',
  '품질분석팀', '생산기술팀', '인사팀', '재무팀', '구매팀', '물류팀',
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateEmpId(year, serial) {
  return `${year}${String(serial).padStart(4, '0')}`;
}

const records = [];
const usedNames = new Set();
const namePool = shuffle(
  FAMILY_NAMES.flatMap((f) => GIVEN_NAMES.map((g) => f + g))
);
let nameIdx = 0;

const serialPerYear = { 2020: 1, 2021: 1, 2022: 1, 2023: 1, 2024: 1 };
let adminCount = 0;
const TARGET_ADMINS = 10;

for (let i = 0; i < 100; i++) {
  const year = 2020 + Math.floor(i / 25);
  const y = Math.min(year, 2024);
  const serial = serialPerYear[y] || 1;
  serialPerYear[y] = serial + 1;

  const empId = generateEmpId(y, serial);

  let fullName;
  while (nameIdx < namePool.length) {
    const n = namePool[nameIdx++];
    if (!usedNames.has(n)) {
      usedNames.add(n);
      fullName = n;
      break;
    }
  }
  fullName = fullName || `사원${String(i + 1).padStart(3, '0')}`;

  const isAdmin =
    adminCount < TARGET_ADMINS && (Math.random() < 0.15 || i < 10);
  if (isAdmin) adminCount++;
  const role = isAdmin ? '관리자' : '일반사원';
  const dept = DEPT_LIST[Math.floor(Math.random() * DEPT_LIST.length)];

  records.push({ emp_id: empId, name: fullName, role, dept });
}

// 관리자 수 맞추기
while (adminCount < TARGET_ADMINS) {
  const idx = Math.floor(Math.random() * 100);
  if (records[idx].role === '일반사원') {
    records[idx].role = '관리자';
    adminCount++;
  }
}

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const csvPath = path.join(dataDir, 'lnf-employees-sample.csv');
const header = 'emp_id,name,role,dept';
const rows = records.map(
  (r) => `${r.emp_id},${r.name},${r.role},${r.dept}`
);
fs.writeFileSync(csvPath, '\uFEFF' + header + '\n' + rows.join('\n'), 'utf8');

console.log(`✓ 생성 완료: ${csvPath}`);
console.log(
  `  - 총 ${records.length}명 (관리자 ${adminCount}명, 일반사원 ${100 - adminCount}명)`
);
