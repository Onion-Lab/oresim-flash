#!/usr/bin/env node
/*
 * 불변식 퍼저: 웹 엔진만 무작위로 조작하면서 다음을 확인한다.
 *   RT     exportLog → 새 엔진의 importLog 가 상태를 재현한다 (+ 두 쪽 육성 가이드가 같다)
 *   UNDO   ←×k 뒤 →×k 하면 원래 상태로 돌아온다
 *   P      방금 내보낸 로그를 같은 엔진에 다시 읽어도 상태가 그대로다
 *   EDIT   스탯 편집 창을 열고 아무것도 바꾸지 않고 적용해도 LV·스탯·POINT·Xien 이 그대로다
 *   XI     계열별 Xien 이 그 레벨의 MAX_XIEN 을 넘지 않는다
 *   EXC    API 가 예외를 던지지 않고, 정상 조작에서는 error 도 없다
 *   SAVE   serialize() → createEngine(saved) 의 상태·출력이 같고, 그 뒤 같은 조작에 같게 움직인다
 *   PREV   preview() 가 그 뒤 levelUp() 이 실제로 하는 것과 같다
 *   PDASH  previewDash(i) 가 그 뒤 dash(i) 가 실제로 하는 것과 같다(거절이면 null)
 *   SHAPE  상태를 바꿀 수 있는 조작은 모두 { ok: boolean, sound } 를 돌려주고, ok 가 false 면 sound 는 null
 *   PANE   로그 상자(logPane)는 원본처럼 레벨업·스탯 +1·대시·로그 읽기 때만 바뀐다(조회·되돌리기·설정은 그대로)
 *   FLAGS  importLog 의 footer/typeFound/restarted/capped: 내보낸 로그는 캐릭터/타입 줄을 알아보고, 끝 두 줄을 뺀 로그는 처음부터 읽고,
 *          둘 다 상한을 넘는 값이 없다(capped: false)
 *   그 밖에 반복 안전장치(붙여 넣은 로그의 거대한 수가 정확히 빨리 끝나는지, 끝이 없는 입력은 멈추는지),
 *   view()/serialize() 결과를 고쳐도 엔진이 그대로인지, 잘못된 저장 상태 거부,
 *   상한이 높던 판(2026-11 전에는 285)의 로그: 상한을 넘는 Status 값을 상한으로 읽고(capped), 다시 내보낸 로그는 capped 가 아니다.
 * RT/UNDO/P/EDIT/XI 는 원본(tests/harness.js)이 지키던 성질이다(웹 엔진이 원본과 같다는 것은 engine-diff.js 가 본다).
 * 사용법: node tests/engine-invariants.js [runsPerFeatureSet=40] [seed=777]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const RUNS = +(process.argv[2] || 40);
let seed = +(process.argv[3] || 777);

function loadOresim() {
  const ctx = { console };
  vm.createContext(ctx);
  const files = [path.join(ROOT, 'web/js/const.js'), process.env.ORESIM_ENGINE || path.join(ROOT, 'web/js/engine.js')];
  for (const f of files) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  return ctx.Oresim;
}
const Oresim = loadOresim();
const C = Oresim.CONST;
const MAX_LV = C.MAX_LEVEL;   // 최고 레벨과 스탯 상한은 표에서 읽는다

// mulberry32
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ri = (n) => Math.floor(rnd() * n);
const pick = (a) => a[ri(a.length)];
const chance = (p) => rnd() < p;

// ---- 비교 도우미 ----
function same(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!(k in b) || !same(a[k], b[k])) return false;
    return true;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!(k in b) || !same(a[k], b[k])) return false;
    return true;
  }
  return Object.is(a, b);
}
function diffKeys(a, b, skip = []) {
  return Object.keys(a).filter((k) => !skip.includes(k) && !same(a[k], b[k])).map((k) => `${k}: ${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}`);
}

// 앞으로의 결과를 정하는 상태(지금 고른 Xien/보너스%는 뺀다: 마지막 레벨업 뒤의 선택은 로그에 남지 않는 설계)
function core(E) {
  const d = E._debugState(), t = d.text, n = (id) => parseInt(t[id]);
  return {
    lv: n('lv'), stats: [0, 1, 2, 3, 4, 5, 6].map((i) => n(`s${i}`)),
    hpmpsp: [n('s7'), n('s8'), n('s9')], point: n('s11'),
    ranges: ['s7mi', 's7mx', 's8mi', 's8mx', 's9mi', 's9mx'].map(n),
    // _bonusPoints 는 보너스 100% 일 때(무조건 지급)와 레벨업이 아직 없을 때(tlvup 0: 다음 레벨업의 재계산 값 floor(rate/100) 이
    // 지금 값과 같다)는 앞으로의 결과에 영향이 없으므로 뺀다. 원본은 로그를 다시 읽으면 tmpBonusExpected 에 그때의 스테퍼 값을
    // 넣는데(initStatus 가 Bonus 줄보다 먼저 돈다), 레벨업 없는 로그면 그 값이 그대로 남는다. engine-diff 로 원본과 같음을 확인했다.
    bonus: [n('tbonus'), n('tlvup'), d.g.tmpBonusExpected === 100 || n('tlvup') === 0 ? '-' : d.g._bonusPoints],
    xi: d.g._xi.join(','), needXien: d.g._needXien.join(','),
    char: d.char.index, style: d.style.index,
  };
}
function xiCheck(E) {
  const d = E._debugState(), c = d.char.index, L = parseInt(d.text.lv), bad = [];
  for (const it of d.lists.xien) {
    const row = C.MAX_XIEN[c][it.data], cap = row[Math.min(L, row.length) - 1];
    if (d.g._xi[it.data] > cap) bad.push(`${it.label} xi=${d.g._xi[it.data]} > MAX_XIEN(LV${L})=${cap}`);
  }
  return bad;
}

const failures = {};
const examples = {};
function fail(group, inv, who, detail, trace) {
  const k = `${group}/${inv}`;
  failures[k] = (failures[k] || 0) + 1;
  if (!examples[k]) examples[k] = { who, detail: [].concat(detail), trace: trace.slice(-14).join(' ') };
}
// 상태를 바꿀 수 있는 조작(결과가 { ok, sound } 인 것)
const MUTATING = new Set(['levelUp', 'statUp', 'dash', 'undo', 'redo', 'setBonus', 'setXien', 'setChar', 'setType', 'reset', 'importLog', 'editCommit']);
// 원본처럼 로그 상자를 새로 쓰는 조작(logOut). dash 는 거절돼도(최고 레벨·포인트 부족) 원본이 logOut 을 부른다
const WRITES_PANE = new Set(['levelUp', 'statUp', 'dash', 'importLog']);
// API 호출: 예외가 나면 EXC, 결과 모양이 틀리면 SHAPE, 로그 상자가 원본과 다르게 바뀌면 PANE
function call(E, group, who, trace, name, ...args) {
  try {
    const pane = E.logPane();
    const r = E[name](...args);
    if (r && typeof r === 'object' && r.error && !group.startsWith('garbage')) fail(group, 'EXC', who, [`${name} → error: true`], trace);
    if (MUTATING.has(name)) {
      if (!r || typeof r !== 'object' || typeof r.ok !== 'boolean' || ![null, 'lvup', 'stup'].includes(r.sound) || (!r.ok && r.sound !== null)) {
        fail(group, 'SHAPE', who, [`${name} → ${JSON.stringify(r)}`], trace);
      }
    }
    const now = E.logPane();
    if (!WRITES_PANE.has(name) || (name !== 'dash' && name !== 'importLog' && !r.ok)) {
      if (now !== pane) fail(group, 'PANE', who, [`${name} 뒤 로그 상자가 바뀌었다`], trace);
    } else if (!r.error && now !== pane && now !== E.exportLog()) {
      fail(group, 'PANE', who, [`${name} 뒤 로그 상자가 지금 로그와 다르다`], trace);
    } else if (!r.error && (name === 'importLog' || r.ok) && now !== E.exportLog()) {
      fail(group, 'PANE', who, [`${name} 뒤 로그 상자가 새로 쓰이지 않았다`], trace);
    }
    return r;
  } catch (e) {
    fail(group, 'EXC', who, [`${name} threw: ${String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')}`], trace);
    throw e;
  }
}

// 스탯 편집: 그 레벨에서 가능한 Xien 만 넣는다(원본 퍼저와 같은 범위)
function randomEdit(E) {
  const ed = E.editOpen(), c = E.view().char;
  const L = chance(0.35) ? ed.lv : Math.max(ed.lv, 1 + ri(C.MAX_LEVEL));
  const v = { lv: L, stats: ed.stats.map((s, i) => (chance(0.6) ? 1 + ri(Math.min(C.MAX_STATUS[i], 200)) : s)) };
  if (chance(0.5)) v.point = ri(60);
  v.lines = ed.lines.map((ln) => {
    const row = C.MAX_XIEN[c][ln.x], cap = row[Math.min(L, row.length) - 1];
    let x = chance(0.5) ? ri(cap + 1) : ln.value;
    if (x > cap) x = cap;
    return { x: ln.x, value: x };
  });
  return v;
}

// preview() 와 실제 levelUp() 비교
function previewCheck(E, group, who, trace) {
  const p = E.preview(), a = E.view();
  const r = call(E, group, who, trace, 'levelUp');
  const b = E.view();
  if (!r.ok) { if (p !== null) fail(group, 'PREV', who, ['levelUp 이 거부됐는데 preview 가 null 이 아니다'], trace); return; }
  const real = {
    lv: b.lv, point: b.point - a.point, stats: b.stats.map((s, k) => s.value - a.stats[k].value),
    hp: b.hp.value - a.hp.value, mp: b.mp.value - a.mp.value, sp: b.sp.value - a.sp.value, bonus: b.bonus.achieved > a.bonus.achieved,
  };
  if (!same(p, real)) fail(group, 'PREV', who, [`preview ${JSON.stringify(p)} / 실제 ${JSON.stringify(real)}`], trace);
}

// previewDash() 와 실제 dash() 비교
function previewDashCheck(E, i, group, who, trace) {
  const p = E.previewDash(i), a = E.view();
  const r = call(E, group, who, trace, 'dash', i);
  const b = E.view();
  const real = r.ok ? { value: b.stats[i].value, lv: b.lv, point: b.point, levelUps: b.lv - a.lv } : null;
  if (!same(p, real)) fail(group, 'PDASH', who, [`previewDash(${i}) ${JSON.stringify(p)} / 실제 ${JSON.stringify(real)} (${JSON.stringify(r)})`], trace);
}

// serialize → createEngine 같음 + 그 뒤 같은 조작에 같게 움직인다
function saveCheck(E, group, who, trace) {
  const saved = JSON.parse(JSON.stringify(E.serialize()));
  const E2 = Oresim.createEngine(saved);
  const cmp = (tag) => {
    if (!same(E._debugState(), E2._debugState())) { fail(group, 'SAVE', who, [`${tag}: _debugState 다름`], trace); return false; }
    if (!same(E.view(), E2.view())) { fail(group, 'SAVE', who, [`${tag}: view 다름`], trace); return false; }
    return true;
  };
  if (!cmp('복원 직후')) return;
  if (E.exportLog() !== E2.exportLog() || E.guide() !== E2.guide()) { fail(group, 'SAVE', who, ['복원 직후 exportLog/guide 다름'], trace); return; }
  const k = 3 + ri(15);
  for (let j = 0; j < k; j++) {
    const r = rnd();
    let act;
    if (r < 0.3) act = ['levelUp'];
    else if (r < 0.6) act = ['statUp', ri(7)];
    else if (r < 0.65) act = ['dash', ri(7)];
    else if (r < 0.72) act = ['undo', chance(0.3)];
    else if (r < 0.78) act = ['redo', chance(0.3)];
    else if (r < 0.82) act = ['setBonus', pick([0, 25, 50, 75, 100, 7])];
    else if (r < 0.88) { const l = E.view().xien.lines; act = ['setXien', pick(l).x]; }
    else if (r < 0.92) act = ['importLog', E.exportLog()];
    else if (r < 0.95) act = ['editCommit', randomEdit(E)];
    else act = ['guide'];
    const ra = E[act[0]](...act.slice(1)), rb = E2[act[0]](...act.slice(1));
    if (!same(ra, rb)) { fail(group, 'SAVE', who, [`${act[0]} 결과 다름: ${JSON.stringify(ra)} / ${JSON.stringify(rb)}`], trace); return; }
    if (!cmp(`복원 뒤 ${j + 1}번째 조작 ${act[0]}`)) return;
  }
}

const FEATURES = {
  base: [],
  undo: ['undo'],
  edit: ['edit'],
  editUndo: ['edit', 'undo'],
  guide: ['guide', 'reload'],
  all: ['edit', 'undo', 'guide', 'reload', 'char'],
  garbage: ['edit', 'undo', 'guide', 'reload', 'char', 'garbage'],
};
const STATS = ['STAB', 'HACK', 'INT', 'DEF', 'MR', 'DEX', 'AGI'];

const t0 = Date.now();
let counts = { runs: 0, steps: 0, saves: 0, previews: 0 };
for (const [group, feats] of Object.entries(FEATURES)) {
  for (let run = 0; run < RUNS; run++) {
    counts.runs++;
    const E = Oresim.createEngine();
    const c0 = ri(C.CHAR_NAME.length);
    E.setChar(c0); E.setType(ri(C.STYLE_NAME[c0].length));
    const who = `${E.view().charName}/${E.view().typeName}`;
    const trace = [];
    let bad = false;
    const garbage = feats.includes('garbage');
    try {
      const steps = 60 + ri(260);
      for (let st = 0; st < steps && !bad; st++) {
        counts.steps++;
        const r = rnd();
        if (r < 0.28) {
          if (chance(0.15)) { previewCheck(E, group, who, trace); counts.previews++; trace.push('L(p)'); }
          else { call(E, group, who, trace, 'levelUp'); trace.push('L'); }
        } else if (r < 0.70) { const i = ri(7); call(E, group, who, trace, 'statUp', i); trace.push(STATS[i]); }
        else if (r < 0.74) { const i = ri(7); previewDashCheck(E, i, group, who, trace); trace.push('⇧' + STATS[i]); }
        else if (r < 0.77) { const v = pick(garbage ? [0, 25, 50, 75, 100, 7, 103, -5, 'abc'] : [0, 25, 50, 75, 100]); call(E, group, who, trace, 'setBonus', v); trace.push('B' + v); }
        else if (r < 0.81) { const x = pick(E.view().xien.lines).x; call(E, group, who, trace, 'setXien', x); trace.push('X' + x); }
        else if ((r < 0.85 || (st < 3 && r < 0.93)) && feats.includes('edit')) {
          const v = garbage && chance(0.4) ? { lv: pick([0, 300, 'abc', 7.5]), stats: [pick([0, 999, 'x']), C.MAX_STATUS[1], C.MAX_STATUS[2]], point: pick([-1, 99999, '']), lines: [{ x: E.view().xien.lines[0].x, value: pick(['abc', '-5', 1e21, '']) }] } : randomEdit(E);
          call(E, group, who, trace, 'editCommit', v); trace.push(`EDIT(L${v.lv})`);
        } else if (r < 0.91 && feats.includes('undo')) {
          const k = 1 + ri(6), dash = chance(0.3);
          const before = core(E);
          let took = 0;
          for (let i = 0; i < k; i++) { const res = call(E, group, who, trace, 'undo', dash); if (res.ok) took++; }
          for (let i = 0; i < (dash ? k : took); i++) call(E, group, who, trace, 'redo', dash);
          trace.push(`${dash ? '⇧' : ''}←→x${k}`);
          const d = diffKeys(before, core(E));
          if (d.length && !dash && !garbage) { fail(group, 'UNDO', who, d, trace); bad = true; }
          if (chance(0.4)) { const j = 1 + ri(4); for (let i = 0; i < j; i++) call(E, group, who, trace, 'undo', false); trace.push(`←x${j}`); }
        } else if (r < 0.93 && feats.includes('guide')) { call(E, group, who, trace, 'guide'); trace.push('G'); }
        else if (r < 0.95 && feats.includes('reload')) {
          const text = E.exportLog();
          const before = core(E);
          call(E, group, who, trace, 'importLog', text); trace.push('P');
          const d = diffKeys(before, core(E));
          if (d.length && !garbage) { fail(group, 'P', who, d, trace); bad = true; }
        } else if (r < 0.965 && feats.includes('char')) {
          const c2 = ri(C.CHAR_NAME.length);
          call(E, group, who, trace, 'setChar', c2); call(E, group, who, trace, 'setType', ri(C.STYLE_NAME[c2].length)); trace.push('CHAR' + c2);
        } else if (r < 0.985 && garbage) {
          // 망가진 로그
          const L = E.exportLog().split('\r');
          for (let k = 0; k < 1 + ri(3); k++) {
            const i = ri(L.length);
            const op = ri(5);
            if (op === 0) L.splice(i, 1);
            else if (op === 1) L[i] = L[i].replace(/\d+/, String(pick([0, -3, 400, 999, 2850])));
            else if (op === 2) L.splice(i, 0, pick(['Bonus :', 'Bonus : 33%', 'LV 5 - 3 : HACK', `LV 2 : ${pick(STATS)} * 30`, 'Status : 1, 2', 'Xien : 없음']));
            else if (op === 3) L[i] = L[i].slice(0, ri(L[i].length + 1));
            else L[i] = L[i].replace(/:/, String.fromCharCode(0xff1a));
          }
          call(E, group, who, trace, 'importLog', L.join('\r')); trace.push('IMP!');
        }
        if (chance(0.03)) { saveCheck(E, group, who, trace); counts.saves++; trace.push('SAVE'); }
        if (!garbage) {
          const xb = xiCheck(E);
          if (xb.length && !bad) { fail(group, 'XI', who, xb, trace); bad = true; }
        }
      }
      if (!bad && feats.includes('edit') && !garbage) {
        const v = core(E);
        const ed = E.editOpen();
        const inRange = ed.lv === parseInt(E._debugState().text.lv) && v.point <= 9999 && v.point >= 0 && v.hpmpsp[0] <= 22000 && v.hpmpsp[1] <= 7000 && v.hpmpsp[2] <= 12000;
        call(E, group, who, trace, 'editCommit', ed);
        const d = diffKeys(v, core(E), ['ranges', 'bonus', 'needXien']);
        if (d.length && inRange) { fail(group, 'EDIT', who, d, trace.concat('EDIT(noop)')); bad = true; }
      }
      if (!bad && !garbage) {
        const text = E.exportLog(), before = core(E);
        const R = Oresim.createEngine();
        const c2 = ri(C.CHAR_NAME.length);
        R.setChar(c2);   // 다른 캐릭터를 고른 엔진에 읽어도 같아야 한다
        const fr = call(R, group, who, trace, 'importLog', text);
        // 내보낸 로그는 상한 안의 값만 쓴다(capped: false)
        if (!(fr.ok && fr.footer && fr.typeFound && !fr.restarted && fr.capped === false)) fail(group, 'FLAGS', who, [`내보낸 로그: ${JSON.stringify(fr)}`], trace);
        // 끝 두 줄(캐릭터/타입 줄, LV: 줄)을 빼면 지금 고른 캐릭터/타입으로 처음부터 읽는다
        const cut = Oresim.createEngine();
        const fc = cut.importLog(text.split('\r').slice(0, -2).join('\r'));
        if (!(fc.ok && !fc.footer && !fc.typeFound && fc.restarted && fc.capped === false)) fail(group, 'FLAGS', who, [`끝 두 줄을 뺀 로그: ${JSON.stringify(fc)}`], trace);
        const d = diffKeys(before, core(R));
        if (d.length) fail(group, 'RT', who, d, trace);
        else if (feats.includes('guide')) {
          const g1 = E.guide().split('\r'), g2 = R.guide().split('\r');
          const gd = g1.map((l, i) => (l !== g2[i] ? `'${l}' / '${g2[i]}'` : null)).filter(Boolean);
          if (gd.length || g1.length !== g2.length) fail(group, 'GUIDE', who, gd.length ? gd : ['줄 수'], trace);
        }
      }
      saveCheck(E, group, who, trace); counts.saves++;
    } catch (e) {
      fail(group, 'EXC', who, [String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')], trace);
    }
  }
}

// ---- 정해진 경우들 ----
function special(name, fn) {
  try { const msg = fn(); if (msg) fail('special', name, '-', [msg], []); } catch (e) { fail('special', name, '-', [String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')], []); }
}
// 반복 안전장치 1: 붙여 넣은 로그의 거대한 수. 결과가 같은 반복은 정확히 건너뛰므로 빨리, 예외 없이 끝까지 읽는다
const STATUS_TAIL = ', 10, 50, 0, 0, 0, 4, 3, 1, 2, 1, 2, 2, 220, 50, 1000, 0, 0, 220, 50, 1000, 0, 220, 50, 1000, 0' + ', 0'.repeat(50) + ', 50, 1';
// (같아야 하는 작은 입력과 상태가 같다: 최고 레벨에서 아무것도 바뀌지 않는 레벨 반복, 거절이 이어지는 "* n" 은 결과에 상관없다)
for (const [name, text, same2] of [
  ['budget.range', 'LV 1 - 999999999 : STAB', 'LV 1 - 2000 : STAB'],
  ['budget.allin', 'LV 1 - 999999999 : STAB 몰빵 3회', 'LV 1 - 2000 : STAB 몰빵 3회'],
  ['budget.times', 'LV 2 : STAB * 999999999', 'LV 2 : STAB * 50'],
  ['budget.timesHuge', `LV 2 - ${MAX_LV} : STAB * 1` + '0'.repeat(400) + ', DEX * 9999', `LV 2 - ${MAX_LV} : STAB * 999, DEX * 999`],
  ['budget.status', 'Status : -999999999' + STATUS_TAIL, null],
]) {
  special(name, () => {
    const E = Oresim.createEngine();
    const t = Date.now();
    const r = E.importLog(text);
    E.exportLog(); E.guide(); E.view(); E.undo(); E.levelUp(); E.serialize();
    const ms = Date.now() - t;
    if (ms > 10000) return `${ms}ms 걸렸다`;   // 보통 수십 ms. 멈춤만 잡는다(다른 작업과 함께 돌아도 넘지 않을 값)
    if (r.error) return '끝까지 읽지 못했다(error)';
    if (same2 === null) return null;
    const R1 = Oresim.createEngine(), R2 = Oresim.createEngine();
    R1.importLog(text); R2.importLog(same2);
    const d = diffKeys(core(R2), core(R1));
    if (d.length || R1.exportLog().split('\r').slice(-2).join() !== R2.exportLog().split('\r').slice(-2).join()) return `작은 입력과 다르다: ${d.slice(0, 3).join('; ')}`;
    return null;
  });
}
// 반복 안전장치 2: 끝이 없는 입력(레벨업·투자가 실제로 수억 번 일어난다)은 한도에서 멈추고(error), 엔진은 계속 쓸 수 있다
for (const [name, text] of [
  ['limit.negativeLv', 'Status : -999999999' + STATUS_TAIL + `\rLV -999999998 - ${MAX_LV} : STAB`],
  ['limit.negativeStat', 'Status : 100, 10, 50, 0, 0, 0, -999999999' + STATUS_TAIL.slice(STATUS_TAIL.indexOf(', 3,')) + '\rLV 100 : STAB 몰빵 1회'],
]) {
  special(name, () => {
    const E = Oresim.createEngine();
    const t = Date.now();
    const r = E.importLog(text);
    const ms = Date.now() - t;
    if (ms > 20000) return `${ms}ms 걸렸다`;   // 기록 10만 개: 브라우저(본 컨텍스트) 1초 남짓, vm 안에서 4초쯤. 멈춤만 잡는다
    if (!r.error) return '한도에서 멈추지 않았다';
    E.exportLog(); E.guide(); E.view(); E.undo(); E.serialize();
    if (E.reset().ok !== true || E.levelUp().ok !== true || E.view().lv !== 2) return '멈춘 뒤 엔진을 계속 쓸 수 없다';
    return null;
  });
}
// 아주 큰 LV 에서의 되돌리기·다시 실행: 되돌리기가 레벨 수만큼 돌지 않는지 본다(restoreStLog 는 값이 있는 칸만 옮긴다).
// 2026-11 부터 Status 줄의 LV 는 상한으로 읽으므로(capped) 로그로는 그런 상태가 되지 않는다(먼저 그것을 본다). 그래서 손으로 고친 저장
// 상태를 만든다: 최고 레벨 − 1 에서 스탯 편집 → 레벨업 → STAB +1 두 번(조작 셋)을 한 계획의 serialize() 에서 LV 글자, 기록의 LV 칸,
// 레벨마다의 stLog/tmpStLog 키를 같은 수만큼 밀어 LV 99999999 로 만들고 되살린다. 네 조작 모두 받아들여져(restoreStLog 까지 간다)
// 빨리 끝나야 하고, 되돌렸다가 다시 실행한 계획은 처음과 같다
special('budget.undoHugeLv', () => {
  const HUGE = 99999999;
  const I = Oresim.createEngine();
  const r = I.importLog(`Status : ${HUGE}` + STATUS_TAIL);
  if (!r.capped || I.view().lv !== MAX_LV) return `상한으로 읽지 않았다: ${JSON.stringify(r)}, LV ${I.view().lv}`;
  const B = Oresim.createEngine();
  // STAB 110 → 112: LV 99999999 에서도 두 번의 +1 이 같은 비용 구간이다(대시 단위 되돌리기·다시 실행이 둘을 함께 옮긴다)
  B.editCommit({ lv: MAX_LV - 1, point: 9999, stats: [110, 50, 10, 10, 10, 10, 10] });
  if (![B.levelUp(), B.statUp(0), B.statUp(0)].every((x) => x.ok)) return '저장 상태를 만들지 못했다';
  const D = HUGE - MAX_LV;
  const sv = JSON.parse(JSON.stringify(B.serialize()));
  sv.text.lv = String(+sv.text.lv + D);
  for (const rec of sv.log.e) {   // 기록: 첫 원소는 a(모든 칸), 뒤 원소는 d(앞 원소와 다른 칸 [칸, 값]). LV 는 0번 칸(센티널의 0 은 그대로)
    if (Array.isArray(rec.a)) { if (rec.a[0] > 0) rec.a[0] += D; } else for (const p of rec.d) if (p[0] === 0 && p[1] > 0) p[1] += D;
  }
  for (const k of ['stLog', 'tmpStLog']) { sv[k].e = sv[k].e.map(([key, val]) => [String(+key + D), val]); sv[k].n += D; }
  const E = Oresim.createEngine(sv);
  const brief = (v) => [v.lv, v.point, v.actions].concat(v.stats.map((s) => s.value));
  const v0 = brief(E.view());
  if (v0[0] !== HUGE || v0[2] !== 3) return `되살린 상태: LV ${v0[0]}, 조작 ${v0[2]}`;
  const t = Date.now();
  const rs = [E.undo(), E.redo(), E.undo(true), E.redo(true)];
  const ms = Date.now() - t;
  if (rs.some((x) => x.error)) return '되돌리기가 끝나지 않았다';
  if (!rs.every((x) => x.ok)) return `되돌리기·다시 실행이 거절되었다: ${JSON.stringify(rs)}`;
  if (ms > 1000) return `되돌리기가 오래 걸렸다(${ms}ms)`;   // 보통 몇 ms. 레벨 수만큼 돌면 작업 한도에서 멈춘다(error)
  const v1 = brief(E.view());
  return same(v0, v1) ? null : `되돌렸다가 다시 실행한 계획이 다르다: ${v0.join(',')} / ${v1.join(',')}`;
});
// 최고 레벨에서 포인트가 모자란 대시: ok: false, 소리 없음, 상태 그대로(로그 상자만 원본처럼 새로 쓰일 수 있다)
special('dash.noop', () => {
  const E = Oresim.createEngine();
  E.editCommit({ lv: MAX_LV, point: 0, stats: [C.MAX_STATUS[0], C.MAX_STATUS[1], C.MAX_STATUS[2] - 1, 10, 10, 10, 10] });
  const before = JSON.stringify(Object.assign(E._debugState(), { logText: '' }));
  const r = E.dash(2), p = E.previewDash(2);
  if (r.ok !== false || r.sound !== null || p !== null) return `dash ${JSON.stringify(r)}, previewDash ${JSON.stringify(p)}`;
  if (JSON.stringify(Object.assign(E._debugState(), { logText: '' })) !== before) return '상태가 바뀌었다';
  return null;
});
// 일본어판 로그: 캐릭터/타입 줄을 알아보지 못해 지금 고른 캐릭터/타입으로 처음부터 읽는다
special('flags.jaEra', () => {
  for (const text of require('./fixtures/ja-era-logs')) {
    const E = Oresim.createEngine();
    E.setChar(9);
    const r = E.importLog(text);
    if (!(r.ok && !r.footer && !r.typeFound && r.restarted) || E.view().char !== 9) return `${JSON.stringify(r)} → 캐릭터 ${E.view().char}`;
  }
  return null;
});
// view()/serialize()/editOpen() 결과를 고쳐도 엔진은 그대로
special('isolation', () => {
  const E = Oresim.createEngine();
  for (let i = 0; i < 30; i++) { E.levelUp(); E.statUp(i % 7); }
  const before = JSON.stringify(E.view());
  const v = E.view(); v.stats[0].value = 999; v.chars[0].types.push('x'); v.xien.lines.length = 0; v.levelLog.push('zz'); v.hp.value = -1;
  const s = E.serialize(); s.text.lv = '999'; s.g._xi[0] = 77; s.log.e.length = 0;
  const ed = E.editOpen(); ed.stats[0] = 1; ed.lines.length = 0; ed.limits.lv[1] = 1;
  const pv = E.preview(); pv.stats[0] = 99; const pd = E.previewDash(0); pd.value = -1;
  if (E.preview().stats[0] === 99 || E.previewDash(0).value === -1) return 'preview/previewDash 결과를 고친 것이 엔진에 남았다';
  if (JSON.stringify(E.view()) !== before) return 'view 결과를 고친 것이 엔진에 남았다';
  const saved = E.serialize();
  const E2 = Oresim.createEngine(JSON.parse(JSON.stringify(saved)));
  E2.levelUp();
  if (JSON.stringify(E.view()) !== before) return '복원본을 움직인 것이 원래 엔진에 남았다';
  return null;
});
// 잘못된 저장 상태는 거부한다
special('badSave', () => {
  const ok = Oresim.createEngine().serialize();
  const bad = [
    Object.assign({}, ok, { v: 'x' }),
    Object.assign({}, ok, { d: '00000000' }),
    Object.assign({}, ok, { text: null }),
    Object.assign({}, ok, { up: [1, 2] }),
    Object.assign({}, ok, { g: Object.assign({}, ok.g, { _xi: ['abc'] }) }),
    Object.assign({}, ok, { stLog: { n: 300, e: [['__proto__', 's']] } }),
    Object.assign({}, ok, { log: { n: 1024, e: [{ k: 'length', a: [] }] } }),
    7,
  ];
  for (const b of bad) {
    let threw = false;
    try { Oresim.createEngine(b); } catch (e) { threw = true; }
    if (!threw) return `받아들이면 안 되는 상태를 받아들였다: ${JSON.stringify(b).slice(0, 80)}`;
  }
  return null;
});
// 버전
special('version', () => (typeof Oresim.ENGINE_VERSION === 'string' && Oresim.createEngine().serialize().v === Oresim.ENGINE_VERSION ? null : 'ENGINE_VERSION'));

// ---- 상한이 지금보다 높던 판(2026-11 전에는 285)의 로그 ----
// 스탯 편집 창으로 LV·스탯을 지금 상한보다 크게 시작한 계획: Status 줄의 LV 와 일곱 스탯은 상한으로 읽고(importLog 의 capped: true),
// 최고 레벨을 넘는 LV 줄의 레벨은 레벨업 없이(거절) 최고 레벨에서 투자만 한다. 다시 내보낸 로그는 상한 안이라 capped 가 아니고
// 같은 계획이 된다. 값은 표의 상한에서 만든다(상한을 바꿔도 시험을 고치지 않는다)
const CAP = C.MAX_STATUS.slice(0, 7);
const FOOT0 = `${C.CHAR_NAME[0]}/${C.STYLE_NAME[0][0]} Bonus: 0 / 0 Point: 0`;
// Status 줄: n = 78(지금 형식) 또는 46(Xien 20계열 시절 형식). LV 와 일곱 스탯 말고는 보통 값(POINT 300)
const statusOf = (lv, stats, n) => 'Status       : ' + [lv, 10, 50, 0, 0, 0].concat(stats, [2400, 550, 9000, 0, 300, 2400, 550, 9000, 0, 2400, 550, 9000, 0],
  n === 46 ? Array(20).fill(0) : Array(50).fill(0).concat([50, 1])).join(', ');
const statusCells = (text) => { const ln = text.split('\r').find((s) => /^Status /.test(s)); return ln ? ln.replace(/^Status +: /, '').split(', ').map(Number) : null; };
// 읽은 계획이 상한 안이고(내보낸 Status 줄도), 내보낸 로그를 새 엔진에 읽으면 capped 없이 같은 계획·같은 로그 글이 된다
function cappedRoundTrip(E) {
  const v = E.view();
  if (!(v.lv <= MAX_LV)) return `LV ${v.lv}`;
  const over = v.stats.filter((s, i) => !(s.value <= CAP[i]));
  if (over.length) return `상한을 넘는 스탯 ${over.map((s) => `${s.key} ${s.value}`).join(', ')}`;
  const text = E.exportLog();
  const cells = statusCells(text);
  if (cells && (!(cells[0] <= MAX_LV) || CAP.some((cap, i) => !(cells[6 + i] <= cap)))) return `내보낸 Status 줄이 상한을 넘는다: ${cells.slice(0, 13).join(', ')}`;
  const R = Oresim.createEngine();
  const r = R.importLog(text);
  if (!(r.ok && r.footer && r.typeFound && !r.restarted && r.capped === false && !r.error)) return `내보낸 로그 다시 읽기: ${JSON.stringify(r)}`;
  const d = diffKeys(core(E), core(R));
  if (d.length) return `다시 읽은 계획이 다르다: ${d.slice(0, 3).join('; ')}`;
  if (R.exportLog() !== text) return '다시 읽은 계획의 로그 글이 다르다';
  return null;
}
// (a)(b) 편집 레벨 MAX+15, STAB MAX+25, DEX MAX+15 의 Status 줄(78칸·46칸), 편집 레벨의 투자 줄, 최고 레벨을 넘는 LV 줄
for (const n of [78, 46]) {
  special(`capped.edit${n}`, () => {
    const E = Oresim.createEngine();
    const text = [statusOf(MAX_LV + 15, [CAP[0] + 25, 120, 10, 60, 30, CAP[5] + 15, 40], n), `LV ${MAX_LV + 15}       : STAB * 3`,
      `LV ${MAX_LV + 16} - ${MAX_LV + 25} : DEX`, `LV ${MAX_LV + 26}       : AGI * 2`, FOOT0].join('\r');
    const r = E.importLog(text);
    if (!(r.ok && r.footer && r.typeFound && !r.restarted && r.capped === true && !r.error)) return `importLog ${JSON.stringify(r)}`;
    // STAB·DEX 는 상한이라 투자가 거절되고, AGI 두 번은 최고 레벨의 필요 포인트로 투자된다
    const agiCost = (a) => C.DEFAULT_NEED_POINT[0][0][6] + Math.floor((MAX_LV + a * 5) / 125);
    const v = E.view();
    const got = { lv: v.lv, startLv: v.startLv, stats: v.stats.map((s) => s.value), point: v.point, status: statusCells(E.exportLog()).slice(0, 13) };
    const want = { lv: MAX_LV, startLv: MAX_LV, stats: [CAP[0], 120, 10, 60, 30, CAP[5], 42], point: 300 - agiCost(40) - agiCost(41),
      status: [MAX_LV, 10, 50, 0, 0, 0, CAP[0], 120, 10, 60, 30, CAP[5], 40] };
    if (!same(got, want)) return `읽은 계획 ${JSON.stringify(got)} / 기대 ${JSON.stringify(want)}`;
    return cappedRoundTrip(E);
  });
}
// (c) 편집 없는 로그의 최고 레벨을 넘는 LV 범위: 최고 레벨에서 멈추고, 넘는 레벨의 투자는 최고 레벨에서 한다
special('capped.levelRange', () => {
  const E = Oresim.createEngine();
  const r = E.importLog(['LV   1       :', `LV   2 - ${MAX_LV + 30} : STAB`, FOOT0].join('\r'));
  if (!(r.ok && r.footer && r.typeFound && !r.restarted && r.capped === true && !r.error)) return `importLog ${JSON.stringify(r)}`;
  const v = E.view();
  if (v.lv !== MAX_LV || v.startLv !== 1) return `LV ${v.lv}, 시작 LV ${v.startLv}`;
  const S = Oresim.createEngine();
  S.importLog(['LV   1       :', `LV   2 - ${MAX_LV} : STAB`, `LV ${MAX_LV}       : STAB * 30`, FOOT0].join('\r'));
  const d = diffKeys(core(S), core(E));
  if (d.length || S.exportLog() !== E.exportLog()) return `최고 레벨에서 STAB * 30 을 한 계획과 다르다: ${d.slice(0, 3).join('; ')}`;
  return cappedRoundTrip(E);
});
// (d) 상한과 같은 값은 넘지 않는다(capped: false, 그대로). 한 칸이라도 상한 + 1 이면 capped 이고 그 칸만 상한으로 읽는다
special('capped.atCap', () => {
  const E = Oresim.createEngine();
  const r = E.importLog([statusOf(MAX_LV, CAP, 78), `LV ${MAX_LV}       : STAB, AGI`, FOOT0].join('\r'));
  if (!(r.ok && r.footer && r.capped === false && !r.error)) return `상한 그대로: importLog ${JSON.stringify(r)}`;
  const v = E.view();
  if (v.lv !== MAX_LV || v.startLv !== MAX_LV || v.stats.some((s, i) => s.value !== CAP[i]) || v.point !== 300) return `상한 그대로: LV ${v.lv} 스탯 ${v.stats.map((s) => s.value)} POINT ${v.point}`;
  for (let k = -1; k < 7; k++) {
    const lv = k < 0 ? MAX_LV + 1 : MAX_LV - 1;
    const stats = CAP.map((cap, i) => (i === k ? cap + 1 : cap - 10));
    const R = Oresim.createEngine();
    const rr = R.importLog([statusOf(lv, stats, 78), FOOT0].join('\r'));
    const w = R.view(), name = k < 0 ? 'LV' : STATS[k];
    if (rr.capped !== true || rr.error) return `${name} 만 상한 + 1: ${JSON.stringify(rr)}`;
    if (w.lv !== Math.min(lv, MAX_LV) || w.stats.some((s, i) => s.value !== Math.min(stats[i], CAP[i]))) return `${name} 만 상한 + 1: LV ${w.lv} 스탯 ${w.stats.map((s) => s.value)}`;
  }
  return null;
});
// Status 줄에서 상한으로 읽는 칸은 LV 와 일곱 스탯뿐이다. HP/MP/SP 와 그 범위, POINT 는 상한을 넘어도 그대로 읽고(기록 log[0] 에
// 그대로 남는다) capped 도 아니다. 화면의 HP/MP/SP 범위 글자는 원본 updateStatus() 가 상한으로 줄이므로(전부터) 값과 POINT 만 본다
special('capped.otherFields', () => {
  const H7 = C.MAX_STATUS.slice(7, 10);
  const vals = [MAX_LV - 5, 10, 50, 0, 0, 0, 40, 30, 10, 20, 10, 20, 20].concat(H7.map((v) => v + 500), [0, 99999], H7.map((v) => v + 100), [0], H7.map((v) => v + 900), [0],
    Array(50).fill(0), [50, 1]);
  const E = Oresim.createEngine();
  const r = E.importLog(['Status       : ' + vals.join(', '), FOOT0].join('\r'));
  if (!(r.ok && r.footer && r.capped === false && !r.error)) return `importLog ${JSON.stringify(r)}`;
  const l0 = E._debugState().log[0];
  if (!same(l0.slice(0, 26), vals.slice(0, 26))) return `기록된 Status 값 ${l0.slice(0, 26).join(',')} / 기대 ${vals.slice(0, 26).join(',')}`;
  const v = E.view();
  const got = [v.lv, v.hp.value, v.mp.value, v.sp.value, v.point], want = [vals[0], vals[13], vals[14], vals[15], vals[17]];
  return same(got, want) ? null : `LV·HP/MP/SP·POINT ${got.join(',')} / 기대 ${want.join(',')}`;
});
// capped 는 글의 성질이다: 읽기가 예외로 멈춰 그 뒤의 줄을 읽지 않아도(error) 상한을 넘는 줄이 있으면 true
special('capped.afterError', () => {
  const E = Oresim.createEngine();
  const r = E.importLog(['LV   1       :', 'Bonus :75%', `LV   2 - ${MAX_LV + 30} : STAB`, FOOT0].join('\r'));
  if (!(r.error && r.capped === true)) return `importLog ${JSON.stringify(r)}`;
  if (E.view().lv !== 1) return `멈춘 뒤의 LV 줄까지 읽었다: LV ${E.view().lv}`;
  return null;
});
// (e) 수가 아니거나 음수인 값은 상한과 상관없다: capped 가 아니고, 값을 바꾸지 않으며(전과 같다), 원본(하네스)이 읽은 것과 같다
special('capped.nanNegative', () => {
  const H = require('./harness');
  const definedOnly = (arr) => { const o = {}; for (const k of Object.keys(arr)) if (arr[k] !== undefined) o[k] = arr[k]; return o; };
  const norm = (st) => Object.assign({}, st, { stLog: definedOnly(st.stLog), tmpStLog: definedOnly(st.tmpStLog) });
  const P = Oresim._as3.parseInt;
  for (const [lv, stats, n, line] of [
    ['abc', [-5, 'x', 3, -999, 5, '', 7], 78, 'LV   2       : STAB'],
    [-3, [-5, -1, 3, 0, 5, 6, 7], 46, 'LV  -2 -   1 : HACK'],
    ['NaN', [1, -2, 3, 4, 'NaN', 6, -7], 78, null],
  ]) {
    const text = [statusOf(lv, stats, n)].concat(line ? [line] : [], [FOOT0]).join('\r');
    const E = Oresim.createEngine(), A = H.createOracle();
    const re = E.importLog(text), ra = A.importLog(text);
    if (re.capped !== false) return `capped ${re.capped}: LV ${lv}`;
    if (!same(re, ra)) return `importLog 결과가 원본과 다르다: ${JSON.stringify(re)} / ${JSON.stringify(ra)}`;
    if (!same(norm(E._debugState()), norm(H.rawState(A.S)))) return `읽은 상태가 원본과 다르다: LV ${lv}`;
    if (E.exportLog() !== A.exportLog()) return `내보낸 로그가 원본과 다르다: LV ${lv}`;
    const l0 = E._debugState().log[0], want = [lv].concat(stats).map(P);
    const got = [l0[0]].concat(l0.slice(6, 13));
    if (!want.every((w, k) => Object.is(w, got[k]))) return `Status 값이 바뀌었다: ${got.join(',')} / ${want.join(',')}`;
  }
  return null;
});
// (f) 스탯 편집 없이 LV 256 전에 스탯이 상한을 넘은 옛 계획(상한이 285이던 판의 몰빵 등): LV 줄은 상한 안이고 상한을 넘는 값은 끝의
// LV: 요약 줄("LV:170 STAB 285 HACK 4 …")에만 있다. capped 는 그 줄로 참이 되고, 요약 줄은 읽지 않으므로 계획은 그 줄이 없을 때와 같다
// (그 스탯은 다시 찍을 때 상한에서 멈춘다). 요약 줄의 모양(줄 머리가 'LV' 하나, 이름이 STAB~AGI 순서)이 다르거나 값이 상한 이하이면
// capped 가 아니다. 원본(하네스)의 capped 와도 같은지 본다. 값은 표의 상한에서 만든다
special('capped.summaryLine', () => {
  const H = require('./harness');
  const sum = (lv, vals) => `LV:${lv} ` + STATS.map((s, i) => `${s} ${vals[i]}`).join(' ');
  const low = [9, 4, 1, 2, 1, 86, 1];
  const plan = ['LV   1       :', 'Bonus        : 50%', 'LV   2 - 155 : STAB 몰빵 128회', 'LV 156 - 170 :', `${C.CHAR_NAME[2]}/${C.STYLE_NAME[2][0]} Bonus: 0 / 0 Point: 0`];
  const read = (last) => { const E = Oresim.createEngine(); const r = E.importLog(plan.concat(last === null ? [] : [last]).join('\r')); return { E, r }; };
  const base = read(null);
  if (!(base.r.ok && base.r.footer && base.r.capped === false && !base.r.error)) return `요약 줄이 없는 글: ${JSON.stringify(base.r)}`;
  const cases = [
    [sum(170, low.map((v, i) => (i === 0 ? CAP[0] + 30 : v))), true],                          // 그 판의 로그 모양: STAB 이 상한 + 30
    [sum(MAX_LV, CAP), false],                                                                  // 상한 그대로
    [sum(MAX_LV + 1, low), true],                                                               // LV 만 상한 + 1
    ...STATS.map((s, k) => [sum(170, low.map((v, i) => (i === k ? CAP[k] + 1 : v))), true]),    // 스탯 하나만 상한 + 1
    [sum(170, low.map((v, i) => (i === 5 ? CAP[5] + 1 : v))) + ' 메모', true],                 // 끝에 덧붙인 말은 상관없다
    [sum(170, low.map((v, i) => (i === 5 ? CAP[5] + 1 : v))).replace(':', '\uFF1A'), true],    // 전각 콜론
    [sum(170, low.map((v, i) => (i === 0 ? CAP[0] + 30 : v))).replace(' AGI 1', ''), false],   // 이름이 빠짐
    [sum(170, low.map((v, i) => (i === 0 ? CAP[0] + 30 : v))).replace('STAB', 'stab'), false], // 이름이 다름
    [sum(170, low.map((v, i) => (i === 0 ? CAP[0] + 30 : v))).replace(/STAB (\d+) HACK (\d+)/, 'HACK $2 STAB $1'), false],   // 순서가 다름
    [sum(170, low.map((v, i) => (i === 0 ? CAP[0] + 30 : v))).replace('LV:', 'LV :'), false],  // 줄 머리가 'LV' 하나가 아님
    [sum(170, low.map((v, i) => (i === 0 ? 'abc' : i === 1 ? -999 : v))), false],             // 수가 아니거나 음수
  ];
  for (const [last, want] of cases) {
    const { E, r } = read(last);
    if (r.capped !== want || r.error || !r.footer) return `"${last}": importLog ${JSON.stringify(r)} / 기대 capped ${want}`;
    const ra = H.createOracle().importLog(plan.concat([last]).join('\r'));
    if (ra.capped !== want) return `"${last}": 원본(하네스)의 capped ${ra.capped} / 기대 ${want}`;
    const d = diffKeys(core(base.E), core(E));
    if (d.length || E.exportLog() !== base.E.exportLog()) return `"${last}": 요약 줄이 계획을 바꿨다: ${d.slice(0, 3).join('; ')}`;
  }
  // 요약 줄이 마지막 줄이 아니어도 본다(끝에 빈 줄이나 덧붙인 말이 있는 글, 캐릭터/타입 줄 앞이나 맨 앞에 둔 글)
  const over = cases[0][0];
  const placed = [
    ['요약 줄 뒤의 빈 줄', plan.concat([over, ''])],
    ['요약 줄 뒤에 덧붙인 말', plan.concat([over, '고마워요'])],
    ['캐릭터/타입 줄 앞의 요약 줄', plan.slice(0, -1).concat([over], plan.slice(-1))],
    ['맨 앞의 요약 줄', [over].concat(plan)],
  ];
  for (const [what, lines] of placed) {
    const text = lines.join('\r');
    const E = Oresim.createEngine();
    const r = E.importLog(text);
    if (r.capped !== true || r.error || !r.footer) return `${what}: importLog ${JSON.stringify(r)} / 기대 capped true`;
    const ra = H.createOracle().importLog(text);
    if (ra.capped !== true) return `${what}: 원본(하네스)의 capped ${ra.capped} / 기대 true`;
    const d = diffKeys(core(base.E), core(E));
    if (d.length || E.exportLog() !== base.E.exportLog()) return `${what}: 요약 줄이 계획을 바꿨다: ${d.slice(0, 3).join('; ')}`;
  }
  return cappedRoundTrip(read(cases[0][0]).E);
});

console.log(`runs/featureSet=${RUNS}  runs ${counts.runs}, steps ${counts.steps}, serialize 확인 ${counts.saves}, preview 확인 ${counts.previews} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
for (const group of Object.keys(FEATURES).concat('special')) {
  const ks = Object.keys(failures).filter((k) => k.startsWith(group + '/'));
  console.log(`  ${group.padEnd(9)} ${ks.length ? ks.map((k) => `${k.split('/')[1]}=${failures[k]}`).join(' ') : 'OK'}`);
}
for (const [k, e] of Object.entries(examples)) {
  console.log(`\n### ${k} — ${e.who}\n   trace: …${e.trace}\n   ${e.detail.slice(0, 6).join('\n   ')}`);
}
if (Object.keys(failures).length) process.exitCode = 1;
