#!/usr/bin/env node
/*
 * 상수 확인
 *  1. tools/gen-const.js 로 data/tables.json(표의 원본)에서 다시 만든 결과가 지금 public/js/const.js 와 바이트 단위로 같다
 *     (손으로 고치지 않았다). 그 CONST 가 생성기가 만든 표와 깊이 같다.
 *  2. CONST 는 깊이 얼어 있다.
 *  3. 엔진의 스테퍼(STEPPER_DEFS, 원래 Flash 판 화면의 NumericStepper 값)가 표와 맞는다: 스탯 편집 창의 LV·스탯·HP/MP/SP 칸의
 *     최댓값 = MAX_LEVEL/MAX_STATUS(엔진은 창을 열 때 표의 상한으로 바꾸지만, 같은 값을 따라 적어 둔다), 편집 창 한계(editOpen().limits)와
 *     보너스% 스테퍼의 반올림·범위가 STEPPER_DEFS 와 같다.
 *  4. 엔진과 로그 읽기가 기대는 데이터 성질(CLAUDE.md '데이터/구조 변경 체크리스트'):
 *     타입마다 기본 계열이 하나이고 그 캐릭터 드롭다운에 있다, 드롭다운 계열에는 이름이 있다,
 *     캐릭터·타입·계열 이름 규칙(공백·'/'·':' 금지, 앞부분 겹침 금지 등), 표 크기.
 *  5. 문자 코드: const.js/engine.js 를 UTF-8 이 아닌 문자 코드(latin1, windows-1252, EUC-KR, Shift_JIS)로 읽어도
 *     표가 같고 엔진의 출력(로그, 육성 가이드, 한국어 로그 읽기)이 UTF-8 로 읽었을 때와 같다(문자열이 ASCII 로만 되어 있다).
 * 사용법: node tests/const-check.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const X = require('./engine-host');
const gen = require('../tools/gen-const');

const problems = [];
const bad = (m) => problems.push(m);

// const.js / engine.js 읽기(엔진은 ORESIM_ENGINE=경로 를 주면 그 파일)
const ctx = { console };
vm.createContext(ctx);
for (const f of [path.join(X.REPO, 'public/js/const.js'), process.env.ORESIM_ENGINE || path.join(X.REPO, 'public/js/engine.js')]) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
const CONST = ctx.Oresim.CONST;

function plain(v) {
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
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.join() !== kb.join()) return bad(`${p}: 키 ${ka} / ${kb}`);
    for (const k of ka) deepEq(a[k], b[k], `${p}.${k}`);
    return undefined;
  }
  if (!Object.is(a, b)) bad(`${p}: ${JSON.stringify(a)} / ${JSON.stringify(b)}`);
  return undefined;
}

// 1. data/tables.json 에서 다시 만든 결과와 같은가
let built = null;
try {
  const data = gen.readTables();
  built = gen.buildConst(data);
  if (gen.generate(data) !== fs.readFileSync(gen.OUT, 'utf8')) bad('public/js/const.js 가 node tools/gen-const.js 결과와 다르다(표를 고쳤으면 다시 만든다)');
} catch (e) {
  if (!(e instanceof gen.TableError)) throw e;
  bad(e.message);
}
if (built) {
  if (built.map(([k]) => k).join() !== Object.keys(CONST).join()) bad('CONST 의 이름(순서)이 생성기가 만든 표와 다르다');
  for (const [name, value] of built) deepEq(plain(value), plain(CONST[name]), name);
}

// 2. 깊이 얼어 있는가
(function frozen(o, p) {
  if (!Object.isFrozen(o)) bad(`${p}: 얼어 있지 않다`);
  for (const k of Object.keys(o)) if (o[k] && typeof o[k] === 'object') frozen(o[k], `${p}.${k}`);
})(CONST, 'CONST');

// 3. 스테퍼: 엔진의 STEPPER_DEFS([minimum, maximum, stepSize, 처음 value]) ↔ 표의 상한, 편집 창 한계, 보너스%
const defsSrc = (fs.readFileSync(process.env.ORESIM_ENGINE || path.join(X.REPO, 'public/js/engine.js'), 'utf8').match(/var STEPPER_DEFS = \{([\s\S]*?)\};/) || [])[1];
const defs = defsSrc ? Object.fromEntries([...defsSrc.matchAll(/(\w+): \[([^\]]*)\]/g)].map((m) => [m[1], m[2].split(',').map(Number)])) : null;
if (!defs) bad('public/js/engine.js 에서 STEPPER_DEFS 를 찾지 못했다');
else {
  const want = { slv: CONST.MAX_LEVEL };
  for (let i = 0; i <= 9; i++) want[`ss${i}`] = CONST.MAX_STATUS[i];
  for (const id of Object.keys(want)) {
    if (!defs[id]) bad(`STEPPER_DEFS 에 ${id} 가 없다`);
    else if (defs[id][1] !== want[id]) bad(`STEPPER_DEFS 의 ${id} 최댓값 ${defs[id][1]} 이 표의 상한 ${want[id]} 와 다르다(같은 값으로 맞춰 둔다. CLAUDE.md 'MAX_LEVEL/MAX_STATUS 변경')`);
  }
  const E = ctx.Oresim.createEngine();
  const lim = E.editOpen().limits;
  const expectLim = (id) => [defs[id][0], defs[id][1], defs[id][2]];
  deepEq(plain(lim.lv), expectLim('slv'), 'limits.lv');
  for (let i = 0; i < 7; i++) deepEq(plain(lim.stats[i]), expectLim(`ss${i}`), `limits.stats[${i}]`);
  deepEq(plain(lim.hp), expectLim('ss7'), 'limits.hp');
  deepEq(plain(lim.mp), expectLim('ss8'), 'limits.mp');
  deepEq(plain(lim.sp), expectLim('ss9'), 'limits.sp');
  deepEq(plain(lim.point), expectLim('ss11'), 'limits.point');
  const [bmin, bmax, bstep] = defs.bonusNS;
  if (E.setBonus(bmin - 10).rate !== bmin || E.setBonus(bmax + 10).rate !== bmax || E.setBonus(bstep + bstep / 2 - 0.1).rate !== bstep) bad('보너스% 스테퍼의 범위·단위가 STEPPER_DEFS.bonusNS 와 다르다');
}

// 4. 데이터 성질
const C = CONST;
const nChar = C.CHAR_NAME.length;
for (const k of ['STYLE_NAME', 'DEFAULT_STATUS', 'DEFAULT_NEED_POINT', 'DEFAULT_XIEN', 'MAX_XIEN']) if (C[k].length < nChar) bad(`${k} 가 캐릭터 수보다 짧다`);
for (const k of ['XIEN_UP_BONUS', 'XIEN_RANDOM_UP_BONUS', 'MIN_XIEN_UP_STATUS', 'MAX_XIEN_UP_STATUS']) if (C[k].length !== 50) bad(`${k} 가 50칸이 아니다`);
// 레벨업 POINT 는 LV 1~최고 레벨에 한 칸씩(lvup 은 최고 레벨에서 거절하므로 그 뒤 칸은 읽히지 않는다. 남는 칸도 두지 않는다)
if (C.BONUS_STATUS_POINT.length !== C.MAX_LEVEL) bad(`BONUS_STATUS_POINT 가 ${C.BONUS_STATUS_POINT.length}칸이다(LV 1~${C.MAX_LEVEL} 의 MAX_LEVEL 칸이어야 한다)`);
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

// 5. 다른 문자 코드로 읽어도 같다
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
    for (const f of ['public/js/const.js', 'public/js/engine.js']) vm.runInContext(decode(fs.readFileSync(path.join(X.REPO, f))), c2, { filename: f });
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
  console.log(`OK: CONST ${Object.keys(CONST).length}개 = data/tables.json 에서 다시 만든 const.js, 얼어 있음, 스테퍼 최댓값 = 표의 상한, 편집 창 한계 = STEPPER_DEFS, 데이터 성질 OK, 문자 코드 ${decoders.map((d) => d[0]).join('/')} 로 읽어도 같음`);
}
