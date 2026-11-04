// 웹 화면 연기 시험(smoke test): web/ 을 내보내고 진짜 브라우저(Playwright의 Chromium)로 연다.
// 확인하는 것: 시작, 진짜 키와 클릭으로 한 몇 가지 조작, 화면의 숫자 = OresimUI.engine().view() (와 대시 이름표 =
// previewDash), 새로 고침 뒤 되살리기(되돌리기 기록까지), 공유 링크 왕복, 지울 계획이 있을 때 링크를 묻는 동안 주소창에 남는 링크,
// 손으로 만든 무거운 링크의 거절, 붙여넣은 로그 왕복, 앞 판 엔진의 자동 저장(로그에서 다시 만들기, 이름이 바뀐 타입을 첫 타입으로 읽었다는
// 알림과 그때까지 옛 기록을 두는 것), 그 로그를 담은 공유 링크의 알림, 상한이 285이던 판에서 스탯 편집으로 상한을 넘게 만든 계획의
// 공유 링크와 자동 저장(상한으로 읽고 알린다), 1440×900 에서 LV 범위 줄이 있어도 페이지가 화면 높이 그대로인지, 깨끗한 콘솔.
// 공유 링크 왕복에서 알려진 예외 하나: 조작 0회인 계획(처음까지 되돌린 계획 등)의 로그 첫머리 'Bonus' 줄은 원본이 기록 맨 앞 칸에
// 덧쓴 값이라 받는 쪽에서 같은 글로 다시 만들 수 없다(원본도 같다). 보너스 값은 링크의 b 로 같아진다(web/js/app.js 의 linkCandidate).
// 저장소는 npm 을 쓰지 않는다: playwright 를 불러오지 못하거나 브라우저를 띄우지 못하면 그렇게 말하고 0 으로 끝낸다.
// 실행(저장소 맨 위에서): node tests/web-smoke.js
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (_) {
  console.log('web-smoke: playwright 를 불러오지 못해 건너뜁니다(이 저장소는 npm 을 쓰지 않습니다). playwright 가 있는 곳에서 다시 돌리세요.');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..', 'web');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };

let fails = 0;
const ok = (cond, what) => { if (!cond) fails++; console.log(`${cond ? 'PASS' : 'FAIL'} ${what}`); };

// web/ 을 내보내는 작은 서버(127.0.0.1, 빈 포트)
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((q, r) => {
      let f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
      if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
      if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
      fs.readFile(f, (e, b) => {
        if (e) { r.writeHead(404); r.end(); return; }
        r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
        r.end(b);
      });
    }).listen(0, '127.0.0.1', () => resolve({ srv, base: `http://127.0.0.1:${srv.address().port}/` }));
  });
}

