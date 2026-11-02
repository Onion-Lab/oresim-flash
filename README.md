> 이 저장소에는 원작 Flash판 소스와, 그것을 브라우저에서 쓰도록 옮긴 웹판(`web/`)이 함께 있습니다.
> 웹판을 쓰는 법과 직접 올리는 법은 맨 아래 [웹판](#웹판) 절에 있습니다. 바로 아래 글은 원작자가 2015년에 올린 공개 안내문입니다.

# 나만의 재분배 시뮬레이터(oresim)를 오픈 소스로 공개합니다!

요즘 오픈 소스 붐, Flash 퇴출 붐, 혐한 붐…

![이 빅 웨이브에 올라탈 수밖에 없다](https://41.media.tumblr.com/1ac3c4bd7432a0250adb1eae463b4a94/tumblr_npn5bmTvqR1ux6tqqo1_500.jpg)

그래서 다음 세대에 모든 것을 맡기고자 GitHub에 소스 전체를 올립니다!

* [Flash PC판 소스](https://github.com/rugumaxi/oresim-flash)

* [Flash Lite 피처폰판 소스](https://github.com/rugumaxi/oreim-flashlite)

* [i-appli(NTT 도코모)판 소스](https://github.com/rugumaxi/oresim-iapp)

* [EZ-appli(au)·V-appli(보다폰)판 소스](https://github.com/rugumaxi/oresim-ezvapp)

사이트는 2015년 11월 11일쯤 닫을 예정입니다.

그동안 이용해 주셔서 감사합니다… 루그 서버 모 막시 선생의 차기작(그런 거 없음)을 기대해 주세요.

---

> 원작자 rugumaxi가 2015년에 일본어로 올린 공개 안내문을 한국어로 옮긴 것입니다.

## 웹판

테일즈위버의 스탯 재분배 플래너 '나만의 재분배 시뮬레이터'를 Flash 없이 브라우저에서 쓰는 판입니다.
이 저장소의 Flash판(원작에 2026년의 버그 수정과 한국어화를 더한 것)의 계산을 그대로 옮겨, 같은 조작이면 Flash판과 같은 스탯·재분배 로그·육성 가이드가
나옵니다. Flash판을 헤드리스로 돌린 결과와 자동으로 비교해 확인했습니다. 설치도 로그인도 없고, 계획은 서버가 아니라 쓰는 사람의 브라우저에만 남습니다.

### 쓰는 법

- 캐릭터와 타입을 고릅니다(넓은 화면은 왼쪽 목록, 좁은 화면은 위쪽의 캐릭터 단추).
- **레벨업**(`L`)과 스탯 **+1**(`S` `H` `I` `F` `M` `X` `A` = STAB HACK INT DEF MR DEX AGI)로 계획을 만듭니다.
  `Shift`+스탯 키(또는 스탯마다 있는 대시 단추)는 그 스탯을 비용이 오르기 전까지 몰아 찍고, 포인트가 모자라면 레벨업하며 찍습니다.
  대시가 끝나는 값은 단추에 'N까지'로 보입니다.
- `←`/`→`는 되돌리기/다시 실행입니다. `Shift`를 함께 누르면 대시 단위로 움직입니다(같은 스탯을 같은 비용으로 이어 찍은 조작을
  사이의 레벨업과 함께 한꺼번에).
- 보너스%(다음 레벨업부터 적용)와 주력 계열을 고릅니다. **스탯 편집**(`T`)으로 지금 캐릭터의 상태에서 계획을 시작할 수 있습니다.
- **재분배 로그**와 **육성 가이드** 탭(`G`로 전환)의 글을 '복사'하거나, **링크 복사**로 계획 전체를 링크 하나에 담아 나눕니다.
- 받은 재분배 로그는 '붙여넣은 로그' 칸에 붙여넣고 **로그 불러오기**(`P`)를 누릅니다. 지금 계획이 지워지게 되면 먼저 묻습니다.
  일본어판(원작)에서 만든 로그는 캐릭터·계열 이름이 달라 제대로 읽히지 않습니다(불러오기 전에 알려 줍니다).
- 2026년 11월 판부터 최고 레벨과 스탯 상한이 255이고, 타입 이름(예: `베기` → `베기형`, 이자크는 `무술형`·`기공형`·`반격형`)과 일부 캐릭터의
  기본 스탯·필요 포인트가 바뀌었습니다. 그전 판에서 만든 로그·링크·자동 저장에 이름이 바뀐 타입이 있으면 그 캐릭터의 첫 타입으로 읽힙니다.
- 계획은 이 브라우저에 자동으로 저장되어 다시 열면 이어집니다(되돌리기 기록까지). `?`를 누르면 단축키 목록이 나옵니다.

### 개인정보

- 계산은 모두 브라우저 안에서 합니다. 서버에 저장하는 것은 없습니다.
- 자동 저장은 이 브라우저의 저장소(localStorage: 계획 `oresim:plan`, 효과음 설정)에만 남습니다. 다른 기기나 브라우저와 맞추지 않고,
  브라우저의 사이트 데이터를 지우면 사라집니다.
- 공유 링크는 계획 전체를 주소의 `#` 뒤에 담습니다. 브라우저는 `#` 뒤를 서버로 보내지 않으므로, 이 페이지를 내보내는 서버와 Cloudflare도
  링크 속 계획을 받지 않습니다. 링크를 받은 사람과 링크를 옮긴 메신저는 그 내용을 볼 수 있습니다.
- 페이지는 글꼴을 Google Fonts(fonts.googleapis.com, fonts.gstatic.com)에서 받습니다. 그 밖에 분석·광고·추적 요청은 없습니다.
  웹 서버와 Cloudflare는 여느 사이트처럼 접속 기록(IP 주소, 요청한 파일)을 남길 수 있습니다.

### 내 컴퓨터에서 열기

- `web/index.html`을 브라우저로 열면 됩니다(`file://`). 모든 기능이 돌고, 효과음만 다른 방식(`<audio>`)으로 냅니다.
  이렇게 연 페이지에서 만든 공유 링크는 그 컴퓨터의 파일을 가리키므로, 남에게 줄 링크는 서버에 올린 주소에서 만듭니다.
- 또는 `web/`을 정적 서버로 내보냅니다: `python3 -m http.server --directory web 8000` → http://localhost:8000/
- Chromium 계열 브라우저로 시험했습니다. 다른 브라우저(특히 Safari)는 시험하지 못했습니다.

### 내 서버에 올리기(Cloudflare 뒤)

`web/`은 빌드가 필요 없는 정적 파일입니다. 서버 프로그램도 데이터베이스도 없습니다.

1. `web/`의 내용(`index.html`, `app.css`, `favicon.svg`, `js/`, `img/`, `se/`)을 정적 웹 서버의 아무 경로에 복사합니다. 주소가 모두 상대경로라
   `https://oresim.example.com/`이든 `https://example.com/oresim/`이든 됩니다(폴더 주소는 끝의 `/`까지. nginx는 `/oresim`을 `/oresim/`으로 넘겨 줍니다).
   예: `rsync -a --delete --exclude='.taste-skill' web/ 서버:/var/www/oresim/`
2. 캐시: `index.html`은 캐시하지 않고(`no-cache`: 매번 새 판인지 확인), `?v=` 판 번호가 붙는 `app.css`, `js/*.js`, `favicon.svg`는 오래 캐시해도 됩니다.
   새 판의 `index.html`은 `?v=`를 올려 이 파일들을 새 주소로 받게 합니다. `img/`, `se/`에는 판 번호가 없으니 짧게 캐시합니다.

nginx 예(`web/`의 내용을 `/var/www/oresim/`에 복사해 `/oresim/`으로 내보낼 때. 도메인 맨 위에 둘 때는 `/oresim/`을 `/`로, `root`를 `/var/www/oresim`으로):

```nginx
server {
    # (가) 프록시된 DNS 레코드: 443에서 원 서버 인증서로
    listen 443 ssl;
    ssl_certificate     /etc/ssl/oresim/origin.pem;   # Cloudflare 원 서버 인증서나 Let's Encrypt 인증서
    ssl_certificate_key /etc/ssl/oresim/origin.key;
    # (나) Cloudflare Tunnel: 위 세 줄 대신, 이 컴퓨터 안에서만 듣는다
    # listen 127.0.0.1:8080;

    server_name oresim.example.com;
    root /var/www;               # /oresim/… → /var/www/oresim/…
    charset utf-8;               # index.html 등의 문자 코드를 UTF-8로 알린다(페이지에 한국어가 그대로 있다)
    absolute_redirect off;       # /oresim → /oresim/ 넘김을 상대 주소로(프록시·터널 뒤에서 내부 주소와 포트가 붙지 않게)

    location /oresim/ {
        index index.html;
        add_header Cache-Control "no-cache";                               # index.html: 매번 확인(바뀌지 않았으면 304)
    }
    location ~ ^/oresim/.+\.(?:css|js|svg)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";    # ?v= 가 붙는 파일
    }
    location ~ ^/oresim/.+\.(?:png|mp3)$ {
        add_header Cache-Control "public, max-age=86400";                  # 판 번호가 없는 그림·효과음: 하루
    }
}
```

- 그 도메인의 server 블록이 이미 있다면 location 세 개만 옮겨 넣습니다. server 블록에 다른 `add_header`(보안 헤더 등)가 있으면
  위 location 안에도 다시 적습니다. nginx는 location에 `add_header`가 하나라도 있으면 바깥 것을 물려받지 않습니다.

Cloudflare(도메인을 Cloudflare에서 관리할 때):

- **연결**: 둘 중 하나를 씁니다.
  - 프록시된 DNS 레코드(주황 구름): A/AAAA 레코드가 서버의 공인 IP를 가리키게 하고 프록시를 켭니다. 원 서버에 유효한 인증서가 있으면
    SSL/TLS 암호화 모드를 `Full (strict)`로 둡니다. nginx는 위의 (가).
  - Cloudflare Tunnel: Zero Trust 대시보드의 터널 메뉴(Networks → Tunnels 등. 메뉴 이름은 가끔 바뀝니다)에서 터널을 만들고 서버에 `cloudflared`를
    설치한 뒤, 그 터널에 공개 호스트 이름(public hostname, 새 대시보드에서는 published application route)을 더합니다: 하위 도메인과 도메인,
    서비스 `http://127.0.0.1:8080`(nginx가 IPv4에서만 들으므로 `localhost` 대신 이 주소). DNS 레코드는 대시보드가 만들어 주고, 서버에 들어오는
    포트를 열지 않아도 됩니다. nginx는 위의 (나).
- **HTTPS**: 복사·붙여넣기 단추가 쓰는 클립보드는 HTTPS 페이지에서만 열립니다. Always Use HTTPS를 켜 두면 좋습니다.
- **업데이트할 때마다** 새 파일을 복사한 뒤 캐시를 비웁니다(Caching → Configuration → Purge Cache: 바뀐 주소만 Custom Purge, 또는 Purge Everything).
  Cloudflare는 기본 설정에서 HTML은 캐시하지 않고 `.css`, `.js`, `.svg`, `.png`, `.mp3` 같은 정적 파일은 원 서버의 `Cache-Control`대로 캐시합니다.
  `?v=`가 올라간 파일은 새 주소라 그대로 새로 받지만, `img/`, `se/`의 파일을 바꿨거나 `?v=`를 올리지 않은 판이라면 꼭 비웁니다.
- **Rocket Loader**는 이 페이지에서 끕니다. 페이지의 스크립트를 고쳐 써서 나중에 실행하는 기능이라, 표·엔진·화면 스크립트를 차례로 읽고 바로 시작하는
  이 페이지의 순서와 시점이 달라집니다(Rocket Loader를 켠 채로는 시험하지 않았습니다). 영역 전체(Speed 설정)에서 끄거나, Rules → Configuration Rules로
  이 주소에만 끕니다.
- **Cloudflare Access**: 누구나 쓰는 페이지라면 이 호스트 이름과 경로를 덮는 Access 응용 프로그램(정책)을 두지 않습니다. 있으면 플레이어가
  로그인 화면을 만납니다. 혼자나 일부 사람만 쓰려는 경우에만 Access로 막습니다.
- Web Analytics 자동 설정처럼 Cloudflare가 HTML에 스크립트를 끼워 넣는 기능을 켜면, 위 '개인정보'의 설명(외부 요청은 Google Fonts뿐)이 달라집니다.
- 엔진이나 표가 바뀐 판을 올리면, 방문자 브라우저에 자동 저장된 계획은 재분배 로그에서 다시 만들어지고 되돌리기 기록은 이어지지 않습니다
  (화면에 알림이 뜹니다).

### 출처와 권리

- 원작: '나만의 재분배 시뮬레이터' Flash판, rugumaxi(루그 서버 모 막시), 2015년, [Apache License 2.0](LICENSE).
- 웹판은 원작을 옮겨 고친 비공식 팬 도구입니다. Softmax·Nexon과는 관계가 없습니다.
- TalesWeaver와 캐릭터 그림의 권리는 Softmax와 Nexon에 있습니다. 캐릭터 그림 등 게임 자산은 Apache License 2.0의 대상이 아닐 수 있습니다.
- 글꼴은 Google Fonts에서 받는 IBM Plex Sans KR과 Hahmlet입니다.
