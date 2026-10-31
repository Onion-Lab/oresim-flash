# tests — 웹판 엔진 검증

웹판 계산 엔진(`web/js/engine.js`)이 원본 Flash 판(`oresim/oresim-main.as`)과 **동작이 같은지** 확인하는 스크립트들이다.
Node 22 만 있으면 된다(npm 설치 없음). 저장소 맨 위에서 실행한다.

| 스크립트 | 확인하는 것 |
|---|---|
| `node tests/const-check.js` | `web/js/const.js` 가 `oresim/oresim-const.as` 의 표와 깊이 같은지, `tools/gen-web-const.js` 로 다시 만든 결과와 바이트 단위로 같은지(손으로 고치지 않았는지), 표가 얼어 있는지, 엔진의 스테퍼 한계가 `oresim.mxml` 과 같은지, 로그 읽기가 기대는 데이터 성질(이름 규칙, 기본 계열 등), 두 파일을 UTF-8 이 아닌 문자 코드(latin1, windows-1252, EUC-KR, Shift_JIS)로 읽어도 표와 출력이 같은지 |
| `node tests/as3-semantics.js [개수=40000] [seed=1]` | 엔진과 하네스가 흉내 내는 AS3 의 전역 `parseInt` 와 RegExp `\s` 가 avmplus 소스에서 따진 답과 같은지, 무작위 글자열에서 두 구현이 서로 같은지 |
| `node tests/engine-diff.js [seeds=50] [조작수=400] [첫seed=1]` | **차등 퍼저.** 같은 무작위 조작을 원본(하네스)과 엔진에 넣고 조작마다 결과값, 상태 전체, `view()`, `exportLog()`, `guide()` 를 비교한다. `preview()`/`previewDash(i)` 는 그 뒤 원본이 실제로 한 레벨업·대시와 비교한다. 처음 어긋난 곳에서 seed·순서·조작 목록·다른 칸을 찍고 종료 코드 1 로 멈춘다 |
| `node tests/engine-invariants.js [runs=40] [seed=777]` | **불변식 퍼저.** 엔진만 돌리며 로그 왕복 재현, ←×k →×k 복귀, P 멱등, 편집 창 '적용' 무변화, Xien ≤ MAX_XIEN, 예외 없음, `serialize()` → `createEngine(saved)` 동등성, `preview()` = 실제 레벨업, `previewDash(i)` = 실제 대시, 결과 모양(`{ ok, sound }`), 로그 상자(`logPane()`)가 바뀌는 때, `importLog` 의 `footer`/`typeFound`/`restarted`, 반복 안전장치, 결과 객체 격리, 잘못된 저장 상태 거부 |

완료 기준으로 돌린 명령:

```sh
node tools/gen-web-const.js --check   # const.js 가 최신인지
node tests/const-check.js
node tests/as3-semantics.js
node tests/engine-diff.js 300 400     # 어긋남 0
node tests/engine-diff.js 8 1500 1001 # 긴 seed: 최고 레벨 285, 스탯 상한까지 간다
node tests/engine-invariants.js
```

`DIFF_VERBOSE=1` 을 주면 차등 퍼저가 조작을 하나씩 찍는다. `ORESIM_ENGINE=경로` 를 주면 그 엔진 파일로 돌린다
(일부러 고장 낸 엔진을 이 테스트들이 잡아내는지 볼 때 쓴다).

## 차등 퍼저가 지나가는 경우

마지막에 "지나간 경우" 표로 횟수를 찍는다. 레벨업(최고 레벨에서 거부 포함), 스탯 +1(상한·포인트 부족 거부 포함),
대시(상한 거부, 최고 레벨에서 포인트가 모자라 아무것도 못 하는 대시 포함), ←/→ 와 Shift+←/→, 보너스%(0, 100, 7·103 처럼
반올림·클램프가 필요한 값, 숫자가 아닌 값), 주력 계열(고를 수 있는 것과 없는 것), 캐릭터·타입 변경(로아미니 포함),
스탯 초기화, 스탯 편집(제자리, 더 높은 LV, LV1, 이상한 값·범위 밖 값), `exportLog → importLog` 왕복(같은 엔진, 다른 캐릭터를
고른 새 엔진), 손으로 고친 로그·망가진 로그·푸터 없는 로그·46칸 `Status`·일본어판 로그(`fixtures/ja-era-logs.js`)·빈 로그,
AS3 와 JS 가 공백으로 보는지가 갈리는 글자(U+00A0, U+FEFF, U+200B, U+3000, \v 등)를 수 앞·Xien 이름 앞뒤에 넣은 로그,
언제든 `guide()`, `serialize()` 로 엔진을 바꿔 끼우고 계속하기.
무작위 조작 전에 네 가지를 먼저 돌린다(무작위로는 드물게만 닿는 길을 매번 확인한다).
- 정해 둔 조작 순서: 드롭다운을 연 뒤 계열이 적은 캐릭터로 바꾸고 고를 수 없는 Xien 줄을 읽기(`tmpx` 를 마지막 항목으로 줄임),
  같은 캐릭터·타입 다시 고르기, 읽기 중 보너스 33%, 스탯 편집 지점으로 되돌리기, 최고 레벨 대시, 스탯 상한, POINT 9999 넘김 등.
