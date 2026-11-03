#!/usr/bin/env node
/*
 * 웹 화면 차등 시험(진짜 브라우저): web/index.html 을 file:// 로 Chromium(Playwright)에 열고 진짜 입력(키, 클릭, 타자)으로만
 * 움직인다. 같은 조작을 원본(tests/harness.js 의 H.createOracle(): 원본 AS3 를 헤드리스로 실행)에도 넣고, 조작마다 화면이
 * 보여 주는 것(DOM 의 글자)이 원본의 상태와 같은지 본다.
 *   - 캐릭터/타입, LV, POINT, 일곱 스탯의 값과 필요 포인트(와 비용이 오르는 값), HP/MP/SP 의 값과 범위, 보너스 칸과 보너스 기록,
 *     되돌리기/다시 실행/레벨업·+1 단추가 켜져 있는지, 주력 계열의 선택과 고를 수 있는 줄, ▲ 표시와 '직전 조작',
 *     제목·아래 바·초기화 안내의 이름과 숫자, 로그 표의 줄, 화면 글자에 NaN/undefined 가 없는지, 콘솔이 깨끗한지
 *   - '복사'가 클립보드에 넣는 글자(재분배 로그 탭과 육성 가이드 탭) = 원본의 logOut()/recipe() 글자(줄바꿈 \r\n)
 *   - 대시 단추의 'N까지'(와 aria-label 의 레벨업 횟수·LV) = 원본에서 그 대시가 실제로 끝나는 곳. 몇 조작마다(WEBDIFF_PROBE)
 *     원본을 처음부터 다시 돌린 사본에서 일곱 대시와 다음 레벨업을 실제로 해 보고, 대시·레벨업을 할 때마다 바로 앞 화면의
 *     이름표와 '다음 레벨업'을 원본이 실제로 한 결과와 맞춘다
 *   - 확인 창의 글(지울 계획과 바꿀 계획의 이름·LV), 로그 불러오기 뒤의 안내(와 그 색조), 붙여넣은 로그 칸을 비우는지
 *   - POINT 밑 한 줄('STAB 3회(12) 찍으면 2 남음' 등, 화면이 셈한 말)을 원본 사본에서 +1 을 그만큼 눌러 맞춘다
 *   - 육성 가이드 탭이 보이면 그 패널(그린 글자, 제목, 재분배 순서의 줄 수, 가이드 안 로그 표)
 * 너비 셋을 돌아가며 쓴다: 1440×900(옆 목록, 상단 바), 1024×768(아래 바), 390×844(아래 바, 캐릭터 시트의 편집·초기화).
 * 조작: L, S H I F M X A, Shift+그 키, ←/→(Shift 포함), +1·대시·레벨업·되돌리기·다시 실행 클릭(Shift 클릭 포함), 보너스 칸
 * 타자(반올림·범위 맞춤이 필요한 값, 숫자로 읽을 수 없는 값; Enter/Tab)와 −/+, 주력 계열 줄 클릭(고를 수 있는 줄과 없는 줄)과
 * ↑/↓, 캐릭터·타입 바꾸기(옆 목록, 캐릭터 시트; 확인 창의 바꾸기/취소/Esc/바깥), 스탯 초기화, 스탯 편집(T·단추·시트, 범위 밖 값,
 * 소수; 적용/Enter/취소/Esc), 붙여넣은 로그 불러오기(제 로그, 푸터 없는 로그, 망가진 로그, 다른 캐릭터의 로그, 일본어판 로그,
 * 읽을 줄 없는 글, 빈 칸, 상한이 285이던 판의 로그; 붙여넣기 단추/Ctrl+V/타자 → 단추/P/Ctrl+Enter), 탭 바꾸기(클릭, G), 복사, 새로 고침(자동 저장).
 * 원본에는 화면에서 한 조작을 사람이 원본에서 했을 입력 그대로 넣는다(화면이 엔진에 보낸 값을 받아 쓰지 않는다). 화면에서 꺼진
 * 단추를 누르거나 확인 창에서 취소하면 원본에는 아무것도 넣지 않는다.
 * 어긋나면 seed, 몇 번째 조작인지, 조작 목록, 다른 칸을 찍고 그 seed 를 멈춘다(다음 seed 는 계속). 하나라도 있으면 종료 코드 1.
 * 세어 두기만 하는 것(차이가 아니다, 끝에 찍는다):
 *   refused-but-changed 불러오기가 원본처럼 중간에 멈춘(예: 'Bonus :75%') 뒤에는 받아들여지지 않은 ←/→/대시도 원본·엔진이
 *                       updateStatus 로 비용 단계 등을 바로잡는다. 화면도 그때 다시 그리므로 그 뒤 화면을 원본과 그대로 맞춘다
 * 저장소는 npm 을 쓰지 않는다: playwright 를 불러오지 못하거나 브라우저를 띄우지 못하면 그렇게 말하고 0 으로 끝낸다.
 * 사용법(저장소 맨 위에서): node tests/web-diff.js [seeds=20] [steps=150] [firstSeed=1]
 *   WEBDIFF_PROBE=n    n 조작마다 일곱 대시와 다음 레벨업을 원본 사본에서 실제로 해 본다(기본 5, 0 이면 끈다)
 *   WEBDIFF_SCRIPTS=0  정해 둔 순서(로아미니, 최고 레벨, 스탯 상한, 스탯 편집, 편집을 넘는 되돌리기, 불러오기 뒤 되돌리기 등)를 건너뛴다
 *   WEBDIFF_SCRIPTS=only  정해 둔 순서만 돌린다(only:글자 이면 이름에 그 글자가 든 순서만)
 *   WEBDIFF_EMPTY=1    스탯 편집에서 칸을 비우는 입력도 넣는다(화면도 원본 Flex 처럼 빈 칸을 그 칸의 최솟값으로 읽는다)
 *   WEBDIFF_VERBOSE=1  조작을 하나씩 찍는다
 *   WEBDIFF_SHOTS=폴더  어긋난 곳의 화면을 그 폴더에 남긴다
 *   WEBDIFF_WEB=폴더    web/ 대신 그 폴더의 index.html 을 연다(일부러 고장 낸 화면을 이 시험이 잡아내는지 볼 때)
 *   WEBDIFF_TRACE=폴더  어긋나면 화면 조작과 원본에 넣은 조작(JSON)을 그 폴더에 남긴다(원본만으로 다시 재현할 때)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const H = require('./harness');
const JA_LOGS = require('./fixtures/ja-era-logs');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (_) {
  console.log('web-diff: playwright 를 불러오지 못해 건너뜁니다(이 저장소는 npm 을 쓰지 않습니다). playwright 가 있는 곳에서 다시 돌리세요.');
  process.exit(0);
}

const SEEDS = +(process.argv[2] || 20);
const STEPS = +(process.argv[3] || 150);
const FIRST = +(process.argv[4] || 1);
const PROBE_EVERY = process.env.WEBDIFF_PROBE === undefined ? 5 : +process.env.WEBDIFF_PROBE;
const SCRIPTS = process.env.WEBDIFF_SCRIPTS || '1';
const WITH_EMPTY = process.env.WEBDIFF_EMPTY === '1';
const VERBOSE = !!process.env.WEBDIFF_VERBOSE;
const SHOTS = process.env.WEBDIFF_SHOTS || '';
const PAGE_URL = pathToFileURL(path.join(process.env.WEBDIFF_WEB ? path.resolve(process.env.WEBDIFF_WEB) : path.join(H.REPO, 'web'), 'index.html')).href;

// ---- 표와 말 ----
const STATS = ['STAB', 'HACK', 'INT', 'DEF', 'MR', 'DEX', 'AGI'];
const SHORTCUT = ['S', 'H', 'I', 'F', 'M', 'X', 'A'];
// 최고 레벨과 일곱 스탯의 상한: 원본 표(oresim-const.as)에서 읽는다. 상한 둘레의 값(바로 아래, 그 값, 바로 위)도 이것으로 만든다
const TABLES = H.createSim(H.REPO, { init: false });
const MAX_LV = TABLES.MAX_LEVEL;
const STAT_CAP = STATS.map((_, i) => TABLES.MAX_STATUS[i]);
const CAP_EDGE = [...new Set([MAX_LV, ...STAT_CAP])].flatMap((m) => [m - 1, m, m + 1]);
// 초록 숫자(원본 updateStatus 의 식)가 스탯 상한과 같아지는 가장 높은 LV 와 그때의 가장 작은 값(상한 255 에서는 LV 229, 230):
// 그 단계는 찍을 수 없으므로 화면은 '상한 N'이라 한다. 정해 둔 순서 하나가 이 자리를 지난다
const CAP_STEP = (() => {
  for (let lv = MAX_LV; lv >= 1; lv--) {
    for (let v = 1; v < STAT_CAP[0]; v++) if (Math.ceil(25 - lv / 5) + 25 * Math.floor((lv + 5 * v) / 125) === STAT_CAP[0]) return { lv, v };
  }
  return null;
})();
const NB = '\u00a0';
const NUM = new Intl.NumberFormat('ko-KR');
const fmt = (n) => NUM.format(Number(n));
const ch = (...codes) => String.fromCharCode(...codes);
const FW = { ',': ch(0xff0c), ':': ch(0xff1a), '-': ch(0xff0d) };   // 전각 쉼표·콜론·하이픈(저장소에 전각 글자를 두지 않는다)
const looksJapanese = (t) => /[\u3040-\u30FF\uFF66-\uFF9F]/.test(t);
// 으로/로(받침이 없거나 ㄹ이면 '로')
const ro = (w) => { const c = w.charCodeAt(w.length - 1); if (c < 0xac00 || c > 0xd7a3) return '로'; const f = (c - 0xac00) % 28; return f === 0 || f === 8 ? '로' : '으로'; };
const splitLine = (name) => { const m = String(name).match(/^(.+?)\s+([A-Z]+)\/([A-Z]+)$/); return m ? { line: m[1], main: m[2], bonus: m[3] } : { line: name, main: null, bonus: null }; };
const KEEP_IT = '남겨 두려면 먼저 링크 복사를 하세요.';
const JA_AFTER = '일본어판에서 만든 로그로 보입니다. 캐릭터·계열 이름이 달라 결과가 원래 계획과 다를 수 있습니다.';
// 타입 이름을 알아보지 못한 붙여넣은 로그의 안내 끝에 붙는 고치는 법(승인된 문구)
const FIX_TYPE = '다른 타입이었다면 로그 끝의 캐릭터/타입 줄을 지금 이름(예: 루시안/베기형)으로 고쳐 다시 불러오세요.';
// 글에 지금 상한을 넘는 값이 있어 상한에 맞춰 읽은 불러오기(원본 하네스 importLog 의 capped). 읽기가 중간에 멈췄으면(error) 말하지 않는다
const cappedRead = (r) => !!(r && r.capped && !r.error);
const capWords = (done) => `LV나 스탯이 상한(${fmt(MAX_LV)})을 넘어 상한에 맞춰 ${done ? '읽었습니다' : '읽습니다'}.`;
const STEP_ACTS = new Set(['levelUp', 'statUp', 'dash', 'undo', 'redo', 'editCommit']);
// 화면 너비 셋: 넓은 화면(옆 목록, 상단 바), 중간(아래 바, 제목 줄의 타입·편집·초기화), 휴대폰(아래 바, 캐릭터 시트가 타입·편집·초기화를 가진다)
const LAYOUTS = { wide: { width: 1440, height: 900 }, mid: { width: 1024, height: 768 }, phone: { width: 390, height: 844 } };
const NEW_PLAN = new Set(['setChar', 'setType', 'reset']);

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
  const weighted = (list) => { let x = rnd() * list.reduce((a, [w]) => a + w, 0); for (const [w, v] of list) { if ((x -= w) < 0) return v; } return list[list.length - 1][1]; };
  return { rnd, ri, pick, chance, weighted };
}

// ---- 원본: 조작마다 기록해 두고(사본은 처음부터 다시 돌려 만든다) ----
function makeOracle(replay) {
  const A = H.createOracle();
  const trace = [];
  const O = { A, S: A.S, trace, call(f, ...args) { trace.push([f, ...args]); return A[f](...args); } };
  for (const [f, ...args] of replay || []) O.call(f, ...args);
  return O;
}
function fork(trace) {
  const B = H.createOracle();
  for (const [f, ...args] of trace) B[f](...args);
  return B;
}

// 원본 상태에서 화면이 보여 줘야 할 값(엔진 view() 의 모양을 원본의 컨트롤 글자에서 직접)
function oracleNow(S) {
  const num = (id) => Number(S[id].text);
  const lv = num('lv');
  const stats = STATS.map((key, i) => ({
    key, value: num(`s${i}`), cost: num(`p${i}`), next: num(`s${i}L`),
    canUp: !!S[`s${i}up`].visible, canDash: !!S[`s${i}dup`].visible, atCap: H.as3ParseInt(S[`s${i}`].text) >= S.MAX_STATUS[i],
  }));
  const nextLog = S.log[S.logindex + 1];
  // 스탯 편집으로 시작한 계획: 이 계획의 시작 레벨(log[0][0]) 칸이 's' 로 시작한다(원본 logOut 이 Status 줄을 쓰는 조건)
  const startMark = S.log[0] ? S.stLog[S.log[0][0] - 1] : undefined;
  const edited = typeof startMark === 'string' && startMark.charAt(0) === 's';
  const c = S.charCB.selectedIndex;
  // 필요 포인트(p_i)와 초록 숫자(s_iL)가 옛 값으로 남은 상태: 지금 LV·값으로 원본 updateStatus() 가 셈할 값과 다르다(중간에 멈춘
  // 불러오기 뒤, 다음에 updateStatus() 를 도는 조작까지). 화면은 그때 'N부터 M' 대신 원본처럼 초록 숫자만 보인다
  const dnp = S.DEFAULT_NEED_POINT[c] && S.DEFAULT_NEED_POINT[c][S.styleCB.selectedIndex];
  const stale = !!dnp && STATS.some((_, i) => {
    const lvN = H.as3ParseInt(S.lv.text);
    const cost = dnp[i] + Math.floor((lvN + H.as3ParseInt(S[`s${i}`].text) * 5) / 125);
    const next = Math.ceil(25 - lvN / 5) + (H.as3ParseInt(String(cost)) - dnp[i]) * 25;
    return !Object.is(Number(S[`p${i}`].text), cost) || !Object.is(Number(S[`s${i}L`].text), next);
  });
  return {
    char: c, type: S.styleCB.selectedIndex,
    charName: S.charCB.selectedItem ? S.charCB.selectedItem.label : '',
    typeName: S.styleCB.selectedItem ? S.styleCB.selectedItem.label : '',
    types: S.STYLE_NAME[c] ? S.STYLE_NAME[c].slice() : [],
    startLv: c === 15 ? 200 : 1,
    lv, point: num('s11'), stats,
    hp: { value: num('s7'), min: num('s7mi'), max: num('s7mx') },
    mp: { value: num('s8'), min: num('s8mi'), max: num('s8mx') },
    sp: { value: num('s9'), min: num('s9mi'), max: num('s9mx') },
    bonus: { rate: S.bonusNS.value, achieved: num('tbonus'), levelUps: num('tlvup'), effective: S.pbonus.text },
    xien: {
      selected: S.xienCB.selectedItem ? S.xienCB.selectedItem.data : null,
      lines: S.xienList.source.map((it, k) => ({ x: it.data, name: it.label, selectable: S.xienCB.colors[k] !== 0 })),
    },
    canUndo: S.logindex > 0, canRedo: !!(nextLog && nextLog[0] > 0), actions: S.logindex, edited, stale,
  };
}
// 화면이 지우기 전에 묻는 계획: 조작이 있거나, 되돌려 둔 조작(다시 실행)이 있거나, 스탯 편집으로 시작한 계획
const hasWork = (o) => o.actions > 0 || o.canRedo || o.edited;
// 설정 줄(Bonus, Xien)만 읽어 계획을 그대로 둔 불러오기(캐릭터/타입 줄도 LV 줄도 없다): 묻지 않고, 설정 바꾸기처럼 그린다
const keptPlan = (r) => !!(r && r.ok && !r.footer && !r.restarted);
// 원본이 실제로 한 레벨업을 '다음 레벨업' 미리보기의 모양으로
function realPreview(o0, o1, ok) {
  if (!ok) return null;
  return { lv: o1.lv, point: o1.point - o0.point, stats: o1.stats.map((s, k) => s.value - o0.stats[k].value), bonus: o1.bonus.achieved > o0.bonus.achieved };
}
const realDash = (o0, o1, ok, i) => (ok ? { value: o1.stats[i].value, lv: o1.lv, levelUps: o1.lv - o0.lv } : null);
const planNow = (o) => `${o.charName}/${o.typeName}, LV${NB}${fmt(o.lv)}${o.canRedo ? ', 다시 실행할 조작 있음' : ''}`;
// 화면 글의 낱말 잇개(U+2060, 괄호 앞뒤에서 줄이 바뀌지 않게 넣는 보이지 않는 글자)는 빼고 맞춘다
const noWJ = (t) => (typeof t === 'string' ? t.replace(/\u2060/g, '') : t);
const chgStr = (n) => (!n ? null : `${n > 0 ? '+' : '-'}${fmt(Math.abs(n))}`);

// ---- 화면 읽기(브라우저 안에서 돈다): 사람이 보는 글자와 단추가 켜져 있는지 ----
function readScreen() {
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const t = (el) => (el ? el.textContent : null);
  const off = (el) => (el ? el.disabled === true || el.getAttribute('aria-disabled') === 'true' : null);
  const chgOf = (root) => {
    const c = root && root.querySelector('.chg');
    if (!c) return null;
    const n = Array.from(c.childNodes).find((k) => k.nodeType === 3);
    return (c.classList.contains('down') ? '-' : '+') + (n ? n.textContent : '?');
  };
  const lead = qa('#strip-lead .cell');
  const vit = qa('#strip-vitals .cell');
  const pressed = (sel) => qa(`${sel} [data-type]`).findIndex((b) => b.getAttribute('aria-pressed') === 'true');
  const cur = (sel) => { const e = q(`${sel} [aria-current="true"]`); return e ? +e.dataset.char : -1; };
  const last = q('#next-half .last');
  const ae = document.activeElement;
  return {
    charName: t(q('#char-name')), typeLabel: t(q('#type-label')),
    typePressed: pressed('#types'), sheetTypePressed: pressed('#sheet-types'),
    typeButtons: qa('#types [data-type]').map((b) => b.textContent),
    charCurrent: cur('#char-list'), castCurrent: cur('#cast'),
    scope: `${t(q('#open-chars .scope-name'))}/${t(q('#open-chars .scope-type'))}`,
    title: document.title, resetWhat: t(q('#reset-what')),
    point: lead[0] ? t(lead[0].querySelector('.fig')) : null, pointChg: lead[0] ? chgOf(lead[0].querySelector('.cell-value')) : null,
    pointSub: lead[0] ? t(lead[0].querySelector('.cell-sub')) : null,
    lv: lead[1] ? t(lead[1].querySelector('.fig')) : null, lvUnit: lead[1] ? t(lead[1].querySelector('.unit')) : null,
    abPoint: t(q('#ab-point')), abLv: t(q('#ab-lv')),
    vitals: vit.map((c) => ({ label: t(c.querySelector('.cell-label')), value: t(c.querySelector('.fig')), chg: chgOf(c.querySelector('.cell-value')), range: t(c.querySelector('.cell-sub')) })),
    stats: qa('#stats .srow[data-key]').map((r) => {
      const up = r.querySelector('.up');
      const dash = r.querySelector('.dash');
      const cost = r.querySelector('.s-cost');
      return {
        key: r.dataset.key, value: t(r.querySelector('.s-val > span')), chg: chgOf(r.querySelector('.s-chg')),
        cost: cost && cost.lastChild ? cost.lastChild.textContent : null, next: t(r.querySelector('.s-next')),
        upOff: off(up), upLabel: up.getAttribute('aria-label'),
        dashOff: off(dash), dest: t(dash.querySelector('.dest')), dashLabel: dash.getAttribute('aria-label'),
      };
    }),
    bonusField: q('#bonus') ? q('#bonus').value : null, bonusFocused: ae === q('#bonus'),
    bonusRecord: t(q('#bonus-record')),
    stepDownOff: off(q('[data-step="-5"]')), stepUpOff: off(q('[data-step="5"]')),
    nextMeta: t(q('#next-half .half-head .meta')),
    gains: qa('#next-half .gains > div').map((d) => ({ cls: d.className, dt: t(d.querySelector('dt')), dd: t(d.querySelector('dd')) })),
    last: last && !last.hidden ? last.textContent : null,
    xienMeta: t(q('#xien-meta')),
    xien: qa('.xien-opt').map((l) => { const i = l.querySelector('input'); return { x: +l.dataset.x, name: t(l.querySelector('.xien-name')), stats: t(l.querySelector('.xien-stats')), checked: i.checked, disabled: i.disabled }; }),
    undoOff: off(q('#undo')), redoOff: off(q('#redo')), levelupOff: off(q('#levelup')),
    abUndoOff: off(q('.actionbar [data-act="undo"]')), abRedoOff: off(q('.actionbar [data-act="redo"]')), abUpOff: off(q('.actionbar [data-act="levelUp"]')),
    logSrc: q('#log-table') ? q('#log-table').dataset.src : null,
    logRows: qa('#log-table tbody tr').map((tr) => ({ cls: tr.className, lvc: t(tr.querySelector('.lvc')), what: t(tr.querySelector('.what')) })),
    logSum: q('#log-sum') && !q('#log-sum').hidden ? t(q('#log-sum')) : null,
    guideSelected: q('#tab-guide').getAttribute('aria-selected') === 'true', copyOff: off(q('#copy')),
    pasteValue: q('#paste-text').value, loaderOpen: q('.loader').classList.contains('is-open'),
    loadMsg: t(q('#load-msg')) && t(q('#load-msg')).replace(/\u2060/g, ''), loadTone: q('#load-msg').dataset.tone || '',
    confirmOpen: q('#confirm').open, editOpen: q('#edit-dialog').open, sheetOpen: q('#char-sheet').open,
    notice: q('#notice').hidden ? null : t(q('#notice-text')),
    savedPill: t(q('#saved')),
    active: ae === document.body ? 'BODY' : ae ? `${ae.tagName}${ae.id ? '#' + ae.id : ''}` : null,
    bad: (document.body.innerText.match(/NaN|undefined|\[object|Infinity/g) || []).slice(0, 5),
  };
}

// ---- 기대값: 원본 상태(o)와 ▲ 기준(marks)에서 화면의 글자를 만든다 ----
function expectNext(o, p) {
  if (!p) return { meta: '최고 레벨', gains: [{ cls: 'gains-done', dt: '더 받을 레벨업 보상 없음', dd: `LV${NB}${fmt(MAX_LV)}, 최고 레벨` }] };
  const sel = o.xien.lines.find((l) => l.x === o.xien.selected) || o.xien.lines[0];
  const ln = splitLine(sel ? sel.name : '');
  const mi = STATS.indexOf(ln.main), bi = STATS.indexOf(ln.bonus);
  const gains = [{ cls: '', dt: '레벨업 보상', dd: `POINT +${fmt(p.point)}` }];
  if (mi >= 0) {
    const n = p.stats[mi];
    gains.push(n ? { cls: '', dt: `${ln.line} · 매 레벨`, dd: `${ln.main} +${n}` } : { cls: 'none', dt: o.stats[mi].atCap ? `${ln.line} · 상한` : `${ln.line} · 매 레벨`, dd: `${ln.main} +0` });
  }
  if (bi >= 0) {
    const n = p.stats[bi];
    gains.push(p.bonus && n ? { cls: '', dt: `보너스 받음 · ${o.bonus.rate}%`, dd: `${ln.bonus} +${n}` } : { cls: 'none', dt: p.bonus ? '보너스 · 상한' : `보너스 없음 · ${o.bonus.rate}%`, dd: `${ln.bonus} +0` });
  }
  return { meta: `LV${NB}${fmt(p.lv)}`, gains };
}
function lastWordsOf(marks, o) {
  const { prev, act, args } = marks;
  const lvs = prev.lv !== o.lv ? `LV${NB}${fmt(prev.lv)} → ${fmt(o.lv)}` : '';
  switch (act) {
    case 'levelUp': return `레벨업 ${lvs}`;
    case 'statUp': return `${STATS[args[0]]} +1 (POINT${NB}${fmt(prev.point - o.point)} 사용)`;
    case 'dash': { const i = args[0]; return `${STATS[i]} ${fmt(prev.stats[i].value)} → ${fmt(o.stats[i].value)} 찍기${lvs ? ` · 레벨업 ${fmt(o.lv - prev.lv)}회` : ''}`; }
    case 'undo': return `되돌리기${args[0] ? '(대시 단위)' : ''}${lvs ? ` ${lvs}` : ''}`;
    case 'redo': return `다시 실행${args[0] ? '(대시 단위)' : ''}${lvs ? ` ${lvs}` : ''}`;
    case 'editCommit': return '스탯 편집';
    default: return null;
  }
}
const dashSaid = (key, lv, d) => `${key} ${fmt(d.value)}까지 찍기${d.levelUps > 0 ? `, 레벨업 ${fmt(d.levelUps)}번 (LV${NB}${fmt(lv)} → ${fmt(d.lv)})` : ''}`;

// 화면(scr)과 원본(o)을 맞춘다. probe = { dash: [7], preview } 이면 대시 이름표와 다음 레벨업까지
function compareScreen(scr, o, marks, probe, msgs) {
  const eq = (name, got, want) => { if (got !== want) msgs.push(`${name}: 화면 ${JSON.stringify(got)} / 원본 ${JSON.stringify(want)}`); };
  eq('캐릭터', scr.charName, o.charName);
  eq('타입', scr.typeLabel, o.typeName);
  eq('타입 단추(눌림)', scr.typePressed, o.type);
  eq('타입 단추 이름', scr.typeButtons.join(','), o.types.join(','));
  eq('시트 타입 단추(눌림)', scr.sheetTypePressed, o.type);
  eq('옆 목록의 지금 캐릭터', scr.charCurrent, o.char);
  eq('시트의 지금 캐릭터', scr.castCurrent, o.char);
  eq('범위 단추', scr.scope, `${o.charName}/${o.typeName}`);
  eq('문서 제목', scr.title, `${o.charName} ${o.typeName} LV ${o.lv} · 나만의 재분배 시뮬레이터`);
  eq('초기화 안내', scr.resetWhat, `${o.charName}/${o.typeName} LV ${o.startLv} 시작 상태로 되돌립니다. 바꾸기 전에 확인합니다.`);
  eq('POINT', scr.point, fmt(o.point));
  eq('LV', scr.lv, fmt(o.lv));
  eq('LV 최고', scr.lvUnit, `/${NB}${fmt(MAX_LV)}`);
  eq('아래 바 POINT', scr.abPoint, fmt(o.point));
  eq('아래 바 LV', scr.abLv, fmt(o.lv));
  [['HP', o.hp], ['MP', o.mp], ['SP', o.sp]].forEach(([k, x], j) => {
    const v = scr.vitals[j] || {};
    eq(`${k} 이름`, v.label, k);
    eq(`${k} 값`, v.value, fmt(x.value));
    eq(`${k} 범위`, v.range, `범위 ${fmt(x.min)}${NB}~ ${fmt(x.max)}`);
  });
  o.stats.forEach((st, i) => {
    const s = scr.stats[i] || {};
    const cap = STAT_CAP[i];
    eq(`${st.key} 줄`, s.key, st.key);
    eq(`${st.key} 값`, s.value, fmt(st.value));
    eq(`${st.key} 필요 포인트`, s.cost, String(st.cost));
    // 'N부터 M'(초록 숫자에서 비용이 지금 + 1): 초록 숫자가 옛 값이면 원본처럼 숫자만. 상한(값으로 정해진다)은 그때도 '상한 N'.
    // 초록 숫자가 상한과 같으면(상한 255 에서는 LV 100~104·225~229 의 230~254) 그 단계는 찍을 수 없으므로 '상한 N'
    eq(`${st.key} 비용이 오르는 값`, s.next, st.atCap ? `상한 ${fmt(cap)}` : o.stale ? fmt(st.next) : st.next >= cap ? `상한 ${fmt(cap)}` : `${fmt(st.next)}부터${NB}${st.cost + 1}`);
    eq(`${st.key} +1 꺼짐`, s.upOff, !st.canUp);
    eq(`${st.key} +1 이름`, s.upLabel, `${st.key} +1, ${st.cost}포인트`);
    if (!st.canDash) eq(`${st.key} 대시 꺼짐(원본에서 숨은 단추)`, s.dashOff, true);
    if (s.dashOff) {
      eq(`${st.key} 꺼진 대시 이름표`, s.dest, '대시');
      eq(`${st.key} 꺼진 대시 aria-label`, s.dashLabel, `${st.key} 대시`);
    } else if (!/^[\d,]+까지$/.test(s.dest || '')) msgs.push(`${st.key} 대시 이름표: 화면 ${JSON.stringify(s.dest)}`);
    if (probe) {
      const d = st.canDash ? probe.dash[i] : null;
      eq(`${st.key} 대시 꺼짐(원본 사본에서 실제로 대시)`, s.dashOff, d === null);
      if (d) {
        eq(`${st.key} 대시 이름표(원본 사본에서 실제로 대시)`, s.dest, `${fmt(d.value)}까지`);
        eq(`${st.key} 대시 aria-label`, s.dashLabel, dashSaid(st.key, o.lv, d));
      }
    }
  });
  eq('보너스 칸', scr.bonusFocused ? String(o.bonus.rate) : scr.bonusField, String(o.bonus.rate));
  eq('보너스 기록', scr.bonusRecord, `지금까지 보너스 ${fmt(o.bonus.achieved)} / ${fmt(o.bonus.levelUps)}회 · ${o.bonus.effective}`);
  eq('보너스 − 꺼짐', scr.stepDownOff, o.bonus.rate <= 0);
  eq('보너스 + 꺼짐', scr.stepUpOff, o.bonus.rate >= 100);
  eq('되돌리기 꺼짐', scr.undoOff, !o.canUndo);
  eq('다시 실행 꺼짐', scr.redoOff, !o.canRedo);
  eq('레벨업 꺼짐', scr.levelupOff, o.lv >= MAX_LV);
  eq('아래 바 되돌리기 꺼짐', scr.abUndoOff, !o.canUndo);
  eq('아래 바 다시 실행 꺼짐', scr.abRedoOff, !o.canRedo);
  eq('아래 바 레벨업 꺼짐', scr.abUpOff, o.lv >= MAX_LV);
  // 주력 계열
  const sel = scr.xien.filter((x) => x.checked).map((x) => x.x);
  eq('주력 계열(고른 줄)', sel.join(','), String(o.xien.selected));
  eq('주력 계열 줄', scr.xien.map((x) => `${x.x}:${x.name}${x.stats ? ' ' + x.stats : ''}`).join('|'), o.xien.lines.map((l) => { const s = splitLine(l.name); return `${l.x}:${s.line}${s.main ? ` ${s.main}/${s.bonus}` : ''}`; }).join('|'));
  eq('주력 계열 꺼진 줄', scr.xien.filter((x) => x.disabled).map((x) => x.x).join(','), o.xien.lines.filter((l) => !l.selectable && l.x !== o.xien.selected).map((l) => l.x).join(','));
  const nSel = o.xien.lines.filter((l) => l.selectable).length;
  eq('주력 계열 머리말', scr.xienMeta, nSel === o.xien.lines.length ? `지금 ${nSel}개 선택 가능` : `${o.xien.lines.length}개 중 ${nSel}개 선택 가능`);
  // ▲ 표시와 직전 조작
  const pv = marks && marks.prev;
  eq('POINT ▲', scr.pointChg, pv ? chgStr(o.point - pv.point) : null);
  [['HP', 'hp'], ['MP', 'mp'], ['SP', 'sp']].forEach(([k, f], j) => eq(`${k} ▲`, (scr.vitals[j] || {}).chg, pv ? chgStr(o[f].value - pv[f].value) : null));
  o.stats.forEach((st, i) => eq(`${st.key} ▲`, (scr.stats[i] || {}).chg, pv ? chgStr(st.value - pv.stats[i].value) : null));
  const words = pv ? lastWordsOf(marks, o) : null;
  eq('직전 조작', scr.last, words ? `직전 조작: ${words}` : null);
  // 다음 레벨업(원본 사본에서 실제로 레벨업한 결과)
  if (probe) {
    const want = expectNext(o, probe.preview);
    eq('다음 레벨업 LV', scr.nextMeta, want.meta);
    eq('다음 레벨업 보상', JSON.stringify(scr.gains), JSON.stringify(want.gains));
  }
  if (scr.bad.length) msgs.push(`화면 글자에 ${scr.bad.join(', ')}`);
}

// 로그 표: 원본 로그의 'LV n' 줄과 마지막 두 줄을 제대로 옮겼는지(줄 수, LV 칸, 지금 표지)
function compareLogTable(scr, o, log, msgs) {
  if (scr.logSrc !== log) msgs.push('로그 표가 그린 글자가 원본 logOut() 과 다름');
  const lvLines = log.split('\r').map((l) => l.replace(/\s+$/, '')).map((l) => l.match(/^LV\s+(\d+)(?:\s*-\s*(\d+))?\s*:\s*(.*)$/)).filter(Boolean);
  const rows = scr.logRows.filter((r) => /\blv-row\b/.test(r.cls));
  if (rows.length !== lvLines.length) { msgs.push(`로그 표의 LV 줄 ${rows.length}개 / 원본 로그 ${lvLines.length}줄`); return; }
  lvLines.forEach((m, k) => {
    const want = m[2] ? `${fmt(m[1])}–부터 ${fmt(m[2])}` : fmt(m[1]);
    if (rows[k].lvc !== want) msgs.push(`로그 표 ${k + 1}번째 LV 칸: 화면 ${JSON.stringify(rows[k].lvc)} / 원본 ${JSON.stringify(want)}`);
    const from = +m[1], to = m[2] ? +m[2] : from;
    const now = from <= o.lv && to >= o.lv;
    if (/\bnow\b/.test(rows[k].cls) !== now) msgs.push(`로그 표 ${k + 1}번째 줄의 '지금' 표지: 화면 ${/\bnow\b/.test(rows[k].cls)} / 원본 LV ${o.lv}`);
  });
  const foot = log.split('\r').find((l) => / Bonus: \d+ \/ \d+ Point: \d+$/.test(l));
  if (foot) {
    const m = foot.match(/^(.+?)\/(.+?)\s+Bonus:\s*(\d+)\s*\/\s*(\d+)\s+Point:\s*(\d+)$/);
    const want = `${m[1]}/${m[2]}보너스 ${fmt(m[3])} / ${fmt(m[4])}회POINT ${fmt(m[5])}`;
    if (!scr.logSum || !scr.logSum.startsWith(want)) msgs.push(`로그 끝 요약: 화면 ${JSON.stringify(scr.logSum)} / 원본 ${JSON.stringify(foot)}`);
  }
}

// ---- 망가진 로그 만들기 ----
function garble(R, text, n) {
  const { ri, pick } = R;
  const L = text.split(/\r\n|\r|\n/);
  const OPS = [
    () => { if (L.length > 1) L.splice(ri(L.length), 1); },
    () => { const i = ri(L.length); L.splice(i, 0, L[i]); },
    () => { const i = ri(L.length), j = ri(L.length); const t = L[i]; L[i] = L[j]; L[j] = t; },
    () => { const i = ri(L.length); L[i] = L[i].replace(/\d+/, () => String(pick([0, 1, 2, 5, 30, 150, ...CAP_EDGE, 999]))); },
    () => { const i = ri(L.length); L[i] = L[i].slice(0, ri(L[i].length + 1)); },
    () => { const i = ri(L.length); L[i] = L[i].replace(/STAB|HACK|INT|DEF|MR|DEX|AGI/, () => pick(STATS.concat(['stab', 'HP']))); },
    () => { const i = ri(L.length); L[i] = L[i].replace(pick([':', ',', '-']), (c) => FW[c]); },
    () => { L.splice(ri(L.length + 1), 0, pick(['Bonus        : 75%', 'Bonus        : 33%', 'Bonus        : 103%', 'Bonus :75%', 'Xien         : 검계 STAB/DEX', 'LV  9 - 12 : DEX * 2', 'LV abc : STAB', '안녕하세요'])); },
    () => { const i = ri(L.length); L[i] = L[i].replace(/ \* (\d+)/, () => ` * ${pick([1, 2, 5, 40])}`); },
  ];
  for (let k = 0; k < n; k++) pick(OPS)();
  return L.join('\r\n');
}
const footerless = (text) => text.split(/\r\n|\r|\n/).filter((s) => !/ Bonus: /.test(s) && !/^LV:/.test(s)).join('\r\n');
// 상한이 285이던 판(8e716ce)이 쓴 재분배 로그의 모양. 값은 지금 표의 상한에서 셈한다(상한 255 에서는 그 판의 값 그대로)
//  oldEditLog(type): 스탯 편집으로 LV 최고 레벨+15(270), STAB 상한+25(280), DEX 상한+15(270)에서 시작해 편집 레벨에서 STAB 3번, 보너스 75%,
//    다음 레벨에 DEX·STAB, 그 뒤 최고 레벨+30(285)까지 간 루시안 계획. type: 캐릭터/타입 줄의 타입 이름(그 판의 이름 '베기' 또는 지금 이름)
//  oldPlainLog(): 스탯 편집 없이 최고 레벨+30(285)까지 간 밀라/물리복합 계획(몰빵 줄, 최고 레벨을 넘는 범위 줄)
function oldEditLog(type) {
  const lv = MAX_LV + 15, end = MAX_LV + 30;
  const status = [lv, 10, 50, 0, 0, 0, STAT_CAP[0] + 25, 120, 10, 60, 30, STAT_CAP[5] + 15, 40, 240, 55, 900, 0, 300, 240, 55, 900, 0, 240, 55, 900, 0]
    .concat(Array.from({ length: 50 }, (_, x) => (x === 10 ? 1 : 0)), [50, 1]);
  return [`Status       : ${status.join(', ')}`, `LV ${lv}       : STAB * 3`, 'Bonus        : 75%', `LV ${lv + 1}       : DEX * 15, STAB * 2`, `LV ${lv + 2} - ${end} : `,
    `루시안/${type} Bonus: 11 / 15 Point: 181`, `LV:${end} STAB ${STAT_CAP[0] + 30} HACK 135 INT 10 DEF 71 MR 30 DEX ${STAT_CAP[5] + 30} AGI 40`].join('\r\n');
}
function oldPlainLog() {
  const end = MAX_LV + 30;
  return ['LV   1       :', 'Bonus        : 50%', 'Xien         : 편계 HACK/DEX', `LV   2 - ${MAX_LV - 55} : STAB 몰빵 180회`, `LV ${MAX_LV - 54} - ${MAX_LV - 15} : HACK, DEX`,
    `LV ${MAX_LV - 14} - ${end} : DEX 몰빵 40회`, `밀라/물리복합 Bonus: 142 / ${end - 1} Point: 0`, `LV:${end} STAB 223 HACK ${STAT_CAP[1] + 30} INT 1 DEF 1 MR 2 DEX 201 AGI 2`].join('\r\n');
}
//  oldAllInLog(): 스탯 편집 없이 STAB 을 몰빵해 LV 170 에서 STAB 이 상한 + 30(285)이 된 막시민/물리복합 계획. LV 줄은 모두 상한 안이고
//    상한을 넘는 값은 끝의 LV: 요약 줄에만 있다(그 판이 쓴 로그 그대로. 요약 줄의 STAB 만 지금 표의 상한에서 셈한다)
function oldAllInLog() {
  return ['LV   1       :', 'Bonus        : 50%', 'Xien         : 검계 STAB/DEX', 'LV   2 - 155 : STAB 몰빵 128회', 'LV 156 - 170 : ',
    '막시민/물리복합 Bonus: 84 / 169 Point: 114', `LV:170 STAB ${STAT_CAP[0] + 30} HACK 4 INT 1 DEF 2 MR 1 DEX 86 AGI 1`].join('\r\n');
}

// ---- 한 판(seed 또는 정해 둔 순서): 브라우저 화면과 원본을 같은 조작으로 움직인다 ----
class Divergence extends Error {}

class Run {
  constructor(page, seed, name, layout) {
    this.page = page;
    this.layout = layout || 'wide';
    this.seed = seed;
    this.name = name;
    this.R = makeRng(seed);
    this.O = makeOracle();
    this.ui = [];            // 화면에서 한 조작(사람이 읽는 이름)
    this.marks = null;       // ▲ 표시의 기준
    this.step = 0;
    this.pool = [];
    this.scr = null;         // 바로 앞에 읽은 화면
    this.o = oracleNow(this.O.S);
    this.console = [];
    this.stats = { probes: 0, copies: 0, guideCopies: 0, dialogs: 0, imports: {}, acts: {} };
    this.known = [];         // 세어 두기만 하는 것(차이가 아니다): [종류, 조작 번호, 내용]
  }
  get S() { return this.O.S; }
  note(label) { this.ui.push(label); if (VERBOSE) console.log(`  [${this.name}] #${this.step} ${label}`); }
  count(k) { this.stats.acts[k] = (this.stats.acts[k] || 0) + 1; }
  fail(msgs, where) {
    const e = new Divergence(msgs.join('\n'));
    e.msgs = msgs; e.where = where || '';
    throw e;
  }
  // 원본에 조작 하나. ▲ 기준도 화면처럼 고친다(한 걸음: 그 앞 상태 / 설정과 설정 줄만 읽은 불러오기: 그대로 / 새 계획: 없음).
  // 'refused-but-changed': 원본의 ←/→/대시는 받아들이지 않아도(ok:false) updateStatus() 를 돌린다. 보통은 바뀌는 것이 없지만,
  // 불러오기가 중간에 멈춰 비용·초록 숫자 등이 옛 값으로 남은 상태에서는 그 값들이 바로잡힌다. 화면도 엔진의 상태가 그린 것과
  // 달라지면 앞 걸음의 ▲를 그대로 두고 다시 그리므로 그대로 맞춘다(세어 두기만 한다)
  oc(f, ...args) {
    const before = oracleNow(this.S);
    const r = this.O.call(f, ...args);
    if (r && (r.ok || r.error)) {
      if (STEP_ACTS.has(f)) this.marks = { prev: before, act: f, args };
      else if (NEW_PLAN.has(f) || (f === 'importLog' && r.ok && !keptPlan(r))) this.marks = null;
    } else if (JSON.stringify(oracleNow(this.S)) !== JSON.stringify(before)) {
      this.known.push(['refused-but-changed', this.step, `${f}(${args.join(',')}): 원본·엔진 ok:false 인데 상태가 바뀜(updateStatus), 화면도 다시 그림`]);
    }
    return r;
  }
  // ---- 브라우저 도우미 ----
  async acts() { return this.page.evaluate(() => window.__acts.length); }
  async waitAct(act, since, timeout = 4000) {
    try {
      await this.page.waitForFunction(([a, n]) => window.__acts.slice(n).some((d) => d.act === a), [act, since], { timeout });
    } catch (_) { this.fail([`화면이 '${act}' 조작을 보내지 않았습니다(${timeout}ms)`]); }
  }
  async waitClosed(sel, timeout = 4000) {
    try { await this.page.waitForFunction((s) => !document.querySelector(s).open, sel, { timeout }); } catch (_) { this.fail([`${sel} 창이 닫히지 않았습니다`]); }
    await this.page.waitForTimeout(20);
  }
  async waitOpen(sel, timeout = 3000) {
    try { await this.page.waitForFunction((s) => document.querySelector(s).open, sel, { timeout }); } catch (_) { this.fail([`${sel} 창이 열리지 않았습니다`]); }
  }
  // 단축키가 화면에 가도록: 글자를 쓰는 칸에 초점이 있으면 Esc(화면의 Esc 는 칸에서 나온다)
  async keysReady() {
    const inField = await this.page.evaluate(() => {
      const a = document.activeElement;
      return !!a && a.matches('textarea, input:not([type="radio"]):not([type="checkbox"]):not([type="range"]):not([type="button"]):not([type="submit"])');
    });
    if (inField) await this.page.keyboard.press('Escape');
  }
  // 누르기: 보이는 그 컨트롤을 화면 가운데로 굴린 뒤, 그 자리의 맨 위 요소가 정말 그 컨트롤인지 보고 누른다(휴대폰의 고정된 아래 바나
  // 위 바에 가린 채 누르지 않게). 꺼진 단추(aria-disabled)도 사람처럼 누른다(Playwright 의 기다림을 건너뛴다)
  async tap(sel, opts = {}) {
    const where = await this.page.evaluate((s) => {
      const el = Array.from(document.querySelectorAll(s)).find((x) => x.getClientRects().length);
      if (!el) return { err: 'missing' };
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (!hit || !(hit === el || el.contains(hit) || (el.tagName === 'LABEL' && el.control === hit))) return { err: `가림: ${hit ? `${hit.tagName}#${hit.id}.${hit.className}` : '없음'}` };
      return { x, y };
    }, sel);
    if (where.err) this.fail([`${sel} 를 누를 수 없습니다(${where.err})`]);
    if (opts.modifiers) for (const m of opts.modifiers) await this.page.keyboard.down(m);
    await this.page.mouse.click(where.x, where.y);
    if (opts.modifiers) for (const m of opts.modifiers) await this.page.keyboard.up(m);
  }
  async isOff(sel) { return this.page.evaluate((s) => { const e = Array.from(document.querySelectorAll(s)).find((x) => x.getClientRects().length) || document.querySelector(s); return !e || e.disabled === true || e.getAttribute('aria-disabled') === 'true'; }, sel); }

  // ---- 비교 ----
  async check(opts = {}) {
    const page = this.page;
    let probe = null;
    if (opts.probe) {
      probe = this.probe();
      this.stats.probes++;
    }
    const scr = await page.evaluate(readScreen);
    const o = oracleNow(this.S);
    const msgs = [];
    compareScreen(scr, o, this.marks, probe, msgs);
    const log = this.O.A.exportLog();   // 조회는 상태를 바꾸지 않는다(사본을 다시 돌릴 때 넣지 않는다)
    compareLogTable(scr, o, log, msgs);
    if (probe) this.checkPointSub(scr, o, probe, msgs);
    if (scr.confirmOpen || scr.editOpen || scr.sheetOpen) msgs.push('조작이 끝났는데 창이 열려 있습니다');
    for (const m of this.console.splice(0)) msgs.push(`콘솔: ${m}`);
    if (msgs.length) this.fail(msgs);
    if (scr.guideSelected) await this.guideCheck();
    // 복사: 보이는 탭의 글자가 클립보드로(원본 logOut()/recipe() 의 \r 을 \r\n 으로: 원본 copyPress 와 같은 일)
    if (opts.copy !== false) await this.copyCheck(scr.guideSelected);
    if (opts.both) {
      await this.switchTab(!scr.guideSelected, 'click');
      if (!scr.guideSelected) await this.guideCheck();
      await this.copyCheck(!scr.guideSelected);
      await this.switchTab(scr.guideSelected, 'click');
    }
    this.scr = await page.evaluate(readScreen);
    this.o = o;
  }
  // POINT 밑 한 줄(화면이 엔진 값으로 셈한 말): 'STAB 3회(12) 찍으면 2 남음'이면 원본 사본에서 +1 을 그만큼 눌러 맞춰 본다
  checkPointSub(scr, o, probe, msgs) {
    const t = (scr.pointSub || '').replace(/\u00a0/g, ' ');
    let m;
    const n = (x) => Number(String(x).replace(/,/g, ''));
    if ((m = t.match(/^([A-Z]+) ([\d,]+)회\(([\d,]+)\) 찍으면 ([\d,]+) 남음$/))) {
      const i = STATS.indexOf(m[1]);
      const B = fork(this.O.trace);
      const p0 = Number(B.S.s11.text);
      for (let k = 0; k < n(m[2]); k++) {
        const c = Number(B.S[`p${i}`].text);
        if (c !== o.stats[i].cost) { msgs.push(`POINT 밑 '${t}': ${k + 1}번째 +1 의 비용이 ${c}(화면은 ${o.stats[i].cost}로 셈)`); return; }
        if (!B.statUp(i).ok) { msgs.push(`POINT 밑 '${t}': 원본 사본에서 ${k + 1}번째 +1 이 거절됨`); return; }
      }
      const spent = p0 - Number(B.S.s11.text);
      if (spent !== n(m[3]) || Number(B.S.s11.text) !== n(m[4])) msgs.push(`POINT 밑 '${t}': 원본 사본에서 ${spent} 쓰고 ${B.S.s11.text} 남음`);
    } else if ((m = t.match(/레벨업하면 \+([\d,]+)$/))) {
      if (!probe.preview || probe.preview.point !== n(m[1])) msgs.push(`POINT 밑 '${t}': 원본 사본의 다음 레벨업 POINT ${probe.preview ? probe.preview.point : '없음'}`);
    } else if ((m = t.match(/찍을 수 있는 스탯 ([\d,]+)개$/))) {
      if (o.stats.filter((x) => x.canUp).length !== n(m[1]) || probe.preview) msgs.push(`POINT 밑 '${t}': 원본 +1 가능 ${o.stats.filter((x) => x.canUp).length}개, 레벨업 ${probe.preview ? '가능' : '없음'}`);
    } else if (/레벨업 없음/.test(t) && probe.preview) msgs.push(`POINT 밑 '${t}': 원본은 레벨업할 수 있음`);
    this.stats.pointSubs = (this.stats.pointSubs || 0) + 1;
  }
  // 원본 사본(처음부터 다시 돌린 것)에서 일곱 대시와 다음 레벨업을 실제로 해 본다
  probe() {
    const dash = [];
    const o = oracleNow(this.S);
    for (let i = 0; i < 7; i++) {
      if (!o.stats[i].canDash) { dash.push(null); continue; }
      const B = fork(this.O.trace);
      const b0 = oracleNow(B.S);
      const r = B.dash(i);
      dash.push(realDash(b0, oracleNow(B.S), r.ok, i));
    }
    const B = fork(this.O.trace);
    const b0 = oracleNow(B.S);
    const r = B.levelUp();
    return { dash, preview: realPreview(b0, oracleNow(B.S), r.ok) };
  }
  // 육성 가이드 탭이 보이면 패널이 지금 가이드를 그렸는지(조작이 멈추고 120ms 뒤에 그린다): 그린 글자, 제목, 재분배 순서의 줄 수,
  // 가이드 안 로그 표의 LV 줄 수. 가이드가 없으면 빈 안내
  async guideCheck() {
    const page = this.page;
    const g = this.O.A.guide();
    try { await page.waitForFunction(() => !document.querySelector('#guide').dataset.stale, null, { timeout: 2000 }); } catch (_) { this.fail(['육성 가이드 패널이 2초 안에 다시 그려지지 않았습니다'], 'guide-panel'); }
    const got = await page.evaluate(() => {
      const gd = document.querySelector('#guide');
      return {
        src: gd.dataset.src, empty: !!gd.querySelector('.guide-empty'), titles: Array.from(gd.querySelectorAll('h3')).map((x) => x.textContent),
        order: gd.querySelectorAll('ol.order > li').length, lvRows: gd.querySelectorAll('table.log-table tbody tr.lv-row').length,
        bad: (gd.innerText.match(/NaN|undefined|\[object|Infinity/g) || []).slice(0, 3),
      };
    });
    const msgs = [];
    if ((got.src || '') !== g) msgs.push('육성 가이드 패널이 그린 글자가 원본 recipe() 와 다름');
    if (!g) { if (!got.empty) msgs.push('원본 가이드가 비었는데 패널에 빈 안내가 없습니다'); }
    else {
      const sections = [];
      let cur = null;
      for (const raw of g.split('\r')) {
        const line = raw.replace(/\s+$/, '');
        if (line.startsWith('\u25a0')) { cur = { title: line.slice(1).trim(), lines: [] }; sections.push(cur); } else if (cur) cur.lines.push(line);
      }
      if (got.titles.join('|') !== sections.map((x) => x.title).join('|')) msgs.push(`육성 가이드 제목: 화면 ${got.titles.join('|')} / 원본 ${sections.map((x) => x.title).join('|')}`);
      const order = sections.find((x) => x.title === '재분배 순서');
      if (order && got.order !== order.lines.filter((l) => l.trim()).length) msgs.push(`육성 가이드 재분배 순서: 화면 ${got.order}줄 / 원본 ${order.lines.filter((l) => l.trim()).length}줄`);
      const lg = sections.find((x) => x.title === '재분배 로그');
      const lvN = lg ? lg.lines.filter((l) => /^LV\s+\d+(?:\s*-\s*\d+)?\s*:/.test(l)).length : 0;
      if (got.lvRows !== lvN) msgs.push(`육성 가이드 로그 표: 화면 LV ${got.lvRows}줄 / 원본 ${lvN}줄`);
    }
    if (got.bad.length) msgs.push(`육성 가이드 패널 글자에 ${got.bad.join(', ')}`);
    if (msgs.length) this.fail(msgs, 'guide-panel');
    this.stats.guidePanels = (this.stats.guidePanels || 0) + 1;
  }
  async copyCheck(guide) {
    const page = this.page;
    const text = guide ? this.O.A.guide() : this.O.A.exportLog();
    const n0 = await page.evaluate(() => window.__clip.length);
    const off = await this.isOff('#copy');
    await this.tap('#copy');
    if (!text) {
      await page.waitForTimeout(40);
      const n1 = await page.evaluate(() => window.__clip.length);
      if (!off || n1 !== n0) this.fail([`${guide ? '육성 가이드' : '재분배 로그'} 복사: 원본 글이 비었는데 복사 단추가 ${off ? '꺼져' : '켜져'} 있고 ${n1 - n0}번 복사했습니다`]);
      return;
    }
    if (off) this.fail([`${guide ? '육성 가이드' : '재분배 로그'} 복사 단추가 꺼져 있습니다(원본 글 ${text.split('\r').length}줄)`]);
    try { await page.waitForFunction((n) => window.__clip.length > n, n0, { timeout: 3000 }); } catch (_) {
      const why = await page.evaluate(() => {
        const b = document.querySelector('#copy');
        const r = b.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { acts: window.__acts.slice(-4).map((d) => `${d.act}:${d.ok}`), state: b.dataset.state || '', rect: [Math.round(r.top), Math.round(r.bottom), innerHeight], hit: hit ? `${hit.tagName}#${hit.id}.${hit.className}` : null, clip: window.__clip.length };
      });
      this.fail([`복사를 눌렀는데 클립보드에 쓰지 않았습니다 ${JSON.stringify(why)}`]);
    }
    const got = await page.evaluate((n) => window.__clip[n], n0);
    const want = text.split('\r').join('\r\n');
    if (got !== want) {
      const a = got.split('\r\n'), b = want.split('\r\n');
      let k = 0;
      while (k < Math.max(a.length, b.length) && a[k] === b[k]) k++;
      this.fail([`${guide ? '육성 가이드' : '재분배 로그'} 복사 ${k + 1}번째 줄: 화면 ${JSON.stringify(a[k])} / 원본 ${JSON.stringify(b[k])} (줄 수 ${a.length}/${b.length})`]);
    }
    if (guide) this.stats.guideCopies++; else this.stats.copies++;
  }
  async switchTab(guide, via) {
    const now = await this.page.evaluate(() => document.querySelector('#tab-guide').getAttribute('aria-selected') === 'true');
    if (now === guide) return;
    if (via === 'G') { await this.keysReady(); await this.page.keyboard.press('KeyG'); } else await this.page.click(guide ? '#tab-guide' : '#tab-log');
  }

  // ---- 조작(화면에서 진짜 입력 → 원본에 같은 입력) ----
  // 대시·레벨업은 바로 앞 화면의 이름표/'다음 레벨업'을 원본이 실제로 한 결과와 맞춘다
  checkDashLabel(i, o0, r) {
    const s = this.scr.stats[i];
    const o1 = oracleNow(this.S);
    const d = realDash(o0, o1, r.ok, i);
    const msgs = [];
    if (!s.dashOff) {
      if (!d) msgs.push(`${STATS[i]} 대시 단추가 '${s.dest}'로 켜져 있었는데 원본의 대시는 아무것도 바꾸지 않았습니다`);
      else {
        if (s.dest !== `${fmt(d.value)}까지`) msgs.push(`${STATS[i]} 대시 이름표: 화면 ${JSON.stringify(s.dest)} / 원본이 실제로 간 곳 ${d.value}`);
        if (s.dashLabel !== dashSaid(STATS[i], o0.lv, d)) msgs.push(`${STATS[i]} 대시 aria-label: 화면 ${JSON.stringify(s.dashLabel)} / 원본 ${JSON.stringify(dashSaid(STATS[i], o0.lv, d))}`);
      }
    } else if (o0.stats[i].canDash && d) msgs.push(`${STATS[i]} 대시 단추가 꺼져 있었는데 원본의 대시는 ${d.value}까지 갔습니다`);
    if (msgs.length) this.fail(msgs, 'dash-label');
  }
  checkPreview(o0, r) {
    const want = expectNext(o0, realPreview(o0, oracleNow(this.S), r.ok));
    const msgs = [];
    if (this.scr.nextMeta !== want.meta) msgs.push(`다음 레벨업 LV: 화면 ${JSON.stringify(this.scr.nextMeta)} / 원본이 실제로 한 레벨업 ${JSON.stringify(want.meta)}`);
    if (JSON.stringify(this.scr.gains) !== JSON.stringify(want.gains)) msgs.push(`다음 레벨업 보상: 화면 ${JSON.stringify(this.scr.gains)} / 원본이 실제로 한 레벨업 ${JSON.stringify(want.gains)}`);
    if (msgs.length) this.fail(msgs, 'preview');
  }
  async keyLevelUp() {
    this.note('키 L');
    await this.keysReady();
    const o0 = oracleNow(this.S);
    await this.page.keyboard.press('KeyL');
    const r = this.oc('levelUp');
    this.checkPreview(o0, r);
  }
  async keyStat(i) {
    this.note(`키 ${SHORTCUT[i]}`);
    await this.keysReady();
    await this.page.keyboard.press(`Key${SHORTCUT[i]}`);
    this.oc('statUp', i);
  }
  async keyDash(i) {
    this.note(`키 Shift+${SHORTCUT[i]}`);
    await this.keysReady();
    const o0 = oracleNow(this.S);
    await this.page.keyboard.press(`Shift+Key${SHORTCUT[i]}`);
    const r = this.oc('dash', i);
    this.checkDashLabel(i, o0, r);
  }
  async keyHistory(redo, shift) {
    this.note(`키 ${shift ? 'Shift+' : ''}${redo ? '→' : '←'}`);
    await this.keysReady();
    await this.page.keyboard.press(`${shift ? 'Shift+' : ''}${redo ? 'ArrowRight' : 'ArrowLeft'}`);
    this.oc(redo ? 'redo' : 'undo', shift);
  }
  async clickUp(i) {
    const sel = `[data-up="${i}"]`;
    const off = await this.isOff(sel);
    this.note(`+1 클릭 ${STATS[i]}${off ? '(꺼짐)' : ''}`);
    await this.tap(sel);
    if (!off) this.oc('statUp', i);
  }
  async clickDash(i) {
    const sel = `[data-dash="${i}"]`;
    const off = await this.isOff(sel);
    this.note(`대시 클릭 ${STATS[i]}${off ? '(꺼짐)' : ''}`);
    const o0 = oracleNow(this.S);
    await this.tap(sel);
    if (!off) { const r = this.oc('dash', i); this.checkDashLabel(i, o0, r); }
  }
  async clickLevelUp() {
    const sel = '[data-act="levelUp"]';
    const off = await this.isOff(sel);
    this.note(`레벨업 클릭${off ? '(꺼짐)' : ''}`);
    const o0 = oracleNow(this.S);
    await this.tap(sel);
    if (!off) { const r = this.oc('levelUp'); this.checkPreview(o0, r); }
  }
  async clickHistory(redo, shift) {
    const sel = redo ? '[data-act="redo"]' : '[data-act="undo"]';
    const off = await this.isOff(sel);
    this.note(`${redo ? '다시 실행' : '되돌리기'} ${shift ? 'Shift+' : ''}클릭${off ? '(꺼짐)' : ''}`);
    await this.tap(sel, { modifiers: shift ? ['Shift'] : [] });
    if (!off) this.oc(redo ? 'redo' : 'undo', shift);
  }
  // 같은 키를 n 번. hold: 누르고 있기(브라우저의 자동 반복처럼 keydown 이 repeat 로 이어지고 keyup 은 끝에 한 번)
  async runKeys(code, n, f, arg, hold, shift) {
    this.note(`키 ${shift ? 'Shift+' : ''}${code.replace('Key', '')} × ${n}${hold ? '(누르고 있기)' : ''}`);
    await this.keysReady();
    const kb = this.page.keyboard;
    if (hold) {
      if (shift) await kb.down('Shift');
      for (let k = 0; k < n; k++) await kb.down(code);
      await kb.up(code);
      if (shift) await kb.up('Shift');
    } else for (let k = 0; k < n; k++) await kb.press(shift ? `Shift+${code}` : code);
    for (let k = 0; k < n; k++) (arg === undefined ? this.oc(f) : this.oc(f, arg));
  }
  // 보너스 칸: 친 글자 → 브라우저의 number 칸이 만든 값(숫자가 아니면 badInput) → 화면은 그 값이 지금과 다를 때만 확정
  async bonusType(text, commit) {
    const page = this.page;
    this.note(`보너스 칸 "${text}" + ${commit}`);
    await page.click('#bonus', { clickCount: 3 });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    if (text) await page.keyboard.type(text);
    const st = await page.evaluate(() => { const b = document.querySelector('#bonus'); return { value: b.value, bad: b.validity.badInput }; });
    const raw = st.bad ? NaN : st.value;
    const n0 = await this.acts();
    await page.keyboard.press(commit);
    const rate = this.S.bonusNS.value;
    if (String(raw) !== String(rate)) {
      if (commit === 'Tab' && !st.bad) await this.waitAct('setBonus', n0);
      const dispatched = (await page.evaluate((n) => window.__acts.slice(n).filter((d) => d.act === 'setBonus').length, n0)) > 0;
      if (dispatched) this.oc('setBonus', raw);
      else if (!(st.bad && commit === 'Tab')) this.fail([`보너스 칸 "${text}"(${commit}): 화면이 보너스를 확정하지 않았습니다`]);
      else this.badTab = true;   // Tab 으로 나간 badInput: 브라우저가 change 를 내지 않는다(원본도 무시한다)
    }
  }
  async bonusStep(up) {
    const sel = `[data-step="${up ? 5 : -5}"]`;
    const off = await this.isOff(sel);
    this.note(`보너스 ${up ? '+' : '−'} 클릭${off ? '(꺼짐)' : ''}`);
    const rate = this.S.bonusNS.value;
    await this.tap(sel);
    if (!off) this.oc('setBonus', rate + (up ? 5 : -5));
  }
  async xienClick(x) {
    const st = await this.page.evaluate((v) => { const i = document.querySelector(`.xien-opt[data-x="${v}"] input`); return i ? { disabled: i.disabled, checked: i.checked } : null; }, x);
    this.note(`주력 계열 클릭 ${x}${st && st.disabled ? '(꺼짐)' : st && st.checked ? '(이미 고름)' : ''}`);
    if (!st) this.fail([`주력 계열 줄 ${x} 가 화면에 없습니다`]);
    await this.tap(`.xien-opt[data-x="${x}"]`);
    if (!st.disabled && !st.checked) this.oc('setXien', x);
  }
  // 고른 줄에 초점을 두고 ↑/↓: 브라우저가 꺼진 줄을 건너뛰어 다음 줄을 고른다(원본: 그 줄을 드롭다운에서 고름)
  async xienArrow(down) {
    const o = oracleNow(this.S);
    const usable = o.xien.lines.filter((l) => l.selectable || l.x === o.xien.selected).map((l) => l.x);
    const k = usable.indexOf(o.xien.selected);
    const to = usable[(k + (down ? 1 : -1) + usable.length) % usable.length];
    this.note(`주력 계열 ${down ? '↓' : '↑'} (→ ${to})`);
    await this.page.click(`.xien-opt[data-x="${o.xien.selected}"]`);
    await this.page.keyboard.press(down ? 'ArrowDown' : 'ArrowUp');
    if (to !== o.xien.selected) this.oc('setXien', to);
  }
  // 확인 창: 글을 맞추고(want) 바꾸기/취소/Esc/바깥
  async confirmDecide(want, decision, act, since) {
    const page = this.page;
    this.stats.dialogs++;
    const got = await page.evaluate(() => ({ title: document.querySelector('#confirm-title').textContent, desc: document.querySelector('#confirm-desc').textContent, go: document.querySelector('#confirm-go').textContent }));
    const msgs = [];
    for (const k of Object.keys(want)) if (noWJ(got[k]) !== want[k]) msgs.push(`확인 창 ${k}: 화면 ${JSON.stringify(got[k])} / 원본 ${JSON.stringify(want[k])}`);
    if (msgs.length) this.fail(msgs, 'confirm');
    await page.waitForTimeout(30);
    if (decision === 'go') {
      await page.click('#confirm-go');
      await this.waitAct(act, since);
      await this.waitClosed('#confirm');
      return true;
    }
    if (decision === 'esc') await page.keyboard.press('Escape');
    else if (decision === 'backdrop') {
      const pt = await page.evaluate(() => {
        const r = document.querySelector('#confirm .dialog-body').getBoundingClientRect();
        const inside = (x, y) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        return [[4, 4], [innerWidth - 4, 4], [4, innerHeight - 4], [innerWidth - 4, innerHeight - 4]].find(([x, y]) => !inside(x, y));
      });
      await page.mouse.click(pt[0], pt[1]);
    }
    else await page.click('#confirm-cancel');
    await this.waitClosed('#confirm');
    return false;
  }
  async charChange(c, via, decision) {
    const page = this.page;
    const o = oracleNow(this.S);
    const C = this.S;
    if (via === 'side' && this.layout !== 'wide') via = 'sheet';
    this.note(`캐릭터 ${C.CHAR_NAME[c]}(${c}) ${via} ${decision}`);
    const n0 = await this.acts();
    if (via === 'sheet') {
      await page.click('#open-chars');
      await this.waitOpen('#char-sheet');
      await page.waitForTimeout(30);
      await page.click(`#cast [data-char="${c}"]`);
      await this.waitClosed('#char-sheet');
      await page.waitForTimeout(30);
    } else await page.click(`#char-list [data-char="${c}"]`);
    const open = await page.evaluate(() => document.querySelector('#confirm').open);
    const expectAsk = c !== o.char && hasWork(o);
    if (open !== expectAsk) this.fail([`캐릭터 바꾸기: 확인 창 ${open ? '열림' : '안 열림'} / 원본 계획 ${o.actions}조작${o.edited ? '(스탯 편집)' : ''}, 같은 캐릭터 ${c === o.char}`]);
    if (c === o.char) return;
    if (open) {
      const name = C.CHAR_NAME[c];
      const go = await this.confirmDecide({ title: `${name}${ro(name)} 바꿀까요?`, desc: `지금 계획(${planNow(o)})은 지워지고 ${name}/${C.STYLE_NAME[c][0]} LV${NB}${fmt(c === 15 ? 200 : 1)}부터 새로 시작합니다. ${KEEP_IT}`, go: '바꾸기' }, decision, 'setChar', n0);
      if (!go) return;
    } else await this.waitAct('setChar', n0);
    this.oc('setChar', c);
  }
  async typeChange(t, via, decision) {
    const page = this.page;
    const o = oracleNow(this.S);
    const name = o.types[t];
    if (via === 'side' && this.layout === 'phone') via = 'sheet';
    this.note(`타입 ${name}(${t}) ${via} ${decision}`);
    const n0 = await this.acts();
    if (via === 'sheet') {
      await page.click('#open-chars');
      await this.waitOpen('#char-sheet');
      await page.waitForTimeout(30);
      await page.click(`#sheet-types [data-type="${t}"]`);
      if (t === o.type) { await page.click('#char-sheet [data-close]'); await this.waitClosed('#char-sheet'); return; }
      await this.waitClosed('#char-sheet');
      await page.waitForTimeout(30);
    } else await page.click(`#types [data-type="${t}"]`);
    const open = await page.evaluate(() => document.querySelector('#confirm').open);
    const expectAsk = t !== o.type && hasWork(o);
    if (open !== expectAsk) this.fail([`타입 바꾸기: 확인 창 ${open ? '열림' : '안 열림'} / 원본 계획 ${o.actions}조작, 같은 타입 ${t === o.type}`]);
    if (t === o.type) return;
    if (open) {
      const go = await this.confirmDecide({ title: `${name}${ro(name)} 바꿀까요?`, desc: `지금 계획(${planNow(o)})은 지워지고 ${o.charName}/${name} LV${NB}${fmt(o.startLv)}부터 새로 시작합니다. ${KEEP_IT}`, go: '바꾸기' }, decision, 'setType', n0);
      if (!go) return;
    } else await this.waitAct('setType', n0);
    this.oc('setType', t);
  }
  async resetPlan(via, decision) {
    const page = this.page;
    const o = oracleNow(this.S);
    via = this.layout === 'phone' ? 'sheet' : 'side';   // 641px 위에서는 제목 줄의 단추, 휴대폰에서는 캐릭터 시트의 단추
    this.note(`스탯 초기화 ${via} ${decision}`);
    const n0 = await this.acts();
    if (via === 'sheet') {
      await page.click('#open-chars');
      await this.waitOpen('#char-sheet');
      await page.waitForTimeout(30);
      await page.click('[data-sheet-act="reset"]');
      await this.waitClosed('#char-sheet');
      await page.waitForTimeout(30);
    } else await page.click('#reset');
    const open = await page.evaluate(() => document.querySelector('#confirm').open);
    if (open !== hasWork(o)) this.fail([`스탯 초기화: 확인 창 ${open ? '열림' : '안 열림'} / 원본 계획 ${o.actions}조작${o.edited ? '(스탯 편집)' : ''}`]);
    if (open) {
      const go = await this.confirmDecide({ title: '스탯을 초기화할까요?', desc: `지금 계획(${planNow(o)})은 지워지고 ${o.charName}/${o.typeName} LV${NB}${fmt(o.startLv)}부터 다시 시작합니다. ${KEEP_IT}`, go: '초기화' }, decision, 'reset', n0);
      if (!go) return;
    } else await this.waitAct('reset', n0);
    this.oc('reset');
  }
  // 스탯 편집: 창의 칸이 원본 statusEdit() 의 값·범위와 같은지 보고, 몇 칸에 글자를 친 뒤 적용/Enter/취소/Esc
  async statEdit(open, typed, decision) {
    const page = this.page;
    if (open !== 'T') open = this.layout === 'phone' ? 'sheet' : 'button';
    this.note(`스탯 편집(${open}) ${JSON.stringify(typed)} ${decision}`);
    const n0 = await this.acts();
    if (open === 'T') { await this.keysReady(); await page.keyboard.press('KeyT'); }
    else if (open === 'sheet') {
      await page.click('#open-chars');
      await this.waitOpen('#char-sheet');
      await page.waitForTimeout(30);
      await page.click('[data-sheet-act="edit"]');
      await this.waitClosed('#char-sheet');
    } else await page.click('#edit-open');
    await this.waitOpen('#edit-dialog');
    const ed = this.O.A.editOpen();
    const fields = await page.evaluate(() => Array.from(document.querySelectorAll('#edit-form input')).map((i) => ({ name: i.name, value: i.value, min: i.getAttribute('min'), max: i.getAttribute('max') })));
    const want = [['lv', ed.lv, ed.limits.lv], ['point', ed.point, ed.limits.point], ['hp', ed.hp, ed.limits.hp], ['mp', ed.mp, ed.limits.mp], ['sp', ed.sp, ed.limits.sp]]
      .concat(ed.stats.map((n, i) => [`s${i}`, n, ed.limits.stats[i]]), ed.lines.map((l) => [`x${l.x}`, l.value, null]));
    const msgs = [];
    if (fields.length !== want.length) msgs.push(`스탯 편집 칸 ${fields.length}개 / 원본 ${want.length}개`);
    want.forEach(([name, v, lim], k) => {
      const f = fields[k] || {};
      if (f.name !== name || f.value !== String(v)) msgs.push(`스탯 편집 칸 ${name}: 화면 ${f.name}=${JSON.stringify(f.value)} / 원본 ${JSON.stringify(String(v))}`);
      if (lim && (f.min !== String(lim[0]) || f.max !== String(lim[1]))) msgs.push(`스탯 편집 칸 ${name} 범위: 화면 ${f.min}~${f.max} / 원본 ${lim[0]}~${lim[1]}`);
    });
    if (msgs.length) this.fail(msgs, 'edit-open');
    for (const [name, text] of Object.entries(typed)) await page.fill(`#edit-form input[name="${name}"]`, text);
    if (decision === 'apply' || decision === 'enter') {
      if (decision === 'apply') await page.click('#edit-apply');
      else { await page.focus(`#edit-form input[name="${Object.keys(typed)[0] || 'lv'}"]`); await page.keyboard.press('Enter'); }
      await this.waitAct('editCommit', n0);
      await this.waitClosed('#edit-dialog');
      // 원본: 친 칸만 그 글자로(친 적 없는 칸은 연 순간의 값). 계열 레벨은 줄의 x 로
      const values = {};
      const stats = [];
      const lines = [];
      for (const [name, text] of Object.entries(typed)) {
        if (/^s\d$/.test(name)) stats[+name.slice(1)] = text;
        else if (/^x\d+$/.test(name)) lines.push({ x: +name.slice(1), value: text });
        else values[name] = text;
      }
      if (stats.length) values.stats = Array.from({ length: 7 }, (_, i) => stats[i]);
      if (lines.length) values.lines = lines;
      this.oc('editCommit', values);
      return;
    }
    if (decision === 'esc') await page.keyboard.press('Escape');
    else await page.click('#edit-dialog .dialog-foot [data-close]');
    await this.waitClosed('#edit-dialog');
  }
  // 붙여넣은 로그: 칸에 넣는 방법(input) → 불러오는 방법(load) → 확인 창(decision)
  async importLog(kind, text, input, load, decision) {
    const page = this.page;
    this.stats.imports[kind] = (this.stats.imports[kind] || 0) + 1;
    this.note(`로그 불러오기 ${kind}(${text.split(/\r\n|\r|\n/).length}줄) ${input}/${load}/${decision}`);
    const o = oracleNow(this.S);
    const ui = await page.evaluate(() => ({ visible: document.querySelector('#paste-text').getClientRects().length > 0, value: document.querySelector('#paste-text').value }));
    // 칸에 글을 넣는다
    if (kind === 'empty') {
      if (ui.value) await page.click('#clear');
    } else if (input === 'pasteBtn' || input === 'ctrlV') {
      await page.evaluate((t) => window.__origWrite(t), text);
      if (input === 'pasteBtn') await page.click('#paste');
      else { await this.keysReady(); await page.evaluate(() => { const a = document.activeElement; if (a && a.closest && a.closest('.xien-list')) a.blur(); }); await page.keyboard.press('Control+V'); }
      try { await page.waitForFunction((t) => document.querySelector('#paste-text').value === t, text.replace(/\r\n?/g, '\n'), { timeout: 3000 }); } catch (_) { this.fail([`${input}: 붙여넣은 글이 칸에 들어가지 않았습니다`]); }
    } else {
      if (!ui.visible) await page.click('#load');   // 1180px 부터 접혀 있는 칸(비어 있다): 불러오기를 누르면 열린다
      await page.fill('#paste-text', text);
    }
    if (kind !== 'empty' && looksJapanese(text)) {
      const m = await page.evaluate(() => document.querySelector('#load-msg').textContent);
      if (!m.startsWith('일본어판에서 만든 로그로 보입니다.')) this.fail([`일본어판 로그를 넣었는데 미리 알리지 않았습니다: ${JSON.stringify(m)}`]);
    }
    // 불러오기
    const n0 = await this.acts();
    let activeBefore = '';                   // P 를 누르기 직전의 초점(P 는 초점을 옮기지 않는다)
    if (load === 'P') { await this.keysReady(); activeBefore = await page.evaluate(() => (document.activeElement === document.body ? 'BODY' : document.activeElement.id)); await page.keyboard.press('KeyP'); }
    else if (load === 'ctrlEnter' && kind !== 'empty') { await page.click('#paste-text'); await page.keyboard.press('Control+Enter'); }
    else await page.click('#load');
    await page.waitForTimeout(10);
    const after = await page.evaluate(() => ({ open: document.querySelector('#confirm').open, msg: document.querySelector('#load-msg').textContent, tone: document.querySelector('#load-msg').dataset.tone || '' }));
    if (kind === 'empty' || !text.trim()) {
      if (after.msg !== '붙여넣은 로그가 없습니다. 재분배 로그를 먼저 붙여넣으세요.' || after.open) this.fail([`빈 칸 불러오기: ${JSON.stringify(after)}`]);
      return;
    }
    // 원본이 읽을 수 없는 글이면 화면은 그 까닭만 알리고 아무것도 바꾸지 않는다
    if (!after.open && (await page.evaluate((n) => !window.__acts.slice(n).some((d) => d.act === 'importLog'), n0))) {
      if (after.msg !== '이 글에서 읽을 수 있는 재분배 로그 줄을 찾지 못했습니다. "LV 숫자 :" 줄이나 Status 줄이 들어 있는지 확인하세요.') this.fail([`불러오기: 화면이 읽지 않았는데 안내가 ${JSON.stringify(after.msg)}`]);
      const r = this.oc('importLog', text);
      if (r.ok) this.fail([`화면은 '읽을 줄 없음'인데 원본은 읽었습니다(footer ${r.footer}, restarted ${r.restarted}, error ${!!r.error})`], 'import-nothing');
      return;
    }
    // 원본 사본에서 먼저 읽어 본다: 지울 계획이 있으면 확인 창(설정 줄만 읽어 계획을 그대로 두는 글은 묻지 않는다), 창의 글을 맞춘다
    let go = true;
    const B = fork(this.O.trace);
    const rb = B.importLog(text);
    const expectAsk = hasWork(o) && !keptPlan(rb);
    if (after.open !== expectAsk) this.fail([`불러오기 확인 창 ${after.open ? '열림' : '안 열림'} / 원본 계획 ${o.actions}조작${o.canRedo ? '(다시 실행 있음)' : ''}${o.edited ? '(스탯 편집)' : ''}, 설정 줄만 ${keptPlan(rb)}`]);
    if (after.open) {
      const cv = oracleNow(B.S);
      const how = rb.restarted ? ' 이 로그에는 캐릭터/타입 줄이 없어 지금 고른 캐릭터/타입으로 읽습니다.' : rb.footer && !rb.typeFound ? ` 타입 이름을 알아보지 못해 첫 타입(${cv.typeName})으로 읽습니다.` : '';
      const over = cappedRead(rb) ? ` ${capWords(false)}` : '';
      go = await this.confirmDecide({ title: '로그를 불러올까요?', desc: `지금 계획(${planNow(o)})은 지워지고 붙여넣은 로그(${cv.charName}/${cv.typeName}, LV${NB}${fmt(cv.lv)})로 다시 만듭니다.${how}${over} ${KEEP_IT}`, go: '불러오기' }, decision, 'importLog', n0);
    } else await this.waitAct('importLog', n0);
    if (!go) return;
    const r = this.oc('importLog', text);
    if (!r.ok) this.fail(['화면은 불러왔는데 원본은 읽지 못했습니다'], 'import');
    const cv = oracleNow(this.S);
    const who = `${cv.charName}/${cv.typeName}, LV${NB}${fmt(cv.lv)}`;
    // 설정 줄만 읽었으면 바뀐 설정(보너스, 주력 계열)을 말한다
    const got = [];
    if (cv.bonus.rate !== o.bonus.rate) got.push(`보너스 ${cv.bonus.rate}%`);
    if (cv.xien.selected !== o.xien.selected) { const l = cv.xien.lines.find((x) => x.x === cv.xien.selected); got.push(`주력 계열 ${l ? l.name : cv.xien.selected}`); }
    // 상한을 넘는 값을 상한에 맞춰 읽었으면 그것도 말한다(설정 줄만 읽은 경우와 오류가 난 경우는 빼고). 그것만이면 색조가 ok 가 아니라 info
    const over = cappedRead(r) ? ` ${capWords(true)}` : '';
    const want = r.error ? '로그를 끝까지 읽지 못했습니다. 읽은 데까지만 반영했습니다. 형식이 맞는지 확인하세요.'
      : keptPlan(r) ? `캐릭터/타입 줄과 LV 줄이 없어 지금 계획에 설정만 반영했습니다${got.length ? `: ${got.join(', ')}` : ''}.`
      : r.restarted ? `캐릭터/타입 줄이 없어 지금 고른 ${cv.charName}/${cv.typeName}${ro(cv.typeName)} 처음부터 읽었습니다.${over}${looksJapanese(text) ? ` ${JA_AFTER}` : ''}`
        : r.footer && !r.typeFound ? `로그를 불러왔습니다: ${who}. 타입 이름을 알아보지 못해 첫 타입(${cv.typeName})으로 읽었습니다.${over} ${FIX_TYPE}`
          : `로그를 불러왔습니다: ${who}.${over}`;
    const wantTone = r.error ? 'error' : keptPlan(r) || r.restarted || (r.footer && !r.typeFound) || over ? 'info' : 'ok';
    const end = await page.evaluate(() => ({ msg: document.querySelector('#load-msg').textContent.replace(/\u2060/g, ''), tone: document.querySelector('#load-msg').dataset.tone || '', value: document.querySelector('#paste-text').value, active: document.activeElement === document.body ? 'BODY' : document.activeElement.id }));
    const msgs = [];
    if (end.msg !== want) msgs.push(`불러온 뒤 안내: 화면 ${JSON.stringify(end.msg)} / 원본(footer ${r.footer}, typeFound ${r.typeFound}, restarted ${r.restarted}, capped ${r.capped}, error ${!!r.error}) ${JSON.stringify(want)}`);
    if (end.tone !== wantTone) msgs.push(`불러온 뒤 안내의 색조: 화면 ${JSON.stringify(end.tone)} / 원본(capped ${r.capped}, error ${!!r.error}) ${JSON.stringify(wantTone)}`);
    if (over) this.stats.imports.cappedRead = (this.stats.imports.cappedRead || 0) + 1;   // 상한에 맞춰 읽었다고 알린 불러오기(세어 두기만)
    // 깨끗이 읽음: 캐릭터/타입 줄의 캐릭터와 타입을 알아봤고 오류가 없다(타입을 알아보지 못했으면 그 줄을 고쳐 다시 불러오게 글을 남긴다)
    const clean = r.footer && r.typeFound && !r.error;
    if ((end.value === '') !== clean) msgs.push(`불러온 뒤 칸: ${end.value === '' ? '비움' : '남김'} / 깨끗이 읽음 ${clean}`);
    // 불러오기가 초점을 <body> 로 떨어뜨리면 안 된다. 다만 P 는 초점을 옮기지 않으므로(원본도 처리 끝에 application.setFocus()), 칸에서
    // Esc 로 나와 <body> 에 있던 초점은 묻지 않고 읽은 뒤에도 <body> 그대로다(확인 창을 거치면 연 단추 '로그 불러오기'로 돌아간다)
    if (end.active === 'BODY' && activeBefore !== 'BODY') msgs.push('불러온 뒤 초점이 <body> 로 떨어졌습니다');
    if (msgs.length) this.fail(msgs, 'import-after');
  }
  async reload() {
    this.note('새로 고침');
    await this.page.waitForTimeout(this.R.pick([0, 50, 400]));   // 자동 저장 300ms 전·후
    await this.page.reload();
    await this.page.waitForFunction(() => !!window.OresimUI);
    await this.page.waitForTimeout(50);
    this.marks = null;
  }

  // ---- 무작위 한 조작 ----
  async randomStep() {
    const { ri, pick, chance, weighted } = this.R;
    const o = oracleNow(this.S);
    const kind = weighted([
      [14, 'keyL'], [15, 'keyStat'], [5, 'keyDash'], [5, 'clickUp'], [4, 'clickDash'], [3, 'clickLevelUp'],
      [6, 'keyHistory'], [3, 'clickHistory'], [3, 'runL'], [3, 'runStat'], [1.5, 'runDash'], [1, 'runUndo'],
      [4, 'bonusType'], [2, 'bonusStep'], [4, 'xienClick'], [1, 'xienArrow'],
      [2, 'char'], [1.5, 'type'], [0.8, 'reset'], [3, 'edit'], [4, 'import'], [2.5, 'tab'], [0.7, 'reload'],
    ]);
    this.count(kind);
    const focusStat = this.focus;
    const stat = () => (chance(0.4) ? focusStat : ri(7));
    switch (kind) {
      case 'keyL': return this.keyLevelUp();
      case 'keyStat': return this.keyStat(stat());
      case 'keyDash': return this.keyDash(stat());
      case 'clickUp': return this.clickUp(stat());
      case 'clickDash': return this.clickDash(stat());
      case 'clickLevelUp': return this.clickLevelUp();
      case 'keyHistory': return this.keyHistory(chance(0.4), chance(0.3));
      case 'clickHistory': return this.clickHistory(chance(0.4), chance(0.3));
      case 'runL': return this.runKeys('KeyL', 5 + ri(40), 'levelUp', undefined, chance(0.5));
      case 'runStat': { const i = stat(); return this.runKeys(`Key${SHORTCUT[i]}`, 2 + ri(12), 'statUp', i, chance(0.5)); }
      case 'runDash': { const i = stat(); return this.runKeys(`Key${SHORTCUT[i]}`, 2 + ri(6), 'dash', i, chance(0.6), true); }
      case 'runUndo': { const by = chance(0.3); const n = 2 + ri(10); await this.runKeys('ArrowLeft', n, 'undo', by, chance(0.5), by); if (chance(0.7)) await this.runKeys('ArrowRight', n, 'redo', by, chance(0.5), by); return undefined; }
      case 'bonusType': return this.bonusType(pick(['0', '5', '25', '50', '75', '100', '52', '53', '57', '103', '-5', '2.5', '47.5', '52.5', '97.4', '1000', '', '5-', '--', '007', '35', '+5', '1.4']), pick(['Enter', 'Enter', 'Tab']));
      case 'bonusStep': return this.bonusStep(chance(0.5));
      case 'xienClick': { const L = o.xien.lines; return this.xienClick(L[ri(L.length)].x); }
      case 'xienArrow': return this.xienArrow(chance(0.5));
      case 'char': return this.charChange(chance(0.2) ? 15 : chance(0.08) ? o.char : ri(16), chance(0.7) ? 'side' : 'sheet', pick(['go', 'go', 'go', 'cancel', 'esc', 'backdrop']));
      case 'type': return this.typeChange(ri(o.types.length), chance(0.7) ? 'side' : 'sheet', pick(['go', 'go', 'go', 'cancel', 'esc']));
      case 'reset': return this.resetPlan(chance(0.8) ? 'side' : 'sheet', pick(['go', 'go', 'cancel']));
      case 'edit': return this.statEdit(pick(['T', 'T', 'button', 'sheet']), this.editValues(), pick(['apply', 'apply', 'apply', 'enter', 'cancel', 'esc']));
      case 'import': return this.randomImport();
      case 'tab': return this.switchTab(!(await this.page.evaluate(() => document.querySelector('#tab-guide').getAttribute('aria-selected') === 'true')), chance(0.5) ? 'G' : 'click').then(() => this.note('탭 바꾸기'));
      case 'reload': return this.reload();
      default: throw new Error(kind);
    }
  }
  // 스탯 편집에 칠 글자: 몇 칸만, 범위 밖·소수 포함(빈 칸은 WEBDIFF_EMPTY=1 일 때만)
  editValues() {
    const { ri, pick, chance } = this.R;
    const o = oracleNow(this.S);
    const t = {};
    const odd = (cap) => pick(['0', '-5', String(cap + 1), '300', '99999', '7.6', '2.5', String(cap + 0.5), '-0.4']);   // cap = 그 칸의 상한
    const k = ri(5);
    if (k === 1) t.lv = String(Math.min(MAX_LV, Math.max(1, o.lv) + 1 + ri(80)));
    else if (k === 2) t.lv = '1';
    else if (k === 3) t.lv = String(pick([MAX_LV - 5, MAX_LV - 1, MAX_LV, 1 + ri(MAX_LV)]));
    else if (k === 4) t.lv = odd(MAX_LV);
    if (chance(0.7)) for (let i = 0; i < 7; i++) if (chance(0.4)) t[`s${i}`] = chance(0.8) ? String(pick([1 + ri(200), STAT_CAP[i] - 5, STAT_CAP[i] - 1, STAT_CAP[i]])) : odd(STAT_CAP[i]);
    if (chance(0.3)) t.hp = String(chance(0.8) ? 1 + ri(22000) : pick([0, 22001, 50000]));
    if (chance(0.2)) t.mp = String(chance(0.8) ? 1 + ri(7000) : pick([0, 7001]));
    if (chance(0.2)) t.sp = String(chance(0.8) ? 1 + ri(12000) : pick([0, 12001]));
    if (chance(0.7)) t.point = String(chance(0.7) ? ri(80) : pick([0, 500, 9999, 10000, 123456, -3, 12.5]));
    if (chance(0.5)) {
      for (const l of o.xien.lines) if (chance(0.3)) t[`x${l.x}`] = String(chance(0.8) ? ri(60) : pick([-1, 99, 2.5]));
    }
    if (WITH_EMPTY && chance(0.2)) t[pick(['lv', 'point', 's0', 'hp'])] = '';
    return t;
  }
  async randomImport() {
    const { ri, pick, chance } = this.R;
    const S = this.S;
    const own = this.O.A.exportLog();
    if (chance(0.3)) this.pool.push(own);
    const kind = pick(['own', 'own', 'footerless', 'garbled', 'garbled', 'pool', 'otherChar', 'unknownType', 'ja', 'junk', 'empty']);
    let text;
    if (kind === 'own') text = own.split('\r').join(pick(['\r\n', '\n', '\r']));
    else if (kind === 'footerless') text = footerless(own);
    else if (kind === 'garbled') text = garble(this.R, own, 1 + ri(3));
    else if (kind === 'pool') text = (this.pool.length ? pick(this.pool) : own).split('\r').join('\r\n');
    else if (kind === 'otherChar') { const c = ri(16); text = own.split('\r').map((l) => l.replace(/^[^ /]+\/[^ ]+ Bonus:/, `${S.CHAR_NAME[c]}/${pick(S.STYLE_NAME[c])} Bonus:`)).join('\r\n'); }
    else if (kind === 'unknownType') text = own.split('\r').map((l) => l.replace(/^([^ /]+)\/[^ ]+ Bonus:/, '$1/없는타입 Bonus:')).join('\r\n');
    else if (kind === 'ja') text = pick(JA_LOGS);
    else if (kind === 'junk') text = Array.from({ length: 1 + ri(4) }, () => pick(['안녕하세요', 'LV', 'LV abc : STAB', 'Bonus : 75%', 'Xien : 없는 계열', '---', 'STAB 몰빵 5회'])).join('\r\n');
    else text = '';
    return this.importLog(kind, text, pick(['pasteBtn', 'ctrlV', 'type']), pick(['click', 'P', 'ctrlEnter']), pick(['go', 'go', 'go', 'cancel', 'esc']));
  }
}

// ---- 브라우저 한 장 ----
async function newPage(browser, reduced, layout) {
  const ctx = await browser.newContext({ viewport: LAYOUTS[layout], reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  // 화면이 클립보드에 쓰는 글을 옆에 적어 둔다(진짜 클립보드에도 그대로 쓴다). 화면이 보낸 조작(oresim:action)도 적는다
  await ctx.addInitScript(() => {
    window.__clip = [];
    window.__acts = [];
    try {
      const c = navigator.clipboard;
      const orig = c.writeText.bind(c);
      window.__origWrite = orig;
      c.writeText = (t) => { window.__clip.push(t); return orig(t); };
    } catch (_) { /* 클립보드가 없으면 복사 비교가 실패로 알린다 */ }
    document.addEventListener('oresim:action', (e) => { window.__acts.push(e.detail); });
  });
  const page = await ctx.newPage();
  return { ctx, page };
}

