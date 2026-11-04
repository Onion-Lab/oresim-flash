#!/usr/bin/env node
/*
 * AS3 런타임 의미 확인: 엔진(public/js/engine.js 의 Oresim._as3)이 흉내 내는 AS3 의 전역 parseInt 와 RegExp \s 가
 *   1. 답을 아는 경우(avmplus 소스에서 손으로 따진 값)와 같고
 *   2. 무작위 글자열 수만 개에서 따로 옮긴 참고 구현(아래 as3ParseInt, AS3_WS)과 같은지 본다.
 * 참고 구현은 원래 원본 하네스(tests/harness.js, 2026-11 에 Flash 판과 함께 지웠다)가 원본 AS3 를 돌릴 때 쓰던 것으로,
 * 엔진의 것과 따로 옮겼다. 엔진은 원본의 logLoad 가 쓰는 두 곳(parseInt, Xien 줄의 /^\s+|\s+$/g)을 이 의미로 돈다.
 * 출처(avmplus/Tamarin = Flash Player 의 AVM2 를 공개한 소스):
 *   parseInt  core/Toplevel.cpp(parseInt → MathUtils::parseInt(s, radix 0, strict 아님)), core/MathUtils.cpp(skipSpaces, parseInt)
 *   \s        pcre/pcre_chartables.cpp(0~255 의 공백: \t \n \f \r 공백 U+00A0, \v 는 아님), pcre/pcre_exec.cpp(OP_WHITESPACE:
 *             256 이상은 isUnicodeWhiteSpace), pcre/pcre_config.cpp(isUnicodeWhiteSpace: U+00A0 U+200B U+2060 U+3000 U+FEFF)
 * 사용법: node tests/as3-semantics.js [무작위 개수=40000] [seed=1]
 */
'use strict';

const E = require('./engine-host').loadOresim()._as3;

// ---- 참고 구현 ----
// AS3 RegExp 의 \s 가 맞추는 문자(정규식 문자 집합 안에 넣는 글자 그대로: \t \n \f \r 공백 U+00A0 U+200B U+2060 U+3000 U+FEFF)
const AS3_WS = '\\t\\n\\f\\r \\u00a0\\u200b\\u2060\\u3000\\ufeff';

// AS3 의 전역 parseInt(s:String = "NaN", radix:int = 0). avmplus MathUtils::parseInt(inStr, radix, strict=false) 를 옮겼다.
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
const trimH = (s) => String(s).replace(new RegExp(`^[${AS3_WS}]+|[${AS3_WS}]+$`, 'g'), '');

const N = +(process.argv[2] || 40000);
let seed = +(process.argv[3] || 1);


