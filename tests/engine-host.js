/*
 * 시험이 함께 쓰는 엔진 도우미(의존성 없음, Node 22).
 *
 *   loadOresim()   public/js/const.js → public/js/engine.js 를 브라우저처럼 차례로 읽은 Oresim (Node vm).
 *                  ORESIM_ENGINE=경로 를 주면 그 엔진 파일을 쓴다(일부러 고장 낸 엔진을 시험이 잡는지 볼 때).
 *   stateS(E)      엔진의 내부 상태(_debugState)를 원래 Flash 판의 컨트롤 이름으로 읽게 하는 읽기 전용 사본.
 *                  S.lv.text, S.s0up.visible, S.charCB.selectedItem.label, S.xienCB.colors, S.xienList.source,
 *                  S.bonusNS.value, S._xi, S.log, S.stLog, S.logindex 와 표(S.CHAR_NAME 등). 엔진은 원본의 함수와
 *                  컨트롤 상태를 같은 이름으로 옮겼으므로(CLAUDE.md '아키텍처 핵심') 시험이 원본의 말로 상태를 본다.
 *                  만든 때의 사본이다(조작 뒤에는 다시 만든다).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.join(__dirname, '..');

function loadOresim(engineFile = process.env.ORESIM_ENGINE) {
  const ctx = { console };
  vm.createContext(ctx);
  const files = [path.join(REPO, 'public/js/const.js'), engineFile || path.join(REPO, 'public/js/engine.js')];
  for (const f of files) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  return ctx.Oresim;
}

// st: E._debugState() 의 결과(이미 있으면 넘긴다). C: Oresim.CONST
function stateS(E, C, st = E._debugState()) {
  const S = {};
  for (const id of Object.keys(st.text)) S[id] = { text: st.text[id] };
  for (let i = 0; i < 7; i++) {
    S[`s${i}up`] = { visible: st.up[i] };
    S[`s${i}dup`] = { visible: st.dup[i] };
  }
  S.charCB = { selectedIndex: st.char.index, selectedItem: st.char.item };
  S.styleCB = { selectedIndex: st.style.index, selectedItem: st.style.item };
  S.xienCB = { selectedIndex: st.xien.index, selectedItem: st.xien.item, colors: st.colors };
  S.xienList = { source: st.lists.xien };
  S.bonusNS = { value: st.bonus };
  Object.assign(S, st.g);   // _style, _needXien, _xi, _bonusPoints, logindex, tmpXien, tmpBonusExpected, tmpx, stackLog
  S.log = st.log;
  S.stLog = st.stLog;
  S.tmpStLog = st.tmpStLog;
  // 표(대문자 이름). 드롭다운의 처음 목록(charList, xienList 등)은 옮기지 않는다: 지금 목록은 위의 컨트롤에 있다
  for (const k of Object.keys(C)) if (/^[A-Z_]+$/.test(k)) S[k] = C[k];
  return S;
}

module.exports = { REPO, loadOresim, stateS };
