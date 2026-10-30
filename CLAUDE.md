# CLAUDE.md — oresim-flash

## 개요

- **무엇**: 테일즈위버(TalesWeaver, Softmax/Nexon) 일본 서버용 스탯 재분배(再振り) 플래너
  「俺流再振りシミュレーター」(통칭 俺シミュ)의 Flash PC판. 레벨별 스탯 투자 계획을 시뮬레이션하고,
  텍스트 로그(再振りログ)와 지남서(指南書, 레시피)로 출력하고, 그 로그를 다시 읽어 재현한다.
- **출처**: 원작자 rugumaxi(「ルグ鯖某マキシ」)가 2015-10에 Apache-2.0으로 공개(사이트는 2015-11 폐쇄 예정이었음).
  이후 갱신 없음. 캐릭터 일러스트 등 게임 자산의 권리는 Softmax/Nexon에 있으며 Apache-2.0 대상이 아닐 수 있다.
- **기술**: Flex 3(MXML 2006 네임스페이스, `mx:` 컴포넌트) + ActionScript 3, 타깃 Flash Player 10.
  Flash 런타임 EOL로 현재 브라우저에서는 실행 불가. 빌드 스크립트·테스트·CI 없음.
- 코드 주석/UI 문자열은 일본어. UTF-8, LF, 탭/스페이스 혼용(주변 스타일을 따를 것).

## 파일 구성

| 경로 | 역할 |
|---|---|
| `oresim.mxml` | 웹판 진입점. UI 전체 정의(345×500). 이미지/사운드를 런타임에 상대경로(`image/`, `se/`)로 로드 |
| `oresim_offline.mxml` | 같은 UI. `sim.png`/`frame.png`/`c0`/mp3만 `@Embed`. Flash Builder의 `mainApplicationPath` |
| `oresim/oresim-const.as` | 데이터 테이블(모두 `public var`). `<mx:Script source>`로 include |
| `oresim/oresim-main.as` | 로직 전부(이벤트 핸들러, 레벨업/스탯업, 히스토리, 로그 출력·읽기, 지남서) |
| `oresim/oresim-func.as` | AS2(Flash 8) 시절 구버전. 어디서도 include되지 않는 dead code. 구 로그 포맷(46필드)의 출처 |
| `image/`, `se/` | 자산. `html-template/` = Flex 3 기본 HTML 래퍼 |

오래된 잔재: `src/Main.mxml`(빈 Flex 4 템플릿), `oresim.as3proj`·`obj/*`(FlashDevelop 설정, 저장소에 없는 `oresim_ch.mxml` 대상),
`.actionScriptProperties`의 `main.mxml`/`oresim_ch.mxml` 항목, 미사용 이미지(`c0~c9.png`, `dptup`, `exchange_*`, `left/right`,
`lung`, `mxikoke`, `paste_disable`, `ptup`, `sp.swf`, `Thumbs.db`).

## 빌드

- 원래 환경: Flash Builder + Flex SDK 3.6A, 컴파일 옵션 `-locale ja_JP`, `strict="true"`, 출력 `bin/`(gitignore).
  이 저장소에서 검증된 빌드 절차는 없고, 2026-10 수정도 컴파일러를 돌려 보지는 못했다(정적 검토와 헤드리스 실행으로만 검증).
- AS3 strict 모드 주의: `Number` 식을 `.text`(String)에 넣을 때는 `String()`으로 감싼다. 배열 요소(`*`)는 그대로 넣어도 된다.
  같은 함수 안의 `var i:Number` 중복은 경고만 나므로 기존 코드에 흔하다.
- `oresim-const.as`의 캐릭터 이미지는 99/121/162행 주석 토글(`/* */ … /*/ … /* */`)로 런타임 경로 ↔ `[Embed]`를 전환한다
  (99행 `/* */`를 `/*`로 바꾸면 Embed 쪽이 활성화).
- 붙여넣기 버튼은 호스트 HTML의 JS 함수 `getClipboard()`가 있어야 보인다. `html-template`에는 없어서 항상 숨겨진다.

## 아키텍처 핵심

