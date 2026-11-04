#!/usr/bin/env node
/*
 * data/tables.json(표의 원본)으로 public/js/const.js 를 만든다. 의존성 없음(Node 22).
 *
 *   node tools/gen-const.js          public/js/const.js 를 다시 만든다
 *   node tools/gen-const.js --check  다시 만든 결과가 지금 파일과 같은지만 확인한다(다르면 종료 코드 1)
 *
 * tables.json 은 사람이 고치기 쉬운 모양(캐릭터 → 타입, 계열은 이름으로. 설명은 data/README.md)이고,
 * const.js 는 엔진이 읽는 모양(캐릭터·타입·계열 번호로 찾는 병렬 배열 Oresim.CONST)이다.
 * CONST 의 이름과 모양은 원래 Flash 판의 표(oresim-const.as) 그대로다. 엔진이 그 이름으로 읽는다.
 *
 * 모양이 틀린 표(칸 수, 없는 계열 이름, 0 이상의 정수가 아닌 값 등)면 const.js 를 쓰지 않고 까닭을 모두 알린다.
 * 로그 읽기가 기대는 이름 규칙(공백·'/'·':' 금지, 앞부분 겹침 금지 등)은 tests/const-check.js 가 본다.
 * 같은 입력이면 출력은 바이트 단위로 같다(두 번 돌려도 같은 파일).
 * 문자열은 ASCII 로만 쓴다(한글 등은 \uXXXX, 원문은 옆 주석). 서버가 .js 를 다른 문자 코드로 보내도 값이 깨지지 않게 하려는 것이다.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'data', 'tables.json');
const OUT = path.join(ROOT, 'public', 'js', 'const.js');

// 엔진과 로그 형식이 전제하는 칸 수(로그 한 줄 78칸 = 26 + 계열 50 + 2)
const N_XIEN = 50;
const N_STATUS = 11;      // STAB~AGI 7 + HP, MP, SP, WEIGHT
const N_STAT = 7;
const TOP_KEYS = ['maxLevel', 'maxStatus', 'statusName', 'statusUp', 'bonusStatusPoint', 'xien', 'characters', 'unusedSlots'];

class TableError extends Error {
  constructor(problems) {
    super(`data/tables.json 의 모양이 틀렸다 (${problems.length}건)\n` + problems.map((m) => '  - ' + m).join('\n'));
    this.problems = problems;
  }
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// tables.json → CONST 의 [이름, 값] 목록(const.js 에 적는 순서). 틀린 곳이 있으면 TableError
function buildConst(data) {
  const problems = [];
  const bad = (m) => problems.push(m);
  const isCount = (v) => Number.isInteger(v) && v >= 0;
  // 지금 값을 짧게: 배열이면 칸 수와 처음 틀린 값
  const now = (v) => {
    if (!Array.isArray(v)) return JSON.stringify(v);
    const i = v.findIndex((x) => !isCount(x));
    return `${v.length}칸` + (i >= 0 ? `, ${i}번째 값 ${JSON.stringify(v[i])}` : '');
  };
  const counts = (v, len, where) => {
    if (Array.isArray(v) && (len === undefined ? v.length > 0 : v.length === len) && v.every(isCount)) return true;
    bad(`${where}: 0 이상 정수 ${len === undefined ? '1개 이상' : len + '개'}의 배열이어야 한다 (지금 ${now(v)})`);
    return false;
  };
  const onlyKeys = (o, allowed, where) => {
    for (const k of Object.keys(o)) if (!allowed.includes(k)) bad(`${where}: 모르는 키 "${k}"`);
  };

  if (!isPlainObject(data)) throw new TableError(['맨 바깥이 객체가 아니다']);
  onlyKeys(data, ['_about'].concat(TOP_KEYS), '맨 바깥');
  for (const k of TOP_KEYS) if (!(k in data)) bad(`"${k}" 가 없다`);
  if (problems.length) throw new TableError(problems);

  // 상한
  if (!Number.isInteger(data.maxLevel) || data.maxLevel < 2) bad(`maxLevel: 2 이상의 정수여야 한다 (지금 ${JSON.stringify(data.maxLevel)})`);
  if (counts(data.maxStatus, N_STATUS, 'maxStatus') && data.maxStatus.some((v) => v < 1)) bad('maxStatus: 상한은 1 이상이어야 한다');

  // 스탯 이름: 로그의 줄 머리와 요약 줄에 그대로 쓰인다
  const sn = data.statusName;
  if (!Array.isArray(sn) || sn.length !== N_STATUS + 1 || !sn.every((n) => typeof n === 'string' && /^\S+$/.test(n)) || new Set(sn).size !== sn.length) {
    bad(`statusName: 공백 없는 서로 다른 이름 ${N_STATUS + 1}개여야 한다`);
  }
  const statNames = Array.isArray(sn) ? sn.slice(0, N_STAT) : [];

  // 스탯 1포인트당 HP, MP, SP, WEIGHT 증가
  if (!isPlainObject(data.statusUp)) bad('statusUp: 스탯 이름 → [HP, MP, SP, WEIGHT] 객체여야 한다');
  else {
    onlyKeys(data.statusUp, statNames, 'statusUp');
    for (const n of statNames) {
      if (!(n in data.statusUp)) bad(`statusUp: "${n}" 가 없다`);
      else counts(data.statusUp[n], 4, `statusUp.${n}`);
    }
  }

  // 레벨업 POINT: n번째 값 = LV n 이 될 때 얻는 POINT. 최고 레벨까지 꼭 maxLevel 칸
  counts(data.bonusStatusPoint, Number.isInteger(data.maxLevel) ? data.maxLevel : undefined, 'bonusStatusPoint');

  // 계열 50칸. 이름은 앞에서부터 이어진 칸에만 있다(이름 없는 칸은 쓰지 않는 자리)
  const xienNames = [];
  if (!Array.isArray(data.xien) || data.xien.length !== N_XIEN) bad(`xien: ${N_XIEN}칸이어야 한다`);
  else {
    let named = true;
    data.xien.forEach((e, x) => {
      const where = `xien[${x}]`;
      if (!isPlainObject(e)) return bad(`${where}: 객체가 아니다`);
      onlyKeys(e, ['name', 'upBonus', 'randomUpBonus', 'minUpStatus', 'maxUpStatus'], where);
      if ('name' in e) {
        if (!named) bad(`${where}: 이름 없는 칸 뒤에 이름이 있다(이름 있는 계열은 앞에서부터 이어져야 한다)`);
        if (typeof e.name !== 'string' || !e.name.trim() || /^\d+$/.test(e.name)) bad(`${where}: 이름은 숫자만이 아닌 글이어야 한다`);
        else if (xienNames.includes(e.name)) bad(`${where}: 이름 "${e.name}" 가 겹친다`);
        xienNames.push(e.name);
      } else named = false;
      counts(e.upBonus, N_STATUS, `${where}.upBonus`);
      counts(e.randomUpBonus, N_STAT, `${where}.randomUpBonus`);
      counts(e.minUpStatus, 4, `${where}.minUpStatus`);
      counts(e.maxUpStatus, 4, `${where}.maxUpStatus`);
    });
    if (!xienNames.length) bad('xien: 이름 있는 계열이 하나도 없다');
  }
  // 계열 가리키기: 이름, 또는 이름 없는 칸의 번호(타입의 xien 은 수, maxXien 의 키는 숫자 글)
  const xienIndex = (ref, where) => {
    let x = -1;
    if (typeof ref === 'string' && /^\d+$/.test(ref)) x = Number(ref);
    else if (typeof ref === 'number' && Number.isInteger(ref)) x = ref;
    else if (typeof ref === 'string') x = xienNames.indexOf(ref);
    if (!(x >= 0 && x < N_XIEN)) { bad(`${where}: 없는 계열 ${JSON.stringify(ref)}`); return -1; }
    return x;
  };

  // 캐릭터(화면·로그의 캐릭터 번호 순서)와 쓰지 않는 캐릭터 자리
  const chars = [];
  for (const [key, withName] of [['characters', true], ['unusedSlots', false]]) {
    const list = data[key];
    if (!Array.isArray(list) || (withName && !list.length)) { bad(`${key}: 배열이어야 한다${withName ? '(캐릭터 1명 이상)' : ''}`); continue; }
    list.forEach((e, c) => {
      const where = withName && isPlainObject(e) && typeof e.name === 'string' ? `${key}[${c}] ${e.name}` : `${key}[${c}]`;
      if (!isPlainObject(e)) return bad(`${where}: 객체가 아니다`);
      onlyKeys(e, withName ? ['name', 'types', 'maxXien'] : ['types', 'maxXien'], where);
      if (withName && (typeof e.name !== 'string' || !e.name)) bad(`${where}: name 이 없다`);
      const out = { name: e.name, types: [], maxXien: Array.from({ length: N_XIEN }, () => [0]) };
      // 타입은 1~3개(로그 읽기는 타입 번호 0..2 만 판별한다)
      if (!Array.isArray(e.types) || e.types.length < 1 || e.types.length > 3) bad(`${where}.types: 타입 1~3개의 배열이어야 한다`);
      else {
        e.types.forEach((t, s) => {
          const tw = `${where}.types[${s}]`;
          if (!isPlainObject(t)) return bad(`${tw}: 객체가 아니다`);
          onlyKeys(t, ['name', 'status', 'needPoint', 'xien'], tw);
          if (typeof t.name !== 'string' || !t.name) bad(`${tw}: name 이 없다`);
          counts(t.status, N_STATUS, `${tw}.status`);
          counts(t.needPoint, N_STAT, `${tw}.needPoint`);
          const x = xienIndex(t.xien, `${tw}.xien`);
          out.types.push({ name: t.name, status: t.status, needPoint: t.needPoint, xien: Array.from({ length: N_XIEN }, (_, i) => (i === x ? 1 : 0)) });
        });
      }
      // 레벨별 최대 Xien. 적지 않은 계열은 [0](그 캐릭터에게 없는 계열)
      if (!isPlainObject(e.maxXien)) bad(`${where}.maxXien: 계열 → LV 1부터의 값 배열 객체여야 한다`);
      else {
        const seen = new Set();
        for (const k of Object.keys(e.maxXien)) {
          const x = xienIndex(k, `${where}.maxXien`);
          if (x < 0) continue;
          if (seen.has(x)) bad(`${where}.maxXien: 계열 ${x} 를 두 번 적었다`);
          seen.add(x);
          if (counts(e.maxXien[k], undefined, `${where}.maxXien["${k}"]`)) out.maxXien[x] = e.maxXien[k];
        }
      }
      chars.push(out);
    });
  }
  if (problems.length) throw new TableError(problems);

  const CHAR_NAME = data.characters.map((e) => e.name);
  const STYLE_NAME = chars.map((e) => e.types.map((t) => t.name));
  return [
    ['MAX_LEVEL', data.maxLevel],
    ['MAX_STATUS', data.maxStatus],
    ['STATUS_NAME', data.statusName],
    ['XIEN_NAME', xienNames],
    ['CHAR_NAME', CHAR_NAME],
    // 드롭다운의 처음 목록(엔진의 initApp 이 이것으로 시작한다)
    ['charList', CHAR_NAME.map((label, i) => ({ label, data: i }))],
    ['sxiList', [{ xienLabel: xienNames[0], xienData: 0 }]],
    ['STYLE_NAME', STYLE_NAME],
    ['styleList', STYLE_NAME[0].map((label, i) => ({ label, data: i }))],
    ['xienList', [{ label: xienNames[0], data: 0 }]],
    ['DEFAULT_STATUS', chars.map((e) => e.types.map((t) => t.status))],
    ['DEFAULT_NEED_POINT', chars.map((e) => e.types.map((t) => t.needPoint))],
    ['DEFAULT_XIEN', chars.map((e) => e.types.map((t) => t.xien))],
    ['MAX_XIEN', chars.map((e) => e.maxXien)],
    ['STATUS_UP', statNames.map((n) => data.statusUp[n])],
    ['XIEN_UP_BONUS', data.xien.map((e) => e.upBonus)],
    ['XIEN_RANDOM_UP_BONUS', data.xien.map((e) => e.randomUpBonus)],
    ['MIN_XIEN_UP_STATUS', data.xien.map((e) => e.minUpStatus)],
    ['MAX_XIEN_UP_STATUS', data.xien.map((e) => e.maxUpStatus)],
    ['BONUS_STATUS_POINT', data.bonusStatusPoint],
  ];
}

function readTables(file = SRC) {
  const text = fs.readFileSync(file, 'utf8');
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new TableError([`JSON 으로 읽을 수 없다: ${e.message}`]);
  }
}

// ---- 출력 ----

// 문자열 리터럴: ASCII 밖의 글자는 \uXXXX 로 쓴다
const asciiString = (v) => JSON.stringify(v).replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));

function lit(v) {
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return asciiString(v);
  if (Array.isArray(v)) return '[' + v.map(lit).join(', ') + ']';
  return '{ ' + Object.keys(v).map((k) => `${k}: ${lit(v[k])}`).join(', ') + ' }';
}

const isLeafArray = (a) => Array.isArray(a) && a.every((v) => !Array.isArray(v) && (v === null || typeof v !== 'object'));
const comment = (s) => `/* ${String(s).replace(/\*\//g, '* /')} */ `;
// ASCII 밖의 글자가 든 값(문자열, { label } 같은 객체)의 원문을 뒤에 다는 주석
const note = (v) => {
  const text = typeof v === 'string' ? v
    : (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).map((k) => v[k]).filter((x) => typeof x === 'string').join(' ') : '';
  return /[^\x00-\x7e]/.test(text) ? ' ' + comment(text).trimEnd() : '';
};

function emitTable(name, value, T) {
  const charLabel = (c) => `${c} ${T.CHAR_NAME[c] !== undefined ? T.CHAR_NAME[c] : '(자리만 있는 캐릭터)'}`;
  const styleLabel = (c, s) => (T.STYLE_NAME[c] && T.STYLE_NAME[c][s] !== undefined ? T.STYLE_NAME[c][s] : String(s));
  const xienLabel = (x) => `${x} ${T.XIEN_NAME[x] !== undefined ? T.XIEN_NAME[x] : '(이름 없음)'}`;
  const ind = (n) => '  '.repeat(n);

  // 캐릭터 → 타입 → 값 (DEFAULT_STATUS, DEFAULT_NEED_POINT, DEFAULT_XIEN)
  const byCharStyle = (arr) => '[\n' + arr.map((row, c) =>
    ind(3) + comment(charLabel(c)) + '[\n' +
    row.map((leaf, s) => ind(4) + comment(styleLabel(c, s)) + lit(leaf)).join(',\n') + '\n' + ind(3) + ']').join(',\n') + '\n' + ind(2) + ']';

  switch (name) {
    case 'STYLE_NAME':
      return '[\n' + value.map((row, c) => ind(3) + comment(`${charLabel(c)}: ${row.join(', ')}`) + lit(row)).join(',\n') + '\n' + ind(2) + ']';
    case 'DEFAULT_STATUS':
    case 'DEFAULT_NEED_POINT':
    case 'DEFAULT_XIEN':
      return byCharStyle(value);
    case 'MAX_XIEN':
      return '[\n' + value.map((rows, c) =>
        ind(3) + comment(charLabel(c)) + '[\n' +
        rows.map((leaf, x) => ind(4) + comment(xienLabel(x)) + lit(leaf)).join(',\n') + '\n' + ind(3) + ']').join(',\n') + '\n' + ind(2) + ']';
    case 'XIEN_UP_BONUS':
    case 'XIEN_RANDOM_UP_BONUS':
    case 'MIN_XIEN_UP_STATUS':
    case 'MAX_XIEN_UP_STATUS':
      return '[\n' + value.map((leaf, x) => ind(3) + comment(xienLabel(x)) + lit(leaf)).join(',\n') + '\n' + ind(2) + ']';
    case 'STATUS_UP':
      return '[\n' + value.map((leaf, i) => ind(3) + comment(T.STATUS_NAME[i]) + lit(leaf)).join(',\n') + '\n' + ind(2) + ']';
    case 'BONUS_STATUS_POINT': {
      const lines = [];
      for (let i = 0; i < value.length; i += 20) {
        lines.push(ind(3) + comment(`LV ${i + 1}~${Math.min(i + 20, value.length)}`) + value.slice(i, i + 20).map(lit).join(', '));
      }
      return '[\n' + lines.join(',\n') + '\n' + ind(2) + ']';
    }
    default:
      if (isLeafArray(value) && lit(value).length <= 100) return lit(value);
      if (Array.isArray(value)) return '[\n' + value.map((v) => ind(3) + lit(v) + note(v)).join(',\n') + '\n' + ind(2) + ']';
      return lit(value);
  }
}

function generate(data = readTables()) {
  const tables = buildConst(data);
  const T = Object.fromEntries(tables);
  const body = tables.map(([name, value]) => `    ${name}: ${emitTable(name, value, T)}`).join(',\n');
  return [
    '/*',
    ' * 자동 생성 파일이다. 손으로 고치지 말 것.',
    ' * 만드는 법: node tools/gen-const.js  (원본: data/tables.json — 표를 바꿀 때는 그쪽을 고치고 다시 만든다)',
    ' *',
    ' * data/tables.json 의 표를 엔진이 읽는 모양(캐릭터·타입·계열 번호로 찾는 병렬 배열)으로 펼쳤다.',
    ' *  - 이름과 모양은 원래 Flash 판의 표(oresim-const.as) 그대로다',
    ' *  - charList, sxiList, styleList, xienList 는 드롭다운의 처음 목록이다(표에서 만든다)',
    ' *  - 모든 배열·객체는 Object.freeze 로 얼려 있다(엔진은 실행 중에 표를 바꾸지 않는다)',
    ' *  - 문자열은 ASCII 로만 적었다(한글은 \\uXXXX). 서버가 다른 문자 코드로 보내도 값이 깨지지 않는다',
    ' * 주석(캐릭터·타입·계열 이름, 문자열의 원문)은 생성기가 표의 값에서 붙인 것이다.',
    ' */',
    '(function () {',
    "  'use strict';",
    '  var Oresim = globalThis.Oresim = globalThis.Oresim || {};',
    '  var CONST = {',
    body,
    '  };',
    '  (function freeze(o) {',
    '    Object.freeze(o);',
    '    Object.keys(o).forEach(function (k) {',
    "      if (o[k] !== null && typeof o[k] === 'object' && !Object.isFrozen(o[k])) freeze(o[k]);",
    '    });',
    '  })(CONST);',
    '  Oresim.CONST = CONST;',
    '})();',
    '',
  ].join('\n');
}

function main() {
  let text;
  try {
    text = generate();
  } catch (e) {
    if (!(e instanceof TableError)) throw e;
    console.log(e.message);
    process.exitCode = 1;
    return;
  }
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
    if (now === text) {
      console.log(`OK: ${path.relative(ROOT, OUT)} 는 ${path.relative(ROOT, SRC)} 에서 다시 만든 결과와 같다`);
      return;
    }
    console.log(`다름: ${path.relative(ROOT, OUT)} 를 다시 만들어야 한다 (node tools/gen-const.js)`);
    process.exitCode = 1;
    return;
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, text);
  console.log(`썼다: ${path.relative(ROOT, OUT)} (${text.length} 글자)`);
}

if (require.main === module) main();

module.exports = { generate, buildConst, readTables, TableError, SRC, OUT, N_XIEN };