// 화면의 숫자와 엔진의 view()/previewDash() 를 맞춰 본다. 다른 것을 글로 돌려준다
const compare = (page) => page.evaluate(() => {
  const num = (t) => Number(String(t).replace(/[^0-9-]/g, ''));
  const e = window.OresimUI.engine();
  const v = e.view();
  const bad = [];
  const lead = document.querySelectorAll('#strip-lead .cell .fig');
  const vit = document.querySelectorAll('#strip-vitals .cell .fig');
  if (num(lead[0].textContent) !== v.point) bad.push(`POINT ${lead[0].textContent} != ${v.point}`);
  if (num(lead[1].textContent) !== v.lv) bad.push(`LV ${lead[1].textContent} != ${v.lv}`);
  ['hp', 'mp', 'sp'].forEach((k, i) => { if (num(vit[i].textContent) !== v[k].value) bad.push(`${k} ${vit[i].textContent} != ${v[k].value}`); });
  v.stats.forEach((st, i) => {
    const row = document.querySelector(`.srow[data-key="${st.key}"]`);
    if (num(row.querySelector('.s-val > span').textContent) !== st.value) bad.push(`${st.key} value`);
    if (num(row.querySelector('.s-cost').textContent) !== st.cost) bad.push(`${st.key} cost`);
    const d = e.previewDash(i);
    const dest = row.querySelector('.dash .dest').textContent;
    const want = st.canDash && d !== null ? `${d.value.toLocaleString('ko-KR')}까지` : '대시';   // 'N까지' / '대시'
    if (dest !== want) bad.push(`${st.key} dash "${dest}" != "${want}"`);
  });
  if (document.querySelector('#log-table').dataset.src !== e.exportLog()) bad.push('log view != exportLog()');
  return { bad, lv: v.lv, point: v.point };
});
const engineState = (page) => page.evaluate(() => {
  const e = window.OresimUI.engine();
  const v = e.view();
  return { log: e.exportLog(), b: v.bonus.rate, x: v.xien.selected, view: JSON.stringify(v) };
});
const decodeLink = (link) => {
  const m = link.match(/#([pt])=([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  const bytes = Buffer.from(m[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  return JSON.parse((m[1] === 'p' ? zlib.inflateRawSync(bytes) : bytes).toString('utf8'));
};

(async () => {
  const { srv, base } = await serve();
  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    console.log(`web-smoke: 브라우저를 띄우지 못해 건너뜁니다(${String(e.message).split('\n')[0]}).`);
    srv.close();
    process.exit(0);
  }
  const logs = [];
  const newPage = async (ctx) => {
    const page = await ctx.newPage();
    page.on('console', (m) => { if (['error', 'warning', 'assert'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
    page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));
    return page;
  };
  try {
    // ---- 시작과 조작 ----
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await newPage(ctx);
    await page.goto(base + 'index.html');
    await page.waitForTimeout(300);
    const boot = await page.evaluate(() => ({ lv: window.OresimUI.engine().view().lv, ui: Object.keys(window.OresimUI).join(',') }));
    ok(boot.lv === 1 && boot.ui === 'render,dispatch,playSound,shareLink,engine', `boots on a fresh plan (LV ${boot.lv}); OresimUI = ${boot.ui}`);
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    for (const k of ['KeyL', 'KeyL', 'KeyL', 'KeyS', 'KeyS', 'Shift+KeyA', 'ArrowLeft', 'ArrowRight']) await page.keyboard.press(k);
    let c = await compare(page);
    ok(c.bad.length === 0, `keys (L L L S S Shift+A ← →): the screen matches the engine (LV ${c.lv}, POINT ${c.point}) ${c.bad.join('; ')}`);
    await page.click('#levelup');
    await page.click('[data-up="1"]');
    await page.click('[data-dash="0"]');
    c = await compare(page);
    ok(c.bad.length === 0, `clicks (레벨업, HACK +1, STAB 대시): the screen matches the engine (LV ${c.lv}) ${c.bad.join('; ')}`);
    await page.fill('#bonus', '62');
    await page.keyboard.press('Enter');
    const bonus = await page.evaluate(() => ({ field: document.querySelector('#bonus').value, rate: window.OresimUI.engine().view().bonus.rate }));
    ok(bonus.field === '60' && bonus.rate === 60, `bonus 62 → the engine commits ${bonus.rate} and the field shows ${bonus.field}`);

    // ---- 자동 저장과 되살리기 ----
    await page.waitForTimeout(450);
    const before = await engineState(page);
    await page.reload();
    await page.waitForTimeout(300);
    const after = await engineState(page);
    ok(after.view === before.view && after.log === before.log, 'reload restores the plan from autosave (view and log identical)');
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('ArrowLeft');
    ok(await page.evaluate(() => window.OresimUI.engine().view().canRedo), 'the undo history survives the reload');
    await page.keyboard.press('ArrowRight');

    // ---- 공유 링크 왕복 ----
    await page.click('#share');
    await page.waitForTimeout(300);
    const link = await page.evaluate(() => navigator.clipboard.readText());
    const payload = decodeLink(link);
    const now = await engineState(page);
    ok(!!payload && payload.v === 1 && payload.log === now.log.split('\r').join('\n') && payload.b === now.b && payload.x === now.x, `링크 복사 puts the whole plan in the link (${link.length} chars)`);
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page2 = await newPage(ctx2);
    await page2.goto(link);
    await page2.waitForTimeout(400);
    const opened = await engineState(page2);
    ok(opened.log === now.log && opened.b === now.b && opened.x === now.x && (await page2.evaluate(() => location.hash)) === '', 'the link opens the same plan in a fresh browser and clears the hash');
    await ctx2.close();

    // ---- 지울 계획이 있는 탭에 다른 계획의 링크: 묻는 동안 주소창에 링크가 남아 새로 고쳐도 다시 묻고, 답하면 지워진다 ----
    const other = await page.evaluate(() => { const C = window.Oresim.createEngine(); C.setChar(4); for (let i = 0; i < 6; i++) { C.levelUp(); C.statUp(2); } return { v: 1, log: C.exportLog().split('\r').join('\n'), b: C.view().bonus.rate, x: C.view().xien.selected }; });
    const hashOf = (data) => '#p=' + zlib.deflateRawSync(Buffer.from(JSON.stringify(data))).toString('base64url');
    const asking = () => page.evaluate(() => ({ open: document.querySelector('#confirm').open, title: document.querySelector('#confirm-title').textContent, desc: document.querySelector('#confirm-desc').textContent, hash: location.hash }));
    const otherHash = hashOf(other);
    await page.evaluate((h) => { location.hash = h; }, otherHash);
    await page.waitForSelector('#confirm[open]', { timeout: 5000 });
    let q = await asking();
    ok(q.title === '링크의 계획을 열까요?' && q.hash === otherHash, 'a link over a plan with work asks, and the link stays in the address bar while asking');
    await page.reload();
    await page.waitForSelector('#confirm[open]', { timeout: 5000 });
    q = await asking();
    ok(q.title === '링크의 계획을 열까요?' && q.hash === otherHash, 'reloading during the question asks about the same link again');
    await page.waitForTimeout(400);
    await page.click('#confirm-cancel');
    await page.waitForFunction(() => !document.querySelector('#confirm').open);
    await page.waitForTimeout(100);
    const kept = await engineState(page);
    ok(kept.log === now.log && (await page.evaluate(() => location.hash)) === '', '저장된 계획 유지 keeps the plan and clears the link from the address bar');

    // ---- 손으로 만든 링크(Status 줄 둘, 음수 LV): 엔진이 몇 초씩 일하게 하는 글이라 읽지 않고 곧바로 거절한다 ----
    const status = (lv) => 'Status       : ' + [lv, 0, 50, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 9999, 1, 1, 1, 0, 1, 1, 1, 0].concat(Array(52).fill(0)).join(',');
    const maxLv = await page.evaluate(() => window.Oresim.CONST.MAX_LEVEL);   // 최고 레벨(표에서 읽는다)
    for (const [what, lines] of [['two Status lines', [status(1), `LV   1 - ${maxLv} : STAB`, status(1), `LV   1 - ${maxLv} : STAB`]], ['a Status line with LV -99999', [status(-99999), `LV -99999 - ${maxLv} : STAB`]]]) {
      const t0 = Date.now();
      await page.evaluate((h) => { location.hash = h; }, hashOf({ v: 1, log: lines.concat(`루시안/물리복합 Bonus: 0 / ${maxLv - 1} Point: 0`).join('\n'), b: 50, x: 0 }));
      await page.waitForSelector('#confirm[open]', { timeout: 5000 });
      const ms = Date.now() - t0;
      q = await asking();
      ok(q.title === '링크의 계획을 읽지 못했습니다' && /손상/.test(q.desc) && ms < 1500, `a crafted link with ${what} is refused at once (${ms} ms)`);
      await page.waitForTimeout(400);
      await page.click('#confirm-go');
      await page.waitForFunction(() => !document.querySelector('#confirm').open);
      await page.waitForTimeout(100);
    }
    ok((await engineState(page)).log === now.log && (await page.evaluate(() => location.hash)) === '', 'after the refused links the plan is unchanged and the address bar is clear');

    // ---- 붙여넣은 로그 왕복 ----
    const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page3 = await newPage(ctx3);
    await page3.goto(base + 'index.html');
    await page3.waitForTimeout(300);
    await page3.evaluate((t) => {
      const dt = new DataTransfer();
      dt.setData('text/plain', t);
      document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, now.log.split('\r').join('\r\n'));
    await page3.click('#load');
    await page3.waitForTimeout(300);
    const loaded = await engineState(page3);
    const msg = await page3.evaluate(() => document.querySelector('#load-msg').textContent.replace(/\u00a0/g, ' '));
    ok(loaded.log === now.log, `pasted log → 로그 불러오기 rebuilds the same plan ("${msg}")`);
    await ctx3.close();

    // ---- 앞 판(ENGINE_VERSION 이 다른 엔진)의 자동 저장: 엔진 상태로는 되살리지 못해 저장된 로그에서 다시 만들고 알린다.
    //      2026-11 에 이름이 바뀐 타입(루시안/베기 → 베기형)을 적은 기록은 첫 타입으로 읽었다고도 알리고, 기록은 계획을 바꿀 때까지 그대로 둔다.
    //      같은 로그를 담은 공유 링크도 열 때 첫 타입으로 읽었다고 알린다 ----
    const old = await page.evaluate(() => {
      const mk = (type, oldName) => {
        const C = window.Oresim.createEngine();
        if (type) C.setType(type);
        for (let i = 0; i < 5; i++) { C.levelUp(); C.statUp(0); }
        const v = C.view();
        const engine = JSON.parse(JSON.stringify(C.serialize()));
        engine.v = '1';                                                  // 앞 판의 엔진 상태
        const log = oldName ? C.exportLog().replace(`${v.charName}/${v.typeName} Bonus:`, `${v.charName}/${oldName} Bonus:`) : C.exportLog();
        const rec = { v: 1, engine, log, b: v.bonus.rate, x: v.xien.selected, savedAt: '2026-10-31T00:00:00.000Z' };
        const W = window.Oresim.createEngine();                         // 받는 쪽이 만들어야 할 계획
        W.importLog(log); W.setBonus(rec.b); W.setXien(rec.x);
        return { rec, want: W.exportLog(), first: W.view().typeName, version: window.Oresim.ENGINE_VERSION };
      };
      return { same: mk(0, null), renamed: mk(1, '베기') };
    });
    const bootWith = async (rec, url) => {
      const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      if (rec) await c.addInitScript((p) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('oresim:plan', p); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(rec));
      const p = await newPage(c);
      await p.goto(url || base + 'index.html');
      await p.waitForTimeout(600);
      return { c, p };
    };
    const seen = (p) => p.evaluate(() => {
      let rec = null;
      try { rec = JSON.parse(localStorage.getItem('oresim:plan')); } catch (_) { rec = null; }
      const n = document.querySelector('#notice');
      return { log: window.OresimUI.engine().exportLog(), notice: n.hidden ? '' : document.querySelector('#notice-text').textContent.replace(/\u2060/g, ''), rec };
    });
    const REBUILT = '저장된 계획을 재분배 로그에서 다시 만들었습니다.';
    const KEEP_UNDO = '되돌리기 기록은 이어지지 않습니다.';
    let b = await bootWith(old.same.rec);
    let s = await seen(b.p);
    ok(s.log === old.same.want && s.notice === `${REBUILT} ${KEEP_UNDO}` && s.rec && s.rec.engine && s.rec.engine.v === old.same.version,
      `an autosave from an older engine is rebuilt from its log, says so, and is saved again as engine '${s.rec && s.rec.engine && s.rec.engine.v}' ("${s.notice}")`);
    await b.c.close();
    const lostWords = `타입 이름을 알아보지 못해 첫 타입(${old.renamed.first})으로 읽었습니다.`;
    b = await bootWith(old.renamed.rec);
    s = await seen(b.p);
    const keptRec = !!s.rec && s.rec.log === old.renamed.rec.log && s.rec.engine && s.rec.engine.v === '1';
    await b.p.reload();
    await b.p.waitForTimeout(600);
    const again = await seen(b.p);
    await b.p.evaluate(() => document.activeElement && document.activeElement.blur());
    await b.p.keyboard.press('KeyL');
    await b.p.waitForTimeout(500);
    const changed = await seen(b.p);
    ok(s.log === old.renamed.want && s.notice === `${REBUILT} ${lostWords} ${KEEP_UNDO}` && keptRec && again.notice === s.notice
      && !!changed.rec && changed.rec.engine && changed.rec.engine.v === old.same.version && changed.rec.log === changed.log,
      `an older autosave naming a renamed type (루시안/베기) opens as the first type, says so ("${s.notice}"), and the old record stays until the plan changes`);
    await b.c.close();
    b = await bootWith(null, base + 'index.html' + hashOf({ v: 1, log: old.renamed.rec.log.split('\r').join('\n'), b: old.renamed.rec.b, x: old.renamed.rec.x }));
    s = await seen(b.p);
    ok(s.log === old.renamed.want && s.notice === `링크의 계획을 열었습니다. ${lostWords}`, `a link naming a renamed type opens as the first type and says so ("${s.notice}")`);
    await b.c.close();

    // ---- 상한이 285이던 판에서 스탯 편집으로 만든 계획(그 판의 재분배 로그 모양: Status 줄의 LV 최고 레벨+15, STAB 상한+25, DEX 상한+15,
    //      편집 레벨의 투자, 그 뒤 최고 레벨+30 까지): 엔진이 상한으로 읽는다(LV 와 스탯이 상한). 공유 링크는 새 브라우저에서 묻지 않고 열어
    //      그렇다고 알리고, 앞 판의 자동 저장은 로그에서 다시 만들어 알린 뒤 지금 판으로 곧 다시 저장한다 ----
    const capped = await page.evaluate(() => {
      const K = window.Oresim.CONST;
      const lv = K.MAX_LEVEL + 15, end = K.MAX_LEVEL + 30;
      const status = [lv, 10, 50, 0, 0, 0, K.MAX_STATUS[0] + 25, 120, 10, 60, 30, K.MAX_STATUS[5] + 15, 40, 240, 55, 900, 0, 300, 240, 55, 900, 0, 240, 55, 900, 0]
        .concat(Array.from({ length: 50 }, (_, x) => (x === 10 ? 1 : 0)), [50, 1]);
      const log = [`Status       : ${status.join(', ')}`, `LV ${lv}       : STAB * 3`, 'Bonus        : 75%', `LV ${lv + 1}       : DEX * 15, STAB * 2`, `LV ${lv + 2} - ${end} : `,
        '루시안/물리복합 Bonus: 11 / 15 Point: 181', `LV:${end} STAB ${K.MAX_STATUS[0] + 30} HACK 135 INT 10 DEF 71 MR 30 DEX ${K.MAX_STATUS[5] + 30} AGI 40`].join('\r');
      const W = window.Oresim.createEngine();                           // 받는 쪽이 만들어야 할 계획(링크: 로그, 보너스, 주력 계열)
      const r = W.importLog(log); W.setBonus(75); W.setXien(10);
      const engine = JSON.parse(JSON.stringify(window.Oresim.createEngine().serialize()));
      engine.v = '1';                                                    // 앞 판의 엔진 상태(되살리지 못한다)
      return { log, items: status.length, capped: r.capped, want: W.exportLog(), maxLv: K.MAX_LEVEL, caps: K.MAX_STATUS.slice(0, 7), version: window.Oresim.ENGINE_VERSION,
        rec: { v: 1, engine, log, b: 75, x: 10, savedAt: '2026-10-31T00:00:00.000Z' } };
    });
    const capWords = `LV나 스탯이 상한(${capped.maxLv})을 넘어 상한에 맞춰 읽었습니다.`;
    const inCaps = (p) => p.evaluate(([maxLv, caps]) => { const v = window.OresimUI.engine().view(); return { lv: v.lv, ok: v.lv === maxLv && v.stats.every((st, i) => st.value <= caps[i]), stats: v.stats.map((st) => st.value).join(',') }; }, [capped.maxLv, capped.caps]);
    b = await bootWith(null, base + 'index.html' + hashOf({ v: 1, log: capped.log.split('\r').join('\n'), b: 75, x: 10 }));
    s = await seen(b.p);
    let at = await inCaps(b.p);
    const quiet = await b.p.evaluate(() => ({ asked: document.querySelector('#confirm').open, hash: location.hash }));
    ok(capped.items === 78 && capped.capped === true && s.log === capped.want && at.ok && !quiet.asked && quiet.hash === '' && s.notice === `링크의 계획을 열었습니다. ${capWords}`,
      `an old link of a stat-edited plan above the cap opens without asking, at the cap (LV ${at.lv}, stats ${at.stats}), and says so ("${s.notice}")`);
    await b.c.close();
    b = await bootWith(capped.rec);
    s = await seen(b.p);
    at = await inCaps(b.p);
    const savedLv = s.rec && typeof s.rec.log === 'string' ? (s.rec.log.match(/^Status\s*:\s*(\d+),/) || [])[1] : null;
    ok(s.log === capped.want && at.ok && s.notice === `${REBUILT} ${capWords} ${KEEP_UNDO}` && !!s.rec && !!s.rec.engine && s.rec.engine.v === capped.version && s.rec.log === s.log && savedLv === String(capped.maxLv),
      `an older autosave above the cap is rebuilt at the cap (LV ${at.lv}), says so ("${s.notice}"), and is saved again as engine '${s.rec && s.rec.engine && s.rec.engine.v}' with Status LV ${savedLv}`);
    await b.c.close();

    // ---- 1440×900: LV 범위 줄이 있는 계획에서도 페이지는 화면 높이 그대로다(로그 표·가이드 안 화면 낭독기용 글이 그 칸을 기준으로 자리 잡는다) ----
    b = await bootWith(null);
    await b.p.evaluate(() => document.activeElement && document.activeElement.blur());
    for (let i = 0; i < 30; i++) { await b.p.keyboard.press('KeyL'); await b.p.keyboard.press('KeyS'); }
    for (let i = 0; i < 20; i++) { await b.p.keyboard.press('KeyL'); await b.p.keyboard.press('KeyX'); await b.p.keyboard.press('KeyH'); }
    await b.p.waitForTimeout(300);
    // ranges: 그 패널에 그린 LV 범위 줄(화면 낭독기용 '부터' 가 든 줄)의 수
    const height = (panel) => b.p.evaluate((sel) => ({ doc: document.documentElement.scrollHeight, inner: innerHeight, ranges: document.querySelectorAll(`${sel} tr.lv-row .lv-dash`).length }), panel);
    const inLog = await height('#log-table');
    await b.p.click('#tab-guide');
    await b.p.waitForFunction(() => { const g = document.querySelector('#guide'); return !g.dataset.stale && !!g.dataset.src; });
    await b.p.waitForTimeout(200);
    const inGuide = await height('#guide');
    ok(inLog.ranges > 0 && inGuide.ranges > 0 && inLog.doc === 900 && inLog.inner === 900 && inGuide.doc === 900,
      `1440×900 with LV range rows (log ${inLog.ranges}, guide ${inGuide.ranges}): the page stays ${inLog.doc} px in the log tab and ${inGuide.doc} px in the guide tab`);
    await b.c.close();

    // ---- 붙여넣은 로그의 안내(2026-11-04 사용자 결정): 글을 칸에 남긴 타입·상한 안내는 그 글을 고치는 동안 남고(지우기·다음 불러오기·칸 비우기에
    //      바뀐다), 다른 안내는 전처럼 고치면 지워진다. 1180px 아래에서는 불러온 뒤 안내가 위·아래 고정 바에 가리지 않게 보인다 ----
    const loadMsgText = (p) => p.evaluate(() => document.querySelector('#load-msg').textContent.replace(/⁠/g, ''));
    // 옛 판 로그 흉내: 지금 엔진으로 만든 계획(LV 41)의 캐릭터/타입 줄을 '루시안/베기'로(타입을 알아보지 못한다), 요약 줄의 STAB 을 상한 넘게(상한에 맞춰 읽는다)
    const oldLog = (p, opts) => p.evaluate((o) => {
      const C = window.Oresim.createEngine();
      for (let i = 0; i < 40; i++) { C.levelUp(); C.statUp(i % 7); C.statUp(0); }
      let log = C.exportLog();
      if (o.renamed) log = log.replace(/^(\S+)\/\S+ Bonus:/m, '$1/베기 Bonus:');
      if (o.over) log = log.replace(/^LV:(\d+) STAB \d+/m, `LV:$1 STAB ${window.Oresim.CONST.MAX_STATUS[0] + 45}`);
      if (o.footerless) log = log.split('\r').filter((l) => !/ Bonus:|^LV:/.test(l)).join('\r');
      return log.split('\r').join('\n');
    }, opts);
    {
      const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const p = await newPage(c);
      await p.goto(base + 'index.html');
      await p.waitForTimeout(300);
      const text = await oldLog(p, { renamed: true });
      await p.click('#load');                                     // 1440 에서는 접힌 칸을 연다
      await p.fill('#paste-text', text);
      await p.click('#load');
      await p.waitForTimeout(200);
      const first = await loadMsgText(p);
      await p.click('#paste-text');
      await p.keyboard.press('Control+End');
      await p.keyboard.type('x');                                 // 글을 고친다
      const typed = await loadMsgText(p);
      await p.click('#clear');
      const cleared = await loadMsgText(p);
      // 견줄 것: 캐릭터/타입 줄이 없는 글(처음부터 다시 읽음, 상한 안)의 안내는 고치면 지워진다(지우기가 접은 칸은 불러오기로 다시 연다)
      await p.click('#load');
      await p.fill('#paste-text', await oldLog(p, { footerless: true }));
      await p.click('#load');
      await p.waitForSelector('#confirm[open]');
      await p.click('#confirm-go');
      await p.waitForTimeout(500);
      const plain = await loadMsgText(p);
      await p.click('#paste-text');
      await p.keyboard.press('Control+End');
      await p.keyboard.type('x');
      const plainTyped = await loadMsgText(p);
      ok(/다른 타입이었다면 로그 끝의 캐릭터\/타입 줄을/.test(first) && typed === first && cleared === '' && /처음부터 읽었습니다\.$/.test(plain) && plainTyped === '',
        `the type-lost notice stays while the pasted text is edited and goes with 지우기; other notices still clear on edit ("${first.slice(0, 40)}…")`);
      await c.close();
    }
    for (const [w, hgt] of [[390, 844], [1024, 768]]) {
      const c = await browser.newContext({ viewport: { width: w, height: hgt } });
      const p = await newPage(c);
      await p.goto(base + 'index.html');
      await p.waitForTimeout(300);
      const text = await oldLog(p, { renamed: true, over: true });
      // 칸이 화면 밖에 있을 때(맨 위) P 로 불러온다
      await p.evaluate((t) => { const ta = document.querySelector('#paste-text'); ta.value = t; ta.dispatchEvent(new Event('input', { bubbles: true })); ta.blur(); window.scrollTo(0, 0); }, text);
      await p.keyboard.press('KeyP');
      await p.waitForFunction(() => document.querySelector('#load-msg').textContent.includes('상한에 맞춰 읽었습니다'));
      // 스크롤이 멈출 때까지 기다린다(부드러운 스크롤)
      let last = -1;
      for (let i = 0; i < 40; i++) { await p.waitForTimeout(100); const y = await p.evaluate(() => scrollY); if (y === last) break; last = y; }
      const at = await p.evaluate(() => {
        const m = document.querySelector('#load-msg').getBoundingClientRect();
        const top = document.querySelector('.topbar').getBoundingClientRect().bottom;
        const bar = document.querySelector('.actionbar');
        const bottom = getComputedStyle(bar).display === 'none' ? innerHeight : bar.getBoundingClientRect().top;
        return { top: Math.round(m.top), bottom: Math.round(m.bottom), min: Math.round(top), max: Math.round(bottom), y: Math.round(scrollY) };
      });
      ok(at.y > 0 && at.top >= at.min && at.bottom <= at.max,
        `${w}×${hgt}: after loading from the top of the page, the notice is brought into view between the bars (notice ${at.top}–${at.bottom}, view ${at.min}–${at.max}, scrolled to ${at.y})`);
      await c.close();
    }
    await ctx.close();
    ok(logs.length === 0, 'console clean' + (logs.length ? `: ${logs.join(' | ')}` : ''));
  } catch (e) {
    fails++;
    console.log(`FAIL ${e.stack || e}`);
  }
  await browser.close();
  srv.close();
  console.log(fails ? `web-smoke: ${fails} FAIL` : 'web-smoke: ALL PASS');
  process.exit(fails ? 1 : 0);
})();