- **상태가 UI 컨트롤 텍스트에 저장된다.** 별도 모델 객체가 없고 `lv.text`, `s0~s9.text`, `s11.text`(POINT),
  `p0~p6.text`(다음 1포인트 비용), `s7mi/s7mx…`(HP/MP/SP 최소~최대), `tbonus/tlvup/pbonus`를 `parseInt(x.text)`로 읽고 쓴다.
  호출 순서에 의존한다. 예를 들어 `lvup()`/`stup()`은 `p0~p6`을 갱신하지 않으므로 `upPoints()`/`updateStatus()`가 필요하다.
- **파생 상태 재계산**
  - `updateStatus()`: 비용 `p0~p6`, 기준값 `s?L`, 버튼 표시를 다시 계산한다. `initStatus()` 끝에서도 호출한다(LV200에서 시작하는 ロアミニ 대비).
  - `updateNeedXien()`: `_xi`에서 Xien 선행 조건 `_needXien`을 구하고 `updateXienColor()`로 드롭다운을 칠한다.
    `_needXien`은 로그에 저장되지 않으므로 `setLog()`(되돌리기/다시하기, Status 읽기)와 상태 편집 확정에서 다시 계산한다.
- **인덱스 규약**
  - 스탯 `0..6` = STAB, HACK, INT, DEF, MR, DEX, AGI / `7..9` = HP, MP, SP / `10` = WEIGHT(주석 처리, 미사용) / `11` = POINT.
  - 캐릭터 `c` = `CHAR_NAME` 인덱스. 0..15 사용, 16..19는 플레이스홀더(주석 처리, 데이터는 アナイス 복제).
  - 스타일 `s` = `STYLE_NAME[c]` 인덱스(캐릭터별 1~3개). 캐릭터를 바꾸면 항상 스타일 0으로 초기화된다.
  - Xien `x` = `0..49`. `XIEN_NAME`은 0..37만 정의되어 있다. 이름 형식은 `"계열명 확정스탯/확률스탯"`.
- **테이블**(`oresim-const.as`, 모두 같은 인덱스 순서의 병렬 배열)
  - `[c][s]`: `DEFAULT_STATUS`(11: 스탯7+HP/MP/SP/WT), `DEFAULT_NEED_POINT`(7), `DEFAULT_XIEN`(50, one-hot = 초기 선행 계열)
  - `[c][x][LV-1]`: `MAX_XIEN` = 해당 LV에서 그 계열이 도달 가능한 최대 Xien. 배열이 짧으면 마지막 값을 쓴다.
    값이 `[0]`이면 그 캐릭터에게 없는 계열, `[99]`이면 레벨별 데이터가 없어 항상 선택 가능(イソレット/ベンヤ/ロアミニ).
  - `[x]`: `XIEN_UP_BONUS`(레벨업 시 확정 상승. 7..9는 HP/MP/SP 평균), `XIEN_RANDOM_UP_BONUS`(보너스 시 상승),
    `MIN_/MAX_XIEN_UP_STATUS`(HP/MP/SP 상승폭)
  - `[stat]`: `STATUS_UP`(스탯 1포인트당 HP/MP/SP/WT 증가). `[LV-1]`: `BONUS_STATUS_POINT`(그 LV 도달 시 얻는 POINT)
  - `MAX_LEVEL = 285`, `MAX_STATUS = [285×7, 22000, 7000, 12000, 12000]`

## 시뮬레이션 규칙(코드 기준)

- 스탯 +1 비용: `DEFAULT_NEED_POINT[c][s][i] + floor((LV + 5*스탯값) / 125)`.
- 초록 숫자(`s?L`) = 현재 LV에서 비용이 오르는 스탯값: `ceil(25 - LV/5) + 25*floor((LV + 5*스탯값)/125)`.
- `stup(i)`: POINT -= 비용, 스탯+1, HP/MP/SP(+min/max) += `STATUS_UP[i]`.
- `lvup()`:
  1. LV+1
  2. 선택된 Xien(선행 계열) 갱신
  3. 스탯 += `XIEN_UP_BONUS`, HP/MP/SP 평균/최소/최대 가산
  4. 보너스 판정 후 성공 시 `XIEN_RANDOM_UP_BONUS` 가산
  5. `MAX_STATUS`로 클램프
  6. POINT += `BONUS_STATUS_POINT[LV-1]`
