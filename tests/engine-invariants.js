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
 *   FLAGS  importLog 의 footer/typeFound/restarted: 내보낸 로그는 캐릭터/타입 줄을 알아보고, 끝 두 줄을 뺀 로그는 처음부터 읽는다
 *   그 밖에 반복 안전장치(붙여 넣은 로그의 거대한 수가 정확히 빨리 끝나는지, 끝이 없는 입력은 멈추는지),
 *   view()/serialize() 결과를 고쳐도 엔진이 그대로인지, 잘못된 저장 상태 거부.
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
          const v = garbage && chance(0.4) ? { lv: pick([0, 300, 'abc', 7.5]), stats: [pick([0, 999, 'x']), 285, 285], point: pick([-1, 99999, '']), lines: [{ x: E.view().xien.lines[0].x, value: pick(['abc', '-5', 1e21, '']) }] } : randomEdit(E);
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
        if (!(fr.ok && fr.footer && fr.typeFound && !fr.restarted)) fail(group, 'FLAGS', who, [`내보낸 로그: ${JSON.stringify(fr)}`], trace);
        // 끝 두 줄(캐릭터/타입 줄, LV: 줄)을 빼면 지금 고른 캐릭터/타입으로 처음부터 읽는다
        const cut = Oresim.createEngine();
        const fc = cut.importLog(text.split('\r').slice(0, -2).join('\r'));
        if (!(fc.ok && !fc.footer && !fc.typeFound && fc.restarted)) fail(group, 'FLAGS', who, [`끝 두 줄을 뺀 로그: ${JSON.stringify(fc)}`], trace);
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
  ['budget.timesHuge', 'LV 2 - 285 : STAB * 1' + '0'.repeat(400) + ', DEX * 9999', 'LV 2 - 285 : STAB * 999, DEX * 999'],
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
  ['limit.negativeLv', 'Status : -999999999' + STATUS_TAIL + '\rLV -999999998 - 285 : STAB'],
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
special('budget.undoHugeLv', () => {
  const E = Oresim.createEngine();
  E.importLog('Status : 99999999' + STATUS_TAIL);
  E.levelUp(); E.statUp(0);
  const t = Date.now();
  const rs = [E.undo(), E.redo(), E.undo(true), E.redo(true)];
  if (rs.some((r) => r.error)) return '되돌리기가 끝나지 않았다';
  return Date.now() - t > 1000 ? '되돌리기가 오래 걸렸다' : null;
});
// 최고 레벨에서 포인트가 모자란 대시: ok: false, 소리 없음, 상태 그대로(로그 상자만 원본처럼 새로 쓰일 수 있다)
special('dash.noop', () => {
  const E = Oresim.createEngine();
  E.editCommit({ lv: 285, point: 0, stats: [285, 285, 284, 10, 10, 10, 10] });
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

console.log(`runs/featureSet=${RUNS}  runs ${counts.runs}, steps ${counts.steps}, serialize 확인 ${counts.saves}, preview 확인 ${counts.previews} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
for (const group of Object.keys(FEATURES).concat('special')) {
  const ks = Object.keys(failures).filter((k) => k.startsWith(group + '/'));
  console.log(`  ${group.padEnd(9)} ${ks.length ? ks.map((k) => `${k.split('/')[1]}=${failures[k]}`).join(' ') : 'OK'}`);
}
for (const [k, e] of Object.entries(examples)) {
  console.log(`\n### ${k} — ${e.who}\n   trace: …${e.trace}\n   ${e.detail.slice(0, 6).join('\n   ')}`);
}
if (Object.keys(failures).length) process.exitCode = 1;
