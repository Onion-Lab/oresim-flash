/* 나만의 재분배 시뮬레이터 · 화면 스크립트
   화면의 모든 블록은 엔진 출력 모양의 모델 하나({ view, preview, log, guide }, contract.md)에서 render(model) 하나로 그린다.
   블록마다 그 모델만 읽는 함수가 있고, 숫자를 손으로 적지 않는다(파생 값은 원본의 식으로 계산한다).
   모든 컨트롤은 이름 있는 조작(levelUp, statUp(i), dash(i), undo, redo, setBonus …)을 dispatch() 하나로 보낸다.
   지금은 정적 데이터(js/draft-data.js)로 그리고 dispatch()는 반응(누름 표시, 효과음, 안내)만 한다.
   엔진을 연결하는 단계에서 dispatch() 안에서 엔진을 부르고 그 결과로 render()를 다시 부르면 된다. */
(() => {
  'use strict';

  // ---------- 도우미 ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = (n) => Number(n).toLocaleString('ko-KR');
  const NB = '\u00a0';                                   // 숫자와 단위를 묶는다: 그 사이에서 줄이 바뀌지 않게
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
  const SVGNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, String(v));
    for (const kid of kids) if (kid) el.append(kid);
    return el;
  }
  const icon = (markup) => { const t = document.createElement('template'); t.innerHTML = markup.trim(); return t.content.firstChild; };
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
  const live = $('#live');
  const announce = (msg) => { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 30); };
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visible = (el) => !!el && el.getClientRects().length > 0;
  // 으로/로: 받침이 없거나 ㄹ이면 '로', 그 밖의 받침이면 '으로'
  const ro = (w) => { const c = w.charCodeAt(w.length - 1); if (c < 0xac00 || c > 0xd7a3) return '로'; const f = (c - 0xac00) % 28; return f === 0 || f === 8 ? '로' : '으로'; };
  // 스탯을 읽는 소리(스탭, 핵, 인트, 데프, 엠알, 덱스, 아지) 뒤의 은/는
  const TOPIC = { STAB: '은', HACK: '은', INT: '는', DEF: '는', MR: '은', DEX: '는', AGI: '는' };
  const planName = (a, b) => h('span', { class: 'nw' }, `${a}/${b}`);   // "캐릭터/타입"은 줄을 바꾸지 않는다

  // 브라우저 저장소: 막혀 있어도(사생활 보호 창 등) 화면은 그대로 동작해야 한다
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* 저장하지 못해도 화면은 그대로 */ } },
  };

  // ---------- 엔진 표의 값 ----------
  // 엔진을 연결하면 Oresim.CONST(const.js)에서 읽는다. 정적 데이터 단계에서는 view에서 알 수 있는 만큼만.
  const CONST = (window.Oresim && window.Oresim.CONST) || null;
  const SHORTCUT = ['S', 'H', 'I', 'F', 'M', 'X', 'A'];
  const STAT_KEYS = ['STAB', 'HACK', 'INT', 'DEF', 'MR', 'DEX', 'AGI'];
  const STEP = 25;                                          // 비용 한 단계는 스탯 값 25칸(원본: floor((LV + 5×값) / 125))
  // 스탯 상한: MAX_STATUS[0..6]. 연결 전에는 view.maxLv(같은 285)를 쓴다
  const statCap = (i, v) => (CONST && CONST.MAX_STATUS ? CONST.MAX_STATUS[i] : v.maxLv);
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
  // Status 줄(78개 값, 옛 형식 46개): [0]LV [1]계열 [2]보너스% [6..12]스탯 [13..15]HP/MP/SP [17]POINT
  function parseStatus(a, v) {
    if (!a || a.length < 18 || a.some((x) => Number.isNaN(x))) return null;
    const x = a[1];
    const line = v.xien.lines.find((l) => l.x === x);
    const xname = line ? line.name : (CONST && CONST.XIEN_NAME && CONST.XIEN_NAME[x]) || `계열 ${x}`;
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

  // ---------- 파생 값: 모델 하나에서 화면이 쓰는 값을 모두 계산한다(순수 함수) ----------
  function derive(model, ctx) {
    const v = model.view;
    const p = model.preview;
    const prev = ctx && ctx.prev;
    const log = parseLog(model.log);
    const lvRows = log.filter((r) => r.kind === 'lv');
    const footer = log.find((r) => r.kind === 'footer') || null;
    const summary = log.find((r) => r.kind === 'summary') || null;
    const atMax = v.lv >= v.maxLv;

    // 비용 계단: 지금 비용이 시작된 값(nextStepAt − 25, 1 이상), 비용이 오르는 값, 그 사이에서 값의 자리
    const stats = v.stats.map((st, i) => {
      const cap = statCap(i, v);
      const lastStep = st.nextStepAt > cap;                      // 상한까지 비용이 더 오르지 않는다
      const start = Math.max(1, st.nextStepAt - STEP);
      const top = lastStep ? cap : st.nextStepAt;
      const len = Math.max(1, top - start);
      const fill = st.atCap ? 1 : Math.min(1, Math.max(0, (st.value - start) / len));
      return {
        ...st, i, shortcut: SHORTCUT[i], cap, lastStep, start, top, len, fill,
        one: st.atCap ? 0 : Math.min(1 - fill, 1 / len),            // +1 한 번의 폭
        hasPrev: st.nextStepAt - STEP > 1,
        dest: Math.min(st.nextStepAt, cap),                         // 대시가 가는 곳
        left: top - st.value,
      };
    });
    const byKey = Object.fromEntries(stats.map((x) => [x.key, x]));

    // 발견: 계획이 포인트를 쏟는 스탯과 그 비용(로그의 몰빵 줄에서)
    const dumpRow = [...lvRows].reverse().find((r) => /몰빵/.test(r.text));
    const dumpKey = dumpRow && (dumpRow.text.match(statRe) || [])[0];
    const dump = dumpKey ? { key: dumpKey, from: dumpRow.from, to: dumpRow.to ?? dumpRow.from } : null;
    const open = stats.filter((x) => !x.atCap);
    const maxCost = open.length ? Math.max(...open.map((x) => x.cost)) : 0;
    const priciest = open.find((x) => x.cost === maxCost) || null;
    const focusStat = dump ? byKey[dump.key] : priciest;
    const fresh = v.actions === 0;

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
    return { v, p, prev, last: ctx && ctx.last, log, lvRows, footer, summary, atMax, stats, byKey, dump, priciest, focusStat, fresh, changes, moved, lineSel, logText: model.log || '', guide: model.guide || '' };
  }

  // 발견 문장: 제목 줄 밑에서 먼저 읽힌다
  function findingNodes(D) {
    const { v, p, dump, priciest, byKey } = D;
    const costWords = (st) => (st.lastStep
      ? `+1에${NB}${st.cost}포인트, 상한 ${fmt(st.cap)}까지 그대로입니다.`
      : `+1에${NB}${st.cost}포인트, ${fmt(st.nextStepAt)}부터는${NB}${st.cost + 1}포인트입니다.`);
    if (D.fresh) {
      return [h('b', null, '새 계획입니다.'), ' ', `LV${NB}${fmt(v.lv)}에서 시작합니다.`, p ? ` 레벨업(L)하면 POINT가${NB}${fmt(p.point)} 늘어납니다.` : ''];
    }
    if (D.atMax) {
      const can = D.stats.filter((x) => x.canUp).map((x) => x.key);
      return [h('b', null, `최고 레벨 LV${NB}${fmt(v.maxLv)}.`), ' ',
        can.length ? `더 오를 레벨이 없습니다. 남은 POINT로 지금 찍을 수 있는 스탯: ${can.join(', ')}.` : '더 오를 레벨이 없고, 남은 POINT로 찍을 수 있는 스탯도 없습니다.'];
    }
    if (dump) {
      const f = byKey[dump.key];
      if (f.atCap) {
        return [h('b', null, `LV${NB}${fmt(dump.from)}부터 ${f.key} 몰빵, 상한${NB}${fmt(f.cap)}에 닿았습니다.`), ' ',
          priciest ? `남은 스탯 가운데 가장 비싼 것은 ${priciest.key}(${priciest.cost}포인트)입니다.` : ''];
      }
      return [h('b', null, `LV${NB}${fmt(dump.from)}부터 ${f.key} 몰빵 중.`), ' ',
        priciest && f.cost === priciest.cost
          ? `${f.key}${TOPIC[f.key] || '는'} 가장 비싼 스탯으로 ${costWords(f)}`
          : `${f.key}${TOPIC[f.key] || '는'} ${costWords(f)}${priciest ? ` 가장 비싼 스탯은 ${priciest.key}(${priciest.cost}포인트)입니다.` : ''}`];
    }
    if (!priciest) return [h('b', null, '모든 스탯이 상한입니다.')];
    return [h('b', null, `${priciest.key}${TOPIC[priciest.key] || '는'} 가장 비싼 스탯입니다.`), ' ', `지금 ${costWords(priciest)}`];
  }
  // POINT 밑의 한 줄: 발견을 다음 조작으로 바꾼다(지금 포인트로 그 스탯을 몇 번 찍는지)
  function pointSub(D) {
    const { v, p } = D;
    const f = D.fresh ? null : D.focusStat;
    if (f && !f.atCap) {
      const afford = Math.max(0, Math.min(Math.floor(v.point / f.cost), f.top - f.value));
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
      case 'undo': return `되돌리기${a[0] ? '(한 레벨)' : ''}${lvs ? ` ${lvs}` : ''}`;
      case 'redo': return `다시 실행${a[0] ? '(한 레벨)' : ''}${lvs ? ` ${lvs}` : ''}`;
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
  function renderFrame(D) {
    const { v } = D;
    const typesWords = (ch) => ch.types.join(`${NB}· `);   // 타입 줄이 줄을 바꿔도 구분점이 줄 첫머리에 오지 않게
    if (!el.charList.children.length) {
      el.charList.append(...v.chars.map((ch, c) => h('li', null,
        h('button', { type: 'button', class: 'char', 'data-char': c, title: `${ch.name} · ${typesWords(ch)}${ch.startLv > 1 ? ` · LV ${ch.startLv}부터` : ''}` },
          h('img', { src: `img/c${c}.png`, alt: '', width: 28, height: 28 }),
          h('span', { class: 'char-text' },
            h('span', { class: 'char-name' }, ch.name, ch.startLv > 1 ? h('span', { class: 'char-start', 'aria-hidden': 'true' }, `LV${NB}${fmt(ch.startLv)}`) : null),
            h('span', { class: 'char-types' }, typesWords(ch) + (ch.startLv > 1 ? ` · LV${NB}${fmt(ch.startLv)}부터` : '')))))));
      el.cast.append(...v.chars.map((ch, c) => h('li', null,
        h('button', { type: 'button', 'data-char': c },
          h('img', { src: `img/c${c}.png`, alt: '', width: 84, height: 100 }),
          h('span', { class: 'cname' }, ch.name),
          ch.startLv > 1 ? h('span', { class: 'cmeta' }, `LV${NB}${fmt(ch.startLv)}부터`) : null))));
    }
    $$('[data-char]', el.charList).concat($$('[data-char]', el.cast)).forEach((b) => {
      if (+b.dataset.char === v.char) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    put(el.scope, h('img', { src: `img/c${v.char}.png`, alt: '', width: 28, height: 28 }),
      h('span', { class: 'scope-name' }, v.charName), h('span', { class: 'scope-type' }, v.typeName), icon(ICON.chev));
    el.scope.setAttribute('aria-label', `${v.charName} · ${v.typeName} 계획, 캐릭터와 타입 바꾸기`);
  }

  // 제목 줄: 캐릭터, 타입, 발견
  function renderTitle(D) {
    const { v } = D;
    el.portrait.src = `img/c${v.char}.png`;
    el.name.textContent = v.charName;
    el.typeLabel.textContent = v.typeName;
    const typeButtons = () => v.chars[v.char].types.map((t, i) => h('button', { type: 'button', 'data-type': i, 'aria-pressed': i === v.type ? 'true' : 'false' }, t));
    const key = `${v.char}:${v.type}`;
    if (el.types.dataset.key !== key) {
      put(el.types, ...typeButtons()); put(el.sheetTypes, ...typeButtons());
      el.types.dataset.key = key;
    }
    el.types.setAttribute('aria-label', `타입 (바꾸면 LV ${v.chars[v.char].startLv}부터 새 계획)`);
    put(el.finding, ...findingNodes(D));
    $('#reset-what').textContent = `${v.charName}/${v.typeName} LV ${v.chars[v.char].startLv} 시작 상태로 되돌립니다. 바꾸기 전에 확인합니다.`;
    document.title = `${v.charName} ${v.typeName} LV ${v.lv} · 나만의 재분배 시뮬레이터`;
  }

  // 1. 스탯 카드의 띠: POINT와 LV, HP / MP / SP(휴대폰에서는 일곱 줄 뒤)
  function renderStrip(D) {
    const { v, changes: c, moved: mv } = D;
    const base = lastWords(D);
    const fig = (n, moved, cls) => h('span', { class: 'fig' + (cls ? ' ' + cls : '') + (moved ? ' is-changed' : '') }, fmt(n));
    const cell = (label, value, sub, lead) => h('div', { class: 'cell' + (lead ? ' lead-cell' : '') },
      h('p', { class: 'cell-label' }, label), h('p', { class: 'cell-value' + (lead ? ' lead' : '') }, value), h('p', { class: 'cell-sub' }, sub));
    put(el.stripLead, 
      cell('POINT', [fig(v.point, mv && mv.point), chg(c && c.point, base, mv && mv.point)], pointSub(D), true),
      cell('LV', [fig(v.lv, mv && mv.lv), h('span', { class: 'unit' }, `/${NB}${fmt(v.maxLv)}`)], D.atMax ? '최고 레벨' : `${fmt(v.maxLv - v.lv)}레벨 남음`));
    put(el.stripVitals, ...[['HP', v.hp, c && c.hp, mv && mv.hp], ['MP', v.mp, c && c.mp, mv && mv.mp], ['SP', v.sp, c && c.sp, mv && mv.sp]].map(([k, x, d, m]) => cell(k,
      [fig(x.value, m), chg(d, base, m)],
      [h('span', { class: 'sr-only' }, '범위 '), `${fmt(x.min)}${NB}~ ${fmt(x.max)}`])));
    // 아래쪽 안개 바(1100px 이하)도 같은 값을 읽는다
    el.abPoint.textContent = fmt(v.point);
    const ab = chg(c && c.point, base, mv && mv.point);
    put(el.abPointChg, ...(ab ? [ab] : []));
    el.abLv.textContent = fmt(v.lv);
    el.abLvMax.textContent = `/${NB}${fmt(v.maxLv)}`;
  }

  // 비용 계단(시안 A의 SVG 획). 앞 계단 16px | 디딤판(늘어난다) | 챌판과 다음 디딤판 20px.
  // 디딤판의 좌표는 퍼센트라 너비가 바뀌어도 다시 그릴 필요가 없고, +1 미리보기는 눈금에서 시작해 최소 6px.
  function stairEl(st) {
    const pct = (x) => `${(x * 100).toFixed(3)}%`;
    const F = pct(st.fill);
    const end = st.atCap || st.lastStep;
    return h('span', { class: 'stair' + (st.hasPrev ? '' : ' no-prev') + (end ? ' at-end' : ''), 'aria-hidden': 'true' },
      s('svg', { class: 'st-prev', width: 16, height: 24, focusable: 'false' }, s('path', { class: 'prev', d: 'M1 21H15V17' })),
      s('svg', { class: 'st-tread', height: 24, focusable: 'false' },
        s('line', { class: 'tread', x1: 0, x2: '100%', y1: 14, y2: 14 }),
        st.atCap ? null : s('line', { class: 'pv pv-dash', x1: F, x2: '100%', y1: 14, y2: 14 }),
        st.atCap ? null : s('svg', { class: 'pv pv-up', x: F, y: 0, overflow: 'visible' },
          s('line', { x1: 0, x2: pct(st.one), y1: 14, y2: 14 }), s('line', { x1: 0, x2: 6, y1: 14, y2: 14 })),
        st.fill > 0 ? s('line', { class: 'fill', x1: 0, x2: F, y1: 14, y2: 14 }) : null,
        s('line', { class: 'tick', x1: F, x2: F, y1: 7, y2: 21 })),
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
      row.classList.toggle('focus', isFocus);
      const [nameC, valC, chgC, costC, stairC] = row.children;
      put(nameC, h('span', null, st.key), isFocus ? h('span', { class: 'pill', title: `LV ${fmt(D.dump.from)}–${fmt(D.dump.to)} 재분배 로그` }, '몰빵 중') : null);
      const d = c && c.stats[i];
      const m = !!(mv && mv.stats[i]);
      put(valC, h('span', { class: m ? 'is-changed' : null }, fmt(st.value)), chg(d, base, m));
      put(chgC, ...[chg(d, base, m)].filter(Boolean));
      put(costC, h('span', { class: 'c-label' }, `필요${NB}`), String(st.cost));
      stairC.title = st.atCap ? `${st.key}: 상한 ${fmt(st.cap)}`
        : st.lastStep ? `${fmt(st.start)}부터 상한 ${fmt(st.cap)}까지 +1에 ${st.cost}포인트 · ${fmt(st.left)}번 더 찍으면 상한`
          : `${fmt(st.start)}부터 ${fmt(st.nextStepAt - 1)}까지 +1에 ${st.cost}포인트 · ${fmt(st.left)}번 더 찍으면 ${fmt(st.nextStepAt)}`;
      put(stairC, stairEl(st), h('span', { class: 's-next' },
        st.atCap || st.lastStep ? ['상한 ', h('b', null, fmt(st.cap))] : [h('b', null, fmt(st.nextStepAt)), `부터${NB}${st.cost + 1}`]));
      const up = row.querySelector('.up');
      const dash = row.querySelector('.dash');
      const whyUp = st.canUp ? '' : st.atCap ? '상한입니다' : `포인트 부족: ${st.cost} 필요`;
      const whyDash = st.canDash ? '' : st.atCap ? '상한입니다' : '최고 레벨이라 레벨업할 수 없고 포인트가 모자랍니다';
      up.setAttribute('aria-label', `${st.key} +1, ${st.cost}포인트`);
      setDisabled(up, whyUp);
      dash.querySelector('.dest').textContent = `${fmt(st.dest)}까지`;
      dash.setAttribute('aria-label', `${st.key} ${fmt(st.dest)}까지 찍기 (대시: 포인트가 모자라면 레벨업하며)`);
      setDisabled(dash, whyDash);
    });
  }
  // aria-disabled 와 그 까닭(title, 누르면 읽어 준다)
  function setDisabled(b, why) {
    if (why) { b.setAttribute('aria-disabled', 'true'); b.title = why; } else { b.removeAttribute('aria-disabled'); b.removeAttribute('title'); }
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
    nextParts.meta.textContent = p ? `LV${NB}${fmt(p.lv)}` : '최고 레벨';
    const gain = (dd, dt, none) => h('div', { class: none ? 'none' : null }, h('dt', null, dt), h('dd', null, dd));
    if (!p) {
      put(nextParts.gains, h('div', { class: 'gains-done', style: { 'grid-column': '1 / -1' } },
        h('dt', null, '더 받을 레벨업 보상 없음'), h('dd', null, `LV${NB}${fmt(v.maxLv)}, 최고 레벨`)));
    } else {
      const ln = splitLine(D.lineSel.name);
      const mi = STAT_KEYS.indexOf(ln.main), bi = STAT_KEYS.indexOf(ln.bonus);
      const parts = [gain(`POINT +${fmt(p.point)}`, '레벨업 보상')];
      if (mi >= 0) {
        const n = p.stats[mi];
        parts.push(n ? gain(`${ln.main} +${n}`, `${ln.line} · 매 레벨`) : gain(`${ln.main} +0`, D.stats[mi].atCap ? `${ln.line} · 상한` : `${ln.line} · 매 레벨`, true));
      }
      if (bi >= 0) {
        const n = p.stats[bi];
        // 보너스는 난수가 아니라 정해져 있다: 이번 레벨업에 받는지 엔진의 preview가 알려 준다
        parts.push(p.bonus && n ? gain(`${ln.bonus} +${n}`, `보너스 받음 · ${v.bonus.rate}%`) : gain(`${ln.bonus} +0`, p.bonus ? `보너스 · 상한` : `보너스 없음 · ${v.bonus.rate}%`, true));
      }
      put(nextParts.gains, ...parts);
    }
    if (document.activeElement !== bonusInput) bonusInput.value = v.bonus.rate;
    stepDown.disabled = v.bonus.rate <= 0;
    stepUp.disabled = v.bonus.rate >= 100;
    put(nextParts.record, h('span', { class: 'sr-only' }, '지금까지 보너스 '), h('b', null, `${fmt(v.bonus.achieved)} / ${fmt(v.bonus.levelUps)}`), `회 · ${v.bonus.effective}`);
    // ▲ 표시의 기준을 말로(그림 열쇠는 표시 그대로)
    const words = lastWords(D);
    const c = D.changes;
    const anyUp = c && (c.point > 0 || c.hp > 0 || c.stats.some((x) => x > 0));
    nextParts.last.hidden = !words;
    put(nextParts.last, ...(words ? [h('span', { class: 'chg' + (anyUp ? '' : ' down'), 'aria-hidden': 'true' }, icon(anyUp ? ICON.up : ICON.down)), `직전 조작: ${words}`] : []));
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
    $('#xien-meta').textContent = n === v.xien.lines.length ? `지금 ${n}개 선택 가능` : `${v.xien.lines.length}개 중 ${n}개 선택 가능`;
    for (const l of v.xien.lines) {
      const opt = list.querySelector(`.xien-opt[data-x="${l.x}"]`);
      const input = opt.querySelector('input');
      const x = splitLine(l.name);
      input.checked = l.x === v.xien.selected;
      input.disabled = !l.selectable && l.x !== v.xien.selected;
      opt.title = l.selectable ? `${x.line}: 레벨업마다 ${x.main} +1, 보너스 때 ${x.bonus} +1` : '이 레벨에서는 고를 수 없습니다';
    }
  }

  // 3. 로그: 화면에서는 용어집의 말로(복사하는 글자는 엔진이 쓴 그대로)
  // 구분점(·)은 앞 항목에 붙인다(앞은 줄바꿈 없는 공백): 줄이 바뀌어도 줄 끝에 남고 다음 줄 첫머리에 오지 않는다
  function statusSub(st) {
    return h('span', { class: 'set-sub' },
      [['POINT', st.point]].concat(STAT_KEYS.map((k, i) => [k, st.stats[i]]), [['HP', st.hp], ['MP', st.mp], ['SP', st.sp]])
        .flatMap(([k, n], j) => [j ? `${NB}· ` : '', h('span', null, `${k} `, h('b', null, fmt(n)))]));
  }
  function logBody(rows, D, { now = false, newKeys = null } = {}) {
    const body = h('tbody');
    const keyOf = (r, i) => `${r.kind}|${r.from ?? ''}|${r.to ?? ''}|${r.text ?? r.rate ?? r.name ?? ''}|${i}`;
    rows.forEach((r, i) => {
      let tr = null;
      if (r.kind === 'lv') {
        const isNow = now && r.from <= D.v.lv && (r.to ?? r.from) >= D.v.lv;
        const what = r.text ? statText(r.text) : h('span', { class: 'none' }, isNow ? '아직 찍지 않음' : '찍지 않음');
        tr = h('tr', { class: 'lv-row' + (isNow ? ' now' : ''), 'aria-current': isNow ? 'step' : null },
          h('th', { class: 'lvc', scope: 'row' }, r.to == null ? fmt(r.from)
            : [fmt(r.from), h('span', { class: 'lv-dash', 'aria-hidden': 'true' }, '–'), h('span', { class: 'sr-only' }, '부터 '), fmt(r.to)]),
          h('td', { class: 'what' }, what, isNow ? h('span', { class: 'pill' }, '지금') : null));
      } else if (r.kind === 'bonus' || r.kind === 'xien') {
        const k = r.kind === 'bonus' ? '보너스' : '주력 계열';
        const val = r.kind === 'bonus' ? `${r.rate}%` : r.name;
        tr = h('tr', { class: 'set' }, h('td', { class: 'lvc' }, h('span', { class: 'sr-only' }, '설정 변경')),
          h('td', { class: 'what' }, h('span', { class: 'set-text' }, h('span', { class: 'set-k' }, k), h('span', { class: 'set-v' }, val))));
      } else if (r.kind === 'status') {
        const st = parseStatus(r.values, D.v);
        tr = h('tr', { class: 'set' }, h('td', { class: 'lvc' }, h('span', { class: 'sr-only' }, '시작 상태')),
          h('td', { class: 'what' }, h('span', { class: 'set-text' }, h('span', { class: 'set-k' }, '스탯 편집'),
            st ? [h('span', { class: 'set-v' }, `LV${NB}${fmt(st.lv)}에서 시작`), h('span', { class: 'set-sub' }, `보너스 ${st.rate}% · 주력 계열 ${st.xien}`), statusSub(st)]
              : h('span', { class: 'set-v' }, '이 레벨의 상태에서 시작'))));
      }
      if (!tr) return;
      if (newKeys && !newKeys.has(keyOf(r, i))) tr.classList.add('is-new');
      body.append(tr);
    });
    return body;
  }
  const logKeys = (rows) => new Set(rows.map((r, i) => `${r.kind}|${r.from ?? ''}|${r.to ?? ''}|${r.text ?? r.rate ?? r.name ?? ''}|${i}`));
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
  function renderLog(D) {
    const rows = D.log;
    const keys = logKeys(rows);
    // 새로 생긴 줄만 들어오는 움직임(로그를 통째로 바꾼 경우에는 움직이지 않는다)
    let newKeys = null;
    if (!first && prevLogKeys) {
      const added = [...keys].filter((k) => !prevLogKeys.has(k)).length;
      if (added > 0 && added <= 3) newKeys = prevLogKeys;
    }
    prevLogKeys = keys;
    const changed = el.logTable.dataset.src !== D.logText;
    el.logTable.dataset.src = D.logText;
    put(el.logTable, h('caption', { class: 'sr-only' }, `${D.v.charName}/${D.v.typeName} 재분배 로그`), logHead(), logBody(rows, D, { now: true, newKeys }));
    put(el.logSum, ...sumNodes(D.footer, D.summary));
    el.logSum.hidden = !(D.footer || D.summary);
    // 원본처럼 로그는 끝(방금 한 조작과 마지막 두 줄)이 보이게 내려 둔다
    if (changed) { const sc = $('#log-scroll'); sc.scrollTop = sc.scrollHeight; }
    const firstLv = D.lvRows.length ? D.lvRows[0].from : D.v.startLv;
    const n = lines(D.logText).filter((l) => l.trim()).length;
    railMeta.log = `LV${NB}${firstLv === D.v.lv ? fmt(firstLv) : `${fmt(firstLv)}–${fmt(D.v.lv)}`} · ${n}줄`;
  }

  // 3. 육성 가이드: 제 줄들에서 그린다(엔진이 쓴 글자)
  function renderGuide(D) {
    const g = D.guide;
    if (el.guide.dataset.src === g) return;
    el.guide.dataset.src = g;
    railMeta.guide = g ? `텍스트 ${lines(g).length}줄` : '';
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
    put(el.guide, ...out);
  }

  // 기록 버튼(상단 바와 아래쪽 바): 되돌릴 것, 다시 할 것, 최고 레벨
  function renderHistory(D) {
    const { v } = D;
    const why = { undo: v.canUndo ? '' : '되돌릴 조작이 없습니다', redo: v.canRedo ? '' : '다시 실행할 조작이 없습니다', levelUp: D.atMax ? '최고 레벨입니다' : '' };
    $('#undo-why').textContent = why.undo; $('#redo-why').textContent = why.redo; $('#levelup-why').textContent = why.levelUp;
    for (const [act, keys] of [['undo', '← (⇧: 한 레벨씩)'], ['redo', '→ (⇧: 한 레벨씩)'], ['levelUp', 'L']]) {
      for (const b of $$(`[data-act="${act}"]`)) {
        if (why[act]) { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-describedby', `${act === 'levelUp' ? 'levelup' : act}-why`); }
        else { b.removeAttribute('aria-disabled'); b.removeAttribute('aria-describedby'); }
        b.title = why[act] ? `${why[act]} · ${keys}` : `${{ undo: '되돌리기', redo: '다시 실행', levelUp: '레벨업' }[act]} · ${keys}`;
      }
    }
  }

  // 화면이 두 번 보여 주는 값은 서로 같아야 한다(어긋나면 콘솔에 남긴다)
  function check(D) {
    const { v, footer, summary } = D;
    console.assert(!footer || (footer.point === v.point && footer.achieved === v.bonus.achieved && footer.levelUps === v.bonus.levelUps && footer.char === v.charName && footer.type === v.typeName), '로그 마지막 줄의 캐릭터/타입, 보너스 기록, POINT가 화면과 같다');
    console.assert(!summary || (summary.lv === v.lv && summary.stats.every(([k, n]) => (D.byKey[k] ? D.byKey[k].value === n : true))), '로그의 스탯 줄이 스탯 표와 같다');
    D.stats.forEach((st) => console.assert(st.atCap || st.lastStep || (st.value >= st.start && st.value < st.nextStepAt), `${st.key}: 값이 지금 비용 단계 안에 있다`));
  }

  // ---------- render(model): 화면의 하나뿐인 입구 ----------
  let model = null;
  let shownView = null;      // 마지막으로 그린 view(움직일 숫자를 고른다)
  const railMeta = { log: '', guide: '' };
  function render(next, ctx = {}) {
    model = next;
    const D = derive(next, { ...ctx, shown: first ? null : shownView });
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
    first = false;
    return D;
  }

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
      default: return [];
    }
  };
  // 정적 데이터 단계에서 엔진 대신 내놓는 결과: 원본이 거절할 조작은 ok: false, 효과음은 원본과 같다
  function draftResult(act, args) {
    const v = model.view;
    switch (act) {
      case 'levelUp': return { ok: v.lv < v.maxLv, sound: 'lvup' };
      case 'statUp': return { ok: !!v.stats[args[0]].canUp, sound: 'stup' };
      case 'dash': return { ok: !!v.stats[args[0]].canDash, sound: 'stup' };
      case 'undo': return { ok: v.canUndo, sound: null };
      case 'redo': return { ok: v.canRedo, sound: null };
      case 'importLog': case 'openShared': return { ok: readableLog(args[0]) };
      case 'setXien': return { ok: !!(v.xien.lines.find((l) => l.x === args[0]) || {}).selectable, sound: null };
      default: return { ok: true, sound: null };
    }
  }
  // 원본 logLoad 가 무언가를 읽는 글인가(LV n : 줄, 78/46개짜리 Status 줄, 캐릭터/타입 줄 중 하나)
  function readableLog(text) {
    const rows = parseLog(String(text || '').replace(/\uFF0C/g, ',').replace(/\uFF1A/g, ':').replace(/\uFF0D/g, '-'));
    return rows.some((r) => r.kind === 'lv' || (r.kind === 'status' && (r.values.length === 78 || r.values.length === 46)) || (r.kind === 'footer' && model.view.chars.some((c) => c.name === r.char)));
  }
  function pressFlash(btn) {
    if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
    btn.classList.add('is-pressed');
    clearTimeout(btn._press);
    btn._press = setTimeout(() => btn.classList.remove('is-pressed'), 160);
  }
  /**
   * dispatch(act, ...args) — 이름 있는 조작 하나를 보낸다.
   * 조작: levelUp, statUp(i), dash(i), undo(byLevel), redo(byLevel), setBonus(rate), setXien(x), setChar(c), setType(s), reset,
   *       editCommit(values), importLog(text), openShared(text), keepSaved, copyLog, copyGuide, share, paste, clearPaste,
   *       toggleGuide, setVolume(v), setMuted(m)
   * 지금은 반응만 한다. 엔진을 연결하면 여기서 엔진을 부르고(r = e[act](...args)), r.ok 이면 효과음(r.sound)과
   * render({ view, preview, log, guide }, { prev, last: { act, args } })를 부른다.
   */
  function dispatch(act, ...args) {
    const ctl = controlsFor(act, args);
    const r = draftResult(act, args);
    // 다른 부분(자동 저장, 검사 스크립트)이 들을 수 있게 알린다
    document.dispatchEvent(new CustomEvent('oresim:action', { detail: { act, args, ok: r.ok } }));
    if (!r.ok) {
      const b = ctl.find((x) => x && x.getAttribute('aria-disabled') === 'true');
      const why = b && (b.getAttribute('aria-describedby') ? ($('#' + b.getAttribute('aria-describedby')) || {}).textContent : b.title);
      if (why) announce(why);
      return r;
    }
    ctl.forEach(pressFlash);
    if (r.sound) playSound(r.sound);
    // 설정은 정적 데이터에서도 움직인다(엔진도 곧바로 고친다): 화면의 값만 바꿔 다시 그린다. 연결하면 지운다
    if (act === 'setBonus' || act === 'setXien') {
      const v = { ...model.view, bonus: { ...model.view.bonus }, xien: { ...model.view.xien } };
      let p = model.preview;
      if (act === 'setBonus') v.bonus.rate = args[0];
      if (act === 'setXien') {
        v.xien.selected = args[0];
        const ln = splitLine((v.xien.lines.find((l) => l.x === args[0]) || {}).name || '');
        if (p) p = { ...p, stats: STAT_KEYS.map((k) => (k === ln.main ? 1 : k === ln.bonus && p.bonus ? 1 : 0)) };
      }
      render({ ...model, view: v, preview: p }, { prev: lastD && lastD.prev, last: lastD && lastD.last });
    }
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
  /** playSound('lvup' | 'stup') — 연결 단계에서 엔진 결과의 sound 로 부른다 */
  function playSound(name) { Sound.play(name); }

  // ==========================================================================
  // 상호작용: 누름, 대화상자, 확인, 탭, 복사, 링크, 붙여넣은 로그, 설정, 키보드
  // ==========================================================================
  // 못 쓰는 컨트롤을 누르면 아무 일 없이 끝나지 않고 까닭을 읽어 준다
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[aria-disabled="true"]');
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
  function ask({ title, desc, go = '바꾸기', cancel = '취소', onGo, onCancel, from, single = false }) {
    $('#confirm-title').textContent = title;
    put($('#confirm-desc'), ...[].concat(desc));
    $('#confirm-go').textContent = go;
    $('#confirm-cancel').textContent = cancel;
    $('#confirm-cancel').hidden = single;
    confirmGo = onGo || null; confirmCancel = onCancel || null;
    openDialog(confirmDlg, from);
  }
  confirmDlg.addEventListener('close', () => {
    const go = confirmDlg.returnValue === 'go';
    const fn = go ? confirmGo : confirmCancel;
    confirmGo = confirmCancel = null;
    if (fn) setTimeout(fn, 0);
  });
  const planNow = () => [planName(model.view.charName, model.view.typeName), `, LV${NB}${fmt(model.view.lv)}`];
  const keepIt = '남겨 두려면 먼저 링크 복사를 하세요.';
  const nothingToLose = () => model.view.actions === 0;
  function askChar(c, from) {
    const v = model.view;
    const ch = v.chars[c];
    if (!ch || c === v.char) return;
    if (nothingToLose()) return dispatch('setChar', c);
    ask({ title: `${ch.name}${ro(ch.name)} 바꿀까요?`, desc: ['지금 계획(', ...planNow(), `)은 지워지고 `, planName(ch.name, ch.types[0]), ` LV${NB}${fmt(ch.startLv)}부터 새로 시작합니다. ${keepIt}`], onGo: () => dispatch('setChar', c), from });
  }
  function askType(t, from) {
    const v = model.view;
    const name = v.chars[v.char].types[t];
    if (name == null || t === v.type) return;
    if (nothingToLose()) return dispatch('setType', t);
    ask({ title: `${name}${ro(name)} 바꿀까요?`, desc: ['지금 계획(', ...planNow(), `)은 지워지고 `, planName(v.charName, name), ` LV${NB}${fmt(v.chars[v.char].startLv)}부터 새로 시작합니다. ${keepIt}`], onGo: () => dispatch('setType', t), from });
  }
  function askReset(from) {
    const v = model.view;
    ask({ title: '스탯을 초기화할까요?', desc: ['지금 계획(', ...planNow(), `)은 지워지고 `, planName(v.charName, v.typeName), ` LV${NB}${fmt(v.chars[v.char].startLv)}부터 다시 시작합니다. ${keepIt}`], go: '초기화', onGo: () => dispatch('reset'), from });
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

  // ---------- 스탯 편집(T): 연 순간의 상태(엔진의 editOpen())로 칸을 채운다 ----------
  const editDlg = $('#edit-dialog');
  // 연결하면 engine.editOpen() 을 부른다
  const getEdit = () => model.edit;
  let editData = null;
  function openEdit(from) {
    const e = getEdit();
    if (!e) return;
    editData = e;
    const v = model.view;
    const L = e.limits;
    const fld = (label, name, value, lim, extra) => h('label', { class: 'fld' }, h('span', null, label),
      h('input', { type: 'number', inputmode: 'numeric', name, min: lim[0], max: lim[1], step: lim[2], value, ...extra }));
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
    put($('#edit-xien'), ...e.lines.map((l) => fld(splitLine(l.name).line, `x${l.x}`, l.value, [0, null, 1], { placeholder: '0', 'aria-describedby': 'hint-xien' })));
    openDialog(editDlg, from);
    const lv = $('#edit-top input[name="lv"]');
    if (lv) { lv.focus(); lv.select(); }
  }
  $('#edit-open').addEventListener('click', (e) => openEdit(e.currentTarget));
  editDlg.addEventListener('close', () => {
    if (editDlg.returnValue !== 'apply' || !editData) return;
    // 빈 칸은 연 순간의 값 그대로, 계열 레벨의 빈 칸은 0(원본: 숫자가 아니면 0). 범위 맞춤과 반올림은 엔진이 한다
    const num = (name, d) => { const x = $(`#edit-form input[name="${name}"]`); const n = x && x.value.trim() !== '' ? Number(x.value) : NaN; return Number.isFinite(n) ? n : d; };
    const values = {
      lv: num('lv', editData.lv), point: num('point', editData.point), hp: num('hp', editData.hp), mp: num('mp', editData.mp), sp: num('sp', editData.sp),
      stats: editData.stats.map((n, i) => num(`s${i}`, n)),
      lines: editData.lines.map((l) => ({ x: l.x, name: l.name, value: num(`x${l.x}`, 0) })),
    };
    dispatch('editCommit', values);
    announce('스탯 편집을 적용했습니다');
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
    $('#rail-meta').textContent = guide ? railMeta.guide : railMeta.log;
    const copy = $('#copy');
    copy.setAttribute('aria-label', guide ? '육성 가이드 텍스트 복사' : '재분배 로그 복사');
    setDisabled(copy, guide && !model.guide ? '복사할 육성 가이드가 없습니다' : '');
  }
  function selectTab(tab, focusIt) {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    }
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
  const b64url = (str) => { const bytes = new TextEncoder().encode(str); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const fromB64url = (str) => { const b = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)); return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(b, (c) => c.charCodeAt(0))); };
  /** 공유 링크: 엔진이 쓴 로그를 그대로(줄바꿈은 \n) base64url 로 담는다 */
  const shareLink = (log) => `${location.href.split('#')[0]}#plan=${b64url(lines(log).join('\n'))}`;
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
    const link = shareLink(model.log);
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
  const openLoader = () => {
    if (loader.classList.contains('is-open')) return;
    // 칸이 열리며 로그가 짧아져도, 끝을 보고 있었으면 끝(방금 한 조작과 마지막 두 줄)이 계속 보이게
    const sc = $('#log-scroll');
    const atEnd = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2;
    loader.classList.add('is-open');
    if (atEnd) sc.scrollTop = sc.scrollHeight;
  };
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
  function say(tone, words) {
    loadMsg.dataset.tone = tone || '';
    loadMsg.classList.remove('is-new');
    if (!words) { put(loadMsg); return; }
    put(loadMsg, icon(tone === 'error' ? ICON.alert : tone === 'ok' ? ICON.check : ICON.info), h('span', null, ...[].concat(words)));
    void loadMsg.offsetWidth;
    loadMsg.classList.add('is-new');
  }
  // 일본어판에서 만든 로그는 이름이 달라 제대로 읽히지 않는다(오류는 나지 않고 결과가 달라진다): 미리 알린다
  const looksJapanese = (t) => /[\u3040-\u30FF\uFF66-\uFF9F]/.test(t);
  function noteText() {
    const t = pasteText.value;
    if (looksJapanese(t)) say('info', '일본어판에서 만든 로그로 보입니다. 캐릭터·계열 이름이 달라, 불러오면 지금 고른 캐릭터로 다시 계산되어 결과가 달라집니다.');
    else if (loadMsg.dataset.tone === 'info' || loadMsg.dataset.tone === 'error') say('', '');
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
  function requestLoad(from) {
    const text = pasteText.value;
    if (!text.trim()) {
      openLoader();                                                      // 붙여넣을 자리를 보여 준다(초점은 옮기지 않는다)
      say('error', '붙여넣은 로그가 없습니다. 재분배 로그를 먼저 붙여넣으세요.');
      pressFlash(loadBtn);
      return;
    }
    const rows = parseLog(text);
    const f = rows.find((r) => r.kind === 'footer');
    const sm = rows.find((r) => r.kind === 'summary');
    const go = () => {
      const r = dispatch('importLog', text);
      if (r && r.ok) say('ok', ['로그를 불러왔습니다', f ? [': ', planName(f.char, f.type)] : '', sm ? ` LV${NB}${fmt(sm.lv)}` : '', '.']);
      else say('error', '이 글에서 읽을 수 있는 재분배 로그 줄을 찾지 못했습니다. "LV 숫자 :" 줄이나 Status 줄이 들어 있는지 확인하세요.');
    };
    if (nothingToLose() || !readableLog(text)) return go();
    ask({ title: '로그를 불러올까요?', desc: ['지금 계획(', ...planNow(), ')은 지워지고 붙여넣은 로그', f ? ['(', planName(f.char, f.type), sm ? `, LV${NB}${fmt(sm.lv)}` : '', ')'] : '', `로 다시 만듭니다. ${keepIt}`], go: '불러오기', onGo: go, from });
  }
  loadBtn.addEventListener('click', (e) => requestLoad(e.currentTarget));

  // ---------- 설정: 보너스(다음 레벨업부터)와 주력 계열 ----------
  // NumericStepper 처럼 5 단위로 반올림하고 0~100으로 맞춘다(엔진도 같은 일을 한다)
  const stepRound = (n) => Math.max(0, Math.min(100, Math.round((Number(n) || 0) / 5) * 5));
  function commitBonus() {
    const n = stepRound(bonusInput.value);
    bonusInput.value = n;
    if (n !== model.view.bonus.rate) dispatch('setBonus', n);
  }
  [stepDown, stepUp].forEach((b) => b.addEventListener('click', () => { const n = stepRound(model.view.bonus.rate + Number(b.dataset.step)); bonusInput.value = n; dispatch('setBonus', n); }));
  bonusInput.addEventListener('change', commitBonus);
  el.xien.addEventListener('change', (e) => {
    if (e.target.name !== 'xien') return;
    const r = dispatch('setXien', Number(e.target.value));
    if (!r.ok) renderXien(lastD);                                // 고를 수 없으면 원래 선택으로
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
    [[kb('⇧'), '+', kb('←'), kb('→')], '한 레벨씩 되돌리기 · 다시 실행'],
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
    else if (code === 'KeyG') { e.preventDefault(); dispatch('toggleGuide'); selectTab(isGuide() ? tabLog : tabGuide); }
    else if (code === 'KeyP') { e.preventDefault(); requestLoad($('#load')); }
    else if (code in STAT_BY_CODE) { e.preventDefault(); dispatch(e.shiftKey ? 'dash' : 'statUp', STAT_BY_CODE[code]); }
  });

  // 1600px부터 상단 바의 두 무리가 묶인 내용의 양 끝 위에 서도록, 스크롤 막대를 뺀 너비를 넣는다
  const setVw = () => document.documentElement.style.setProperty('--vw', document.documentElement.clientWidth + 'px');
  setVw(); addEventListener('resize', setVw);

  // ==========================================================================
  // 시작: 정적 데이터에서 상태 하나를 고른다(?state=…, 연결 단계에서 없앤다)
  // ==========================================================================
  const DRAFT = window.ORESIM_DRAFT || {};
  const wanted = new URLSearchParams(location.search).get('state') || 'main';
  const start = DRAFT[wanted] || DRAFT.main;
  if (!start) return;
  render({ view: start.view, preview: start.preview, log: start.log, guide: start.guide, edit: start.edit },
    start.before ? { prev: start.before.view, last: { act: start.before.act, args: start.before.args } } : {});
  selectTab(tabLog);
  moveInk(false);

  // 공유 링크로 열었을 때: 이 브라우저에 저장된 계획을 바꾸기 전에 묻는다(연결 단계에서 자동 저장과 이어진다)
  function checkSharedLink() {
    const m = location.hash.match(/^#plan=([A-Za-z0-9_-]+)$/);
    if (!location.hash.startsWith('#plan=')) return;
    const clearHash = () => { try { history.replaceState(null, '', location.href.split('#')[0]); } catch (_) { /* 그대로 둔다 */ } };
    let text = null;
    try { text = m ? fromB64url(m[1]) : null; } catch (_) { text = null; }
    if (!text || !readableLog(text)) {
      ask({ title: '링크의 계획을 읽지 못했습니다', desc: '링크가 잘렸거나 손상되었습니다. 이 브라우저에 저장된 계획을 그대로 엽니다.', go: '확인', single: true, onGo: clearHash, onCancel: clearHash });
      return;
    }
    const rows = parseLog(text);
    const f = rows.find((r) => r.kind === 'footer');
    const sm = rows.find((r) => r.kind === 'summary');
    const linkName = f ? [planName(f.char, f.type), sm ? `, LV${NB}${fmt(sm.lv)}` : ''] : ['붙여넣은 계획'];
    if (text.trim() === lines(model.log).join('\n').trim()) { clearHash(); return; }   // 같은 계획이면 묻지 않는다
    ask({
      title: '링크의 계획을 열까요?',
      desc: ['링크의 계획(', ...linkName, ')을 열면 이 브라우저에 저장된 계획(', ...planNow(), ')은 지워집니다. 저장된 계획도 남기려면 \'저장된 계획 유지\'를 누르고 먼저 그 계획의 링크를 복사하세요.'],
      go: '링크 계획 열기', cancel: '저장된 계획 유지',
      onGo: () => { dispatch('openShared', text); clearHash(); },
      onCancel: () => { dispatch('keepSaved'); clearHash(); },
    });
  }
  checkSharedLink();
  addEventListener('hashchange', checkSharedLink);

  /** 연결 단계의 입구: render(model, ctx), dispatch(act, ...args), playSound(name) */
  window.OresimUI = { render, dispatch, playSound, shareLink, states: DRAFT };
})();