- **보너스%**(`bonusNS`, 0~100, 5단위)는 난수가 아니라 결정적이다. `(_bonusPoints+1)*100 <= tlvup*rate`(또는 100%)일 때 보너스를 준다.
  비율을 바꾸면 다음 레벨업에서 `_bonusPoints = floor((tlvup+1)*rate/100)`으로 다시 센다.
  기준은 LV가 아니라 레벨업 횟수다. LV1에서 시작하면 예전 식 `(LV-1)`과 같은 값이라 기존 로그의 재생 결과는 그대로다.
- **Xien 선행 규칙**: 레벨업 시 `_xi[x]`를 x가 최상위가 되는 최솟값으로 올린다(동점이면 인덱스가 큰 계열이 이긴다).
  `_needXien[i]`는 `i < x`이면 max+1, 그 외에는 max. 계열 i는 `MAX_XIEN[c][i][min(LV,len)-1] >= _needXien[i]`일 때만 선택할 수 있고,
  선택할 수 없는 항목은 드롭다운에서 검게 칠해진다. 레벨업 성장치를 결정하는 가장 많이 투자한 스킬 계열을 모델링한 것으로 보인다.
- **대시**(Shift+스탯 키 / 각 스탯 오른쪽 버튼, `stdup`): 포인트가 모자라면 레벨업하면서 비용 단계가 바뀔 때까지 그 스탯에 투자한다.
- ロアミニ(c=15)는 LV200에서 시작한다. `initStatus`·`logOut`은 `c == 15`로, `recipe`는 `log[0][0]`(시작 레벨)로 처리한다.
- 스탯 상한(285)에서는 스탯업이 거부된다. `stupPress()`와 `stup()` 모두 검사하므로 키 입력이든 로그 재생이든 같다.

## 히스토리와 로그

- `log[i]`는 조작 1회(레벨업/스탯업)마다 저장하는 78필드 스냅샷이다.
  `[0]LV [1]xien [2]bonus% [3]tbonus [4]tlvup [5]_bonusPoints [6..12]스탯 [13..15]HP/MP/SP [16]0 [17]POINT
  [18..20]min [21]0 [22..24]max [25]0 [26..75]_xi[0..49] [76]tmpBonusExpected [77]그 레벨 stLog 길이`.
  `logindex+1`에 `[0]==0`인 센티널을 두어 undo/redo(←/→, Shift를 누르면 묶음 이동)에 쓴다.
  되돌린 뒤에는 센티널 자리에 다시하기용 항목이 남아 있다. 그래서 `logOut()`/`recipe()`는 `logindex`까지만 읽는다.
  레벨업 시 직전 항목의 `[1]`/`[2]`를 새 값으로 덮어써서(back-patch) 설정 변경 시점을 기록한다.
- `stLog[LV-1]`은 그 레벨에서 올린 스탯 인덱스 문자열(예: `"0012"`)이다. 상태 편집 시작 레벨에는 `"s"`가 접두로 붙는다.
  편집 스냅샷 `log[0][77]`은 이 `"s"`까지 세어 1이다(되돌리기에서 표시가 지워지지 않게).
  `dashBack()`의 비용 구간 검사는 `log[0]`을 보지 않는다.
- `logOut()`: 텍스트 로그를 만든다(줄바꿈 `\r`, 복사할 때 `\r\n`).
  ```
  LV   1       :
  Bonus        : 50%
  Xien         : 刀系 HACK/DEF
  LV   2 -  15 : STAB 極振り 28up        ← 매 레벨 그 스탯에 살 수 있는 만큼 전부 투자
  Bonus        : 75%                     ← 다음 레벨업부터 적용
  LV  16 -  17 : HACK, AGI              ← 매 레벨 이 순서로 투자("STAB * 2" = 2회)
  ルシアン/物理複合 Bonus: 18 / 30 Point: 2   ← 로더가 캐릭터/스타일 판별에 사용(필수)
  LV:31 STAB 57 HACK 29 INT 1 DEF 13 MR 1 DEX 9 AGI 6
  ```
  상태 편집 후의 로그는 다음과 같다.
  ```
  Status       : <log[0]의 78개 값>
  LV 120       : STAB * 3     ← 편집한 레벨에서 투자한 분(레벨업 없이 재생)
  Bonus        : 75%          ← 그 뒤 첫 레벨업 전에 바꾼 설정
  LV 121       : STAB
  ```
