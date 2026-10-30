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

- 원래 환경: Flash Builder + Flex SDK 3.6A, 컴파일 옵션 `-locale ja_JP`, 출력 `bin/`(gitignore). 이 저장소에서 검증된 빌드 절차는 없다.
- `oresim-const.as`의 캐릭터 이미지는 99/121/162행 주석 토글(`/* */ … /*/ … /* */`)로 런타임 경로 ↔ `[Embed]`를 전환한다
  (99행 `/* */`를 `/*`로 바꾸면 Embed 쪽이 활성화).
- 붙여넣기 버튼은 호스트 HTML의 JS 함수 `getClipboard()`가 있어야 보인다. `html-template`에는 없어서 항상 숨겨진다.

## 아키텍처 핵심

- **상태가 UI 컨트롤 텍스트에 저장된다.** 별도 모델 객체가 없고 `lv.text`, `s0~s9.text`, `s11.text`(POINT),
  `p0~p6.text`(다음 1포인트 비용), `s7mi/s7mx…`(HP/MP/SP 최소~최대), `tbonus/tlvup/pbonus`를 `parseInt(x.text)`로 읽고 쓴다.
  호출 순서에 의존한다. 예를 들어 `lvup()`/`stup()`은 `p0~p6`을 갱신하지 않으므로 `upPoints()`/`updateStatus()`가 필요하다.
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
- **Xien 선행 규칙**: 레벨업 시 `_xi[x]`를 x가 최상위가 되는 최솟값으로 올린다(동점이면 인덱스가 큰 계열이 이긴다).
  `_needXien[i]`는 `i < x`이면 max+1, 그 외에는 max. 계열 i는 `MAX_XIEN[c][i][min(LV,len)-1] >= _needXien[i]`일 때만 선택할 수 있고,
  선택할 수 없는 항목은 드롭다운에서 검게 칠해진다. 레벨업 성장치를 결정하는 가장 많이 투자한 스킬 계열을 모델링한 것으로 보인다.
- **대시**(Shift+스탯 키 / 각 스탯 오른쪽 버튼, `stdup`): 포인트가 모자라면 레벨업하면서 비용 단계가 바뀔 때까지 그 스탯에 투자한다.
- ロアミニ(c=15)는 LV200에서 시작한다. `initStatus`와 `logOut`에 하드코딩되어 있다.

## 히스토리와 로그

- `log[i]`는 조작 1회(레벨업/스탯업)마다 저장하는 78필드 스냅샷이다.
  `[0]LV [1]xien [2]bonus% [3]tbonus [4]tlvup [5]_bonusPoints [6..12]스탯 [13..15]HP/MP/SP [16]0 [17]POINT
  [18..20]min [21]0 [22..24]max [25]0 [26..75]_xi[0..49] [76]tmpBonusExpected [77]그 레벨 stLog 길이`.
  `logindex+1`에 `[0]==0`인 센티널을 두어 undo/redo(←/→, Shift를 누르면 묶음 이동)에 쓴다.
  레벨업 시 직전 항목의 `[1]`/`[2]`를 새 값으로 덮어써서(back-patch) 설정 변경 시점을 기록한다.
- `stLog[LV-1]`은 그 레벨에서 올린 스탯 인덱스 문자열(예: `"0012"`)이다. 상태 편집 시작 레벨에는 `"s"`가 접두로 붙는다.
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
  상태 편집 후에는 맨 앞에 `Status       : <78개 값>` 줄이 출력된다.
- `logLoad()`: 전각 `，：－`를 정규화하고 공백을 압축한 뒤 푸터로 캐릭터/스타일을 리셋하고 각 줄을 `lvup`/`stup`으로 재생한다.
- `recipe()`(指南書出力): ■ステータス(장비 기입란 템플릿 포함), ■再振りレシピ, ■再振りログ 순으로 출력한다.
- 단축키: `L` 레벨업, `S H I F M X A` = STAB/HACK/INT/DEF/MR/DEX/AGI +1(Shift = 대시), `←/→` 되돌리기/다시하기,
  `G` 지남서, `P` 로그 읽기, `T` 상태 편집 창, `Enter` 로그창 포커스, `Esc` 포커스 해제.

## 데이터/구조 변경 체크리스트

- **캐릭터 추가**: `CHAR_NAME`, `charList`, `cNImg`/`charImgSymbol`, `STYLE_NAME`, `DEFAULT_STATUS`, `DEFAULT_NEED_POINT`,
  `DEFAULT_XIEN`, `MAX_XIEN`(캐릭터당 50행)을 모두 같은 순서로 수정한다.
  `logLoad`는 스타일을 인덱스 0..2까지만 판별한다.
