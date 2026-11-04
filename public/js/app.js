/* 나만의 재분배 시뮬레이터 웹판의 화면 스크립트. 원작 Flash판(rugumaxi, Apache License 2.0)을 옮긴 웹판의 일부다. */
/* 계산은 모두 엔진(js/engine.js, 하나뿐인 진실)이 한다. 이 파일은 엔진이 돌려준 것을 그리고, 조작을 엔진에 보낸다.
   화면의 모든 블록은 엔진에서 받은 모델 하나({ view, preview, dash, log, guide })에서 render(model) 하나로 그린다.
   모든 컨트롤은 이름 있는 조작(levelUp, statUp(i), dash(i), undo, redo, setBonus …)을 dispatch() 하나로 보내고,
   dispatch()가 엔진을 부른 뒤 결과(ok, sound)에 따라 누름 표시, 효과음, 다시 그리기, 자동 저장을 한다.
   그 밖에 화면이 맡는 것: 키보드와 초점, 효과음, 클립보드, 공유 링크, 자동 저장(이 브라우저에만), 대화상자. */
(() => {
  'use strict';

  // ---------- 도우미 ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NUM = new Intl.NumberFormat('ko-KR');            // 한 번 만들어 둔다(toLocaleString 은 부를 때마다 새로 만들어 느리다)
  const fmt = (n) => NUM.format(Number(n));
  const NB = '\u00a0';                                   // 숫자와 단위를 묶는다: 그 사이에서 줄이 바뀌지 않게
  // 낱말 잇개(보이지 않는다): 괄호와 그 앞의 말, 닫는 괄호와 뒤의 조사를 묶는다. '(물리복합)' 뒤에서 줄이 바뀌어
  // '으로'만 다음 줄 첫머리에 남지 않게(한글을 keep-all 로 묶어도 괄호 앞뒤에서는 줄이 바뀔 수 있다)
  const WJ = String.fromCharCode(0x2060);
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') for (const [p, val] of Object.entries(v)) el.style.setProperty(p, val);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false && kid !== '') el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    return el;
  }
  // 자식 바꾸기: null/false/빈 문자열은 넣지 않는다(replaceChildren은 null을 'null' 글자로 넣는다)
  const put = (node, ...kids) => node.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false && k !== '').map((k) => (k instanceof Node ? k : document.createTextNode(String(k)))));
  // 글자와 속성은 달라졌을 때만 쓴다: 같은 값을 다시 써도 브라우저는 그 자리의 스타일과 레이아웃을 다시 계산한다(키를 누르고 있는 동안)
  const setText = (node, t) => { if (node.textContent !== t) node.textContent = t; };
  const setAttr = (node, k, v) => { if (v == null) { if (node.hasAttribute(k)) node.removeAttribute(k); } else if (node.getAttribute(k) !== v) node.setAttribute(k, v); };
  const SVGNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, String(v));
    for (const kid of kids) if (kid) el.append(kid);
    return el;
  }
  // 아이콘은 글자에서 한 번만 만들고 그 사본을 쓴다(조작마다 수십 개를 그리므로)
  const iconCache = new Map();
  const icon = (markup) => {
    let n = iconCache.get(markup);
    if (!n) { const t = document.createElement('template'); t.innerHTML = markup.trim(); n = t.content.firstChild; iconCache.set(markup, n); }
    return n.cloneNode(true);
  };
  const ICON = {
    chev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    alert: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.75v4M8 10.9v.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    info: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 7.25v4M8 5v.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    minus: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6h7M6 2.5v7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    up: '<svg viewBox="0 0 8 8" aria-hidden="true"><path d="M4 .8 7.6 7.2H.4z"/></svg>',
    down: '<svg viewBox="0 0 8 8" aria-hidden="true"><path d="M4 7.2 7.6.8H.4z"/></svg>',
  };
  // 글자를 쓰는 칸(단축키를 멈추는 곳)
  const TEXT_FIELD = 'textarea, select, [contenteditable=""], [contenteditable="true"], input:not([type="radio"]):not([type="checkbox"]):not([type="range"]):not([type="button"]):not([type="submit"]):not([type="reset"])';
  // 화면 낭독기에 읽힐 한 문장(#live). 같은 문장도 다시 읽도록 비웠다가 넣는다. soon: 조작의 결과처럼 잇달아 올 수 있는 말은
  // 조금(150ms) 기다렸다가 넣는다. 그사이 다음 말이 오면 앞의 것은 버린다: 키를 누르고 있으면(자동 반복은 30ms 남짓 간격)
  // 손을 뗀 뒤 마지막 결과 하나만 읽힌다
  const live = $('#live');
  let liveTimer = 0;
  const announce = (msg, soon) => {
    clearTimeout(liveTimer);
    live.textContent = '';
    liveTimer = setTimeout(() => { live.textContent = msg; }, soon ? 150 : 30);
  };
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visible = (el) => !!el && el.getClientRects().length > 0;
  // 으로/로: 받침이 없거나 ㄹ이면 '로', 그 밖의 받침이면 '으로'
  const ro = (w) => { const c = w.charCodeAt(w.length - 1); if (c < 0xac00 || c > 0xd7a3) return '로'; const f = (c - 0xac00) % 28; return f === 0 || f === 8 ? '로' : '으로'; };
  // 스탯을 읽는 소리(스탭, 핵, 인트, 데프, 엠알, 덱스, 아지) 뒤의 은/는
  const TOPIC = { STAB: '은', HACK: '은', INT: '는', DEF: '는', MR: '은', DEX: '는', AGI: '는' };
  const planName = (a, b) => h('span', { class: 'nw' }, `${a}/${b}`);   // "캐릭터/타입"은 줄을 바꾸지 않는다
  const charType = () => h('span', { class: 'nw' }, '캐릭터/타입');      // 안내 글의 낱말 '캐릭터/타입'도 '/' 뒤에서 줄을 바꾸지 않는다

  // 브라우저 저장소: 막혀 있어도(사생활 보호 창 등) 화면은 그대로 동작해야 한다
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* 저장하지 못해도 화면은 그대로 */ } },
  };

  // ---------- 엔진과 그 표의 값 ----------
  // index.html 이 js/const.js, js/engine.js 를 이 파일보다 먼저 읽는다(CLAUDE.md '웹판'). 표의 값은 Oresim.CONST 에서 읽는다
  const Oresim = window.Oresim;
  const CONST = Oresim.CONST;
  const SHORTCUT = ['S', 'H', 'I', 'F', 'M', 'X', 'A'];
  const STAT_KEYS = ['STAB', 'HACK', 'INT', 'DEF', 'MR', 'DEX', 'AGI'];
  const STEP = 25;                                          // 비용 한 단계는 스탯 값 25칸(원본: floor((LV + 5×값) / 125)). 계단 그림에만 쓴다
  const statCap = (i) => CONST.MAX_STATUS[i];               // 스탯 상한: MAX_STATUS[0..6](255)
  const statRe = new RegExp(`\\b(${STAT_KEYS.join('|')})\\b`, 'g');

  // ---------- 로그와 가이드를 제 글자에서 읽는다 ----------
  const lines = (text) => String(text || '').split(/\r\n|\r|\n/);
  function parseLog(text) {
    const rows = [];
    for (const raw of lines(text)) {
      const line = raw.replace(/\s+$/, '');
      let m;
      if ((m = line.match(/^LV\s+(\d+)(?:\s*-\s*(\d+))?\s*:\s*(.*)$/))) rows.push({ kind: 'lv', from: +m[1], to: m[2] ? +m[2] : null, text: m[3].trim() });
      else if ((m = line.match(/^Bonus\s*:\s*(\d+)%/))) rows.push({ kind: 'bonus', rate: +m[1] });
      else if ((m = line.match(/^Xien\s*:\s*(.+)$/))) rows.push({ kind: 'xien', name: m[1].trim() });
      else if ((m = line.match(/^Status\s*:\s*(.+)$/))) rows.push({ kind: 'status', values: m[1].split(',').map((x) => parseInt(x, 10)) });
      else if ((m = line.match(/^(.+?)\/(.+?)\s+Bonus:\s*(\d+)\s*\/\s*(\d+)\s+Point:\s*(\d+)$/))) rows.push({ kind: 'footer', char: m[1], type: m[2], achieved: +m[3], levelUps: +m[4], point: +m[5] });
      else if ((m = line.match(/^LV:(\d+)\s+(.+)$/))) rows.push({ kind: 'summary', lv: +m[1], stats: [...m[2].matchAll(/([A-Z]+)\s+(\d+)/g)].map((x) => [x[1], +x[2]]) });
      else if (line.trim()) rows.push({ kind: 'other', text: line.trim() });
    }
    return rows;
  }
  // 화면의 로그는 조작마다 다시 읽는다: 글이 그대로면(설정만 바꾸거나 받아들이지 않은 조작) 지난번에 읽은 것을 쓴다
  let parsedFor = null, parsedRows = null;
  const parsedLog = (text) => { if (text !== parsedFor) { parsedFor = text; parsedRows = parseLog(text); } return parsedRows; };
  // Status 줄(78개 값, 옛 형식 46개): [0]LV [1]계열 [2]보너스% [6..12]스탯 [13..15]HP/MP/SP [17]POINT
  function parseStatus(a, v) {
    if (!a || a.length < 18 || a.some((x) => Number.isNaN(x))) return null;
    const x = a[1];
    const line = v.xien.lines.find((l) => l.x === x);
    const xname = line ? line.name : CONST.XIEN_NAME[x] || `계열 ${x}`;
    return { lv: a[0], rate: a[2], stats: a.slice(6, 13), hp: a[13], mp: a[14], sp: a[15], point: a[17], xien: xname };
  }
  function parseGuide(text) {
    const sections = [];
    let cur = null;
    for (const raw of lines(text)) {
      const line = raw.replace(/\s+$/, '');
      if (line.startsWith('■')) { cur = { title: line.slice(1).trim(), lines: [] }; sections.push(cur); } else if (cur) cur.lines.push(line);
    }
    return sections;
  }
  // 계열 이름 "<계열> <주 스탯>/<보너스 스탯>"(레벨업마다 주 스탯 +1, 보너스 때 보너스 스탯 +1)
  const splitLine = (name) => { const m = String(name).match(/^(.+?)\s+([A-Z]+)\/([A-Z]+)$/); return m ? { line: m[1], main: m[2], bonus: m[3] } : { line: name, main: null, bonus: null }; };

  // 스탯 이름을 굵게(시트의 규칙: 굵기는 이름표에), " * 9"는 "× 9"로
  function statText(text) {
    const out = [];
    const t = String(text).replace(/\s\*\s(\d+)/g, ' ×\u00a0$1');
    let last = 0;
    for (const m of t.matchAll(statRe)) {
      if (m.index > last) out.push(t.slice(last, m.index));
      out.push(h('span', { class: 'stat' }, m[1]));
      last = m.index + m[1].length;
    }
    if (last < t.length) out.push(t.slice(last));
    return out;
  }

  // ---------- 파생 값: 모델 하나에서 화면이 쓰는 값을 모두 만든다(순수 함수) ----------
  // 게임의 값(비용, 대시가 가는 곳, 다음 레벨업, 로그, 가이드)은 모두 엔진이 준 그대로 쓴다. 여기서 더하는 것은 그림의 자리
  // (비용 계단의 칸: 원본의 초록 숫자 nextStepAt 와 그 앞 25칸)와 문장에 넣을 말뿐이다.
  function derive(model, ctx) {
    const v = model.view;
    const p = model.preview;
    const prev = ctx && ctx.prev;
    const log = parsedLog(model.log);
    const lvRows = log.filter((r) => r.kind === 'lv');
    const footer = log.find((r) => r.kind === 'footer') || null;
    const summary = log.find((r) => r.kind === 'summary') || null;
    const atMax = v.lv >= v.maxLv;

    // 비용 계단: 지금 비용이 시작된 값(nextStepAt − 25, 1 이상), 비용이 오르는 값, 그 사이에서 값의 자리
    const stats = v.stats.map((st, i) => {
      const cap = statCap(i);
      // 상한까지 비용이 더 오르지 않는다. 상한에서 시작하는 단계(nextStepAt = 상한, 예: LV 225~229 의 230~254)는 그 값에서
      // 더 찍을 수 없으니 없는 단계다(받은 시트의 '필포' 표도 그 칸을 비운다. CLAUDE.md '데이터 교체')
      const lastStep = st.nextStepAt >= cap;
      const start = Math.max(1, st.nextStepAt - STEP);
      const top = lastStep ? cap : st.nextStepAt;
      const len = Math.max(1, top - start);
      const fill = st.atCap ? 1 : Math.min(1, Math.max(0, (st.value - start) / len));
      // 대시가 가는 곳: 엔진의 previewDash(i). null 이면 대시를 할 수 없다(dash(i) 가 ok: false)
      const dash = (model.dash && model.dash[i]) || null;
      const dashOn = !!st.canDash && dash !== null;
      return {
        ...st, i, shortcut: SHORTCUT[i], cap, lastStep, start, top, len, fill,
        one: st.atCap ? 0 : Math.min(1 - fill, 1 / len),            // +1 한 번의 폭
        hasPrev: st.nextStepAt - STEP > 1,
        dash, dashOn,
        // 계단 위 대시 미리보기의 끝: 대시 뒤의 값을 그린 칸 안으로(레벨업하며 가는 대시는 nextStepAt 앞에서 멈추는 일이 많다)
        dashTo: dashOn ? Math.min(1, Math.max(fill, (dash.value - start) / len)) : fill,
        left: top - st.value,
      };
    });
    const byKey = Object.fromEntries(stats.map((x) => [x.key, x]));
    // 원본처럼 중간에 멈춘 불러오기 뒤에는 updateStatus() 가 돌지 않아, 필요 포인트와 비용이 오르는 값(초록 숫자)이 그 앞 상태의
    // 것으로 남는다(원본도 그렇고, 다음 조작에서 바로잡힌다). 그때 화면은 원본처럼 그 숫자를 그대로 보이되, 그 숫자로 셈한 말(비용이
    // 오르는 곳, 'N부터 M', 몇 번 더 찍는지, 몇 회 찍으면 얼마 남는지)은 하지 않는다. 그 상태인지는 엔진에 물어 둔 것(model.stale,
    // costsStale)으로 안다. 값이 제 비용 단계 밖에 있는 스탯이 있으면 물어보지 않아도 그 상태다(바로잡힌 숫자에서는 생기지 않는다)
    const staleSteps = !!model.stale || stats.some((x) => !x.atCap && !x.lastStep && Number.isFinite(x.value + x.nextStepAt) && (x.value < x.start || x.value >= x.nextStepAt));

    // 발견: 계획이 포인트를 쏟는 스탯과 그 비용(로그의 몰빵 줄에서)
    const dumpRow = [...lvRows].reverse().find((r) => /몰빵/.test(r.text));
    const dumpKey = dumpRow && (dumpRow.text.match(statRe) || [])[0];
    const dump = dumpKey ? { key: dumpKey, from: dumpRow.from, to: dumpRow.to ?? dumpRow.from } : null;
    const open = stats.filter((x) => !x.atCap);
    const maxCost = open.length ? Math.max(...open.map((x) => x.cost)) : 0;
    const priciest = open.find((x) => x.cost === maxCost) || null;
    const focusStat = dump ? byKey[dump.key] : priciest;
    // 새 계획: 조작이 없고, 되돌려 둔 조작도 없고, 스탯 편집으로 시작하지도 않았다(지우기 전에 묻지 않는 계획과 같다, hasWork).
    // 처음까지 되돌린 계획(조작 0회, 다시 실행할 것이 있다)은 새 계획이 아니다
    const fresh = !hasWork(v);
    const rewound = v.actions === 0 && v.canRedo;

    // 직전 조작으로 바뀐 값(▲N): UI가 기억한 그 전 view와 비교
    const changes = prev ? {
      point: v.point - prev.point, lv: v.lv - prev.lv,
      stats: v.stats.map((x, i) => x.value - prev.stats[i].value),
      hp: v.hp.value - prev.hp.value, mp: v.mp.value - prev.mp.value, sp: v.sp.value - prev.sp.value,
    } : null;

    // 화면에 이미 있던 값과 달라진 숫자만 움직인다(설정만 바꾼 다시 그리기에는 움직임이 없다)
    const shown = ctx && ctx.shown;
    const moved = shown ? {
      point: shown.point !== v.point, lv: shown.lv !== v.lv,
      stats: v.stats.map((x, i) => shown.stats[i].value !== x.value),
      hp: shown.hp.value !== v.hp.value, mp: shown.mp.value !== v.mp.value, sp: shown.sp.value !== v.sp.value,
    } : null;
    const lineSel = v.xien.lines.find((l) => l.x === v.xien.selected) || v.xien.lines[0];
    return { v, p, prev, last: ctx && ctx.last, log, lvRows, footer, summary, atMax, stats, byKey, staleSteps, dump, priciest, focusStat, fresh, rewound, changes, moved, lineSel, logText: model.log || '', guide: model.guide || '' };
  }

  // 발견 문장: 제목 줄 밑에서 먼저 읽힌다
  function findingNodes(D) {
    const { v, p, dump, priciest, byKey } = D;
    // 비용이 오르는 곳은 엔진의 초록 숫자(nextStepAt)에서. 그 숫자가 옛 값으로 남은 상태(D.staleSteps)에서는 지금 비용만 말한다
    const costWords = (st) => (D.staleSteps ? `+1에${NB}${st.cost}포인트입니다.`
      : st.lastStep ? `+1에${NB}${st.cost}포인트, 상한 ${fmt(st.cap)}까지 그대로입니다.`
        : `+1에${NB}${st.cost}포인트, ${fmt(st.nextStepAt)}부터는${NB}${st.cost + 1}포인트입니다.`);
    // 'DEX(9포인트)입니다'는 한 덩어리로(괄호 뒤의 '입니다'만 다음 줄로 가지 않게)
    const priced = (st) => `${st.key}(${st.cost}포인트)${WJ}입니다.`;
    if (D.fresh) {
      // '레벨업(L)하면'은 한 덩어리로(괄호 앞뒤 어디에서도 줄이 바뀌지 않게)
      return [h('b', null, '새 계획입니다.'), ' ', `LV${NB}${fmt(v.lv)}에서 시작합니다.`, p ? ` 레벨업${WJ}(L)${WJ}하면 POINT가${NB}${fmt(p.point)} 늘어납니다.` : ''];
    }
    // 처음까지 되돌린 계획: 새 계획이 아니다(되돌린 조작이 남아 있고, 바꾸기 전에 묻는다)
    if (D.rewound) return [h('b', null, '처음으로 되돌렸습니다.'), ' ', `다시 실행${WJ}(→)${WJ}으로 되살릴 수 있습니다.`];
    if (D.atMax) {
      const can = D.stats.filter((x) => x.canUp).map((x) => x.key);
      return [h('b', null, `최고 레벨 LV${NB}${fmt(v.maxLv)}.`), ' ',
        can.length ? `더 오를 레벨이 없습니다. 남은 POINT로 지금 찍을 수 있는 스탯: ${can.join(', ')}.` : '더 오를 레벨이 없고, 남은 POINT로 찍을 수 있는 스탯도 없습니다.'];
    }
    if (dump) {
      const f = byKey[dump.key];
      if (f.atCap) {
        return [h('b', null, `LV${NB}${fmt(dump.from)}부터 ${f.key} 몰빵, 상한${NB}${fmt(f.cap)}에 닿았습니다.`), ' ',
          priciest ? `남은 스탯 가운데 가장 비싼 것은 ${priced(priciest)}` : ''];
      }
      return [h('b', null, `LV${NB}${fmt(dump.from)}부터 ${f.key} 몰빵 중.`), ' ',
        priciest && f.cost === priciest.cost
          ? `${f.key}${TOPIC[f.key] || '는'} 가장 비싼 스탯으로 ${costWords(f)}`
          : `${f.key}${TOPIC[f.key] || '는'} ${costWords(f)}${priciest ? ` 가장 비싼 스탯은 ${priced(priciest)}` : ''}`];
    }
    if (!priciest) return [h('b', null, '모든 스탯이 상한입니다.')];
    return [h('b', null, `${priciest.key}${TOPIC[priciest.key] || '는'} 가장 비싼 스탯입니다.`), ' ', `지금 ${costWords(priciest)}`];
  }
  // POINT 밑의 한 줄: 발견을 다음 조작으로 바꾼다(지금 포인트로 그 스탯을 몇 번 찍는지). 비용 단계가 옛 값으로 남은 상태에서는
  // 그 횟수를 셈할 수 없으므로 지금 비용만 말한다
  function pointSub(D) {
    const { v, p } = D;
    const f = D.fresh ? null : D.focusStat;
    if (f && !f.atCap) {
      const afford = D.staleSteps ? 0 : Math.max(0, Math.min(Math.floor(v.point / f.cost), f.top - f.value));
      if (afford > 0) return `${f.key} ${fmt(afford)}회(${fmt(afford * f.cost)}) 찍으면 ${fmt(v.point - afford * f.cost)} 남음`;
      return p ? `${f.key} +1에 ${f.cost} 필요 · 레벨업하면 +${fmt(p.point)}` : `${f.key} +1에 ${f.cost} 필요 · 레벨업 없음`;
    }
    if (p) return `레벨업하면 +${fmt(p.point)}`;
    const n = D.stats.filter((x) => x.canUp).length;
    return n ? `레벨업 없음 · 찍을 수 있는 스탯 ${n}개` : '레벨업 없음 · 찍을 수 있는 스탯 없음';
  }
  // 직전 조작을 말로(▲ 표시의 기준)
  function lastWords(D) {
    const { last, prev, v } = D;
    if (!last || !prev) return null;
    const a = last.args || [];
    const lvs = prev.lv !== v.lv ? `LV${NB}${fmt(prev.lv)} → ${fmt(v.lv)}` : '';
    switch (last.act) {
      case 'levelUp': return `레벨업 ${lvs}`;
      case 'statUp': { const k = STAT_KEYS[a[0]]; return `${k} +1 (POINT${NB}${fmt(prev.point - v.point)} 사용)`; }
      case 'dash': { const i = a[0]; return `${STAT_KEYS[i]} ${fmt(prev.stats[i].value)} → ${fmt(v.stats[i].value)} 찍기${lvs ? ` · 레벨업 ${fmt(v.lv - prev.lv)}회` : ''}`; }
      // ⇧+←/→ 는 한 레벨이 아니라 대시 단위로 움직인다(엔진의 undo(true)/redo(true), 원본 dashBack/dashProgress: 같은 스탯을 같은
      // 비용으로 찍은 조작을 사이의 레벨업과 함께, 보너스·주력 계열이 그대로인 동안 한꺼번에)
      case 'undo': return `되돌리기${a[0] ? '(대시 단위)' : ''}${lvs ? ` ${lvs}` : ''}`;
      case 'redo': return `다시 실행${a[0] ? '(대시 단위)' : ''}${lvs ? ` ${lvs}` : ''}`;
      case 'editCommit': return '스탯 편집';
      case 'importLog': case 'openShared': return '로그 불러오기';
      default: return null;
    }
  }
  // 변화 표시 ▲N(늘면 초록), ▼N(줄면 회색). +1 버튼과 헷갈리지 않게 더하기 기호를 쓰지 않는다
  function chg(n, base, isNew) {
    if (!n) return null;
    const up = n > 0;
    return h('span', { class: 'chg' + (up ? '' : ' down') + (isNew ? ' is-new' : ''), title: base ? `직전 조작(${base}) 대비 ${up ? '+' : '−'}${fmt(Math.abs(n))}` : null },
      icon(up ? ICON.up : ICON.down), fmt(Math.abs(n)),
      h('span', { class: 'sr-only' }, ` (직전 조작 대비 ${fmt(Math.abs(n))} ${up ? '증가' : '감소'})`));
  }

  // ---------- 블록 렌더(모두 D만 읽는다) ----------
  const el = {
    charList: $('#char-list'), cast: $('#cast'), scope: $('#open-chars'),
    portrait: $('#portrait'), name: $('#char-name'), typeLabel: $('#type-label'), types: $('#types'), sheetTypes: $('#sheet-types'), finding: $('#finding'),
    stripLead: $('#strip-lead'), stripVitals: $('#strip-vitals'), stats: $('#stats'),
    next: $('#next-half'), xien: $('#xien-half'),
    logTable: $('#log-table'), logSum: $('#log-sum'), guide: $('#guide'),
    abPoint: $('#ab-point'), abPointChg: $('#ab-point-chg'), abLv: $('#ab-lv'), abLvMax: $('#ab-lv-max'),
  };
  let first = true;          // 첫 그림에는 움직임이 없다(앱 화면은 등장 애니메이션을 하지 않는다)
  let lastD = null;

  // 틀: 옆 팔의 16명, 위 팔의 범위 버튼, 캐릭터 시트의 16명
  // 옆 팔의 말풍선(title)은 타입 줄이 숨는 너비(1180–1339px)에서만 단다. 타입 줄이 보이는 너비에서는 단추의 이름을 되풀이할
  // 뿐이라 화면 낭독기가 같은 말을 두 번 읽는다
  const typesHidden = matchMedia('(min-width: 1180px) and (max-width: 1339px)');
  function charTips() {
    for (const b of el.charList.querySelectorAll('[data-char]')) { if (typesHidden.matches) b.title = b.dataset.tip; else b.removeAttribute('title'); }
  }
  typesHidden.addEventListener('change', charTips);
  function renderFrame(D) {
    const { v } = D;
    const typesWords = (ch) => ch.types.join(`${NB}· `);   // 타입 줄이 줄을 바꿔도 구분점이 줄 첫머리에 오지 않게
    if (!el.charList.children.length) {
      el.charList.append(...v.chars.map((ch, c) => h('li', null,
        h('button', { type: 'button', class: 'char', 'data-char': c, 'data-tip': `${ch.name} · ${typesWords(ch)}${ch.startLv > 1 ? ` · LV ${ch.startLv}부터` : ''}` },
          h('img', { src: `img/c${c}.png`, alt: '', width: 28, height: 28 }),
          h('span', { class: 'char-text' },
            h('span', { class: 'char-name' }, ch.name, ch.startLv > 1 ? h('span', { class: 'char-start', 'aria-hidden': 'true' }, `LV${NB}${fmt(ch.startLv)}`) : null),
            h('span', { class: 'char-types' }, typesWords(ch) + (ch.startLv > 1 ? ` · LV${NB}${fmt(ch.startLv)}부터` : '')))))));
      charTips();
      el.cast.append(...v.chars.map((ch, c) => h('li', null,
        h('button', { type: 'button', 'data-char': c },
          h('img', { src: `img/c${c}.png`, alt: '', width: 84, height: 100 }),
          h('span', { class: 'cname' }, ch.name),
          ch.startLv > 1 ? h('span', { class: 'cmeta' }, `LV${NB}${fmt(ch.startLv)}부터`) : null))));
    }
    if (el.charList.dataset.cur !== String(v.char)) {
      el.charList.dataset.cur = String(v.char);
      $$('[data-char]', el.charList).concat($$('[data-char]', el.cast)).forEach((b) => {
        if (+b.dataset.char === v.char) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
    }
    const scopeKey = `${v.char}:${v.type}`;
    if (el.scope.dataset.key !== scopeKey) {
      // 범위 버튼(얼굴, 이름, 타입)은 캐릭터나 타입이 바뀔 때만 새로 짓는다
      el.scope.dataset.key = scopeKey;
      put(el.scope, h('img', { src: `img/c${v.char}.png`, alt: '', width: 28, height: 28 }),
        h('span', { class: 'scope-name' }, v.charName), h('span', { class: 'scope-type' }, v.typeName), icon(ICON.chev));
      el.scope.setAttribute('aria-label', `${v.charName} · ${v.typeName} 계획, 캐릭터와 타입 바꾸기`);
    }
  }

  // 제목 줄: 캐릭터, 타입, 발견
  // 타입 단추는 캐릭터가 바뀔 때만 새로 짓고, 타입이 바뀌면 눌림(aria-pressed)만 고친다: 방금 누른 단추에 초점이 남게
  function renderTitle(D) {
    const { v } = D;
    setAttr(el.portrait, 'src', `img/c${v.char}.png`);
    setText(el.name, v.charName);
    setText(el.typeLabel, v.typeName);
    if (el.types.dataset.char !== String(v.char)) {
      const typeButtons = () => v.chars[v.char].types.map((t, i) => h('button', { type: 'button', 'data-type': i }, t));
      put(el.types, ...typeButtons()); put(el.sheetTypes, ...typeButtons());
      el.types.dataset.char = String(v.char);
    }
    for (const b of [...el.types.children, ...el.sheetTypes.children]) setAttr(b, 'aria-pressed', +b.dataset.type === v.type ? 'true' : 'false');
    setAttr(el.types, 'aria-label', `타입 (바꾸면 LV ${v.chars[v.char].startLv}부터 새 계획)`);
    const fnodes = findingNodes(D);
    const fsig = fnodes.map((n) => (n instanceof Node ? `<b>${n.textContent}</b>` : String(n))).join('');
    if (el.finding.dataset.sig !== fsig) { el.finding.dataset.sig = fsig; put(el.finding, ...fnodes); }
    setText(resetWhat, `${v.charName}/${v.typeName} LV ${v.chars[v.char].startLv} 시작 상태로 되돌립니다. 바꾸기 전에 확인합니다.`);
    const title = `${v.charName} ${v.typeName} LV ${v.lv} · 나만의 재분배 시뮬레이터`;
    if (document.title !== title) document.title = title;
  }
  const resetWhat = $('#reset-what');

  // 1. 스탯 카드의 띠: POINT와 LV, HP / MP / SP(휴대폰에서는 일곱 줄 뒤)
  // 칸은 한 번 짓고, 숫자 줄과 밑줄을 따로 고친다: 그리는 것(숫자, ▲, 움직임, 밑줄)이 지난번과 같은 줄은 그대로 둔다
  // (키를 누르고 있는 동안 바뀐 줄만 새로 짓는다. 움직임은 숫자를 새로 지을 때 다시 시작한다)
  const stripCells = {};
  function stripCell(parent, key, label, lead, valueSig, value, subSig, sub) {
    let c = stripCells[key];
    if (!c || c.node.parentNode !== parent) {
      const valueP = h('p', { class: 'cell-value' + (lead ? ' lead' : '') });
      const subP = h('p', { class: 'cell-sub' });
      const node = h('div', { class: 'cell' + (lead ? ' lead-cell' : '') }, h('p', { class: 'cell-label' }, label), valueP, subP);
      parent.append(node);
      c = stripCells[key] = { node, valueP, subP, valueSig: null, subSig: null };
    }
    if (c.valueSig !== valueSig) { c.valueSig = valueSig; put(c.valueP, value()); }
    if (c.subSig !== subSig) { c.subSig = subSig; put(c.subP, sub()); }
  }
  function renderStrip(D) {
    const { v, changes: c, moved: mv } = D;
    const base = lastWords(D);
    const fig = (n, moved, cls) => h('span', { class: 'fig' + (cls ? ' ' + cls : '') + (moved ? ' is-changed' : '') }, fmt(n));
    const sub = pointSub(D);
    const pc = (c && c.point) || 0, pm = !!(mv && mv.point);
    stripCell(el.stripLead, 'point', 'POINT', true, JSON.stringify([v.point, pc, pm, pc ? base : '']), () => [fig(v.point, pm), chg(pc, base, pm)], sub, () => sub);
    const lm = !!(mv && mv.lv);
    const lvSub = D.atMax ? '최고 레벨' : `${fmt(v.maxLv - v.lv)}레벨 남음`;
    stripCell(el.stripLead, 'lv', 'LV', false, JSON.stringify([v.lv, lm, v.maxLv]), () => [fig(v.lv, lm), h('span', { class: 'unit' }, `/${NB}${fmt(v.maxLv)}`)], lvSub, () => lvSub);
    for (const [k, x, d0, m0] of [['HP', v.hp, c && c.hp, mv && mv.hp], ['MP', v.mp, c && c.mp, mv && mv.mp], ['SP', v.sp, c && c.sp, mv && mv.sp]]) {
      const d = d0 || 0, m = !!m0;
      stripCell(el.stripVitals, k, k, false, JSON.stringify([x.value, d, m, d ? base : '']), () => [fig(x.value, m), chg(d, base, m)],
        `${x.min}~${x.max}`, () => [h('span', { class: 'sr-only' }, '범위 '), `${fmt(x.min)}${NB}~ ${fmt(x.max)}`]);
    }
    // 아래쪽 안개 바(1100px 이하)도 같은 값을 읽는다
    const abSig = JSON.stringify([v.point, pc, pm, pc ? base : '', v.lv, v.maxLv]);
    if (el.abPoint.dataset.sig !== abSig) {
      el.abPoint.dataset.sig = abSig;
      el.abPoint.textContent = fmt(v.point);
      const ab = chg(pc, base, pm);
      put(el.abPointChg, ...(ab ? [ab] : []));
      el.abLv.textContent = fmt(v.lv);
      el.abLvMax.textContent = `/${NB}${fmt(v.maxLv)}`;
    }
  }

  // 비용 계단(시안 A의 SVG 획). 앞 계단 16px | 디딤판(늘어난다) | 챌판과 다음 디딤판 20px.
  // 디딤판의 좌표는 퍼센트라 너비가 바뀌어도 다시 그릴 필요가 없고, +1 미리보기는 눈금에서 시작해 최소 6px.
  // 대시 미리보기는 눈금에서 대시 뒤의 값(엔진의 previewDash)까지.
  // blank: 비용 단계가 옛 값으로 남은 상태(D.staleSteps). 디딤판의 자리를 그 옛 숫자로 정했으므로 값의 자리(채움, 눈금)와
  // 미리보기는 그리지 않고 빈 디딤판만 둔다(다음 조작에서 바로잡힌다)
  function stairEl(st, blank) {
    const pct = (x) => `${(x * 100).toFixed(3)}%`;
    const F = pct(st.fill);
    const end = st.atCap || (!blank && st.lastStep);
    return h('span', { class: 'stair' + (st.hasPrev && !blank ? '' : ' no-prev') + (end ? ' at-end' : ''), 'aria-hidden': 'true' },
      s('svg', { class: 'st-prev', width: 16, height: 24, focusable: 'false' }, s('path', { class: 'prev', d: 'M1 21H15V17' })),
      s('svg', { class: 'st-tread', height: 24, focusable: 'false' },
        s('line', { class: 'tread', x1: 0, x2: '100%', y1: 14, y2: 14 }),
        !blank && st.dashOn ? s('line', { class: 'pv pv-dash', x1: F, x2: pct(st.dashTo), y1: 14, y2: 14 }) : null,
        blank || st.atCap ? null : s('svg', { class: 'pv pv-up', x: F, y: 0, overflow: 'visible' },
          s('line', { x1: 0, x2: pct(st.one), y1: 14, y2: 14 }), s('line', { x1: 0, x2: 6, y1: 14, y2: 14 })),
        !blank && st.fill > 0 ? s('line', { class: 'fill', x1: 0, x2: F, y1: 14, y2: 14 }) : null,
        blank ? null : s('line', { class: 'tick', x1: F, x2: F, y1: 7, y2: 21 })),
      s('svg', { class: 'st-next', width: 20, height: 24, focusable: 'false' },
        s('path', { class: 'edge', d: end ? 'M1 17V3' : 'M1 17V5H19' })));
  }
  function renderStats(D) {
    const { changes: c, moved: mv } = D;
    const base = lastWords(D);
    if (!el.stats.children.length) {
      el.stats.append(h('div', { class: 'srow head', role: 'row' },
        h('span', { class: 's-name', role: 'columnheader' }, '스탯'),
        h('span', { class: 's-val', role: 'columnheader' }, '값'),
        h('span', { class: 's-chg', role: 'columnheader' }, h('span', { class: 'sr-only' }, '직전 조작으로 바뀐 값')),
        h('span', { class: 's-cost', role: 'columnheader' }, '필요 포인트'),
        h('span', { class: 's-stair', role: 'columnheader' }, '비용 계단'),
        h('span', { class: 's-act', role: 'columnheader' }, '찍기')));
      // 일곱 줄은 한 번 만들고 값만 바꾼다(누르는 동안 초점이 버튼에 남게)
      for (let i = 0; i < 7; i++) {
        el.stats.append(h('div', { class: 'srow', role: 'row', 'data-key': STAT_KEYS[i] },
          h('span', { class: 's-name', role: 'rowheader' }),
          h('span', { class: 's-val', role: 'cell' }),
          h('span', { class: 's-chg', role: 'cell' }),
          h('span', { class: 's-cost', role: 'cell' }),
          h('span', { class: 's-stair', role: 'cell' }),
          h('span', { class: 's-act', role: 'cell' },
            h('button', { type: 'button', class: 'btn up', 'data-up': i, 'aria-keyshortcuts': SHORTCUT[i] }, '+1', h('kbd', { 'aria-hidden': 'true' }, SHORTCUT[i])),
            h('button', { type: 'button', class: 'btn dash', 'data-dash': i, 'aria-keyshortcuts': `Shift+${SHORTCUT[i]}` }, h('span', { class: 'dest' }), h('kbd', { 'aria-hidden': 'true' }, '⇧' + SHORTCUT[i])))));
      }
    }
    D.stats.forEach((st, i) => {
      const row = el.stats.querySelector(`.srow[data-key="${st.key}"]`);
      const isFocus = !!(D.dump && D.dump.key === st.key && !st.atCap);
      const d = c && c.stats[i];
      const m = !!(mv && mv.stats[i]);
      const [nameC, valC, chgC, costC, stairC] = row.children;
      const up = row.querySelector('.up');
      const dash = row.querySelector('.dash');
      // 줄을 칸별로 그린다: 칸이 보여 주는 것(글자, ▲ 표시와 움직임, 말풍선)이 지난번과 같으면 그 칸은 그대로 둔다. 키를 누르고 있는
      // 동안 바뀐 칸만 새로 지어, 레이아웃과 스타일 다시 계산이 페이지의 작은 부분에서 끝나게
      const parts = row._parts || (row._parts = {});
      const part = (key, sig, draw) => { if (parts[key] !== sig) { parts[key] = sig; draw(); } };
      part('name', JSON.stringify([isFocus, isFocus && D.dump.from, isFocus && D.dump.to]), () => {
        row.classList.toggle('focus', isFocus);
        put(nameC, h('span', null, st.key), isFocus ? h('span', { class: 'pill', title: `LV ${fmt(D.dump.from)}–${fmt(D.dump.to)} 재분배 로그` }, '몰빵 중') : null);
      });
      part('val', JSON.stringify([st.value, d || 0, m, d ? base : '']), () => {
        put(valC, h('span', { class: m ? 'is-changed' : null }, fmt(st.value)), chg(d, base, m));
        put(chgC, ...[chg(d, base, m)].filter(Boolean));
      });
      part('cost', String(st.cost), () => put(costC, h('span', { class: 'c-label' }, `필요${NB}`), String(st.cost)));
      // 비용 계단의 말풍선. 비용 단계가 옛 값으로 남은 상태에서는 몇 번 더 찍는지 셈하지 않는다(다음 조작에서 바로잡힌다)
      const stale = D.staleSteps && !st.atCap;           // 상한은 값으로 정해지므로 그 상태에서도 그대로 말한다
      const stairTitle = st.atCap ? `${st.key}: 상한 ${fmt(st.cap)}`
        : stale ? `${st.key}: +1에 ${st.cost}포인트 · 비용이 오르는 값은 다음 조작 때 다시 계산됩니다`
          : st.lastStep ? `${fmt(st.start)}부터 상한 ${fmt(st.cap)}까지 +1에 ${st.cost}포인트 · ${fmt(st.left)}번 더 찍으면 상한`
            : `${fmt(st.start)}부터 ${fmt(st.nextStepAt - 1)}까지 +1에 ${st.cost}포인트 · ${fmt(st.left)}번 더 찍으면 ${fmt(st.nextStepAt)}`;
      part('stair', JSON.stringify([stairTitle, stale, st.fill, st.one, st.dashOn, st.dashTo, st.hasPrev, st.atCap, st.lastStep, st.nextStepAt, st.cost, st.cap]), () => {
        stairC.title = stairTitle;
        // 'N부터 M': 엔진의 초록 숫자 N에서 비용이 M(지금 비용 + 1)이 된다. 그 숫자가 옛 값이면 원본처럼 숫자만 보인다
        put(stairC, stairEl(st, stale), h('span', { class: 's-next' },
          st.atCap ? ['상한 ', h('b', null, fmt(st.cap))]
            : stale ? [h('b', null, fmt(st.nextStepAt))]
              : st.lastStep ? ['상한 ', h('b', null, fmt(st.cap))] : [h('b', null, fmt(st.nextStepAt)), `부터${NB}${st.cost + 1}`]));
      });
      // 꺼진 +1 의 까닭. 원본처럼 비용 단계가 옛 값으로 남으면 포인트가 넉넉해도 꺼져 있을 수 있다: 그때는 '포인트 부족'이라 하지 않는다
      const whyUp = st.canUp ? '' : st.atCap ? '상한입니다' : D.v.point >= st.cost ? '지금은 찍을 수 없습니다' : `포인트 부족: ${st.cost} 필요`;
      part('up', JSON.stringify([st.cost, whyUp]), () => {
        up.setAttribute('aria-label', `${st.key} +1, ${st.cost}포인트`);
        setDisabled(up, whyUp);
      });
      // 대시: 엔진의 previewDash 가 말하는 곳까지. 레벨업이 끼면 몇 번, LV 몇에서 몇까지인지도 말한다.
      // 말풍선(title)은 단추의 글자에 없는 것(레벨업 횟수)만: 이름과 같은 말을 되풀이하면 화면 낭독기가 두 번 읽는다
      const dd = st.dash;
      const ups = st.dashOn && dd.levelUps > 0 ? `레벨업 ${fmt(dd.levelUps)}번 (LV${NB}${fmt(D.v.lv)} → ${fmt(dd.lv)})` : '';
      const whyDash = st.dashOn ? '' : st.atCap ? '상한입니다' : D.atMax ? '최고 레벨이라 레벨업할 수 없고 포인트가 모자랍니다' : '지금은 대시할 수 없습니다';
      part('dash', JSON.stringify([st.dashOn && dd.value, ups, whyDash]), () => {
        const dest = dash.querySelector('.dest');
        if (st.dashOn) {
          setText(dest, `${fmt(dd.value)}까지`);
          setAttr(dash, 'aria-label', `${st.key} ${fmt(dd.value)}까지 찍기${ups ? `, ${ups}` : ''}`);
          setAttr(dash, 'aria-disabled', null);
          setAttr(dash, 'title', ups || null);
        } else {
          // 갈 곳이 없으면 숫자 대신 이 단추의 이름(까닭은 title 과 누를 때 읽어 준다)
          setText(dest, '대시');
          setAttr(dash, 'aria-label', `${st.key} 대시`);
          setDisabled(dash, whyDash);
        }
      });
    });
  }
  // aria-disabled 와 그 까닭(title, 누르면 읽어 준다)
  function setDisabled(b, why) {
    setAttr(b, 'aria-disabled', why ? 'true' : null);
    setAttr(b, 'title', why || null);
  }

  // 2. 레벨 카드: 다음 레벨업이 주는 것
  const bonusInput = h('input', { id: 'bonus', type: 'number', min: 0, max: 100, step: 5, inputmode: 'numeric', 'aria-describedby': 'bonus-record' });
  const stepDown = h('button', { type: 'button', 'data-step': '-5', 'aria-label': '보너스 5% 낮추기' }, icon(ICON.minus));
  const stepUp = h('button', { type: 'button', 'data-step': '5', 'aria-label': '보너스 5% 높이기' }, icon(ICON.plus));
  const nextParts = {
    meta: h('p', { class: 'meta' }), gains: h('dl', { class: 'gains' }),
    record: h('p', { class: 'record', id: 'bonus-record', title: '지금까지 보너스를 받은 레벨업 / 전체 레벨업' }),
    last: h('p', { class: 'last' }),
  };
  function renderNext(D) {
    const { v, p } = D;
    if (!el.next.children.length) {
      el.next.append(
        h('div', { class: 'half-head' }, h('h2', null, '다음 레벨업'), nextParts.meta),
        nextParts.gains,
        h('div', { class: 'bonus-row' },
          h('label', { for: 'bonus' }, '보너스'),
          h('div', { class: 'stepper' }, stepDown, bonusInput, h('span', { class: 'pct', 'aria-hidden': 'true' }, '%'), stepUp),
          nextParts.record),
        nextParts.last);
    }
    setText(nextParts.meta, p ? `LV${NB}${fmt(p.lv)}` : '최고 레벨');
    const gainsSig = JSON.stringify([p, D.lineSel && D.lineSel.name, v.bonus.rate, v.maxLv, D.stats.map((x) => x.atCap)]);
    if (nextParts.gains.dataset.sig === gainsSig) { /* 그대로 */ } else if (!p) {
      nextParts.gains.dataset.sig = gainsSig;
      nextParts.gains.dataset.mode = 'done';
      put(nextParts.gains, h('div', { class: 'gains-done', style: { 'grid-column': '1 / -1' } },
        h('dt', null, '더 받을 레벨업 보상 없음'), h('dd', null, `LV${NB}${fmt(v.maxLv)}, 최고 레벨`)));
    } else {
      nextParts.gains.dataset.sig = gainsSig;
      const ln = splitLine(D.lineSel.name);
      const mi = STAT_KEYS.indexOf(ln.main), bi = STAT_KEYS.indexOf(ln.bonus);
      const items = [{ dd: `POINT +${fmt(p.point)}`, dt: '레벨업 보상' }];
      if (mi >= 0) {
        const n = p.stats[mi];
        items.push(n ? { dd: `${ln.main} +${n}`, dt: `${ln.line} · 매 레벨` } : { dd: `${ln.main} +0`, dt: D.stats[mi].atCap ? `${ln.line} · 상한` : `${ln.line} · 매 레벨`, none: true });
      }
      if (bi >= 0) {
        const n = p.stats[bi];
        // 보너스는 난수가 아니라 정해져 있다: 이번 레벨업에 받는지 엔진의 preview가 알려 준다
        items.push(p.bonus && n ? { dd: `${ln.bonus} +${n}`, dt: `보너스 받음 · ${v.bonus.rate}%` } : { dd: `${ln.bonus} +0`, dt: p.bonus ? `보너스 · 상한` : `보너스 없음 · ${v.bonus.rate}%`, none: true });
      }
      // 칸 수가 같으면 글자만 고친다(레벨업마다 세 칸을 새로 짓지 않게)
      const cur = nextParts.gains.children;
      if (nextParts.gains.dataset.mode === 'items' && cur.length === items.length) {
        items.forEach((it, i) => { const div = cur[i]; div.classList.toggle('none', !!it.none); setText(div.children[0], it.dt); setText(div.children[1], it.dd); });
      } else {
        nextParts.gains.dataset.mode = 'items';
        put(nextParts.gains, ...items.map((it) => h('div', { class: it.none ? 'none' : null }, h('dt', null, it.dt), h('dd', null, it.dd))));
      }
    }
    if (document.activeElement !== bonusInput && bonusInput.value !== String(v.bonus.rate)) bonusInput.value = v.bonus.rate;
    // 끝(0%, 100%)에 닿은 −/+ 는 aria-disabled 로 끈다: disabled 로 끄면 그 단추에 있던 초점이 <body>로 떨어진다.
    // 누르면 까닭을 읽어 준다(문서의 click 처리기)
    setDisabled(stepDown, v.bonus.rate <= 0 ? '보너스는 0%보다 낮출 수 없습니다' : '');
    setDisabled(stepUp, v.bonus.rate >= 100 ? '보너스는 100%까지입니다' : '');
    const recordSig = `${v.bonus.achieved}/${v.bonus.levelUps}/${v.bonus.effective}`;
    if (nextParts.record.dataset.sig !== recordSig) {
      nextParts.record.dataset.sig = recordSig;
      put(nextParts.record, h('span', { class: 'sr-only' }, '지금까지 보너스 '), h('b', null, `${fmt(v.bonus.achieved)} / ${fmt(v.bonus.levelUps)}`), `회 · ${v.bonus.effective}`);
    }
    // ▲ 표시의 기준을 말로(그림 열쇠는 표시 그대로)
    const words = lastWords(D);
    const c = D.changes;
    const anyUp = c && (c.point > 0 || c.hp > 0 || c.stats.some((x) => x > 0));
    nextParts.last.hidden = !words;
    // ▲ 와 글은 한 줄에서 시작한다: 글이 길면 글 안에서 줄을 바꾼다(▲ 만 혼자 윗줄에 남지 않게, app.css .last)
    const lastSig = `${words || ''}|${anyUp ? 1 : 0}`;
    if (nextParts.last.dataset.sig !== lastSig) {
      nextParts.last.dataset.sig = lastSig;
      put(nextParts.last, ...(words ? [h('span', { class: 'chg' + (anyUp ? '' : ' down'), 'aria-hidden': 'true' }, icon(anyUp ? ICON.up : ICON.down)), h('span', { class: 'last-words' }, `직전 조작: ${words}`)] : []));
    }
  }

  // 2. 레벨 카드: 주력 계열(지금 레벨에서 고를 수 없는 계열은 고를 수 없게)
  function renderXien(D) {
    const { v } = D;
    const key = v.xien.lines.map((l) => l.x).join(',');
    let list = el.xien.querySelector('.xien-list');
    if (!list || list.dataset.key !== key) {
      const focused = document.activeElement && document.activeElement.name === 'xien';
      put(el.xien, 
        h('div', { class: 'half-head' }, h('h2', { id: 'xien-title' }, '주력 계열'), h('p', { class: 'meta', id: 'xien-meta' })),
        list = h('div', { class: 'xien-list', role: 'radiogroup', 'aria-labelledby': 'xien-title', 'data-key': key },
          v.xien.lines.map((l) => {
            const x = splitLine(l.name);
            return h('label', { class: 'xien-opt', 'data-x': l.x },
              h('input', { type: 'radio', name: 'xien', value: l.x }),
              h('span', { class: 'xien-text' },
                h('span', { class: 'xien-name' }, x.line),
                h('span', { class: 'xien-stats' }, x.main ? `${x.main}/${x.bonus}` : '')));
          })));
      if (focused) { const c = list.querySelector('input:checked') || list.querySelector('input'); if (c) c.focus(); }
    }
    const n = v.xien.lines.filter((l) => l.selectable).length;
    setText($('#xien-meta'), n === v.xien.lines.length ? `지금 ${n}개 선택 가능` : `${v.xien.lines.length}개 중 ${n}개 선택 가능`);
    // 고를 수 있는 줄과 고른 줄이 그대로면 줄들도 그대로(라디오의 checked 는 사람이 누르면 바뀌므로 그때는 열쇠와 상관없이 맞춘다)
    const linesSig = `${v.xien.selected}|${v.xien.lines.map((l) => (l.selectable ? 1 : 0)).join('')}`;
    const checked = list.querySelector('input:checked');
    if (list.dataset.sig === linesSig && checked && +checked.value === v.xien.selected) return;
    list.dataset.sig = linesSig;
    for (const l of v.xien.lines) {
      const opt = list.querySelector(`.xien-opt[data-x="${l.x}"]`);
      const input = opt.querySelector('input');
      const x = splitLine(l.name);
      input.checked = l.x === v.xien.selected;
      input.disabled = !l.selectable && l.x !== v.xien.selected;
      opt.title = l.selectable ? `${x.line}: 레벨업마다 ${x.main} +1, 보너스 때 ${x.bonus} +1` : '이 레벨에서는 고를 수 없습니다';
      // 고를 수 없는 줄은 화면 낭독기에도 그 까닭을(말풍선은 라벨에 달려 있어 단추의 설명이 되지 않는다)
      if (input.disabled) input.setAttribute('aria-describedby', 'xien-why'); else input.removeAttribute('aria-describedby');
    }
  }

  // 3. 로그: 화면에서는 용어집의 말로(복사하는 글자는 엔진이 쓴 그대로)
  // 구분점(·)은 앞 항목에 붙인다(앞은 줄바꿈 없는 공백): 줄이 바뀌어도 줄 끝에 남고 다음 줄 첫머리에 오지 않는다
  function statusSub(st) {
    return h('span', { class: 'set-sub' },
      [['POINT', st.point]].concat(STAT_KEYS.map((k, i) => [k, st.stats[i]]), [['HP', st.hp], ['MP', st.mp], ['SP', st.sp]])
        .flatMap(([k, n], j) => [j ? `${NB}· ` : '', h('span', null, `${k} `, h('b', null, fmt(n)))]));
  }
  // 로그 한 줄(<tr>). now: 지금 레벨의 줄에 '지금' 표지(본 로그만, 가이드 안의 로그에는 없다)
  const keyOf = (r, i) => `${r.kind}|${r.from ?? ''}|${r.to ?? ''}|${r.text ?? r.rate ?? r.name ?? ''}|${i}`;
  const isNowRow = (r, D) => r.kind === 'lv' && r.from <= D.v.lv && (r.to ?? r.from) >= D.v.lv;
  function logRow(r, D, now) {
    if (r.kind === 'lv') {
      const isNow = now && isNowRow(r, D);
      const what = r.text ? statText(r.text) : h('span', { class: 'none' }, isNow ? '아직 찍지 않음' : '찍지 않음');
      return h('tr', { class: 'lv-row' + (isNow ? ' now' : ''), 'aria-current': isNow ? 'step' : null },
        h('th', { class: 'lvc', scope: 'row' }, r.to == null ? fmt(r.from)
          : [fmt(r.from), h('span', { class: 'lv-dash', 'aria-hidden': 'true' }, '–'), h('span', { class: 'sr-only' }, '부터 '), fmt(r.to)]),
        h('td', { class: 'what' }, what, isNow ? h('span', { class: 'pill' }, '지금') : null));
    }
    if (r.kind === 'bonus' || r.kind === 'xien') {
      const k = r.kind === 'bonus' ? '보너스' : '주력 계열';
      const val = r.kind === 'bonus' ? `${r.rate}%` : r.name;
      return h('tr', { class: 'set' }, h('td', { class: 'lvc' }, h('span', { class: 'sr-only' }, '설정 변경')),
        h('td', { class: 'what' }, h('span', { class: 'set-text' }, h('span', { class: 'set-k' }, k), h('span', { class: 'set-v' }, val))));
    }
    if (r.kind === 'status') {
      const st = parseStatus(r.values, D.v);
      return h('tr', { class: 'set' }, h('td', { class: 'lvc' }, h('span', { class: 'sr-only' }, '시작 상태')),
        h('td', { class: 'what' }, h('span', { class: 'set-text' }, h('span', { class: 'set-k' }, '스탯 편집'),
          st ? [h('span', { class: 'set-v' }, `LV${NB}${fmt(st.lv)}에서 시작`), h('span', { class: 'set-sub' }, `보너스 ${st.rate}% · 주력 계열 ${st.xien}`), statusSub(st)]
            : h('span', { class: 'set-v' }, '이 레벨의 상태에서 시작'))));
    }
    return null;
  }
  function logBody(rows, D) {
    const body = h('tbody');
    rows.forEach((r) => { const tr = logRow(r, D, false); if (tr) body.append(tr); });
    return body;
  }
  const logKeys = (rows) => new Set(rows.map(keyOf));
  const logHead = () => h('thead', null, h('tr', null, h('th', { class: 'lvc', scope: 'col' }, 'LV'), h('th', { scope: 'col' }, '찍은 스탯')));
  // 로그의 마지막 두 줄(누구와 보너스 기록 | LV와 일곱 스탯을 정해진 칸에)
  function sumNodes(footer, summary) {
    const out = [];
    // 보너스와 POINT는 한 덩어리로 묶는다: 좁아서 줄이 바뀌면 계획 이름만 1줄에, 두 숫자는 함께 2줄에(하나만 남지 않게)
    if (footer) out.push(h('p', { class: 'sum-who' },
      h('span', null, h('b', null, planName(footer.char, footer.type))),
      h('span', { class: 'sum-figs' },
        h('span', null, '보너스 ', h('b', null, `${fmt(footer.achieved)} / ${fmt(footer.levelUps)}`), '회'),
        h('span', null, 'POINT ', h('b', null, fmt(footer.point))))));
    if (summary) out.push(h('p', { class: 'sum-stats' },
      h('span', null, 'LV ', h('b', null, fmt(summary.lv))),
      summary.stats.map(([k, n]) => h('span', null, `${k} `, h('b', null, fmt(n))))));
    return out;
  }
  let prevLogKeys = null;
  let logRows = new Map();   // 지난번에 그린 로그 줄(열쇠 → <tr>): 바뀌지 않은 줄은 그대로 두고 바뀐 줄만 새로 짓는다
  let sumView = null;        // 마지막 두 줄의 짜임과 그 숫자 칸들
  function renderLog(D) {
    const rows = D.log;
    const keys = logKeys(rows);
    // 새로 생긴 줄만 들어오는 움직임(로그를 통째로 바꾼 경우에는 움직이지 않는다)
    let newKeys = null;
    if (!D.still && prevLogKeys) {
      const added = [...keys].filter((k) => !prevLogKeys.has(k)).length;
      if (added > 0 && added <= 3) newKeys = prevLogKeys;
    }
    prevLogKeys = keys;
    const changed = el.logTable.dataset.src !== D.logText;
    el.logTable.dataset.src = D.logText;
    if (!el.logTable.tBodies.length) put(el.logTable, h('caption', { class: 'sr-only' }), logHead(), h('tbody'));
    el.logTable.caption.textContent = `${D.v.charName}/${D.v.typeName} 재분배 로그`;
    const body = el.logTable.tBodies[0];
    const next = new Map();
    const want = [];
    rows.forEach((r, i) => {
      const key = `${keyOf(r, i)}|${isNowRow(r, D) ? 'now' : ''}|${r.kind === 'status' ? `${D.v.char}:${r.values.join(',')}` : ''}`;
      let tr = logRows.get(key);
      if (tr) tr.classList.remove('is-new');
      else {
        tr = logRow(r, D, true);
        if (!tr) return;
        if (newKeys && !newKeys.has(keyOf(r, i))) tr.classList.add('is-new');
      }
      next.set(key, tr);
      want.push(tr);
    });
    want.forEach((tr, i) => { if (body.children[i] !== tr) body.insertBefore(tr, body.children[i] || null); });
    while (body.children.length > want.length) body.lastElementChild.remove();
    logRows = next;
    // 마지막 두 줄: 짜임(누구, 스탯 이름)이 같으면 숫자만 고친다
    const f = D.footer, s = D.summary;
    const sumKey = JSON.stringify([f && [f.char, f.type], s && s.stats.map((x) => x[0])]);
    const sumVals = [...(f ? [`${fmt(f.achieved)} / ${fmt(f.levelUps)}`, fmt(f.point)] : []), ...(s ? [fmt(s.lv), ...s.stats.map((x) => fmt(x[1]))] : [])];
    if (!sumView || sumView.key !== sumKey) {
      put(el.logSum, ...sumNodes(f, s));
      sumView = { key: sumKey, figs: $$('.sum-figs b, .sum-stats b', el.logSum) };
    }
    sumVals.forEach((t, i) => { if (sumView.figs[i]) setText(sumView.figs[i], t); });
    el.logSum.hidden = !(f || s);
    // 원본처럼 로그는 끝(방금 한 조작과 마지막 두 줄)이 보이게 내려 둔다. 끝으로 내리기는 render 끝에서 한 번
    if (changed) D.logMoved = true;
    const firstLv = D.lvRows.length ? D.lvRows[0].from : D.v.startLv;
    const n = lines(D.logText).filter((l) => l.trim()).length;
    railMeta.log = `LV${NB}${firstLv === D.v.lv ? fmt(firstLv) : `${fmt(firstLv)}–${fmt(D.v.lv)}`} · ${n}줄`;
  }

  // 3. 육성 가이드: 제 줄들에서 그린다(엔진이 쓴 글자)
  // 가이드는 수백 줄이라 조작마다 다시 짓지 않는다. 탭이 숨어 있으면 줄 수만 세어 두고 탭을 열 때 그린다. 보이고 있으면
  // 조작이 멈춘 뒤(120ms) 한 번, 키를 누르고 있어도 0.4초에 한 번은 그린다(첫 그림, 새 계획, 탭을 열 때는 바로)
  const guideLater = { timer: 0, since: 0 };
  function renderGuide(D, now) {
    const g = D.guide;
    railMeta.guide = g ? `텍스트 ${lines(g).length}줄` : '';
    clearTimeout(guideLater.timer);
    if (el.guide.dataset.src === g) { delete el.guide.dataset.stale; guideLater.since = 0; return; }
    el.guide.dataset.stale = '1';
    if ($('#panel-guide').hidden) return;
    if (!now && !D.still) {
      const t = performance.now();
      if (!guideLater.since) guideLater.since = t;
      const wait = Math.max(0, Math.min(120, guideLater.since + 400 - t));
      guideLater.timer = setTimeout(() => { if (lastD) renderGuide(lastD, true); }, wait);
      return;
    }
    guideLater.since = 0;
    delete el.guide.dataset.stale;
    el.guide.dataset.src = g;
    if (!g) {
      put(el.guide, h('p', { class: 'guide-empty' }, h('b', null, '아직 육성 가이드가 없습니다.'), ' 레벨업하거나 스탯을 찍으면 재분배 순서가 생깁니다.'));
      return;
    }
    const out = [];
    for (const sec of parseGuide(g)) {
      out.push(h('h3', null, sec.title));
      const ls = sec.lines;
      if (sec.title === '재분배 로그' || ls.some((l) => /^LV\s+\d+.*:/.test(l))) {
        const gl = parseLog(ls.join('\n'));
        out.push(h('table', { class: 'log-table' }, logHead(), logBody(gl, D)));
        const sum = sumNodes(gl.find((r) => r.kind === 'footer'), gl.find((r) => r.kind === 'summary'));
        if (sum.length) out.push(h('div', { class: 'log-sum' }, sum));
      } else if (sec.title === '재분배 순서' || ls.some((l) => /까지 찍기/.test(l))) {
        out.push(h('ol', { class: 'order' }, ls.filter((l) => l.trim()).map((l) => {
          let m;
          if ((m = l.match(/^시작 스탯\s*\{\s*(.+?)\s*\}\s*$/))) {
            const st = parseStatus(m[1].split(',').map((x) => parseInt(x, 10)), D.v);
            return h('li', { class: 'chapter' }, st ? `시작 스탯 · LV${NB}${fmt(st.lv)}에서 편집` : '시작 스탯', st ? [h('span', { class: 'set-sub' }, `보너스 ${st.rate}% · 주력 계열 ${st.xien}`), statusSub(st)] : null);
          }
          if ((m = l.match(/^(.+?까지 찍기)(?:\s*\((.+)\))?$/))) {
            const bits = (m[2] || '').split(',').map((x) => x.trim()).filter(Boolean);
            const at = bits.find((x) => /^Lv\s*\d+$/.test(x));
            const need = bits.find((x) => x.startsWith('필요 포인트'));
            return h('li', null, h('span', null, statText(m[1])), h('span', { class: 'at' }, at || ''), need ? h('span', { class: 'need' }, need) : null);
          }
          if (/^Lv\s*\d+부터/.test(l)) return h('li', { class: 'chapter' }, l.trim());
          return h('li', null, l.trim());
        })));
      } else {
        // 빈 줄로 나뉜 키-값 묶음: 스탯, 그다음 글을 올릴 때 채우는 장비 기입란
        const blocks = []; let b = [];
        for (const l of ls) { if (l.trim()) b.push(l); else if (b.length) { blocks.push(b); b = []; } }
        if (b.length) blocks.push(b);
        const kvOf = (line) => { const m = line.match(/^\[(.+?)\]\s*(.*)$/) || line.match(/^(\S+)\s+(.+)$/); return m ? { k: m[1], v: m[2].trim() } : null; };
        blocks.forEach((blk, i) => {
          const pairs = blk.map(kvOf).filter(Boolean);
          const kv = h('dl', { class: 'kv' }, pairs.map((pr) => h('div', null, h('dt', null, pr.k),
            pr.v ? h('dd', null, /^\d+$/.test(pr.v) ? fmt(pr.v) : pr.v) : h('dd', { class: 'blank' }, '—', h('span', { class: 'sr-only' }, '비어 있음')))));
          const empty = pairs.filter((pr) => !pr.v).length;
          if (i && empty) {
            out.push(h('details', { class: 'gear' },
              h('summary', null, h('span', { class: 'g-title' }, '장비 기입란'),
                h('span', { class: 'g-meta' }, empty === pairs.length ? `${pairs.length}칸 비어 있음` : `${pairs.length}칸 중 ${pairs.length - empty}칸 기입`), icon(ICON.chev)),
              kv));
          } else out.push(kv);
        });
      }
    }
    // 가이드를 새로 지어도 사람이 연 장비 기입란은 열린 채로, 그 안(또는 그 제목)에 있던 초점은 같은 자리로 돌려준다
    const gears = $$('details.gear', el.guide);
    const opened = gears.map((g) => g.open);
    const a = document.activeElement;
    const focusAt = a && el.guide.contains(a) && a !== el.guide ? gears.findIndex((g) => g.contains(a)) : -1;
    put(el.guide, ...out);
    const built = $$('details.gear', el.guide);
    built.forEach((g, i) => { if (opened[i]) g.open = true; });
    if (focusAt >= 0 && built[focusAt]) built[focusAt].querySelector('summary').focus({ preventScroll: true });
  }

  // 기록 버튼(상단 바와 아래쪽 바): 되돌릴 것, 다시 할 것, 최고 레벨
  const histButtons = { undo: $$('[data-act="undo"]'), redo: $$('[data-act="redo"]'), levelUp: $$('[data-act="levelUp"]') };
  function renderHistory(D) {
    const { v } = D;
    const why = { undo: v.canUndo ? '' : '되돌릴 조작이 없습니다', redo: v.canRedo ? '' : '다시 실행할 조작이 없습니다', levelUp: D.atMax ? '최고 레벨입니다' : '' };
    setText($('#undo-why'), why.undo); setText($('#redo-why'), why.redo); setText($('#levelup-why'), why.levelUp);
    for (const [act, keys] of [['undo', '← (⇧: 대시 단위)'], ['redo', '→ (⇧: 대시 단위)'], ['levelUp', 'L']]) {
      for (const b of histButtons[act]) {
        setAttr(b, 'aria-disabled', why[act] ? 'true' : null);
        setAttr(b, 'aria-describedby', why[act] ? `${act === 'levelUp' ? 'levelup' : act}-why` : null);
        setAttr(b, 'title', why[act] ? `${why[act]} · ${keys}` : `${{ undo: '되돌리기', redo: '다시 실행', levelUp: '레벨업' }[act]} · ${keys}`);
      }
    }
  }

  // 화면이 두 번 보여 주는 값은 서로 같아야 한다(어긋나면 콘솔에 남긴다). 값이 비용 단계 밖에 있는 것은 따로 검사하지 않는다:
  // 원본처럼 중간에 멈춘 불러오기 뒤에 엔진이 정말로 그렇게 알려 주는 상태다(derive 의 staleSteps)
  function check(D) {
    const { v, footer, summary } = D;
    console.assert(!footer || (footer.point === v.point && footer.achieved === v.bonus.achieved && footer.levelUps === v.bonus.levelUps && footer.char === v.charName && footer.type === v.typeName), '로그 마지막 줄의 캐릭터/타입, 보너스 기록, POINT가 화면과 같다');
    console.assert(!summary || (summary.lv === v.lv && summary.stats.every(([k, n]) => (D.byKey[k] ? D.byKey[k].value === n : true))), '로그의 스탯 줄이 스탯 표와 같다');
  }

  // 로그 칸은 끝(방금 한 조작과 마지막 두 줄)에 붙여 둔다(원본처럼). 그린 뒤 끝으로 내리고, 사람이 위로 굴리기 전까지는 칸의 높이가
  // 바뀌어도(붙여넣은 로그 칸이 열리고 커지거나, 그 밑에 안내 문장이 붙거나, 창 크기가 바뀌어도) 끝이 계속 보이게 한다
  // 붙임은 사람이 굴렸을 때만 다시 정한다(휠, 터치, 키, 스크롤 막대 끌기 뒤 1초 안의 scroll). 그린 뒤 끝으로 내린 것이나 칸의 크기가
  // 바뀌어 브라우저가 맞춘 것은 사람이 한 것이 아니다: 그 scroll 사건은 한 프레임 늦게 오므로, 칸이 줄어드는 동안(붙여넣은 로그 칸이
  // 커지는 240ms) 그때 재면 '끝이 아니다'로 잘못 읽힌다
  const logScroll = $('#log-scroll');
  let logPinned = true;
  let userUntil = 0, dragging = false;
  const byUser = () => { userUntil = performance.now() + 1000; };
  ['wheel', 'touchstart', 'touchmove', 'keydown'].forEach((t) => logScroll.addEventListener(t, byUser, { passive: true }));
  logScroll.addEventListener('pointerdown', () => { dragging = true; byUser(); });
  ['pointerup', 'pointercancel'].forEach((t) => addEventListener(t, () => { if (dragging) { dragging = false; byUser(); } }, true));
  logScroll.addEventListener('scroll', () => {
    if (!dragging && performance.now() > userUntil) return;
    logPinned = logScroll.scrollTop + logScroll.clientHeight >= logScroll.scrollHeight - 2;
  }, { passive: true });
  function pinLog() { logScroll.scrollTop = logScroll.scrollHeight; logPinned = true; }
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => { if (logPinned) pinLog(); }).observe(logScroll);

  // ---------- render(model): 화면의 하나뿐인 입구 ----------
  let model = null;
  let shownView = null;      // 마지막으로 그린 view(움직일 숫자를 고른다)
  const railMeta = { log: '', guide: '' };
  function render(next, ctx = {}) {
    model = next;
    // 첫 그림과 새 계획에는 움직임이 없다(앱 화면은 등장 애니메이션을 하지 않고, 새 계획은 한 걸음이 아니다)
    const still = first || !!ctx.newPlan;
    const D = derive(next, { ...ctx, shown: still ? null : shownView });
    D.still = still;
    shownView = next.view;
    lastD = D;
    renderFrame(D);
    renderTitle(D);
    renderStrip(D);
    renderStats(D);
    renderNext(D);
    renderXien(D);
    renderLog(D);
    renderGuide(D);
    renderHistory(D);
    syncTabs();
    check(D);
    // 원본처럼 로그는 끝(방금 한 조작과 마지막 두 줄)이 보이게 내려 둔다. 모든 블록을 그린 뒤 한 번만 레이아웃을 읽는다
    if (D.logMoved) pinLog();
    first = false;
    return D;
  }

  // ==========================================================================
  // 엔진: 하나뿐인 인스턴스 E. 시작할 때 만들고(자동 저장에서 되살리거나 새로), 로그 불러오기와 공유 링크는
  // 미리 읽어 본 엔진(후보)으로 통째로 바꾼다. 화면이 그리는 모든 값은 여기서 받는다
  // ==========================================================================
  let E = null;
  let broken = false;          // 엔진이 예외를 던졌다(엔진의 버그). 그 뒤로는 저장하지 않는다: 새로 고침하면 저장된 계획으로
  // 필요 포인트와 초록 숫자(비용이 오르는 값)가 옛 값으로 남은 상태인가. 원본 핸들러가 중간에 멈추면(엔진의 결과에 error: true,
  // 예: 'Bonus :75%' 줄이 든 로그) 원본의 updateStatus() 가 돌지 못해 그 숫자들이 앞 상태의 것으로 남는다. 다음에 updateStatus()
  // 를 도는 조작(받아들여진 레벨업·+1·대시·되돌리기·다시 실행·스탯 편집, 새 계획, 받아들여지지 않은 ←/→/대시)에서 바로잡히고,
  // 설정(보너스, 주력 계열)은 그것을 돌지 않는다. 그동안 화면은 그 숫자로 셈한 말을 하지 않는다(derive 의 staleSteps)
  let costsStale = false;
  const STAT_I = [0, 1, 2, 3, 4, 5, 6];
  // 스탯 편집 창의 값(editOpen)은 창을 열 때만 묻는다
  const buildModel = () => ({ view: E.view(), preview: E.preview(), dash: STAT_I.map((i) => E.previewDash(i)), log: E.exportLog(), guide: E.guide(), stale: costsStale });
  // 엔진 e 의 상태가 updateStatus() 를 거치지 못한 채인지 엔진에 묻는다: 사본에서 아무것도 하지 않는 조작(다시 실행할 것이 없을
  // 때의 →, 되돌릴 것이 없을 때의 ←)을 하면 원본처럼 updateStatus() 만 돈다. 그때 필요 포인트나 초록 숫자가 바뀌면 지금 숫자는
  // 옛 값이다. 둘 다 할 일이 있으면(그 상태에서는 생기지 않는다) 묻지 못한다: false. saved: 이미 가진 e 의 serialize() 결과
  function probeStale(e, saved) {
    try {
      const v = e.view();
      if (v.canRedo && v.canUndo) return false;
      const C = Oresim.createEngine(saved || e.serialize());
      if (!v.canRedo) C.redo(); else C.undo();
      const w = C.view();
      return w.stats.some((st, i) => !Object.is(st.cost, v.stats[i].cost) || !Object.is(st.nextStepAt, v.stats[i].nextStepAt));
    } catch (_) { return false; }
  }
  // 붙여넣은 로그를 지금 계획의 사본에서 먼저 읽어 본다(지금 계획은 그대로). { engine, r }
  function tryImport(text) {
    const C = Oresim.createEngine(E.serialize());
    return { engine: C, r: C.importLog(text) };
  }
  // 공유 링크의 계획을 새 엔진에 만든다: 로그를 읽고, 로그에 남지 않는 마지막 설정(보너스, 주력 계열)을 얹는다. 못 읽으면 null.
  // 알려진 예외 하나: 조작 0회인 계획(처음까지 되돌린 계획 등)의 로그 첫머리 'Bonus' 줄은 원본이 기록 맨 앞 칸에 써 둔 값이라
  // (보너스를 바꾸고 레벨업한 뒤 되돌린 값이 남는다) 받는 쪽에서 같은 글로 다시 만들 수 없다. 받는 쪽의 보너스는 b 로 같아지고,
  // 로그 글은 그 줄만 다를 수 있다(원본도 같다: 그 로그를 읽고 보너스를 맞추면 첫머리가 지금 보너스가 된다)
  function linkCandidate(data) {
    const C = Oresim.createEngine();
    const r = C.importLog(data.log);
    if (!r.ok) return null;
    if (typeof data.b === 'number') C.setBonus(data.b);
    if (typeof data.x === 'number') C.setXien(data.x);           // 지금 고를 수 없는 계열이면 그대로 둔다
    return { engine: C, r: { ok: true, sound: null }, stale: !!r.error && probeStale(C), typeLost: typeLost(r), capped: capped(r) };
  }
  // 후보 엔진으로 바꾼다(읽어 본 결과 그대로 돌려준다). 후보의 불러오기가 중간에 멈췄으면 비용 단계가 옛 값인지 묻는다
  function adopt(cand) {
    if (!cand || !cand.r || !cand.r.ok) return cand ? cand.r : { ok: false, sound: null };
    E = cand.engine;
    costsStale = cand.stale != null ? !!cand.stale : !!cand.r.error && probeStale(E);
    return cand.r;
  }
  // 버리면 아까운 계획인가: 조작이 하나라도 있거나, 되돌려 둔 조작(다시 실행할 것)이 있거나, 스탯 편집으로 시작한 계획
  // (조작 0회라도 입력한 상태가 있다). 처음까지 되돌린 계획도 → 로 그대로 되살릴 수 있으므로 지우기 전에 묻는다.
  // 스탯 편집으로 시작했는지는 이 계획의 시작 레벨 칸만 본다(원본 logOut 이 Status 줄을 쓰는 조건과 같다). 앞 계획의 편집 표지는
  // 시작 레벨 아래 칸에 남을 수 있다(엔진은 레벨업이 지나간 칸만 지운다): 예) LV 91 편집 → 초기화 → 로아미니(LV 200부터)
  const edited = (v) => String(v.levelLog[v.startLv - 1] || '').charAt(0) === 's';
  const hasWork = (v) => v.actions > 0 || v.canRedo || edited(v);
  // 로그 불러오기가 지금 계획을 그대로 두었다: 캐릭터/타입 줄도 LV 줄도 없어 처음부터 다시 읽지 않고 설정 줄(Bonus, Xien)만 반영했다
  const keptPlan = (r) => !!(r && r.ok && !r.footer && !r.restarted);
  // 캐릭터/타입 줄의 캐릭터는 알아봤지만 타입은 알아보지 못해 그 캐릭터의 첫 타입으로 읽었다(2026-11 에 이름이 바뀐 타입을 적은
  // 옛 로그·링크·자동 저장 등. 원본 logLoad 처럼 타입은 이름의 앞부분으로 맞춘다). 붙여넣은 로그, 공유 링크, 자동 저장이 같은 말로 알린다
  const typeLost = (r) => !!(r && r.footer && !r.typeFound);
  const firstTypeWords = (typeName, done) => `타입 이름을 알아보지 못해 첫 타입${WJ}(${typeName})${WJ}으로 ${done ? '읽었습니다' : '읽습니다'}.`;
  // 붙여넣은 로그만: 그 캐릭터/타입 줄을 고쳐 다시 불러오는 법(승인된 문구. 보기는 지금 있는 캐릭터/타입 이름이다)
  const fixTypeWords = () => ['다른 타입이었다면 로그 끝의 ', charType(), ` 줄을 지금 이름${WJ}(예: `, planName('루시안', '베기형'), `)${WJ}으로 고쳐 다시 불러오세요.`];
  // 글에 지금 상한(최고 레벨, 스탯 상한)을 넘는 값이 있어 엔진이 상한에 맞춰 읽었다(importLog 의 capped. 상한이 285이던 판에서 만든
  // 계획: 최고 레벨을 넘는 LV 줄, 스탯 편집으로 LV·스탯을 상한 넘게 시작한 Status 줄, LV 255 까지 스탯이 상한을 넘은 LV: 요약 줄).
  // 읽기가 중간에 멈췄으면(error) 멈춘 것만 알리고 이 말은 하지 않는다. 붙여넣은 로그, 공유 링크, 자동 저장이 같은 말로 알린다
  const capped = (r) => !!(r && r.capped && !r.error);
  const capWords = (done) => `LV나 스탯이 상한${WJ}(${fmt(CONST.MAX_LEVEL)})${WJ}을 넘어 상한에 맞춰 ${done ? '읽었습니다' : '읽습니다'}.`;

  // ==========================================================================
  // 디스패처: 모든 조작이 여기로 온다
  // ==========================================================================
  // 조작마다 화면에서 그것을 하는 버튼(누름 표시를 줄 곳)
  const controlsFor = (act, args) => {
    switch (act) {
      case 'levelUp': case 'undo': case 'redo': return $$(`[data-act="${act}"]`).filter(visible);
      case 'statUp': return [$(`[data-up="${args[0]}"]`)];
      case 'dash': return [$(`[data-dash="${args[0]}"]`)];
      case 'importLog': return [$('#load')];
      case 'reset': return [$('#reset')].filter(visible);
      default: return [];
    }
  };
  // 조작 → 엔진. 결과는 모두 { ok, sound, … }(CLAUDE.md '웹판 > 엔진'의 API). 로그 불러오기·공유 링크는 미리 읽어 본 후보를 넘겨받는다
  const ENGINE_ACTS = {
    levelUp: () => E.levelUp(),
    statUp: (i) => E.statUp(i),
    dash: (i) => E.dash(i),
    undo: (byLevel) => E.undo(!!byLevel),
    redo: (byLevel) => E.redo(!!byLevel),
    setBonus: (rate) => E.setBonus(rate),
    setXien: (x) => E.setXien(x),
    setChar: (c) => E.setChar(c),
    setType: (t) => E.setType(t),
    reset: () => E.reset(),
    editCommit: (values) => E.editCommit(values),
    importLog: (text, cand) => adopt(cand || tryImport(text)),
    openShared: (data, cand) => adopt(cand || linkCandidate(data)),
  };
  // 다시 그리는 방식. 한 걸음: ▲ 표시와 '직전 조작'. 설정만 바꿈: 앞 걸음의 ▲를 그대로 둔다(설정은 기록의 한 걸음이 아니고
  // 숫자도 바꾸지 않는다). 새 계획(캐릭터·타입·초기화·불러오기·링크): ▲도 움직임도 없이
  const STEP_ACTS = new Set(['levelUp', 'statUp', 'dash', 'undo', 'redo', 'editCommit']);
  const SETTING_ACTS = new Set(['setBonus', 'setXien']);
  function pressFlash(btn) {
    if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
    btn.classList.add('is-pressed');
    clearTimeout(btn._press);
    btn._press = setTimeout(() => btn.classList.remove('is-pressed'), 160);
  }
  // 엔진이 던진 예외는 엔진의 버그다: 알리고, 페이지는 그대로 쓸 수 있게 둔다. 그 뒤의 상태는 믿을 수 없으므로 저장하지 않는다
  function engineFailed(err) {
    console.error('나만의 재분배 시뮬레이터: 엔진 오류', err);
    if (!broken) {
      broken = true;
      cancelSave();
      paintSaved();
    }
    if (!confirmDlg.open) ask({ title: '계산 중 오류가 났습니다', desc: '새로 고침하면 저장된 계획으로 돌아갑니다. 이 오류 뒤의 조작은 저장하지 않습니다.', go: '확인', single: true });
  }
  // 엔진에서 모델을 다시 받아 그린다. 모델을 만들다 예외가 나면 화면은 앞의 그림 그대로 둔다
  function redraw(ctx) {
    try { render(buildModel(), ctx || {}); return true; } catch (err) { engineFailed(err); return false; }
  }
  // 엔진의 상태가 화면에 그린 것과 다를 때만 다시 그리고 저장한다(받아들이지 않은 조작 뒤). 받아들이지 않은 조작이 상태를 바꿨다면
  // 원본의 updateStatus() 가 돈 것이다(←/→/대시): 옛 값으로 남았던 비용 단계도 그때 바로잡혔다
  function refreshIfChanged(ctx) {
    let m;
    try { m = buildModel(); } catch (err) { engineFailed(err); return; }
    if (model && m.log === model.log && m.guide === model.guide
      && JSON.stringify([m.view, m.preview, m.dash]) === JSON.stringify([model.view, model.preview, model.dash])) return;
    costsStale = false;
    m.stale = false;
    try { render(m, ctx); } catch (err) { engineFailed(err); return; }
    planChanged();
  }
  // 받아들여진 조작을 화면 낭독기에도 짧게 알린다(보이는 사람은 ▲ 표시와 '직전 조작' 줄로 안다). 키를 누르고 있으면 마지막 것만.
  // 스탯 편집(창이 닫힐 때), 로그 불러오기(붙여넣은 로그 칸의 안내), 공유 링크(열 때), 주력 계열(라디오가 스스로)은 제자리에서 알린다
  function speak(act) {
    const D = lastD;
    if (!D) return;
    const v = D.v;
    if (STEP_ACTS.has(act) && act !== 'editCommit') { const w = lastWords(D); if (w) announce(`${w}, POINT ${fmt(v.point)}`, true); }
    else if (act === 'setChar' || act === 'setType') announce(`${v.charName}/${v.typeName} LV ${fmt(v.lv)}부터 새 계획`, true);
    else if (act === 'reset') announce(`스탯을 초기화했습니다. ${v.charName}/${v.typeName} LV ${fmt(v.lv)}부터 새 계획`, true);
    else if (act === 'setBonus') announce(`보너스 ${v.bonus.rate}%, 다음 레벨업부터`, true);
  }
  /**
   * dispatch(act, ...args) — 이름 있는 조작 하나를 보낸다.
   * 엔진 조작: levelUp, statUp(i), dash(i), undo(byLevel), redo(byLevel), setBonus(rate), setXien(x), setChar(c), setType(s),
   *   reset, editCommit(values), importLog(text[, 후보]), openShared({ log, b, x }[, 후보])
   * 화면만의 조작(엔진 상태는 그대로, 알림만): keepSaved, copyLog, copyGuide, share, paste, clearPaste, toggleGuide,
   *   setVolume(v), setMuted(m)
   * 엔진이 받아들이면(r.ok) 누름 표시, 효과음(r.sound), 다시 그리기, 자동 저장. 거절하면(ok: false) 까닭을 읽어 준다.
   * 돌려주는 값은 엔진의 결과 그대로다.
   */
  function dispatch(act, ...args) {
    const run = ENGINE_ACTS[act];
    const ctl = controlsFor(act, args);
    const prev = model ? model.view : null;
    let r = { ok: true, sound: null };
    let threw = false;
    if (run) {
      try { r = run(...args) || { ok: false, sound: null }; } catch (err) { threw = true; r = { ok: false, sound: null, error: true }; engineFailed(err); }
    }
    // 다른 부분(검사 스크립트 등)이 들을 수 있게 알린다
    document.dispatchEvent(new CustomEvent('oresim:action', { detail: { act, args, ok: !!r.ok } }));
    if (!run) return r;
    // 비용 단계가 옛 값으로 남았는가(costsStale): 원본 핸들러가 중간에 멈췄으면 엔진에 묻고, updateStatus() 를 도는 조작을
    // 받아들였으면 바로잡혔다. 설정(보너스, 주력 계열)은 그대로 둔다. 불러오기·공유 링크는 후보를 받을 때(adopt) 정했다
    if (act === 'importLog' || act === 'openShared') { if (threw) costsStale = probeStale(E); }
    else if (threw || r.error) costsStale = probeStale(E);
    else if (r.ok && !SETTING_ACTS.has(act)) costsStale = false;
    if (threw) { redraw({ newPlan: true }); return r; }               // 무엇이 바뀌었는지 모르므로 움직임 없이 다시 그린다
    const keepMarks = { prev: lastD && lastD.prev, last: lastD && lastD.last };
    if (!r.ok && !r.error) {
      // 받아들이지 않은 조작이라도 원본은 updateStatus() 를 돌리는 일이 있다(←/→/대시). 보통은 바뀌는 것이 없지만, 원본처럼 중간에
      // 멈춘 불러오기 뒤에는 그때 필요 포인트·비용이 오르는 값·단추가 바로잡힌다. 엔진의 상태가 그린 것과 달라졌으면 앞 걸음의 ▲를
      // 그대로 두고 다시 그린다. 까닭은 다시 그린 뒤의 단추에서 읽는다
      refreshIfChanged(keepMarks);
      const b = ctl.find((x) => x && x.getAttribute('aria-disabled') === 'true');
      const why = b && (b.getAttribute('aria-describedby') ? ($('#' + b.getAttribute('aria-describedby')) || {}).textContent : b.title);
      if (why) announce(why);
      return r;
    }
    if (r.ok) { ctl.forEach(pressFlash); if (r.sound) playSound(r.sound); }
    // 설정 줄만 읽은 불러오기는 계획을 그대로 두므로 설정 바꾸기처럼 그린다
    const ctx = STEP_ACTS.has(act) ? { prev, last: { act, args } }
      : SETTING_ACTS.has(act) || (act === 'importLog' && keptPlan(r)) ? keepMarks
        : { newPlan: true };
    const drawn = redraw(ctx);
    planChanged();
    // 원본 핸들러가 중간에 멈추는 입력(Flash 의 예외와 같은 자리): 멈춘 데까지 바뀐 상태가 남는다. 불러오기는 제 칸에서 알린다
    if (r.error && act !== 'importLog') note('error', '이 조작은 원본 Flash판처럼 중간에 멈췄습니다. 멈춘 데까지만 반영했습니다.');
    else if (drawn && r.ok) speak(act);
    return r;
  }

  // ==========================================================================
  // 효과음: Web Audio로 겹쳐 재생(빠르게 눌러도 끊기지 않게), 첫 조작 때 깨운다. file:// 처럼 fetch를 못 하면 <audio>로
  // ==========================================================================
  const Sound = (() => {
    const FILES = { lvup: 'se/lvup.mp3', stup: 'se/stup.mp3' };
    let volume = Math.max(0, Math.min(100, Number(store.get('oresim.sound.volume', 50)) || 0));
    let muted = !!store.get('oresim.sound.muted', false);
    let ctx = null, gain = null, primed = false, loading = null;
    const buffers = {};
    const elements = {};
    const AC = window.AudioContext || window.webkitAudioContext;
    function load() {
      if (loading) return loading;
      // file:// 에서는 fetch 가 막히므로(콘솔 오류만 남는다) 처음부터 <audio>로 한다
      if (location.protocol === 'file:') return (loading = Promise.resolve());
      loading = Promise.all(Object.entries(FILES).map(([k, url]) => fetch(url)
        .then((res) => { if (!res.ok) throw new Error(res.status); return res.arrayBuffer(); })
        .then((buf) => new Promise((ok, fail) => ctx.decodeAudioData(buf, ok, fail)))
        .then((b) => { buffers[k] = b; })
        .catch(() => { /* 실패하면 <audio>로 */ })));
      return loading;
    }
    function prime() {
      if (primed) return;
      primed = true;
      try {
        if (AC) { ctx = new AC(); gain = ctx.createGain(); gain.gain.value = volume / 100; gain.connect(ctx.destination); load(); }
      } catch (_) { ctx = null; }
      for (const [k, url] of Object.entries(FILES)) { try { elements[k] = new Audio(url); elements[k].preload = 'auto'; } catch (_) { /* 소리 없이 */ } }
    }
    function play(name) {
      if (!FILES[name] || muted || volume <= 0) return;
      if (!primed) prime();
      try {
        if (ctx && buffers[name]) {
          if (ctx.state === 'suspended') ctx.resume();
          const src = ctx.createBufferSource();
          src.buffer = buffers[name];
          src.connect(gain);
          src.start();
          return;
        }
        const base = elements[name];
        if (!base) return;
        const a = base.cloneNode();
        a.volume = volume / 100;
        const pr = a.play();
        if (pr && pr.catch) pr.catch(() => {});
      } catch (_) { /* 소리 없이 */ }
    }
    function setVolume(v) { volume = Math.max(0, Math.min(100, Math.round(v))); if (gain) gain.gain.value = volume / 100; store.set('oresim.sound.volume', volume); }
    function setMuted(m) { muted = !!m; store.set('oresim.sound.muted', muted); }
    // 첫 사용자 조작에서 깨운다(브라우저는 그 전의 소리를 막는다)
    const wake = () => { prime(); if (ctx && ctx.state === 'suspended') ctx.resume(); };
    addEventListener('pointerdown', wake, { capture: true, once: true });
    addEventListener('keydown', wake, { capture: true, once: true });
    return { play, setVolume, setMuted, get volume() { return volume; }, get muted() { return muted; } };
  })();
  /** playSound('lvup' | 'stup') — dispatch 가 엔진 결과의 sound 로 부른다 */
  function playSound(name) { Sound.play(name); }

  // ==========================================================================
  // 상호작용: 누름, 대화상자, 확인, 탭, 복사, 링크, 붙여넣은 로그, 설정, 키보드
  // ==========================================================================
  // 못 쓰는 컨트롤을 누르면 아무 일 없이 끝나지 않고 까닭을 읽어 준다
  // (지금 고를 수 없는 주력 계열 줄도: 그 라디오는 진짜로 disabled 라 클릭이 change 를 만들지 않는다)
  document.addEventListener('click', (e) => {
    if (!e.target.closest) return;
    const opt = e.target.closest('.xien-opt');
    if (opt) { const input = opt.querySelector('input'); if (input && input.disabled && opt.title) announce(opt.title); return; }
    const b = e.target.closest('[aria-disabled="true"]');
    if (!b) return;
    const why = b.getAttribute('aria-describedby') ? ($('#' + b.getAttribute('aria-describedby')) || {}).textContent : b.title;
    if (why) announce(why);
  });

  const keysPop = $('#keys-pop');
  const popOpen = () => { try { return keysPop.matches(':popover-open'); } catch (_) { return false; } };

  // 대화상자: 연 컨트롤에서 옅어지며 살짝 커진다(시트는 아래에서 올라온다). 초점은 안에 머물고(showModal),
  // Esc / 취소 / 바깥을 누르면 닫히며, 초점은 연 컨트롤로 돌아간다
  function openDialog(dlg, from) {
    if (dlg.open) return;
    if (popOpen()) keysPop.hidePopover();
    hidePops();
    dlg._opener = from || document.activeElement;
    dlg.classList.remove('is-closing');
    dlg.showModal();
    requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('is-open')));
  }
  function closeDialog(dlg, value) {
    if (!dlg.open || dlg.classList.contains('is-closing')) return;
    dlg.classList.add('is-closing');
    dlg.classList.remove('is-open');
    let done = false;
    const finish = () => { if (done) return; done = true; dlg.classList.remove('is-closing'); dlg.close(value || ''); };
    if (reduceMotion()) return finish();
    const onEnd = (e) => { if (e.target === dlg) { dlg.removeEventListener('transitionend', onEnd); finish(); } };
    dlg.addEventListener('transitionend', onEnd);
    setTimeout(finish, 360);
  }
  // 대화상자가 닫히고 초점을 돌려준 뒤에 무언가를 한다(시트에서 다음 대화상자로 넘길 때)
  const closeThen = (dlg, fn) => { dlg.addEventListener('close', () => setTimeout(fn, 0), { once: true }); closeDialog(dlg, 'cancel'); };
  for (const dlg of $$('dialog')) {
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(dlg, 'cancel'); });
    dlg.addEventListener('close', () => { const o = dlg._opener; dlg._opener = null; if (o && o.isConnected && visible(o)) o.focus(); });
    $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => closeDialog(dlg, 'cancel')));
    const form = $('form', dlg);
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); closeDialog(dlg, e.submitter ? e.submitter.value : ''); });
  }
  // 바깥(가림막)을 누르면 시트와 확인 창이 닫힌다(스탯 편집은 닫지 않는다: 입력한 값을 잃으므로)
  ['#char-sheet', '#confirm'].forEach((sel) => $(sel).addEventListener('click', (e) => { if (e.target === e.currentTarget) closeDialog(e.currentTarget, 'cancel'); }));

  // ---------- 확인 창: 계획을 지우는 전환과 공유 링크 ----------
  const confirmDlg = $('#confirm');
  let confirmGo = null, confirmCancel = null;
  let confirmKind = '';        // 지금 확인 창이 묻는 것: 'link'(공유 링크) 또는 ''(그 밖)
  const confirmShown = () => confirmDlg.open && !confirmDlg.classList.contains('is-closing');
  // 공유 링크를 묻는 확인 창이 떠 있다(닫히는 중이 아니다): 새 링크가 오면 그 물음을 새 링크의 것으로 바꾼다
  const askingLink = () => confirmKind === 'link' && confirmShown();
  function ask(opts) {
    const { title, desc, go = '바꾸기', cancel = '취소', onGo, onCancel, from, single = false, kind = '' } = opts;
    // 확인 창이 이미 열려 있으면(닫히는 중 포함) 그 창의 글과 처리기를 덮어쓰지 않고, 닫힌 뒤에 묻는다. 다만 앞 링크를 묻는 창에
    // 새 링크가 오면(주소창에 다른 링크를 붙여넣었다) 그 자리에서 새 링크의 물음으로 바꾼다: 앞 링크는 이제 주소창의 링크가 아니다
    const replace = kind === 'link' && askingLink();
    if (confirmDlg.open && !replace) { confirmDlg.addEventListener('close', () => setTimeout(() => ask(opts), 0), { once: true }); return; }
    $('#confirm-title').textContent = title;
    put($('#confirm-desc'), ...[].concat(desc));
    $('#confirm-go').textContent = go;
    $('#confirm-cancel').textContent = cancel;
    $('#confirm-cancel').hidden = single;
    confirmGo = onGo || null; confirmCancel = onCancel || null; confirmKind = kind;
    if (replace) announce(`${title} ${$('#confirm-desc').textContent}`);   // 같은 창에서 글만 바뀌었다
    else openDialog(confirmDlg, from);
  }
  // 앞 링크를 묻던 창을 아무 일 없이 닫는다(새 링크가 지금 계획과 같거나, 묻지 않고 열 때)
  const dropLinkAsk = () => { if (!askingLink()) return; confirmGo = confirmCancel = null; closeDialog(confirmDlg, 'cancel'); };
  confirmDlg.addEventListener('close', () => {
    const go = confirmDlg.returnValue === 'go';
    const fn = go ? confirmGo : confirmCancel;
    confirmGo = confirmCancel = null;
    confirmKind = '';
    if (fn) setTimeout(fn, 0);
  });
  // 지울 계획의 이름: 캐릭터/타입, 지금 LV. 되돌려 둔 조작이 있으면 그것도 함께 지워진다고 말한다(처음까지 되돌린 계획은 LV 1 이지만
  // → 로 다시 실행할 수 있다)
  const planNow = () => { const v = model.view; return [planName(v.charName, v.typeName), `, LV${NB}${fmt(v.lv)}`, v.canRedo ? ', 다시 실행할 조작 있음' : '']; };
  const keepIt = '남겨 두려면 먼저 링크 복사를 하세요.';
  // 지울 계획이 없으면(조작 0회이고, 되돌려 둔 조작도 없고, 스탯 편집으로 시작하지도 않은 계획) 묻지 않는다
  const nothingToLose = () => !hasWork(model.view);
  function askChar(c, from) {
    const v = model.view;
    const ch = v.chars[c];
    if (!ch || c === v.char) return;
    if (nothingToLose()) return dispatch('setChar', c);
    ask({ title: `${ch.name}${ro(ch.name)} 바꿀까요?`, desc: [`지금 계획${WJ}(`, ...planNow(), `)${WJ}은 지워지고 `, planName(ch.name, ch.types[0]), ` LV${NB}${fmt(ch.startLv)}부터 새로 시작합니다. ${keepIt}`], onGo: () => dispatch('setChar', c), from });
  }
  function askType(t, from) {
    const v = model.view;
    const name = v.chars[v.char].types[t];
    if (name == null || t === v.type) return;
    if (nothingToLose()) return dispatch('setType', t);
    ask({ title: `${name}${ro(name)} 바꿀까요?`, desc: [`지금 계획${WJ}(`, ...planNow(), `)${WJ}은 지워지고 `, planName(v.charName, name), ` LV${NB}${fmt(v.chars[v.char].startLv)}부터 새로 시작합니다. ${keepIt}`], onGo: () => dispatch('setType', t), from });
  }
  function askReset(from) {
    const v = model.view;
    if (nothingToLose()) return dispatch('reset');
    ask({ title: '스탯을 초기화할까요?', desc: [`지금 계획${WJ}(`, ...planNow(), `)${WJ}은 지워지고 `, planName(v.charName, v.typeName), ` LV${NB}${fmt(v.chars[v.char].startLv)}부터 다시 시작합니다. ${keepIt}`], go: '초기화', onGo: () => dispatch('reset'), from });
  }
  el.charList.addEventListener('click', (e) => { const b = e.target.closest('[data-char]'); if (b) { pressFlash(b); askChar(+b.dataset.char, b); } });
  el.types.addEventListener('click', (e) => { const b = e.target.closest('[data-type]'); if (b) askType(+b.dataset.type, b); });
  $('#reset').addEventListener('click', (e) => askReset(e.currentTarget));

  // ---------- 캐릭터 시트: 모든 너비에서 범위 버튼으로. 1100px 위로는 버튼 아래의 패널 ----------
  const sheet = $('#char-sheet');
  const scopeBtn = el.scope;
  scopeBtn.addEventListener('click', () => {
    const r = scopeBtn.getBoundingClientRect();
    sheet.style.setProperty('--anchor-x', `${Math.round(Math.max(16, Math.min(r.left - 4, innerWidth - 536)))}px`);
    openDialog(sheet, scopeBtn);
    const cur = $('#cast [aria-current="true"]');
    if (cur) cur.focus();
  });
  el.cast.addEventListener('click', (e) => {
    const b = e.target.closest('[data-char]');
    if (!b) return;
    const c = +b.dataset.char;
    if (c === model.view.char) return closeDialog(sheet, 'cancel');
    closeThen(sheet, () => askChar(c, scopeBtn));
  });
  el.sheetTypes.addEventListener('click', (e) => { const b = e.target.closest('[data-type]'); if (b && +b.dataset.type !== model.view.type) closeThen(sheet, () => askType(+b.dataset.type, scopeBtn)); });
  $$('[data-sheet-act]').forEach((b) => b.addEventListener('click', () => closeThen(sheet, () => (b.dataset.sheetAct === 'edit' ? openEdit(scopeBtn) : askReset(scopeBtn)))));

  // ---------- 스탯 편집(T): 연 순간의 상태(엔진의 editOpen())로 칸을 채운다. 범위도 엔진이 준 limits 그대로 ----------
  const editDlg = $('#edit-dialog');
  let editData = null;
  let editFor = null;          // 창을 연 엔진: 창이 열린 동안 계획이 통째로 바뀌었으면(예: 공유 링크) 적용하지 않는다
  function openEdit(from) {
    if (editDlg.open) return;
    let e = null;
    try { e = E.editOpen(); } catch (err) { engineFailed(err); return; }
    if (!e) return;
    editData = e;
    editFor = E;
    const v = model.view;
    const L = e.limits;
    // 빈 칸이 무엇이 되는지 칸 안에 흐리게 보인다: 스테퍼 칸은 그 칸의 최솟값(원본 Flex 처럼), 계열 레벨은 0
    const fld = (label, name, value, lim, extra) => h('label', { class: 'fld' }, h('span', null, label),
      h('input', { type: 'number', inputmode: 'numeric', name, min: lim[0], max: lim[1], step: lim[2], value, placeholder: lim[0], ...extra }));
    put($('#edit-desc'), '입력한 상태에서 ', planName(v.charName, v.typeName), ' 계획을 이어 갑니다. 이 상태는 재분배 로그 맨 앞에 남습니다.');
    $('#hint-top').textContent = `LV${NB}${L.lv[0]}~${fmt(L.lv[1])} · POINT${NB}~${fmt(L.point[1])} · HP${NB}~${fmt(L.hp[1])} · MP${NB}~${fmt(L.mp[1])} · SP${NB}~${fmt(L.sp[1])}`;
    $('#hint-stat').textContent = `스탯마다 ${L.stats[0][0]}~${fmt(L.stats[0][1])}`;
    $('#hint-xien').textContent = '가장 큰 값의 계열이 주력 계열이 됩니다';
    put($('#edit-top'), 
      fld('LV', 'lv', e.lv, L.lv, { 'aria-describedby': 'hint-top' }),
      fld('POINT', 'point', e.point, L.point, { 'aria-describedby': 'hint-top' }),
      fld('HP', 'hp', e.hp, L.hp, { 'aria-describedby': 'hint-top' }),
      fld('MP', 'mp', e.mp, L.mp, { 'aria-describedby': 'hint-top' }),
      fld('SP', 'sp', e.sp, L.sp, { 'aria-describedby': 'hint-top' }));
    put($('#edit-stats'), ...e.stats.map((n, i) => fld(STAT_KEYS[i], `s${i}`, n, L.stats[i], { 'aria-describedby': 'hint-stat' })));
    put($('#edit-xien'), ...e.lines.map((l) => fld(splitLine(l.name).line, `x${l.x}`, l.value, [0, null, 1], { 'aria-describedby': 'hint-xien' })));
    openDialog(editDlg, from);
    const lv = $('#edit-top input[name="lv"]');
    if (lv) { lv.focus(); lv.select(); }
  }
  $('#edit-open').addEventListener('click', (e) => openEdit(e.currentTarget));
  editDlg.addEventListener('close', () => {
    if (editDlg.returnValue !== 'apply' || !editData) return;
    if (editFor !== E) { editData = null; return; }                       // 창이 열린 동안 다른 계획이 되었다
    // 칸의 글자는 원본의 칸에 친 것처럼 엔진에 넘긴다(반올림과 범위 맞춤은 엔진의 editCommit 이 한다):
    // 빈 칸은 '' → 스테퍼 칸은 최솟값(원본 Flex 의 NumericStepper 처럼), 계열 레벨은 0. 숫자로 읽을 수 없는 글자(브라우저가 badInput
    // 으로 알린다)는 NaN → 스테퍼 칸은 그대로, 계열 레벨은 0
    const typed = (name) => {
      const x = $(`#edit-form input[name="${name}"]`);
      if (!x) return undefined;
      if (x.validity && x.validity.badInput) return NaN;
      return x.value.trim() === '' ? '' : Number(x.value);
    };
    const values = {
      lv: typed('lv'), point: typed('point'), hp: typed('hp'), mp: typed('mp'), sp: typed('sp'),
      stats: editData.stats.map((n, i) => typed(`s${i}`)),
      lines: editData.lines.map((l) => ({ x: l.x, name: l.name, value: typed(`x${l.x}`) })),
    };
    const r = dispatch('editCommit', values);
    if (r && r.ok) announce('스탯 편집을 적용했습니다');
  });

  // ---------- 탭: 재분배 로그 / 육성 가이드. 2px 바다색 밑줄이 그 사이를 미끄러진다; G로 바꾼다 ----------
  const tabLog = $('#tab-log');
  const tabGuide = $('#tab-guide');
  const tabs = [tabLog, tabGuide];
  const ink = $('.tab-ink');
  const isGuide = () => tabGuide.getAttribute('aria-selected') === 'true';
  function moveInk(animate) {
    const tab = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
    if (!tab || !tab.offsetWidth) return;
    if (!animate) ink.style.transition = 'none';
    ink.style.setProperty('--ink-x', tab.offsetLeft + 'px');
    ink.style.setProperty('--ink-w', String(tab.offsetWidth / 100));
    if (!animate) { void ink.offsetWidth; ink.style.transition = ''; }
  }
  function syncTabs() {
    const guide = isGuide();
    setText($('#rail-meta'), guide ? railMeta.guide : railMeta.log);
    const copy = $('#copy');
    setAttr(copy, 'aria-label', guide ? '육성 가이드 텍스트 복사' : '재분배 로그 복사');
    setDisabled(copy, guide && !model.guide ? '복사할 육성 가이드가 없습니다' : '');
  }
  function selectTab(tab, focusIt) {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    }
    if (tab === tabGuide && el.guide.dataset.stale && lastD) renderGuide(lastD, true);   // 숨어 있는 동안 밀린 가이드
    syncTabs();
    moveInk(true);
    if (focusIt) tab.focus();
  }
  tabs.forEach((t) => t.addEventListener('click', () => selectTab(t)));
  // 탭 안에서 ↑/↓/Home/End로 바꾼다(←/→는 언제나 되돌리기/다시 실행)
  $('[role="tablist"]').addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (to == null) return;
    e.preventDefault();
    selectTab(tabs[(to + tabs.length) % tabs.length], true);
  });
  if (document.fonts) document.fonts.ready.then(() => moveInk(false));
  addEventListener('resize', () => moveInk(false));

  // ---------- 복사(보이는 쪽: 로그 또는 가이드)와 링크 복사(로그 전체를 주소의 # 뒤에) ----------
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) {
      const ta = h('textarea', { readonly: true, style: { position: 'fixed', opacity: '0', top: '0', left: '0' } });
      ta.value = text; document.body.append(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (__) { ok = false; }
      ta.remove(); return ok;
    }
  }
  // ---------- 공유 링크: 계획 전체를 주소의 # 뒤에 담는다(# 뒤는 서버로 가지 않는다) ----------
  // 담는 것: UTF-8 JSON { v: 1, log: 재분배 로그(줄바꿈 \n), b: 보너스%, x: 고른 주력 계열 }. 로그는 마지막 레벨업 뒤에 바꾼
  // 설정을 남기지 않으므로 b, x 가 그것을 실어 나른다. deflate-raw 로 줄여 base64url 로 '#p=…', 그 압축을 못 하는 브라우저는
  // 줄이지 않고 '#t=…'.
  const toB64url = (bytes) => { let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const fromB64url = (str) => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)), (c) => c.charCodeAt(0));
  // 바이트를 압축/풀기 흐름에 통과시킨다. max 를 넘으면 그만 읽고 예외(일부러 만든 거대한 링크가 탭을 멈추지 않게)
  async function pipeBytes(bytes, stream, max) {
    const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader();
    const parts = [];
    let n = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      n += value.length;
      if (max && n > max) { try { await reader.cancel(); } catch (_) { /* 이미 끝났다 */ } throw new LinkError('big'); }
      parts.push(value);
    }
    const out = new Uint8Array(n);
    let at = 0;
    for (const part of parts) { out.set(part, at); at += part.length; }
    return out;
  }
  async function encodePlan(e) {
    const v = e.view();
    const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, log: lines(e.exportLog()).join('\n'), b: v.bonus.rate, x: v.xien.selected }));
    if (typeof CompressionStream === 'function') {
      try { return `#p=${toB64url(await pipeBytes(bytes, new CompressionStream('deflate-raw')))}`; } catch (_) { /* deflate-raw 를 모르는 브라우저: 줄이지 않는다 */ }
    }
    return `#t=${toB64url(bytes)}`;
  }
  // 링크로 받는 계획의 크기 한도. 진짜 계획은 로그가 길어야 760줄 남짓(LV 255 까지 레벨마다 보너스와 주력 계열을 바꿔도, 약 20KB)
  // 이고 링크도 그 안이다. 일부러 만든 거대한 링크는 풀고 읽는 데만 탭을 붙잡으므로 넘으면 읽지 않는다
  const LINK_MAX = { payload: 400000, bytes: 262144, lines: 2000 };
  // 링크를 읽지 못한 까닭: 'nodeflate' 압축을 풀 수 없는 브라우저, 'big' 너무 큼, 그 밖(잘림, 손상, 다른 형식)
  class LinkError extends Error { constructor(kind) { super(kind); this.kind = kind; } }
  // 링크의 로그가 이 시뮬레이터가 쓴 모양인가: 엔진이 읽는 Status 줄(스탯 편집으로 시작한 계획)은 하나뿐이고, 그 LV 와 일곱 스탯이
  // 1 이상의 정수다. 링크는 언제나 이 시뮬레이터의 재분배 로그(exportLog)를 담으므로 그렇다. 손으로 만든 글은 Status 줄을 여러 번
  // 두거나 0·음수 LV·스탯을 넣어 엔진이 작업 한도까지 몇 초씩 일하게 할 수 있다: 그런 링크는 읽지 않는다(붙여넣은 로그는 원본처럼
  // 그대로 읽는다). 상한(최고 레벨, 스탯 상한)을 넘는 값은 받는다: 상한이 285이던 판에서 스탯 편집으로 만든 계획의 링크이고, 엔진이
  // 그 값을 상한으로 읽으므로(importLog 의 capped. 연 뒤에 알린다) 오래 일하지 않는다.
  // 줄을 가르는 법은 엔진의 것(맨 앞 공백, 전각 콜론·쉼표·하이픈, 값 78개 또는 46개)을 따른다
  function linkLogOk(log) {
    const positive = (x) => /^\d+$/.test(x) && +x >= 1;
    let n = 0;
    for (const raw of lines(log)) {
      const m = raw.replace(/\uFF1A/g, ':').replace(/\uFF0C/g, ',').replace(/\uFF0D/g, '-').match(/^ *Status(?: [^:]*)?:([^:]*)/);
      if (!m) continue;
      const a = m[1].replace(/ /g, '').split(',');
      if (a.length !== 78 && a.length !== 46) continue;                 // 엔진도 Status 줄로 읽지 않는다
      if (++n > 1) return false;
      if (!positive(a[0]) || !STAT_I.every((i) => positive(a[6 + i]))) return false;
    }
    return true;
  }
  // '#p=…' / '#t=…' → { v, log, b, x }. 못 읽으면 LinkError 또는 다른 예외
  async function decodePlan(kind, payload) {
    if (payload.length > LINK_MAX.payload) throw new LinkError('big');
    let bytes = fromB64url(payload);
    if (kind === 'p') {
      // DecompressionStream 이 없거나 deflate-raw 를 모르는 브라우저(예: iOS 15 의 Safari)
      let ds = null;
      try { ds = typeof DecompressionStream === 'function' ? new DecompressionStream('deflate-raw') : null; } catch (_) { ds = null; }
      if (!ds) throw new LinkError('nodeflate');
      bytes = await pipeBytes(bytes, ds, LINK_MAX.bytes);
    }
    if (bytes.length > LINK_MAX.bytes) throw new LinkError('big');
    const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!data || data.v !== 1 || typeof data.log !== 'string') throw new LinkError('format');
    if (lines(data.log).length > LINK_MAX.lines) throw new LinkError('big');      // 엔진처럼 \r 도 줄바꿈으로 센다
    if (!linkLogOk(data.log)) throw new LinkError('format');
    return data;
  }
  /** shareLink() — 지금 계획의 공유 링크(Promise<string>): 이 페이지 주소(# 앞) + '#p=…' */
  const shareLink = async () => location.href.split('#')[0] + await encodePlan(E);
  const sharePop = $('#share-pop');
  const copyPop = $('#copy-pop');
  function hidePops() { sharePop.classList.remove('show'); copyPop.classList.remove('show'); }
  function showPop(pop, kids, ms) {
    put(pop, ...kids);
    sharePop.classList.toggle('show', pop === sharePop);
    copyPop.classList.toggle('show', pop === copyPop);
    clearTimeout(pop._t);
    if (ms) pop._t = setTimeout(() => pop.classList.remove('show'), ms);
  }
  // 복사가 막혔을 때: 단추에 '실패', 그리고 글을 골라 둔 칸(Ctrl/⌘+C로 직접 복사). Esc로 닫으면 초점은 연 단추로 돌아간다
  function manualCopy(pop, title, text, opener) {
    const ta = h('textarea', { readonly: true, 'aria-label': '복사할 텍스트', rows: 4 });
    ta.value = text;
    pop._opener = opener || null;
    showPop(pop, [h('strong', { id: pop === copyPop ? 'copy-pop-title' : null }, icon(ICON.alert), title), '아래 글을 골라 두었습니다. Ctrl+C(⌘C)로 복사하세요. Esc로 닫습니다.', ta], 0);
    setTimeout(() => { ta.focus(); ta.select(); }, 30);
  }
  async function doCopy() {
    const btn = $('#copy');
    const guide = isGuide();
    const text = lines(guide ? model.guide : model.log).join('\r\n');
    if (!text.trim()) return;
    const ok = await copyText(text);
    btn.dataset.state = ok ? 'done' : 'fail';
    clearTimeout(btn._done);
    btn._done = setTimeout(() => { delete btn.dataset.state; }, ok ? 1800 : 2400);
    if (ok) { hidePops(); announce(guide ? '육성 가이드 텍스트를 복사했습니다.' : '재분배 로그를 복사했습니다.'); }
    else { manualCopy(copyPop, '복사하지 못했습니다', text, btn); announce('복사하지 못했습니다. 브라우저가 클립보드를 막았습니다. 골라 둔 글을 직접 복사하세요.'); }
  }
  async function doShare() {
    let link;
    try { link = await shareLink(); } catch (err) { engineFailed(err); return; }
    const ok = await copyText(link);
    if (ok) {
      showPop(sharePop, [h('strong', null, icon(ICON.check), '링크를 복사했습니다'), `이 링크 하나에 계획 전체(로그${NB}${lines(model.log).filter((l) => l.trim()).length}줄)가 들어 있어, 서버 없이 그대로 열립니다.`], 3600);
      announce('링크를 복사했습니다.');
    } else {
      try { history.replaceState(null, '', link); } catch (_) { /* 주소창을 못 바꿔도 칸에서 복사할 수 있다 */ }
      manualCopy(sharePop, '브라우저가 복사를 막았습니다', link, $('#share'));
      announce('링크를 복사하지 못했습니다. 주소창과 골라 둔 칸에 링크가 있습니다.');
    }
  }
  $('#copy').addEventListener('click', (e) => { if (e.currentTarget.getAttribute('aria-disabled') === 'true') return; dispatch(isGuide() ? 'copyGuide' : 'copyLog'); doCopy(); });
  $('#share').addEventListener('click', () => { dispatch('share'); doShare(); });
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#share, #copy, .pop')) hidePops(); });

  // ---------- 붙여넣은 로그: 붙여넣기 / 로그 불러오기(P) / 지우기 ----------
  // 초점은 손으로 글을 넣어야 할 때(브라우저가 클립보드 읽기를 막았을 때)만 칸으로 옮긴다. 글이 들어오면 로그 불러오기로
  // 옮겨 Enter나 P로 바로 불러오게 하고, 지우기는 초점을 그대로 둔다: 다음 단축키가 칸에 글자로 들어가지 않게.
  const pasteText = $('#paste-text');
  const loadMsg = $('#load-msg');
  const loader = $('.loader');
  const loadBtn = $('#load');
  // 1180px부터는 칸을 쓸 때만 연다(app.css: .loader.is-open 일 때만 이름표와 칸이 보인다). 그 아래 너비에서는 언제나 보인다.
  // 비어 있는 칸은 바깥을 누르거나 초점이 바깥으로 갈 때만 접는다: 칸 안의 버튼을 누르는 동안 버튼이 움직이지 않게
  // 칸이 열리며 로그가 짧아져도, 끝을 보고 있었으면 끝이 계속 보인다(logPinned 와 ResizeObserver)
  const openLoader = () => { loader.classList.add('is-open'); };
  const foldLoader = () => { if (!pasteText.value.trim() && document.activeElement !== pasteText) loader.classList.remove('is-open'); };
  let downInLoader = false;
  document.addEventListener('pointerdown', (e) => { downInLoader = loader.contains(e.target); if (!downInLoader) foldLoader(); }, true);
  document.addEventListener('pointerup', () => setTimeout(() => { downInLoader = false; }, 0), true);
  document.addEventListener('focusin', (e) => { if (!loader.contains(e.target)) foldLoader(); });
  pasteText.addEventListener('blur', (e) => {
    if ((e.relatedTarget && loader.contains(e.relatedTarget)) || downInLoader) return;   // 같은 칸의 버튼으로(사파리는 누른 버튼에 초점을 주지 않는다)
    setTimeout(foldLoader, 0);
  });
  // 칸 안에서 Ctrl/⌘+Enter: 로그 불러오기(글을 쓰는 칸이라 P는 글자로 들어간다)
  pasteText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.isComposing) { e.preventDefault(); requestLoad(loadBtn); }
  });
  // 안내를 바꾼다. 새 안내는 언제나 앞 안내의 '고치는 동안 남김'(keep)도 지운다
  function say(tone, words) {
    loadMsg.dataset.tone = tone || '';
    delete loadMsg.dataset.keep;
    loadMsg.classList.remove('is-new');
    if (!words) { put(loadMsg); return; }
    put(loadMsg, icon(tone === 'error' ? ICON.alert : tone === 'ok' ? ICON.check : ICON.info), h('span', null, ...[].concat(words)));
    void loadMsg.offsetWidth;
    loadMsg.classList.add('is-new');
  }
  // 1180px 아래에서는 붙여넣은 로그 칸이 로그 표나 가이드 밑에 있어, 불러온 뒤의 안내가 화면 밖이나 아래쪽 고정 바 밑에 놓이기 쉽다:
  // 불러오기를 누른 뒤에는 안내가 보이게 스크롤한다(사용자가 2026-11-04에 정했다). 위·아래 고정 바는 html 의 scroll-padding 이 비켜 준다.
  // 가이드 탭이 보이면 가이드를 조금 뒤에 다시 지어 칸이 밀릴 수 있으므로 그 뒤에 한 번 더 본다('nearest'라 이미 보이면 움직이지 않는다)
  const narrowLayout = matchMedia('(max-width: 1179px)');
  function revealLoadMsg() {
    if (!narrowLayout.matches) return;
    const go = () => { if (loadMsg.firstChild) loadMsg.scrollIntoView({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' }); };
    requestAnimationFrame(go);
    setTimeout(go, 250);
  }
  // 일본어판에서 만든 로그는 이름이 달라 제대로 읽히지 않는다(오류는 나지 않고 결과가 달라진다): 미리 알린다.
  // 칸의 글을 고치면 지난 안내(info, error)는 지운다. 다만 글을 칸에 남긴 불러오기의 타입·상한 안내(keep: 타입 이름을 알아보지 못했거나,
  // 처음부터 다시 읽으며 상한에 맞췄을 때)는 그 글을 고치는 동안 남긴다(사용자가 2026-11-04에 정했다). 칸을 다 비우면 지운다
  const looksJapanese = (t) => /[\u3040-\u30FF\uFF66-\uFF9F]/.test(t);
  function noteText() {
    const t = pasteText.value;
    if (looksJapanese(t)) say('info', `일본어판에서 만든 로그로 보입니다. 캐릭터${WJ}·${WJ}계열 이름이 달라, 불러오면 지금 고른 캐릭터로 다시 계산되어 결과가 달라집니다.`);
    else if ((loadMsg.dataset.tone === 'info' || loadMsg.dataset.tone === 'error') && (!loadMsg.dataset.keep || !t.trim())) say('', '');
  }
  pasteText.addEventListener('input', () => { if (pasteText.value.trim()) openLoader(); noteText(); });
  // 글이 칸에 들어왔다: 칸을 열고, 초점은 로그 불러오기로(Enter나 P로 바로 불러온다)
  function landed(text) {
    pasteText.value = text.replace(/\r\n?/g, '\n');
    openLoader();
    loadBtn.focus();
    if (looksJapanese(text)) noteText();
    else say('info', ['붙여넣었습니다. ', h('b', null, '로그 불러오기'), '를 누르면 이 로그로 계획을 다시 만듭니다.']);
  }
  // 글자 칸 밖에서 Ctrl/⌘+V: 붙여넣은 글을 이 칸으로 받는다(권한을 묻지 않는 paste 이벤트)
  document.addEventListener('paste', (e) => {
    const t = e.target instanceof Element ? e.target : document.body;
    if (t.closest(TEXT_FIELD) || $$('dialog').some((d) => d.open)) return;
    const text = e.clipboardData && e.clipboardData.getData('text');
    if (!text) return;
    e.preventDefault();
    landed(text);
  });
  $('#paste').addEventListener('click', async () => {
    dispatch('paste');
    let text = null;
    try { if (navigator.clipboard && navigator.clipboard.readText) text = await navigator.clipboard.readText(); } catch (_) { text = null; }
    if (text != null && text !== '') landed(text);
    else if (text === '') say('info', '클립보드가 비어 있습니다. 재분배 로그를 복사한 뒤 다시 누르세요.');
    else {
      // 브라우저가 읽기를 막았다: 칸을 열고 초점을 주어 손으로 붙여넣게 한다
      openLoader();
      pasteText.focus();
      say('info', '브라우저가 클립보드 읽기를 막았습니다. 이 칸에 Ctrl+V(⌘V)로 붙여넣으세요.');
    }
  });
  // 지우기: 칸을 비우고 접는다. 초점은 지우기에 그대로
  $('#clear').addEventListener('click', () => { dispatch('clearPaste'); pasteText.value = ''; say('', ''); foldLoader(); });
  // 불러오기: 비어 있거나 읽을 줄이 없으면 그 까닭을, 지울 계획이 있으면 먼저 묻는다
  // 불러오기: 먼저 지금 계획의 사본에서 읽어 본다(지금 계획은 그대로). 읽을 줄이 없으면 그 까닭을, 지울 계획이 있으면
  // 무엇이 될지(읽어 본 계획의 캐릭터/타입, LV) 말하고 묻는다
  // 불러온 뒤의 일본어판 안내(불러오기 전의 안내는 noteText)
  const JA_AFTER = `일본어판에서 만든 로그로 보입니다. 캐릭터${WJ}·${WJ}계열 이름이 달라 결과가 원래 계획과 다를 수 있습니다.`;
  function requestLoad(from) {
    const text = pasteText.value;
    if (!text.trim()) {
      openLoader();                                                      // 붙여넣을 자리를 보여 준다(초점은 옮기지 않는다)
      say('error', '붙여넣은 로그가 없습니다. 재분배 로그를 먼저 붙여넣으세요.');
      pressFlash(loadBtn);
      revealLoadMsg();
      return;
    }
    let cand, cv;
    try { cand = tryImport(text); cv = cand.engine.view(); } catch (err) { engineFailed(err); return; }
    if (!cand.r.ok) {
      say('error', '이 글에서 읽을 수 있는 재분배 로그 줄을 찾지 못했습니다. "LV 숫자 :" 줄이나 Status 줄이 들어 있는지 확인하세요.');
      pressFlash(loadBtn);
      revealLoadMsg();
      return;
    }
    const r = cand.r;
    const before = model.view;
    const go = () => loaded(dispatch('importLog', text, cand), cv, text, before);
    // 지울 계획이 없거나, 설정 줄(Bonus, Xien)만 읽어 지금 계획을 그대로 두는 글이면 묻지 않는다
    if (!hasWork(model.view) || keptPlan(r)) return go();
    const how = r.restarted ? [' 이 로그에는 ', charType(), ' 줄이 없어 지금 고른 ', charType(), '으로 읽습니다.']
      : typeLost(r) ? [` ${firstTypeWords(cv.typeName)}`] : [];
    const over = capped(r) ? ` ${capWords(false)}` : '';
    ask({ title: '로그를 불러올까요?', desc: [`지금 계획${WJ}(`, ...planNow(), `)${WJ}은 지워지고 붙여넣은 로그${WJ}(`, planName(cv.charName, cv.typeName), `, LV${NB}${fmt(cv.lv)})${WJ}로 다시 만듭니다.`, ...how, `${over} ${keepIt}`], go: '불러오기', onGo: go, from });
  }
  // 불러온 뒤: 무엇으로 읽었는지 말한다. 깨끗이 읽었으면(캐릭터/타입 줄의 캐릭터와 타입, 오류 없음) 칸을 비워 접고, 다른 캐릭터를 골라
  // 다시 불러올 수 있게 처음부터 다시 읽은 경우, 설정 줄만 읽은 경우, 오류가 난 경우에는 글을 남긴다. 타입 이름을 알아보지 못해
  // 첫 타입으로 읽은 경우(typeLost)에도 남긴다: 다른 타입을 골라도 그 줄이 첫 타입으로 되돌리므로, 그 줄을 고쳐 다시 불러올 수 있게
  // (고치는 법도 말한다). 상한을 넘는 값을 상한에 맞춰 읽었으면(capped) 그것도 말한다(설정 줄만 읽은 경우와 오류가 난 경우는 빼고).
  // 그것만이면 깨끗이 읽은 것이라 칸을 비운다(상한에 맞춘 계획이 지금 계획이다). 초점은 로그 불러오기에
  function loaded(r, cv, text, before) {
    if (!r || !r.ok) return;
    const who = [planName(cv.charName, cv.typeName), `, LV${NB}${fmt(cv.lv)}`];
    const over = capped(r) ? ` ${capWords(true)}` : '';
    if (r.error) say('error', '로그를 끝까지 읽지 못했습니다. 읽은 데까지만 반영했습니다. 형식이 맞는지 확인하세요.');
    else if (keptPlan(r)) {
      // 계획은 그대로이고 설정만 바뀌었다: 무엇이 바뀌었는지 말한다
      const got = [];
      if (before && cv.bonus.rate !== before.bonus.rate) got.push(`보너스 ${cv.bonus.rate}%`);
      if (before && cv.xien.selected !== before.xien.selected) { const l = cv.xien.lines.find((x) => x.x === cv.xien.selected); got.push(`주력 계열 ${l ? l.name : cv.xien.selected}`); }
      say('info', [charType(), ` 줄과 LV 줄이 없어 지금 계획에 설정만 반영했습니다${got.length ? `: ${got.join(', ')}` : ''}.`]);
    }
    else if (r.restarted) say('info', [charType(), ' 줄이 없어 지금 고른 ', planName(cv.charName, cv.typeName), `${ro(cv.typeName)} 처음부터 읽었습니다.${over}`, looksJapanese(text) ? ` ${JA_AFTER}` : '']);
    else if (typeLost(r)) say('info', ['로그를 불러왔습니다: ', ...who, `. ${firstTypeWords(cv.typeName, true)}${over} `, ...fixTypeWords()]);
    else say(over ? 'info' : 'ok', ['로그를 불러왔습니다: ', ...who, `.${over}`]);
    // 글을 칸에 남기는 타입·상한 안내는 그 글을 고치는 동안 남긴다(noteText)
    if (!r.error && (typeLost(r) || (r.restarted && over))) loadMsg.dataset.keep = '1';
    if (r.footer && !r.error && !typeLost(r)) {
      if (document.activeElement === pasteText) loadBtn.focus();       // 칸이 접혀도 초점이 <body>로 떨어지지 않게
      pasteText.value = '';
      foldLoader();
    }
    revealLoadMsg();
  }
  loadBtn.addEventListener('click', (e) => requestLoad(e.currentTarget));

  // ---------- 설정: 보너스(다음 레벨업부터)와 주력 계열 ----------
  // 보너스 칸에 친 값은 그대로 엔진에 보낸다: 5 단위 반올림과 0~100 맞춤은 엔진이 NumericStepper 처럼 하고, 확정된 값(r.rate)을
  // 칸에 다시 쓴다. 숫자로 읽을 수 없는 입력(브라우저가 badInput 으로 알린다)은 엔진도 무시한다
  function setBonus(raw) {
    const r = dispatch('setBonus', raw);
    bonusInput.value = r && r.rate != null ? r.rate : model.view.bonus.rate;
  }
  function commitBonus() {
    const raw = bonusInput.validity && bonusInput.validity.badInput ? NaN : bonusInput.value;
    if (String(raw) === String(model.view.bonus.rate)) return;           // 그대로면 아무 일도 없다
    setBonus(raw);
  }
  // 끝에 닿은 단추(aria-disabled)는 아무것도 하지 않는다(까닭은 문서의 click 처리기가 읽어 준다)
  [stepDown, stepUp].forEach((b) => b.addEventListener('click', () => { if (b.getAttribute('aria-disabled') !== 'true') setBonus(model.view.bonus.rate + Number(b.dataset.step)); }));
  bonusInput.addEventListener('change', commitBonus);
  el.xien.addEventListener('change', (e) => {
    if (e.target.name !== 'xien') return;
    const r = dispatch('setXien', Number(e.target.value));
    if (!r.ok) {                                                          // 고를 수 없으면 원래 선택으로 돌리고 까닭을 읽어 준다
      renderXien(lastD);
      announce('지금은 고를 수 없는 계열입니다');
    }
  });

  // ---------- 효과음 설정: 상단 바의 단추와 막대, 시트의 스위치와 막대가 함께 움직인다. 이 브라우저에 기억한다 ----------
  const vols = $$('input.vol');
  function syncSound() {
    const on = !Sound.muted;
    document.body.classList.toggle('sound-off', !on);
    $('#mute').setAttribute('aria-pressed', String(on));
    $('#mute').title = `효과음 ${on ? '켜짐' : '꺼짐'}`;
    $('#sound-sheet').checked = on;
    vols.forEach((x) => { x.value = Sound.volume; x.setAttribute('aria-valuetext', Sound.volume + '%'); x.disabled = !on; });
    $('#volume-out').textContent = `${Sound.volume}%`;
  }
  const setMuted = (m) => { Sound.setMuted(m); dispatch('setMuted', m); syncSound(); if (!m) playSound('stup'); };
  $('#mute').addEventListener('click', () => setMuted(!Sound.muted));
  $('#sound-sheet').addEventListener('change', (e) => setMuted(!e.target.checked));
  vols.forEach((x) => {
    x.addEventListener('input', () => { Sound.setVolume(Number(x.value)); syncSound(); });
    x.addEventListener('change', () => { dispatch('setVolume', Sound.volume); playSound('stup'); });   // 놓으면 그 크기로 한 번 들려준다
  });
  syncSound();

  // ---------- 컨트롤 → 조작 ----------
  el.stats.addEventListener('click', (e) => {
    const b = e.target.closest('.btn');
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    if (b.dataset.up != null) dispatch('statUp', +b.dataset.up);
    else if (b.dataset.dash != null) dispatch('dash', +b.dataset.dash);
  });
  $$('[data-act]').forEach((b) => b.addEventListener('click', (e) => {
    if (b.getAttribute('aria-disabled') === 'true') return;
    const act = b.dataset.act;
    dispatch(act, ...(act === 'undo' || act === 'redo' ? [!!e.shiftKey] : []));
  }));

  // ---------- 단축키 목록: 연 단추 밑에(Popover API: Chrome 114+, Safari 17+, Firefox 125+) ----------
  const kb = (k) => h('kbd', null, k);
  const KEYS = [
    [[kb('L')], '레벨업'],
    [SHORTCUT.map(kb), `${STAT_KEYS[0]} … ${STAT_KEYS[6]} +1`],
    [[kb('⇧'), '+ 스탯 키'], '대시: 비용이 오르는 값까지 찍기'],
    [[kb('←'), kb('→')], '되돌리기 · 다시 실행'],
    [[kb('⇧'), '+', kb('←'), kb('→')], '대시 단위로 되돌리기 · 다시 실행'],
    [[kb('↑'), kb('↓')], '주력 계열 · 탭 · 효과음 크기 바꾸기'],
    [[kb('G')], '재분배 로그 · 육성 가이드 전환'],
    [[kb('P')], '로그 불러오기'],
    [[kb('Ctrl'), '/', kb('⌘'), '+', kb('Enter')], '붙여넣은 로그 칸에서 불러오기'],
    [[kb('T')], '스탯 편집'],
    [[kb('Enter')], '로그로 이동'],
    [[kb('Esc')], '입력란 · 로그 · 창에서 나가기'],
    [[kb('?')], '이 목록'],
  ];
  put($('#keys-list'), ...KEYS.map(([keys, what]) => h('div', null,
    h('dt', null, keys.map((k) => (typeof k === 'string' ? h('span', { class: 'kplus' }, k) : k))), h('dd', null, what))));
  const toggleKeys = () => { if (typeof keysPop.togglePopover === 'function') keysPop.togglePopover(); };
  keysPop.addEventListener('beforetoggle', (e) => {
    const btn = $$('[data-keys-open]').find(visible);
    if (btn) btn.setAttribute('aria-expanded', String(e.newState === 'open'));
    if (e.newState !== 'open') return;
    if (btn) {
      const r = btn.getBoundingClientRect();
      keysPop.style.top = `${Math.round(r.bottom + 8)}px`;
      keysPop.style.right = `${Math.max(16, Math.round(innerWidth - r.right))}px`;
    } else { keysPop.style.top = '16px'; keysPop.style.right = '16px'; }
  });
  // 열리면 초점을 목록(role=dialog, tabindex=-1)으로 옮겨 화면 낭독기가 제목부터 읽게 한다. 닫히면(Esc, 다시 ?, 바깥) 브라우저가
  // 연 곳으로 초점을 돌려준다. 목록 안에서도 단축키는 그대로 통한다
  keysPop.addEventListener('toggle', (e) => { if (e.newState === 'open') keysPop.focus({ preventScroll: true }); });

  // ---------- 키보드: 이 제품의 말 ----------
  // 글자 키는 글자를 쓰는 칸(텍스트 칸, 여러 줄 칸)에서만 멈춘다. 단추, 라디오, 막대, 스위치, 보너스의 ± 단추는 단축키를
  // 삼키지 않는다. ←/→는 글자 칸 밖에서는 언제나 되돌리기/다시 실행(라디오·탭·막대는 ↑/↓로 바꾼다).
  // 숫자만 받는 보너스 칸에는 글자를 쓸 수 없으므로 글자 단축키가 통한다(먼저 값을 확정한다).
  const STAT_BY_CODE = Object.fromEntries(SHORTCUT.map((k, i) => ['Key' + k, i]));
  const LETTERS = new Set(['KeyL', 'KeyT', 'KeyG', 'KeyP', ...Object.keys(STAT_BY_CODE)]);
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    if ($$('dialog').some((d) => d.open)) return;                       // 대화상자는 제 키를 쓴다(Esc는 닫기)
    const t = e.target instanceof Element ? e.target : document.body;
    const field = t.closest(TEXT_FIELD);
    if (e.key === 'Escape') {
      // 떠 있는 알림을 닫는다. 초점이 그 안(골라 둔 글)에 있었으면 연 단추(복사, 링크 복사)로 돌려준다
      const shown = [sharePop, copyPop].find((p) => p.classList.contains('show'));
      if (shown) {
        const back = shown.contains(t) ? shown._opener : null;
        hidePops();
        e.preventDefault();
        if (back && back.isConnected && visible(back)) { back.focus(); return; }
      }
      // 어떤 칸에서든 나간다
      if (field || t.closest('#log-scroll, #guide')) { if (t === bonusInput) commitBonus(); t.blur(); e.preventDefault(); }
      return;
    }
    if (field) {
      if (t !== bonusInput) return;                                    // 글을 쓰는 중
      if (e.key === 'Enter') { e.preventDefault(); commitBonus(); t.blur(); return; }
      if (!LETTERS.has(e.code)) return;                                // 숫자와 방향키는 칸의 것
      commitBonus();
    }
    if (e.key === '?' || (e.code === 'Slash' && e.shiftKey)) { e.preventDefault(); toggleKeys(); return; }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      dispatch(e.key === 'ArrowLeft' ? 'undo' : 'redo', e.shiftKey);
      return;
    }
    if (e.key === 'Enter') {
      // 원본처럼 Enter는 로그로 초점을 옮긴다(초점이 페이지 자체에 있을 때만)
      if (t === document.body || t === document.documentElement || t.matches('main, .sheet')) { e.preventDefault(); (isGuide() ? el.guide : $('#log-scroll')).focus(); }
      return;
    }
    const code = e.code;                                                 // e.code: 한글 자판에서도 같은 키
    if (code === 'KeyL') { e.preventDefault(); dispatch('levelUp'); }
    else if (code === 'KeyT') { e.preventDefault(); openEdit(visible($('#edit-open')) ? $('#edit-open') : scopeBtn); }
    else if (code === 'KeyG') {
      e.preventDefault();
      dispatch('toggleGuide');
      // 초점이 숨길 패널 안(로그나 가이드)에 있었으면 새로 보이는 패널로 옮긴다(숨긴 곳에 남은 초점은 <body>로 떨어진다)
      const from = isGuide() ? $('#panel-guide') : $('#panel-log');
      const inside = from.contains(document.activeElement);
      selectTab(isGuide() ? tabLog : tabGuide);
      if (inside) (isGuide() ? el.guide : logScroll).focus({ preventScroll: true });
    }
    else if (code === 'KeyP') { e.preventDefault(); requestLoad($('#load')); }
    else if (code in STAT_BY_CODE) { e.preventDefault(); dispatch(e.shiftKey ? 'dash' : 'statUp', STAT_BY_CODE[code]); }
  });

  // 1600px부터 상단 바의 두 무리가 묶인 내용의 양 끝 위에 서도록, 스크롤 막대를 뺀 너비를 넣는다
  const setVw = () => document.documentElement.style.setProperty('--vw', document.documentElement.clientWidth + 'px');
  setVw(); addEventListener('resize', setVw);

  // 출처 표기: 옆 팔이 보이면 그 맨 아래(app.css). 그런데 거기 두면 옆 팔이 넘쳐 스크롤하게 되는 창(웹 글꼴을 받지 못해 대체 글꼴이
  // 넓을 때, 글자를 키웠을 때 등)에서는 페이지 끝으로 옮긴다(.credit-low). 창 크기나 글꼴이 바뀌면 다시 잰다
  const sidebarEl = $('.sidebar');
  const creditRail = $('.credit-rail');
  let creditFrame = 0;
  function placeCredit() {
    creditFrame = 0;
    const root = document.documentElement;
    root.classList.remove('credit-low');
    if (!visible(sidebarEl) || !visible(creditRail)) return;           // 옆 팔이 없거나, 이미 페이지 끝에 두는 창(app.css)
    root.classList.toggle('credit-low', sidebarEl.scrollHeight > sidebarEl.clientHeight + 1);
  }
  const placeCreditSoon = () => { if (!creditFrame) creditFrame = requestAnimationFrame(placeCredit); };
  if (typeof ResizeObserver === 'function') new ResizeObserver(placeCreditSoon).observe(el.charList);
  addEventListener('resize', placeCreditSoon);
  if (document.fonts) { document.fonts.ready.then(placeCreditSoon); document.fonts.addEventListener('loadingdone', placeCreditSoon); }

  // file:// 로 연 페이지에서 이름표(href="./")를 누르면 폴더 목록이 열린다: 그때는 이 파일로 간다
  if (location.protocol === 'file:') $('.brand').setAttribute('href', location.pathname.split('/').pop() || 'index.html');

  // ==========================================================================
  // 알림 한 줄(막지 않는다, 시트 맨 위): 저장된 계획을 읽지 못했을 때, 이 브라우저에 저장하지 못할 때, 조작이 중간에 멈췄을 때
  // ==========================================================================
  const noticeEl = $('#notice');
  function note(tone, words) {
    noticeEl.dataset.tone = tone;
    put($('#notice-text'), icon(tone === 'error' ? ICON.alert : ICON.info), h('span', null, ...[].concat(words)));
    noticeEl.hidden = false;
    noticeEl.classList.remove('is-new');
    void noticeEl.offsetWidth;
    noticeEl.classList.add('is-new');
    announce($('#notice-text').textContent);
  }
  $('#notice-close').addEventListener('click', () => {
    noticeEl.hidden = true;
    // 닫기 단추가 사라져도 초점이 <body>로 떨어지지 않게 시트로 옮긴다(시트에서 Enter는 로그로, 단축키는 그대로)
    const sheetEl = $('#main');
    sheetEl.tabIndex = -1;
    sheetEl.focus({ preventScroll: true });
    sheetEl.addEventListener('blur', () => sheetEl.removeAttribute('tabindex'), { once: true });
  });

  // ==========================================================================
  // 자동 저장: 이 브라우저(localStorage)에만. 서버에는 아무것도 보내지 않는다
  //   'oresim:plan' = { v: 1, engine: E.serialize(), log: 재분배 로그, b: 보너스%, x: 주력 계열, savedAt: ISO 시각 }
  //   상태가 바뀔 때마다 300ms 뒤에 저장하고(누르고 있는 동안에는 미룬다), 페이지를 떠나거나 숨길 때 곧바로 저장한다.
  //   엔진 상태를 쓰지 못하면(QuotaExceededError 등) 엔진 없이 로그만 남긴다(되돌리기 기록은 잃는다). 그것도 못 하면 '저장 안 됨'.
  //   탭을 여러 개 열어 두면 마지막에 저장한 탭이 이긴다(탭 사이를 맞추지 않는다).
  // ==========================================================================
  const PLAN_KEY = 'oresim:plan';
  const BLOCKED = '브라우저가 저장을 막았습니다. 계획을 남기려면 링크 복사를 쓰세요.';
  const FULL = '브라우저의 저장 공간이 모자라 계획을 저장하지 못했습니다. 계획을 남기려면 링크 복사를 쓰세요.';
  const saving = { ok: true, why: '', timer: 0, pending: false, warned: false, painted: '' };
  const whyNot = (err) => (err && err.name === 'QuotaExceededError' ? FULL : BLOCKED);
  function writePlan() {
    clearTimeout(saving.timer);
    saving.timer = 0;
    saving.pending = false;
    if (broken || !E) return;
    let rec;
    try {
      const v = E.view();
      rec = { v: 1, engine: null, log: E.exportLog(), b: v.bonus.rate, x: v.xien.selected, savedAt: new Date().toISOString() };
    } catch (err) { engineFailed(err); return; }
    try {
      rec.engine = E.serialize();
      localStorage.setItem(PLAN_KEY, JSON.stringify(rec));
      savedAs(true);
      return;
    } catch (_) { /* 엔진 없이 다시 */ }
    try {
      delete rec.engine;
      localStorage.setItem(PLAN_KEY, JSON.stringify(rec));
      savedAs(true);
    } catch (err) { savedAs(false, whyNot(err)); }
  }
  function savedAs(ok, why) {
    const was = saving.ok;
    saving.ok = ok;
    saving.why = why || '';
    paintSaved();
    if (!ok && was && !saving.warned) { saving.warned = true; note('error', saving.why); }   // 처음 못 했을 때 한 번만 알린다
  }
  // 상단 바의 알약과 캐릭터 시트의 줄: 마지막 저장의 실제 결과
  function paintSaved() {
    const ok = saving.ok && !broken;
    const why = broken ? '계산 오류가 난 뒤로는 저장하지 않습니다. 새로 고침하면 마지막으로 저장된 계획으로 돌아갑니다.' : saving.why;
    const key = ok ? 'ok' : `off:${why}`;
    if (saving.painted === key) return;
    saving.painted = key;
    const pill = $('#saved');
    const line = $('.sheet-saved');
    put(pill, icon(ok ? ICON.check : ICON.alert), ok ? '자동 저장됨' : '저장 안 됨');
    put(line, icon(ok ? ICON.check : ICON.alert), ok ? '이 브라우저에 자동 저장됨' : '이 브라우저에 저장 안 됨');
    pill.title = line.title = ok ? '계획은 이 브라우저에 자동으로 저장됩니다' : why;
    pill.classList.toggle('is-off', !ok);
    line.classList.toggle('is-off', !ok);
  }
  function scheduleSave() {
    if (broken) return;
    clearTimeout(saving.timer);
    saving.pending = true;
    saving.timer = setTimeout(writePlan, 300);
  }
  function cancelSave() { clearTimeout(saving.timer); saving.timer = 0; saving.pending = false; }
  const flushSave = () => { if (saving.pending) writePlan(); };
  addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
  // 주소창의 공유 링크를 지운다(다시 열어도 묻지 않게). file:// 처럼 막히면 그대로 둔다
  // only 가 있으면 주소의 # 가 아직 그 링크일 때만 지운다(그사이 들어온 다른 링크를 지우지 않게)
  const clearHash = (only) => {
    if (typeof only === 'string' && location.hash !== only) return;
    try { history.replaceState(null, '', location.href.split('#')[0]); } catch (_) { /* 그대로 둔다 */ }
  };
  // 계획이 바뀌었다: 저장을 예약하고, 주소창에 남은 지난 공유 링크(복사가 막혀 넣어 둔 것)는 이제 이 계획이 아니므로 지운다
  // 다만 읽거나 묻는 중인 공유 링크(linkPending)는 답할 때까지 둔다(대화상자 뒤에서 기다리는 동안 스탯 편집을 적용한 경우 등)
  function planChanged() {
    scheduleSave();
    if (/^#[pt]=/.test(location.hash) && location.hash !== linkPending) clearHash();
  }

  // ==========================================================================
  // 공유 링크로 열었을 때(시작할 때와 주소의 # 가 바뀔 때): 링크의 계획을 새 엔진에 만들어 보고, 지금 계획과 같으면 조용히,
  // 지울 계획이 있으면 묻고, 없으면 바로 연다. 끝나면 주소창에서 링크를 지운다.
  // 대화상자(확인 창, 스탯 편집, 캐릭터 시트)가 열려 있으면 그 창이 닫힌 뒤에 연다: 열린 창의 글과 처리기를 덮어쓰거나, 스탯 편집
  // 창이 앞 계획의 값을 새 계획에 적용하지 않게
  // ==========================================================================
  let linkSeq = 0;
  let linkPending = '';      // 지금 읽거나 묻는 중인 링크(주소의 # 그대로). 물음에 답하면(done) 비운다
  // 링크의 # 뒤: 'p'(압축) 또는 't' 와 base64url 글자. 그 뒤에 붙은 것(채팅에서 문장 끝의 링크를 복사하면 딸려 오는 '.', ')' 등)은
  // 읽지 않는다. base64url 에는 그런 글자가 없으므로 앞의 글자만으로 링크 전부다
  const LINK_RE = /^#([pt])=([A-Za-z0-9_-]+)/;
  // 열린 대화상자가 있으면 닫힌 뒤에 다시 연다(그사이 다른 링크가 들어오면 그것만). 앞 링크를 묻는 확인 창은 기다리지 않는다:
  // 새 링크의 물음으로 바꾼다(ask)
  function deferLink(hash, seq, at) {
    const busy = $$('dialog').find((d) => d.open);
    if (!busy || (busy === confirmDlg && askingLink())) return false;
    busy.addEventListener('close', () => setTimeout(() => { if (seq === linkSeq) openLinkFromHash(hash, at); }, 0), { once: true });
    return true;
  }
  // 링크를 읽지 못했을 때의 말: 까닭과, 그래서 무엇을 보여 주는지(시작할 때 저장된 계획을 되살렸는지, 새 계획인지, 쓰던 중인지)
  function linkFailWords(why, at) {
    const head = why === 'nodeflate' ? '이 브라우저는 압축된 링크를 열 수 없습니다. 브라우저를 업데이트하거나 다른 브라우저에서 여세요.'
      : why === 'big' ? '링크에 담긴 로그가 너무 길어 읽지 않았습니다. 이 시뮬레이터에서 만든 링크인지 확인하세요.'
        : '링크가 잘렸거나 손상되었습니다.';
    const tail = at === 'saved' ? '이 브라우저에 저장된 계획을 그대로 엽니다.' : at === 'fresh' ? '새 계획으로 시작합니다.' : '지금 계획을 그대로 둡니다.';
    return `${head} ${tail}`;
  }
  // hash: 읽을 링크(없으면 주소의 #). at: 시작할 때만 'saved'(저장된 계획을 되살렸다) 또는 'fresh'(새 계획)
  async function openLinkFromHash(hash, at) {
    hash = typeof hash === 'string' ? hash : location.hash;
    at = typeof at === 'string' ? at : '';
    if (!/^#[pt]=/.test(hash)) return;
    const seq = ++linkSeq;
    linkPending = hash;
    if (deferLink(hash, seq, at)) return;
    const m = hash.match(LINK_RE);
    let data = null;
    let why = 'broken';
    let cand = null;
    try { data = m ? await decodePlan(m[1], m[2]) : null; } catch (err) { data = null; if (err && (err.kind === 'nodeflate' || err.kind === 'big')) why = err.kind; }
    if (seq !== linkSeq) return;                                          // 그사이 다른 링크가 들어왔다
    if (deferLink(hash, seq, at)) return;                                 // 읽는 사이 대화상자가 열렸다
    // 주소창의 링크는 물음에 답할 때까지 둔다: 묻는 동안 새로 고치거나 탭을 다시 열어도 같은 링크를 다시 묻는다. 링크의 로그는
    // 이 시뮬레이터가 쓴 모양만 받으므로(decodePlan, linkLogOk) 다시 읽어도 금방 끝난다
    const done = () => { if (linkPending === hash) linkPending = ''; clearHash(hash); };
    if (data) { try { cand = linkCandidate(data); } catch (_) { cand = null; } }
    if (!cand) {
      ask({ title: '링크의 계획을 읽지 못했습니다', desc: linkFailWords(why, at), go: '확인', single: true, onGo: done, onCancel: done, kind: 'link' });
      return;
    }
    let cv, v, same;
    try {
      cv = cand.engine.view();
      v = E.view();
      same = cand.engine.exportLog() === E.exportLog() && cv.bonus.rate === v.bonus.rate && cv.xien.selected === v.xien.selected;
    } catch (err) { engineFailed(err); done(); return; }
    if (same) { dropLinkAsk(); done(); return; }                          // 같은 계획
    // 링크의 타입 이름을 알아보지 못해 첫 타입으로 읽었거나(이름이 바뀌기 전의 판에서 만든 링크 등), 상한을 넘는 값을 상한에 맞춰
    // 읽었으면(상한이 285이던 판의 링크) 묻는 글과, 연 뒤의 알림 한 줄로 알린다. 그 밖에는 연 것을 화면 낭독기로만 알린다
    const lost = !!cand.typeLost;
    const over = !!cand.capped;
    const readAs = (past) => `${lost ? ` ${firstTypeWords(cv.typeName, past)}` : ''}${over ? ` ${capWords(past)}` : ''}`;
    const open = () => {
      done();
      const r = dispatch('openShared', data, cand);
      if ((lost || over) && r.ok) note('info', `링크의 계획을 열었습니다.${readAs(true)}`);
      else announce('링크의 계획을 열었습니다.');
    };
    if (!hasWork(v)) { dropLinkAsk(); open(); return; }
    ask({
      title: '링크의 계획을 열까요?',
      desc: [`링크의 계획${WJ}(`, planName(cv.charName, cv.typeName), `, LV${NB}${fmt(cv.lv)}`, `)${WJ}을 열면 이 브라우저에 저장된 계획${WJ}(`, ...planNow(), `)${WJ}은 지워집니다.${readAs(false)} 저장된 계획도 남기려면 '저장된 계획 유지'를 누르고 먼저 그 계획의 링크를 복사하세요.`],
      go: '링크 계획 열기', cancel: '저장된 계획 유지',
      onGo: open,
      onCancel: () => { done(); dispatch('keepSaved'); },
      kind: 'link',
    });
  }

  // ==========================================================================
  // 시작: 이 브라우저에 저장된 계획을 되살린다. 엔진 상태 그대로 → 안 되면(다른 판의 엔진, 바뀐 표, 로그만 저장된 경우)
  // 저장된 로그에서 다시 만든다 → 그것도 안 되면 새 계획과 알림 한 줄
  // ==========================================================================
  function readSaved() {
    let raw = null;
    try { raw = localStorage.getItem(PLAN_KEY); } catch (err) { savedAs(false, whyNot(err)); return null; }
    if (raw == null) return null;
    try { const o = JSON.parse(raw); return o && typeof o === 'object' ? o : {}; } catch (_) { return {}; }
  }
  function restorePlan(saved) {
    if (saved.v !== 1) return null;
    if (saved.engine) {
      try { const e = Oresim.createEngine(saved.engine); e.view(); return { engine: e, rebuilt: false }; } catch (_) { /* 로그에서 다시 */ }
    }
    if (typeof saved.log !== 'string') return null;
    try {
      const e = Oresim.createEngine();
      const r = e.importLog(saved.log);
      if (!r.ok) return null;
      if (typeof saved.b === 'number') e.setBonus(saved.b);
      if (typeof saved.x === 'number') e.setXien(saved.x);
      e.view();
      return { engine: e, rebuilt: true, typeLost: typeLost(r), capped: capped(r) };
    } catch (_) { return null; }
  }
  function boot() {
    const saved = readSaved();
    const got = saved ? restorePlan(saved) : null;
    let drawn = false;
    if (got) {
      E = got.engine;
      // 저장한 때가 중간에 멈춘 불러오기 바로 뒤였으면 비용 단계가 옛 값인 채로 저장되었다: 엔진에 묻는다(되살린 그 상태에서)
      costsStale = probeStale(E, got.rebuilt ? null : saved.engine);
      try { render(buildModel()); drawn = true; } catch (_) { drawn = false; }
    }
    if (!drawn) {
      try { E = Oresim.createEngine(); costsStale = false; render(buildModel()); } catch (err) {
        console.error('나만의 재분배 시뮬레이터: 엔진을 시작하지 못했습니다', err);
        note('error', '계산 엔진을 시작하지 못했습니다. 새로 고침해 보세요.');
        return;
      }
    }
    selectTab(tabLog);
    moveInk(false);
    paintSaved();
    if (saved && !drawn) note('info', '저장된 계획을 읽지 못해 새 계획으로 시작합니다.');
    else if (got && got.rebuilt) {
      // 저장된 로그의 타입 이름을 알아보지 못해 첫 타입으로 읽었으면(이름이 바뀌기 전의 판에서 저장한 계획) 그것도 말하고, 저장된 기록은
      // 계획을 바꿀 때까지 그대로 둔다(그때까지는 새로 고칠 때마다 다시 알린다). 상한을 넘는 값을 상한에 맞춰 읽었으면(상한이 285이던
      // 판에서 저장한 계획) 그것도 말한다. 그 밖에는(상한에 맞춘 것만이면 그 계획도) 다시 만든 계획을 곧 저장한다
      const lost = got.typeLost ? ` ${firstTypeWords(model.view.typeName, true)}` : '';
      const over = got.capped ? ` ${capWords(true)}` : '';
      note('info', `저장된 계획을 재분배 로그에서 다시 만들었습니다.${lost}${over} 되돌리기 기록은 이어지지 않습니다.`);
      if (!got.typeLost) scheduleSave();
    }
    // 새로 고칠 때 브라우저는 보던 내용을 제자리에 두려고 스크롤을 되살린다. 시작할 때 알림이 위에 끼면 그 알림이
    // 화면 위로 밀려나므로, 그때만 되살리지 않는다
    if (!noticeEl.hidden && 'scrollRestoration' in history) history.scrollRestoration = 'manual';
    openLinkFromHash(location.hash, got && drawn ? 'saved' : 'fresh');
    addEventListener('hashchange', () => openLinkFromHash(location.hash));
  }
  boot();

  /** 화면의 입구(검사 스크립트도 쓴다): render(model, ctx), dispatch(act, ...args), playSound(name), shareLink(), engine() */
  window.OresimUI = { render, dispatch, playSound, shareLink, engine: () => E };
})();