- `logLoad()`: 전각 `，：－`를 정규화하고 공백을 압축한 뒤 푸터로 캐릭터/스타일을 리셋하고 각 줄을 `lvup`/`stup`으로 재생한다.
  - 시작 레벨(`log[0][0]`: LV1, ロアミニ LV200, 편집한 레벨)의 `LV` 줄은 레벨업 없이 투자만 재생한다.
  - `Status` 줄은 78항목(현행)이나 46항목(Xien 20계열 시절, 빠진 값은 0)만 받는다.
  - 푸터가 없으면 읽을 수 있는 `LV n :`/`Status` 줄이 있을 때만 현재 캐릭터/스타일로 초기화하고 재생한다.
  - 텍스트 로그는 설정 변경을 레벨 경계에서만 기록한다. 같은 레벨에서 투자하는 도중에 바꾼 Xien/보너스는 레벨 끝으로 옮겨지고,
    마지막 레벨업 이후의 선택은 남지 않는다. 스탯 결과는 같다.
- `recipe()`(指南書出力): ■ステータス(장비 기입란 템플릿 포함), ■再振りレシピ, ■再振りログ 순으로 출력한다.
  편집 레벨에는 레벨업 항목이 없다. 그래서 편집 레벨에서 투자했으면 그 레벨부터 읽되 비용 구간 비교 인덱스를 1 당기고(`adj`),
  투자하지 않았으면 다음 레벨부터 읽는다. 이때 첫 줄은 「Lv L+1 から」가 된다.
- 단축키: `L` 레벨업, `S H I F M X A` = STAB/HACK/INT/DEF/MR/DEX/AGI +1(Shift = 대시), `←/→` 되돌리기/다시하기,
  `G` 지남서, `P` 로그 읽기, `T` 상태 편집 창, `Enter` 로그창 포커스, `Esc` 포커스 해제.

## 데이터/구조 변경 체크리스트

- **캐릭터 추가**: `CHAR_NAME`, `charList`, `cNImg`/`charImgSymbol`, `STYLE_NAME`, `DEFAULT_STATUS`, `DEFAULT_NEED_POINT`,
  `DEFAULT_XIEN`, `MAX_XIEN`(캐릭터당 50행)을 모두 같은 순서로 수정한다.
  `logLoad`는 스타일을 인덱스 0..2까지만 판별한다.
- **Xien 추가/확장**: 50이 여러 곳에 하드코딩되어 있다.
  - `oresim-const.as`: `XIEN_NAME`, `MAX_XIEN` 각 행, `XIEN_UP_BONUS`, `XIEN_RANDOM_UP_BONUS`, `MIN_/MAX_XIEN_UP_STATUS`, `DEFAULT_XIEN` 행 길이
  - `oresim-main.as`의 `_needXien`/`_xi` 초기 배열, `initStatus`의 `_xi` 복사, `logging()`/`setLog()`의 `x[0..49]`↔`l[26..75]` 매핑, 센티널 배열
  - 로그 필드 수(현재 78)가 바뀌므로 `logLoad`의 두 곳(`Status` 항목 수 검사, 푸터 없는 로그의 사전 검사)도 맞춰야 한다.
- **`MAX_LEVEL`/`MAX_STATUS` 변경**: 상태 편집 창의 상한은 `statusEdit()`가 상수에서 설정한다.
  두 MXML의 `maximum`도 같은 값(285)으로 맞춰 두었으니 함께 바꾼다.

## 수정 이력(2026-10)

원본 커밋 `cc4b36f` 대비. 각 항목은 헤드리스 실행으로 재현한 뒤 고쳤다.
- 로그 읽기/출력
  - `Status` 줄(78항목)을 읽지 못하던 문제(46항목만 받았음). 구 46항목 형식은 0으로 채워 받는다.
  - 상태 편집한 레벨에서 투자한 분과 그 뒤 첫 레벨업 전의 Bonus/Xien 변경이 로그에서 빠지던 문제. 편집 레벨이 LV1일 때도 포함.
  - 되돌린 뒤 `G` 등으로 출력한 로그·지남서가 취소된 조작까지 반영하던 문제.
  - 푸터 없는 로그를 현재 상태 위에 이어서 재생하던 문제.