const problems = [];
const ch = (...c) => String.fromCharCode(...c);
const show = (v) => (typeof v === 'string' ? JSON.stringify(v).replace(/[^\x20-\x7e]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')) : Object.is(v, -0) ? '-0' : String(v));

// ---- 1. 답을 아는 경우 ----
const P = [
  [undefined, NaN], [null, NaN], ['', NaN], [' ', NaN], ['+', NaN], ['-', NaN], ['0x', NaN], ['-0x', NaN], ['0xg', NaN],
  ['15', 15], [' 15', 15], ['\t\n\x0b\f\r 15', 15], ['15  ', 15], ['15abc', 15], ['0015', 15], ['1e3', 1], ['12.7', 12],
  // 앞 공백: AS3 skipSpaces 의 집합
  [ch(0x200b) + '15', 15], [ch(0x2000) + '15', 15], [ch(0x200a) + '15', 15], [ch(0x2028) + '15', 15], [ch(0x2029) + '15', 15],
  [ch(0x205f) + '15', 15], [ch(0x3000) + '15', 15], [ch(0x0b, 0x200b, 0x3000) + '-15', -15],
  // JS 는 건너뛰지만 AS3 는 건너뛰지 않는 것
  [ch(0xa0) + '15', NaN], [ch(0xfeff) + '15', NaN], [ch(0x1680) + '15', NaN], [ch(0x202f) + '15', NaN], [ch(0x85) + '15', NaN],
  [' ' + ch(0xa0) + '15', NaN], ['- 15', NaN],
  // 부호, 16진수
  ['+15', 15], ['-15', -15], ['-0', -0], ['+0', 0], ['--5', NaN], ['+-5', NaN], ['0x1A', 26], ['0X1a', 26], ['-0x10', -16],
  ['0x1g', 1], [' 0x10', 16], ['0 x10', 0], ['0x-1', NaN],
  // 수·불리언 인자(String 으로 바꾼 뒤)
  [5, 5], [-5, -5], [1e21, 1], [NaN, NaN], [-0, 0], [1.5, 1], [true, NaN], [Infinity, NaN],
  // 10진수: 자릿수마다 result * 10 + v (보정 없음)
  ['12345678901234567890', 12345678901234570000], ['9007199254740993', 9007199254740992],
  ['99999999999999999999999', 1.0000000000000003e+23], ['1' + '0'.repeat(400), Infinity], ['-1' + '0'.repeat(400), -Infinity],
  // 16진수 2^53 이상: MathUtils 의 반올림 보정
  ['0x20000000000003', 9007199254740996], ['0x100000000000001', 72057594037927936], ['0x100000000000018', 72057594037927968],
  // 보정의 버릇(C++ 그대로): 14자리 뒤 자리가 숫자가 아니어도 그다음부터 숫자가 이어지는 만큼 자릿수를 곱한다 → 2^57
  ['0x20000000000001g5', 144115188075855872],
];
for (const [inp, want] of P) {
  for (const [who, f] of [['엔진', E.parseInt], ['참고 구현', as3ParseInt]]) {
    const got = f(inp);
    if (!Object.is(got, want)) problems.push(`${who} parseInt(${show(inp)}) = ${show(got)}, 기대 ${show(want)}`);
  }
}
const Tr = [
  [ch(0xa0) + 'x' + ch(0x3000), 'x'], [ch(0x200b) + 'x' + ch(0x2060), 'x'], [ch(0xfeff) + 'x', 'x'], ['\t x \n\f\r', 'x'],
  [' a  b ', 'a  b'], [ch(0x0b) + 'x', ch(0x0b) + 'x'], ['x' + ch(0x1680), 'x' + ch(0x1680)], ['x' + ch(0x2028), 'x' + ch(0x2028)],
  ['x' + ch(0x202f), 'x' + ch(0x202f)], ['x' + ch(0x205f), 'x' + ch(0x205f)], ['x' + ch(0x85), 'x' + ch(0x85)],
  ['x' + ch(0x2000), 'x' + ch(0x2000)], ['x' + ch(0x200a), 'x' + ch(0x200a)], ['x ' + ch(0x2029) + ' ', 'x ' + ch(0x2029)],
];
for (const [inp, want] of Tr) {
  for (const [who, f] of [['엔진', E.trim], ['참고 구현', trimH]]) {
    const got = f(inp);
    if (got !== want) problems.push(`${who} \\s 다듬기(${show(inp)}) = ${show(got)}, 기대 ${show(want)}`);
  }
}

// ---- 2. 무작위: 엔진 = 참고 구현 ----
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ri = (n) => Math.floor(rnd() * n);
const pick = (a) => a[ri(a.length)];
const WS = [0x20, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0xa0, 0xfeff, 0x1680, 0x2000, 0x2005, 0x200a, 0x200b, 0x2028, 0x2029, 0x202f, 0x205f, 0x2060, 0x3000, 0x85].map((c) => ch(c));
const ALPHA = '0123456789abcdefABCDEFxXgz+-.e '.split('').concat(WS);
let n = 0;
for (let k = 0; k < N; k++) {
  let s;
  const r = ri(4);
  if (r === 0) s = Array.from({ length: ri(12) }, () => pick(ALPHA)).join('');
  else if (r === 1) s = pick(['', ' ', pick(WS)]) + pick(['', '-', '+']) + Array.from({ length: 1 + ri(40) }, () => String(ri(10))).join('') + pick(['', 'x', ' 1']);
  else if (r === 2) s = pick(['', pick(WS)]) + pick(['', '-']) + pick(['0x', '0X']) + Array.from({ length: 1 + ri(22) }, () => pick('0123456789abcdefABCDEF'.split(''))).join('') + pick(['', 'g', 'g5', '1', ' 7']);
  else s = Array.from({ length: ri(6) }, () => pick(WS)).join('') + pick(['x', '15', 'a b']) + Array.from({ length: ri(4) }, () => pick(WS)).join('');
  const a = E.parseInt(s), b = as3ParseInt(s);
  if (!Object.is(a, b)) { problems.push(`무작위 parseInt(${show(s)}): 엔진 ${show(a)} / 참고 구현 ${show(b)}`); if (problems.length > 30) break; }
  if (E.trim(s) !== trimH(s)) { problems.push(`무작위 \\s 다듬기(${show(s)}): 엔진 ${show(E.trim(s))} / 참고 구현 ${show(trimH(s))}`); if (problems.length > 30) break; }
  n++;
}

if (problems.length) {
  console.log(`AS3 의미 확인 실패 ${problems.length}건`);
  for (const m of problems.slice(0, 30)) console.log('  - ' + m);
  process.exitCode = 1;
} else {
  console.log(`OK: 답을 아는 parseInt ${P.length}개·\\s 다듬기 ${Tr.length}개(엔진·참고 구현 모두), 무작위 ${n}개에서 엔진 = 참고 구현`);
}
