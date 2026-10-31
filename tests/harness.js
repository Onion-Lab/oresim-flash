/*
 * 기준(oracle): 원본 AS3(oresim/oresim-const.as + oresim/oresim-main.as)를 Node vm 에서 그대로 돌린다.
 * 원본 로직은 고치지 않는다. AS3 전용 문법(타입 표기 등)만 지우고, JS 로 돌릴 때 AS3/Flex 와 달라지는 곳만
 * 아래 "보정"으로 맞춘다. 보정은 모두 적용 횟수를 확인하므로 원본이 바뀌어 보정이 빠지면 바로 실패한다.
 *
 * AS3/Flex 의미 보정 (엔진 web/js/engine.js 도 같은 의미를 따른다)
 *  C1 NumericStepper: 코드로 넣은 value 는 다음 프레임 commitProperties 에서야 반올림(stepSize)·클램프된다.
 *     그 전에 읽으면 넣은 값 그대로다(Flex: get value() = valueChanged ? proposedValue : _value).
 *     maximum/minimum 을 바꾸면 다음 커밋에서 값을 다시 검사한다. 커밋할 때 NaN 은 0 으로 본다.
 *     사용자가 입력란에 친 값(takeValueFromTextField)은 그 자리에서 검사해 확정하고, 숫자가 아니면 무시한다.
 *     → 사용자 조작 1회가 끝날 때마다 commitFrame() 으로 다음 프레임을 흉내 낸다.
 *  C2 ComboBox(ComboBase): selectedIndex 는 int(ToInt32)이고, 목록 길이를 넘으면 마지막 항목으로 줄인다.
 *     selectedItem 은 그때 저장한 값이다(목록을 바꿔도 바로 다시 계산하지 않는다). 목록이 비면 -1, 첫 항목이
 *     들어오면 0 을 고른다. styleList 를 새 ArrayCollection 으로 바꾸면 데이터 바인딩으로 dataProvider 가 바뀐다.
 *     change 이벤트는 고른 번호가 바뀔 때만 난다(같은 항목을 다시 고르면 핸들러가 돌지 않는다).
 *  C3 ArrayCollection.getItemAt 는 범위를 벗어나면 RangeError, removeAll 은 RESET, addItem 은 ADD 이벤트를 낸다.
 *  C4 mx:Text/Label/TextArea 의 text: String 으로 바꾸고, null·undefined·""는 "" (Label.text setter: if (!value) value = "").
 *  C5 AS3 RegExp 의 \s 는 JS 의 \s 와 다르다. avmplus(Tamarin)의 PCRE 는 \s 를 문자표(0~255: \t \n \f \r 공백 U+00A0.
 *     \v 는 아님, pcre_chartables.cpp)와 isUnicodeWhiteSpace(256 이상: U+200B, U+2060, U+3000, U+FEFF, pcre_config.cpp)로
 *     판정한다(pcre_exec.cpp 의 OP_WHITESPACE). logLoad 의 Xien 줄 다듬기 /^\s+|\s+$/g 를 그 문자 집합 AS3_WS 로 바꾼다.
 *     (JS 의 \s 는 \v·U+1680·U+2000~U+200A·U+2028·U+2029·U+202F·U+205F 도 맞추고 U+200B·U+2060 은 맞추지 않는다)
 *  C6 타입 있는 변수의 기본값·형 변환: var x:Number; / = undefined → NaN. String 형 변수에 넣는 값은 String 으로
 *     (undefined → null), Number 형 변수·전역에 배열에서 읽은 값을 넣을 때는 Number 로 바꾼다. String 형 매개변수
 *     (replaceText 의 str)도 같다. 지금 데이터에서 결과가 달라지는 곳은 없지만 의미를 맞춰 둔다.
 *  C7 (x as Text): Text 가 아니면 null 이 되고 .text 에서 TypeError 가 난다(JS 는 undefined 를 돌려줄 뿐이다).
 *  C8 처리되지 않은 예외: Flash 는 그 이벤트 핸들러만 멈추고 거기까지 바뀐 상태는 남는다 → act() 가 잡는다.
 *  C9 callLater 는 바로 실행한다(스크롤 위치만 바꾸므로 상태와 무관하다).
 *  C10 전역 parseInt 는 AS3 의 것(avmplus Toplevel::parseInt → MathUtils::parseInt(s, 0, false))으로 바꾼다(as3ParseInt).
 *     JS 와 앞 공백 집합이 다르고(' ' \t \n \v \f \r U+2000~U+200B U+2028 U+2029 U+205F U+3000 만 건너뛴다. U+00A0·U+FEFF·
 *     U+1680·U+202F 는 건너뛰지 않는다), 수를 자릿수마다 result * radix + v 로 쌓는다(10진수는 보정 없음, 16진수는 2^53 이상에서
 *     MathUtils.cpp 의 반올림 보정). 원본 코드의 parseInt 는 모두 이것을 부른다(실행 컨텍스트의 parseInt).
 *  C1~C4 는 Apache Flex SDK 4.16.1 의 mx 소스(NumericStepper, ComboBase/ComboBox, ListCollectionView/ArrayList,
 *  Label, TextArea)를 읽고 맞췄다. 원본은 Flex SDK 3.6A 로 빌드했는데 그 소스는 대조하지 못했다(mx 는 거의 그대로 이어졌다).
 *  C5, C10 은 avmplus(Tamarin, Flash Player 의 AVM2 를 공개한 소스)의 pcre_*.cpp, MathUtils.cpp, Toplevel.cpp 를 읽고 맞췄다.
 *
 * 내보내는 것
 *  createSim(root)    원본 실행 컨텍스트(전역 = 원본의 전역·컨트롤) + commitFrame()
 *  createOracle(root) 엔진과 같은 이름의 API(levelUp, statUp, …)를 원본 핸들러로 수행하는 어댑터.
 *                     결과값의 모양(ok/sound, importLog 의 footer 등)은 엔진과 같은 계약 해석을 따른다.
 *  rawState(S)        비교용 상태(엔진의 _debugState() 와 같은 모양)
 *  as3ParseInt, AS3_WS  C10 의 parseInt, C5 의 \s 문자 집합(테스트에서 엔진 것과 맞춰 본다)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.join(__dirname, '..');

// ---- AS3 형 변환 도우미 (원본 코드 안에서 __coerce_s 등으로 부른다) ----
const coerceS = (v) => (v === undefined || v === null ? null : String(v));   // coerce_s: undefined/null → null
const asText = (v) => { const s = coerceS(v); return s ? s : ''; };             // Label.text setter

// C5 AS3 RegExp 의 \s 가 맞추는 문자(정규식 문자 집합 안에 넣는 원본 그대로의 글자: \t \n \f \r 공백 U+00A0 U+200B U+2060 U+3000 U+FEFF)
const AS3_WS = '\\t\\n\\f\\r \\u00a0\\u200b\\u2060\\u3000\\ufeff';

// C10 AS3 의 전역 parseInt(s:String = "NaN", radix:int = 0). avmplus MathUtils::parseInt(inStr, radix, strict=false) 를 옮겼다.
// 원본은 radix 를 주지 않으므로 radix 0(0x 로 시작하면 16, 아니면 10)만 쓴다.
function as3ParseInt(arg) {
  const str = arg === undefined || arg === null ? 'null' : String(arg);   // coerce_s 뒤 Toplevel: if (!in) in = core->knull
  const len = str.length;
  const at = (k) => str.charCodeAt(k);                                     // 범위 밖은 NaN (아래에서 숫자가 아님으로 처리)
  const parseIntDigit = (ch) => {
    if (ch >= 0x30 && ch <= 0x39) return ch - 0x30;
    if (ch >= 0x61 && ch <= 0x7a) return ch - 0x61 + 10;
    if (ch >= 0x41 && ch <= 0x5a) return ch - 0x41 + 10;
    return -1;
  };
  const skipSpaces = (index) => {
    while (index < len) {
      const ch = at(index);
      if (!(ch === 0x20 || ch === 0x09 || ch === 0x0d || ch === 0x0a || ch === 0x0c || ch === 0x0b
          || (ch >= 0x2000 && ch <= 0x200b) || ch === 0x2028 || ch === 0x2029 || ch === 0x205f || ch === 0x3000)) break;
      index++;
    }
    return index;
  };
  let radix = 0;
  let gotDigits = false;
  let result = 0;
  let index = skipSpaces(0);
  let negate = false;                                                      // handleSign
  if (index < len) {
    if (at(index) === 0x2b) index++;
    else if (at(index) === 0x2d) { negate = true; index++; }
  }
  const isHex = len - index >= 2 && at(index) === 0x30 && (at(index + 1) === 0x78 || at(index + 1) === 0x58);
  if (isHex && (radix === 16 || radix === 0)) { index += 2; if (radix === 0) radix = 16; }
  else if (radix === 0) radix = 10;
  if (radix >= 2 && radix <= 36 && index < len) {
    result = 0;
    const start = index;
    while (index < len) {
      const v = parseIntDigit(at(index));
      if (v === -1 || v >= radix) break;
      result = result * radix + v;
      gotDigits = true;
      index++;
    }
    if (result >= 0x20000000000000 && (radix === 2 || radix === 4 || radix === 8 || radix === 16 || radix === 32)) {
      // 2^53 이상: 거듭제곱 진법은 반올림 오차를 다시 계산한다(여기서는 16 만 생긴다)
      result = 0;
      let powOf2 = 1;
      for (let x = radix; x !== 1; x >>= 1) powOf2++;
      powOf2--;
      index = start;
      let v = 0;
      let end, next;
      for (end = index; end < len && at(end) === 0x30; end++);
      if (end >= len) return 0;
      for (next = 0; next * powOf2 <= 52; next++) {
        v = parseIntDigit(at(end++));
        if (v === -1 || v >= radix) { v = 0; break; }
        result = result * radix + v;
        if (end >= len) break;
      }
      if (next * powOf2 > 52) {
        let roundUp = false, bit53 = 0, bit54 = 0, factor = 1;
        if (radix === 16) {
          bit53 = v & (1 << 0);
          v = parseIntDigit(at(end));
          if (v !== -1 && v < radix) {
            factor *= radix;
            bit54 = v & (1 << 3);
            roundUp = (v & 0x3) !== 0;
          } else {
            roundUp = bit53 !== 0;
          }
        } else {
          throw new Error('as3ParseInt: radix ' + radix + ' is not used by the original');
        }
        bit53 = bit53 ? 1 : 0;
        bit54 = bit54 ? 1 : 0;
        while (++end < len) {
          v = parseIntDigit(at(end));
          if (v === -1 || v >= radix) break;
          roundUp = roundUp || (v !== 0);
          factor *= radix;
        }
        roundUp = !!bit54 && (!!bit53 || roundUp);
        result += roundUp ? 1.0 : 0.0;
        result *= factor;
      }
    }
    if (negate) result = -result;
  }
  return gotDigits ? result : NaN;
}

// ---- 원본 소스 → JS ----
function replaceCounted(src, pattern, replacement, expected, what, strict) {
  let n = 0;
  const out = src.replace(pattern, (...m) => { n++; return typeof replacement === 'function' ? replacement(...m) : replacement.replace(/\$(\d)/g, (_, d) => m[+d]); });
  if (strict && n !== expected) throw new Error(`harness 보정 "${what}": ${expected}번이어야 하는데 ${n}번 적용됐다 (원본이 바뀌었나?)`);
  return out;
}

function stripTypes(src) {
  return src
    .replace(/^\s*import\s+[^;]+;/gm, '')
    .replace(/\[Bindable\]/g, '')
    .replace(/\[Embed\([^)]*\)\]/g, '')
    .replace(/\b(public|private)\s+(var|function)\b/g, '$2')
    .replace(/\)\s*:\s*(void|String|Number|Boolean)\b/g, ')')
    .replace(/:\s*(Number|Array|String|Boolean|Object|ArrayCollection|SharedObject|SoundTransform|Stage|KeyboardEvent|Error|Text|void)\b/g, '');
}

// oresim-main.as 에 넣는 보정. 타입 표기를 지우기 전에 적용한다(타입을 보고 고르므로).
function correctMain(src, strict) {
  const R = (p, r, n, w) => { src = replaceCounted(src, p, r, n, w, strict); };
  // C6 기본값: var l:Number; / , v:Number; / :Number = undefined
  R(/\bvar\s+(\w+)\s*:\s*Number\s*;/g, 'var $1 = NaN;', 1, 'var x:Number; → NaN');
  R(/,\s*(\w+)\s*:\s*Number\s*;/g, ', $1 = NaN;', 1, ', x:Number; → NaN');
  R(/:\s*Number\s*=\s*undefined\b/g, ' = NaN', 2, ':Number = undefined → NaN');
  // C6 String 형 변수에 배열 값: tmp1/tmp2 (dashBack, dashProgress), pattern, num
  R(/(tmp[12])\s*:\s*String\s*=\s*(log\[[^\]]+\]\[[12]\])/g, '$1 = __coerce_s($2)', 4, 'tmpN:String = log[..][..]');
  R(/\bpattern\s*=\s*(sl\[[^\]]+\]);/g, 'pattern = __coerce_s($1);', 2, 'pattern = sl[..]');
  R(/\bnum\s*=\s*(tag\.split\(" "\)\[[13]\]|token3\[3\]);/g, 'num = __coerce_s($1);', 3, 'num = ...');
  // C6 Number 형 변수·전역에 배열에서 읽은 값
  R(/var max\s*:\s*Number\s*=\s*(_xi\[xien\]);/g, 'var max = __num($1);', 1, 'var max:Number = _xi[xien]');
  R(/\bmin\s*=\s*(l\[0\]\[0\]);/g, 'min = __num($1);', 2, 'min = l[0][0]');
  R(/var min\s*:\s*Number\s*=\s*(l\[0\]\[0\]);/g, 'var min = __num($1);', 1, 'var min:Number = l[0][0]');
  R(/var len\s*:\s*Number\s*=\s*(xienList\.getItemAt\(xi\)\.data);/g, 'var len = __num($1);', 1, 'var len:Number = ...data');
  R(/\b(_bonusPoints|tmpBonusExpected)\s*=\s*(l\[\d+\]);/g, '$1 = __num($2);', 2, '_bonusPoints/tmpBonusExpected = l[..]');
  // C6 String 형 매개변수
  R(/(function replaceText\(str:String,oldChar:String,newChar:String\):String\s*\{)/g, '$1 str = __coerce_s(str);', 1, 'replaceText(str:String)');
  // C7 (x as Text)
  R(/\((\w+\[\w+\]) as Text\)/g, '__asText($1)', 21, '(x as Text)');
  // C5 AS3 의 \s
  R(/\/\^\\s\+\|\\s\+\$\/g/g, () => `/^[${AS3_WS}]+|[${AS3_WS}]+$/g`, 1, 'Xien 줄 \\s');
  return stripTypes(src);
}

// ---- Flex 컨트롤 흉내 ----

// C3 mx.collections.ArrayCollection (정렬·필터 없음)
class ArrayCollection {
  constructor(src) { this.source = src ? src.slice() : []; this.listeners = []; }
  get length() { return this.source.length; }
  getItemAt(index) {
    index |= 0;
    if (index < 0 || index >= this.source.length) throw new RangeError(`Index '${index}' specified is out of bounds.`);
    return this.source[index];
  }
  addItem(item) { const location = this.source.length; this.source.push(item); this.emit({ kind: 'add', location }); }
  removeAll() { if (this.source.length > 0) { this.source.splice(0, this.source.length); this.emit({ kind: 'reset' }); } }
  emit(ev) { for (const l of this.listeners.slice()) l.collectionChange(this, ev); }
}

// C4 mx:Text / mx:Label / mx:TextArea
function TextCtl(initial) {
  let v = asText(initial);
  return {
    __isText: true,
    get text() { return v; },
    set text(x) { v = asText(x); },
    visible: true, enabled: true, data: undefined,
    verticalScrollPosition: 0, maxVerticalScrollPosition: 0,
    setFocus() {},
  };
}

// C1 mx:NumericStepper
class NumericStepper {
  constructor(min, max, step) {
    this._minimum = min; this._maximum = max; this._stepSize = step;
    this._value = 0; this.proposedValue = 0; this.valueChanged = false;
  }
  get value() { return this.valueChanged ? this.proposedValue : this._value; }
  set value(v) { this.proposedValue = Number(v); this.valueChanged = true; }
  get maximum() { return this._maximum; }
  set maximum(v) { this._maximum = Number(v); if (!this.valueChanged) this.value = this.value; }
  get minimum() { return this._minimum; }
  set minimum(v) { this._minimum = Number(v); if (!this.valueChanged) this.value = this.value; }
  get stepSize() { return this._stepSize; }
  set stepSize(v) { this._stepSize = Number(v); if (!this.valueChanged) this.value = this.value; }
  checkValidValue(value) {
    if (isNaN(value)) return this.value;
    let closest = this._stepSize * Math.round(value / this._stepSize);
    const parts = String(1 + this._stepSize).split('.');
    if (parts.length === 2) { const scale = Math.pow(10, parts[1].length); closest = Math.round(closest * scale) / scale; }
    if (closest > this._maximum) return this._maximum;
    if (closest < this._minimum) return this._minimum;
    return closest;
  }
  setValue(value) { const v = this.checkValidValue(value); if (v == this._value) return; this._value = v; }   // eslint-disable-line eqeqeq
  commitProperties() {
    if (this.valueChanged) { this.valueChanged = false; this.setValue(isNaN(this.proposedValue) ? 0 : this.proposedValue); }
  }
  // 사용자가 입력란에 친 값 (takeValueFromTextField)
  userInput(x) {
    const text = typeof x === 'string' ? x : String(x);
    const inputValue = Number(text);
    const lastField = String(this._value);
    if ((inputValue != this._value && (Math.abs(inputValue - this._value) >= 0.000001 || isNaN(inputValue)))   // eslint-disable-line eqeqeq
        || text === '' || (text && text.length !== lastField.length)) {
      this.setValue(this.checkValidValue(Number(text)));
    }
  }
}

// C2 mx:ComboBox (ComboBase + ComboBox 의 선택 처리, prompt 없음, 편집 불가)
class ComboBox {
  constructor() {
    this._selectedIndex = -1; this._selectedItem = null; this.collection = null;
    this.selectedIndexChanged = false; this.colors = undefined;
    this.dropdown = { setFocus() {} };
  }
  set dataProvider(coll) {   // ComboBox.dataProvider → ComboBase.dataProvider: 새 목록 + RESET
    this.collection = coll;
    coll.listeners.push(this);
    this.collectionChange(coll, { kind: 'reset' });
  }
  get dataProvider() { return this.collection; }
  collectionChange(coll, ev) {
    if (coll !== this.collection) return;   // 예전 목록은 다시 바뀌지 않는다
    // ComboBase.collectionChangeHandler
    if (ev.kind === 'add' && this._selectedIndex >= ev.location) this._selectedIndex++;
    // ComboBox.collectionChangeHandler
    if (this.collection.length === 0) {
      if (!this.selectedIndexChanged && this._selectedIndex !== -1) this.baseSetIndex(-1);
    } else if (ev.kind === 'add') {
      if (this.collection.length === 1 && this._selectedIndex === -1) this.selectedIndex = 0;
    } else if (ev.kind === 'reset') {
      if (!this.selectedIndexChanged) this.selectedIndex = 0;
    }
  }
  baseSetIndex(value) {   // ComboBase.selectedIndex setter
    value |= 0;
    this._selectedIndex = value;
    if (value === -1) this._selectedItem = null;
    if (!this.collection || this.collection.length === 0) { this.selectedIndexChanged = true; return; }
    if (value !== -1) {
      value = Math.min(value, this.collection.length - 1);
      this._selectedIndex = value;
      this._selectedItem = value < 0 ? null : this.collection.source[value];
    }
  }
  get selectedIndex() { return this._selectedIndex; }
  set selectedIndex(v) { this.baseSetIndex(v); }
  get selectedItem() { return this._selectedItem; }
  commitProperties() { if (this.selectedIndexChanged) { this.selectedIndexChanged = false; this.selectedIndex = this._selectedIndex; } }
  setStyle(name, v) { if (name === 'alternatingItemColors') this.colors = Array.from(v); }
}

// oresim.mxml 의 NumericStepper 정의 (id → {minimum, maximum, stepSize, value})
function readSteppers(root) {
  const mxml = fs.readFileSync(path.join(root, 'oresim.mxml'), 'utf8');
  const out = {};
  for (const tag of mxml.match(/<mx:NumericStepper\b[^>]*>/g)) {
    const a = Object.fromEntries([...tag.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
    out[a.id] = { minimum: +a.minimum, maximum: +a.maximum, stepSize: +a.stepSize, value: +a.value };
  }
  return out;
}

const TEXT_IDS = ['lv', 's0', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's11',
  's0L', 's1L', 's2L', 's3L', 's4L', 's5L', 's6L', 'p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6',
  's7mi', 's7mx', 's8mi', 's8mx', 's9mi', 's9mx', 'tbonus', 'tlvup', 'pbonus'];

function createSim(root = REPO, opts = {}) {
  const strict = opts.strict !== undefined ? opts.strict : path.resolve(root) === path.resolve(REPO);
  const sounds = [];
  const ctx = {
    Math, String, Number, isNaN, Array, Error, RangeError, TypeError, Object, console,
    parseInt: as3ParseInt,   // C10
    ArrayCollection,
    __coerce_s: coerceS,
    __num: (v) => Number(v),
    __asText: (v) => (v && v.__isText ? v : null),
    // Flash/Flex 런타임 스텁
    SharedObject: { getLocal: () => ({ data: {} }) },
    SoundTransform: function SoundTransform() { this.volume = 1; },
    StageScaleMode: { SHOW_ALL: 'showAll' },
    Event: { DEACTIVATE: 'deactivate' },
    KeyboardEvent: { KEY_UP: 'keyUp', KEY_DOWN: 'keyDown' },
    ExternalInterface: { available: false, call() { return undefined; } },
    System: { setClipboard() {} },
    callLater: (fn) => fn(),   // C9
    application: { setFocus() {}, addEventListener() {}, parent: { stage: null } },
  };
  ctx.__sounds = sounds;
  ctx.lvupSe = { startDelay: 0, startTime: 0, sound: { play() { sounds.push('lvup'); } } };
  ctx.stupSe = { startDelay: 0, startTime: 0, sound: { play() { sounds.push('stup'); } } };
  ctx.charImg = { source: '' };
  ctx.logarea = TextCtl('');
  for (const id of TEXT_IDS) ctx[id] = TextCtl('0');
  for (let i = 0; i <= 6; i++) { ctx[`s${i}up`] = TextCtl(''); ctx[`s${i}dup`] = TextCtl(''); }
  ctx.pasteB = TextCtl('');
  ctx.volume = { value: 50 };
  ctx.w = { visible: false, x: 0, y: 0 };
  const steppers = readSteppers(root);
  ctx.__steppers = Object.keys(steppers);
  for (const [id, d] of Object.entries(steppers)) {
    const st = new NumericStepper(d.minimum, d.maximum, d.stepSize);
    st.value = d.value;   // MXML 의 value 는 생성 시 커밋된다(아래 commitFrame)
    ctx[id] = st;
  }
  // 콤보박스와 데이터 바인딩 (dataProvider="{charList}" 등)
  const combos = { charList: new ComboBox(), styleList: new ComboBox(), xienList: new ComboBox() };
  ctx.charCB = combos.charList; ctx.styleCB = combos.styleList; ctx.xienCB = combos.xienList;
  for (const name of Object.keys(combos)) {
    let store;
    Object.defineProperty(ctx, name, {
      enumerable: true, configurable: true,
      get() { return store; },
      set(v) { store = v; combos[name].dataProvider = v; },
    });
  }
  vm.createContext(ctx);
  const constSrc = stripTypes(fs.readFileSync(path.join(root, 'oresim', 'oresim-const.as'), 'utf8'));
  vm.runInContext(constSrc, ctx, { filename: 'oresim-const.as' });
  vm.runInContext(correctMain(fs.readFileSync(path.join(root, 'oresim', 'oresim-main.as'), 'utf8'), strict), ctx, { filename: 'oresim-main.as' });

  // 다음 프레임: 스테퍼·콤보박스의 commitProperties
  ctx.commitFrame = () => {
    for (const id of ctx.__steppers) ctx[id].commitProperties();
    for (const cb of Object.values(combos)) cb.commitProperties();
  };
  ctx.commitFrame();   // 생성 직후 검증 패스
  if (opts.init === false) return ctx;   // 표만 보고 싶을 때(tests/const-check.js): initApp 전 상태
  ctx.initApp({});     // creationComplete
  ctx.commitFrame();
  return ctx;
}

// ---- 엔진과 같은 API 를 원본 핸들러로 수행하는 어댑터 ----

function normalizePaste(text) {
  const s = text === undefined || text === null ? '' : String(text);
  return s.split('\r\n').join('\r').split('\n').join('\r');
}

function createOracle(root = REPO, opts) {
  const S = createSim(root, opts);
  let lastError = null;
  // C8: 핸들러 1회. 예외는 Flash 처럼 삼키고 다음 프레임을 커밋한다
  const act = (fn) => {
    S.__sounds.length = 0;
    let error = false;
    try { fn(); } catch (e) { error = true; lastError = e; }
    S._shiftKeyDown = false;
    S.commitFrame();
    return error;
  };
  const withError = (r, error) => { if (error) r.error = true; return r; };
  const plain = (ok) => ({ ok, sound: null });
  // 원본이 낸 효과음(마지막 것). 계약: 받아들이지 않은 조작(ok: false)은 소리 없음
  const result = (ok, error) => withError({ ok, sound: ok && S.__sounds.length ? S.__sounds[S.__sounds.length - 1] : null }, error);
  const isStat = (i) => Number.isInteger(i) && i >= 0 && i <= 6;
  const n = (id) => as3ParseInt(S[id].text);   // 원본처럼 parseInt(x.text)

  const api = {
    S,
    get lastError() { return lastError; },
    levelUp() {
      let ok = false;
      const error = act(() => { ok = n('lv') < S.MAX_LEVEL; S._shiftKeyDown = false; S.lvupPress(); });
      return result(ok, error);
    },
    statUp(i) {
      if (!isStat(i)) return plain(false);
      let ok = false;
      const error = act(() => { ok = n(`s${i}`) < S.MAX_STATUS[i] && n('s11') >= n(`p${i}`); S._shiftKeyDown = false; S.stupPress(i); });
      return result(ok, error);
    },
    dash(i) {
      if (!isStat(i)) return plain(false);
      let ok = false;
      const error = act(() => {
        // stdupPress 가 받아들이고(스탯 < 상한) stdup() 의 첫 반복이 도는(무언가 바뀌는) 경우만 ok.
        // 최고 레벨에서 포인트가 모자라면 원본은 효과음만 내고 아무것도 바꾸지 않는다 → ok: false, 소리 없음(계약 해석)
        const lv = n('lv'), st = n(`s${i}`), p = Math.floor((lv + st * 5) / 125);
        ok = st < S.MAX_STATUS[i] && p === p && (lv < S.MAX_LEVEL || n('s11') >= n(`p${i}`));
        S.stdupPress(i);
      });
      return result(ok, error);
    },
    undo(byLevel = false) {
      let ok = false;
      const error = act(() => { ok = byLevel ? !(S.logindex < 1) : S.logindex > 0; S._shiftKeyDown = !!byLevel; S.backPress(); });
      return result(ok, error);
    },
    redo(byLevel = false) {
      let ok = false;
      const error = act(() => {
        ok = byLevel ? !(S.log[S.logindex + 1][0] < 1) : S.log[S.logindex + 1][0] > 0;
        S._shiftKeyDown = !!byLevel; S.progressPress();
      });
      return result(ok, error);
    },
    // 보너스% 입력란: ok 는 스테퍼가 받아들였는지(수가 아니면 무시), rate 는 확정된 값
    setBonus(rate) {
      let ok = false;
      const error = act(() => { ok = !isNaN(Number(typeof rate === 'string' ? rate : String(rate))); S.bonusNS.userInput(rate); });
      const r = withError(plain(ok), error);
      r.rate = S.bonusNS.value;
      return r;
    },
    setXien(x) {
      const idx = S.xienList.source.findIndex((it) => it.data === x);
      if (idx < 0) return plain(false);
      const error = act(() => {
        S.openDrop();   // 드롭다운을 연다
        if (idx !== S.xienCB.selectedIndex) {   // 같은 항목이면 change 이벤트가 없다
          S.xienCB.selectedIndex = idx;
          S.changeXien(S.xienCB.selectedItem.data);
        }
      });
      const r = withError(plain(false), error);
      r.ok = !!(S.xienCB.selectedItem && S.xienCB.selectedItem.data === x);
      return r;
    },
    setChar(c) {
      if (!(Number.isInteger(c) && c >= 0 && c < S.CHAR_NAME.length) || c === S.charCB.selectedIndex) return plain(false);
      return withError(plain(true), act(() => { S.charCB.selectedIndex = c; S.changeChar(S.charCB.selectedIndex); }));
    },
    setType(s) {
      if (!(Number.isInteger(s) && s >= 0 && s < S.styleList.length) || s === S.styleCB.selectedIndex) return plain(false);
      return withError(plain(true), act(() => { S.styleCB.selectedIndex = s; S.changeStyle(S.styleCB.selectedIndex); }));
    },
    reset() { return withError(plain(true), act(() => { S.resetPress(); })); },
    // 글만 만드는 조회: logOut()/recipe() 를 돌려 글을 받고 로그 상자(logarea)는 원래대로 둔다
    exportLog() {
      const pane = S.logarea.text;
      act(() => { S.logOut(); });
      const text = S.logarea.text;
      S.logarea.text = pane;
      return text;
    },
    logPane() { return S.logarea.text; },
    importLog(text) {
      const s = normalizePaste(text);
      const before = JSON.stringify(rawState(S, { logText: false }));
      // logLoad 안에서만: changeChar = 캐릭터/타입 줄을 알아봄, changeStyle = 타입까지, reset = 푸터 없는 로그를 처음부터
      const flags = { footer: false, typeFound: false, restarted: false };
      const orig = { changeChar: S.changeChar, changeStyle: S.changeStyle, reset: S.reset };
      S.changeChar = function (c) { flags.footer = true; return orig.changeChar(c); };
      S.changeStyle = function (st) { flags.typeFound = true; return orig.changeStyle(st); };
      S.reset = function () { flags.restarted = true; return orig.reset(); };
      let error;
      try {
        error = act(() => { S.logarea.text = s; S.logLoadPress(); });
      } finally { S.changeChar = orig.changeChar; S.changeStyle = orig.changeStyle; S.reset = orig.reset; }
      const ok = flags.footer || flags.restarted || JSON.stringify(rawState(S, { logText: false })) !== before;
      return withError({ ok, sound: null, footer: flags.footer, typeFound: flags.typeFound, restarted: flags.restarted }, error);
    },
    guide() {
      const pane = S.logarea.text;
      let text = '';
      act(() => { if (S.logindex > 0) { S.recipe(); text = S.logarea.text; } });
      S.logarea.text = pane;
      return text;
    },
    editOpen() { act(() => { S.statusEdit(); }); return editState(S); },
    editCommit(values) {
      values = values || {};
      act(() => { S.statusEdit(); });
      let ok = false;
      const error = act(() => {
        const inp = (id, v) => { if (v !== undefined) S[id].userInput(v); };
        inp('slv', values.lv);
        const st = values.stats || [];
        for (let i = 0; i < 7; i++) inp(`ss${i}`, st[i]);
        inp('ss7', values.hp); inp('ss8', values.mp); inp('ss9', values.sp); inp('ss11', values.point);
        for (const ln of values.lines || []) {
          if (!ln || ln.value === undefined) continue;
          for (let k = 0; k < S.xienList.length; k++) {
            if (S.xienList.getItemAt(k).data === Number(ln.x)) S.sxiList.getItemAt(k).xienData = typeof ln.value === 'string' ? ln.value : String(ln.value);
          }
        }
        S.commitStatusEditPress();
        ok = true;
      });
      return withError(plain(ok), error);
    },
  };
  return api;
}

// 스탯 편집 창의 값 (엔진 editOpen() 과 같은 모양)
function editState(S) {
  const v = (id) => S[id].value;
  const lim = (id) => [S[id].minimum, S[id].maximum, S[id].stepSize];
  return {
    lv: v('slv'), stats: [0, 1, 2, 3, 4, 5, 6].map((i) => v(`ss${i}`)), hp: v('ss7'), mp: v('ss8'), sp: v('ss9'), point: v('ss11'),
    lines: S.sxiList.source.map((it, k) => ({ x: S.xienList.source[k] ? S.xienList.source[k].data : undefined, name: it.xienLabel, value: it.xienData })),
    limits: { lv: lim('slv'), stats: [0, 1, 2, 3, 4, 5, 6].map((i) => lim(`ss${i}`)), hp: lim('ss7'), mp: lim('ss8'), sp: lim('ss9'), point: lim('ss11') },
  };
}

// ---- 비교용 상태 (엔진 _debugState() 와 같은 모양) ----

// 희소 배열을 그대로 복사한다(빈 칸·인덱스가 아닌 키·length 유지). deep: 원소 배열도 복사
function sparseCopy(a, deep) {
  if (!Array.isArray(a)) return a;
  const out = new Array(a.length);
  for (const k of Object.keys(a)) out[k] = deep && Array.isArray(a[k]) ? a[k].slice() : a[k];   // slice 도 빈 칸을 유지한다
  return out;
}
const itemOut = (it) => (it ? { label: it.label, data: it.data } : null);

function rawState(S, opts = {}) {
  const text = {};
  for (const id of TEXT_IDS) text[id] = S[id].text;
  const out = {
    text,
    up: [0, 1, 2, 3, 4, 5, 6].map((i) => S[`s${i}up`].visible),
    dup: [0, 1, 2, 3, 4, 5, 6].map((i) => S[`s${i}dup`].visible),
    char: { index: S.charCB.selectedIndex, item: itemOut(S.charCB.selectedItem) },
    style: { index: S.styleCB.selectedIndex, item: itemOut(S.styleCB.selectedItem) },
    xien: { index: S.xienCB.selectedIndex, item: itemOut(S.xienCB.selectedItem) },
    lists: {
      char: S.charList.source.map(itemOut),
      style: S.styleList.source.map(itemOut),
      xien: S.xienList.source.map(itemOut),
    },
    colors: S.xienCB.colors ? S.xienCB.colors.slice() : null,
    bonus: S.bonusNS.value,
    g: {
      _style: sparseCopy(S._style), _needXien: sparseCopy(S._needXien), _xi: sparseCopy(S._xi),
      _bonusPoints: S._bonusPoints, logindex: S.logindex, tmpXien: S.tmpXien,
      tmpBonusExpected: S.tmpBonusExpected, tmpx: S.tmpx, stackLog: S.stackLog,
    },
    log: sparseCopy(S.log, true),
    stLog: sparseCopy(S.stLog),
    tmpStLog: sparseCopy(S.tmpStLog),
  };
  if (opts.logText !== false) out.logText = S.logarea.text;
  return out;
}

module.exports = { REPO, createSim, createOracle, rawState, editState, sparseCopy, TEXT_IDS, normalizePaste, correctMain, stripTypes, as3ParseInt, AS3_WS };