async function runOne(browser, seed, name, body, layout) {
  const { ctx, page } = await newPage(browser, seed % 2 === 1, layout);
  const run = new Run(page, seed, name, layout);
  page.on('console', (m) => { if (['error', 'warning', 'assert'].includes(m.type())) run.console.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (err) => run.console.push(`[pageerror] ${err.message}`));
  page.on('dialog', (d) => { run.console.push(`[브라우저 대화상자] ${d.message()}`); d.dismiss().catch(() => {}); });
  let result = null;
  try {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => !!window.OresimUI);
    await run.check({ probe: true, both: true });
    await body(run);
  } catch (e) {
    if (!(e instanceof Divergence)) { e.msgs = [`예외: ${String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')}`]; }
    let shot = '';
    if (SHOTS) {
      try { fs.mkdirSync(SHOTS, { recursive: true }); shot = path.join(SHOTS, `${name.replace(/[^\w.-]+/g, '_')}-step${run.step}.png`); await page.screenshot({ path: shot }); } catch (_) { shot = ''; }
    }
    let trace = '';
    if (process.env.WEBDIFF_TRACE) {
      try {
        fs.mkdirSync(process.env.WEBDIFF_TRACE, { recursive: true });
        trace = path.join(process.env.WEBDIFF_TRACE, `${name.replace(/[^\w.-]+/g, '_')}-step${run.step}.json`);
        fs.writeFileSync(trace, JSON.stringify({ name, seed, layout, step: run.step, msgs: e.msgs, ui: run.ui, oracle: run.O.trace }, null, 1));
      } catch (_) { trace = ''; }
    }
    result = { name, seed, layout, step: run.step, ui: run.ui.slice(), msgs: e.msgs || [String(e)], where: e.where || '', shot, trace, oracleCalls: run.O.trace.length };
  }
  await ctx.close();
  return { result, run };
}

