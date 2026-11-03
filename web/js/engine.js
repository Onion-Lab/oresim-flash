/*
 * 나만의 재분배 시뮬레이터 — 계산 엔진 (oresim/oresim-main.as 를 동작 그대로 옮긴 것)
 *
 * 원칙: 어떤 조작 순서에서도 원본 Flash 판이 보여 줄 상태와 내놓을 글(로그, 육성 가이드)이 바이트 단위로 같아야 한다.
 * 그래서 함수는 원본 순서·이름 그대로 한 줄씩 옮겼고, 원본이 상태를 넣어 두던 Flex 컨트롤의 동작도 흉내 낸다.
 *  - T            mx:Text/Label 의 text. 문자열로 바꾸고 null·undefined·"" 는 "" (Label.text setter).
 *                 원본처럼 parseInt(T.lv) 로 읽는다.
 *  - V            버튼 visible (s0up~s6up = +1, s0dup~s6dup = 대시)
 *  - 콤보박스     charCB/styleCB/xienCB: selectedIndex 는 int, 목록 길이를 넘으면 마지막 항목, selectedItem 은 저장값.
 *  - 스테퍼       bonusNS 와 스탯 편집 창(slv, ss0~ss11): 코드로 넣은 값은 다음 프레임에야 반올림·클램프된다.
 *                 그 전(같은 핸들러 안)에 읽으면 넣은 값 그대로다.
 *  - 조작 1회     원본 이벤트 핸들러 1회 + 다음 프레임 커밋(act). 핸들러 안에서 예외가 나면 Flash 처럼 그 핸들러만
 *                 멈추고 거기까지 바뀐 상태는 남는다.
 * Flash 에만 있던 것(글꼴, 포커스, 소리 재생, 볼륨 저장, 클립보드, 그림)은 뺐고, 관찰되는 결과만 데이터로 남겼다
 * (버튼 표시 → canUp/canDash, 드롭다운 색 → selectable, 효과음 → sound).
 *
 * 비교는 원본처럼 == / != 를 그대로 썼다(AS3 의 느슨한 비교와 JS 의 것이 같다. 숫자와 문자열을 섞어 비교하는 곳이 있다).
 * AS3 런타임과 JS 가 다른 두 곳은 AS3(Tamarin/avmplus 소스) 쪽을 따른다: 전역 parseInt(아래 parseInt), RegExp 의 \s(AS3_TRIM).
 *
 * 이 파일의 문자열 상수는 ASCII 로만 적었다(한국어 출력 문구는 \u 로 적고 옆 주석에 한국어를 달았다).
 * 서버가 다른 문자 코드로 보내도 계산과 출력이 깨지지 않게 하려는 것이다. 주석은 한국어 그대로다(주석은 깨져도 동작과 무관하다).
 *
 * 공개 API 는 CLAUDE.md 의 '웹판 > 엔진' 절에 적었다. 맞는지는 tests/engine-diff.js(원본을 헤드리스로 돌린 결과와 비교)와
 * tests/engine-invariants.js 로 확인한다.
 */