- **Xien 추가/확장**: 50이 여러 곳에 하드코딩되어 있다.
  - `oresim-const.as`: `XIEN_NAME`, `MAX_XIEN` 각 행, `XIEN_UP_BONUS`, `XIEN_RANDOM_UP_BONUS`, `MIN_/MAX_XIEN_UP_STATUS`, `DEFAULT_XIEN` 행 길이
  - `oresim-main.as`의 `_needXien`/`_xi` 초기 배열, `initStatus`의 `_xi` 복사, `logging()`/`setLog()`의 `x[0..49]`↔`l[26..75]` 매핑, 센티널 배열
  - 로그 필드 수가 바뀌므로 `logLoad`의 `Status` 길이 검사도 맞춰야 한다.
- **`MAX_LEVEL`/`MAX_STATUS` 변경**: `oresim.mxml`·`oresim_offline.mxml`의 상태 편집 `NumericStepper` `maximum`(현재 255)도 함께 바꾼다.

## 알려진 문제(헤드리스 실행으로 재현 확인, 2026-10)

1. `Status` 줄을 다시 읽을 수 없다. 출력은 78필드인데 `logLoad`는 46필드(AS2 구포맷)만 받아서 줄이 무시되고 LV1부터 재생된다.
   위치: `oresim/oresim-main.as:1530`
2. 상태 편집한 레벨에서 바로 올린 스탯이 텍스트 로그에서 빠진다. `logOut`이 `min = l[0][0]`부터 출력하기 때문이다.
   위치: `oresim/oresim-main.as:1083`. 지남서(`recipe`)에는 포함된다.
3. 상태 편집 창의 상한(LV·스탯 255)이 `MAX_LEVEL`/`MAX_STATUS`(285)와 다르다. LV270에서 `T`를 누르고 그대로 適用만 해도 LV·스탯이 255로 잘린다.
   위치: `oresim.mxml:97-109,119`
4. 키보드 스탯업에 상한 검사가 없다. 스탯이 285여도 포인트가 소모되고 HP/MP/SP가 오르며 로그에도 남는다.
   위치: `oresim/oresim-main.as:155-171,756-766`. 버튼과 대시(`stdupPress`)는 상한을 검사한다.
5. 보너스%를 바꾸면 `_bonusPoints = floor((LV-1)*rate)`로 재계산한다. LV1 시작을 전제하므로 ロアミニ(LV200 시작)나
   상태 편집 이후에는 그 뒤 보너스가 0회가 된다. 위치: `oresim/oresim-main.as:717-719`
6. 데이터 이상치(`oresim/oresim-const.as`)
   - イサック 気功系 `MAX_XIEN`이 LV80→81에서 76→73으로 감소한다(1499-1500행).
   - ティエラ SP 평균 29가 최소~최대 22~27 범위 밖이다(2046행, 鞭系 값을 복사한 것으로 보임).
   - 呪術 MP 평균 9가 3~7 범위 밖이다(MIN/MAX가 플레이스홀더 `15_1系` 값 그대로, 2167·2225행).
7. 이미지 경로의 대소문자가 다르다. 코드는 `image/c0.jpg`~`c9.jpg`를 참조하지만 실제 파일은 `c0.JPG`~`c9.JPG`라서
   대소문자를 구분하는 파일시스템(리눅스 서버, offline판 `@Embed`)에서 깨진다.
8. 푸터 줄(`キャラ/型 …`) 없이 로그를 읽으면 리셋 없이 현재 상태 위에 이어서 재생한다.
9. 마지막 레벨업 이후에 바꾼 Xien/보너스 선택은 로그에 남지 않는다(설계상 의도로 보이며 스탯에는 영향 없음).

## 검증 방법 메모

Flash를 실행할 수 없으므로 다음 방식으로 실제 로직을 검증했다.
1. `.as`에서 AS3 전용 문법(`import`, `[Bindable]`, `public/private`, `:Type`, `as Text`)만 정규식으로 제거한다.
2. Node `vm` 컨텍스트에서 실행하고 Flex 컨트롤은 목으로 대체한다.
   - `text`는 String으로 강제 변환한다.
   - `NumericStepper`는 min/max/step으로 클램프한다.
   - `ComboBox.selectedItem`은 dataProvider에서 꺼낸다.
3. AS3의 타입 지정 변수 기본값(`Number`는 NaN, `undefined`가 아님)은 JS와 다르니 주의한다.
4. 정상 경로(로그 출력 → 읽기 왕복)는 전 캐릭터·스타일 퍼징 172회에서 모두 스탯을 재현했다.
