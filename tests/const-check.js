#!/usr/bin/env node
/*
 * 상수 확인
 *  1. oresim/oresim-const.as 를 원본 하네스(tests/harness.js)로 읽은 표와 web/js/const.js 의 Oresim.CONST 가 깊이 같다.
 *     oresim-const.as 의 모든 선언은 CONST 에 있거나, 일부러 뺀 목록(Flash 그림 경로)에 있다.
 *  2. tools/gen-web-const.js 로 다시 만든 결과가 지금 web/js/const.js 와 바이트 단위로 같다(손으로 고치지 않았다).
 *  3. CONST 는 깊이 얼어 있다.
 *  4. 엔진이 쓰는 스테퍼 한계(스탯 편집 창 editOpen().limits, 보너스%)가 oresim.mxml 과 같다.
 *  5. 엔진과 로그 읽기가 기대는 데이터 성질(CLAUDE.md '데이터/구조 변경 체크리스트'):
 *     타입마다 기본 계열이 하나이고 그 캐릭터 드롭다운에 있다, 드롭다운 계열에는 이름이 있다,
 *     캐릭터·타입·계열 이름 규칙(공백·'/'·':' 금지, 앞부분 겹침 금지 등), 표 크기.
 *  6. 문자 코드: const.js/engine.js 를 UTF-8 이 아닌 문자 코드(latin1, windows-1252, EUC-KR, Shift_JIS)로 읽어도
 *     표가 같고 엔진의 출력(로그, 육성 가이드, 한국어 로그 읽기)이 UTF-8 로 읽었을 때와 같다(문자열이 ASCII 로만 되어 있다).
 * 사용법: node tests/const-check.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const H = require('./harness');
const gen = require('../tools/gen-web-const');

const problems = [];
const bad = (m) => problems.push(m);

// const.js / engine.js 읽기
const ctx = { console };
vm.createContext(ctx);
for (const f of ['web/js/const.js', 'web/js/engine.js']) vm.runInContext(fs.readFileSync(path.join(H.REPO, f), 'utf8'), ctx, { filename: f });
const CONST = ctx.Oresim.CONST;

// 1. 원본 하네스의 표와 깊이 비교
const S = H.createSim(H.REPO, { init: false });   // initApp 전: 콤보박스 목록(xienList 등)이 아직 처음 값이다
function plain(v) {
  if (v && typeof v === 'object' && Array.isArray(v.source) && typeof v.getItemAt === 'function') return plain(v.source);   // ArrayCollection
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = plain(v[k]); return o; }
  return v;
}
function deepEq(a, b, p) {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return bad(`${p}: 배열/배열 아님`);
    if (a.length !== b.length) return bad(`${p}: 길이 ${a.length} / ${b.length}`);
    for (let i = 0; i < a.length; i++) {
      if ((i in a) !== (i in b)) return bad(`${p}[${i}]: 빈 칸`);
      deepEq(a[i], b[i], `${p}[${i}]`);
    }
    return undefined;
  }
  if (a && typeof a === 'object') {
    if (!b || typeof b !== 'object') return bad(`${p}: 객체/객체 아님`);
    const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
    if (ka.join() !== kb.join()) return bad(`${p}: 키 ${ka} / ${kb}`);
    for (const k of ka) deepEq(a[k], b[k], `${p}.${k}`);
    return undefined;
  }
  if (!Object.is(a, b)) bad(`${p}: ${JSON.stringify(a)} / ${JSON.stringify(b)}`);
  return undefined;
}
const declared = gen.loadTables().map(([name]) => name);   // 생성기가 옮기는 이름(뺀 것 제외, 소스 순서)
const constSrc = fs.readFileSync(path.join(H.REPO, 'oresim', 'oresim-const.as'), 'utf8');
const allDecl = [...gen.stripAs3(constSrc).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\bvar\s+(\w+)/g)].map((m) => m[1]);
for (const name of allDecl) {
  if (gen.DROPPED.has(name)) { if (name in CONST) bad(`${name}: 뺀다고 한 이름이 CONST 에 있다`); continue; }
  if (!(name in CONST)) { bad(`${name}: oresim-const.as 에 있는데 CONST 에 없다`); continue; }
  deepEq(plain(S[name]), plain(CONST[name]), name);
}
for (const name of Object.keys(CONST)) if (!allDecl.includes(name)) bad(`${name}: CONST 에만 있다`);
if (declared.join() !== Object.keys(CONST).join()) bad(`CONST 의 이름 순서가 소스 순서와 다르다`);

// 2. 다시 만든 결과와 같은가
if (gen.generate() !== fs.readFileSync(gen.OUT, 'utf8')) bad('web/js/const.js 가 node tools/gen-web-const.js 결과와 다르다');

// 3. 깊이 얼어 있는가
(function frozen(o, p) {
  if (!Object.isFrozen(o)) bad(`${p}: 얼어 있지 않다`);
  for (const k of Object.keys(o)) if (o[k] && typeof o[k] === 'object') frozen(o[k], `${p}.${k}`);
})(CONST, 'CONST');

// 4. 스테퍼 한계 = oresim.mxml
const mxml = fs.readFileSync(path.join(H.REPO, 'oresim.mxml'), 'utf8');
const steppers = {};
for (const tag of mxml.match(/<mx:NumericStepper\b[^>]*>/g)) {
  const a = Object.fromEntries([...tag.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  steppers[a.id] = [+a.minimum, +a.maximum, +a.stepSize];
}
const E = ctx.Oresim.createEngine();
const lim = E.editOpen().limits;
// statusEdit() 는 slv, ss0~ss9 의 maximum 을 MAX_LEVEL/MAX_STATUS 로 바꾼다. 그 밖은 MXML 그대로
const expectLim = (id, max) => [steppers[id][0], max !== undefined ? max : steppers[id][1], steppers[id][2]];
deepEq(plain(lim.lv), expectLim('slv', CONST.MAX_LEVEL), 'limits.lv');
for (let i = 0; i < 7; i++) deepEq(plain(lim.stats[i]), expectLim(`ss${i}`, CONST.MAX_STATUS[i]), `limits.stats[${i}]`);
deepEq(plain(lim.hp), expectLim('ss7', CONST.MAX_STATUS[7]), 'limits.hp');
deepEq(plain(lim.mp), expectLim('ss8', CONST.MAX_STATUS[8]), 'limits.mp');
deepEq(plain(lim.sp), expectLim('ss9', CONST.MAX_STATUS[9]), 'limits.sp');
deepEq(plain(lim.point), expectLim('ss11'), 'limits.point');
for (const id of ['slv', 'ss0', 'ss1', 'ss2', 'ss3', 'ss4', 'ss5', 'ss6']) {
  const want = id === 'slv' ? CONST.MAX_LEVEL : CONST.MAX_STATUS[+id.slice(2)];
  if (steppers[id][1] !== want) bad(`oresim.mxml 의 ${id} maximum ${steppers[id][1]} 이 상수 ${want} 와 다르다(CLAUDE.md: 같은 값으로 맞춰 둔다)`);
}
const [bmin, bmax, bstep] = steppers.bonusNS;
if (E.setBonus(bmin - 10).rate !== bmin || E.setBonus(bmax + 10).rate !== bmax || E.setBonus(bstep + bstep / 2 - 0.1).rate !== bstep) bad('보너스% 스테퍼 한계·단위가 oresim.mxml 과 다르다');

// 5. 데이터 성질
const C = CONST;
const nChar = C.CHAR_NAME.length;
for (const k of ['STYLE_NAME', 'DEFAULT_STATUS', 'DEFAULT_NEED_POINT', 'DEFAULT_XIEN', 'MAX_XIEN']) if (C[k].length < nChar) bad(`${k} 가 캐릭터 수보다 짧다`);
for (const k of ['XIEN_UP_BONUS', 'XIEN_RANDOM_UP_BONUS', 'MIN_XIEN_UP_STATUS', 'MAX_XIEN_UP_STATUS']) if (C[k].length !== 50) bad(`${k} 가 50칸이 아니다`);
if (C.BONUS_STATUS_POINT.length < C.MAX_LEVEL) bad('BONUS_STATUS_POINT 가 MAX_LEVEL 보다 짧다');
const xNames = new Set();
C.XIEN_NAME.forEach((n, i) => {
  if (xNames.has(n)) bad(`XIEN_NAME[${i}] "${n}" 가 겹친다`);
  xNames.add(n);
  if (n.includes(':')) bad(`XIEN_NAME[${i}] "${n}" 에 ':' 가 있다`);
  C.XIEN_NAME.forEach((m, j) => { if (i !== j && m.startsWith(n + ' ')) bad(`XIEN_NAME "${n}" + 공백이 "${m}" 의 앞부분이다(메모 규칙과 겹친다)`); });
});
for (let c = 0; c < nChar; c++) {
  const name = C.CHAR_NAME[c];
  if (/[\s/:]/.test(name)) bad(`CHAR_NAME[${c}] "${name}" 에 공백/'/'/':' 가 있다`);
  const types = C.STYLE_NAME[c];
  if (types.length < 1 || types.length > 3) bad(`${name}: 타입이 ${types.length}개 (logLoad 는 0..2 만 판별한다)`);
  types.forEach((t, s) => {
    if (/[\s/:]/.test(t)) bad(`${name}/${t}: 타입 이름에 공백/'/'/':' 가 있다`);
    types.forEach((u, r) => { if (s !== r && u.startsWith(t)) bad(`${name}: 타입 "${t}" 가 "${u}" 의 앞부분이다`); });
  });
  C.CHAR_NAME.forEach((m, d) => { if (c !== d && m === name) bad(`CHAR_NAME "${name}" 가 겹친다`); });
  const list = [];
  C.MAX_XIEN[c].forEach((row, x) => { if (row[row.length - 1] > 0) list.push(x); });
  for (const x of list) if (C.XIEN_NAME[x] === undefined) bad(`${name}: 드롭다운 계열 ${x} 에 이름이 없다`);
  for (let s = 0; s < types.length; s++) {
    const on = C.DEFAULT_XIEN[c][s].map((v, x) => [v, x]).filter(([v]) => v > 0).map(([, x]) => x);
    // 콤보박스: initXienList 직후의 선택은 initXien 이 기본 계열로 다시 고르므로, 기본 계열이 꼭 드롭다운에 있어야 한다
    if (on.length !== 1 || !list.includes(on[0])) bad(`${name}/${types[s]}: 기본 계열 ${JSON.stringify(on)} 이 하나가 아니거나 드롭다운에 없다`);
    if (C.DEFAULT_STATUS[c][s].length !== 11 || C.DEFAULT_NEED_POINT[c][s].length !== 7 || C.DEFAULT_XIEN[c][s].length !== 50) bad(`${name}/${types[s]}: 표 크기`);
  }
}

// 6. 다른 문자 코드로 읽어도 같다
function runSample(O) {
  const X = O.createEngine();
  X.setChar(15); X.setType(0);
  const out = [];
  for (let k = 0; k < 30; k++) { X.levelUp(); X.statUp(k % 7); if (k % 9 === 0) X.dash(2); }
  X.setXien(X.view().xien.lines[1].x);
  for (let k = 0; k < 20; k++) X.levelUp();
  out.push(X.exportLog(), X.guide(), JSON.stringify(X.view()));
  const Y = O.createEngine();
  out.push(JSON.stringify(Y.importLog(X.exportLog())), JSON.stringify(Y.view()), Y.guide());
  return out;
}
const want = runSample(ctx.Oresim);
const decoders = [['latin1', (b) => b.toString('latin1')]];
for (const enc of ['windows-1252', 'euc-kr', 'shift_jis']) {
  try { const d = new TextDecoder(enc); decoders.push([enc, (b) => d.decode(b)]); } catch (e) { /* 이 Node 에 없는 문자 코드 */ }
}
for (const [enc, decode] of decoders) {
  const c2 = { console };
  vm.createContext(c2);
  try {
    for (const f of ['web/js/const.js', 'web/js/engine.js']) vm.runInContext(decode(fs.readFileSync(path.join(H.REPO, f))), c2, { filename: f });
  } catch (e) {
    bad(`${enc} 로 읽으면 실행되지 않는다: ${e.message}`);
    continue;
  }
  deepEq(plain(CONST), plain(c2.Oresim.CONST), `${enc}:CONST`);
  const got = runSample(c2.Oresim);
  got.forEach((t, k) => { if (t !== want[k]) bad(`${enc} 로 읽은 엔진의 출력 ${k} 이 UTF-8 로 읽었을 때와 다르다`); });
}

if (problems.length) {
  console.log(`상수 확인 실패 ${problems.length}건`);
  for (const m of problems.slice(0, 40)) console.log('  - ' + m);
  process.exitCode = 1;
} else {
  console.log(`OK: CONST ${Object.keys(CONST).length}개 = oresim-const.as (뺀 것: ${[...gen.DROPPED].filter((n) => allDecl.includes(n)).length}개 그림 경로), 다시 만든 const.js 와 같음, 얼어 있음, 스테퍼 한계 = oresim.mxml, 데이터 성질 OK, 문자 코드 ${decoders.map((d) => d[0]).join('/')} 로 읽어도 같음`);
}