- 손으로 고른 경계 입력: 전각 문장부호, 음수 보너스, 공백 없는 `Bonus :75%`(원본도 예외), Xien 뒤 전각 공백·NBSP, Xien 메모,
  `Status` 의 LV 0·음수·300, 46칸 `Status` 등을 새 쌍(캐릭터 3가지)에 읽히고 몇 가지 조작을 이어 한다.
- 답을 아는 AS3 의미(`knownAnswers`): 원본과 엔진이 서로 같을 뿐 아니라, "같은 결과가 나와야 하는 글"을 읽은 원본과도 같아야 한다.
  예를 들어 `Xien : 검계 STAB/DEX` 뒤의 U+3000 은 떼어지고(그 계열을 고른다) U+2028 은 떼어지지 않는다(그 줄은 무시된다).
  `LV &nbsp;15` 의 U+00A0 는 `parseInt` 가 건너뛰지 않아 그 줄이 무시되고, U+200B 는 건너뛴다. 하네스와 엔진이 같은 실수를
  하면 차등 비교로는 보이지 않으므로 이 답으로 못박는다.
- 큰 입력(`heavyCases`): 원본(하네스)이 몇 초 걸려 끝내는 붙여 넣기(`LV 2 - 160000 : STAB`, `STAB * 2000` 을 284레벨,
  284줄 × `STAB * 600, DEX * 600`, `STAB * 300001`, 30만 레벨 몰빵 뒤 줄, `Status` LV 400000 뒤 되돌리기 등). 엔진의 반복
  건너뛰기(아래)가 끝 상태를 바꾸지 않는지 원본과 비교한다.

상태 비교에서 `stLog`/`tmpStLog` 는 값이 있는 칸만 본다. 원본의 되돌리기는 0 ~ LV+1 칸에 `undefined` 를 채우는데 엔진은 값이
있는 칸만 옮긴다. 원본 논리는 빈 칸과 `undefined` 칸, 배열 길이를 구별하지 않는다(`in`·`length`·키 나열을 쓰지 않는다).

이 테스트가 실제로 어긋남을 잡는지는 엔진을 일부러 고장 낸 사본(`ORESIM_ENGINE`)으로 확인했다(센티널 길이, logOut 호출 위치,
스테퍼 커밋 시점, 콤보박스 범위 줄이기, `\s`, `parseInt` 의 공백, openDrop, 반복 건너뛰기 조건, 저장 형식 등).

## 엔진의 반복 안전장치