(function () {
  'use strict';

  var Oresim = globalThis.Oresim = globalThis.Oresim || {};
  // 저장 형식 serialize() 의 판. '3'(2026-11): 로그 읽기가 상한을 넘는 Status 줄의 LV·스탯을 상한으로 읽게 되어(동작이 바뀌었다) '2' 에서 올렸다
  var ENGINE_VERSION = '3';

  // ---- 반복 안전장치 ----
  // 원본에는 Flash 의 스크립트 시간 제한(Flex 기본 60초, Error #1502)밖에 없다. 그 시점은 PC 속도에 따라 달라 흉내 낼 수 없으므로,
  // 엔진은 "원본이 시간 제한 없이 끝까지 돌았을 때"의 결과를 낸다. 끝까지 돌아도 결과가 같은 반복은 정확하게 건너뛴다.
  //  - 로그 읽기의 레벨 반복(LV n - m, 몰빵): 최고 레벨에서 한 바퀴 동안 아무것도 바뀌지 않으면 남은 바퀴도 모두 같다
  //  - "STAB * n": 같은 스탯이 이어지는 묶음에서 한 번 거절되면 상태가 그대로이므로 나머지도 모두 거절된다
  //  - 되돌리기의 stLog 복사: 값이 있는 칸만 옮긴다(빈 칸과 undefined 칸은 원본 논리에서 구별되지 않는다)
  // 그래도 끝이 없는 입력(Status 줄의 아주 작은 LV·스탯 값 때문에 레벨업·투자가 실제로 수십만 번 일어나는 것)만
  // 아래 한도에서 멈춘다. 그때는 그 조작이 error: true 로 끝나고 상태는 거기까지 바뀐 채로 남는다(Flash 의 시간 초과와 같은 모양).
  var WORK_LIMIT = 100000;     // 한 조작에서 실제로 일어난 레벨업·스탯 +1 (하나마다 기록 1개가 쌓이므로 메모리 보호)
  var TICK_LIMIT = 10000000;   // 한 조작의 반복 횟수(위에서 빠뜨린 반복이 있어도 페이지가 멈추지 않게 하는 마지막 그물)

  // oresim.mxml 의 NumericStepper: [minimum, maximum, stepSize, 처음 value]
  var STEPPER_DEFS = {
    bonusNS: [0, 100, 5, 50],
    slv: [1, 255, 1, 255],
    ss0: [1, 255, 1, 255], ss1: [1, 255, 1, 255], ss2: [1, 255, 1, 255], ss3: [1, 255, 1, 255],
    ss4: [1, 255, 1, 255], ss5: [1, 255, 1, 255], ss6: [1, 255, 1, 255],
    ss7: [1, 22000, 1, 20000], ss8: [1, 7000, 1, 5000], ss9: [1, 12000, 1, 9999],
    ss11: [0, 9999, 1, 9999]
  };
  var SS_IDS = ['ss0', 'ss1', 'ss2', 'ss3', 'ss4', 'ss5', 'ss6', 'ss7', 'ss8', 'ss9', null, 'ss11'];

  // 텍스트 컨트롤 (id 는 oresim.mxml 그대로). 처음 값은 initApp 이 모두 덮어쓴다.
  var TEXT_IDS = ['lv', 's0', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's11',
    's0L', 's1L', 's2L', 's3L', 's4L', 's5L', 's6L', 'p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6',
    's7mi', 's7mx', 's8mi', 's8mx', 's9mi', 's9mx', 'tbonus', 'tlvup', 'pbonus'];

  // 원본의 sArray = [s0..s9, 0, s11] (10번은 Text 가 아닌 0), pArray = [p0..p6]
  var S_IDS = ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', null, 's11'];
  var S7_IDS = S_IDS.slice(0, 7);   // stupPress 의 sArray
  var P_IDS = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

  // logLoad 의 /^\s+|\s+$/g. AS3 RegExp 의 \s 는 JS 와 다르다. avmplus 의 PCRE 는 \s 를 문자표(0~255: \t \n \f \r 공백 U+00A0,
  // \v 는 아님)와 isUnicodeWhiteSpace(256 이상: U+200B, U+2060, U+3000, U+FEFF)로 판정한다
  // (pcre_chartables.cpp, pcre_exec.cpp 의 OP_WHITESPACE, pcre_config.cpp). JS 의 \s 와 달리 U+1680·U+2000~U+200A·U+2028·
  // U+2029·U+202F·U+205F·\v 는 빠지고 U+200B·U+2060 이 들어간다.
  var AS3_TRIM = /^[\t\n\f\r \u00a0\u200b\u2060\u3000\ufeff]+|[\t\n\f\r \u00a0\u200b\u2060\u3000\ufeff]+$/g;

  // ---- AS3 의 전역 parseInt ----
  // 원본의 parseInt(s:String, radix:int = 0) 는 avmplus 의 MathUtils::parseInt(s, 0, strict 아님) 이다(Toplevel.cpp).
  // JS 의 parseInt 와 다른 점:
  //  - 앞 공백: ' ' \t \n \v \f \r, U+2000~U+200B, U+2028, U+2029, U+205F, U+3000 만 건너뛴다(MathUtils.cpp skipSpaces).
  //    JS 가 건너뛰는 U+00A0·U+FEFF·U+1680·U+202F 는 건너뛰지 않고, JS 가 건너뛰지 않는 U+200B 는 건너뛴다.
  //    웹 페이지에서 복사한 로그의 "LV &nbsp;15" 같은 줄에서 결과가 달라진다.
  //  - 수: 자릿수마다 result * radix + v 로 쌓는다. 10진수는 보정이 없어 17자리쯤부터 JS 와 다른 double 이 되고,
  //    16진수(0x)는 2^53 이상에서 아래 반올림 보정을 C++ 그대로 따른다.
  // 이 파일 안에서 parseInt 는 모두 이 함수다(전역 parseInt 를 같은 이름으로 가린다).
  function parseInt(v) {
    var s = (v === undefined || v === null) ? 'null' : String(v);   // String 형 매개변수: null/undefined → "null"
    var n = s.length, i = 0, c, d;
    while (i < n) {   // skipSpaces
      c = s.charCodeAt(i);
      if (c === 32 || (c >= 9 && c <= 13) || (c >= 0x2000 && c <= 0x200B) || c === 0x2028 || c === 0x2029 || c === 0x205F || c === 0x3000) i++;
      else break;
    }
    var negate = false;   // handleSign
    if (i < n) {
      c = s.charCodeAt(i);
      if (c === 43) i++;
      else if (c === 45) { negate = true; i++; }
    }
    var radix = 10;
    if (n - i >= 2 && s.charCodeAt(i) === 48 && (s.charCodeAt(i + 1) === 120 || s.charCodeAt(i + 1) === 88)) {   // isHexNumber
      i += 2;
      radix = 16;
    }
    var gotDigits = false, result = 0;
    if (i < n) {
      var start = i;
      while (i < n) {
        d = as3Digit(s.charCodeAt(i));
        if (d === -1 || d >= radix) break;
        result = result * radix + d;
        gotDigits = true;
        i++;
      }
      if (result >= 9007199254740992 && radix === 16) {
        // 2^53 이상: 앞의 0 을 건너뛰고 첫 14자리(52비트 남짓)를 다시 읽은 뒤 다음 자리로 반올림한다
        result = 0;
        var v16 = 0, end, next;
        for (end = start; end < n && s.charCodeAt(end) === 48; end++);
        if (end >= n) return 0;
        for (next = 0; next * 4 <= 52; next++) {
          v16 = as3Digit(s.charCodeAt(end++));
          if (v16 === -1 || v16 >= 16) { v16 = 0; break; }
          result = result * 16 + v16;
          if (end >= n) break;
        }
        if (next * 4 > 52) {
          var roundUp = false, bit53 = v16 & 1, bit54 = 0, factor = 1;
          v16 = as3Digit(s.charCodeAt(end));
          if (v16 !== -1 && v16 < 16) {
            factor *= 16;
            bit54 = v16 & 8;
            roundUp = (v16 & 3) !== 0;
          } else {
            roundUp = bit53 !== 0;
          }
          while (++end < n) {   // C++ 그대로: 위에서 본 자리 다음부터 숫자가 이어지는 동안
            v16 = as3Digit(s.charCodeAt(end));
            if (v16 === -1 || v16 >= 16) break;
            roundUp = roundUp || v16 !== 0;
            factor *= 16;
          }
          roundUp = bit54 !== 0 && (bit53 !== 0 || roundUp);
          result += roundUp ? 1 : 0;
          result *= factor;
        }
      }
      if (negate) result = -result;
    }
    return gotDigits ? result : NaN;
  }
  // parseIntDigit: 0-9, a-z, A-Z → 0~35, 그 밖은 -1
  function as3Digit(c) {
    if (c >= 48 && c <= 57) return c - 48;
    if (c >= 97 && c <= 122) return c - 87;
    if (c >= 65 && c <= 90) return c - 55;
    return -1;
  }

  // ---- 출력 문구 ----
  // 원본의 한국어 문구. 파일을 ASCII 로 두려고 \u 로 적는다(옆 주석이 원문). 원본 출력과 같은지는 tests/engine-diff.js 가 본다.
  var W = {
    allin: '\uBAB0\uBE75',                                            // 몰빵
    times: '\uD68C',                                                  // 회
    gStat: '\u25A0\uC2A4\uD0EF',                                      // ■스탯
    gChar: '[\uCE90\uB9AD\uD130] ',                                   // [캐릭터]
    gType: '[\uD0C0\uC785] ',                                         // [타입]
    gBonus: '\uBCF4\uB108\uC2A4 ',                                    // 보너스
    gHelm: '[\uD22C\uAD6C] ',                                         // [투구]
    gWeapon: '[\uBB34\uAE30] ',                                       // [무기]
    gArmor: '[\uAC11\uC637] ',                                        // [갑옷]
    gShield: '[\uBC29\uD328] ',                                       // [방패]
    gHead: '[\uBA38\uB9AC] ',                                         // [머리]
    gBody: '[\uBAB8] ',                                               // [몸]
    gHand: '[\uC190] ',                                               // [손]
    gLeg: '[\uB2E4\uB9AC] ',                                          // [다리]
    gPet: '[\uD3AB] ',                                                // [펫]
    gField: '[\uC0AC\uB0E5\uD130] ',                                  // [사냥터]
    gOrder: '\u25A0\uC7AC\uBD84\uBC30 \uC21C\uC11C',                  // ■재분배 순서
    gStart: '\uC2DC\uC791 \uC2A4\uD0EF { ',                           // 시작 스탯 {
    gFrom: '\uBD80\uD130',                                            // 부터
    gMain: ' \uC8FC\uB825',                                           // 주력 (앞에 공백)
    gUpTo: '\uAE4C\uC9C0 \uCC0D\uAE30',                               // 까지 찍기
    gNeed: ', \uD544\uC694 \uD3EC\uC778\uD2B8 ',                      // , 필요 포인트
    gLog: '\u25A0\uC7AC\uBD84\uBC30 \uB85C\uADF8'                     // ■재분배 로그
  };

  // ---- AS3 형 변환 ----

  // String 형(coerce_s): undefined/null → null, 그 밖은 String()
  function coerceS(v) { return (v === undefined || v === null) ? null : String(v); }
  // mx:Label/Text/TextArea 의 text: String 으로 바꾼 뒤 빈 값(null, "")은 ""
  function asText(v) { var s = coerceS(v); return s ? s : ''; }
  // (sArray[n] as Text): Text 가 아니면 null 이 되고 .text 에서 TypeError
  function ctl(ids, n) {
    var id = ids[n];
    if (id === undefined || id === null) throw new TypeError('Error #1009: Cannot access a property or method of a null object reference.');
    return id;
  }
  // ArrayCollection.getItemAt: 범위를 벗어나면 RangeError
  function itemAt(list, index) {
    index = index | 0;
    if (index < 0 || index >= list.length) throw new RangeError('Index \'' + index + '\' specified is out of bounds.');
    return list[index];
  }

  // ---- mx:NumericStepper ----

  function makeStepper(def) {
    return { minimum: def[0], maximum: def[1], stepSize: def[2], _value: def[3], proposed: 0, changed: false };
  }
  // get value(): 커밋 전에는 넣은 값 그대로
  function stepperGet(st) { return st.changed ? st.proposed : st._value; }
  // set value(value:Number): 다음 프레임에 커밋된다
  function stepperSet(st, v) { st.proposed = Number(v); st.changed = true; }
  // set maximum(): 값을 다음 커밋에서 다시 검사하게 한다
  function stepperSetMaximum(st, v) {
    st.maximum = Number(v);
    if (!st.changed) { st.proposed = st._value; st.changed = true; }
  }
  function checkValidValue(st, value) {
    if (isNaN(value)) return stepperGet(st);
    var closest = st.stepSize * Math.round(value / st.stepSize);
    var parts = String(1 + st.stepSize).split('.');
    if (parts.length === 2) {
      var scale = Math.pow(10, parts[1].length);
      closest = Math.round(closest * scale) / scale;
    }
    if (closest > st.maximum) return st.maximum;
    else if (closest < st.minimum) return st.minimum;
    return closest;
  }
  function stepperSetValue(st, value) {
    var v = checkValidValue(st, value);
    if (v == st._value) return;   // Flex 그대로(-0 과 0 은 같은 값으로 본다)
    st._value = v;
  }
  // 다음 프레임의 commitProperties: NaN 은 0 으로 보고 반올림·클램프
  function stepperCommit(st) {
    if (st.changed) {
      st.changed = false;
      stepperSetValue(st, isNaN(st.proposed) ? 0 : st.proposed);
    }
  }
  // 사용자가 입력란에 친 값(takeValueFromTextField): 숫자가 아니면 그대로 두고(false), 아니면 바로 반올림·클램프해 확정(true)
  function stepperInput(st, x) {
    var n = Number(typeof x === 'string' ? x : String(x));
    if (isNaN(n)) return false;
    stepperSetValue(st, checkValidValue(st, n));
    return true;
  }

  // ---- mx:ComboBox (ComboBase 의 선택 처리) ----

  function makeCombo(list) {
    var cb = { list: [], idx: -1, item: null };
    comboFill(cb, list);
    return cb;
  }
  // set selectedIndex(value:int)
  function comboSet(cb, value) {
    value = value | 0;
    cb.idx = value;
    if (value === -1) cb.item = null;
    if (cb.list.length === 0) return;   // 목록이 비어 있으면 다음 커밋으로 미룬다(이 프로그램에서는 생기지 않는다)
    if (value !== -1) {
      value = Math.min(value, cb.list.length - 1);   // 범위를 넘으면 마지막 항목
      cb.idx = value;
      cb.item = value < 0 ? null : cb.list[value];
    }
  }
  // 목록을 비운다(removeAll → RESET): 빈 목록에서는 -1
  function comboEmpty(cb) { cb.list.length = 0; cb.idx = -1; cb.item = null; }
  // 항목 하나를 덧붙인다(addItem → ADD): 첫 항목이 들어오면 0 을 고른다
  function comboAdd(cb, item) {
    var location = cb.list.length;
    cb.list.push(item);
    if (cb.idx >= location) cb.idx++;
    if (cb.list.length === 1 && cb.idx === -1) comboSet(cb, 0);
  }
  function comboFill(cb, items) {
    comboEmpty(cb);
    for (var i = 0; i < items.length; i++) comboAdd(cb, items[i]);
  }

  // ---- 저장(serialize) 형식의 수 ----
  // JSON 은 NaN·Infinity·-0 을 담지 못하므로 문자열로 적는다. 숫자 칸에만 쓰므로 문자열이면 특수한 수다.
  function encNum(v) {
    if (typeof v === 'number') {
      if (v !== v) return 'NaN';
      if (v === Infinity) return 'Infinity';
      if (v === -Infinity) return '-Infinity';
      if (v === 0 && 1 / v < 0) return '-0';
      return v;
    }
    if (v === undefined) return null;
    throw new Error('serialize: not a number in a number field: ' + String(v));
  }
  function decNum(v, what) {
    if (typeof v === 'number' && isFinite(v)) return v;
    if (v === null) return undefined;
    if (v === 'NaN') return NaN;
    if (v === 'Infinity') return Infinity;
    if (v === '-Infinity') return -Infinity;
    if (v === '-0') return -0;
    throw new Error(what + ': not a number');
  }
  function isNumKey(k) { return typeof k === 'string' && String(Number(k)) === k; }

  function badSave(what) { throw new Error('Oresim: invalid saved engine state: ' + what); }   // 저장된 엔진 상태가 올바르지 않다

  // 표(const.js)의 지문(FNV-1a 32비트). serialize() 에 넣고, 되살릴 때 표가 바뀌었으면 거부한다
  // (옛 표로 계산한 상태에 새 표로 이어서 계산하지 않도록. 화면 쪽은 이때 로그 글을 다시 읽으면 된다)
  var dataHashCache = null;
  function dataHash(C) {
    if (dataHashCache === null) {
      var s = JSON.stringify(C), h = 0x811c9dc5;
      for (var i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      dataHashCache = ('0000000' + h.toString(16)).slice(-8);
    }
    return dataHashCache;
  }

  // =====================================================================================
  function createEngine(saved) {
    return buildEngine(saved, null);
  }

  // raw: 같은 엔진이 만든 내부 상태 사본(preview()/previewDash() 의 시험용 사본에만 쓴다). probe: 그 사본에서 돌릴 것
  // ('lvup' 또는 대시할 스탯 번호). probe 가 있으면 엔진 대신 그 결과를 돌려준다.
  function buildEngine(saved, raw, probe) {
    var C = Oresim.CONST;
    // js/const.js 를 js/engine.js 보다 먼저 읽어야 한다
    if (!C) throw new Error('Oresim.CONST is missing: load js/const.js before js/engine.js');
    if (saved !== undefined && saved !== null) {
      if (typeof saved !== 'object') badSave('not an object');
      // 알 수 없는 버전, 또는 저장할 때와 표(const.js)가 다르면 쓰지 않는다(화면 쪽은 저장해 둔 로그 글을 다시 읽으면 된다)
      if (saved.v !== ENGINE_VERSION) throw new Error('Oresim: unknown saved engine version ' + String(saved.v) + ' (this engine is ' + ENGINE_VERSION + ')');
      if (saved.d !== dataHash(C)) throw new Error('Oresim: the tables (const.js) changed since this state was saved');
    }

    var MAX_LEVEL = C.MAX_LEVEL, MAX_STATUS = C.MAX_STATUS, STATUS_NAME = C.STATUS_NAME, XIEN_NAME = C.XIEN_NAME,
      CHAR_NAME = C.CHAR_NAME, STYLE_NAME = C.STYLE_NAME, DEFAULT_STATUS = C.DEFAULT_STATUS,
      DEFAULT_NEED_POINT = C.DEFAULT_NEED_POINT, DEFAULT_XIEN = C.DEFAULT_XIEN, MAX_XIEN = C.MAX_XIEN,
      STATUS_UP = C.STATUS_UP, XIEN_UP_BONUS = C.XIEN_UP_BONUS, XIEN_RANDOM_UP_BONUS = C.XIEN_RANDOM_UP_BONUS,
      MIN_XIEN_UP_STATUS = C.MIN_XIEN_UP_STATUS, MAX_XIEN_UP_STATUS = C.MAX_XIEN_UP_STATUS,
      BONUS_STATUS_POINT = C.BONUS_STATUS_POINT;

    // ---- 원본의 전역 변수 ----
    var _style = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var _needXien = fillArray(50, 1);
    var _xi = fillArray(50, 0);
    var _bonusPoints = 0;
    var _shiftKeyDown = false;
    var stLog = new Array(300);      // stLog[LV-1] = 그 레벨에서 올린 스탯 번호 문자열 ("s" = 스탯 편집)
    var tmpStLog = new Array(300);   // 되돌리기용 사본
    var stackLog = '';               // 원본에서도 쓰지 않는 변수
    var log = new Array(1024);       // 조작 1회마다 78칸 스냅샷. log[logindex + 1] 은 센티널
    var logindex = 0;
    var tmpXien = 0;                 // 원본에서 쓰기만 하고 읽지 않는 변수
    var tmpBonusExpected = 50;
    var tmpx = 0;                    // 드롭다운을 열 때의 계열 번호 (선택할 수 없는 계열이면 여기로 돌아간다)

    // ---- 컨트롤 ----
    var T = makeTexts();
    var V = { up: fillArray(7, true), dup: fillArray(7, true) };
    var charCB = makeCombo(C.charList);
    var styleCB = makeCombo(C.styleList);
    var xienCB = makeCombo(C.xienList);
    var xienList = xienCB.list;      // 같은 배열을 계속 쓴다(removeAll/addItem)
    var xienColors = [];             // xienCB.setStyle("alternatingItemColors", …): 0x000000 = 지금 고를 수 없음
    var bonusNS = makeStepper(STEPPER_DEFS.bonusNS);
    var slv = makeStepper(STEPPER_DEFS.slv);
    var SS = {};
    SS_IDS.forEach(function (id) { if (id) SS[id] = makeStepper(STEPPER_DEFS[id]); });
    var sxiList = C.sxiList.map(function (o) { return { xienLabel: o.xienLabel, xienData: o.xienData }; });
    var logText = '';                // logarea.text (원본의 로그 상자)
    var ticks = 0, works = 0;        // 이번 조작의 반복 횟수, 실제 레벨업·스탯 +1 횟수(맨 위 안전장치)
    var version = 0;                 // 상태가 바뀔 수 있는 조작마다 1씩 는다(preview 결과 재사용 판정)
    var memo = { version: -1, preview: undefined, dash: [] };

    function fillArray(n, v) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; }
    // 배열의 칸 번호 키(0, 1, 2, … 의 정식 표기) 중 n 보다 작은 것마다 fn(번호). 키 수만큼만 돈다
    function eachIndexKey(arr, n, fn) {
      var keys = Object.keys(arr);
      for (var k = 0; k < keys.length; k++) {
        tick();
        var i = keys[k] >>> 0;   // 배열 칸 번호(0 ~ 2^32-2)만. "NaN", "-1" 같은 키는 원본 반복도 닿지 않는다
        if (String(i) === keys[k] && i !== 4294967295 && i < n) fn(i);
      }
    }
    function makeTexts() {
      var o = {}, store = {};
      TEXT_IDS.forEach(function (id) {
        store[id] = '';
        Object.defineProperty(o, id, {
          enumerable: true,
          get: function () { return store[id]; },
          set: function (v) { store[id] = asText(v); }
        });
      });
      return o;
    }
    // 반복 1회. 한도를 넘으면 Flash 의 시간 초과처럼 그 조작을 멈춘다(맨 위 안전장치 참고)
    function tick() {
      if (++ticks > TICK_LIMIT) throw new Error('Oresim: loop limit reached (like Flash Error #1502)');
    }
    // 실제 레벨업·스탯 +1 하나(기록이 하나 쌓인다). 바꾸기 전에 세므로 멈춰도 상태는 직전 조작까지 맞는다
    function work() {
      if (++works > WORK_LIMIT) throw new Error('Oresim: work limit reached (like Flash Error #1502)');
    }
    // 다음 프레임: 스테퍼 커밋(콤보박스는 이 프로그램에서 커밋할 일이 생기지 않는다)
    function commitFrame() {
      stepperCommit(bonusNS);
      stepperCommit(slv);
      for (var id in SS) stepperCommit(SS[id]);
    }

    // =================================================================================
    // 원본 함수 (oresim-main.as 의 순서)
    // =================================================================================

    function initApp() {
      changeChar(0);
      // 볼륨, 붙여넣기 버튼, 포커스, 키 입력 등록은 화면 쪽 일이다
    }

    function openDrop() {
      tmpx = xienCB.idx;
    }

    // r: { ok, sound } — 원본이 조작을 받아들였는지와 낸 효과음
    function lvupPress(r) {
      if (parseInt(T.lv) < MAX_LEVEL) {
        r.ok = true; r.sound = 'lvup';   // lvupSe.sound.play()
        lvup();
        logOut();
        updateStatus();
      }
    }
    function stupPress(n, r) {
      if (_shiftKeyDown) {
        stdupPress(n, r);
        return;
      }
      if (parseInt(T[ctl(S7_IDS, n)]) < MAX_STATUS[n]
          && parseInt(T.s11) >= parseInt(T[ctl(P_IDS, n)])) {
        r.ok = true; r.sound = 'stup';   // stupSe.sound.play()
        stup(n);
        logOut();
        updateStatus();
      }
    }
    function stdupPress(n, r) {
      if (parseInt(T[ctl(S_IDS, n)]) < MAX_STATUS[n]) {
        // 원본은 여기서 늘 효과음을 낸다(stupSe.sound.play()). 그런데 최고 레벨에서 포인트가 모자라면(또는 LV 가 수가 아니면)
        // stdup() 의 반복이 한 번도 돌지 않아 아무것도 바뀌지 않는다. 그 경우는 거절(ok: false, 소리 없음)로 알린다(계약의
        // "포인트 부족이면 ok: false"). 아래 logOut()/updateStatus() 는 원본처럼 돈다(로그 상자는 새로 쓰일 수 있다).
        if (dashChanges(n)) {
          r.ok = true; r.sound = 'stup';
        }
        stdup(n);
        logOut();
        updateStatus();
      }
    }
    // stdup(n) 의 첫 반복 조건(스탯이 상한 아래일 때 쓴다). 거짓이면 대시는 아무것도 바꾸지 않고, 참이면 첫 반복에서
    // 레벨업하거나 스탯을 올린다. stdup() 과 같은 글자(LV, POINT, 비용 p_n)를 읽는다
    function dashChanges(n) {
      var p = Math.floor((parseInt(T.lv) + parseInt(T[ctl(S_IDS, n)]) * 5) / 125);
      return p == p && (parseInt(T.lv) < MAX_LEVEL || parseInt(T.s11) >= parseInt(T[ctl(P_IDS, n)]));
    }
    function resetPress() {
      reset();
      updateStatus();
    }
    function backPress() {
      if (_shiftKeyDown) {
        dashBack();
      } else {
        back();
      }
      updateStatus();
    }
    function progressPress() {
      if (_shiftKeyDown) {
        dashProgress();
      } else {
        progress();
      }
      updateStatus();
    }
    function logLoadPress(flags) {
      logLoad(flags);
      updateStatus();
    }

    function commitStatusEditPress() {
      T.lv = String(stepperGet(slv));

      T.s0 = String(stepperGet(SS.ss0));
      T.s1 = String(stepperGet(SS.ss1));
      T.s2 = String(stepperGet(SS.ss2));
      T.s3 = String(stepperGet(SS.ss3));
      T.s4 = String(stepperGet(SS.ss4));
      T.s5 = String(stepperGet(SS.ss5));
      T.s6 = String(stepperGet(SS.ss6));
      T.s7 = String(stepperGet(SS.ss7));
      T.s8 = String(stepperGet(SS.ss8));
      T.s9 = String(stepperGet(SS.ss9));
      T.s11 = String(stepperGet(SS.ss11));

      T.s7mx = String(stepperGet(SS.ss7));
      T.s7mi = String(stepperGet(SS.ss7));
      T.s8mx = String(stepperGet(SS.ss8));
      T.s8mi = String(stepperGet(SS.ss8));
      T.s9mx = String(stepperGet(SS.ss9));
      T.s9mi = String(stepperGet(SS.ss9));

      var len = xienList.length, x = _xi, max = 0, maxIndex = 0, v;
      for (var i = 0; i < len; i++) {
        v = parseInt(itemAt(sxiList, i).xienData);
        if (isNaN(v) || v < 0) {
          v = 0;
        }
        x[parseInt(itemAt(xienList, i).data)] = v;
        if (v >= max) {
          max = v;
          maxIndex = i;
        }
      }
      comboSet(xienCB, maxIndex);
      updateNeedXien();

      updateStatus();
      logindex = -1;
      logging();
      // 편집한 레벨 표시. 되돌리기(←)로 지워지지 않도록 log 쪽 글자 수에도 넣는다
      stLog[parseInt(T.lv) - 1] = 's';
      tmpStLog[parseInt(T.lv) - 1] = 's';
      log[logindex][77] = 1;
      // w.visible = false — 창 닫기는 화면 쪽 일
    }

    function statusEdit() {
      // 입력 상한은 최고 레벨/스탯 상한값에 맞춘다
      stepperSetMaximum(slv, MAX_LEVEL);
      for (var k = 0; k <= 9; k++) stepperSetMaximum(SS[SS_IDS[k]], MAX_STATUS[k]);

      stepperSet(slv, parseInt(T.lv));
      stepperSet(SS.ss0, parseInt(T.s0));
      stepperSet(SS.ss1, parseInt(T.s1));
      stepperSet(SS.ss2, parseInt(T.s2));
      stepperSet(SS.ss3, parseInt(T.s3));
      stepperSet(SS.ss4, parseInt(T.s4));
      stepperSet(SS.ss5, parseInt(T.s5));
      stepperSet(SS.ss6, parseInt(T.s6));
      stepperSet(SS.ss7, parseInt(T.s7));
      stepperSet(SS.ss8, parseInt(T.s8));
      stepperSet(SS.ss9, parseInt(T.s9));
      stepperSet(SS.ss11, parseInt(T.s11));

      var len = xienList.length;
      sxiList = [];
      for (var i = 0; i < len; i++) {
        sxiList.push({ xienLabel: XIEN_NAME[parseInt(itemAt(xienList, i).data)], xienData: _xi[parseInt(itemAt(xienList, i).data)] });
      }
      // w.x = 0; w.y = 40; w.visible = true — 창 표시는 화면 쪽 일
    }

    function replaceText(str, oldChar, newChar) {
      str = coerceS(str);   // String 형 매개변수: undefined 는 null 이 되어 아래에서 TypeError
      var strArray = str.split(oldChar);
      return strArray.join(newChar);
    }

    function changeChar(c) {
      comboSet(charCB, c);
      // charImg.source = charImgSymbol[c] — 그림은 화면 쪽 일

      var len = STYLE_NAME[c].length;
      // styleList = new ArrayCollection(): 데이터 바인딩으로 styleCB 의 목록이 새 빈 목록으로 바뀐다
      styleCB.list = [];
      styleCB.idx = -1; styleCB.item = null;
      for (var i = 0; i < len; i++) {
        comboAdd(styleCB, { label: STYLE_NAME[c][i], data: i });
      }

      comboSet(styleCB, 0);
      initXienList(c);
      initXien(c, _style[c]);
      initStatus(c, _style[c], xienCB.idx);
    }
    function changeStyle(s) {
      comboSet(styleCB, s);
      initXien(charCB.idx, s);
      initStatus(charCB.idx, s, xienCB.idx);
    }
    function changeXien(x) {
      var l = parseInt(T.lv);

      if (MAX_XIEN[charCB.idx][x].length < l) {
        l = MAX_XIEN[charCB.idx][x].length;
      }
      if (MAX_XIEN[charCB.idx][x][l - 1] < _needXien[x]) {
        comboSet(xienCB, tmpx);
        return;
      }

      for (l = 0; l < xienList.length; l++) {
        if (itemAt(xienList, l).data == x) {
          comboSet(xienCB, l);
        }
      }
    }
    function initXien(c, s) {
      var len = DEFAULT_XIEN[c][s].length;
      for (var i = 0; i < len; i++) {
        _xi[i] = DEFAULT_XIEN[c][s][i];

        if (DEFAULT_XIEN[c][s][i] > 0) {
          var len2 = xienList.length;
          for (var l = 0; l < len2; l++) {
            if (itemAt(xienList, l).label == XIEN_NAME[i]) {
              comboSet(xienCB, l);
            }
          }
        }
      }
    }
    function initXienList(c) {
      // xienList.removeAll(): 항목이 있을 때만 RESET
      if (xienList.length > 0) comboEmpty(xienCB);

      for (var i = 0; i < MAX_XIEN[c].length; i++) {
        if (MAX_XIEN[c][i][MAX_XIEN[c][i].length - 1] > 0) {
          comboAdd(xienCB, { label: XIEN_NAME[i], data: i });
        }
      }
    }
    // Xien 값으로 각 계열을 주력 계열로 고르는 데 필요한 Xien을 다시 구한다(스탯 편집 후 등)
    // 값이 같으면 번호가 큰 계열이 이긴다(lvup과 같은 규칙)
    function updateNeedXien() {
      var len = _xi.length, lead = 0, i;

      for (i = 0; i < len; i++) {
        if (_xi[i] >= _xi[lead]) {
          lead = i;
        }
      }
      for (i = 0; i < len; i++) {
        if (i < lead) {
          _needXien[i] = _xi[lead] + 1;
        } else {
          _needXien[i] = _xi[lead];
        }
      }
      updateXienColor();
    }
    // 지금 레벨에서 고를 수 없는 계열을 드롭다운에서 검게 표시한다
    function updateXienColor() {
      var len = xienList.length;
      var _color = [];
      var c = charCB.idx;
      var l = NaN;

      for (var i = 0; i < len; i++) {
        l = parseInt(T.lv);
        if (MAX_XIEN[c][itemAt(xienList, i).data].length < l) {
          l = MAX_XIEN[c][itemAt(xienList, i).data].length;
        }
        if (MAX_XIEN[c][itemAt(xienList, i).data][l - 1] < _needXien[itemAt(xienList, i).data]) {
          _color.push(0x000000);
        } else {
          _color.push(0x363636);
        }
      }
      xienColors = _color;
    }
    function initStatus(c, s, xi) {
      var i;
      T.lv = String(1);
      if (c == 15) {
        T.lv = String(200);
      }
      T.s11 = '0';
      T.tlvup = '0';
      _bonusPoints = 0;
      T.tbonus = '0';
      tmpXien = Number(xi);

      comboSet(styleCB, s);
      comboSet(xienCB, xi);

      var len = Number(itemAt(xienList, xi).data);
      for (i = 0; i < len; i++) {
        _needXien[i] = 2;
      }
      var len2 = _needXien.length;
      for (i = len; i < len2; i++) {
        _needXien[i] = 1;
      }
      len = xienList.length;
      var _color = [];
      for (i = 0; i < len; i++) {
        if (MAX_XIEN[c][itemAt(xienList, i).data][0] < _needXien[itemAt(xienList, i).data]) {
          _color.push(0x000000);
        } else {
          _color.push(0x363636);
        }
      }
      xienColors = _color;

      T.s0 = DEFAULT_STATUS[c][s][0];
      T.s1 = DEFAULT_STATUS[c][s][1];
      T.s2 = DEFAULT_STATUS[c][s][2];
      T.s3 = DEFAULT_STATUS[c][s][3];
      T.s4 = DEFAULT_STATUS[c][s][4];
      T.s5 = DEFAULT_STATUS[c][s][5];
      T.s6 = DEFAULT_STATUS[c][s][6];
      T.s7 = DEFAULT_STATUS[c][s][7];
      T.s8 = DEFAULT_STATUS[c][s][8];
      T.s9 = DEFAULT_STATUS[c][s][9];

      T.p0 = DEFAULT_NEED_POINT[c][s][0];
      T.p1 = DEFAULT_NEED_POINT[c][s][1];
      T.p2 = DEFAULT_NEED_POINT[c][s][2];
      T.p3 = DEFAULT_NEED_POINT[c][s][3];
      T.p4 = DEFAULT_NEED_POINT[c][s][4];
      T.p5 = DEFAULT_NEED_POINT[c][s][5];
      T.p6 = DEFAULT_NEED_POINT[c][s][6];

      // s0L.data = 25 … (어디서도 읽지 않는 값이라 옮기지 않는다)
      T.s0L = '25';
      T.s1L = '25';
      T.s2L = '25';
      T.s3L = '25';
      T.s4L = '25';
      T.s5L = '25';
      T.s6L = '25';

      T.s7mx = T.s7;
      T.s7mi = T.s7;
      T.s8mx = T.s8;
      T.s8mi = T.s8;
      T.s9mx = T.s9;
      T.s9mi = T.s9;

      for (i = 0; i < 7; i++) V.up[i] = false;
      for (i = 0; i < 7; i++) V.dup[i] = true;

      T.pbonus = '0%';

      // _xi[0] = DEFAULT_XIEN[c][s][0]; … _xi[49] = DEFAULT_XIEN[c][s][49];
      for (i = 0; i < 50; i++) _xi[i] = DEFAULT_XIEN[c][s][i];

      tmpBonusExpected = Number(stepperGet(bonusNS));

      logindex = -1;
      logging();
      stLog[0] = '';
      tmpStLog[0] = '';
      // 시작 레벨이 1이 아닌 캐릭터(로아미니)용
      stLog[parseInt(T.lv) - 1] = '';
      tmpStLog[parseInt(T.lv) - 1] = '';
      // 필요 포인트를 레벨까지 반영해 다시 계산한다(위 값은 LV1 기준 초깃값)
      updateStatus();
    }

    function updateStatus() {
      var c = charCB.idx, s = styleCB.idx,
        dnp = DEFAULT_NEED_POINT[c][s], mxst = MAX_STATUS, mxlv = parseInt(String(MAX_LEVEL));
      var i;

      if (parseInt(T.tlvup) > 0) {
        T.pbonus = (Math.floor(parseInt(T.tbonus) * 1000 / parseInt(T.tlvup)) / 10) + '%';
      } else {
        T.pbonus = '0%';
      }

      if (parseInt(T.s7mi) > MAX_STATUS[7]) T.s7mi = MAX_STATUS[7];
      if (parseInt(T.s7mx) > MAX_STATUS[7]) T.s7mx = MAX_STATUS[7];
      if (parseInt(T.s8mi) > MAX_STATUS[8]) T.s8mi = MAX_STATUS[8];
      if (parseInt(T.s8mx) > MAX_STATUS[8]) T.s8mx = MAX_STATUS[8];
      if (parseInt(T.s9mi) > MAX_STATUS[9]) T.s9mi = MAX_STATUS[9];
      if (parseInt(T.s9mx) > MAX_STATUS[9]) T.s9mx = MAX_STATUS[9];

      // p0~p6: 다음 1포인트 비용
      for (i = 0; i < 7; i++) {
        T[P_IDS[i]] = dnp[i] + Math.floor((parseInt(T.lv) + parseInt(T[S_IDS[i]]) * 5) / 125);
      }
      // s0L~s6L: 비용이 오르는 스탯값(초록 숫자)
      for (i = 0; i < 7; i++) {
        T[S_IDS[i] + 'L'] = String(Math.ceil(25 - parseInt(T.lv) / 5) + (parseInt(T[P_IDS[i]]) - dnp[i]) * 25);
      }
      for (i = 0; i < 7; i++) {
        V.up[i] = (parseInt(T[S_IDS[i]]) < mxst[i] && parseInt(T[P_IDS[i]]) <= parseInt(T.s11));
      }
      for (i = 0; i < 7; i++) {
        V.dup[i] = (parseInt(T[S_IDS[i]]) < mxst[i] && (parseInt(T.lv) < mxlv || parseInt(T[P_IDS[i]]) <= parseInt(T.s11)));
      }
    }
    function upPoints() {
      var c = charCB.idx, s = styleCB.idx,
        dnp = DEFAULT_NEED_POINT[c][s];

      for (var i = 0; i < 7; i++) {
        T[P_IDS[i]] = String(dnp[i] + Math.floor((parseInt(T.lv) + parseInt(T[S_IDS[i]]) * 5) / 125));
      }
    }

    // 레벨업을 했으면 true (최고 레벨이라 그냥 돌아가면 false). 돌려주는 값은 엔진이 반복을 건너뛸 때만 쓴다
    function lvup() {
      if (parseInt(T.lv) >= MAX_LEVEL) {
        return false;
      }
      work();
      T.lv = String(parseInt(T.lv) + 1);

      var xien = parseInt(xienCB.item.data);
      var max = Number(_xi[xien]);
      var i;
      for (i = 0; i < xien; i++) {
        if (max < _xi[i]) {
          max = _xi[i];
        }
      }
      var len = _xi.length;
      for (i = xien + 1; i < len; i++) {
        if (max <= _xi[i]) {
          max = _xi[i] + 1;
        }
      }
      for (i = 0; i < xien; i++) {
        _needXien[i] = max + 1;
      }
      for (i = xien; i < len; i++) {
        _needXien[i] = max;
      }
      _xi[xien] = max;
      updateXienColor();

      T.s0 = parseInt(T.s0) + XIEN_UP_BONUS[xien][0];
      T.s1 = parseInt(T.s1) + XIEN_UP_BONUS[xien][1];
      T.s2 = parseInt(T.s2) + XIEN_UP_BONUS[xien][2];
      T.s3 = parseInt(T.s3) + XIEN_UP_BONUS[xien][3];

      T.s4 = parseInt(T.s4) + XIEN_UP_BONUS[xien][4];
      T.s5 = parseInt(T.s5) + XIEN_UP_BONUS[xien][5];
      T.s6 = parseInt(T.s6) + XIEN_UP_BONUS[xien][6];
      T.s7 = parseInt(T.s7) + XIEN_UP_BONUS[xien][7];
      T.s8 = parseInt(T.s8) + XIEN_UP_BONUS[xien][8];
      T.s9 = parseInt(T.s9) + XIEN_UP_BONUS[xien][9];

      T.s7mi = parseInt(T.s7mi) + MIN_XIEN_UP_STATUS[xien][0];
      T.s8mi = parseInt(T.s8mi) + MIN_XIEN_UP_STATUS[xien][1];
      T.s9mi = parseInt(T.s9mi) + MIN_XIEN_UP_STATUS[xien][2];

      T.s7mx = parseInt(T.s7mx) + MAX_XIEN_UP_STATUS[xien][0];
      T.s8mx = parseInt(T.s8mx) + MAX_XIEN_UP_STATUS[xien][1];
      T.s9mx = parseInt(T.s9mx) + MAX_XIEN_UP_STATUS[xien][2];

      if (tmpBonusExpected != stepperGet(bonusNS)) {
        // LV가 아니라 레벨업 횟수로 센다(LV1 시작이면 같은 값이고, 로아미니나 스탯 편집 후에도 어긋나지 않는다)
        _bonusPoints = Math.floor((parseInt(T.tlvup) + 1) * stepperGet(bonusNS) / 100);
      }
      var bonusExpected = Number(stepperGet(bonusNS));
      T.tlvup = String(parseInt(T.tlvup) + 1);
      if ((_bonusPoints + 1) * 100 <= parseInt(T.tlvup) * bonusExpected || bonusExpected == 100) {
        _bonusPoints++;
        T.tbonus = String(parseInt(T.tbonus) + 1);

        T.s0 = parseInt(T.s0) + XIEN_RANDOM_UP_BONUS[xien][0];
        T.s1 = parseInt(T.s1) + XIEN_RANDOM_UP_BONUS[xien][1];
        T.s2 = parseInt(T.s2) + XIEN_RANDOM_UP_BONUS[xien][2];
        T.s3 = parseInt(T.s3) + XIEN_RANDOM_UP_BONUS[xien][3];
        T.s4 = parseInt(T.s4) + XIEN_RANDOM_UP_BONUS[xien][4];
        T.s5 = parseInt(T.s5) + XIEN_RANDOM_UP_BONUS[xien][5];
        T.s6 = parseInt(T.s6) + XIEN_RANDOM_UP_BONUS[xien][6];
      }
      tmpBonusExpected = Number(stepperGet(bonusNS));

      clampStatus();

      T.s11 = String(parseInt(T.s11) + BONUS_STATUS_POINT[parseInt(T.lv) - 1]);
      logging();
      stLog[parseInt(T.lv) - 1] = '';
      for (var l = 0; l < parseInt(T.lv); l++) {   // LV < MAX_LEVEL 일 때만 오므로 반복 한도를 세지 않는다
        tmpStLog[l] = stLog[l];
      }
      if (logindex > 0) {
        var l1 = log[logindex], l2 = log[logindex - 1];
        l2[1] = l1[1];
        l2[2] = l1[2];
        log[logindex][77] = stLog[parseInt(T.lv) - 1].length;
      }
      return true;
    }
    // for (i = 0; i < 10; i++) { if (sArray[i] > MAX_STATUS[i]) sArray[i] = MAX_STATUS[i]; }  (lvup, stup 공통)
    function clampStatus() {
      for (var i = 0; i < 10; i++) {
        var id = ctl(S_IDS, i);
        if (parseInt(T[id]) > MAX_STATUS[i]) {
          T[id] = MAX_STATUS[i];
        }
      }
    }
    // 투자했으면 true (포인트 부족·상한이라 그냥 돌아가면 false. 이때는 아무것도 바꾸지 않는다)
    function stup(s) {
      var su = STATUS_UP[s];
      var sid = ctl(S_IDS, s), pid = ctl(P_IDS, s);

      if (parseInt(T[pid]) > parseInt(T.s11)
          || parseInt(T[sid]) >= MAX_STATUS[s]) {
        return false;
      }
      work();

      T.s11 = String(parseInt(T.s11) - parseInt(T[pid]));
      T[sid] = String(parseInt(T[sid]) + 1);

      T.s7 = String(parseInt(T.s7) + su[0]);
      T.s8 = String(parseInt(T.s8) + su[1]);
      T.s9 = String(parseInt(T.s9) + su[2]);

      T.s7mi = String(parseInt(T.s7mi) + su[0]);
      T.s8mi = String(parseInt(T.s8mi) + su[1]);
      T.s9mi = String(parseInt(T.s9mi) + su[2]);

      T.s7mx = String(parseInt(T.s7mx) + su[0]);
      T.s8mx = String(parseInt(T.s8mx) + su[1]);
      T.s9mx = String(parseInt(T.s9mx) + su[2]);

      clampStatus();

      logging();
      stLogging(String(s));
      return true;
    }
    // 대시: 포인트가 모자라면 레벨업하면서, 비용 단계가 바뀔 때까지 그 스탯에 투자한다
    function stdup(n) {
      var len = MAX_STATUS[n], mxlv = MAX_LEVEL, mxst = MAX_STATUS[n];
      var sid = ctl(S_IDS, n);

      var p = Math.floor((parseInt(T.lv) + parseInt(T[sid]) * 5) / 125);
      var pp = p;

      while (pp == p && parseInt(T[sid]) < len
          && (parseInt(T.lv) < mxlv || parseInt(T.s11) >= parseInt(T[ctl(P_IDS, n)]))) {
        tick();
        while (parseInt(T.lv) < mxlv && parseInt(T.s11) < parseInt(T[ctl(P_IDS, n)])) {
          tick();
          lvup();
        }
        if (pp == Math.floor((parseInt(T.lv) + parseInt(T[sid]) * 5) / 125)
            && parseInt(T[sid]) < mxst) {
          stup(n);
        }
        p = Math.floor((parseInt(T.lv) + parseInt(T[sid]) * 5) / 125);
      }
    }
    function reset() {
      initXien(charCB.idx, styleCB.idx);
      initStatus(charCB.idx, styleCB.idx, xienCB.idx);
    }
    // 되돌린 지점의 stLog 를 tmpStLog 에서 되살린다 (back, dashBack, progress, dashProgress 공통 끝부분)
    function restoreStLog() {
      var l = parseInt(T.lv) - 1;
      // 원본: for (i = 0; i < l + 2; i++) stLog[i] = tmpStLog[i];
      // 0 ~ l+1 칸을 tmpStLog 와 같게 만드는데, 값이 있는 칸만 옮기고 tmpStLog 에 값이 없는 칸은 stLog 에서도 지운다.
      // 원본은 그 칸에 undefined 를 넣지만 원본 논리는 빈 칸과 undefined 칸을 구별하지 않는다(in·length·키 나열을 쓰지 않는다).
      // LV 가 아주 큰 상태에서도 되돌리기가 레벨 수만큼 돌지 않게 하려는 것이다(2026-11 부터 Status 줄의 LV 는 상한으로 읽으므로
      // 로그로는 그렇게 되지 않는다. 손으로 고친 저장 상태 같은 것에 대한 대비로 둔다).
      var n = l + 2;
      if (n > 0) {
        eachIndexKey(stLog, n, function (i) { if (tmpStLog[i] === undefined) delete stLog[i]; });
        eachIndexKey(tmpStLog, n, function (i) { if (tmpStLog[i] !== undefined) stLog[i] = tmpStLog[i]; });
      }
      if (tmpStLog[l].length > log[logindex][77]) {
        stLog[l] = String(stLog[l]).substr(0, parseInt(log[logindex][77]));
      }
      stLog[l + 1] = '';
    }
    function back() {
      if (logindex > 0) {
        logindex--;

        setLog();
        restoreStLog();
      }
    }
    function dashBack() {
      if (logindex < 1) {
        return;
      }

      var tmp1 = coerceS(log[logindex - 1][1]), tmp2 = coerceS(log[logindex - 1][2]), tmp3 = '', tmp4 = 0;
      var i;

      for (i = logindex; i > 0; i--) {
        tick();
        if (tmpStLog[parseInt(log[i][0]) - 1].length > 0) {
          tmp3 = String(tmpStLog[parseInt(log[i][0]) - 1]).substr(parseInt(log[i][77]) - 1, 1);
          tmp4 = Math.floor((parseInt(log[logindex - 1][0]) + parseInt(log[logindex - 1][6 + parseInt(tmp3)]) * 5) / 125);
          break;
        }
      }
      for (i = logindex; logindex > 0 && log[logindex - 1][1] == tmp1 && log[logindex - 1][2] == tmp2; logindex--) {
        tick();
        if (log[logindex][77] > 0 && String(tmpStLog[parseInt(log[logindex][0]) - 1]).substr(parseInt(log[logindex][77]) - 1, 1) != tmp3) {
          break;
        }
        // log[0](시작/스탯 편집 상태)은 스탯을 찍은 조작이 아니므로 보지 않는다
        if (logindex > 1 && log[logindex - 1][77] > 0 && Math.floor((parseInt(log[logindex - 1][0]) + parseInt(log[logindex - 1][6 + parseInt(tmp3)]) * 5) / 125) != tmp4) {
          break;
        }
      }

      setLog();
      restoreStLog();
    }
    function progress() {
      if (log[logindex + 1][0] > 0) {
        logindex++;

        setLog();
        restoreStLog();
      }
    }
    function dashProgress() {
      if (log[logindex + 1][0] < 1) {
        return;
      }
      logindex++;

      var tmp1 = coerceS(log[logindex][1]), tmp2 = coerceS(log[logindex][2]), tmp3 = '', tmp4 = 0;
      var i;

      for (i = logindex; log[i + 1][0] > 0; i++) {
        tick();
        if (log[i][77] > 0) {
          tmp3 = String(tmpStLog[parseInt(log[i][0]) - 1]).substr(parseInt(log[i][77]) - 1, 1);
          tmp4 = Math.floor((parseInt(log[logindex - 1][0]) + parseInt(log[logindex - 1][6 + parseInt(tmp3)]) * 5) / 125);
          break;
        }
      }
      for (i = logindex; log[logindex + 1][0] > 0 && log[logindex][1] == tmp1 && log[logindex][2] == tmp2; logindex++) {
        tick();
        if (tmp3 != '' && log[logindex + 1][77] > 0 && String(tmpStLog[parseInt(log[logindex + 1][0]) - 1]).substr(parseInt(log[logindex + 1][77]) - 1, 1) != tmp3) {
          break;
        }
        if (log[logindex][77] > 0 && Math.floor((parseInt(log[logindex][0]) + parseInt(log[logindex][6 + parseInt(tmp3)]) * 5) / 125) != tmp4) {
          break;
        }
      }

      setLog();
      restoreStLog();
    }

    function stLogging(s) {
      stLog[parseInt(T.lv) - 1] += s;
      tmpStLog[parseInt(T.lv) - 1] = stLog[parseInt(T.lv) - 1];
      log[logindex][77] = stLog[parseInt(T.lv) - 1].length;
    }
    function logging() {
      var l = log, x = _xi;
      logindex++;

      l[logindex] = [parseInt(T.lv), xienCB.item.data, stepperGet(bonusNS),
        parseInt(T.tbonus), parseInt(T.tlvup), _bonusPoints,
        parseInt(T.s0), parseInt(T.s1), parseInt(T.s2), parseInt(T.s3),
        parseInt(T.s4), parseInt(T.s5), parseInt(T.s6), parseInt(T.s7),
        parseInt(T.s8), parseInt(T.s9), 0, parseInt(T.s11),
        parseInt(T.s7mi), parseInt(T.s8mi), parseInt(T.s9mi), 0,
        parseInt(T.s7mx), parseInt(T.s8mx), parseInt(T.s9mx), 0,
        x[0], x[1], x[2], x[3], x[4], x[5], x[6], x[7], x[8], x[9], x[10], x[11], x[12], x[13],
        x[14], x[15], x[16], x[17], x[18], x[19], x[20], x[21], x[22], x[23], x[24], x[25], x[26], x[27], x[28], x[29],
        x[30], x[31], x[32], x[33], x[34], x[35], x[36], x[37], x[38], x[39], x[40], x[41], x[42], x[43], x[44], x[45], x[46], x[47], x[48], x[49],
        tmpBonusExpected,
        0];

      // 센티널: 77칸, [0] = 0, [76] = 1 (원본 리터럴 그대로. [77] 은 없다)
      var sentinel = fillArray(77, 0);
      sentinel[76] = 1;
      l[logindex + 1] = sentinel;
      stLog[parseInt(T.lv)] = '';
      tmpStLog[parseInt(T.lv)] = '';
    }
    function setLog() {
      var l = log[logindex], x = _xi;

      T.lv = l[0];
      for (var i = 0; i < xienList.length; i++) {
        if (itemAt(xienList, i).data == l[1]) {
          comboSet(xienCB, i);
        }
      }
      stepperSet(bonusNS, l[2]);
      T.tbonus = l[3];
      T.tlvup = l[4];
      _bonusPoints = Number(l[5]);
      T.s0 = l[6];
      T.s1 = l[7];
      T.s2 = l[8];
      T.s3 = l[9];
      T.s4 = l[10];
      T.s5 = l[11];
      T.s6 = l[12];
      T.s7 = l[13];
      T.s8 = l[14];
      T.s9 = l[15];
      T.s11 = l[17];
      T.s7mi = l[18];
      T.s8mi = l[19];
      T.s9mi = l[20];
      T.s7mx = l[22];
      T.s8mx = l[23];
      T.s9mx = l[24];
      // x[0] = l[26]; … x[49] = l[75];
      for (var k = 0; k < 50; k++) x[k] = l[26 + k];

      tmpBonusExpected = Number(l[76]);
      // 계열별 주력 조건(_needXien)은 로그에 없으므로 되돌린 Xien으로 다시 구한다
      updateNeedXien();
    }

    // "LV  12" / "LV  12 -  15" 의 레벨 칸 (logOut 이 같은 모양을 네 군데서 쓴다)
    function lvField(startLv, i) {
      var t = 'LV ';
      if (startLv < 100) t += ' ';
      if (startLv < 10) t += ' ';
      t += String(startLv);
      if (startLv == i) {
        t += '       : ';
      } else {
        t += ' - ';
        if (i < 100) t += ' ';
        if (i < 10) t += ' ';
        t += i + ' : ';
      }
      return t;
    }
    // 같은 레벨 묶음의 투자 순서 "STAB * 2, AGI" (logOut 이 두 군데서 쓴다)
    function summaryText(pattern) {
      var t = '';
      var summrySt = parseInt(pattern.substr(0, 1));
      var summryCnt = 0;
      var len = pattern.length;
      for (var m = 0; m < len; m++) {
        if (STATUS_NAME[summrySt] == undefined) {
          summrySt = parseInt(pattern.substr(m + 1, 1));
          continue;
        }
        if (summrySt == parseInt(pattern.substr(m, 1))) {
          summryCnt++;
        } else {
          t += STATUS_NAME[summrySt];
          if (summryCnt > 1) {
            t += ' * ' + summryCnt;
          }
          summryCnt = 1;
          t += ', ';
          summrySt = parseInt(pattern.substr(m, 1));
        }
        if (m == len - 1) {
          t += STATUS_NAME[summrySt];
          if (summryCnt > 1) {
            t += ' * ' + summryCnt;
          }
        }
      }
      return t;
    }

    function logOut() {
      var c = charCB.idx;
      var s = styleCB.idx;
      var l = log;
      var lis = 0;
      var lie = 0;
      var sl = stLog;
      var logtxt = '';
      var gokuburi = false;
      var gokuburiSt = -1;
      var gokuburiCnt = 0;
      var summry = false;
      var pattern = '-';
      var startLv = 0;
      var bonusXienTXT = '';
      var len = 0;
      var min = 1;
      var i, a, plis, len2, bonusXienFlag, cnt, renzoku, m;
      if (c == 15) {
        min = 200;
      }

      if ((String(sl[l[0][0] - 1]).substr(0, 1)) == 's') {
        a = l[0];
        logtxt += 'Status       : ' + a.join(', ') + '\r';
        min = Number(l[0][0]);

        // 편집한 레벨에서 찍은 스탯도 출력한다
        while (lie < logindex && l[lie + 1][0] == min) {
          tick();
          lie++;
        }
        lis = 1;
        if (String(sl[min - 1]).length > 1) {
          summry = true;
          pattern = coerceS(sl[min - 1]);
          startLv = min;
        }
      } else if (sl[0] == undefined || String(sl[0]).length == 0) {
        logtxt += 'LV ';

        if (l[0][0] < 100) {
          logtxt += ' ';
        }
        if (l[0][0] < 10) {
          logtxt += ' ';
        }
        logtxt += l[0][0] + '       :\r';
        logtxt += 'Bonus        : ' + l[0][2] + '%\r';
        logtxt += 'Xien         : ' + XIEN_NAME[l[0][1]] + '\r';
      }

      len = parseInt(T.lv);
      for (i = min; i < len; i++) {
        tick();
        plis = lis;
        lie++;
        lis = lie;
        // 되돌리기(←)로 취소한 조작은 넣지 않는다
        len2 = logindex + 1;
        try {
          while (len2 > lie + 1 && l[lie + 1][0] == i + 1) {
            tick();
            lie++;
          }
          bonusXienTXT = '';
          // 비교할 이전 레벨이 없는 첫 회는 건너뛴다(스탯 편집이 LV1이어도 되도록 i != 1 대신 plis로 판정)
          if (plis > 0 && l[lis][0] != 0 && l[lis - 1][2] != l[plis - 1][2]) {
            bonusXienTXT += 'Bonus        : ' + l[lis - 1][2] + '%\r';
          }
          if (plis > 0 && l[lis][0] != 0 && l[lis - 1][1] != l[plis - 1][1]) {
            bonusXienTXT += 'Xien         : ' + XIEN_NAME[l[lis - 1][1]] + '\r';
          }
        } catch (e) {
          // 원본도 여기서는 모든 예외를 삼킨다(반복 한도를 넘었으면 바깥 tick()에서 다시 걸린다)
        }

        bonusXienFlag = false;
        if (plis > 0) {
          bonusXienFlag = ((l[plis - 1][1] != l[lis - 1][1]) || (l[plis - 1][2] != l[lis - 1][2])) && (l[lis][0] != 0);
        }
        cnt = 0;
        renzoku = true;
        len2 = String(sl[i]).length;

        for (m = 0; m < len2; m++) {
          if (String(sl[i]).substr(m, 1) != String(sl[i]).substr(0, 1)) {
            renzoku = false;
            break;
          }
          cnt++;
        }
        if (gokuburi) {
          if (renzoku && (len2 == 0 || gokuburiSt == parseInt(String(sl[i]).substr(0, 1))) && bonusXienFlag == false
              && parseInt(l[lie][17]) < Math.floor((parseInt(l[lie][6 + gokuburiSt]) * 5 + i + 1) / 125 + parseInt(DEFAULT_NEED_POINT[c][s][gokuburiSt]))) {
            gokuburiCnt += cnt;
            continue;
          } else {
            gokuburi = false;
            logtxt += lvField(startLv, i);
            logtxt += STATUS_NAME[gokuburiSt] + ' ' + W.allin + ' ' + gokuburiCnt + W.times + '\r' + bonusXienTXT;   // "STAB 몰빵 28회"
          }
        }
        if (summry) {
          if (pattern == String(sl[i]) && bonusXienFlag == false) {
            continue;
          } else {
            summry = false;
            logtxt += lvField(startLv, i);
            logtxt += summaryText(pattern);
            logtxt += '\r' + bonusXienTXT;
            pattern = '-';
          }
        }
        gokuburiSt = parseInt(String(sl[i]).substr(0, 1));
        if (renzoku
            && parseInt(l[lie][17]) < Math.floor((parseInt(l[lie][6 + gokuburiSt]) * 5 + i + 1) / 125 + parseInt(DEFAULT_NEED_POINT[c][s][gokuburiSt]))) {
          gokuburi = true;
          summry = false;
          gokuburiCnt = cnt;
          startLv = i + 1;
          continue;
        } else {
          summry = true;
          pattern = coerceS(sl[i]);
          startLv = i + 1;
        }
      }

      if (gokuburi) {
        logtxt += lvField(startLv, i);
        logtxt += STATUS_NAME[gokuburiSt] + ' ' + W.allin + ' ' + gokuburiCnt + W.times + '\r';
      }
      if (summry) {
        logtxt += lvField(startLv, i);
        logtxt += summaryText(pattern);
        logtxt += '\r';
      }

      logtxt += charCB.item.label + '/' + styleCB.item.label;
      logtxt += ' Bonus: ' + T.tbonus + ' / ' + T.tlvup + ' Point: ' + T.s11 + '\r';
      logtxt += 'LV:' + T.lv + ' STAB ' + T.s0 + ' HACK ' + T.s1 + ' INT ' + T.s2;
      logtxt += ' DEF ' + T.s3 + ' MR ' + T.s4;
      logtxt += ' DEX ' + T.s5 + ' AGI ' + T.s6;

      logText = asText(logtxt);
    }

    // 원본에 없는 것(importLog 의 capped): 읽을 글에 지금 상한을 넘는 값이 있는가. logLoad 가 나눈 줄(lines)을 logLoad 와 같은
    // 방법(split, AS3 parseInt)으로 본다. 다음 줄이 하나라도 있으면 그렇다.
    //  - LV 줄: 시작 레벨이나 끝 레벨이 MAX_LEVEL 보다 크다
    //  - 항목 수가 맞는(78/46) Status 줄: LV(0번)가 MAX_LEVEL 보다, 또는 일곱 스탯(6~12번) 가운데 하나가 MAX_STATUS 보다 크다
    //  - LV: 요약 줄(logOut 이 끝에 쓰는 "LV:170 STAB 285 HACK 4 …"): 줄 머리(첫 ':' 앞)가 "LV" 하나이고, ':' 뒤를 공백으로 나눈 낱말의
    //    1·3·…·13번 칸이 SUMMARY_STATS 이다. 0번 칸(LV)이 MAX_LEVEL 보다, 또는 이름 바로 뒤 칸(2·4·…·14번, 스탯)이 MAX_STATUS 보다 크다.
    //    상한이 285이던 판에서 LV 256 전에 스탯이 255를 넘은 계획(몰빵 등)은 LV 줄도 Status 줄도 상한 안이라 이 줄로만 알 수 있다
    //    (읽기는 이 줄을 쓰지 않는다. 그 스탯은 다시 찍을 때 상한에서 멈춘다)
    // 글의 성질이라 읽기가 중간에 멈춰도(error) 같은 값이다. 상태는 바꾸지 않는다
    var SUMMARY_STATS = ['STAB', 'HACK', 'INT', 'DEF', 'MR', 'DEX', 'AGI'];   // logOut 이 LV: 요약 줄에 쓰는 스탯 이름(그 순서)
    function overCap(lines) {
      var i, k, token, tag, a, w, named;
      for (i = 0; i < lines.length; i++) {
        token = String(lines[i]).split(':');
        tag = coerceS(token[0]);
        if (tag.split(' ')[0] == 'LV') {
          if (parseInt(coerceS(tag.split(' ')[1])) > MAX_LEVEL || parseInt(coerceS(tag.split(' ')[3])) > MAX_LEVEL) {
            return true;
          }
        }
        if (tag == 'LV') {
          w = String(token[1]).split(' ');
          named = true;
          for (k = 0; k < 7; k++) {
            if (w[1 + 2 * k] != SUMMARY_STATS[k]) {
              named = false;
            }
          }
          if (named) {
            if (parseInt(w[0]) > MAX_LEVEL) {
              return true;
            }
            for (k = 0; k < 7; k++) {
              if (parseInt(w[2 + 2 * k]) > MAX_STATUS[k]) {
                return true;
              }
            }
          }
        }
        if (tag.split(' ')[0] == 'Status') {
          a = replaceText(String(token[1]), ' ', '').split(',');
          if (a.length == 78 || a.length == 46) {
            if (parseInt(a[0]) > MAX_LEVEL) {
              return true;
            }
            for (k = 0; k < 7; k++) {
              if (parseInt(a[6 + k]) > MAX_STATUS[k]) {
                return true;
              }
            }
          }
        }
      }
      return false;
    }

    function logLoad(flags) {
      var logorg = replaceText(replaceText(replaceText(logText, '\uFF0C', ','), '\uFF1A', ':'), '\uFF0D', '-');
      var logtxt = [];
      var line = 0;
      var len = 0;
      var charName = CHAR_NAME;
      var i, l, m, n, k, len2, charFound, str, token, tok0, tag0, nst, logline, tag, num, startLv, endLv,
        st, cnt, did, token2, token3, x, a, la;

      // 줄로 나누면서 줄 머리 공백을 떼고, 공백 여러 개를 하나로 줄인다
      logtxt[line] = '';
      len = logorg.length;
      for (i = 0; i < len; i++) {
        if (logorg.substr(i, 1) == '\r') {
          line++;
          logtxt[line] = '';
          while (i + 1 < len && logorg.substr(i + 1, 1) == ' ') {
            i++;
          }
          continue;
        } else {
          logtxt[line] += logorg.substr(i, 1);
        }
        while (i + 1 < len && logorg.substr(i, 1) == ' ' && logorg.substr(i + 1, 1) == ' ') {
          i++;
        }
      }
      // 원본에 없는 것: 상한을 넘는 값이 있는 글인가(importLog 의 capped). 읽기 전에 글만 본다
      if (flags) flags.capped = overCap(logtxt);

      // 푸터("캐릭터/타입 Bonus: …")로 캐릭터와 타입을 고른다
      len = logtxt.length;
      len2 = charName.length;
      charFound = false;
      for (i = 0; i < len; i++) {
        str = replaceText(logtxt[i], ' ', '');
        token = str.split('/');

        for (l = 0; l < len2; l++) {
          if (String(token[0]) == charName[l]) {
            changeChar(l);
            charFound = true;
            if (flags) flags.charFound = true;

            if (String(token[1]).substr(0, String(STYLE_NAME[l][0]).length) == STYLE_NAME[l][0]) {
              changeStyle(0);
              if (flags) flags.typeFound = true;
              i = logtxt.length;
              break;
            }
            if (String(token[1]).substr(0, String(STYLE_NAME[l][1]).length) == STYLE_NAME[l][1]) {
              changeStyle(1);
              if (flags) flags.typeFound = true;
              i = logtxt.length;
              break;
            }
            if (String(token[1]).substr(0, String(STYLE_NAME[l][2]).length) == STYLE_NAME[l][2]) {
              changeStyle(2);
              if (flags) flags.typeFound = true;
              i = logtxt.length;
              break;
            }
            i = logtxt.length;
            break;
          }
        }
      }
      if (charFound == false) {
        // 캐릭터/타입 줄이 없어도 지금 캐릭터/타입의 초기 상태부터 읽는다
        for (i = 0; i < len; i++) {
          // 읽을 수 있는 줄(LV n : ... / 항목 수가 맞는 Status)이 있을 때만
          tok0 = String(logtxt[i]).split(':');
          tag0 = String(tok0[0]).split(' ');
          nst = replaceText(String(tok0[1]), ' ', '').split(',').length;
          if ((tok0.length > 1 && tag0[0] == 'LV' && isNaN(parseInt(tag0[1])) == false)
              || (tag0[0] == 'Status' && (nst == 78 || nst == 46))) {
            if (flags) flags.reset = true;
            reset();
            break;
          }
        }
      }

      for (i = 0; i < logtxt.length; i++) {
        logline = String(logtxt[i]);
        token = logline.split(':');
        tag = coerceS(token[0]);

        if (tag == 'undefined' && tag == '') {
          continue;
        }

        if (tag.split(' ')[0] == 'LV') {
          num = '';
          startLv = NaN;   // var startLv:Number = undefined → NaN
          endLv = NaN;

          num = coerceS(tag.split(' ')[1]);
          if (isNaN(parseInt(num)) == false) {
            startLv = parseInt(num);
            endLv = startLv;
          }
          num = coerceS(tag.split(' ')[3]);
          if (isNaN(parseInt(num)) == false) {
            endLv = parseInt(num);
          }
          // 원본의 st 배열(이 줄에서 레벨마다 찍을 스탯 순서)을 [스탯, 횟수] 묶음으로 든다. "STAB * 2000" 을 2000칸으로
          // 늘어놓지 않는다. 같은 스탯이 이어지는 칸은 한 묶음이고, 실행 결과는 같다(아래 레벨 반복 참고)
          st = [];

          token2 = String(token[1]).split(',');
          len = token2.length;

          for (l = 0; l < len; l++) {
            if (String(token2[l]).substr(0, 1) != ' ') {
              token2[l] = ' ' + token2[l];
            }
            token3 = String(token2[l]).split(' ');

            for (m = 0; m < 7; m++) {
              if (token3[1] == STATUS_NAME[m]) {
                // 원본은 여기서 st[stindex] = m 을 쓰지만, 몰빵이면 그 칸은 세지 않고 이 줄의 읽기를 끝낸다

                // "STAB 몰빵 28회": 매 레벨 그 스탯에 살 수 있는 만큼 전부 투자
                if (token3.length > 2 && token3[2] == W.allin) {
                  for (n = startLv; n < endLv + 1; n++) {
                    tick();
                    did = lvup();
                    upPoints();

                    while (parseInt(T[ctl(S_IDS, m)]) < MAX_STATUS[m]
                        && parseInt(T.s11) >= parseInt(T[ctl(P_IDS, m)])) {
                      tick();
                      stup(m);   // 이 조건(stup 의 거절 조건의 반대)이면 늘 투자된다
                      did = true;
                      upPoints();
                    }
                    // 최고 레벨에서 한 바퀴 동안 아무것도 바뀌지 않았으면 남은 바퀴도 모두 같다(맨 위 안전장치)
                    if (!did && parseInt(T.lv) >= MAX_LEVEL) break;
                  }
                  startLv = endLv + 1;
                  l = token2.length;
                  break;
                }

                // "STAB * 3": 원본은 for (n = 1; n < parseInt(num); n++) { stindex++; st[stindex] = m; } 로 n-1 칸을 더 넣는다
                cnt = 1;
                if (token3.length > 3 && token3[2] == '*') {
                  num = coerceS(token3[3]);
                  if (isNaN(parseInt(num)) == false && parseInt(num) > 1) {
                    cnt += parseInt(num) - 1;   // parseInt 는 정수(또는 Infinity)를 낸다
                  }
                }
                if (st.length > 0 && st[st.length - 1][0] === m) st[st.length - 1][1] += cnt;
                else st.push([m, cnt]);
                break;
              }
            }
          }
          for (l = startLv; l < endLv + 1; l++) {
            tick();
            did = false;
            // 시작 레벨(LV1/로아미니/스탯 편집한 레벨)에서는 레벨업하지 않는다
            if (l != log[0][0]) {
              did = lvup();
            }
            upPoints();

            // 원본: for (m = 0; m < stindex; m++) { stup(parseInt(st[m])); upPoints(); }
            for (m = 0; m < st.length; m++) {
              for (k = 0; k < st[m][1]; k++) {
                tick();
                if (!stup(st[m][0])) {
                  // 거절된 stup 은 아무것도 바꾸지 않고 upPoints 도 같은 값을 다시 쓸 뿐이므로, 같은 스탯이 이어지는
                  // 나머지 칸도 모두 거절된다(원본은 그 칸들을 하나씩 돈다)
                  upPoints();
                  break;
                }
                did = true;
                upPoints();
              }
            }
            // 최고 레벨에서 한 바퀴 동안 아무것도 바뀌지 않았으면 남은 바퀴도 모두 같다(맨 위 안전장치)
            if (!did && parseInt(T.lv) >= MAX_LEVEL) break;
          }
        }
        if (tag.split(' ')[0] == 'Bonus') {
          num = replaceText(String(token[1]).split(' ')[1], '%', '');
          if (isNaN(parseInt(num)) == false) {
            stepperSet(bonusNS, parseInt(num));   // 같은 프레임 안에서는 반올림·클램프 전 값으로 읽힌다
          }
        }
        if (tag.split(' ')[0] == 'Xien') {
          // 이름에 띄어쓰기가 있어도 되도록 ':' 뒤 전체에서 앞뒤 공백만 떼고 비교한다.
          // 이름 뒤에 공백을 두고 붙인 메모는 무시한다(일본어판 파서도 받던 형식)
          x = String(token[1]).replace(AS3_TRIM, '');
          len = XIEN_NAME.length;

          for (l = 0; l < len; l++) {
            if (x == XIEN_NAME[l] || x.indexOf(XIEN_NAME[l] + ' ') == 0) {
              changeXien(l);
            }
          }
        }
        if (tag.split(' ')[0] == 'Status') {
          a = replaceText(String(token[1]), ' ', '').split(',');
          // 78개: 현재 형식 / 46개: Xien이 20계열이던 시절의 형식
          if (a.length == 78 || a.length == 46) {
            logindex = -1;
            logging();
            la = log[logindex];
            len = la.length;
            for (l = 0; l < len; l++) {
              if (l < a.length) {
                la[l] = parseInt(a[l]);
              } else {
                la[l] = 0;
              }
            }
            if (a.length == 46) {
              la[76] = la[2];
            }
            // 지금 상한을 넘는 LV와 일곱 스탯은 상한으로 읽는다. 상한이 285이던 판에서 스탯 편집 창으로 만든 로그도
            // 이 판(2026-11부터 상한 255)의 계획이 된다. 상한이 바뀐 이 여덟 칸만 보고, 상한 이하의 값과 수가 아닌 값은 그대로다
            if (la[0] > MAX_LEVEL) {
              la[0] = MAX_LEVEL;
            }
            for (m = 0; m < 7; m++) {
              if (la[6 + m] > MAX_STATUS[m]) {
                la[6 + m] = MAX_STATUS[m];
              }
            }
            la[77] = 1;
            stLog[la[0] - 1] = 's';
            tmpStLog[la[0] - 1] = 's';
            stLog[la[0]] = '';
            tmpStLog[la[0]] = '';
            setLog();
          }
        }
      }
      logOut();
    }

    function recipe() {
      var l = log, sl = stLog, rtxt = '', lis = 0, lie = 0,
        plis = 0, st = -1, len = 0, bonusXien = '',
        bonusXienFlag = false, bonusLv = 2, opt = '';
      var min, i, bx, sll, len2, adj, m, lvupFlag, num;
      var dnp = function () { return DEFAULT_NEED_POINT[charCB.idx][styleCB.idx]; };

      rtxt = W.gStat + '\r';
      rtxt += W.gChar;
      rtxt += charCB.item.label;
      rtxt += '\r' + W.gType;
      rtxt += styleCB.item.label;
      rtxt += '\r[LV] ';
      rtxt += T.lv;
      rtxt += '\r[STAB] ';
      rtxt += T.s0;
      rtxt += '\r[HACK] ';
      rtxt += T.s1;
      rtxt += '\r[INT] ';
      rtxt += T.s2;
      rtxt += '\r[DEF] ';
      rtxt += T.s3;
      rtxt += '\r[MR] ';
      rtxt += T.s4;
      rtxt += '\r[DEX] ';
      rtxt += T.s5;
      rtxt += '\r[AGI] ';
      rtxt += T.s6;
      rtxt += '\r[HP] ';
      rtxt += T.s7;
      rtxt += '\r[MP] ';
      rtxt += T.s8;
      rtxt += '\r[SP] ';
      rtxt += T.s9;
      rtxt += '\r' + W.gBonus;
      rtxt += T.pbonus;
      rtxt += '\r';
      rtxt += '\r' + W.gHelm;
      rtxt += '\r' + W.gWeapon;
      rtxt += '\r' + W.gArmor;
      rtxt += '\r' + W.gShield;
      rtxt += '\r' + W.gHead;
      rtxt += '\r' + W.gBody;
      rtxt += '\r' + W.gHand;
      rtxt += '\r' + W.gLeg;
      rtxt += '\r' + W.gPet;
      rtxt += '\r' + W.gField;
      rtxt += '\r';
      rtxt += '\r';
      rtxt += '\r' + W.gOrder + '\r';

      len = parseInt(T.lv);

      // 시작 레벨(LV1, 로아미니는 LV200)의 다음 레벨부터 읽는다
      min = Number(l[0][0]);
      st = parseInt(String(sl[min]).substr(0, 1));
      if (String(sl[l[0][0] - 1]).substr(0, 1) == 's') {
        rtxt += W.gStart + l[0].join(', ') + ' }\r';
        min = l[0][0] - 1;
        st = parseInt(String(sl[min]).substr(1, 1));
        // 편집한 레벨에서 찍지 않았으면 평소처럼 다음 레벨부터 읽는다
        if (String(sl[min]).length < 2) {
          min = Number(l[0][0]);
          st = parseInt(String(sl[min]).substr(0, 1));
        }
      }

      for (i = min; i < len; i++) {
        tick();
        if (l[lie + 1][0] == 0) {
          break;
        }

        plis = lis;
        lis = lie + 1;
        lie = lis;
        while (lie < l.length - 1 && l[lie][0] == l[lie + 1][0]) {
          tick();
          lie++;
        }

        if (lis == 1 || l[lis - 1][2] != l[plis - 1][2] || l[lis - 1][1] != l[plis - 1][1]) {
          bonusXienFlag = true;
          bx = '';
          bonusLv = Number(l[lis][0]);

          if (lis == 1 || l[lis - 1][2] != l[plis - 1][2]) {
            bx += ' ' + W.gBonus + l[lis - 1][2] + '%';   // " 보너스 75%"
          }
          if (lis == 1 || l[lis - 1][1] != l[plis - 1][1]) {
            if (bx != '') {
              bx += ',';
            }
            bx += ' ' + XIEN_NAME[l[lis - 1][1]] + W.gMain;   // " 검계 STAB/DEX 주력"
          }
          bonusXien += 'Lv ' + l[lis][0] + W.gFrom + bx + '\r';   // "Lv 22부터 …"

          if (lis == 1) {
            rtxt += bonusXien;
            bonusXienFlag = false;
            bonusXien = '';
          }
        }
        sll = replaceText(String(sl[i]), 's', '');
        len2 = sll.length;
        // 스탯 편집한 레벨은 맨 앞에 레벨업 로그가 없으므로 하나 앞의 로그와 비교한다
        adj = 0;
        if (i == l[0][0] - 1) {
          adj = 1;
        }
        for (m = 0; m < len2; m++) {
          if (bonusXienFlag && bonusLv <= l[lis + m - 1][0]) {
            rtxt += bonusXien;
            bonusXien = '';
            bonusXienFlag = false;
          }
          if (isNaN(st) == false && (sll.substr(m, 1) != String(st) || bonusXienFlag)) {
            lvupFlag = 0;
            if (l[lis + m][0] == l[lis + m - 1][0] + 1) {
              lvupFlag = 1;
            }
            rtxt += STATUS_NAME[st] + ' ' + l[lis + m - lvupFlag][6 + st];
            if (m == 0 && sll.substr(m, 1) != String(st)) {
              opt += ', Lv ' + l[lis + m - 1][0];
            }
            if (Math.floor((l[lis + m - adj][6 + st] * 5 + l[lis + m - adj][0]) / 125)
                - Math.floor((l[lis + m - 1 - adj - lvupFlag][6 + st] * 5 + l[lis + m - 1 - adj - lvupFlag][0]) / 125) > 0) {
              num = Number(dnp()[st] + Math.floor((l[lis + m - adj][6 + st] * 5 + l[lis + m - adj][0]) / 125));
              opt += W.gNeed + num;
            }
            // Lv와 필요 포인트는 괄호로 묶어 뒤에 붙인다(opt 맨 앞의 ", "는 뗀다)
            rtxt += W.gUpTo + (opt == '' ? '' : ' (' + opt.substr(2) + ')') + '\r' + bonusXien;
            opt = '';
            bonusXien = '';
            bonusXienFlag = false;
          }
          st = parseInt(sll.substr(m, 1));
        }
      }

      // 마지막 로그는 지금 상태다(되돌리기(←)로 취소한 조작은 넣지 않는다)
      lis = logindex + 1;
      if (bonusXienFlag && bonusLv <= l[lis - 1][0]) {
        rtxt += bonusXien;
        bonusXien = '';
        bonusXienFlag = false;
      }
      if (st != undefined && isNaN(st) == false) {
        lvupFlag = 0;
        if (l[lis - 1][0] == l[lis - 2][0] + 1) {
          lvupFlag = 1;
        }
        rtxt += STATUS_NAME[st] + ' ' + l[lis - 1][6 + st];
        if ((dnp()[st] + Math.floor((l[lis - 1][6 + st] * 5 + l[lis - 1][0]) / 125)) > l[lis - 1 - lvupFlag][17]) {
          opt += ', Lv ' + l[lis - 1 - lvupFlag][0];
        }
        if (Math.floor((l[lis - 1][6 + st] * 5 + l[lis - 1][0]) / 125)
            - Math.floor((l[lis - 2 - lvupFlag][6 + st] * 5 + l[lis - 2 - lvupFlag][0]) / 125) > 0) {
          num = Number(dnp()[st] + Math.floor((l[lis - 1][6 + st] * 5 + l[lis - 1][0]) / 125));
          opt += W.gNeed + num;
        }
        // Lv와 필요 포인트는 괄호로 묶어 뒤에 붙인다(opt 맨 앞의 ", "는 뗀다)
        rtxt += W.gUpTo + (opt == '' ? '' : ' (' + opt.substr(2) + ')') + '\r' + bonusXien;
        opt = '';
      } else {
        rtxt += bonusXien;
      }
      rtxt += '\r\r' + W.gLog + '\r';

      logOut();
      logText = asText(rtxt + logText);
    }

    // =================================================================================
    // 상태 꺼내기·저장
    // =================================================================================

    // 희소 배열 사본(빈 칸, 인덱스가 아닌 키, length 를 그대로). deep 이면 원소 배열도 복사(slice 도 빈 칸을 유지한다)
    function sparseCopy(arr, deep) {
      var out = new Array(arr.length);
      Object.keys(arr).forEach(function (k) {
        out[k] = deep && Array.isArray(arr[k]) ? arr[k].slice() : arr[k];
      });
      return out;
    }
    function itemOut(it) { return it ? { label: it.label, data: it.data } : null; }
    function textsOut() { var o = {}; TEXT_IDS.forEach(function (id) { o[id] = T[id]; }); return o; }

    // 테스트용: 원본과 비교할 수 있는 모양으로 내부 상태를 복사한다 (tests/harness.js 의 rawState 와 같은 모양)
    function debugState(opts) {
      var out = {
        text: textsOut(),
        up: V.up.slice(), dup: V.dup.slice(),
        char: { index: charCB.idx, item: itemOut(charCB.item) },
        style: { index: styleCB.idx, item: itemOut(styleCB.item) },
        xien: { index: xienCB.idx, item: itemOut(xienCB.item) },
        lists: { char: charCB.list.map(itemOut), style: styleCB.list.map(itemOut), xien: xienList.map(itemOut) },
        colors: xienColors.slice(),
        bonus: stepperGet(bonusNS),
        g: {
          _style: sparseCopy(_style), _needXien: sparseCopy(_needXien), _xi: sparseCopy(_xi),
          _bonusPoints: _bonusPoints, logindex: logindex, tmpXien: tmpXien,
          tmpBonusExpected: tmpBonusExpected, tmpx: tmpx, stackLog: stackLog
        },
        log: sparseCopy(log, true),
        stLog: sparseCopy(stLog),
        tmpStLog: sparseCopy(tmpStLog)
      };
      if (!opts || opts.logText !== false) out.logText = logText;
      return out;
    }

    function encArr(arr) { return arr.map(encNum); }
    // 희소 배열: { n: length, e: [[키, 값], …] }. 값 undefined 는 null (빈 칸과 구별하려고 e 에 넣는다)
    function encSparseStr(arr) {
      return {
        n: arr.length,
        e: Object.keys(arr).map(function (k) {
          var v = arr[k];
          if (v !== undefined && typeof v !== 'string') throw new Error('serialize: stLog holds a non-string value');
          return [k, v === undefined ? null : v];
        })
      };
    }
    // log: 원소마다 앞 원소와 다른 칸만 적는다 { k: 키, n: 길이, d: [[칸, 값], …] } (첫 원소는 a: 전체). 빈 칸은 ['hole']
    function encCell(arr, i, v) { return v === undefined && !(i in arr) ? ['hole'] : encNum(v); }
    function encLog(arr) {
      var prev = null;
      return {
        n: arr.length,
        e: Object.keys(arr).map(function (k) {
          var cur = arr[k], i, v, p, same, rec;
          if (!Array.isArray(cur)) throw new Error('serialize: log holds a non-array element');
          if (!prev) {
            var full = new Array(cur.length);
            for (i = 0; i < cur.length; i++) {
              v = cur[i];
              // 유한하고 -0 이 아닌 수는 그대로(대부분), 나머지만 encNum
              full[i] = (typeof v === 'number' && v - v === 0 && (v !== 0 || 1 / v > 0)) ? v : encCell(cur, i, v);
            }
            rec = { k: k, a: full };
          } else {
            var d = [], m = cur.length;   // 길이 n 밖은 되살릴 때 잘린다
            for (i = 0; i < m; i++) {
              v = cur[i]; p = prev[i];
              // Object.is(v, p) 와 같은 판정(NaN 끼리 같고 0 과 -0 은 다르다)
              same = v === p ? (v !== 0 || 1 / v === 1 / p) : (v !== v && p !== p);
              if (same && v === undefined) same = (i in cur) === (i in prev);
              if (!same) d.push([i, encCell(cur, i, v)]);
            }
            rec = { k: k, n: cur.length, d: d };
          }
          prev = cur;
          return rec;
        })
      };
    }

    // 로그 읽기 전후 비교용: logarea 글을 뺀 전체 상태
    function fingerprint() {
      var sv = serialize();
      sv.logText = '';
      return JSON.stringify(sv);
    }

    function serialize() {
      return {
        v: ENGINE_VERSION,
        d: dataHash(C),
        text: textsOut(),
        up: V.up.slice(),
        dup: V.dup.slice(),
        combo: {
          char: { list: charCB.list.map(itemOut), index: charCB.idx, item: itemOut(charCB.item) },
          style: { list: styleCB.list.map(itemOut), index: styleCB.idx, item: itemOut(styleCB.item) },
          xien: { list: xienList.map(itemOut), index: xienCB.idx, item: itemOut(xienCB.item) }
        },
        colors: xienColors.slice(),
        bonus: encNum(stepperGet(bonusNS)),
        logText: logText,
        g: {
          _style: encArr(_style), _needXien: encArr(_needXien), _xi: encArr(_xi),
          _bonusPoints: encNum(_bonusPoints), logindex: encNum(logindex), tmpXien: encNum(tmpXien),
          tmpBonusExpected: encNum(tmpBonusExpected), tmpx: encNum(tmpx), stackLog: stackLog
        },
        log: encLog(log),
        stLog: encSparseStr(stLog),
        tmpStLog: encSparseStr(tmpStLog)
      };
    }

    function restore(sv) {
      var isArr = Array.isArray;
      function arrOf(a, n, check, what) {
        if (!isArr(a) || (n !== null && a.length !== n)) badSave(what);
        a.forEach(function (v) { if (!check(v)) badSave(what); });
        return a;
      }
      function numArr(a, n, what) { return arrOf(a, n, function () { return true; }, what).map(function (v) { return decNum(v, what); }); }
      function listIn(o, what) {
        if (!o || typeof o !== 'object') badSave(what);
        var list = arrOf(o.list, null, function (it) {
          return it && typeof it === 'object' && typeof it.label === 'string' && typeof it.data === 'number';
        }, what + '.list').map(function (it) { return { label: it.label, data: it.data }; });
        if (typeof o.index !== 'number' || o.index !== (o.index | 0)) badSave(what + '.index');
        var item = null;
        if (o.item !== null) {
          if (!o.item || typeof o.item.label !== 'string' || typeof o.item.data !== 'number') badSave(what + '.item');
          var same = list[o.index];
          item = same && same.label === o.item.label && same.data === o.item.data ? same : { label: o.item.label, data: o.item.data };
        }
        return { list: list, idx: o.index, item: item };
      }
      function sparseIn(o, decode, what) {
        if (!o || typeof o !== 'object' || typeof o.n !== 'number' || o.n < 0 || o.n !== Math.floor(o.n) || o.n > 4294967295 || !isArr(o.e)) badSave(what);
        var out = new Array(o.n);
        o.e.forEach(function (rec) { decode(out, rec); });
        if (out.length !== o.n) badSave(what + '.n');
        return out;
      }

      if (!sv.text || typeof sv.text !== 'object') badSave('text');
      TEXT_IDS.forEach(function (id) {
        if (typeof sv.text[id] !== 'string') badSave('text.' + id);
        T[id] = sv.text[id];
      });
      V.up = arrOf(sv.up, 7, function (b) { return typeof b === 'boolean'; }, 'up').slice();
      V.dup = arrOf(sv.dup, 7, function (b) { return typeof b === 'boolean'; }, 'dup').slice();
      if (!sv.combo) badSave('combo');
      var cc = listIn(sv.combo.char, 'combo.char'), sc = listIn(sv.combo.style, 'combo.style'), xc = listIn(sv.combo.xien, 'combo.xien');
      charCB = { list: cc.list, idx: cc.idx, item: cc.item };
      styleCB = { list: sc.list, idx: sc.idx, item: sc.item };
      xienCB = { list: xc.list, idx: xc.idx, item: xc.item };
      xienList = xienCB.list;
      xienColors = arrOf(sv.colors, null, function (v) { return typeof v === 'number'; }, 'colors').slice();
      bonusNS._value = decNum(sv.bonus, 'bonus');
      bonusNS.changed = false;
      if (typeof sv.logText !== 'string') badSave('logText');
      logText = sv.logText;
      var g = sv.g;
      if (!g || typeof g !== 'object') badSave('g');
      _style = numArr(g._style, 20, 'g._style');
      _needXien = numArr(g._needXien, 50, 'g._needXien');
      _xi = numArr(g._xi, 50, 'g._xi');
      _bonusPoints = decNum(g._bonusPoints, 'g._bonusPoints');
      logindex = decNum(g.logindex, 'g.logindex');
      tmpXien = decNum(g.tmpXien, 'g.tmpXien');
      tmpBonusExpected = decNum(g.tmpBonusExpected, 'g.tmpBonusExpected');
      tmpx = decNum(g.tmpx, 'g.tmpx');
      if (typeof g.stackLog !== 'string') badSave('g.stackLog');
      stackLog = g.stackLog;

      var prev = null;
      log = sparseIn(sv.log, function (out, rec) {
        if (!rec || !isNumKey(rec.k)) badSave('log key');
        var cur, i;
        var val = function (v) { return isArr(v) ? null : decNum(v, 'log[' + rec.k + ']'); };
        if (isArr(rec.a)) {
          cur = new Array(rec.a.length);
          for (i = 0; i < rec.a.length; i++) if (!isArr(rec.a[i])) cur[i] = val(rec.a[i]);
        } else {
          if (!prev || typeof rec.n !== 'number' || rec.n < 0 || rec.n > 1000 || rec.n !== Math.floor(rec.n) || !isArr(rec.d)) badSave('log[' + rec.k + ']');
          cur = prev.slice(0, rec.n);   // slice 는 빈 칸을 유지한다
          for (i = 0; i < rec.d.length; i++) {
            var p = rec.d[i];
            if (!isArr(p) || typeof p[0] !== 'number' || p[0] < 0 || p[0] !== Math.floor(p[0]) || p[0] >= rec.n) badSave('log[' + rec.k + '] cell');
            if (isArr(p[1])) delete cur[p[0]]; else cur[p[0]] = val(p[1]);
          }
          cur.length = rec.n;
        }
        out[rec.k] = cur;
        prev = cur;
      }, 'log');
      var strIn = function (what) {
        return function (out, rec) {
          if (!isArr(rec) || !isNumKey(rec[0]) || (rec[1] !== null && typeof rec[1] !== 'string')) badSave(what);
          out[rec[0]] = rec[1] === null ? undefined : rec[1];
        };
      };
      stLog = sparseIn(sv.stLog, strIn('stLog'), 'stLog');
      tmpStLog = sparseIn(sv.tmpStLog, strIn('tmpStLog'), 'tmpStLog');
    }

    // _debugState() 사본에서 그대로 되살린다(검사 없음, 같은 엔진이 만든 값만 받는다)
    function restoreRaw(d) {
      TEXT_IDS.forEach(function (id) { T[id] = d.text[id]; });
      V.up = d.up.slice();
      V.dup = d.dup.slice();
      var comboIn = function (sel, list) {
        list = list.map(function (it) { return { label: it.label, data: it.data }; });
        var item = null;
        if (sel.item) {
          var same = list[sel.index];
          item = same && same.label === sel.item.label && same.data === sel.item.data ? same : { label: sel.item.label, data: sel.item.data };
        }
        return { list: list, idx: sel.index, item: item };
      };
      charCB = comboIn(d.char, d.lists.char);
      styleCB = comboIn(d.style, d.lists.style);
      xienCB = comboIn(d.xien, d.lists.xien);
      xienList = xienCB.list;
      xienColors = d.colors.slice();
      bonusNS._value = d.bonus;
      bonusNS.changed = false;
      logText = d.logText;
      _style = d.g._style; _needXien = d.g._needXien; _xi = d.g._xi;
      _bonusPoints = d.g._bonusPoints; logindex = d.g.logindex; tmpXien = d.g.tmpXien;
      tmpBonusExpected = d.g.tmpBonusExpected; tmpx = d.g.tmpx; stackLog = d.g.stackLog;
      log = d.log; stLog = d.stLog; tmpStLog = d.tmpStLog;
    }

    // =================================================================================
    // 공개 API
    // =================================================================================

    // 사용자 조작 1회: 원본 핸들러를 돌리고 다음 프레임을 커밋한다. 예외는 Flash 처럼 그 핸들러만 멈춘다.
    function act(fn) {
      ticks = 0;
      works = 0;
      version++;
      var error = false;
      try {
        fn();
      } catch (e) {
        error = true;
      }
      _shiftKeyDown = false;
      commitFrame();
      return error;
    }
    function done(r, error) { if (error) r.error = true; return r; }
    function isStatIndex(i) { return typeof i === 'number' && i >= 0 && i <= 6 && i === Math.floor(i); }
    function num(t) { return Number(t); }

    function view() {
      var stats = [], i;
      for (i = 0; i < 7; i++) {
        stats.push({
          key: STATUS_NAME[i],
          value: num(T[S_IDS[i]]),
          cost: num(T[P_IDS[i]]),
          nextStepAt: num(T[S_IDS[i] + 'L']),
          canUp: V.up[i],
          canDash: V.dup[i],
          atCap: parseInt(T[S_IDS[i]]) >= MAX_STATUS[i]
        });
      }
      var chars = [];
      for (i = 0; i < CHAR_NAME.length; i++) {
        chars.push({ name: CHAR_NAME[i], types: STYLE_NAME[i].slice(), startLv: i == 15 ? 200 : 1 });
      }
      var lines = xienList.map(function (it, k) {
        return { x: it.data, name: it.label, selectable: xienColors[k] !== 0x000000 };
      });
      var lv = parseInt(T.lv), levelLog = [];
      var nLevels = lv > 0 ? Math.min(lv, 100000) : 0;
      for (i = 0; i < nLevels; i++) levelLog.push(typeof stLog[i] === 'string' ? stLog[i] : '');
      var next = log[logindex + 1];
      return {
        char: charCB.idx,
        type: styleCB.idx,
        charName: charCB.item ? charCB.item.label : '',
        typeName: styleCB.item ? styleCB.item.label : '',
        chars: chars,
        lv: num(T.lv),
        maxLv: MAX_LEVEL,
        startLv: log[0] ? log[0][0] : NaN,
        point: num(T.s11),
        stats: stats,
        hp: { value: num(T.s7), min: num(T.s7mi), max: num(T.s7mx) },
        mp: { value: num(T.s8), min: num(T.s8mi), max: num(T.s8mx) },
        sp: { value: num(T.s9), min: num(T.s9mi), max: num(T.s9mx) },
        bonus: { rate: stepperGet(bonusNS), achieved: num(T.tbonus), levelUps: num(T.tlvup), effective: T.pbonus },
        xien: { selected: xienCB.item ? xienCB.item.data : null, lines: lines },
        canUndo: logindex > 0,
        canRedo: !!(next && next[0] > 0),
        actions: logindex,
        levelLog: levelLog
      };
    }

    function editSnapshot() {
      var v = stepperGet, lim = function (st) { return [st.minimum, st.maximum, st.stepSize]; };
      var stats = [], slim = [];
      for (var i = 0; i < 7; i++) { stats.push(v(SS[SS_IDS[i]])); slim.push(lim(SS[SS_IDS[i]])); }
      return {
        lv: v(slv), stats: stats, hp: v(SS.ss7), mp: v(SS.ss8), sp: v(SS.ss9), point: v(SS.ss11),
        lines: sxiList.map(function (it, k) { return { x: xienList[k] ? xienList[k].data : undefined, name: it.xienLabel, value: it.xienData }; }),
        limits: { lv: lim(slv), stats: slim, hp: lim(SS.ss7), mp: lim(SS.ss8), sp: lim(SS.ss9), point: lim(SS.ss11) }
      };
    }

    // 글만 만드는 조회(exportLog, guide): 원본의 logOut()/recipe() 를 돌려 그 글을 받되, 로그 상자(logText)는 원래대로 둔다.
    // 둘 다 로그 상자 말고는 아무것도 바꾸지 않으므로(지역 변수만 쓴다) 상태가 그대로다. 예외가 나면 { ok: false }
    function query(fn) {
      var pane = logText, out = { ok: true, text: '' };
      ticks = 0;
      works = 0;
      try {
        out.text = fn();
      } catch (e) {
        out.ok = false;
      }
      logText = pane;
      return out;
    }

    // ---- preview()/previewDash(): 가벼운 사본에서 레벨업·대시를 실제로 돌려 본다 ----
    // 사본에는 lvup()/stup()/stdup() 이 읽는 것만 넣는다. 결과로 내는 값(LV·스탯·POINT·HP/MP/SP·보너스 횟수)은
    // log/stLog 에 기대지 않으므로, 기록은 다음 레벨업이 고쳐 쓰는 지금 칸(log[logindex])만 넣는다.
    function probeState() {
      var lg = [];
      if (log[logindex]) lg[logindex] = log[logindex].slice();
      return {
        text: textsOut(), up: V.up.slice(), dup: V.dup.slice(),
        char: { index: charCB.idx, item: itemOut(charCB.item) },
        style: { index: styleCB.idx, item: itemOut(styleCB.item) },
        xien: { index: xienCB.idx, item: itemOut(xienCB.item) },
        lists: { char: charCB.list.map(itemOut), style: styleCB.list.map(itemOut), xien: xienList.map(itemOut) },
        colors: xienColors.slice(), bonus: stepperGet(bonusNS), logText: '',
        g: {
          _style: _style.slice(), _needXien: _needXien.slice(), _xi: _xi.slice(),
          _bonusPoints: _bonusPoints, logindex: logindex, tmpXien: tmpXien,
          tmpBonusExpected: tmpBonusExpected, tmpx: tmpx, stackLog: stackLog
        },
        log: lg, stLog: new Array(300), tmpStLog: new Array(300)
      };
    }
    function probeValues() {
      var st = [];
      for (var i = 0; i < 7; i++) st.push(num(T[S_IDS[i]]));
      return { lv: num(T.lv), point: num(T.s11), stats: st, hp: num(T.s7), mp: num(T.s8), sp: num(T.s9), achieved: num(T.tbonus) };
    }
    // 사본 안에서: kind === 'lvup' 이면 lvupPress 처럼, 스탯 번호면 stdupPress 처럼 돌린다(logOut/updateStatus 는 결과 값을
    // 바꾸지 않으므로 뺀다). 원본이 거절할 조작이면 null
    function runProbe(kind) {
      var a = probeValues(), ok = false;
      if (kind === 'lvup') {
        act(function () { if (parseInt(T.lv) < MAX_LEVEL) { ok = true; lvup(); } });
        if (!ok) return null;
        var b = probeValues();
        return {
          lv: b.lv, point: b.point - a.point,
          stats: b.stats.map(function (v, k) { return v - a.stats[k]; }),
          hp: b.hp - a.hp, mp: b.mp - a.mp, sp: b.sp - a.sp, bonus: b.achieved > a.achieved
        };
      }
      act(function () {
        if (parseInt(T[ctl(S_IDS, kind)]) < MAX_STATUS[kind] && dashChanges(kind)) { ok = true; stdup(kind); }
      });
      if (!ok) return null;
      var d = probeValues();
      return { value: d.stats[kind], lv: d.lv, point: d.point, levelUps: d.lv - a.lv };
    }
    // 같은 상태에서 다시 물으면 앞의 결과를 쓴다(상태가 바뀔 수 있는 조작마다 version 이 는다)
    function memoFor() {
      if (memo.version !== version) memo = { version: version, preview: undefined, dash: [] };
      return memo;
    }
    function copyPreview(p) {
      return p === null ? null : { lv: p.lv, point: p.point, stats: p.stats.slice(), hp: p.hp, mp: p.mp, sp: p.sp, bonus: p.bonus };
    }
    function copyDash(p) {
      return p === null ? null : { value: p.value, lv: p.lv, point: p.point, levelUps: p.levelUps };
    }

    // 결과 모양: 상태를 바꿀 수 있는 조작은 모두 { ok, sound } 를 돌려준다(그 밖의 칸은 조작마다 아래에 적었다).
    // ok === false 면 원본이 받아들이지 않은 조작이고 상태는 그대로다. 단 하나, 최고 레벨에서 포인트가 모자라 아무것도 못 하는
    // 대시는 원본이 효과음을 내고 logOut() 을 부르지만 ok: false, sound: null 로 알린다(로그 상자 logPane() 은 원본처럼 새로 쓰일 수 있다).
    // sound 는 원본이 낸 효과음('lvup' | 'stup' | null). 원본 핸들러에서 예외가 났으면 error: true (Flash 처럼 거기까지 바뀐 상태는 남는다).
    function plain(ok) { return { ok: ok, sound: null }; }

    var api = {
      // ---- 선택 ----
      // 캐릭터 드롭다운: 다른 캐릭터를 고르면 changeChar (같은 항목을 다시 고르면 원본도 아무 일이 없다 → ok: false)
      setChar: function (c) {
        if (typeof c !== 'number' || !(c >= 0 && c < CHAR_NAME.length) || c !== Math.floor(c) || c === charCB.idx) return plain(false);
        return done(plain(true), act(function () { comboSet(charCB, c); changeChar(charCB.idx); }));
      },
      // 타입 드롭다운: changeStyle (같은 항목이면 아무 일이 없다 → ok: false)
      setType: function (s) {
        if (typeof s !== 'number' || !(s >= 0 && s < styleCB.list.length) || s !== Math.floor(s) || s === styleCB.idx) return plain(false);
        return done(plain(true), act(function () { comboSet(styleCB, s); changeStyle(styleCB.idx); }));
      },
      // 스탯 초기화 (resetPress)
      reset: function () {
        return done(plain(true), act(function () { resetPress(); }));
      },

      // ---- 조작 ----
      levelUp: function () {
        var r = plain(false);
        return done(r, act(function () { _shiftKeyDown = false; lvupPress(r); }));
      },
      statUp: function (i) {
        var r = plain(false);
        if (!isStatIndex(i)) return r;
        return done(r, act(function () { _shiftKeyDown = false; stupPress(i, r); }));
      },
      // 최고 레벨에서 포인트가 모자라 아무것도 못 하는 대시도 ok: false (원본은 효과음만 냈다. stdupPress 참고)
      dash: function (i) {
        var r = plain(false);
        if (!isStatIndex(i)) return r;
        return done(r, act(function () { stdupPress(i, r); }));
      },
      undo: function (byLevel) {
        var r = plain(false);
        return done(r, act(function () {
          r.ok = byLevel ? !(logindex < 1) : logindex > 0;   // back()/dashBack() 이 받아들이는 조건
          _shiftKeyDown = !!byLevel;
          backPress();
        }));
      },
      redo: function (byLevel) {
        var r = plain(false);
        return done(r, act(function () {
          r.ok = byLevel ? !(log[logindex + 1][0] < 1) : log[logindex + 1][0] > 0;   // progress()/dashProgress() 의 조건
          _shiftKeyDown = !!byLevel;
          progressPress();
        }));
      },

      // ---- 설정 ----
      // 보너스% 스테퍼에 친 값(0~100, 5 단위로 반올림·클램프). 다음 레벨업에서 읽힌다.
      // { ok, sound: null, rate }: ok === false 면 수가 아니어서 스테퍼가 무시했다. rate 는 확정된 값
      setBonus: function (rate) {
        var r = plain(false);
        done(r, act(function () { r.ok = stepperInput(bonusNS, rate); }));
        r.rate = stepperGet(bonusNS);
        return r;
      },
      // 주력 계열 드롭다운: 열고(openDrop) 고르면 changeXien. ok === false 면 지금 고를 수 없는 계열이라 선택이 그대로다
      setXien: function (x) {
        var idx = -1;
        for (var k = 0; k < xienList.length; k++) if (xienList[k].data === x) { idx = k; break; }
        if (idx < 0) return plain(false);
        var r = plain(false);
        done(r, act(function () {
          openDrop();
          if (idx !== xienCB.idx) {   // 같은 항목이면 change 이벤트가 없다
            comboSet(xienCB, idx);
            changeXien(xienCB.item.data);
          }
        }));
        r.ok = !!(xienCB.item && xienCB.item.data === x);
        return r;
      },

      // ---- 글 ----
      // 지금 상태의 재분배 로그 (logOut 결과, 줄바꿈 \r). 조회만 한다(로그 상자 logPane() 은 바꾸지 않는다)
      exportLog: function () {
        var out = query(function () { logOut(); return logText; });
        return out.ok ? out.text : logText;   // logOut 이 예외로 멈추면 원본의 로그 상자는 그대로다
      },
      // 원본의 로그 상자(logarea)에 지금 들어 있는 글. 원본처럼 레벨업·스탯 +1·대시(logOut)와 로그 읽기 때만 바뀌고,
      // 되돌리기·다시 실행·설정·캐릭터 변경·스탯 편집 뒤에는 앞의 글이 그대로 남는다(그 상태에서 원본의 P 는 이 글을 읽는다).
      // 원본의 G(육성 가이드)는 이 상자에 가이드를 썼지만 guide() 는 조회라 쓰지 않는다
      logPane: function () {
        return logText;
      },
      // 로그 읽기 (붙여넣기 → 로그 불러오기)
      // { ok, sound: null, footer, typeFound, restarted, capped }
      //   ok        원본이 무언가 읽었다(캐릭터/타입 줄을 알아봤거나, 처음부터 다시 읽었거나, 상태가 바뀌었다)
      //   footer    캐릭터/타입 줄("루시안/물리복합 Bonus: …")에서 캐릭터를 알아봐 그 캐릭터로 처음부터 읽었다
      //   typeFound footer 이고 타입까지 알아봤다(false 면 그 캐릭터의 첫 타입)
      //   restarted 캐릭터/타입 줄이 없어서 지금 고른 캐릭터/타입의 처음 상태부터 읽었다(일본어판 로그, 끝 두 줄을 빠뜨린 로그 등)
      //   capped    글에 지금 상한을 넘는 값이 있었다: 시작이나 끝 레벨이 최고 레벨(MAX_LEVEL)보다 큰 LV 줄, LV 나 일곱 스탯
      //             가운데 하나가 상한(MAX_LEVEL, MAX_STATUS)보다 큰 Status 줄(항목 수가 맞는 것), 또는 LV 나 스탯이 상한보다 큰
      //             LV: 요약 줄("LV:170 STAB 285 HACK 4 …" 모양. 자세한 것은 overCap). 상한이 285이던 판의 계획이 그렇다.
      //             Status 줄의 그 값은 상한으로 읽는다. LV 줄에서 최고 레벨을 넘는 레벨은 레벨업 없이(최고 레벨에서 거절된다) 그 레벨의
      //             투자만 포인트가 있는 동안 최고 레벨에서 한다. 요약 줄은 읽지 않으므로, 상한을 넘던 스탯은 다시 찍을 때 상한에서 멈춘다.
      //             글만 보고 정하므로 읽기가 중간에 멈춰도(error) 같은 값이다
      importLog: function (text) {
        var s = text === undefined || text === null ? '' : String(text);
        s = s.split('\r\n').join('\r').split('\n').join('\r');   // Flash 텍스트 상자는 줄바꿈을 \r 로 바꾼다
        var before = fingerprint();
        var flags = { charFound: false, typeFound: false, reset: false, capped: false };
        var error = act(function () {
          logText = asText(s);
          logLoadPress(flags);
        });
        var r = plain(flags.charFound || flags.reset || fingerprint() !== before);
        r.footer = flags.charFound;
        r.typeFound = flags.typeFound;
        r.restarted = flags.reset;
        r.capped = !!flags.capped;
        return done(r, error);
      },
      // 육성 가이드 (recipe 의 글). 조작이 하나도 없으면 원본도 출력하지 않으므로 ''. 조회만 한다(로그 상자는 그대로)
      guide: function () {
        var out = query(function () {
          if (logindex > 0) {
            recipe();
            return logText;
          }
          return '';
        });
        return out.ok ? out.text : '';
      },

      // ---- 스탯 편집 ----
      editOpen: function () {
        act(function () { statusEdit(); });
        return editSnapshot();
      },
      // 창을 열고(statusEdit) 값을 친 뒤 적용(commitStatusEditPress). values 는 editOpen() 과 같은 모양(limits 무시).
      // 빠진 칸은 창을 열었을 때 값 그대로다. 수는 스테퍼처럼 반올림·클램프되고, 숫자가 아닌 입력은 무시된다.
      editCommit: function (values) {
        values = values || {};
        act(function () { statusEdit(); });
        var r = plain(false);
        return done(r, act(function () {
          var inp = function (st, v) { if (v !== undefined) stepperInput(st, v); };
          inp(slv, values.lv);
          var st = values.stats || [];
          for (var i = 0; i < 7; i++) inp(SS[SS_IDS[i]], st[i]);
          inp(SS.ss7, values.hp);
          inp(SS.ss8, values.mp);
          inp(SS.ss9, values.sp);
          inp(SS.ss11, values.point);
          // DataGrid 의 Xien 칸: 편집한 칸에는 입력한 글자(String)가 들어간다
          (values.lines || []).forEach(function (ln) {
            if (!ln || ln.value === undefined) return;
            for (var k = 0; k < xienList.length; k++) {
              if (xienList[k].data === Number(ln.x)) sxiList[k].xienData = typeof ln.value === 'string' ? ln.value : String(ln.value);
            }
          });
          commitStatusEditPress();
          r.ok = true;
        }));
      },

      // ---- 그리기용 상태 ----
      view: view,
      // 다음 레벨업으로 얻는 것 { lv, point, stats: [7], hp, mp, sp, bonus }: lv 는 새 LV, 나머지는 늘어나는 양(hp/mp/sp 는 평균),
      // bonus 는 그 레벨업에서 보너스를 받는지. levelUp() 이 거절될 때(최고 레벨)는 null
      preview: function () {
        var m = memoFor();
        if (m.preview === undefined) m.preview = parseInt(T.lv) < MAX_LEVEL ? buildEngine(null, probeState(), 'lvup') : null;
        return copyPreview(m.preview);
      },
      // dash(i) 를 하면 어디까지 가는지 { value, lv, point, levelUps }: 그 스탯의 값, LV, POINT(대시 뒤의 값)와 그동안의
      // 레벨업 횟수. dash(i) 가 거절될 때(ok: false)는 null. 대시는 레벨업하면서 비용이 오르는 곳(nextStepAt)보다 앞에서
      // 멈추는 일이 많으므로, 대시 버튼에 보일 값은 nextStepAt 이 아니라 이것이다
      previewDash: function (i) {
        if (!isStatIndex(i)) return null;
        var m = memoFor();
        if (m.dash[i] === undefined) m.dash[i] = buildEngine(null, probeState(), i);
        return copyDash(m.dash[i]);
      },

      // ---- 저장 ----
      serialize: serialize,
      _debugState: debugState   // 테스트 전용
    };

    if (raw) {
      restoreRaw(raw);
      if (probe !== undefined) return runProbe(probe);
    } else if (saved !== undefined && saved !== null) {
      restore(saved);
    } else {
      act(function () { initApp(); });
    }
    return api;
  }

  Oresim.ENGINE_VERSION = ENGINE_VERSION;
  Oresim.createEngine = createEngine;
  // 테스트 전용(tests/as3-semantics.js 가 하네스의 것과 맞춰 본다): AS3 런타임을 흉내 낸 parseInt 와 \s 다듬기
  Oresim._as3 = { parseInt: parseInt, trim: function (s) { return String(s).replace(AS3_TRIM, ''); } };
})();