// ---- 정해 둔 순서(무작위로는 드물게만 닿는 곳) ----
const SCRIPT_LIST = [
  ['로아미니: LV 200 시작, 대시, 되돌리기, 가이드', async (r) => {
    await r.charChange(15, 'side', 'go'); await r.check({ probe: true, both: true });
    for (const a of [() => r.keyDash(2), () => r.keyDash(2), () => r.clickDash(5), () => r.keyLevelUp(), () => r.keyStat(2), () => r.keyHistory(false, true), () => r.keyHistory(false, true), () => r.keyHistory(false, false), () => r.keyHistory(true, false), () => r.keyHistory(true, true), () => r.runKeys('KeyL', 20, 'levelUp')]) { r.step++; await a(); await r.check({ probe: true, both: true }); }
    r.step++; await r.typeChange(0, 'side', 'go'); await r.check({ probe: true, both: true });
    r.step++; await r.importLog('own', r.O.A.exportLog().split('\r').join('\r\n'), 'type', 'click', 'go'); await r.check({ probe: true, both: true });
  }],
  [`LV ${MAX_LV} 까지: 최고 레벨의 단추와 대시`, async (r) => {
    // L 20번씩 묶어 최고 레벨까지(마지막 묶음은 최고 레벨을 넘겨 누른다)
    for (let k = 0; k < Math.ceil((MAX_LV - 1) / 20); k++) { r.step++; await r.runKeys('KeyL', 20, 'levelUp'); await r.check({ probe: k % 3 === 2 }); }
    r.step++; await r.runKeys('KeyL', 3, 'levelUp'); await r.check({ probe: true, both: true });
    for (const a of [() => r.keyLevelUp(), () => r.clickLevelUp(), () => r.keyDash(0), () => r.clickDash(3), () => r.runKeys('KeyS', 30, 'statUp', 0), () => r.keyDash(6), () => r.keyHistory(false, true), () => r.keyHistory(true, true)]) { r.step++; await a(); await r.check({ probe: true, both: true }); }
  }],
  [`스탯 상한 ${STAT_CAP[0]}: +1·대시가 꺼지고 상한 표시`, async (r) => {
    r.step++; await r.statEdit('T', { lv: '200', s0: String(STAT_CAP[0] - 5), s1: String(STAT_CAP[1]), s5: String(STAT_CAP[5] - 1), point: '9999' }, 'apply'); await r.check({ probe: true, both: true });
    for (const a of [() => r.runKeys('KeyS', 4, 'statUp', 0), () => r.keyStat(0), () => r.keyStat(0), () => r.clickUp(0), () => r.keyDash(0), () => r.clickDash(1), () => r.keyDash(5), () => r.keyDash(5), () => r.keyLevelUp(), () => r.keyHistory(false, true), () => r.keyHistory(true, true)]) { r.step++; await a(); await r.check({ probe: true, both: true }); }
  }],
  ['스탯 편집 LV 1: 편집 뒤 투자, 되돌리기, 가이드', async (r) => {
    r.step++; await r.statEdit('button', { point: '20', s1: '9' }, 'apply'); await r.check({ probe: true, both: true });
    for (const a of [() => r.keyStat(1), () => r.keyStat(1), () => r.keyLevelUp(), () => r.keyStat(6), () => r.keyHistory(false, true), () => r.keyHistory(false, false), () => r.keyHistory(false, false), () => r.keyHistory(true, true), () => r.keyDash(3), () => r.runKeys('KeyL', 12, 'levelUp')]) { r.step++; await a(); await r.check({ probe: true, both: true }); }
    r.step++; await r.charChange(3, 'side', 'go'); await r.check({ probe: true });
  }],
  ['스탯 편집 높은 LV: 편집 지점을 넘는 되돌리기·다시 실행', async (r) => {
    r.step++; await r.runKeys('KeyL', 25, 'levelUp'); await r.check({ probe: true });
    r.step++; await r.runKeys('KeyS', 6, 'statUp', 0); await r.check({});
    r.step++; await r.statEdit('T', { lv: '120', s0: '90', s1: '40', s3: '30', point: '35', x9: '40', x10: '12' }, 'enter'); await r.check({ probe: true, both: true });
    for (const a of [() => r.keyStat(0), () => r.keyStat(0), () => r.keyDash(0), () => r.keyLevelUp(), () => r.bonusType('75', 'Enter'), () => r.keyLevelUp(), () => r.xienClick(10), () => r.runKeys('KeyL', 4, 'levelUp'),
      () => r.keyHistory(false, false), () => r.keyHistory(false, true), () => r.keyHistory(false, true), () => r.keyHistory(false, true), () => r.keyHistory(false, true), () => r.keyHistory(false, false),
      () => r.keyHistory(true, true), () => r.keyHistory(true, true), () => r.keyHistory(true, false), () => r.keyHistory(true, true), () => r.keyHistory(true, true), () => r.keyHistory(true, true)]) { r.step++; await a(); await r.check({ probe: true, both: true }); }
  }],
  ['불러오기 뒤 되돌리기: 제 로그를 다시 읽고 ← / Shift+←', async (r) => {
    r.step++; await r.runKeys('KeyL', 12, 'levelUp'); await r.check({});
    r.step++; await r.keyDash(0); await r.check({ probe: true });
    r.step++; await r.bonusType('25', 'Enter'); await r.check({});
    r.step++; await r.runKeys('KeyL', 8, 'levelUp'); await r.check({});
    r.step++; await r.runKeys('KeyX', 4, 'statUp', 5); await r.check({});
    const text = r.O.A.exportLog().split('\r').join('\r\n');
    r.step++; await r.resetPlan('side', 'go'); await r.check({});
    r.step++; await r.importLog('own', text, 'pasteBtn', 'click', 'go'); await r.check({ probe: true, both: true });
    for (const a of [() => r.keyHistory(false, false), () => r.keyHistory(false, false), () => r.keyHistory(false, true), () => r.keyHistory(false, true), () => r.keyHistory(true, false), () => r.keyHistory(true, true), () => r.keyStat(2), () => r.keyHistory(false, true)]) { r.step++; await a(); await r.check({ probe: true, both: true }); }
    // 다른 캐릭터를 고른 뒤 같은 로그(푸터가 루시안)를 다시 읽는다
    r.step++; await r.charChange(9, 'sheet', 'go'); await r.check({});
    r.step++; await r.importLog('own', text, 'ctrlV', 'P', 'go'); await r.check({ probe: true, both: true });
    r.step++; await r.importLog('footerless', footerless(text), 'type', 'ctrlEnter', 'go'); await r.check({ probe: true, both: true });
  }],
  ['일본어판 로그와 읽을 줄 없는 글', async (r) => {
    r.step++; await r.runKeys('KeyL', 3, 'levelUp'); await r.check({});
    for (const t of JA_LOGS.slice(0, 3)) { r.step++; await r.importLog('ja', t, 'type', 'click', 'go'); await r.check({ probe: true, both: true }); }
    r.step++; await r.importLog('junk', '안녕하세요\r\nLV abc : STAB', 'type', 'click', 'go'); await r.check({});
    r.step++; await r.importLog('empty', '', 'type', 'click', 'go'); await r.check({});
  }],
  ['스탯 편집 직후(조작 0회): 지울 계획이 있으므로 캐릭터·타입·초기화·불러오기가 묻는다', async (r) => {
    r.step++; await r.statEdit('T', { lv: '60', s0: '70', point: '12' }, 'apply'); await r.check({ probe: true });
    const own = r.O.A.exportLog().split('\r').join('\r\n');
    r.step++; await r.charChange(4, 'side', 'cancel'); await r.check({});
    r.step++; await r.typeChange(2, 'side', 'esc'); await r.check({});
    r.step++; await r.resetPlan('side', 'cancel'); await r.check({});
    r.step++; await r.importLog('otherChar', own.replace(/^[^ /\r\n]+\/[^ \r\n]+ Bonus:/m, '보리스/베기형 Bonus:'), 'type', 'click', 'cancel'); await r.check({});
    r.step++; await r.charChange(4, 'sheet', 'go'); await r.check({ probe: true });
    r.step++; await r.statEdit('button', { lv: '1', point: '3' }, 'apply'); await r.check({});
    r.step++; await r.resetPlan('sheet', 'go'); await r.check({ probe: true, both: true });
  }],
  ['불러오기가 원본처럼 중간에 멈춤(Bonus :75%): 읽은 데까지, 글은 남긴다', async (r) => {
    r.step++; await r.runKeys('KeyL', 6, 'levelUp'); await r.check({});
    const lines = r.O.A.exportLog().split('\r');
    const broken = [lines[0], 'Bonus :75%'].concat(lines.slice(1)).join('\r\n');
    r.step++; await r.importLog('garbled', broken, 'type', 'click', 'go'); await r.check({ probe: true, both: true });
    r.step++; await r.keyLevelUp(); await r.check({ probe: true });
    r.step++; await r.importLog('garbled', 'LV   1       :\r\nBonus :75%\r\nLV   2 -  20 : STAB\r\n' + lines[lines.length - 2] + '\r\n', 'pasteBtn', 'P', 'go'); await r.check({ probe: true, both: true });
    r.step++; await r.keyHistory(false, true); await r.check({ probe: true });
    // 끝(캐릭터/타입 줄 뒤)에서 멈춘 불러오기: 읽은 것은 다 반영되고 updateStatus 만 돌지 않아 비용 단계가 옛 값으로 남는다.
    // 그 뒤의 받아들여지지 않은 → / Shift+→ 는 원본처럼 그 값을 바로잡고 화면도 다시 그린다
    const atEnd = ['LV   1       :', 'Bonus        : 50%', 'Xien         : 도계 HACK/DEF', 'LV   2 -  40 : STAB 몰빵 38회', '루시안/물리복합 Bonus: 20 / 39 Point: 1', 'Bonus :75%'].join('\r\n');
    r.step++; await r.importLog('garbled', atEnd, 'type', 'click', 'go'); await r.check({ probe: true, both: true });
    for (const a of [() => r.keyHistory(true, false), () => r.keyHistory(true, true), () => r.clickHistory(true, false), () => r.keyDash(0), () => r.keyStat(0), () => r.keyLevelUp()]) { r.step++; await a(); await r.check({ probe: true, both: true }); }
    r.step++; await r.reload(); await r.check({ probe: true });
    // 낮은 LV 에서 멈춘 불러오기: 값은 모두 옛 비용 단계 안에 있지만 초록 숫자는 LV 1 의 것(25, 지금 LV 8 로는 24). 새로 고친 뒤에도,
    // 보너스를 바꿔도(updateStatus 를 돌지 않는다) 그대로이고, 받아들여진 +1 에서 바로잡힌다
    const short = ['LV   1       :', 'Bonus        : 50%', 'Xien         : 도계 HACK/DEF', 'LV   2 -   8 :', '루시안/물리복합 Bonus: 0 / 7 Point: 0', 'Bonus :75%'].join('\r\n');
    r.step++; await r.importLog('garbled', short, 'type', 'click', 'go'); await r.check({ probe: true, both: true });
    for (const a of [() => r.reload(), () => r.bonusStep(true), () => r.clickUp(2), () => r.keyLevelUp()]) { r.step++; await a(); await r.check({ probe: true }); }
  }],
  ['처음까지 되돌린 계획(다시 실행할 조작 있음): 캐릭터·타입·초기화·불러오기·편집이 묻는다', async (r) => {
    r.step++; await r.runKeys('KeyL', 10, 'levelUp'); await r.check({});
    r.step++; await r.runKeys('KeyS', 5, 'statUp', 0); await r.check({});
    const own = r.O.A.exportLog().split('\r').join('\r\n');
    for (let k = 0; k < 30 && oracleNow(r.S).canUndo; k++) { r.step++; await r.keyHistory(false, true); await r.check({}); }
    r.step++; await r.charChange(4, 'side', 'cancel'); await r.check({});
    r.step++; await r.typeChange(2, 'side', 'esc'); await r.check({});
    r.step++; await r.resetPlan('side', 'cancel'); await r.check({});
    r.step++; await r.importLog('otherChar', own.replace(/^[^ /\r\n]+\/[^ \r\n]+ Bonus:/m, '보리스/베기형 Bonus:'), 'type', 'click', 'cancel'); await r.check({});
    r.step++; await r.keyHistory(true, true); await r.check({ probe: true });
    r.step++; await r.keyHistory(false, true); await r.check({});
    r.step++; await r.charChange(4, 'side', 'go'); await r.check({ probe: true, both: true });
  }],
  ['설정 줄만 있는 글(Bonus, Xien): 계획은 그대로, 묻지 않는다', async (r) => {
    r.step++; await r.runKeys('KeyL', 6, 'levelUp'); await r.check({});
    r.step++; await r.keyStat(0); await r.check({});
    r.step++; await r.importLog('junk', 'Bonus        : 75%', 'type', 'click', 'go'); await r.check({ probe: true, both: true });
    const o = oracleNow(r.S);
    const other = o.xien.lines.find((l) => l.selectable && l.x !== o.xien.selected);
    if (other) { r.step++; await r.importLog('junk', `Xien         : ${other.name}`, 'pasteBtn', 'P', 'go'); await r.check({ probe: true, both: true }); }
    r.step++; await r.importLog('junk', 'Bonus        : 25%\r\nBonus        : 30%', 'ctrlV', 'ctrlEnter', 'go'); await r.check({ probe: true });
    r.step++; await r.keyLevelUp(); await r.check({ probe: true, both: true });
  }],
  ['스탯 편집 빈 칸: 원본 Flex 처럼 그 칸의 최솟값', async (r) => {
    r.step++; await r.runKeys('KeyL', 30, 'levelUp'); await r.check({});
    r.step++; await r.statEdit('T', { lv: '' }, 'apply'); await r.check({ probe: true });
    r.step++; await r.statEdit('button', { point: '', s0: '', hp: '', x9: '' }, 'apply'); await r.check({ probe: true, both: true });
    r.step++; await r.statEdit('T', { s3: '', mp: '', sp: '' }, 'enter'); await r.check({ probe: true });
  }],
  ['고른 계열이 지금 고를 수 없는 줄(스탯 편집으로 계열 레벨을 크게)', async (r) => {
    r.step++; await r.statEdit('T', { x10: '59', point: '30' }, 'apply'); await r.check({ probe: true, both: true });
    for (const a of [() => r.xienClick(9), () => r.xienClick(10), () => r.keyLevelUp(), () => r.xienArrow(true), () => r.keyHistory(false, false), () => r.runKeys('KeyL', 30, 'levelUp'), () => r.xienClick(10)]) { r.step++; await a(); await r.check({ probe: true }); }
  }],
  ['보너스 칸: 반올림·범위 맞춤·숫자가 아닌 값', async (r) => {
    for (const [t, c] of [['52', 'Enter'], ['53', 'Enter'], ['103', 'Tab'], ['-5', 'Enter'], ['52.5', 'Enter'], ['', 'Enter'], ['5-', 'Enter'], ['97.4', 'Tab'], ['007', 'Enter'], ['5-', 'Tab']]) {
      r.step++; await r.bonusType(t, c); await r.check({});
      r.step++; await r.runKeys('KeyL', 3, 'levelUp'); await r.check({ probe: true });
    }
    for (let k = 0; k < 22; k++) { r.step++; await r.bonusStep(k < 11); await r.check({}); }
  }],
  // 이 순서는 끝에 둔다(PHONE_TOO 의 번호와 앞 순서들의 seed 가 그대로이게)
  [`상한에서 시작하는 비용 단계(LV ${CAP_STEP ? CAP_STEP.lv : '-'}): '상한 ${STAT_CAP[0]}', 레벨업하면 다시 'N부터 M'`, async (r) => {
    if (!CAP_STEP) return;
    const { lv, v } = CAP_STEP;
    r.step++; await r.statEdit('T', { lv: String(lv), s0: String(v + 10), s1: String(v), s5: String(STAT_CAP[5] - 1), s6: String(v - 1), point: '9999' }, 'apply'); await r.check({ probe: true, both: true });
    for (const a of [() => r.keyStat(0), () => r.keyStat(5), () => r.keyStat(6), () => r.keyDash(1), () => r.keyLevelUp(), () => r.keyStat(2), () => r.keyHistory(false, false), () => r.keyHistory(true, false)]) { r.step++; await a(); await r.check({ probe: true, both: true }); }
  }],
  // 2026-11 전의 판에서 만든 로그(타입 이름이 '베기'): 캐릭터는 알아보고 타입은 첫 타입으로 읽는다. 글을 칸에 남기고, 그 줄을 지금 이름으로
  // 고쳐 다시 불러오면 깨끗이 읽어 칸을 비운다
  ['옛 판의 타입 이름(루시안/베기): 첫 타입으로 읽고 글을 남긴다, 고쳐서 다시 불러오기', async (r) => {
    r.step++; await r.typeChange(1, 'side', 'go'); await r.check({});
    r.step++; await r.runKeys('KeyL', 8, 'levelUp'); await r.check({});
    r.step++; await r.runKeys('KeyS', 3, 'statUp', 0); await r.check({});
    const own = r.O.A.exportLog().split('\r').join('\r\n');
    const old = own.replace(/^([^ /\r\n]+)\/[^ \r\n]+ Bonus:/m, '$1/베기 Bonus:');
    r.step++; await r.importLog('unknownType', old, 'type', 'click', 'go'); await r.check({ probe: true, both: true });
    r.step++; await r.importLog('own', own, 'type', 'ctrlEnter', 'go'); await r.check({ probe: true, both: true });
  }],
  // 아래 둘도 끝에 둔다(PHONE_TOO 의 번호와 앞 순서들의 seed 가 그대로이게).
  // 상한이 285이던 판에서 스탯 편집으로 상한을 넘게 시작한 계획의 로그(oldEditLog): 원본처럼 LV 와 스탯을 상한으로 읽고, 확인 창과 불러온 뒤의
  // 안내가 그렇다고 말한다. 그 판의 타입 이름(루시안/베기)이면 첫 타입으로도 읽고 고치는 법을 말하며 글을 남긴다. 지금 이름으로 고쳐 다시
  // 불러오면 깨끗이 읽어 칸을 비운다. 그 뒤 최고 레벨·스탯 상한에서 조작한다
  [`상한을 넘는 옛 스탯 편집 로그(Status LV ${MAX_LV + 15}, STAB ${STAT_CAP[0] + 25}): 상한으로 읽고 알린다`, async (r) => {
    r.step++; await r.runKeys('KeyL', 5, 'levelUp'); await r.check({});
    r.step++; await r.importLog('capped', oldEditLog('베기'), 'type', 'click', 'go'); await r.check({ probe: true, both: true });
    r.step++; await r.importLog('capped', oldEditLog('베기형'), 'pasteBtn', 'P', 'go'); await r.check({ probe: true, both: true });
    for (const a of [() => r.keyLevelUp(), () => r.keyStat(0), () => r.keyStat(1), () => r.keyDash(3), () => r.keyHistory(false, false), () => r.keyHistory(true, false)]) { r.step++; await a(); await r.check({ probe: true, both: true }); }
  }],
  // 상한이 285이던 판에서 LV 285 까지 간 보통 계획의 로그(oldPlainLog): 최고 레벨을 넘는 레벨은 원본처럼 레벨업 없이 그 투자만 최고 레벨에서
  // 한다. 상한에 맞춰 읽었다고 알린다. 캐릭터/타입 줄을 지운 같은 로그는 지금 고른 캐릭터/타입으로 처음부터 읽고 그것도 말한다
  [`LV ${MAX_LV + 30} 까지 간 옛 로그: 최고 레벨에서 멈추고 알린다`, async (r) => {
    r.step++; await r.runKeys('KeyL', 3, 'levelUp'); await r.check({});
    r.step++; await r.importLog('capped', oldPlainLog(), 'ctrlV', 'ctrlEnter', 'go'); await r.check({ probe: true, both: true });
    r.step++; await r.importLog('capped', footerless(oldPlainLog()), 'type', 'click', 'go'); await r.check({ probe: true, both: true });
    for (const a of [() => r.keyLevelUp(), () => r.keyDash(5), () => r.keyHistory(false, true), () => r.keyHistory(true, true)]) { r.step++; await a(); await r.check({ probe: true }); }
  }],
  // 이 순서도 끝에 둔다(PHONE_TOO 의 번호와 앞 순서들의 seed 가 그대로이게).
  // 상한이 285이던 판에서 스탯 편집 없이 LV 256 전에 스탯이 상한을 넘은 몰빵 계획의 로그(oldAllInLog): 상한을 넘는 값은 끝의 LV: 요약 줄에만 있다.
  // 원본처럼 요약 줄은 읽지 않고 그 스탯은 상한에서 멈추며, 확인 창과 불러온 뒤의 안내가 상한에 맞춰 읽었다고 말하고 칸을 비운다
  [`LV ${MAX_LV + 1} 전에 스탯이 상한을 넘은 옛 몰빵 로그(요약 줄 STAB ${STAT_CAP[0] + 30}): 상한에 맞춰 읽고 알린다`, async (r) => {
    r.step++; await r.runKeys('KeyL', 4, 'levelUp'); await r.check({});
    r.step++; await r.importLog('capped', oldAllInLog(), 'type', 'click', 'go'); await r.check({ probe: true, both: true });
    for (const a of [() => r.keyLevelUp(), () => r.keyStat(0), () => r.keyDash(5), () => r.keyHistory(false, false)]) { r.step++; await a(); await r.check({ probe: true }); }
  }],
];

