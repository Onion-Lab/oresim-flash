#!/usr/bin/env node
/*
 * 차등 퍼저: 같은 무작위 조작을 원본(tests/harness.js, AS3 를 헤드리스로 실행)과 웹 엔진(web/js/engine.js)에 넣고,
 * 조작마다 다음이 모두 같은지 본다. 처음 어긋난 곳에서 seed, 몇 번째 조작인지, 조작 목록, 다른 칸을 찍고 멈춘다.
 *   - 조작의 결과값({ ok, sound, error }, importLog 의 footer/typeFound/restarted 등)
 *   - 상태 전체: 컨트롤 글자 전부, 버튼 표시, 콤보박스(번호·항목·목록), 드롭다운 색, 보너스 스테퍼,
 *     _xi, _needXien, _bonusPoints, logindex 등 전역, log 배열 전체(센티널과 그 뒤 옛 항목까지), stLog, tmpStLog,
 *     logarea 글 = logPane()(원본이 logOut 을 부르는 곳에서만 바뀌므로 호출 위치까지 확인된다)
 *     stLog/tmpStLog 는 값이 있는 칸만 비교한다(빈 칸·undefined 칸·length 는 원본 논리에서 구별되지 않는다. 엔진의
 *     restoreStLog 는 값이 있는 칸만 옮긴다)
 *   - view() 와 원본 상태에서 따로 계산한 화면 값, exportLog(), guide(), editOpen()
 *   - preview() / previewDash(i) 가 그 뒤 원본이 실제로 한 레벨업·대시와 같은지
 * 무작위 조작 전에 매번 (1) 정해 둔 조작 순서(scripts), (2) 손으로 고른 경계 입력(edgeCorpus), (3) 답을 아는 AS3 의미 확인
 * (knownAnswers: \s 다듬기·parseInt 의 공백), (4) 원본이 몇 초 걸리는 큰 입력(heavyCases)을 새 쌍에서 비교한다.
 * 사용법: node tests/engine-diff.js [seeds=50] [actionsPerSeed=400] [firstSeed=1]
 *         DIFF_VERBOSE=1 이면 조작을 하나씩 찍는다.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const H = require('./harness');
const JA_LOGS = require('./fixtures/ja-era-logs');

const SEEDS = +(process.argv[2] || 50);
const STEPS = +(process.argv[3] || 400);
const FIRST = +(process.argv[4] || 1);
const VERBOSE = !!process.env.DIFF_VERBOSE;

// ---- 엔진 읽기 (브라우저처럼 const.js → engine.js) ----
// ORESIM_ENGINE=경로 를 주면 그 엔진 파일을 쓴다(일부러 고장 낸 엔진으로 이 테스트가 잡아내는지 볼 때)
function loadOresim() {
  const ctx = { console };
  vm.createContext(ctx);
  const files = [path.join(H.REPO, 'web/js/const.js'), process.env.ORESIM_ENGINE || path.join(H.REPO, 'web/js/engine.js')];
  for (const f of files) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  return ctx.Oresim;
}
const Oresim = loadOresim();
// 최고 레벨과 일곱 스탯의 상한은 표에서 읽는다. 상한 둘레의 값(바로 아래, 그 값, 바로 위)도 이것으로 만든다
const MAX_LV = Oresim.CONST.MAX_LEVEL;
const STAT_CAP = Oresim.CONST.MAX_STATUS.slice(0, 7);
const CAP_EDGE = [...new Set([MAX_LV, ...STAT_CAP])].flatMap((m) => [m - 1, m, m + 1]);

// 특수 문자는 코드로 만든다(저장소에 전각·일본어 문자를 두지 않는다)
const ch = (...codes) => String.fromCharCode(...codes);
const FW = { ',': ch(0xff0c), ':': ch(0xff1a), '-': ch(0xff0d) };
const IDEO_SPACE = ch(0x3000);
const NBSP = ch(0xa0);
// AS3 와 JS 가 공백으로 보는지가 갈리는 글자(\s 다듬기, parseInt 의 앞 공백). 웹에서 복사한 로그에 섞이는 것들
const WS_ODD = [0xa0, 0xfeff, 0x1680, 0x202f, 0x200b, 0x2060, 0x3000, 0x0b, 0x0c, 0x2000, 0x200a, 0x2028, 0x2029, 0x205f, 0x85, 0x09].map((c) => ch(c));
const JA_ALLIN = ch(0x6975, 0x632f, 0x308a);   // 일본어판의 몰빵 키워드
const STATS = ['STAB', 'HACK', 'INT', 'DEF', 'MR', 'DEX', 'AGI'];

// ---- mulberry32 (정수 PRNG) ----
function makeRng(seed) {
  let s = seed | 0;
  const rnd = () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ri = (n) => Math.floor(rnd() * n);
  const pick = (a) => a[ri(a.length)];
  const chance = (p) => rnd() < p;
  return { rnd, ri, pick, chance };
}

// ---- 비교 ----
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const show = (v) => {
  if (typeof v === 'string') return JSON.stringify(v.length > 80 ? v.slice(0, 80) + '…' : v);
  if (typeof v === 'number' && Object.is(v, -0)) return '-0';
  if (Array.isArray(v)) return `[array(${v.length})]`;
  if (isObj(v)) return '{…}';
  return String(v);
};
function diff(a, b, p, out, limit = 25) {
  if (out.length >= limit) return out;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) out.push(`${p}.length: 원본 ${a.length} / 엔진 ${b.length}`);
    // 0..length-1 은 직접 본다(빈 칸과 undefined 를 구별한다)
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n && out.length < limit; i++) {
      const ha = i in a, hb = i in b;
      if (ha !== hb) { out.push(`${p}[${i}]: ${ha ? '엔진' : '원본'} 쪽이 빈 칸`); continue; }
      if (!ha) continue;
      const x = a[i], y = b[i];
      if ((x !== null && typeof x === 'object') || (y !== null && typeof y === 'object')) diff(x, y, `${p}[${i}]`, out, limit);
      else if (!Object.is(x, y)) out.push(`${p}[${i}]: 원본 ${show(x)} / 엔진 ${show(y)}`);
    }
    // 인덱스가 아닌 키(stLog["NaN"] 같은 것)와 length 밖의 키. 짧은 배열(log 의 원소 등)에는 생기지 않는다
    if (a.length > 100 || b.length > 100 || a.length !== b.length) {
      const extra = (arr) => Object.keys(arr).filter((k) => !(String(k >>> 0) === k && (k >>> 0) < n));
      const ea = extra(a), eb = extra(b), sb = new Set(eb), sa = new Set(ea);
      for (const k of ea) if (!sb.has(k)) out.push(`${p}[${k}]: 원본에만 있음 ${show(a[k])}`); else diff(a[k], b[k], `${p}[${k}]`, out, limit);
      for (const k of eb) if (!sa.has(k)) out.push(`${p}[${k}]: 엔진에만 있음 ${show(b[k])}`);
    }
    return out;
  }
  if (isObj(a) && isObj(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if (!(k in a)) out.push(`${p}.${k}: 원본에 없음`);
      else if (!(k in b)) out.push(`${p}.${k}: 엔진에 없음`);
      else diff(a[k], b[k], `${p}.${k}`, out, limit);
    }
    return out;
  }
  if (!Object.is(a, b)) out.push(`${p}: 원본 ${show(a)} / 엔진 ${show(b)}`);
  return out;
}
function textDiff(name, a, b) {
  if (a === b) return [];
  const la = a.split('\r'), lb = b.split('\r');
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) return [`${name} ${i + 1}번째 줄: 원본 ${show(la[i])} / 엔진 ${show(lb[i])} (줄 수 ${la.length}/${lb.length})`];
  }
  return [`${name}: 다름`];
}

// 비교용 상태: stLog/tmpStLog 는 값이 있는 칸만 남긴다(빈 칸과 undefined 칸, length 는 원본 논리에서 구별되지 않는다)
function definedOnly(arr) {
  const o = {};
  for (const k of Object.keys(arr)) if (arr[k] !== undefined) o[k] = arr[k];
  return o;
}
function normState(st) {
  return Object.assign({}, st, { stLog: definedOnly(st.stLog), tmpStLog: definedOnly(st.tmpStLog) });
}
const stateDiff = (A, E, label, msgs) => diff(normState(H.rawState(A.S)), normState(E._debugState()), label, msgs);

// 원본이 실제로 한 레벨업·대시를 preview()/previewDash() 의 모양으로(조작 전 view → 조작 뒤 view)
function realPreview(v0, v1, res) {
  if (!res.ok) return null;
  return {
    lv: v1.lv, point: v1.point - v0.point, stats: v1.stats.map((s, k) => s.value - v0.stats[k].value),
    hp: v1.hp.value - v0.hp.value, mp: v1.mp.value - v0.mp.value, sp: v1.sp.value - v0.sp.value, bonus: v1.bonus.achieved > v0.bonus.achieved,
  };
}
function realDash(v0, v1, res, i) {
  if (!res.ok) return null;
  return { value: v1.stats[i].value, lv: v1.lv, point: v1.point, levelUps: v1.lv - v0.lv };
}

// 원본 상태로 따로 계산한 view() (계약서의 모양)
function oracleView(S) {
  const n = (id) => Number(S[id].text);
  const parseInt = H.as3ParseInt;   // 엔진 안의 parseInt 도 AS3 의 것이다
  const lv = parseInt(S.lv.text);
  const levelLog = [];
  for (let i = 0; i < (lv > 0 ? Math.min(lv, 100000) : 0); i++) levelLog.push(typeof S.stLog[i] === 'string' ? S.stLog[i] : '');
  const next = S.log[S.logindex + 1];
  return {
    char: S.charCB.selectedIndex,
    type: S.styleCB.selectedIndex,
    charName: S.charCB.selectedItem ? S.charCB.selectedItem.label : '',
    typeName: S.styleCB.selectedItem ? S.styleCB.selectedItem.label : '',
    chars: S.CHAR_NAME.map((name, c) => ({ name, types: S.STYLE_NAME[c].slice(), startLv: c === 15 ? 200 : 1 })),
    lv: n('lv'),
    maxLv: S.MAX_LEVEL,
    startLv: S.log[0] ? S.log[0][0] : NaN,
    point: n('s11'),
    stats: STATS.map((key, i) => ({
      key, value: n(`s${i}`), cost: n(`p${i}`), nextStepAt: n(`s${i}L`),
      canUp: S[`s${i}up`].visible, canDash: S[`s${i}dup`].visible, atCap: parseInt(S[`s${i}`].text) >= S.MAX_STATUS[i],
    })),
    hp: { value: n('s7'), min: n('s7mi'), max: n('s7mx') },
    mp: { value: n('s8'), min: n('s8mi'), max: n('s8mx') },
    sp: { value: n('s9'), min: n('s9mi'), max: n('s9mx') },
    bonus: { rate: S.bonusNS.value, achieved: n('tbonus'), levelUps: n('tlvup'), effective: S.pbonus.text },
    xien: {
      selected: S.xienCB.selectedItem ? S.xienCB.selectedItem.data : null,
      lines: S.xienList.source.map((it, k) => ({ x: it.data, name: it.label, selectable: S.xienCB.colors[k] !== 0 })),
    },
    canUndo: S.logindex > 0,
    canRedo: !!(next && next[0] > 0),
    actions: S.logindex,
    levelLog,
  };
}

// ---- 로그 만들기 ----
const cov = {};   // 어떤 경우를 지나갔는지 센다
const hit = (k) => { cov[k] = (cov[k] || 0) + 1; };

function makeLogTools(R) {
  const { ri, pick, chance } = R;
  const C = Oresim.CONST;
  const bigNum = () => pick([0, 1, 2, 3, 5, 10, 15, 30, 60, 100, 150, 200, 250, ...CAP_EDGE, 300, 400, -1, -3, 999, 1500]);
  const anyXienName = () => pick(C.XIEN_NAME);
  const statusValues = (n) => Array.from({ length: n }, (_, k) => {
    if (chance(0.03)) return pick(['abc', '', 'NaN', '-5', ' 7 ', '1e3', '0x1A', '12.7']);
    if (k === 0) return 1 + ri(MAX_LV);
    if (k === 1) return pick([0, 9, 10, 12, 13, 26, 30, 35, 36, 49, 60]);
    if (k === 2) return pick([0, 25, 50, 75, 100, 7, 33]);
    if (k < 6) return ri(150);
    if (k < 13) return 1 + ri(STAT_CAP[k - 6]);
    if (k < 26) return ri(12000);
    if (k < 76) return chance(0.8) ? 0 : ri(60);
    return ri(100);
  }).join(', ');
  const JUNK = [
    () => 'LV',
    () => 'LV abc : STAB',
    () => 'LV : STAB',
    () => 'Bonus :',
    () => 'Bonus : abc%',
    () => 'Bonus :75%',
    () => 'Bonus        : ' + pick(['-5%', FW['-'] + '5%', '-0%', FW['-'] + '10%']),
    () => 'Status       : ' + statusValues(78).replace(/^\d+, \d+, \d+/, (m) => m.replace(/\d+$/, pick(['-5', FW['-'] + '5', '-0']))),
    () => 'Bonus        : ' + pick(['7%', '103%', '33%', '-5%', '0%', '100%', '%', '47%', '2.5%']),
    () => 'Xien         : 없는 계열',
    () => 'Xien         : ' + anyXienName() + pick(['', ' 메모', '  ', IDEO_SPACE, NBSP, '\t', ' ' + IDEO_SPACE].concat(WS_ODD)),
    () => 'Xien :' + anyXienName(),
    () => 'Xien         :' + pick(WS_ODD) + anyXienName() + pick(['', pick(WS_ODD)]),
    () => `LV ${pick(WS_ODD)}${bigNum()} - ${pick(['', pick(WS_ODD)])}${bigNum()} : ${pick(STATS)}`,
    () => `LV ${ri(MAX_LV) + 1}       : ${pick(STATS)} * ${pick(WS_ODD)}${pick([2, 3, 9])}`,
    () => 'Bonus        : ' + pick(WS_ODD) + pick([0, 25, 75, 100]) + '%',
    () => 'Status       : ' + statusValues(78).split(', ').map((v, k) => (k < 18 && chance(0.2) ? pick(WS_ODD) + v : v)).join(', '),
    () => 'Status       : 1, 2, 3',
    () => 'Status       : ' + statusValues(78),
    () => 'Status       : ' + statusValues(46),
    () => `LV ${bigNum()} - ${bigNum()} : ${pick(STATS)}`,
    () => `LV ${bigNum()}       : ${pick(STATS)} * ${pick([0, 1, 2, 3, 7, 40, -2, 'x'])}`,
    () => `LV ${bigNum()} - ${bigNum()} : ${pick(STATS)} 몰빵 ${ri(30)}회`,
    () => `LV ${bigNum()} : FOO, ${pick(STATS)}`,
    () => `${pick(STATS)} 몰빵 5회`,
    () => `LV ${ri(MAX_LV) + 1} : ${pick(STATS)}, ${pick(STATS)} * 2, ${pick(STATS)}`,
    () => { const c = ri(C.CHAR_NAME.length); return `${C.CHAR_NAME[c]}/${pick(C.STYLE_NAME[c])} Bonus: 1 / 2 Point: 3`; },
    () => { const c = ri(C.CHAR_NAME.length); return `${C.CHAR_NAME[c]} / ${pick(C.STYLE_NAME[c])}`; },
    () => pick(C.CHAR_NAME),
    () => Array.from({ length: ri(12) }, () => pick(['a', ':', ',', '-', ' ', '/', '*', '%', '1', '9', 'L', 'V', IDEO_SPACE, FW[':'], '몰빵'])).join(''),
  ];
  const OPS = [
    (L) => { if (L.length > 1) L.splice(ri(L.length), 1); },
    (L) => { const i = ri(L.length); L.splice(i, 0, L[i]); },
    (L) => { const i = ri(L.length), j = ri(L.length); const t = L[i]; L[i] = L[j]; L[j] = t; },
    (L) => { const i = ri(L.length); L[i] = L[i].replace(/\d+/, () => String(bigNum())); },
    (L) => { const i = ri(L.length); const p = ri(L[i].length + 1); L[i] = L[i].slice(0, p) + pick([' ', '  ', '\t', IDEO_SPACE, NBSP].concat(WS_ODD)) + L[i].slice(p); },
    (L) => { const i = ri(L.length); L[i] = L[i].replace(/ (-?\d)/, (m, d) => ' ' + pick(WS_ODD) + d); },   // 수 바로 앞(parseInt 의 앞 공백)
    (L) => { const i = ri(L.length); L[i] = L[i].replace(pick([':', ',', '-']), (c) => FW[c]); },
    (L) => { const c = pick([':', ',', '-']); for (let i = 0; i < L.length; i++) L[i] = L[i].split(c).join(FW[c]); },
    (L) => { const i = ri(L.length); L[i] = L[i].slice(0, ri(L[i].length + 1)); },
    (L) => { L.splice(ri(L.length + 1), 0, pick(JUNK)()); },
    (L) => { const i = ri(L.length); L[i] = L[i].replace(/STAB|HACK|INT|DEF|MR|DEX|AGI/, () => pick(STATS.concat(['stab', 'HP', 'POINT', 'Stab']))); },
    (L) => { for (let i = L.length - 1; i >= 0; i--) if (/ Bonus: /.test(L[i]) || /^LV:/.test(L[i])) L.splice(i, 1); },
    (L) => { const c = ri(C.CHAR_NAME.length); for (let i = 0; i < L.length; i++) L[i] = L[i].replace(/^[^ /]+\/[^ ]+ Bonus:/, `${C.CHAR_NAME[c]}/${pick(C.STYLE_NAME[c])} Bonus:`); },
    (L) => { for (let i = 0; i < L.length; i++) L[i] = L[i].replace('몰빵', JA_ALLIN).replace(/(\d+)회/, '$1up'); },
    (L) => { const i = ri(L.length); L[i] = L[i].replace(/ \* (\d+)/, () => ` * ${pick([1, 2, 3, 5, 9, 25, 60, 120])}`); },   // 원본(하네스)이 빨리 끝낼 크기. 큰 수는 heavyCases
    (L) => { const i = ri(L.length); L[i] = L[i].replace(/- +(\d+) :/, () => `- ${bigNum()} :`); },
  ];
  // 사람이 고친 듯한 변경
  const HAND = [
    (L) => { const i = L.findIndex((s) => / \* \d+/.test(s)); if (i >= 0) L[i] = L[i].replace(/ \* (\d+)/, (m, d) => ` * ${+d + 1}`); },
    (L) => { const i = L.findIndex((s) => /^LV +\d+ -/.test(s)); if (i >= 0) L[i] = L[i].replace(/- +(\d+) :/, (m, d) => `- ${Math.min(+d + 1 + ri(5), MAX_LV)} :`); },
    (L) => { L.splice(1 + ri(Math.max(1, L.length - 2)), 0, 'Bonus        : ' + pick([0, 25, 75, 100]) + '%'); },
    (L) => { L.splice(1 + ri(Math.max(1, L.length - 2)), 0, 'Xien         : ' + anyXienName()); },
    (L) => { const i = L.findIndex((s) => /^LV.*: [A-Z]/.test(s)); if (i >= 0) L[i] = L[i].replace(/: ([A-Z]+)/, () => `: ${pick(STATS)}`); },
    (L) => { const f = L.findIndex((s) => / Bonus: /.test(s)); const lvs = L.map((s) => /^LV +(\d+)(?: - +(\d+))? :/.exec(s)).filter(Boolean); const last = lvs.length ? +(lvs[lvs.length - 1][2] || lvs[lvs.length - 1][1]) : 1; if (f >= 0) L.splice(f, 0, `LV ${Math.min(last + 1, MAX_LV)}       : ${pick(STATS)} * 2, ${pick(STATS)}`); },
  ];
  const garble = (text, n) => { const L = text.split('\r'); for (let k = 0; k < n; k++) pick(OPS)(L); return L.join(pick(['\r', '\r', '\r', '\n', '\r\n'])); };
  const hand = (text) => { const L = text.split('\r'); const k = 1 + ri(3); for (let j = 0; j < k; j++) pick(HAND)(L); return L.join('\r'); };
  const footerless = (text) => text.split('\r').filter((s) => !/ Bonus: /.test(s) && !/^LV:/.test(s)).join('\r');
  const status46 = (S) => {
    const t = (id) => parseInt(S[id].text);
    const vals = [t('lv'), S.xienCB.selectedItem.data, S.bonusNS.value, t('tbonus'), t('tlvup'), S._bonusPoints,
      t('s0'), t('s1'), t('s2'), t('s3'), t('s4'), t('s5'), t('s6'), t('s7'), t('s8'), t('s9'), 0, t('s11'),
      t('s7mi'), t('s8mi'), t('s9mi'), 0, t('s7mx'), t('s8mx'), t('s9mx'), 0].concat(S._xi.slice(0, 20));
    const lv = t('lv');
    const L = ['Status       : ' + vals.join(', ')];
    if (chance(0.5)) L.push(`LV ${lv}       : ${pick(STATS)}`);
    for (let k = 0; k < ri(4); k++) L.push(`LV ${lv + 1 + k}       : ${pick(STATS)}, ${pick(STATS)}`);
    if (chance(0.7)) L.push(`${S.charCB.selectedItem.label}/${S.styleCB.selectedItem.label} Bonus: 0 / 0 Point: 0`);
    return L.join('\r');
  };
  const statusLv = (S) => {
    const n = pick([78, 78, 46]);
    const vals = statusValues(n).split(', ');
    const lv0 = pick([1, 2, 10, 50, 120, 199, 200, 250, MAX_LV - 1, MAX_LV]);
    vals[0] = String(lv0);
    vals[2] = String(pick([0, 5, 25, 50, 75, 100, 7, 33, 103, -5, 'abc', '', 2.5, 98]));
    if (n === 78) vals[76] = String(pick([50, 7, 33, 100, 0, 'x']));
    const L = ['Status       : ' + vals.join(', ')];
    if (chance(0.5)) L.push(`LV ${lv0}       : ${pick(STATS)}`);
    let lv = lv0;
    for (let k = 0; k < 1 + ri(6); k++) {
      const a = lv + 1, b = lv + 1 + ri(4);
      const r = ri(5);
      if (r === 0) L.push(`LV ${a} - ${b} : ${pick(STATS)} 몰빵 ${ri(20)}회`);
      else if (r === 1) L.push(`Bonus        : ${pick([0, 25, 75, 100, 7, 33])}%`);
      else if (r === 2) L.push(`Xien         : ${anyXienName()}`);
      else L.push(`LV ${a}${b > a ? ` - ${b}` : '      '} : ${pick(STATS)} * ${1 + ri(3)}, ${pick(STATS)}`);
      lv = b;
    }
    if (chance(0.6)) L.push(`${S.charCB.selectedItem.label}/${S.styleCB.selectedItem.label} Bonus: 0 / 0 Point: 0`);
    return L.join('\r');
  };
  return { garble, hand, footerless, status46, statusLv, JUNK };
}

// ---- 무작위 스탯 편집 값 ----
function editValues(R, ed, C, charIndex) {
  const { ri, pick, chance } = R;
  // 그 칸의 상한(cap) 바로 위·반올림하면 넘는 값, 범위 밖, 소수, 글자
  const odd = (cap) => pick([0, -5, cap + 1, 300, 99999, 7.6, 2.5, '12', ' 40 ', 'abc', '', 'NaN', '1e2', null, -0.4, cap + 0.5]);
  const v = {};
  const k = ri(5);
  let lv = ed.lv;
  if (k === 0) { v.lv = ed.lv; hit('edit.inPlace'); }
  else if (k === 1) { v.lv = lv = Math.min(MAX_LV, ed.lv + 1 + ri(80)); hit('edit.higherLv'); }
  else if (k === 2) { v.lv = lv = 1; hit('edit.lv1'); }
  else if (k === 3) { v.lv = lv = pick([MAX_LV - 5, MAX_LV - 2, MAX_LV - 1, MAX_LV, 1 + ri(MAX_LV)]); hit('edit.anyLv'); }
  else { v.lv = odd(MAX_LV); hit('edit.oddLv'); }
  if (chance(0.85)) {
    v.stats = ed.stats.map((s, i) => {
      const r = R.rnd();
      if (r < 0.35) return s;
      if (r < 0.6) return 1 + ri(200);
      if (r < 0.75) return pick([STAT_CAP[i] - 5, STAT_CAP[i] - 2, STAT_CAP[i] - 1, STAT_CAP[i]]);
      if (r < 0.8) return undefined;
      return odd(STAT_CAP[i]);
    });
  }
  if (chance(0.4)) v.hp = chance(0.7) ? 1 + ri(22000) : pick([0, 22001, 50000, 'x', 3.5]);
  if (chance(0.3)) v.mp = chance(0.7) ? 1 + ri(7000) : pick([0, 7001, 'x']);
  if (chance(0.3)) v.sp = chance(0.7) ? 1 + ri(12000) : pick([0, 12001, '']);
  if (chance(0.7)) v.point = chance(0.6) ? ri(80) : pick([0, 500, 5000, 9999, 10000, 123456, -3, 'abc', '', 12.5]);
  if (chance(0.6)) {
    const L = typeof lv === 'number' && lv >= 1 ? Math.min(Math.round(lv), MAX_LV) : 1;
    v.lines = ed.lines.map((ln) => {
      if (chance(0.5)) return { x: ln.x };
      const row = C.MAX_XIEN[charIndex][ln.x];
      const cap = row[Math.min(L, row.length) - 1];
      const r = R.rnd();
      if (r < 0.6) return { x: ln.x, value: ri(cap + 1) };
      if (r < 0.75) return { x: ln.x, value: String(ri(cap + 2)) };
      return { x: ln.x, value: pick(['abc', '', '-3', '2.5', '1e3', ' 7', 1e21, -1, 99, cap + 5, '0x10']) };
    });
  }
  return v;
}

// ---- 손으로 고른 경계 입력: 실행할 때마다 새 원본/엔진 한 쌍씩에 읽혀 비교한다 ----
function edgeCorpus() {
  const C = Oresim.CONST;
  const z50 = Array(50).fill(0);
  const status = (lv, bonus, tail) => 'Status       : ' + [lv, 10, bonus, 0, 0, 0, 4, 3, 1, 2, 1, 2, 2, 220, 50, 1000, 0, 5, 220, 50, 1000, 0, 220, 50, 1000, 0].concat(z50, tail || [50, 1]).join(', ');
  const foot = (c, s) => `${C.CHAR_NAME[c]}/${C.STYLE_NAME[c][s]} Bonus: 0 / 0 Point: 0`;
  const x = (i) => C.XIEN_NAME[i];
  return [
    ['빈 글', ''],
    ['줄바꿈만', '\r\n\r\n'],
    ['푸터만', foot(3, 1)],
    ['푸터: 없는 타입', `${C.CHAR_NAME[3]}/없는타입 Bonus: 0 / 0 Point: 0`],
    ['푸터: 타입 한 개 캐릭터', foot(14, 0)],
    ['로아미니 로그', ['LV 200       :', 'Bonus        : 50%', 'Xien         : ' + x(35), 'LV 201 - 203 : INT', 'LV 204       : DEX * 2, INT', foot(15, 0)].join('\r')],
    ['보너스 음수(전각 하이픈)', ['LV   1       :', 'Bonus        : ' + FW['-'] + '5%', 'LV   2 -  10 : STAB 몰빵 9회', foot(0, 0)].join('\r')],
    ['보너스 음수', ['LV   1       :', 'Bonus        : -5%', 'LV   2 -   4 : HACK', foot(0, 1)].join('\r')],
    ['보너스 7%·103%', ['LV   1       :', 'Bonus        : 7%', 'LV   2 -  20 : STAB', 'Bonus        : 103%', 'LV  21 -  30 : DEX', foot(4, 0)].join('\r')],
    ['Bonus 줄 공백 없음 (예외)', ['LV   1       :', 'Bonus :75%', 'LV   2 -  20 : STAB', foot(1, 0)].join('\r')],
    ['Bonus 값 없음 (예외)', ['LV   1       :', 'Bonus        :', 'LV   2       : AGI', foot(1, 1)].join('\r')],
    ['전각 쉼표·콜론·하이픈', ['LV   1       ' + FW[':'], 'LV   2 ' + FW['-'] + '  5 ' + FW[':'] + ' STAB' + FW[','] + ' DEX * 2', foot(6, 2)].join('\r')],
    ['Xien 뒤 전각 공백', ['LV   1       :', 'Xien         : ' + x(9) + IDEO_SPACE, 'LV   2 -   5 : STAB', foot(0, 0)].join('\r')],
    ['Xien 뒤 NBSP·탭', ['LV   1       :', 'Xien         : ' + x(8) + NBSP, 'LV   2       : DEX', 'Xien         : ' + x(9) + '\t', 'LV   3       : STAB', foot(0, 2)].join('\r')],
    ['Xien 메모', ['LV   1       :', 'Xien         : ' + x(9) + ' 메모입니다', 'LV   2 -   9 : HACK 몰빵 9회', foot(0, 1)].join('\r')],   // 검계: 루시안/베기형의 기본 계열이 아니고 LV1 에서 고를 수 있다
    ['Xien 고를 수 없는 계열', ['LV   1       :', 'Xien         : ' + x(1), 'LV   2 -   3 : INT', foot(0, 0)].join('\r')],
    ['Status 78칸 + 같은 레벨 투자', [status(120, 50), 'LV 120       : STAB * 3', 'Bonus        : 75%', 'LV 121       : STAB', foot(0, 0)].join('\r')],
    ['Status 보너스 37 뒤 레벨업', [status(30, 37), 'LV  31 -  40 : DEX', foot(0, 0)].join('\r')],
    ['Status 보너스 abc', [status(30, 'abc'), 'LV  31 -  33 : DEX', foot(2, 0)].join('\r')],
    ['Status 46칸', ['Status       : ' + [60, 10, 75, 10, 59, 30, 50, 30, 1, 20, 1, 20, 10, 800, 200, 3000, 0, 4, 780, 190, 2900, 0, 820, 210, 3100, 0].concat(Array(20).fill(0)).join(', '), 'LV  61       : STAB', foot(0, 0)].join('\r')],
    ['Status LV 1 편집', [status(1, 50), 'LV   1       : STAB', 'LV   2 -   5 : HACK', foot(0, 1)].join('\r')],
    ['Status 항목 수 틀림', ['Status       : 1, 2, 3', 'LV   2       : STAB'].join('\r')],
    ['Status LV 0', [status(0, 50), 'LV   1       : STAB', foot(0, 0)].join('\r')],
    ['Status LV -3', [status(-3, 50), 'LV  -2 -   2 : STAB', foot(0, 0)].join('\r')],
    ['Status LV 300', [status(300, 50), 'LV 301       : STAB', foot(0, 0)].join('\r')],
    ['푸터 없는 로그', ['LV   1       :', 'LV   2 -   9 : STAB 몰빵 9회', 'LV  10       : DEX'].join('\r')],
    ['읽을 줄 없음', ['안녕하세요', 'LV', 'LV abc : STAB', 'Bonus : 75%'].join('\r')],
    ['LV 범위 거꾸로', ['LV   1       :', 'LV   9 -   3 : STAB', foot(0, 0)].join('\r')],
    ['STAB * 0 / * -2 / * x', ['LV   1       :', 'LV   2       : STAB * 0, DEX * -2, AGI * x', foot(0, 0)].join('\r')],
    ['몰빵 범위 끝 없음', ['LV   1       :', 'LV   2       : STAB 몰빵', foot(0, 0)].join('\r')],
    ['일본어판 몰빵', ['LV   1       :', 'LV   2 -  20 : STAB ' + JA_ALLIN + ' 28up', foot(0, 0)].join('\r')],
    ['\\n 줄바꿈', ['LV   1       :', 'LV   2 -   9 : STAB 몰빵 9회', foot(0, 0)].join('\n')],
    ['\\r\\n 줄바꿈', ['LV   1       :', 'LV   2 -   9 : STAB 몰빵 9회', foot(0, 0)].join('\r\n')],
    ['줄 머리 공백·탭', ['   LV   1       :', '\tLV   2 -   9 : STAB', '  ' + foot(0, 0)].join('\r')],
    ['최고 레벨 넘는 범위', ['LV   1       :', 'LV   2 - 400 : STAB', foot(5, 0)].join('\r')],
    // 시작 레벨(레벨업하지 않는 레벨)에서 시작하는 범위: 첫 바퀴에 아무것도 바뀌지 않아도 다음 레벨부터는 레벨업한다
    ['시작 레벨부터 범위(포인트 없음)', ['LV   1 -  20 : STAB', foot(0, 0)].join('\r')],
    ['로아미니 시작 레벨부터 범위', ['LV 200 - 210 : INT * 3', foot(15, 0)].join('\r')],
    ['편집 레벨부터 범위(포인트 없음)', [status(120, 50).replace(/^(Status {7}: (?:[^,]+, ){17})5,/, '$10,'), 'LV 120 - 126 : STAB * 9, DEX', foot(0, 0)].join('\r')],
    ['편집 레벨부터 몰빵(포인트 없음)', [status(120, 50).replace(/^(Status {7}: (?:[^,]+, ){17})5,/, '$10,'), 'LV 120 - 126 : HACK 몰빵 3회', foot(0, 0)].join('\r')],
  ];
}

// ---- 답을 아는 AS3 의미 확인: 원본(하네스)과 엔진이 서로 같을 뿐 아니라 AS3 의 답과 같아야 한다 ----
// [이름, 읽을 글, 같은 결과가 나와야 하는 글 또는 검사 함수(view → 틀리면 문자열)]
// \s 다듬기(C5): U+00A0 U+200B U+2060 U+3000 U+FEFF 와 \t \n \f \r 공백은 떼고, \v U+0085 U+1680 U+2000 U+2028 U+202F U+205F 는 떼지 않는다.
// parseInt(C10): 앞의 U+00A0 U+FEFF U+1680 U+202F 는 건너뛰지 않고(수가 아님), U+200B \v U+2000~U+200A U+2028 U+205F U+3000 은 건너뛴다.
// 출처: avmplus 의 pcre_chartables.cpp / pcre_exec.cpp / pcre_config.cpp, MathUtils.cpp(skipSpaces, parseInt), Toplevel.cpp.
function knownAnswers() {
  const C = Oresim.CONST;
  const foot = (c, s) => `${C.CHAR_NAME[c]}/${C.STYLE_NAME[c][s]} Bonus: 0 / 0 Point: 0`;
  const X9 = C.XIEN_NAME[9];   // 루시안/물리복합(처음 계열 10)이 LV1 에서 고를 수 있는 계열
  const xienLog = (line) => ['LV   1       :'].concat(line === null ? [] : ['Xien         :' + line], ['LV   2 -   5 : STAB', foot(0, 0)]).join('\r');
  const kept = (tail) => [`Xien 뒤 U+${tail.charCodeAt(0).toString(16).toUpperCase()} 떼기`, xienLog(' ' + X9 + tail), xienLog(' ' + X9)];
  const notKept = (tail) => [`Xien 뒤 U+${tail.charCodeAt(0).toString(16).toUpperCase()} 안 떼기(줄 무시)`, xienLog(' ' + X9 + tail), xienLog(null)];
  const lvLog = (a) => ['LV   1       :', 'LV   2 -   9 : STAB'].concat(a, [foot(0, 0)]).join('\r');
  const z50 = Array(50).fill(0);
  const status = (vals) => 'Status       : ' + vals.join(', ');
  const sv = (lv, point) => [lv, 10, 50, 0, 0, 0, 4, 3, 1, 2, 1, 2, 2, 220, 50, 1000, 0, point, 220, 50, 1000, 0, 220, 50, 1000, 0].concat(z50, [50, 1]);
  return [
    ...[0xa0, 0x200b, 0x2060, 0x3000, 0xfeff, 0x09, 0x0c].map((c) => kept(ch(c))),
    ...[0x0b, 0x85, 0x1680, 0x2000, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f].map((c) => notKept(ch(c))),
    ['Xien 앞 U+00A0·U+3000 떼기', xienLog(ch(0xa0, 0x3000) + X9), xienLog(' ' + X9)],
    ['LV 앞 U+00A0 (수가 아님)', lvLog(['LV ' + ch(0xa0) + '10 - ' + ch(0xa0) + '12 : HACK']), lvLog([])],
    ['LV 앞 U+FEFF (수가 아님)', lvLog(['LV ' + ch(0xfeff) + '10       : HACK']), lvLog([])],
    ['LV 앞 U+1680·U+202F (수가 아님)', lvLog(['LV ' + ch(0x1680) + '10 - ' + ch(0x202f) + '12 : HACK']), lvLog([])],
    ['LV 앞 U+200B (건너뜀)', lvLog(['LV ' + ch(0x200b) + '10 - ' + ch(0x200b) + '12 : HACK']), lvLog(['LV  10 -  12 : HACK'])],
    ['LV 앞 \\v·U+3000·U+2028·U+205F (건너뜀)', lvLog(['LV ' + ch(0x0b, 0x3000) + '10 - ' + ch(0x2028, 0x205f) + '12 : HACK']), lvLog(['LV  10 -  12 : HACK'])],
    ['Bonus 앞 U+00A0 (수가 아님)', lvLog(['Bonus        : ' + ch(0xa0) + '75%', 'LV  10 -  20 : HACK']), lvLog(['LV  10 -  20 : HACK'])],
    ['Bonus 앞 U+200B (건너뜀)', lvLog(['Bonus        : ' + ch(0x200b) + '75%', 'LV  10 -  20 : HACK']), lvLog(['Bonus        : 75%', 'LV  10 -  20 : HACK'])],
    ['* 앞 U+00A0 (수가 아님)', lvLog(['LV  10 -  20 : HACK * ' + ch(0xa0) + '3']), lvLog(['LV  10 -  20 : HACK'])],
    ['* 앞 U+2000 (건너뜀)', lvLog(['LV  10 -  20 : HACK * ' + ch(0x2000) + '3']), lvLog(['LV  10 -  20 : HACK * 3'])],
    ['푸터 없는 로그의 LV 앞 U+00A0 (읽을 줄 없음)', 'LV ' + ch(0xa0) + '1       :\rLV ' + ch(0xa0) + '2 -   5 : STAB', ''],
    ['푸터 없는 로그의 LV 앞 U+200B (읽음)', 'LV ' + ch(0x200b) + '1       :\rLV ' + ch(0x200b) + '2 -   5 : STAB', 'LV   1       :\rLV   2 -   5 : STAB'],
    ['Status 첫 값 앞 U+00A0 (LV 가 수가 아님)', [status(sv(ch(0xa0) + '120', 30)), foot(0, 0)].join('\r'), [status(sv('abc', 30)), foot(0, 0)].join('\r')],
    ['Status 첫 값 앞 U+200B (건너뜀)', [status(sv(ch(0x200b) + '120', 30)), foot(0, 0)].join('\r'), [status(sv('120', 30)), foot(0, 0)].join('\r')],
    // 10진수는 자릿수마다 result * 10 + v 로 쌓는다: 12345678901234567890 → 12345678901234570000 (JS 의 parseInt 는 …567000)
    ['parseInt 20자리', [status(sv(120, '12345678901234567890')), foot(0, 0)].join('\r'),
      (v) => (v.point === 12345678901234570000 ? null : `point ${v.point}, 기대 12345678901234570000`)],
    // 16진수 2^53 이상(MathUtils 의 반올림 보정): 0x20000000000003 → 2^53 + 4
    ['parseInt 16진수 보정', [status(sv(120, '0x20000000000003')), foot(0, 0)].join('\r'),
      (v) => (v.point === 9007199254740996 ? null : `point ${v.point}, 기대 9007199254740996`)],
  ];
}

// ---- 원본(하네스)이 몇 초 걸려 끝내는 큰 입력: 엔진이 끝까지 같은 결과를 내는지(반복 건너뛰기가 정확한지) ----
// [이름, 읽을 글, 그 뒤 조작들]
function heavyCases() {
  const C = Oresim.CONST;
  const foot = `${C.CHAR_NAME[0]}/${C.STYLE_NAME[0][0]} Bonus: 0 / 0 Point: 0`;
  const z50 = Array(50).fill(0);
  const status = (lv, point) => 'Status       : ' + [lv, 10, 50, 0, 0, 0, 40, 30, 10, 20, 10, 20, 20, 2200, 500, 1000, 0, point, 2200, 500, 1000, 0, 2200, 500, 1000, 0].concat(z50, [50, 1]).join(', ');
  const after = [['levelUp'], ['statUp', 0], ['dash', 5], ['undo', true], ['undo'], ['redo', true], ['statUp', 3]];
  return [
    [`LV 2 - ${MAX_LV} : STAB * 2000`, ['LV   1       :', `LV   2 - ${MAX_LV} : STAB * 2000`, foot].join('\r'), after],
    ['LV 2 - 160000 : STAB', ['LV   1       :', 'LV   2 - 160000 : STAB', foot].join('\r'), after],
    [`${MAX_LV - 1}줄 STAB * 600, DEX * 600`, ['LV   1       :'].concat(Array.from({ length: MAX_LV - 1 }, (_, k) => `LV ${k + 2}       : STAB * 600, DEX * 600`), [foot]).join('\r'), after],
    ['LV 2 : STAB * 300001', ['LV   1       :', 'LV   2       : STAB * 300001', foot].join('\r'), after],
    ['몰빵 LV 2 - 300002 뒤 AGI 줄', ['LV   1       :', 'LV   2 - 300002 : STAB 몰빵 1회', 'LV 300003       : AGI', foot].join('\r'), after],
    ['STAB, HACK LV 2 - 160001 뒤 Bonus·AGI 줄', ['LV   1       :', 'LV   2 - 160001 : STAB, HACK', 'Bonus        : 100%', 'LV 160002       : AGI', foot].join('\r'), after],
    ['Status LV 400000 + 되돌리기', [status(400000, 9999), 'LV 400000       : STAB * 2', foot].join('\r'), [['undo'], ['statUp', 3], ['undo', true], ['redo'], ['levelUp'], ['statUp', 1]]],
    ['Status LV 400000 POINT 500 + 되돌리기', [status(400000, 500), 'LV 400000       : STAB', foot].join('\r'), [['undo'], ['statUp', 3], ['guide']]],
  ];
}

// ---- 정해 둔 조작 순서: 무작위로는 드물게만 닿는 길(새 쌍에서 조작마다 비교) ----
function scripts() {
  const C = Oresim.CONST;
  const allXien = ['LV 200       :'].concat(C.XIEN_NAME.map((n) => 'Xien         : ' + n)).join('\r');
  const xs = (c) => { const out = []; C.MAX_XIEN[c].forEach((row, x) => { if (row[row.length - 1] > 0) out.push(x); }); return out; };
  return [
    // 드롭다운을 연 뒤(tmpx = 큰 번호) 계열이 적은 캐릭터로 바꾸고, 고를 수 없는 Xien 줄을 읽는다 → tmpx 를 마지막 항목으로 줄인다
    // (티치엘/전투형은 처음 계열이 7개 중 마지막. 같은 계열을 다시 고르면 드롭다운만 열린다 → tmpx = 6)
    ['tmpx 줄이기(로아미니)', [['setChar', 5], ['setType', 2], ['setXien', xs(5)[6]], ['setChar', 15], ['importLog', allXien], ['levelUp'], ['statUp', 2]]],
    ['tmpx 줄이기(벤야)', [['setChar', 5], ['setType', 2], ['setXien', xs(5)[6]], ['setChar', 14], ['importLog', 'LV   1       :\rXien         : ' + C.XIEN_NAME[0] + '\rLV   2       : STAB'], ['levelUp'], ['dash', 0]]],
    // 같은 캐릭터·타입을 다시 고르면 아무 일도 없다
    ['같은 항목 다시 고르기', [['levelUp'], ['statUp', 0], ['setChar', 0], ['setType', 0], ['setXien', 10], ['levelUp']]],
    // 로그 읽기 안의 Bonus 줄 값(반올림 전)으로 레벨업하고, 그 로그로 되돌리기
    ['읽기 중 보너스 33%', [['importLog', 'LV   1       :\rBonus        : 33%\rLV   2 -  12 : STAB\r' + C.CHAR_NAME[0] + '/' + C.STYLE_NAME[0][0] + ' Bonus: 0 / 0 Point: 0'], ['undo'], ['undo', true], ['redo', true], ['levelUp'], ['setBonus', 50], ['levelUp']]],
    // 스탯 편집 지점으로 되돌리기, 편집 레벨에서 투자
    ['편집 지점으로 되돌리기', [['levelUp'], ['levelUp'], ['editCommit', { lv: 40, stats: [30, 20, 10, 10, 10, 10, 10], point: 30 }], ['statUp', 0], ['statUp', 0], ['undo'], ['undo'], ['undo'], ['undo', true], ['redo', true], ['levelUp'], ['guide']]],
    ['LV1 편집 뒤 투자', [['editCommit', { lv: 1, point: 20 }], ['statUp', 1], ['statUp', 1], ['levelUp'], ['statUp', 6], ['undo', true], ['guide']]],
    // 최고 레벨: 대시가 포인트 없이는 아무것도 못 한다(소리는 난다)
    ['최고 레벨 대시', [['editCommit', { lv: MAX_LV, point: 0 }], ['dash', 0], ['statUp', 0], ['levelUp'], ['editCommit', { lv: MAX_LV - 1, point: 9999 }], ['dash', 3], ['levelUp'], ['dash', 3]]],
    // 스탯 상한
    ['스탯 상한', [['editCommit', { lv: 200, stats: [STAT_CAP[0] - 1, STAT_CAP[1], STAT_CAP[2] - 2, 1, 1, 1, 1], point: 9999 }], ['statUp', 0], ['statUp', 0], ['statUp', 1], ['dash', 2], ['dash', 2], ['levelUp'], ['guide']]],
    // POINT 9999 넘김 → 편집 창을 그대로 적용하면 9999 로 줄어든다(원본 그대로)
    ['POINT 9999 넘김', [['editCommit', { lv: 100, point: 9999 }], ['levelUp'], ['levelUp'], ['editOpen'], ['editCommit', {}], ['guide']]],
    // 로아미니 처음 대시
    ['로아미니 대시', [['setChar', 15], ['dash', 2], ['dash', 2], ['undo', true], ['undo', true], ['redo'], ['guide']]],
    // LV 가 수가 아닌 Status 줄을 읽다가 예외로 멈춰(updateStatus 를 거르고) 비용 글자가 예전 값인 채 대시: 원본 stdup 은
    // 반복을 한 번도 돌지 않는다(비용 단계 p 가 NaN) → ok: false
    ['LV 가 수가 아닌 채 대시', [['importLog', 'Status       : ' + ['abc', 10, 50, 0, 0, 0, 4, 3, 1, 2, 1, 2, 2, 220, 50, 1000, 0, 9999, 220, 50, 1000, 0, 220, 50, 1000, 0].concat(Array(50).fill(0), [50, 1]).join(', ') + '\rBonus :75%'],
      ['dash', 0], ['dash', 3], ['statUp', 0], ['levelUp'], ['dash', 3], ['undo'], ['guide']]],
  ];
}

// ---- 퍼저 본체 ----
function runSeed(seed, steps) {
  const R = makeRng(seed);
  const { ri, pick, chance, rnd } = R;
  const C = Oresim.CONST;
  const T = makeLogTools(R);
  let A = H.createOracle();
  let E = Oresim.createEngine();
  const trace = [];
  const pool = [];   // 앞에서 내보낸 로그들(다른 상태에 읽힌다)
  let compared = 0;

  const fail = (step, msgs) => {
    console.log(`\n어긋남: seed ${seed}, ${step}번째 조작 뒤`);
    console.log(`  조작 목록(${trace.length}): ${trace.join(' ')}`);
    for (const m of msgs) console.log('  - ' + m);
    if (A.lastError) console.log('  원본 마지막 예외: ' + String(A.lastError && A.lastError.stack || A.lastError).split('\n').slice(0, 3).join(' | '));
    process.exit(1);
  };
  const check = (step, label, ra, re) => {
    compared++;
    let msgs = [];
    if (ra !== undefined || re !== undefined) diff(ra, re, `${label}() 결과`, msgs);
    stateDiff(A, E, 'state', msgs);
    if (!msgs.length) diff(oracleView(A.S), E.view(), 'view', msgs);
    if (!msgs.length) {
      const la = A.exportLog(), le = E.exportLog();
      msgs = msgs.concat(textDiff('exportLog', la, le));
      if (!msgs.length && chance(0.2)) { if (pool.length > 40) pool.shift(); pool.push(la); }
    }
    if (!msgs.length) {
      const ga = A.guide(), ge = E.guide();
      msgs = msgs.concat(textDiff('guide', ga, ge));
      if (ga) hit('guide.nonEmpty'); else hit('guide.empty');
    }
    if (msgs.length) fail(step, msgs);
    if (VERBOSE) console.log(`seed ${seed} #${step} ${label} lv=${A.S.lv.text} li=${A.S.logindex}`);
  };
  const both = (step, label, fn) => {
    trace.push(label);
    const ra = fn(A), re = fn(E);
    check(step, label, ra, re);
    return ra;
  };

  check(0, 'init');
  // 처음 캐릭터: 가끔 로아미니로 시작
  {
    const c = seed % 7 === 0 ? 15 : ri(C.CHAR_NAME.length);
    both(0, `C${c}`, (X) => X.setChar(c));
    const s = ri(C.STYLE_NAME[c].length);
    both(0, `T${s}`, (X) => X.setType(s));
  }
  const focus = ri(7);
  for (let step = 1; step <= steps; step++) {
    const S = A.S;
    const r = rnd() * 100;
    const lv = parseInt(S.lv.text);
    if (r < 22) {
      const v0 = oracleView(A.S), pv = E.preview();
      const res = both(step, 'L', (X) => X.levelUp());
      const pd = diff(realPreview(v0, oracleView(A.S), res), pv, 'preview() / 원본의 실제 레벨업', []);
      if (pd.length) fail(step, pd);
      hit(res.ok ? 'levelUp.ok' : 'levelUp.refused');
      if (lv >= MAX_LV || parseInt(S.lv.text) >= MAX_LV) hit('reached.maxLevel');
    } else if (r < 50) {
      const i = chance(0.4) ? focus : ri(7);
      const res = both(step, `S${i}`, (X) => X.statUp(i));
      hit(res.ok ? 'statUp.ok' : (parseInt(S[`s${i}`].text) >= STAT_CAP[i] ? 'statUp.refused.cap' : 'statUp.refused.point'));
    } else if (r < 56) {
      const i = chance(0.4) ? focus : ri(7);
      const v0 = oracleView(A.S), pd0 = E.previewDash(i);
      const res = both(step, `D${i}`, (X) => X.dash(i));
      const pd = diff(realDash(v0, oracleView(A.S), res, i), pd0, `previewDash(${i}) / 원본의 실제 대시`, []);
      if (pd.length) fail(step, pd);
      hit(res.ok ? 'dash.ok' : (parseInt(A.S[`s${i}`].text) >= STAT_CAP[i] ? 'dash.refused.cap' : 'dash.refused.noop'));
      if (pd0) hit(pd0.levelUps > 0 ? 'previewDash.levelUps' : 'previewDash.noLevelUp');
    } else if (r < 60) {
      const by = chance(0.3);
      const res = both(step, by ? 'U*' : 'U', (X) => X.undo(by));
      hit(`undo${by ? '.byLevel' : ''}.${res.ok ? 'ok' : 'refused'}`);
    } else if (r < 63) {
      const by = chance(0.3);
      const res = both(step, by ? 'R*' : 'R', (X) => X.redo(by));
      hit(`redo${by ? '.byLevel' : ''}.${res.ok ? 'ok' : 'refused'}`);
    } else if (r < 64) {
      // ←×k 뒤 →×k
      const k = 1 + ri(6), by = chance(0.3);
      for (let j = 0; j < k; j++) both(step, by ? 'U*' : 'U', (X) => X.undo(by));
      for (let j = 0; j < k; j++) both(step, by ? 'R*' : 'R', (X) => X.redo(by));
      hit('undoRun');
    } else if (r < 67) {
      const v = pick([0, 5, 25, 50, 75, 100, 7, 103, -5, 2.5, 47.5, 52.5, NaN, '35', '', 'abc', 97.4, 1000]);
      both(step, `B${String(v)}`, (X) => X.setBonus(v));
      hit(typeof v === 'number' && v % 5 === 0 && v >= 0 && v <= 100 ? 'bonus.plain' : 'bonus.clampOrOdd');
    } else if (r < 71) {
      const list = S.xienList.source;
      const x = list[ri(list.length)].data;
      const sel = S.xienCB.colors[list.findIndex((it) => it.data === x)] !== 0;
      const res = both(step, `X${x}`, (X) => X.setXien(x));
      hit(res.ok ? 'xien.accepted' : 'xien.refused');
      hit(sel ? 'xien.selectableLine' : 'xien.blackLine');
    } else if (r < 72) {
      const c = chance(0.25) ? 15 : ri(C.CHAR_NAME.length);
      both(step, `C${c}`, (X) => X.setChar(c));
      hit(c === 15 ? 'char.roamini' : 'char.other');
    } else if (r < 73) {
      const s = ri(4);
      both(step, `T${s}`, (X) => X.setType(s));
      hit('type');
    } else if (r < 73.7) {
      both(step, 'RESET', (X) => X.reset());
      hit('reset');
    } else if (r < 76.2) {
      const ed = E.editOpen();
      const v = editValues(R, ed, C, S.charCB.selectedIndex);
      both(step, `EDIT${JSON.stringify(v)}`, (X) => X.editCommit(v));
    } else if (r < 77) {
      both(step, 'OPEN', (X) => X.editOpen());
      hit('editOpen');
    } else if (r < 79) {
      const text = A.exportLog();
      both(step, 'RT', (X) => X.importLog(text));
      hit('roundtrip.same');
    } else if (r < 79.8) {
      // 다른 캐릭터를 고른 새 엔진에 읽기
      const text = A.exportLog();
      const A2 = H.createOracle(), E2 = Oresim.createEngine();
      const c2 = pick([...Array(C.CHAR_NAME.length).keys()].filter((c) => c !== S.charCB.selectedIndex));
      const s2 = ri(C.STYLE_NAME[c2].length);
      for (const X of [A2, E2]) { X.setChar(c2); X.setType(s2); }
      A = A2; E = E2;
      trace.push(`FRESH(C${c2},T${s2})`);
      check(step, 'fresh');
      both(step, 'RTF', (X) => X.importLog(text));
      hit('roundtrip.freshOtherChar');
    } else if (r < 83) {
      let text, kind;
      const k = ri(11);
      const cur = A.exportLog();
      if (k === 0) { kind = 'garbled'; text = T.garble(cur, 1 + ri(4)); }
      else if (k === 1) { kind = 'hand'; text = T.hand(cur); }
      else if (k === 2) { kind = 'footerless'; text = T.footerless(cur); }
      else if (k === 3) { kind = 'status46'; text = T.status46(S); }
      else if (k === 4) { kind = 'ja'; text = pick(JA_LOGS); if (chance(0.3)) text = T.garble(text, 1 + ri(2)); }
      else if (k === 5) { kind = 'empty'; text = pick(['', '\r', '   ', '\n\n', ' \r ', undefined, null]); }
      else if (k === 6) { kind = 'junk'; text = Array.from({ length: 1 + ri(6) }, () => pick(T.JUNK)()).join('\r'); }
      else if (k === 7) { kind = 'pool'; text = pool.length ? pick(pool) : cur; if (chance(0.3)) text = T.garble(text, 1); }
      else if (k === 8) { kind = 'footerlessPool'; text = T.footerless(pool.length ? pick(pool) : cur); }
      else if (k === 9) { kind = 'garbledJa'; text = T.garble(pick(JA_LOGS), 2 + ri(3)); }
      else { kind = 'statusLv'; text = T.statusLv(S); if (chance(0.3)) text = T.garble(text, 1); }
      const res = both(step, `IMP:${kind}`, (X) => X.importLog(text));
      hit(`import.${kind}.${res.error ? 'error' : res.ok ? 'ok' : 'nothing'}`);
    } else if (r < 84.5) {
      // serialize → createEngine 으로 바꿔 끼우고 계속한다
      const saved = JSON.parse(JSON.stringify(E.serialize()));
      E = Oresim.createEngine(saved);
      trace.push('SAVE');
      check(step, 'restore');
      hit('restore');
    } else if (r < 86) {
      // 연속 레벨업 (최고 레벨까지 가는 길)
      const k = 5 + ri(40);
      for (let j = 0; j < k; j++) {
        const res = both(step, 'L', (X) => X.levelUp());
        hit(res.ok ? 'levelUp.ok' : 'levelUp.refused');
      }
      if (parseInt(A.S.lv.text) >= MAX_LV) hit('reached.maxLevel');
    } else {
      const i = ri(7);
      const k = 2 + ri(12);
      for (let j = 0; j < k; j++) {
        const res = both(step, `S${i}`, (X) => X.statUp(i));
        hit(res.ok ? 'statUp.ok' : (parseInt(A.S[`s${i}`].text) >= STAT_CAP[i] ? 'statUp.refused.cap' : 'statUp.refused.point'));
      }
    }
    for (let i = 0; i < 7; i++) if (parseInt(A.S[`s${i}`].text) >= STAT_CAP[i]) { hit('reached.statCap'); break; }
    if (A.lastError && !cov.__seenErr) cov.__seenErr = 1;
  }
  return compared;
}

// ---- 시작 ----
const t0 = Date.now();
let total = 0;
// 정해 둔 조작 순서
for (const [name, steps] of scripts()) {
  const A = H.createOracle(), E = Oresim.createEngine();
  steps.forEach(([f, ...args], k) => {
    const msgs = diff(A[f](...args), E[f](...args), `${f}() 결과`, []);
    stateDiff(A, E, 'state', msgs);
    if (!msgs.length) diff(oracleView(A.S), E.view(), 'view', msgs);
    if (!msgs.length) msgs.push(...textDiff('exportLog', A.exportLog(), E.exportLog()));
    if (!msgs.length) msgs.push(...textDiff('guide', A.guide(), E.guide()));
    total++;
    if (msgs.length) {
      console.log(`\n어긋남: 정해 둔 순서 "${name}" ${k + 1}번째 (${f})`);
      for (const m of msgs) console.log('  - ' + m);
      process.exit(1);
    }
  });
  hit('script');
}
// 경계 입력: 처음 상태의 새 쌍, 그리고 다른 캐릭터를 고른 새 쌍에 읽힌다
{
  const corpus = edgeCorpus();
  for (const [name, text] of corpus) {
    for (const c of [0, 9, 15]) {
      const A = H.createOracle(), E = Oresim.createEngine();
      if (c) { A.setChar(c); E.setChar(c); }
      const ra = A.importLog(text), re = E.importLog(text);
      const msgs = diff(ra, re, 'importLog() 결과', []);
      stateDiff(A, E, 'state', msgs);
      if (!msgs.length) diff(oracleView(A.S), E.view(), 'view', msgs);
      if (!msgs.length) msgs.push(...textDiff('exportLog', A.exportLog(), E.exportLog()));
      if (!msgs.length) msgs.push(...textDiff('guide', A.guide(), E.guide()));
      // 읽은 뒤 몇 가지 조작도 같아야 한다
      for (const [f, ...args] of [['levelUp'], ['statUp', 0], ['dash', 5], ['undo', true], ['undo', false], ['redo', true], ['levelUp']]) {
        if (msgs.length) break;
        diff(A[f](...args), E[f](...args), `${f}() 결과`, msgs);
        stateDiff(A, E, `state(${f} 뒤)`, msgs);
      }
      if (!msgs.length) msgs.push(...textDiff('exportLog', A.exportLog(), E.exportLog()));
      total++;
      hit(`corpus.${ra.error ? 'error' : ra.ok ? 'ok' : 'nothing'}`);
      if (msgs.length) {
        console.log(`\n어긋남: 경계 입력 "${name}" (캐릭터 ${c})`);
        for (const m of msgs) console.log('  - ' + m);
        process.exit(1);
      }
    }
  }
}
// 답을 아는 AS3 의미 확인: 원본과 엔진에 같은 글을 읽히고, 둘이 같고 AS3 의 답(같아야 하는 글의 결과, 또는 검사)과도 같은지
{
  const shot = (X, S) => ({ v: S ? oracleView(S) : X.view(), log: X.exportLog() });
  for (const [name, text, want] of knownAnswers()) {
    const A = H.createOracle(), E = Oresim.createEngine();
    const msgs = diff(A.importLog(text), E.importLog(text), 'importLog() 결과', []);
    stateDiff(A, E, 'state', msgs);
    const a = shot(A, A.S), e = shot(E);
    if (!msgs.length) diff(a.v, e.v, 'view', msgs);
    if (!msgs.length) msgs.push(...textDiff('exportLog', a.log, e.log));
    if (!msgs.length) {
      if (typeof want === 'function') {
        const m = want(a.v);
        if (m) msgs.push('AS3 의 답과 다름: ' + m);
      } else {
        const A2 = H.createOracle();
        A2.importLog(want);
        const b = shot(A2, A2.S);
        const d = diff(b.v, a.v, 'AS3 의 답과 다름(같아야 하는 글의 view / 읽은 글의 view)', []);
        if (!d.length && b.log !== a.log) d.push('AS3 의 답과 다름: exportLog');
        msgs.push(...d);
      }
    }
    total++;
    hit('knownAnswer');
    if (msgs.length) {
      console.log(`\n어긋남: 답을 아는 경우 "${name}"`);
      for (const m of msgs) console.log('  - ' + m);
      process.exit(1);
    }
  }
}
// 큰 입력(원본이 몇 초 걸린다): 읽은 뒤와 몇 가지 조작 뒤를 비교한다
{
  const th = Date.now();
  for (const [name, text, after] of heavyCases()) {
    const A = H.createOracle(), E = Oresim.createEngine();
    const msgs = diff(A.importLog(text), E.importLog(text), 'importLog() 결과', []);
    stateDiff(A, E, 'state', msgs);
    if (!msgs.length) diff(oracleView(A.S), E.view(), 'view', msgs);
    if (!msgs.length) msgs.push(...textDiff('exportLog', A.exportLog(), E.exportLog()));
    if (!msgs.length) msgs.push(...textDiff('guide', A.guide(), E.guide()));
    for (const [f, ...args] of after) {
      if (msgs.length) break;
      diff(A[f](...args), E[f](...args), `${f}() 결과`, msgs);
      stateDiff(A, E, `state(${f} 뒤)`, msgs);
      if (!msgs.length) msgs.push(...textDiff(`exportLog(${f} 뒤)`, A.exportLog(), E.exportLog()));
    }
    total++;
    hit('heavy');
    if (msgs.length) {
      console.log(`\n어긋남: 큰 입력 "${name}"`);
      for (const m of msgs) console.log('  - ' + m);
      process.exit(1);
    }
  }
  if (VERBOSE) console.log(`큰 입력 ${heavyCases().length}개 ${((Date.now() - th) / 1000).toFixed(1)}s`);
}
for (let s = FIRST; s < FIRST + SEEDS; s++) {
  total += runSeed(s, STEPS);
  if (!VERBOSE && (s - FIRST + 1) % 25 === 0) console.log(`  … ${s - FIRST + 1}/${SEEDS} seeds (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
console.log(`\nOK: seeds ${FIRST}..${FIRST + SEEDS - 1}, 조작 ${STEPS}개씩, 비교한 상태 ${total}개, 어긋남 0 (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
console.log('지나간 경우:');
for (const k of Object.keys(cov).filter((k) => !k.startsWith('__')).sort()) console.log(`  ${k.padEnd(34)} ${cov[k]}`);