원본에는 Flash 의 스크립트 시간 제한(Flex 기본 60초, Error #1502)밖에 없고, 그 시점은 PC 속도에 따라 달라 흉내 낼 수 없다.
엔진은 "원본이 시간 제한 없이 끝까지 돌았을 때"의 결과를 내고, 끝까지 돌아도 결과가 같은 반복만 정확하게 건너뛴다.
- 로그 읽기의 레벨 반복(`LV n - m`, 몰빵): 최고 레벨에서 한 바퀴 동안 아무것도 바뀌지 않으면 남은 바퀴도 모두 같다.
- `STAB * n`: 같은 스탯이 이어지는 칸에서 한 번 거절되면 상태가 그대로이므로 나머지도 모두 거절된다(칸을 늘어놓지 않는다).
- 되돌리기의 `stLog` 복사: 값이 있는 칸만 옮긴다.

그래도 끝이 없는 입력(`Status` 줄의 아주 작은 LV·스탯 값 때문에 레벨업·투자가 실제로 수억 번 일어나는 것)만 한 조작에서
실제 레벨업·스탯 +1 이 10만 번(기록 10만 개, 메모리 보호) 또는 반복이 1000만 번을 넘으면 멈춘다. 그때 그 조작은 `error: true` 로
끝나고 상태는 거기까지 바뀐 채로 남는다. 정상 사용은 한 조작에 많아야 2천 번 남짓이다.

## 하네스(`harness.js`)

원본 AS3 를 Node `vm` 에서 그대로 돌리는 기준(oracle)이다. 원본 로직은 고치지 않고 AS3 전용 문법(타입 표기 등)만 지운다.
JS 로 돌리면 AS3/Flex 와 달라지는 곳은 아래처럼 맞췄고, 엔진도 같은 의미를 따른다. 보정은 적용 횟수를 확인하므로
원본이 바뀌어 보정이 빠지면 바로 실패한다.

- **C1 NumericStepper**: 코드로 넣은 값은 다음 프레임 `commitProperties` 에서야 `stepSize` 로 반올림·클램프된다.
  그 전(같은 핸들러 안)에 읽으면 넣은 값 그대로다. 예를 들어 붙여 넣은 로그의 `Bonus : 33%` 는 같은 읽기 안의 레벨업에는 33 으로,
  그 뒤에는 35 로 쓰인다. 사용자가 입력란에 친 값은 바로 검사해 확정하고 숫자가 아니면 무시한다.
- **C2 ComboBox**: `selectedIndex` 는 int 이고 목록 길이를 넘으면 마지막 항목으로 줄인다. `selectedItem` 은 저장값이다.
  목록이 비면 -1, 첫 항목이 들어오면 0. `styleList` 를 새로 만들면 데이터 바인딩으로 목록이 바뀐다.
  `change` 는 고른 번호가 바뀔 때만 난다(같은 캐릭터를 다시 골라도 초기화되지 않는다).
- **C3 ArrayCollection**: `getItemAt` 범위 밖은 RangeError, `removeAll`/`addItem` 은 RESET/ADD 이벤트.
- **C4 Text/Label/TextArea**: `text` 에 null·undefined·"" 를 넣으면 "".
- **C5 RegExp `\s`**: AS3(avmplus 의 PCRE)는 `\t \n \f \r` 공백, U+00A0, U+200B, U+2060, U+3000, U+FEFF 만 맞춘다
  (`\v`, U+1680, U+2000~U+200A, U+2028, U+2029, U+202F, U+205F 는 맞추지 않는다). Xien 줄 다듬기가 이 집합을 쓴다.
- **C6 타입 있는 변수**: `var x:Number;`·`= undefined` 는 NaN, String 형 변수·매개변수에 넣는 값은 String(undefined → null),
  Number 형 변수·전역에 배열 값을 넣을 때는 Number 로 바꾼다.
- **C7 `(x as Text)`**: Text 가 아니면 null 이 되어 `.text` 에서 TypeError.
- **C8 처리되지 않은 예외**: Flash 처럼 그 핸들러만 멈추고 거기까지 바뀐 상태는 남는다.
- **C9 `callLater`**: 바로 실행한다(스크롤 위치만 바꾼다).
- **C10 전역 `parseInt`**: AS3 의 것(avmplus `MathUtils::parseInt`, radix 0)으로 바꾼다. 앞 공백은 `' ' \t \n \v \f \r`,
  U+2000~U+200B, U+2028, U+2029, U+205F, U+3000 만 건너뛰고(JS 와 달리 U+00A0·U+FEFF·U+1680·U+202F 는 건너뛰지 않는다),
  수는 자릿수마다 `result * radix + v` 로 쌓는다(10진수는 17자리쯤부터 JS 와 값이 다르다. 16진수는 2^53 이상에서 반올림 보정).

C1~C4 는 Apache Flex SDK 4.16.1 의 mx 소스, C5·C10 은 avmplus(Tamarin) 소스(`pcre_chartables.cpp`, `pcre_exec.cpp`,
`pcre_config.cpp`, `MathUtils.cpp`, `Toplevel.cpp`)를 읽고 맞췄다. Flash Player 로 직접 확인하지는 못했다.

어댑터(`createOracle`)는 엔진과 같은 계약 해석을 쓴다: 상태를 바꿀 수 있는 조작은 모두 `{ ok, sound }` 를 돌려주고
(받아들이지 않은 조작은 소리 없음, 최고 레벨에서 포인트가 모자라 아무것도 못 하는 대시도 `ok: false`), `importLog` 는
`footer`/`typeFound`/`restarted` 를 더 돌려준다. `exportLog()`/`guide()` 는 글만 만들고 로그 상자는 그대로 두며,
`logPane()` 은 원본의 로그 상자 글이다.

`fixtures/ja-era-logs.js` 는 한국어화 직전 일본어판(커밋 `14906f3`)이 출력한 로그다. 저장소에 일본어 문자를 남기지 않으려고
ASCII 밖의 글자는 `\u` 이스케이프로 적었다.
