#!/usr/bin/env node
/*
 * oresim/oresim-const.as 의 표와 상수를 웹판용 web/js/const.js 로 옮긴다. 의존성 없음(Node 22).
 *
 *   node tools/gen-web-const.js          web/js/const.js 를 다시 만든다
 *   node tools/gen-web-const.js --check  다시 만든 결과가 지금 파일과 같은지만 확인한다(다르면 종료 코드 1)
 *
 * 방법: AS3 전용 문법(import, [Bindable], public/private, ":타입")만 지운 뒤 Node vm 에서 그대로 평가한다.
 * 그래서 주석 토글(99/121/162행)·뒤 쉼표 같은 해석도 AS3 와 같고, 값을 손으로 옮기지 않는다.
 * 같은 입력이면 출력은 바이트 단위로 같다(두 번 돌려도 같은 파일).
 *
 * 빠지는 것: c0Img~c19Img, charImgSymbol (Flash 용 캐릭터 그림 경로. 웹판 그림은 web/img/ 에 있고 화면 쪽이 다룬다)
 * 바뀌는 것: Flex ArrayCollection(charList, sxiList, styleList, xienList)은 안의 배열(source)만 옮긴다.
 * 문자열은 ASCII 로만 쓴다(한글 등은 \uXXXX, 원문은 옆 주석). 서버가 .js 를 다른 문자 코드로 보내도 값이 깨지지 않게 하려는 것이다.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'oresim', 'oresim-const.as');
const OUT = path.join(ROOT, 'web', 'js', 'const.js');

// Flash 전용이라 옮기지 않는 이름
const DROPPED = new Set(['charImgSymbol'].concat(Array.from({ length: 20 }, (_, i) => `c${i}Img`)));

// AS3 전용 문법만 지운다. 값(배열 리터럴, 주석)은 손대지 않는다.
function stripAs3(src) {
  return src
    .replace(/^\s*import\s+[^;]+;/gm, '')
    .replace(/\[Bindable\]/g, '')
    .replace(/\[Embed\([^)]*\)\]/g, '')
    .replace(/\b(public|private)\s+var\b/g, 'var')
    .replace(/:\s*(Number|Array|String|ArrayCollection)\b/g, '');
}

// Flex ArrayCollection 대신: 안의 배열만 들고 있는다
class ArrayCollection {
  constructor(source) { this.source = source ? source.slice() : []; }
}

function loadTables() {
  const ctx = { ArrayCollection };
  const preset = new Set(Object.keys(ctx));
  vm.createContext(ctx);
  vm.runInContext(stripAs3(fs.readFileSync(SRC, 'utf8')), ctx, { filename: SRC });
  // var 선언은 소스 순서대로 전역에 생긴다(주석으로 막힌 선언은 생기지 않는다)
  const names = Object.keys(ctx).filter((k) => !preset.has(k));
  const out = [];
  for (const name of names) {
    if (DROPPED.has(name)) continue;
    let value = ctx[name];
    if (value instanceof ArrayCollection) value = value.source;
    out.push([name, value]);
  }
  return out;
}

// ---- 출력 ----

function checkPlain(value, where) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) throw new Error(`${where}: 옮길 수 없는 수 ${value}`);
    return;
  }
  if (typeof value === 'string') return;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (!(i in value)) throw new Error(`${where}[${i}]: 배열에 빈 칸이 있다`);
      checkPlain(value[i], `${where}[${i}]`);
    }
    return;
  }
  // vm 안에서 만든 객체는 Object.prototype 이 다르므로 "프로토타입의 프로토타입이 null" 로 판정한다
  if (value && typeof value === 'object' && Object.prototype.toString.call(value) === '[object Object]'
      && Object.getPrototypeOf(Object.getPrototypeOf(value)) === null) {
    for (const k of Object.keys(value)) checkPlain(value[k], `${where}.${k}`);
    return;
  }
  throw new Error(`${where}: 옮길 수 없는 값 ${String(value)}`);
}

// 문자열 리터럴: ASCII 밖의 글자는 \uXXXX 로 쓴다
const asciiString = (v) => JSON.stringify(v).replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));

function lit(v) {
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return asciiString(v);
  if (Array.isArray(v)) return '[' + v.map(lit).join(', ') + ']';
  return '{ ' + Object.keys(v).map((k) => `${k}: ${lit(v[k])}`).join(', ') + ' }';
}

const isLeafArray = (a) => Array.isArray(a) && a.every((v) => !Array.isArray(v) && (v === null || typeof v !== 'object'));
const comment = (s) => `/* ${String(s).replace(/\*\//g, '* /')} */ `;
// ASCII 밖의 글자가 든 값(문자열, { label } 같은 객체)의 원문을 뒤에 다는 주석
const note = (v) => {
  const text = typeof v === 'string' ? v
    : (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).map((k) => v[k]).filter((x) => typeof x === 'string').join(' ') : '';
  return /[^\x00-\x7e]/.test(text) ? ' ' + comment(text).trimEnd() : '';
};

function emitTable(name, value, T) {
  const charLabel = (c) => `${c} ${T.CHAR_NAME[c] !== undefined ? T.CHAR_NAME[c] : '(자리만 있는 캐릭터)'}`;
  const styleLabel = (c, s) => (T.STYLE_NAME[c] && T.STYLE_NAME[c][s] !== undefined ? T.STYLE_NAME[c][s] : String(s));
  const xienLabel = (x) => `${x} ${T.XIEN_NAME[x] !== undefined ? T.XIEN_NAME[x] : '(이름 없음)'}`;
  const ind = (n) => '  '.repeat(n);

  // 캐릭터 → 타입 → 값 (DEFAULT_STATUS, DEFAULT_NEED_POINT, DEFAULT_XIEN)
  const byCharStyle = (arr) => '[\n' + arr.map((row, c) =>
    ind(3) + comment(charLabel(c)) + '[\n' +
    row.map((leaf, s) => ind(4) + comment(styleLabel(c, s)) + lit(leaf)).join(',\n') + '\n' + ind(3) + ']').join(',\n') + '\n' + ind(2) + ']';

  switch (name) {
    case 'STYLE_NAME':
      return '[\n' + value.map((row, c) => ind(3) + comment(`${charLabel(c)}: ${row.join(', ')}`) + lit(row)).join(',\n') + '\n' + ind(2) + ']';
    case 'DEFAULT_STATUS':
    case 'DEFAULT_NEED_POINT':
    case 'DEFAULT_XIEN':
      return byCharStyle(value);
    case 'MAX_XIEN':
      return '[\n' + value.map((rows, c) =>
        ind(3) + comment(charLabel(c)) + '[\n' +
        rows.map((leaf, x) => ind(4) + comment(xienLabel(x)) + lit(leaf)).join(',\n') + '\n' + ind(3) + ']').join(',\n') + '\n' + ind(2) + ']';
    case 'XIEN_UP_BONUS':
    case 'XIEN_RANDOM_UP_BONUS':
    case 'MIN_XIEN_UP_STATUS':
    case 'MAX_XIEN_UP_STATUS':
      return '[\n' + value.map((leaf, x) => ind(3) + comment(xienLabel(x)) + lit(leaf)).join(',\n') + '\n' + ind(2) + ']';
    case 'STATUS_UP':
      return '[\n' + value.map((leaf, i) => ind(3) + comment(T.STATUS_NAME[i]) + lit(leaf)).join(',\n') + '\n' + ind(2) + ']';
    case 'BONUS_STATUS_POINT': {
      const lines = [];
      for (let i = 0; i < value.length; i += 20) {
        lines.push(ind(3) + comment(`LV ${i + 1}~${Math.min(i + 20, value.length)}`) + value.slice(i, i + 20).map(lit).join(', '));
      }
      return '[\n' + lines.join(',\n') + '\n' + ind(2) + ']';
    }
    default:
      if (isLeafArray(value) && lit(value).length <= 100) return lit(value);
      if (Array.isArray(value)) return '[\n' + value.map((v) => ind(3) + lit(v) + note(v)).join(',\n') + '\n' + ind(2) + ']';
      return lit(value);
  }
}

function generate() {
  const tables = loadTables();
  const T = Object.fromEntries(tables);
  for (const [name, value] of tables) checkPlain(value, name);

  const body = tables.map(([name, value]) => `    ${name}: ${emitTable(name, value, T)}`).join(',\n');
  return [
    '/*',
    ' * 자동 생성 파일이다. 손으로 고치지 말 것.',
    ' * 만드는 법: node tools/gen-web-const.js  (원본: oresim/oresim-const.as — 표를 바꿀 때는 그쪽을 고치고 다시 만든다)',
    ' *',
    ' * oresim-const.as 의 모든 표와 상수를 같은 이름·같은 값으로 옮겼다. 다음만 다르다.',
    ' *  - 빠짐: c0Img~c19Img, charImgSymbol (Flash 용 캐릭터 그림 경로)',
    ' *  - Flex ArrayCollection(charList, sxiList, styleList, xienList)은 안의 배열만 옮겼다',
    ' *  - 모든 배열·객체는 Object.freeze 로 얼려 있다(원본도 실행 중에 표를 바꾸지 않는다)',
    ' *  - 문자열은 ASCII 로만 적었다(한글은 \\uXXXX). 서버가 다른 문자 코드로 보내도 값이 깨지지 않는다',
    ' * 주석(캐릭터·타입·계열 이름, 문자열의 원문)은 생성기가 표의 값에서 붙인 것이다.',
    ' */',
    '(function () {',
    "  'use strict';",
    '  var Oresim = globalThis.Oresim = globalThis.Oresim || {};',
    '  var CONST = {',
    body,
    '  };',
    '  (function freeze(o) {',
    '    Object.freeze(o);',
    '    Object.keys(o).forEach(function (k) {',
    "      if (o[k] !== null && typeof o[k] === 'object' && !Object.isFrozen(o[k])) freeze(o[k]);",
    '    });',
    '  })(CONST);',
    '  Oresim.CONST = CONST;',
    '})();',
    '',
  ].join('\n');
}

function main() {
  const text = generate();
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
    if (now === text) {
      console.log(`OK: ${path.relative(ROOT, OUT)} 는 ${path.relative(ROOT, SRC)} 에서 다시 만든 결과와 같다`);
      return;
    }
    console.log(`다름: ${path.relative(ROOT, OUT)} 를 다시 만들어야 한다 (node tools/gen-web-const.js)`);
    process.exitCode = 1;
    return;
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, text);
  console.log(`썼다: ${path.relative(ROOT, OUT)} (${text.length} 글자)`);
}

if (require.main === module) main();

module.exports = { generate, loadTables, stripAs3, DROPPED, SRC, OUT };
