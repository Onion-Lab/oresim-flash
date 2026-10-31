#!/usr/bin/env node
/*
 * AS3 런타임 의미 확인: 엔진(web/js/engine.js 의 Oresim._as3)과 하네스(tests/harness.js 의 C5·C10)가 흉내 내는
 * AS3 의 전역 parseInt 와 RegExp \s 가
 *   1. 답을 아는 경우(avmplus 소스에서 손으로 따진 값)와 같고
 *   2. 무작위 글자열 수만 개에서 서로 같은지 본다(두 구현은 따로 옮겼다).
 * 출처(avmplus/Tamarin = Flash Player 의 AVM2 를 공개한 소스):
 *   parseInt  core/Toplevel.cpp(parseInt → MathUtils::parseInt(s, radix 0, strict 아님)), core/MathUtils.cpp(skipSpaces, parseInt)
 *   \s        pcre/pcre_chartables.cpp(0~255 의 공백: \t \n \f \r 공백 U+00A0, \v 는 아님), pcre/pcre_exec.cpp(OP_WHITESPACE:
 *             256 이상은 isUnicodeWhiteSpace), pcre/pcre_config.cpp(isUnicodeWhiteSpace: U+00A0 U+200B U+2060 U+3000 U+FEFF)
 * 사용법: node tests/as3-semantics.js [무작위 개수=40000] [seed=1]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const H = require('./harness');

const N = +(process.argv[2] || 40000);
let seed = +(process.argv[3] || 1);

const ctx = { console };
vm.createContext(ctx);
for (const f of ['web/js/const.js', process.env.ORESIM_ENGINE || 'web/js/engine.js']) {
  vm.runInContext(fs.readFileSync(path.isAbsolute(f) ? f : path.join(H.REPO, f), 'utf8'), ctx, { filename: f });
}
const E = ctx.Oresim._as3;
const trimH = (s) => String(s).replace(new RegExp(`^[${H.AS3_WS}]+|[${H.AS3_WS}]+$`, 'g'), '');

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
  for (const [who, f] of [['엔진', E.parseInt], ['하네스', H.as3ParseInt]]) {
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
  for (const [who, f] of [['엔진', E.trim], ['하네스', trimH]]) {
    const got = f(inp);
    if (got !== want) problems.push(`${who} \\s 다듬기(${show(inp)}) = ${show(got)}, 기대 ${show(want)}`);
  }
}

// ---- 2. 무작위: 두 구현이 같다 ----
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
  const a = E.parseInt(s), b = H.as3ParseInt(s);
  if (!Object.is(a, b)) { problems.push(`무작위 parseInt(${show(s)}): 엔진 ${show(a)} / 하네스 ${show(b)}`); if (problems.length > 30) break; }
  if (E.trim(s) !== trimH(s)) { problems.push(`무작위 \\s 다듬기(${show(s)}): 엔진 ${show(E.trim(s))} / 하네스 ${show(trimH(s))}`); if (problems.length > 30) break; }
  n++;
}

if (problems.length) {
  console.log(`AS3 의미 확인 실패 ${problems.length}건`);
  for (const m of problems.slice(0, 30)) console.log('  - ' + m);
  process.exitCode = 1;
} else {
  console.log(`OK: 답을 아는 parseInt ${P.length}개·\\s 다듬기 ${Tr.length}개(엔진·하네스 모두), 무작위 ${n}개에서 엔진 = 하네스`);
}
