// 웹 화면 연기 시험(smoke test): web/ 을 내보내고 진짜 브라우저(Playwright의 Chromium)로 연다.
// 확인하는 것: 시작, 진짜 키와 클릭으로 한 몇 가지 조작, 화면의 숫자 = OresimUI.engine().view() (와 대시 이름표 =
// previewDash), 새로 고침 뒤 되살리기(되돌리기 기록까지), 공유 링크 왕복, 붙여넣은 로그 왕복, 깨끗한 콘솔.
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
    const msg = await page3.evaluate(() => document.querySelector('#load-msg').textContent.replace(/ /g, ' '));
    ok(loaded.log === now.log, `pasted log → 로그 불러오기 rebuilds the same plan ("${msg}")`);
    await ctx3.close();
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