// ---- 시작 ----
(async () => {
  let browser;
  try { browser = await chromium.launch(); } catch (e) {
    console.log(`web-diff: 브라우저를 띄우지 못해 건너뜁니다(${String(e.message).split('\n')[0]}).`);
    process.exit(0);
  }
  const t0 = Date.now();
  const found = [];
  const total = { steps: 0, probes: 0, copies: 0, guideCopies: 0, guidePanels: 0, pointSubs: 0, dialogs: 0, imports: {}, acts: {}, known: {} };
  const add = (run) => {
    total.probes += run.stats.probes; total.copies += run.stats.copies; total.guideCopies += run.stats.guideCopies; total.dialogs += run.stats.dialogs;
    total.guidePanels += run.stats.guidePanels || 0; total.pointSubs += run.stats.pointSubs || 0;
    for (const [k, v] of Object.entries(run.stats.imports)) total.imports[k] = (total.imports[k] || 0) + v;
    for (const [k, v] of Object.entries(run.stats.acts)) total.acts[k] = (total.acts[k] || 0) + v;
    for (const [k, step, m] of run.known) { (total.known[k] = total.known[k] || []).push(`${run.name} #${step}: ${m}`); }
  };
  if (SCRIPTS !== '0') {
    // 스탯 편집 LV 1, 스탯 편집 직후 확인 창, 불러오기 중간 멈춤, 처음까지 되돌린 계획, 상한을 넘는 옛 스탯 편집 로그: 휴대폰 너비(캐릭터 시트의
    // 편집·초기화, 아래 바, 언제나 펼친 붙여넣은 로그 칸)에서도
    const PHONE_TOO = new Set([3, 7, 8, 9, 16]);
    const jobs = [];
    const pickName = SCRIPTS.startsWith('only:') ? SCRIPTS.slice(5) : '';
    SCRIPT_LIST.forEach(([name, body], k) => {
      if (pickName && !name.includes(pickName)) return;
      jobs.push([name, body, 'wide', 1000 + k]);
      if (PHONE_TOO.has(k)) jobs.push([name, body, 'phone', 2000 + k]);
    });
    for (const [name0, body, layout, seed] of jobs) {
      const name = layout === 'wide' ? name0 : `${name0} [${layout}]`;
      const { result, run } = await runOne(browser, seed, `정해 둔 순서 "${name}"`, body, layout);
      add(run); total.steps += run.step;
      console.log(`${result ? '어긋남' : 'OK    '} ${name} (조작 ${run.step}, 복사 ${run.stats.copies}+${run.stats.guideCopies}, 가이드 패널 ${run.stats.guidePanels || 0}, 원본 사본 비교 ${run.stats.probes})`);
      if (result) found.push(result);
    }
  }
  if (!SCRIPTS.startsWith('only')) {
    for (let s = FIRST; s < FIRST + SEEDS; s++) {
      const layout = s % 4 === 2 ? 'phone' : s % 4 === 3 ? 'mid' : 'wide';
      const { result, run } = await runOne(browser, s, `seed ${s} [${layout}]`, async (r) => {
        r.focus = r.R.ri(7);
        // 처음 캐릭터와 타입: 가끔 로아미니로 시작(화면의 옆 목록과 타입 단추로)
        const c = s % 7 === 0 ? 15 : r.R.ri(16);
        if (c !== 0) { r.step = 0; await r.charChange(c, r.R.chance(0.5) ? 'side' : 'sheet', 'go'); await r.check({}); }
        const t = r.R.ri(oracleNow(r.S).types.length);
        if (t !== oracleNow(r.S).type) { await r.typeChange(t, 'side', 'go'); await r.check({}); }
        for (let step = 1; step <= STEPS; step++) {
          r.step = step;
          await r.randomStep();
          await r.check({ probe: PROBE_EVERY > 0 && step % PROBE_EVERY === 0, both: step % 10 === 0 });
        }
      }, layout);
      add(run); total.steps += run.step;
      console.log(`${result ? '어긋남' : 'OK    '} seed ${s} [${layout}] (조작 ${run.step}, LV ${oracleNow(run.S).lv}, 원본 조작 ${run.O.trace.length}, 복사 ${run.stats.copies}+${run.stats.guideCopies}, 원본 사본 비교 ${run.stats.probes}, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
      if (result) found.push(result);
    }
  }
  await browser.close();
  console.log(`\n조작 ${total.steps}개, 원본 사본 비교 ${total.probes}번(POINT 밑 한 줄 ${total.pointSubs}번), 복사 비교 로그 ${total.copies}번·가이드 ${total.guideCopies}번, 가이드 패널 ${total.guidePanels}번, 확인 창 ${total.dialogs}번 (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  console.log('조작 종류: ' + Object.entries(total.acts).sort().map(([k, v]) => `${k} ${v}`).join(', '));
  console.log('불러온 글: ' + Object.entries(total.imports).sort().map(([k, v]) => `${k} ${v}`).join(', '));
  for (const [k, list] of Object.entries(total.known)) {
    console.log(`세어 둔 것 ${k}: ${list.length}번 (차이 아님) 예: ${list.slice(0, 3).join(' | ')}`);
  }
  if (!found.length) { console.log('web-diff: 어긋남 0'); process.exit(0); }
  console.log(`\nweb-diff: 어긋남 ${found.length}건`);
  for (const f of found) {
    console.log(`\n■ ${f.name}, ${f.step}번째 조작${f.where ? ` [${f.where}]` : ''}${f.shot ? ` (화면 ${f.shot})` : ''}${f.trace ? ` (조작 기록 ${f.trace})` : ''}`);
    console.log(`  화면 조작(${f.ui.length}): ${f.ui.slice(-25).join(' → ')}`);
    for (const m of f.msgs.slice(0, 20)) console.log(`  - ${m}`);
  }
  process.exit(1);
})();