- 상태 편집
  - 편집 창의 상한(255)이 `MAX_LEVEL`/`MAX_STATUS`(285)보다 낮아 값이 잘리던 문제.
  - POINT 하한이 1이라 0이 1로 바뀌던 문제.
  - Xien 입력값을 검증하지 않던 문제.
  - 편집 뒤 Xien 선행 조건이 갱신되지 않던 문제.
  - 편집 지점으로 되돌리면 편집 표시가 사라져 예외가 나던 문제.
- 시뮬레이션
  - 키 입력으로는 상한 285에서도 스탯업이 되던 문제.
  - 보너스% 변경 시 LV1 시작을 전제한 재계산 때문에 ロアミニ나 편집 이후 보너스가 0회가 되던 문제.
  - 되돌리기/다시하기 뒤 Xien 선행 조건과 드롭다운 색이 복원되지 않던 문제.
- ロアミニ
  - 선택 직후 비용 표시가 LV1 기준이라 첫 대시가 싼 비용으로 투자되던 문제.
  - LV200 시작점으로 되돌리면 예외가 나던 문제.
  - 지남서에 투자 지시가 빠지거나, 이전 캐릭터의 기록을 읽어 예외가 나던 문제.
- 지남서
  - 편집 레벨에서 투자하지 않으면 이후 지시가 한 레벨씩 어긋나거나 예외가 나던 문제.
  - 편집 레벨이 마지막 레벨일 때 값이 틀리던 문제.
  - 편집 레벨에서 「必要Point」 주석이 빠지던 문제.
- 데이터·자산
  - 데이터 이상치 3건 보정(추정치, 아래 참고).
  - `image/c0~c9.JPG`를 코드 참조와 같은 `.jpg`로 이름 변경.

## 남은 한계·주의

- 데이터 일부는 추정치다. 실측값을 알면 교체할 것.
  - イサック 気功系 `MAX_XIEN` Lv79-80(원래 74,76 → 73,73. 단조성 위반을 뒤 레벨 값 기준으로 보수적으로 맞춤).
  - ティエラ HP/MP/SP 평균(鞭系 값이 남아 있던 것을 자기 최소/최대의 중간값으로 바꿈).
  - 呪術 HP/MP/SP 최소/최대(실측 없음. 템플릿 폭을 유지한 채 평균 중심으로 옮긴 잠정값).
  - イソレット/ベンヤ/ロアミニ의 `MAX_XIEN`은 `[99]` 플레이스홀더다.
  - ﾃﾞｽｻｲｽﾞ/ﾎｰﾘｰﾊﾝﾏｰ의 HP/MP/SP는 アナイス 행을 복사한 값이다.
- 붙여넣기 버튼은 호스트 HTML에 `getClipboard()`가 있어야 보인다(위 빌드 항목).

## 검증 방법 메모

Flash를 실행·컴파일할 수 없어서 다음과 같이 검증했다. 스크립트는 세션 작업 공간에만 있었고 저장소에는 넣지 않았다.
1. 하네스
   - `.as`에서 AS3 전용 문법(`import`, `[Bindable]`, `public/private`, `:Type`, `as Text`)만 정규식으로 지운다.
   - Node `vm` 컨텍스트에서 실행하고 Flex 컨트롤은 목으로 바꾼다.
   - 목의 `text`는 String으로 강제한다.
   - `NumericStepper`는 Flex처럼 commit 시점에 min/max/step으로 클램프한다. 한계값은 MXML에서 읽는다.
   - `ComboBox.selectedItem`은 dataProvider에서 꺼낸다.
   - AS3의 타입 지정 변수 기본값(`Number`는 NaN)은 JS(undefined)와 다르니 해석할 때 주의한다.
2. 차등 테스트: 원본과 수정본에 같은 무작위 조작을 넣고 정상 경로의 로그 텍스트·화면 값·내부 상태가 바이트 단위로 같은지 본다.
3. 불변식 퍼저
   - 출력→읽기 왕복 재현
   - ←×k →×k 복귀
   - P 멱등
   - 편집 창 「適用」 무변화
   - `_xi`가 `MAX_XIEN` 이하
   - 예외 없음
   - 지남서 = 다시 읽은 쪽의 지남서
4. 기준 비교: 아무것도 바꾸지 않은 LV1/LV2 상태 편집의 지남서가 일반 흐름과 같은지 본다.
5. 퍼저의 난수는 정수 PRNG(mulberry32)를 쓴다. 부동소수점 LCG는 2^53을 넘으면 하위 비트를 잃는다.
