/* 화면 확인용 정적 데이터. 엔진을 연결하면 지운다.
   gen-draft-data.js 가 원본 코드(oresim-main.as, 헤드리스 하네스)로 만든 값이다. 손으로 고치지 않는다.
   상태마다 contract.md 모양 그대로: view = e.view(), preview = e.preview(), log = e.exportLog(), guide = e.guide()
   (줄바꿈은 원본처럼 \r). edit = e.editOpen() 의 결과(스탯 편집 창을 열 때 쓴다).
   before 는 엔진 출력이 아니라 UI가 스스로 기억하는 것: 직전에 보낸 조작({ act, args })과 그 전의 view.
   ?state=main|fresh|max|nopoint|cap|roamini|edited|undone 으로 고른다(연결 단계에서 없앤다). */
window.ORESIM_DRAFT = {
 "main": {
  "view": {
   "char": 0,
   "type": 0,
   "charName": "루시안",
   "typeName": "물리복합",
   "chars": [
    {
     "name": "루시안",
     "types": [
      "물리복합",
      "베기",
      "찌르기"
     ],
     "startLv": 1
    },
    {
     "name": "보리스",
     "types": [
      "물리복합",
      "베기",
      "마검사"
     ],
     "startLv": 1
    },
    {
     "name": "막시민",
     "types": [
      "물리복합",
      "베기",
      "마검사"
     ],
     "startLv": 1
    },
    {
     "name": "시벨린",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "밀라",
     "types": [
      "베기",
      "물리복합",
      "찌르기"
     ],
     "startLv": 1
    },
    {
     "name": "티치엘",
     "types": [
      "공격",
      "보조",
      "전투"
     ],
     "startLv": 1
    },
    {
     "name": "이스핀",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "나야트레이",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "조슈아",
     "types": [
      "강화",
      "변화",
      "방출"
     ],
     "startLv": 1
    },
    {
     "name": "클로에",
     "types": [
      "화염",
      "빙한",
      "전격"
     ],
     "startLv": 1
    },
    {
     "name": "란지에",
     "types": [
      "물리",
      "마법",
      "보조"
     ],
     "startLv": 1
    },
    {
     "name": "이자크",
     "types": [
      "찌르기",
      "베기",
      "물리복합"
     ],
     "startLv": 1
    },
    {
     "name": "아나이스",
     "types": [
      "마법인형",
      "파괴정령",
      "비호정령"
     ],
     "startLv": 1
    },
    {
     "name": "이솔렛",
     "types": [
      "티엘라",
      "신성찬트"
     ],
     "startLv": 1
    },
    {
     "name": "벤야",
     "types": [
      "영령"
     ],
     "startLv": 1
    },
    {
     "name": "로아미니",
     "types": [
      "주술"
     ],
     "startLv": 200
    }
   ],
   "lv": 124,
   "maxLv": 285,
   "startLv": 1,
   "point": 11,
   "stats": [
    {
     "key": "STAB",
     "value": 133,
     "cost": 7,
     "nextStepAt": 151,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "HACK",
     "value": 53,
     "cost": 4,
     "nextStepAt": 76,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "INT",
     "value": 1,
     "cost": 4,
     "nextStepAt": 26,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "DEF",
     "value": 17,
     "cost": 3,
     "nextStepAt": 26,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "MR",
     "value": 1,
     "cost": 4,
     "nextStepAt": 26,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "DEX",
     "value": 152,
     "cost": 9,
     "nextStepAt": 176,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "AGI",
     "value": 22,
     "cost": 3,
     "nextStepAt": 26,
     "canUp": true,
     "canDash": true,
     "atCap": false
    }
   ],
   "hp": {
    "value": 3608,
    "min": 2993,
    "max": 4223
   },
   "mp": {
    "value": 592,
    "min": 469,
    "max": 715
   },
   "sp": {
    "value": 7136,
    "min": 6890,
    "max": 7412
   },
   "bonus": {
    "rate": 75,
    "achieved": 84,
    "levelUps": 123,
    "effective": "68.2%"
   },
   "xien": {
    "selected": 9,
    "lines": [
     {
      "x": 1,
      "name": "화염계 INT/DEX",
      "selectable": true
     },
     {
      "x": 3,
      "name": "바람계 DEX/INT",
      "selectable": true
     },
     {
      "x": 5,
      "name": "전격계 INT/MR",
      "selectable": true
     },
     {
      "x": 8,
      "name": "공통계 DEX/AGI",
      "selectable": true
     },
     {
      "x": 9,
      "name": "검계 STAB/DEX",
      "selectable": true
     },
     {
      "x": 10,
      "name": "도계 HACK/DEF",
      "selectable": true
     }
    ]
   },
   "canUndo": true,
   "canRedo": false,
   "actions": 280,
   "levelLog": [
    "",
    "00",
    "00",
    "00",
    "00",
    "00",
    "000",
    "000",
    "000",
    "0",
    "00",
    "0",
    "00",
    "0",
    "00",
    "0",
    "00",
    "0",
    "00",
    "0",
    "0",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16555555555",
    "5",
    "55",
    "55",
    "5",
    "55",
    "5",
    "55",
    "5",
    "5",
    "5",
    "55",
    "5",
    "5",
    "5",
    "55",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "",
    "5",
    ""
   ]
  },
  "preview": {
   "lv": 125,
   "point": 6,
   "stats": [
    1,
    0,
    0,
    0,
    0,
    1,
    0
   ],
   "hp": 17,
   "mp": 1,
   "sp": 26,
   "bonus": true
  },
  "log": "LV   1       :\rBonus        : 50%\rXien         : 도계 HACK/DEF\rLV   2 -  20 : STAB 몰빵 35회\rLV  21       : STAB\rLV  22 -  31 : \rBonus        : 75%\rXien         : 검계 STAB/DEX\rLV  32 -  50 : HACK, AGI\rLV  51       : HACK, AGI, DEX * 9\rLV  52 - 123 : DEX 몰빵 72회\rLV 124       : \r루시안/물리복합 Bonus: 84 / 123 Point: 11\rLV:124 STAB 133 HACK 53 INT 1 DEF 17 MR 1 DEX 152 AGI 22",
  "guide": "■스탯\r[캐릭터] 루시안\r[타입] 물리복합\r[LV] 124\r[STAB] 133\r[HACK] 53\r[INT] 1\r[DEF] 17\r[MR] 1\r[DEX] 152\r[AGI] 22\r[HP] 3608\r[MP] 592\r[SP] 7136\r보너스 68.2%\r\r[투구] \r[무기] \r[갑옷] \r[방패] \r[머리] \r[몸] \r[손] \r[다리] \r[펫] \r[사냥터] \r\r\r■재분배 순서\rLv 2부터 보너스 50%, 도계 HACK/DEF 주력\rSTAB 40까지 찍기 (Lv 31)\rLv 32부터 보너스 75%, 검계 STAB/DEX 주력\rHACK 34까지 찍기\rAGI 3까지 찍기 (Lv 32)\rHACK 35까지 찍기\rAGI 4까지 찍기 (Lv 33)\rHACK 36까지 찍기\rAGI 5까지 찍기 (Lv 34)\rHACK 37까지 찍기\rAGI 6까지 찍기 (Lv 35)\rHACK 38까지 찍기\rAGI 7까지 찍기 (Lv 36)\rHACK 39까지 찍기\rAGI 8까지 찍기 (Lv 37)\rHACK 40까지 찍기\rAGI 9까지 찍기 (Lv 38)\rHACK 41까지 찍기\rAGI 10까지 찍기 (Lv 39)\rHACK 42까지 찍기 (필요 포인트 3)\rAGI 11까지 찍기 (Lv 40)\rHACK 43까지 찍기\rAGI 12까지 찍기 (Lv 41)\rHACK 44까지 찍기\rAGI 13까지 찍기 (Lv 42)\rHACK 45까지 찍기\rAGI 14까지 찍기 (Lv 43)\rHACK 46까지 찍기\rAGI 15까지 찍기 (Lv 44)\rHACK 47까지 찍기\rAGI 16까지 찍기 (Lv 45, 필요 포인트 3)\rHACK 48까지 찍기\rAGI 17까지 찍기 (Lv 46)\rHACK 49까지 찍기\rAGI 18까지 찍기 (Lv 47)\rHACK 50까지 찍기\rAGI 19까지 찍기 (Lv 48)\rHACK 51까지 찍기\rAGI 20까지 찍기 (Lv 49)\rHACK 52까지 찍기\rAGI 21까지 찍기 (Lv 50)\rHACK 53까지 찍기\rAGI 22까지 찍기\rDEX 152까지 찍기 (Lv 123, 필요 포인트 9)\r\r\r■재분배 로그\rLV   1       :\rBonus        : 50%\rXien         : 도계 HACK/DEF\rLV   2 -  20 : STAB 몰빵 35회\rLV  21       : STAB\rLV  22 -  31 : \rBonus        : 75%\rXien         : 검계 STAB/DEX\rLV  32 -  50 : HACK, AGI\rLV  51       : HACK, AGI, DEX * 9\rLV  52 - 123 : DEX 몰빵 72회\rLV 124       : \r루시안/물리복합 Bonus: 84 / 123 Point: 11\rLV:124 STAB 133 HACK 53 INT 1 DEF 17 MR 1 DEX 152 AGI 22",
  "edit": {
   "lv": 124,
   "stats": [
    133,
    53,
    1,
    17,
    1,
    152,
    22
   ],
   "hp": 3608,
   "mp": 592,
   "sp": 7136,
   "point": 11,
   "lines": [
    {
     "x": 1,
     "name": "화염계 INT/DEX",
     "value": 0
    },
    {
     "x": 3,
     "name": "바람계 DEX/INT",
     "value": 0
    },
    {
     "x": 5,
     "name": "전격계 INT/MR",
     "value": 0
    },
    {
     "x": 8,
     "name": "공통계 DEX/AGI",
     "value": 0
    },
    {
     "x": 9,
     "name": "검계 STAB/DEX",
     "value": 2
    },
    {
     "x": 10,
     "name": "도계 HACK/DEF",
     "value": 1
    }
   ],
   "limits": {
    "lv": [
     1,
     285,
     1
    ],
    "stats": [
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ]
    ],
    "hp": [
     1,
     22000,
     1
    ],
    "mp": [
     1,
     7000,
     1
    ],
    "sp": [
     1,
     12000,
     1
    ],
    "point": [
     0,
     9999,
     1
    ]
   }
  },
  "before": {
   "act": "levelUp",
   "args": [],
   "view": {
    "char": 0,
    "type": 0,
    "charName": "루시안",
    "typeName": "물리복합",
    "chars": [
     {
      "name": "루시안",
      "types": [
       "물리복합",
       "베기",
       "찌르기"
      ],
      "startLv": 1
     },
     {
      "name": "보리스",
      "types": [
       "물리복합",
       "베기",
       "마검사"
      ],
      "startLv": 1
     },
     {
      "name": "막시민",
      "types": [
       "물리복합",
       "베기",
       "마검사"
      ],
      "startLv": 1
     },
     {
      "name": "시벨린",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "밀라",
      "types": [
       "베기",
       "물리복합",
       "찌르기"
      ],
      "startLv": 1
     },
     {
      "name": "티치엘",
      "types": [
       "공격",
       "보조",
       "전투"
      ],
      "startLv": 1
     },
     {
      "name": "이스핀",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "나야트레이",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "조슈아",
      "types": [
       "강화",
       "변화",
       "방출"
      ],
      "startLv": 1
     },
     {
      "name": "클로에",
      "types": [
       "화염",
       "빙한",
       "전격"
      ],
      "startLv": 1
     },
     {
      "name": "란지에",
      "types": [
       "물리",
       "마법",
       "보조"
      ],
      "startLv": 1
     },
     {
      "name": "이자크",
      "types": [
       "찌르기",
       "베기",
       "물리복합"
      ],
      "startLv": 1
     },
     {
      "name": "아나이스",
      "types": [
       "마법인형",
       "파괴정령",
       "비호정령"
      ],
      "startLv": 1
     },
     {
      "name": "이솔렛",
      "types": [
       "티엘라",
       "신성찬트"
      ],
      "startLv": 1
     },
     {
      "name": "벤야",
      "types": [
       "영령"
      ],
      "startLv": 1
     },
     {
      "name": "로아미니",
      "types": [
       "주술"
      ],
      "startLv": 200
     }
    ],
    "lv": 123,
    "maxLv": 285,
    "startLv": 1,
    "point": 5,
    "stats": [
     {
      "key": "STAB",
      "value": 132,
      "cost": 7,
      "nextStepAt": 151,
      "canUp": false,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "HACK",
      "value": 53,
      "cost": 4,
      "nextStepAt": 76,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "INT",
      "value": 1,
      "cost": 4,
      "nextStepAt": 26,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "DEF",
      "value": 17,
      "cost": 3,
      "nextStepAt": 26,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "MR",
      "value": 1,
      "cost": 4,
      "nextStepAt": 26,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "DEX",
      "value": 151,
      "cost": 9,
      "nextStepAt": 176,
      "canUp": false,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "AGI",
      "value": 22,
      "cost": 3,
      "nextStepAt": 26,
      "canUp": true,
      "canDash": true,
      "atCap": false
     }
    ],
    "hp": {
     "value": 3591,
     "min": 2981,
     "max": 4201
    },
    "mp": {
     "value": 591,
     "min": 469,
     "max": 713
    },
    "sp": {
     "value": 7110,
     "min": 6866,
     "max": 7384
    },
    "bonus": {
     "rate": 75,
     "achieved": 83,
     "levelUps": 122,
     "effective": "68%"
    },
    "xien": {
     "selected": 9,
     "lines": [
      {
       "x": 1,
       "name": "화염계 INT/DEX",
       "selectable": true
      },
      {
       "x": 3,
       "name": "바람계 DEX/INT",
       "selectable": true
      },
      {
       "x": 5,
       "name": "전격계 INT/MR",
       "selectable": true
      },
      {
       "x": 8,
       "name": "공통계 DEX/AGI",
       "selectable": true
      },
      {
       "x": 9,
       "name": "검계 STAB/DEX",
       "selectable": true
      },
      {
       "x": 10,
       "name": "도계 HACK/DEF",
       "selectable": true
      }
     ]
    },
    "canUndo": true,
    "canRedo": false,
    "actions": 279,
    "levelLog": [
     "",
     "00",
     "00",
     "00",
     "00",
     "00",
     "000",
     "000",
     "000",
     "0",
     "00",
     "0",
     "00",
     "0",
     "00",
     "0",
     "00",
     "0",
     "00",
     "0",
     "0",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16555555555",
     "5",
     "55",
     "55",
     "5",
     "55",
     "5",
     "55",
     "5",
     "5",
     "5",
     "55",
     "5",
     "5",
     "5",
     "55",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "",
     "5"
    ]
   }
  }
 },
 "fresh": {
  "view": {
   "char": 0,
   "type": 0,
   "charName": "루시안",
   "typeName": "물리복합",
   "chars": [
    {
     "name": "루시안",
     "types": [
      "물리복합",
      "베기",
      "찌르기"
     ],
     "startLv": 1
    },
    {
     "name": "보리스",
     "types": [
      "물리복합",
      "베기",
      "마검사"
     ],
     "startLv": 1
    },
    {
     "name": "막시민",
     "types": [
      "물리복합",
      "베기",
      "마검사"
     ],
     "startLv": 1
    },
    {
     "name": "시벨린",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "밀라",
     "types": [
      "베기",
      "물리복합",
      "찌르기"
     ],
     "startLv": 1
    },
    {
     "name": "티치엘",
     "types": [
      "공격",
      "보조",
      "전투"
     ],
     "startLv": 1
    },
    {
     "name": "이스핀",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "나야트레이",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "조슈아",
     "types": [
      "강화",
      "변화",
      "방출"
     ],
     "startLv": 1
    },
    {
     "name": "클로에",
     "types": [
      "화염",
      "빙한",
      "전격"
     ],
     "startLv": 1
    },
    {
     "name": "란지에",
     "types": [
      "물리",
      "마법",
      "보조"
     ],
     "startLv": 1
    },
    {
     "name": "이자크",
     "types": [
      "찌르기",
      "베기",
      "물리복합"
     ],
     "startLv": 1
    },
    {
     "name": "아나이스",
     "types": [
      "마법인형",
      "파괴정령",
      "비호정령"
     ],
     "startLv": 1
    },
    {
     "name": "이솔렛",
     "types": [
      "티엘라",
      "신성찬트"
     ],
     "startLv": 1
    },
    {
     "name": "벤야",
     "types": [
      "영령"
     ],
     "startLv": 1
    },
    {
     "name": "로아미니",
     "types": [
      "주술"
     ],
     "startLv": 200
    }
   ],
   "lv": 1,
   "maxLv": 285,
   "startLv": 1,
   "point": 0,
   "stats": [
    {
     "key": "STAB",
     "value": 4,
     "cost": 1,
     "nextStepAt": 25,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "HACK",
     "value": 3,
     "cost": 1,
     "nextStepAt": 25,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "INT",
     "value": 1,
     "cost": 3,
     "nextStepAt": 25,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "DEF",
     "value": 2,
     "cost": 2,
     "nextStepAt": 25,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "MR",
     "value": 1,
     "cost": 3,
     "nextStepAt": 25,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "DEX",
     "value": 2,
     "cost": 2,
     "nextStepAt": 25,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "AGI",
     "value": 2,
     "cost": 2,
     "nextStepAt": 25,
     "canUp": false,
     "canDash": true,
     "atCap": false
    }
   ],
   "hp": {
    "value": 220,
    "min": 220,
    "max": 220
   },
   "mp": {
    "value": 50,
    "min": 50,
    "max": 50
   },
   "sp": {
    "value": 1000,
    "min": 1000,
    "max": 1000
   },
   "bonus": {
    "rate": 50,
    "achieved": 0,
    "levelUps": 0,
    "effective": "0%"
   },
   "xien": {
    "selected": 10,
    "lines": [
     {
      "x": 1,
      "name": "화염계 INT/DEX",
      "selectable": false
     },
     {
      "x": 3,
      "name": "바람계 DEX/INT",
      "selectable": false
     },
     {
      "x": 5,
      "name": "전격계 INT/MR",
      "selectable": false
     },
     {
      "x": 8,
      "name": "공통계 DEX/AGI",
      "selectable": true
     },
     {
      "x": 9,
      "name": "검계 STAB/DEX",
      "selectable": true
     },
     {
      "x": 10,
      "name": "도계 HACK/DEF",
      "selectable": true
     }
    ]
   },
   "canUndo": false,
   "canRedo": false,
   "actions": 0,
   "levelLog": [
    ""
   ]
  },
  "preview": {
   "lv": 2,
   "point": 2,
   "stats": [
    0,
    1,
    0,
    0,
    0,
    0,
    0
   ],
   "hp": 23,
   "mp": 3,
   "sp": 24,
   "bonus": false
  },
  "log": "LV   1       :\rBonus        : 50%\rXien         : 도계 HACK/DEF\r루시안/물리복합 Bonus: 0 / 0 Point: 0\rLV:1 STAB 4 HACK 3 INT 1 DEF 2 MR 1 DEX 2 AGI 2",
  "guide": "",
  "edit": {
   "lv": 1,
   "stats": [
    4,
    3,
    1,
    2,
    1,
    2,
    2
   ],
   "hp": 220,
   "mp": 50,
   "sp": 1000,
   "point": 0,
   "lines": [
    {
     "x": 1,
     "name": "화염계 INT/DEX",
     "value": 0
    },
    {
     "x": 3,
     "name": "바람계 DEX/INT",
     "value": 0
    },
    {
     "x": 5,
     "name": "전격계 INT/MR",
     "value": 0
    },
    {
     "x": 8,
     "name": "공통계 DEX/AGI",
     "value": 0
    },
    {
     "x": 9,
     "name": "검계 STAB/DEX",
     "value": 0
    },
    {
     "x": 10,
     "name": "도계 HACK/DEF",
     "value": 1
    }
   ],
   "limits": {
    "lv": [
     1,
     285,
     1
    ],
    "stats": [
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ]
    ],
    "hp": [
     1,
     22000,
     1
    ],
    "mp": [
     1,
     7000,
     1
    ],
    "sp": [
     1,
     12000,
     1
    ],
    "point": [
     0,
     9999,
     1
    ]
   }
  },
  "before": null
 },
 "max": {
  "view": {
   "char": 0,
   "type": 0,
   "charName": "루시안",
   "typeName": "물리복합",
   "chars": [
    {
     "name": "루시안",
     "types": [
      "물리복합",
      "베기",
      "찌르기"
     ],
     "startLv": 1
    },
    {
     "name": "보리스",
     "types": [
      "물리복합",
      "베기",
      "마검사"
     ],
     "startLv": 1
    },
    {
     "name": "막시민",
     "types": [
      "물리복합",
      "베기",
      "마검사"
     ],
     "startLv": 1
    },
    {
     "name": "시벨린",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "밀라",
     "types": [
      "베기",
      "물리복합",
      "찌르기"
     ],
     "startLv": 1
    },
    {
     "name": "티치엘",
     "types": [
      "공격",
      "보조",
      "전투"
     ],
     "startLv": 1
    },
    {
     "name": "이스핀",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "나야트레이",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "조슈아",
     "types": [
      "강화",
      "변화",
      "방출"
     ],
     "startLv": 1
    },
    {
     "name": "클로에",
     "types": [
      "화염",
      "빙한",
      "전격"
     ],
     "startLv": 1
    },
    {
     "name": "란지에",
     "types": [
      "물리",
      "마법",
      "보조"
     ],
     "startLv": 1
    },
    {
     "name": "이자크",
     "types": [
      "찌르기",
      "베기",
      "물리복합"
     ],
     "startLv": 1
    },
    {
     "name": "아나이스",
     "types": [
      "마법인형",
      "파괴정령",
      "비호정령"
     ],
     "startLv": 1
    },
    {
     "name": "이솔렛",
     "types": [
      "티엘라",
      "신성찬트"
     ],
     "startLv": 1
    },
    {
     "name": "벤야",
     "types": [
      "영령"
     ],
     "startLv": 1
    },
    {
     "name": "로아미니",
     "types": [
      "주술"
     ],
     "startLv": 200
    }
   ],
   "lv": 285,
   "maxLv": 285,
   "startLv": 1,
   "point": 21,
   "stats": [
    {
     "key": "STAB",
     "value": 285,
     "cost": 14,
     "nextStepAt": 293,
     "canUp": false,
     "canDash": false,
     "atCap": true
    },
    {
     "key": "HACK",
     "value": 53,
     "cost": 5,
     "nextStepAt": 68,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "INT",
     "value": 1,
     "cost": 5,
     "nextStepAt": 18,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "DEF",
     "value": 17,
     "cost": 4,
     "nextStepAt": 18,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "MR",
     "value": 1,
     "cost": 5,
     "nextStepAt": 18,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "DEX",
     "value": 285,
     "cost": 15,
     "nextStepAt": 293,
     "canUp": false,
     "canDash": false,
     "atCap": true
    },
    {
     "key": "AGI",
     "value": 120,
     "cost": 9,
     "nextStepAt": 143,
     "canUp": true,
     "canDash": true,
     "atCap": false
    }
   ],
   "hp": {
    "value": 7439,
    "min": 6019,
    "max": 8859
   },
   "mp": {
    "value": 1135,
    "min": 851,
    "max": 1419
   },
   "sp": {
    "value": 12000,
    "min": 12000,
    "max": 12000
   },
   "bonus": {
    "rate": 75,
    "achieved": 205,
    "levelUps": 284,
    "effective": "72.1%"
   },
   "xien": {
    "selected": 9,
    "lines": [
     {
      "x": 1,
      "name": "화염계 INT/DEX",
      "selectable": true
     },
     {
      "x": 3,
      "name": "바람계 DEX/INT",
      "selectable": true
     },
     {
      "x": 5,
      "name": "전격계 INT/MR",
      "selectable": true
     },
     {
      "x": 8,
      "name": "공통계 DEX/AGI",
      "selectable": true
     },
     {
      "x": 9,
      "name": "검계 STAB/DEX",
      "selectable": true
     },
     {
      "x": 10,
      "name": "도계 HACK/DEF",
      "selectable": true
     }
    ]
   },
   "canUndo": true,
   "canRedo": false,
   "actions": 601,
   "levelLog": [
    "",
    "00",
    "00",
    "00",
    "00",
    "00",
    "000",
    "000",
    "000",
    "0",
    "00",
    "0",
    "00",
    "0",
    "00",
    "0",
    "00",
    "0",
    "00",
    "0",
    "0",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16555555555",
    "5",
    "55",
    "55",
    "5",
    "55",
    "5",
    "55",
    "5",
    "5",
    "5",
    "55",
    "5",
    "5",
    "5",
    "55",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "",
    "5",
    "",
    "5",
    "5",
    "",
    "5",
    "",
    "5",
    "",
    "5",
    "",
    "5",
    "5",
    "66",
    "66",
    "66",
    "66",
    "6",
    "66",
    "66",
    "6",
    "66",
    "6",
    "66",
    "66",
    "6",
    "66",
    "6",
    "66",
    "66",
    "66",
    "6",
    "66",
    "6",
    "66",
    "6",
    "66",
    "6",
    "66",
    "6",
    "66",
    "6",
    "66",
    "6",
    "66",
    "6",
    "6",
    "66",
    "6",
    "6",
    "6",
    "66",
    "6",
    "6",
    "66",
    "6",
    "6",
    "6",
    "66",
    "6",
    "66",
    "66",
    "6",
    "66",
    "6",
    "66",
    "6",
    "66",
    "6",
    "66",
    "6",
    "66",
    "6",
    "66",
    "6",
    "66",
    "6",
    "6",
    ""
   ]
  },
  "preview": null,
  "log": "LV   1       :\rBonus        : 50%\rXien         : 도계 HACK/DEF\rLV   2 -  20 : STAB 몰빵 35회\rLV  21       : STAB\rLV  22 -  31 : \rBonus        : 75%\rXien         : 검계 STAB/DEX\rLV  32 -  50 : HACK, AGI\rLV  51       : HACK, AGI, DEX * 9\rLV  52 - 219 : DEX 몰빵 134회\rLV 220 - 283 : AGI 몰빵 97회\rLV 284       : AGI\rLV 285       : \r루시안/물리복합 Bonus: 205 / 284 Point: 21\rLV:285 STAB 285 HACK 53 INT 1 DEF 17 MR 1 DEX 285 AGI 120",
  "guide": "■스탯\r[캐릭터] 루시안\r[타입] 물리복합\r[LV] 285\r[STAB] 285\r[HACK] 53\r[INT] 1\r[DEF] 17\r[MR] 1\r[DEX] 285\r[AGI] 120\r[HP] 7439\r[MP] 1135\r[SP] 12000\r보너스 72.1%\r\r[투구] \r[무기] \r[갑옷] \r[방패] \r[머리] \r[몸] \r[손] \r[다리] \r[펫] \r[사냥터] \r\r\r■재분배 순서\rLv 2부터 보너스 50%, 도계 HACK/DEF 주력\rSTAB 40까지 찍기 (Lv 31)\rLv 32부터 보너스 75%, 검계 STAB/DEX 주력\rHACK 34까지 찍기\rAGI 3까지 찍기 (Lv 32)\rHACK 35까지 찍기\rAGI 4까지 찍기 (Lv 33)\rHACK 36까지 찍기\rAGI 5까지 찍기 (Lv 34)\rHACK 37까지 찍기\rAGI 6까지 찍기 (Lv 35)\rHACK 38까지 찍기\rAGI 7까지 찍기 (Lv 36)\rHACK 39까지 찍기\rAGI 8까지 찍기 (Lv 37)\rHACK 40까지 찍기\rAGI 9까지 찍기 (Lv 38)\rHACK 41까지 찍기\rAGI 10까지 찍기 (Lv 39)\rHACK 42까지 찍기 (필요 포인트 3)\rAGI 11까지 찍기 (Lv 40)\rHACK 43까지 찍기\rAGI 12까지 찍기 (Lv 41)\rHACK 44까지 찍기\rAGI 13까지 찍기 (Lv 42)\rHACK 45까지 찍기\rAGI 14까지 찍기 (Lv 43)\rHACK 46까지 찍기\rAGI 15까지 찍기 (Lv 44)\rHACK 47까지 찍기\rAGI 16까지 찍기 (Lv 45, 필요 포인트 3)\rHACK 48까지 찍기\rAGI 17까지 찍기 (Lv 46)\rHACK 49까지 찍기\rAGI 18까지 찍기 (Lv 47)\rHACK 50까지 찍기\rAGI 19까지 찍기 (Lv 48)\rHACK 51까지 찍기\rAGI 20까지 찍기 (Lv 49)\rHACK 52까지 찍기\rAGI 21까지 찍기 (Lv 50)\rHACK 53까지 찍기\rAGI 22까지 찍기\rDEX 285까지 찍기 (Lv 219)\rAGI 120까지 찍기\r\r\r■재분배 로그\rLV   1       :\rBonus        : 50%\rXien         : 도계 HACK/DEF\rLV   2 -  20 : STAB 몰빵 35회\rLV  21       : STAB\rLV  22 -  31 : \rBonus        : 75%\rXien         : 검계 STAB/DEX\rLV  32 -  50 : HACK, AGI\rLV  51       : HACK, AGI, DEX * 9\rLV  52 - 219 : DEX 몰빵 134회\rLV 220 - 283 : AGI 몰빵 97회\rLV 284       : AGI\rLV 285       : \r루시안/물리복합 Bonus: 205 / 284 Point: 21\rLV:285 STAB 285 HACK 53 INT 1 DEF 17 MR 1 DEX 285 AGI 120",
  "edit": {
   "lv": 285,
   "stats": [
    285,
    53,
    1,
    17,
    1,
    285,
    120
   ],
   "hp": 7439,
   "mp": 1135,
   "sp": 12000,
   "point": 21,
   "lines": [
    {
     "x": 1,
     "name": "화염계 INT/DEX",
     "value": 0
    },
    {
     "x": 3,
     "name": "바람계 DEX/INT",
     "value": 0
    },
    {
     "x": 5,
     "name": "전격계 INT/MR",
     "value": 0
    },
    {
     "x": 8,
     "name": "공통계 DEX/AGI",
     "value": 0
    },
    {
     "x": 9,
     "name": "검계 STAB/DEX",
     "value": 2
    },
    {
     "x": 10,
     "name": "도계 HACK/DEF",
     "value": 1
    }
   ],
   "limits": {
    "lv": [
     1,
     285,
     1
    ],
    "stats": [
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ]
    ],
    "hp": [
     1,
     22000,
     1
    ],
    "mp": [
     1,
     7000,
     1
    ],
    "sp": [
     1,
     12000,
     1
    ],
    "point": [
     0,
     9999,
     1
    ]
   }
  },
  "before": {
   "act": "levelUp",
   "args": [],
   "view": {
    "char": 0,
    "type": 0,
    "charName": "루시안",
    "typeName": "물리복합",
    "chars": [
     {
      "name": "루시안",
      "types": [
       "물리복합",
       "베기",
       "찌르기"
      ],
      "startLv": 1
     },
     {
      "name": "보리스",
      "types": [
       "물리복합",
       "베기",
       "마검사"
      ],
      "startLv": 1
     },
     {
      "name": "막시민",
      "types": [
       "물리복합",
       "베기",
       "마검사"
      ],
      "startLv": 1
     },
     {
      "name": "시벨린",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "밀라",
      "types": [
       "베기",
       "물리복합",
       "찌르기"
      ],
      "startLv": 1
     },
     {
      "name": "티치엘",
      "types": [
       "공격",
       "보조",
       "전투"
      ],
      "startLv": 1
     },
     {
      "name": "이스핀",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "나야트레이",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "조슈아",
      "types": [
       "강화",
       "변화",
       "방출"
      ],
      "startLv": 1
     },
     {
      "name": "클로에",
      "types": [
       "화염",
       "빙한",
       "전격"
      ],
      "startLv": 1
     },
     {
      "name": "란지에",
      "types": [
       "물리",
       "마법",
       "보조"
      ],
      "startLv": 1
     },
     {
      "name": "이자크",
      "types": [
       "찌르기",
       "베기",
       "물리복합"
      ],
      "startLv": 1
     },
     {
      "name": "아나이스",
      "types": [
       "마법인형",
       "파괴정령",
       "비호정령"
      ],
      "startLv": 1
     },
     {
      "name": "이솔렛",
      "types": [
       "티엘라",
       "신성찬트"
      ],
      "startLv": 1
     },
     {
      "name": "벤야",
      "types": [
       "영령"
      ],
      "startLv": 1
     },
     {
      "name": "로아미니",
      "types": [
       "주술"
      ],
      "startLv": 200
     }
    ],
    "lv": 284,
    "maxLv": 285,
    "startLv": 1,
    "point": 9,
    "stats": [
     {
      "key": "STAB",
      "value": 285,
      "cost": 14,
      "nextStepAt": 294,
      "canUp": false,
      "canDash": false,
      "atCap": true
     },
     {
      "key": "HACK",
      "value": 53,
      "cost": 5,
      "nextStepAt": 69,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "INT",
      "value": 1,
      "cost": 5,
      "nextStepAt": 19,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "DEF",
      "value": 17,
      "cost": 4,
      "nextStepAt": 19,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "MR",
      "value": 1,
      "cost": 5,
      "nextStepAt": 19,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "DEX",
      "value": 285,
      "cost": 15,
      "nextStepAt": 294,
      "canUp": false,
      "canDash": false,
      "atCap": true
     },
     {
      "key": "AGI",
      "value": 120,
      "cost": 9,
      "nextStepAt": 144,
      "canUp": true,
      "canDash": true,
      "atCap": false
     }
    ],
    "hp": {
     "value": 7422,
     "min": 6007,
     "max": 8837
    },
    "mp": {
     "value": 1134,
     "min": 851,
     "max": 1417
    },
    "sp": {
     "value": 12000,
     "min": 12000,
     "max": 12000
    },
    "bonus": {
     "rate": 75,
     "achieved": 204,
     "levelUps": 283,
     "effective": "72%"
    },
    "xien": {
     "selected": 9,
     "lines": [
      {
       "x": 1,
       "name": "화염계 INT/DEX",
       "selectable": true
      },
      {
       "x": 3,
       "name": "바람계 DEX/INT",
       "selectable": true
      },
      {
       "x": 5,
       "name": "전격계 INT/MR",
       "selectable": true
      },
      {
       "x": 8,
       "name": "공통계 DEX/AGI",
       "selectable": true
      },
      {
       "x": 9,
       "name": "검계 STAB/DEX",
       "selectable": true
      },
      {
       "x": 10,
       "name": "도계 HACK/DEF",
       "selectable": true
      }
     ]
    },
    "canUndo": true,
    "canRedo": false,
    "actions": 600,
    "levelLog": [
     "",
     "00",
     "00",
     "00",
     "00",
     "00",
     "000",
     "000",
     "000",
     "0",
     "00",
     "0",
     "00",
     "0",
     "00",
     "0",
     "00",
     "0",
     "00",
     "0",
     "0",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16555555555",
     "5",
     "55",
     "55",
     "5",
     "55",
     "5",
     "55",
     "5",
     "5",
     "5",
     "55",
     "5",
     "5",
     "5",
     "55",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "",
     "5",
     "",
     "5",
     "5",
     "",
     "5",
     "",
     "5",
     "",
     "5",
     "",
     "5",
     "5",
     "66",
     "66",
     "66",
     "66",
     "6",
     "66",
     "66",
     "6",
     "66",
     "6",
     "66",
     "66",
     "6",
     "66",
     "6",
     "66",
     "66",
     "66",
     "6",
     "66",
     "6",
     "66",
     "6",
     "66",
     "6",
     "66",
     "6",
     "66",
     "6",
     "66",
     "6",
     "66",
     "6",
     "6",
     "66",
     "6",
     "6",
     "6",
     "66",
     "6",
     "6",
     "66",
     "6",
     "6",
     "6",
     "66",
     "6",
     "66",
     "66",
     "6",
     "66",
     "6",
     "66",
     "6",
     "66",
     "6",
     "66",
     "6",
     "66",
     "6",
     "66",
     "6",
     "66",
     "6",
     "6"
    ]
   }
  }
 },
 "nopoint": {
  "view": {
   "char": 0,
   "type": 0,
   "charName": "루시안",
   "typeName": "물리복합",
   "chars": [
    {
     "name": "루시안",
     "types": [
      "물리복합",
      "베기",
      "찌르기"
     ],
     "startLv": 1
    },
    {
     "name": "보리스",
     "types": [
      "물리복합",
      "베기",
      "마검사"
     ],
     "startLv": 1
    },
    {
     "name": "막시민",
     "types": [
      "물리복합",
      "베기",
      "마검사"
     ],
     "startLv": 1
    },
    {
     "name": "시벨린",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "밀라",
     "types": [
      "베기",
      "물리복합",
      "찌르기"
     ],
     "startLv": 1
    },
    {
     "name": "티치엘",
     "types": [
      "공격",
      "보조",
      "전투"
     ],
     "startLv": 1
    },
    {
     "name": "이스핀",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "나야트레이",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "조슈아",
     "types": [
      "강화",
      "변화",
      "방출"
     ],
     "startLv": 1
    },
    {
     "name": "클로에",
     "types": [
      "화염",
      "빙한",
      "전격"
     ],
     "startLv": 1
    },
    {
     "name": "란지에",
     "types": [
      "물리",
      "마법",
      "보조"
     ],
     "startLv": 1
    },
    {
     "name": "이자크",
     "types": [
      "찌르기",
      "베기",
      "물리복합"
     ],
     "startLv": 1
    },
    {
     "name": "아나이스",
     "types": [
      "마법인형",
      "파괴정령",
      "비호정령"
     ],
     "startLv": 1
    },
    {
     "name": "이솔렛",
     "types": [
      "티엘라",
      "신성찬트"
     ],
     "startLv": 1
    },
    {
     "name": "벤야",
     "types": [
      "영령"
     ],
     "startLv": 1
    },
    {
     "name": "로아미니",
     "types": [
      "주술"
     ],
     "startLv": 200
    }
   ],
   "lv": 124,
   "maxLv": 285,
   "startLv": 1,
   "point": 3,
   "stats": [
    {
     "key": "STAB",
     "value": 133,
     "cost": 7,
     "nextStepAt": 151,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "HACK",
     "value": 55,
     "cost": 4,
     "nextStepAt": 76,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "INT",
     "value": 1,
     "cost": 4,
     "nextStepAt": 26,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "DEF",
     "value": 17,
     "cost": 3,
     "nextStepAt": 26,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "MR",
     "value": 1,
     "cost": 4,
     "nextStepAt": 26,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "DEX",
     "value": 152,
     "cost": 9,
     "nextStepAt": 176,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "AGI",
     "value": 22,
     "cost": 3,
     "nextStepAt": 26,
     "canUp": true,
     "canDash": true,
     "atCap": false
    }
   ],
   "hp": {
    "value": 3638,
    "min": 3023,
    "max": 4253
   },
   "mp": {
    "value": 596,
    "min": 473,
    "max": 719
   },
   "sp": {
    "value": 7144,
    "min": 6898,
    "max": 7420
   },
   "bonus": {
    "rate": 75,
    "achieved": 84,
    "levelUps": 123,
    "effective": "68.2%"
   },
   "xien": {
    "selected": 9,
    "lines": [
     {
      "x": 1,
      "name": "화염계 INT/DEX",
      "selectable": true
     },
     {
      "x": 3,
      "name": "바람계 DEX/INT",
      "selectable": true
     },
     {
      "x": 5,
      "name": "전격계 INT/MR",
      "selectable": true
     },
     {
      "x": 8,
      "name": "공통계 DEX/AGI",
      "selectable": true
     },
     {
      "x": 9,
      "name": "검계 STAB/DEX",
      "selectable": true
     },
     {
      "x": 10,
      "name": "도계 HACK/DEF",
      "selectable": true
     }
    ]
   },
   "canUndo": true,
   "canRedo": false,
   "actions": 282,
   "levelLog": [
    "",
    "00",
    "00",
    "00",
    "00",
    "00",
    "000",
    "000",
    "000",
    "0",
    "00",
    "0",
    "00",
    "0",
    "00",
    "0",
    "00",
    "0",
    "00",
    "0",
    "0",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16555555555",
    "5",
    "55",
    "55",
    "5",
    "55",
    "5",
    "55",
    "5",
    "5",
    "5",
    "55",
    "5",
    "5",
    "5",
    "55",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "",
    "5",
    "11"
   ]
  },
  "preview": {
   "lv": 125,
   "point": 6,
   "stats": [
    1,
    0,
    0,
    0,
    0,
    1,
    0
   ],
   "hp": 17,
   "mp": 1,
   "sp": 26,
   "bonus": true
  },
  "log": "LV   1       :\rBonus        : 50%\rXien         : 도계 HACK/DEF\rLV   2 -  20 : STAB 몰빵 35회\rLV  21       : STAB\rLV  22 -  31 : \rBonus        : 75%\rXien         : 검계 STAB/DEX\rLV  32 -  50 : HACK, AGI\rLV  51       : HACK, AGI, DEX * 9\rLV  52 - 123 : DEX 몰빵 72회\rLV 124       : HACK 몰빵 2회\r루시안/물리복합 Bonus: 84 / 123 Point: 3\rLV:124 STAB 133 HACK 55 INT 1 DEF 17 MR 1 DEX 152 AGI 22",
  "guide": "■스탯\r[캐릭터] 루시안\r[타입] 물리복합\r[LV] 124\r[STAB] 133\r[HACK] 55\r[INT] 1\r[DEF] 17\r[MR] 1\r[DEX] 152\r[AGI] 22\r[HP] 3638\r[MP] 596\r[SP] 7144\r보너스 68.2%\r\r[투구] \r[무기] \r[갑옷] \r[방패] \r[머리] \r[몸] \r[손] \r[다리] \r[펫] \r[사냥터] \r\r\r■재분배 순서\rLv 2부터 보너스 50%, 도계 HACK/DEF 주력\rSTAB 40까지 찍기 (Lv 31)\rLv 32부터 보너스 75%, 검계 STAB/DEX 주력\rHACK 34까지 찍기\rAGI 3까지 찍기 (Lv 32)\rHACK 35까지 찍기\rAGI 4까지 찍기 (Lv 33)\rHACK 36까지 찍기\rAGI 5까지 찍기 (Lv 34)\rHACK 37까지 찍기\rAGI 6까지 찍기 (Lv 35)\rHACK 38까지 찍기\rAGI 7까지 찍기 (Lv 36)\rHACK 39까지 찍기\rAGI 8까지 찍기 (Lv 37)\rHACK 40까지 찍기\rAGI 9까지 찍기 (Lv 38)\rHACK 41까지 찍기\rAGI 10까지 찍기 (Lv 39)\rHACK 42까지 찍기 (필요 포인트 3)\rAGI 11까지 찍기 (Lv 40)\rHACK 43까지 찍기\rAGI 12까지 찍기 (Lv 41)\rHACK 44까지 찍기\rAGI 13까지 찍기 (Lv 42)\rHACK 45까지 찍기\rAGI 14까지 찍기 (Lv 43)\rHACK 46까지 찍기\rAGI 15까지 찍기 (Lv 44)\rHACK 47까지 찍기\rAGI 16까지 찍기 (Lv 45, 필요 포인트 3)\rHACK 48까지 찍기\rAGI 17까지 찍기 (Lv 46)\rHACK 49까지 찍기\rAGI 18까지 찍기 (Lv 47)\rHACK 50까지 찍기\rAGI 19까지 찍기 (Lv 48)\rHACK 51까지 찍기\rAGI 20까지 찍기 (Lv 49)\rHACK 52까지 찍기\rAGI 21까지 찍기 (Lv 50)\rHACK 53까지 찍기\rAGI 22까지 찍기\rDEX 151까지 찍기 (Lv 123, 필요 포인트 9)\rHACK 55까지 찍기 (Lv 124)\r\r\r■재분배 로그\rLV   1       :\rBonus        : 50%\rXien         : 도계 HACK/DEF\rLV   2 -  20 : STAB 몰빵 35회\rLV  21       : STAB\rLV  22 -  31 : \rBonus        : 75%\rXien         : 검계 STAB/DEX\rLV  32 -  50 : HACK, AGI\rLV  51       : HACK, AGI, DEX * 9\rLV  52 - 123 : DEX 몰빵 72회\rLV 124       : HACK 몰빵 2회\r루시안/물리복합 Bonus: 84 / 123 Point: 3\rLV:124 STAB 133 HACK 55 INT 1 DEF 17 MR 1 DEX 152 AGI 22",
  "edit": {
   "lv": 124,
   "stats": [
    133,
    55,
    1,
    17,
    1,
    152,
    22
   ],
   "hp": 3638,
   "mp": 596,
   "sp": 7144,
   "point": 3,
   "lines": [
    {
     "x": 1,
     "name": "화염계 INT/DEX",
     "value": 0
    },
    {
     "x": 3,
     "name": "바람계 DEX/INT",
     "value": 0
    },
    {
     "x": 5,
     "name": "전격계 INT/MR",
     "value": 0
    },
    {
     "x": 8,
     "name": "공통계 DEX/AGI",
     "value": 0
    },
    {
     "x": 9,
     "name": "검계 STAB/DEX",
     "value": 2
    },
    {
     "x": 10,
     "name": "도계 HACK/DEF",
     "value": 1
    }
   ],
   "limits": {
    "lv": [
     1,
     285,
     1
    ],
    "stats": [
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ]
    ],
    "hp": [
     1,
     22000,
     1
    ],
    "mp": [
     1,
     7000,
     1
    ],
    "sp": [
     1,
     12000,
     1
    ],
    "point": [
     0,
     9999,
     1
    ]
   }
  },
  "before": {
   "act": "statUp",
   "args": [
    1
   ],
   "view": {
    "char": 0,
    "type": 0,
    "charName": "루시안",
    "typeName": "물리복합",
    "chars": [
     {
      "name": "루시안",
      "types": [
       "물리복합",
       "베기",
       "찌르기"
      ],
      "startLv": 1
     },
     {
      "name": "보리스",
      "types": [
       "물리복합",
       "베기",
       "마검사"
      ],
      "startLv": 1
     },
     {
      "name": "막시민",
      "types": [
       "물리복합",
       "베기",
       "마검사"
      ],
      "startLv": 1
     },
     {
      "name": "시벨린",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "밀라",
      "types": [
       "베기",
       "물리복합",
       "찌르기"
      ],
      "startLv": 1
     },
     {
      "name": "티치엘",
      "types": [
       "공격",
       "보조",
       "전투"
      ],
      "startLv": 1
     },
     {
      "name": "이스핀",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "나야트레이",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "조슈아",
      "types": [
       "강화",
       "변화",
       "방출"
      ],
      "startLv": 1
     },
     {
      "name": "클로에",
      "types": [
       "화염",
       "빙한",
       "전격"
      ],
      "startLv": 1
     },
     {
      "name": "란지에",
      "types": [
       "물리",
       "마법",
       "보조"
      ],
      "startLv": 1
     },
     {
      "name": "이자크",
      "types": [
       "찌르기",
       "베기",
       "물리복합"
      ],
      "startLv": 1
     },
     {
      "name": "아나이스",
      "types": [
       "마법인형",
       "파괴정령",
       "비호정령"
      ],
      "startLv": 1
     },
     {
      "name": "이솔렛",
      "types": [
       "티엘라",
       "신성찬트"
      ],
      "startLv": 1
     },
     {
      "name": "벤야",
      "types": [
       "영령"
      ],
      "startLv": 1
     },
     {
      "name": "로아미니",
      "types": [
       "주술"
      ],
      "startLv": 200
     }
    ],
    "lv": 124,
    "maxLv": 285,
    "startLv": 1,
    "point": 7,
    "stats": [
     {
      "key": "STAB",
      "value": 133,
      "cost": 7,
      "nextStepAt": 151,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "HACK",
      "value": 54,
      "cost": 4,
      "nextStepAt": 76,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "INT",
      "value": 1,
      "cost": 4,
      "nextStepAt": 26,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "DEF",
      "value": 17,
      "cost": 3,
      "nextStepAt": 26,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "MR",
      "value": 1,
      "cost": 4,
      "nextStepAt": 26,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "DEX",
      "value": 152,
      "cost": 9,
      "nextStepAt": 176,
      "canUp": false,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "AGI",
      "value": 22,
      "cost": 3,
      "nextStepAt": 26,
      "canUp": true,
      "canDash": true,
      "atCap": false
     }
    ],
    "hp": {
     "value": 3623,
     "min": 3008,
     "max": 4238
    },
    "mp": {
     "value": 594,
     "min": 471,
     "max": 717
    },
    "sp": {
     "value": 7140,
     "min": 6894,
     "max": 7416
    },
    "bonus": {
     "rate": 75,
     "achieved": 84,
     "levelUps": 123,
     "effective": "68.2%"
    },
    "xien": {
     "selected": 9,
     "lines": [
      {
       "x": 1,
       "name": "화염계 INT/DEX",
       "selectable": true
      },
      {
       "x": 3,
       "name": "바람계 DEX/INT",
       "selectable": true
      },
      {
       "x": 5,
       "name": "전격계 INT/MR",
       "selectable": true
      },
      {
       "x": 8,
       "name": "공통계 DEX/AGI",
       "selectable": true
      },
      {
       "x": 9,
       "name": "검계 STAB/DEX",
       "selectable": true
      },
      {
       "x": 10,
       "name": "도계 HACK/DEF",
       "selectable": true
      }
     ]
    },
    "canUndo": true,
    "canRedo": false,
    "actions": 281,
    "levelLog": [
     "",
     "00",
     "00",
     "00",
     "00",
     "00",
     "000",
     "000",
     "000",
     "0",
     "00",
     "0",
     "00",
     "0",
     "00",
     "0",
     "00",
     "0",
     "00",
     "0",
     "0",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16555555555",
     "5",
     "55",
     "55",
     "5",
     "55",
     "5",
     "55",
     "5",
     "5",
     "5",
     "55",
     "5",
     "5",
     "5",
     "55",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "",
     "5",
     "1"
    ]
   }
  }
 },
 "cap": {
  "view": {
   "char": 0,
   "type": 0,
   "charName": "루시안",
   "typeName": "물리복합",
   "chars": [
    {
     "name": "루시안",
     "types": [
      "물리복합",
      "베기",
      "찌르기"
     ],
     "startLv": 1
    },
    {
     "name": "보리스",
     "types": [
      "물리복합",
      "베기",
      "마검사"
     ],
     "startLv": 1
    },
    {
     "name": "막시민",
     "types": [
      "물리복합",
      "베기",
      "마검사"
     ],
     "startLv": 1
    },
    {
     "name": "시벨린",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "밀라",
     "types": [
      "베기",
      "물리복합",
      "찌르기"
     ],
     "startLv": 1
    },
    {
     "name": "티치엘",
     "types": [
      "공격",
      "보조",
      "전투"
     ],
     "startLv": 1
    },
    {
     "name": "이스핀",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "나야트레이",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "조슈아",
     "types": [
      "강화",
      "변화",
      "방출"
     ],
     "startLv": 1
    },
    {
     "name": "클로에",
     "types": [
      "화염",
      "빙한",
      "전격"
     ],
     "startLv": 1
    },
    {
     "name": "란지에",
     "types": [
      "물리",
      "마법",
      "보조"
     ],
     "startLv": 1
    },
    {
     "name": "이자크",
     "types": [
      "찌르기",
      "베기",
      "물리복합"
     ],
     "startLv": 1
    },
    {
     "name": "아나이스",
     "types": [
      "마법인형",
      "파괴정령",
      "비호정령"
     ],
     "startLv": 1
    },
    {
     "name": "이솔렛",
     "types": [
      "티엘라",
      "신성찬트"
     ],
     "startLv": 1
    },
    {
     "name": "벤야",
     "types": [
      "영령"
     ],
     "startLv": 1
    },
    {
     "name": "로아미니",
     "types": [
      "주술"
     ],
     "startLv": 200
    }
   ],
   "lv": 154,
   "maxLv": 285,
   "startLv": 1,
   "point": 2,
   "stats": [
    {
     "key": "STAB",
     "value": 285,
     "cost": 13,
     "nextStepAt": 295,
     "canUp": false,
     "canDash": false,
     "atCap": true
    },
    {
     "key": "HACK",
     "value": 3,
     "cost": 2,
     "nextStepAt": 20,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "INT",
     "value": 1,
     "cost": 4,
     "nextStepAt": 20,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "DEF",
     "value": 2,
     "cost": 3,
     "nextStepAt": 20,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "MR",
     "value": 1,
     "cost": 4,
     "nextStepAt": 20,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "DEX",
     "value": 116,
     "cost": 7,
     "nextStepAt": 120,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "AGI",
     "value": 2,
     "cost": 3,
     "nextStepAt": 20,
     "canUp": false,
     "canDash": true,
     "atCap": false
    }
   ],
   "hp": {
    "value": 3717,
    "min": 2952,
    "max": 4482
   },
   "mp": {
    "value": 331,
    "min": 178,
    "max": 484
   },
   "sp": {
    "value": 6002,
    "min": 5696,
    "max": 6308
   },
   "bonus": {
    "rate": 75,
    "achieved": 114,
    "levelUps": 153,
    "effective": "74.5%"
   },
   "xien": {
    "selected": 9,
    "lines": [
     {
      "x": 1,
      "name": "화염계 INT/DEX",
      "selectable": true
     },
     {
      "x": 3,
      "name": "바람계 DEX/INT",
      "selectable": true
     },
     {
      "x": 5,
      "name": "전격계 INT/MR",
      "selectable": true
     },
     {
      "x": 8,
      "name": "공통계 DEX/AGI",
      "selectable": true
     },
     {
      "x": 9,
      "name": "검계 STAB/DEX",
      "selectable": true
     },
     {
      "x": 10,
      "name": "도계 HACK/DEF",
      "selectable": true
     }
    ]
   },
   "canUndo": true,
   "canRedo": false,
   "actions": 281,
   "levelLog": [
    "",
    "00",
    "00",
    "00",
    "00",
    "00",
    "000",
    "0",
    "00",
    "0",
    "00",
    "0",
    "00",
    "0",
    "00",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "00",
    "0",
    "0",
    "00",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "",
    "0",
    "0",
    "0",
    "0",
    "",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
    "",
    "0",
    "0",
    "0",
    "0",
    "0",
    "",
    "0",
    "0",
    "0",
    "0",
    "",
    "0",
    "0",
    "",
    "0",
    "0",
    "0",
    "",
    "0",
    "0",
    "",
    "0",
    "0",
    "",
    "0",
    "0",
    "",
    "0",
    "0",
    "0",
    "",
    "0",
    "0",
    "0",
    "",
    "0",
    "0",
    "",
    "0",
    "0",
    "",
    "0",
    "0",
    "",
    "0",
    "0",
    "",
    "0",
    "0",
    "",
    "0",
    "",
    "0",
    "0",
    "",
    "0",
    "",
    "0",
    "0",
    "",
    "0",
    "",
    "0",
    "",
    "0",
    "0",
    "",
    "0",
    "",
    "0",
    "",
    "0",
    "",
    "0",
    "",
    "0",
    "0",
    "",
    "0",
    "",
    "0",
    "0",
    "",
    "0",
    "",
    "0",
    "0",
    "",
    "0",
    "",
    "0",
    "",
    "0",
    "",
    "0",
    "0",
    "",
    "0",
    "",
    "0"
   ]
  },
  "preview": {
   "lv": 155,
   "point": 7,
   "stats": [
    0,
    0,
    0,
    0,
    0,
    1,
    0
   ],
   "hp": 17,
   "mp": 1,
   "sp": 26,
   "bonus": true
  },
  "log": "LV   1       :\rBonus        : 75%\rXien         : 검계 STAB/DEX\rLV   2 - 154 : STAB 몰빵 128회\r루시안/물리복합 Bonus: 114 / 153 Point: 2\rLV:154 STAB 285 HACK 3 INT 1 DEF 2 MR 1 DEX 116 AGI 2",
  "guide": "■스탯\r[캐릭터] 루시안\r[타입] 물리복합\r[LV] 154\r[STAB] 285\r[HACK] 3\r[INT] 1\r[DEF] 2\r[MR] 1\r[DEX] 116\r[AGI] 2\r[HP] 3717\r[MP] 331\r[SP] 6002\r보너스 74.5%\r\r[투구] \r[무기] \r[갑옷] \r[방패] \r[머리] \r[몸] \r[손] \r[다리] \r[펫] \r[사냥터] \r\r\r■재분배 순서\rLv 2부터 보너스 75%, 검계 STAB/DEX 주력\rSTAB 285까지 찍기 (Lv 154)\r\r\r■재분배 로그\rLV   1       :\rBonus        : 75%\rXien         : 검계 STAB/DEX\rLV   2 - 154 : STAB 몰빵 128회\r루시안/물리복합 Bonus: 114 / 153 Point: 2\rLV:154 STAB 285 HACK 3 INT 1 DEF 2 MR 1 DEX 116 AGI 2",
  "edit": {
   "lv": 154,
   "stats": [
    285,
    3,
    1,
    2,
    1,
    116,
    2
   ],
   "hp": 3717,
   "mp": 331,
   "sp": 6002,
   "point": 2,
   "lines": [
    {
     "x": 1,
     "name": "화염계 INT/DEX",
     "value": 0
    },
    {
     "x": 3,
     "name": "바람계 DEX/INT",
     "value": 0
    },
    {
     "x": 5,
     "name": "전격계 INT/MR",
     "value": 0
    },
    {
     "x": 8,
     "name": "공통계 DEX/AGI",
     "value": 0
    },
    {
     "x": 9,
     "name": "검계 STAB/DEX",
     "value": 2
    },
    {
     "x": 10,
     "name": "도계 HACK/DEF",
     "value": 1
    }
   ],
   "limits": {
    "lv": [
     1,
     285,
     1
    ],
    "stats": [
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ]
    ],
    "hp": [
     1,
     22000,
     1
    ],
    "mp": [
     1,
     7000,
     1
    ],
    "sp": [
     1,
     12000,
     1
    ],
    "point": [
     0,
     9999,
     1
    ]
   }
  },
  "before": {
   "act": "dash",
   "args": [
    0
   ],
   "view": {
    "char": 0,
    "type": 0,
    "charName": "루시안",
    "typeName": "물리복합",
    "chars": [
     {
      "name": "루시안",
      "types": [
       "물리복합",
       "베기",
       "찌르기"
      ],
      "startLv": 1
     },
     {
      "name": "보리스",
      "types": [
       "물리복합",
       "베기",
       "마검사"
      ],
      "startLv": 1
     },
     {
      "name": "막시민",
      "types": [
       "물리복합",
       "베기",
       "마검사"
      ],
      "startLv": 1
     },
     {
      "name": "시벨린",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "밀라",
      "types": [
       "베기",
       "물리복합",
       "찌르기"
      ],
      "startLv": 1
     },
     {
      "name": "티치엘",
      "types": [
       "공격",
       "보조",
       "전투"
      ],
      "startLv": 1
     },
     {
      "name": "이스핀",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "나야트레이",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "조슈아",
      "types": [
       "강화",
       "변화",
       "방출"
      ],
      "startLv": 1
     },
     {
      "name": "클로에",
      "types": [
       "화염",
       "빙한",
       "전격"
      ],
      "startLv": 1
     },
     {
      "name": "란지에",
      "types": [
       "물리",
       "마법",
       "보조"
      ],
      "startLv": 1
     },
     {
      "name": "이자크",
      "types": [
       "찌르기",
       "베기",
       "물리복합"
      ],
      "startLv": 1
     },
     {
      "name": "아나이스",
      "types": [
       "마법인형",
       "파괴정령",
       "비호정령"
      ],
      "startLv": 1
     },
     {
      "name": "이솔렛",
      "types": [
       "티엘라",
       "신성찬트"
      ],
      "startLv": 1
     },
     {
      "name": "벤야",
      "types": [
       "영령"
      ],
      "startLv": 1
     },
     {
      "name": "로아미니",
      "types": [
       "주술"
      ],
      "startLv": 200
     }
    ],
    "lv": 145,
    "maxLv": 285,
    "startLv": 1,
    "point": 4,
    "stats": [
     {
      "key": "STAB",
      "value": 271,
      "cost": 13,
      "nextStepAt": 296,
      "canUp": false,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "HACK",
      "value": 3,
      "cost": 2,
      "nextStepAt": 21,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "INT",
      "value": 1,
      "cost": 4,
      "nextStepAt": 21,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "DEF",
      "value": 2,
      "cost": 3,
      "nextStepAt": 21,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "MR",
      "value": 1,
      "cost": 4,
      "nextStepAt": 21,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "DEX",
      "value": 110,
      "cost": 7,
      "nextStepAt": 121,
      "canUp": false,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "AGI",
      "value": 2,
      "cost": 3,
      "nextStepAt": 21,
      "canUp": true,
      "canDash": true,
      "atCap": false
     }
    ],
    "hp": {
     "value": 3529,
     "min": 2809,
     "max": 4249
    },
    "mp": {
     "value": 317,
     "min": 173,
     "max": 461
    },
    "sp": {
     "value": 5728,
     "min": 5440,
     "max": 6016
    },
    "bonus": {
     "rate": 75,
     "achieved": 108,
     "levelUps": 144,
     "effective": "75%"
    },
    "xien": {
     "selected": 9,
     "lines": [
      {
       "x": 1,
       "name": "화염계 INT/DEX",
       "selectable": true
      },
      {
       "x": 3,
       "name": "바람계 DEX/INT",
       "selectable": true
      },
      {
       "x": 5,
       "name": "전격계 INT/MR",
       "selectable": true
      },
      {
       "x": 8,
       "name": "공통계 DEX/AGI",
       "selectable": true
      },
      {
       "x": 9,
       "name": "검계 STAB/DEX",
       "selectable": true
      },
      {
       "x": 10,
       "name": "도계 HACK/DEF",
       "selectable": true
      }
     ]
    },
    "canUndo": true,
    "canRedo": false,
    "actions": 267,
    "levelLog": [
     "",
     "00",
     "00",
     "00",
     "00",
     "00",
     "000",
     "0",
     "00",
     "0",
     "00",
     "0",
     "00",
     "0",
     "00",
     "0",
     "0",
     "0",
     "0",
     "0",
     "0",
     "0",
     "00",
     "0",
     "0",
     "00",
     "0",
     "0",
     "0",
     "0",
     "0",
     "0",
     "0",
     "0",
     "0",
     "0",
     "0",
     "0",
     "0",
     "0",
     "",
     "0",
     "0",
     "0",
     "0",
     "",
     "0",
     "0",
     "0",
     "0",
     "0",
     "0",
     "0",
     "",
     "0",
     "0",
     "0",
     "0",
     "0",
     "",
     "0",
     "0",
     "0",
     "0",
     "",
     "0",
     "0",
     "",
     "0",
     "0",
     "0",
     "",
     "0",
     "0",
     "",
     "0",
     "0",
     "",
     "0",
     "0",
     "",
     "0",
     "0",
     "0",
     "",
     "0",
     "0",
     "0",
     "",
     "0",
     "0",
     "",
     "0",
     "0",
     "",
     "0",
     "0",
     "",
     "0",
     "0",
     "",
     "0",
     "0",
     "",
     "0",
     "",
     "0",
     "0",
     "",
     "0",
     "",
     "0",
     "0",
     "",
     "0",
     "",
     "0",
     "",
     "0",
     "0",
     "",
     "0",
     "",
     "0",
     "",
     "0",
     "",
     "0",
     "",
     "0",
     "0",
     "",
     "0",
     "",
     "0",
     "0",
     "",
     "0",
     "",
     "0",
     "0",
     "",
     "0",
     "",
     "0"
    ]
   }
  }
 },
 "roamini": {
  "view": {
   "char": 15,
   "type": 0,
   "charName": "로아미니",
   "typeName": "주술",
   "chars": [
    {
     "name": "루시안",
     "types": [
      "물리복합",
      "베기",
      "찌르기"
     ],
     "startLv": 1
    },
    {
     "name": "보리스",
     "types": [
      "물리복합",
      "베기",
      "마검사"
     ],
     "startLv": 1
    },
    {
     "name": "막시민",
     "types": [
      "물리복합",
      "베기",
      "마검사"
     ],
     "startLv": 1
    },
    {
     "name": "시벨린",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "밀라",
     "types": [
      "베기",
      "물리복합",
      "찌르기"
     ],
     "startLv": 1
    },
    {
     "name": "티치엘",
     "types": [
      "공격",
      "보조",
      "전투"
     ],
     "startLv": 1
    },
    {
     "name": "이스핀",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "나야트레이",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "조슈아",
     "types": [
      "강화",
      "변화",
      "방출"
     ],
     "startLv": 1
    },
    {
     "name": "클로에",
     "types": [
      "화염",
      "빙한",
      "전격"
     ],
     "startLv": 1
    },
    {
     "name": "란지에",
     "types": [
      "물리",
      "마법",
      "보조"
     ],
     "startLv": 1
    },
    {
     "name": "이자크",
     "types": [
      "찌르기",
      "베기",
      "물리복합"
     ],
     "startLv": 1
    },
    {
     "name": "아나이스",
     "types": [
      "마법인형",
      "파괴정령",
      "비호정령"
     ],
     "startLv": 1
    },
    {
     "name": "이솔렛",
     "types": [
      "티엘라",
      "신성찬트"
     ],
     "startLv": 1
    },
    {
     "name": "벤야",
     "types": [
      "영령"
     ],
     "startLv": 1
    },
    {
     "name": "로아미니",
     "types": [
      "주술"
     ],
     "startLv": 200
    }
   ],
   "lv": 208,
   "maxLv": 285,
   "startLv": 200,
   "point": 21,
   "stats": [
    {
     "key": "STAB",
     "value": 1,
     "cost": 4,
     "nextStepAt": 9,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "HACK",
     "value": 2,
     "cost": 2,
     "nextStepAt": 9,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "INT",
     "value": 147,
     "cost": 10,
     "nextStepAt": 159,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "DEF",
     "value": 65,
     "cost": 5,
     "nextStepAt": 84,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "MR",
     "value": 3,
     "cost": 3,
     "nextStepAt": 9,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "DEX",
     "value": 204,
     "cost": 10,
     "nextStepAt": 209,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "AGI",
     "value": 200,
     "cost": 11,
     "nextStepAt": 209,
     "canUp": true,
     "canDash": true,
     "atCap": false
    }
   ],
   "hp": {
    "value": 10584,
    "min": 10544,
    "max": 10624
   },
   "mp": {
    "value": 2972,
    "min": 2956,
    "max": 2988
   },
   "sp": {
    "value": 8174,
    "min": 8142,
    "max": 8206
   },
   "bonus": {
    "rate": 50,
    "achieved": 4,
    "levelUps": 8,
    "effective": "50%"
   },
   "xien": {
    "selected": 35,
    "lines": [
     {
      "x": 8,
      "name": "공통계 DEX/AGI",
      "selectable": true
     },
     {
      "x": 35,
      "name": "주술계 INT/DEX",
      "selectable": true
     }
    ]
   },
   "canUndo": true,
   "canRedo": false,
   "actions": 13,
   "levelLog": [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "2",
    "2",
    "2",
    "2",
    "",
    "4",
    ""
   ]
  },
  "preview": {
   "lv": 209,
   "point": 8,
   "stats": [
    0,
    0,
    1,
    0,
    0,
    0,
    0
   ],
   "hp": 16,
   "mp": 9,
   "sp": 20,
   "bonus": false
  },
  "log": "LV 200       :\rBonus        : 50%\rXien         : 주술계 INT/DEX\rLV 201       : \rLV 202 - 206 : INT 몰빵 4회\rLV 207       : MR\rLV 208       : \r로아미니/주술 Bonus: 4 / 8 Point: 21\rLV:208 STAB 1 HACK 2 INT 147 DEF 65 MR 3 DEX 204 AGI 200",
  "guide": "■스탯\r[캐릭터] 로아미니\r[타입] 주술\r[LV] 208\r[STAB] 1\r[HACK] 2\r[INT] 147\r[DEF] 65\r[MR] 3\r[DEX] 204\r[AGI] 200\r[HP] 10584\r[MP] 2972\r[SP] 8174\r보너스 50%\r\r[투구] \r[무기] \r[갑옷] \r[방패] \r[머리] \r[몸] \r[손] \r[다리] \r[펫] \r[사냥터] \r\r\r■재분배 순서\rLv 201부터 보너스 50%, 주술계 INT/DEX 주력\rINT 145까지 찍기 (Lv 206)\rMR 3까지 찍기\r\r\r■재분배 로그\rLV 200       :\rBonus        : 50%\rXien         : 주술계 INT/DEX\rLV 201       : \rLV 202 - 206 : INT 몰빵 4회\rLV 207       : MR\rLV 208       : \r로아미니/주술 Bonus: 4 / 8 Point: 21\rLV:208 STAB 1 HACK 2 INT 147 DEF 65 MR 3 DEX 204 AGI 200",
  "edit": {
   "lv": 208,
   "stats": [
    1,
    2,
    147,
    65,
    3,
    204,
    200
   ],
   "hp": 10584,
   "mp": 2972,
   "sp": 8174,
   "point": 21,
   "lines": [
    {
     "x": 8,
     "name": "공통계 DEX/AGI",
     "value": 0
    },
    {
     "x": 35,
     "name": "주술계 INT/DEX",
     "value": 1
    }
   ],
   "limits": {
    "lv": [
     1,
     285,
     1
    ],
    "stats": [
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ]
    ],
    "hp": [
     1,
     22000,
     1
    ],
    "mp": [
     1,
     7000,
     1
    ],
    "sp": [
     1,
     12000,
     1
    ],
    "point": [
     0,
     9999,
     1
    ]
   }
  },
  "before": {
   "act": "levelUp",
   "args": [],
   "view": {
    "char": 15,
    "type": 0,
    "charName": "로아미니",
    "typeName": "주술",
    "chars": [
     {
      "name": "루시안",
      "types": [
       "물리복합",
       "베기",
       "찌르기"
      ],
      "startLv": 1
     },
     {
      "name": "보리스",
      "types": [
       "물리복합",
       "베기",
       "마검사"
      ],
      "startLv": 1
     },
     {
      "name": "막시민",
      "types": [
       "물리복합",
       "베기",
       "마검사"
      ],
      "startLv": 1
     },
     {
      "name": "시벨린",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "밀라",
      "types": [
       "베기",
       "물리복합",
       "찌르기"
      ],
      "startLv": 1
     },
     {
      "name": "티치엘",
      "types": [
       "공격",
       "보조",
       "전투"
      ],
      "startLv": 1
     },
     {
      "name": "이스핀",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "나야트레이",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "조슈아",
      "types": [
       "강화",
       "변화",
       "방출"
      ],
      "startLv": 1
     },
     {
      "name": "클로에",
      "types": [
       "화염",
       "빙한",
       "전격"
      ],
      "startLv": 1
     },
     {
      "name": "란지에",
      "types": [
       "물리",
       "마법",
       "보조"
      ],
      "startLv": 1
     },
     {
      "name": "이자크",
      "types": [
       "찌르기",
       "베기",
       "물리복합"
      ],
      "startLv": 1
     },
     {
      "name": "아나이스",
      "types": [
       "마법인형",
       "파괴정령",
       "비호정령"
      ],
      "startLv": 1
     },
     {
      "name": "이솔렛",
      "types": [
       "티엘라",
       "신성찬트"
      ],
      "startLv": 1
     },
     {
      "name": "벤야",
      "types": [
       "영령"
      ],
      "startLv": 1
     },
     {
      "name": "로아미니",
      "types": [
       "주술"
      ],
      "startLv": 200
     }
    ],
    "lv": 207,
    "maxLv": 285,
    "startLv": 200,
    "point": 13,
    "stats": [
     {
      "key": "STAB",
      "value": 1,
      "cost": 4,
      "nextStepAt": 9,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "HACK",
      "value": 2,
      "cost": 2,
      "nextStepAt": 9,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "INT",
      "value": 146,
      "cost": 10,
      "nextStepAt": 159,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "DEF",
      "value": 65,
      "cost": 5,
      "nextStepAt": 84,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "MR",
      "value": 3,
      "cost": 3,
      "nextStepAt": 9,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "DEX",
      "value": 203,
      "cost": 10,
      "nextStepAt": 209,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "AGI",
      "value": 200,
      "cost": 11,
      "nextStepAt": 209,
      "canUp": true,
      "canDash": true,
      "atCap": false
     }
    ],
    "hp": {
     "value": 10568,
     "min": 10533,
     "max": 10603
    },
    "mp": {
     "value": 2963,
     "min": 2949,
     "max": 2977
    },
    "sp": {
     "value": 8154,
     "min": 8126,
     "max": 8182
    },
    "bonus": {
     "rate": 50,
     "achieved": 3,
     "levelUps": 7,
     "effective": "42.8%"
    },
    "xien": {
     "selected": 35,
     "lines": [
      {
       "x": 8,
       "name": "공통계 DEX/AGI",
       "selectable": true
      },
      {
       "x": 35,
       "name": "주술계 INT/DEX",
       "selectable": true
      }
     ]
    },
    "canUndo": true,
    "canRedo": false,
    "actions": 12,
    "levelLog": [
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "2",
     "2",
     "2",
     "2",
     "",
     "4"
    ]
   }
  }
 },
 "edited": {
  "view": {
   "char": 0,
   "type": 0,
   "charName": "루시안",
   "typeName": "물리복합",
   "chars": [
    {
     "name": "루시안",
     "types": [
      "물리복합",
      "베기",
      "찌르기"
     ],
     "startLv": 1
    },
    {
     "name": "보리스",
     "types": [
      "물리복합",
      "베기",
      "마검사"
     ],
     "startLv": 1
    },
    {
     "name": "막시민",
     "types": [
      "물리복합",
      "베기",
      "마검사"
     ],
     "startLv": 1
    },
    {
     "name": "시벨린",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "밀라",
     "types": [
      "베기",
      "물리복합",
      "찌르기"
     ],
     "startLv": 1
    },
    {
     "name": "티치엘",
     "types": [
      "공격",
      "보조",
      "전투"
     ],
     "startLv": 1
    },
    {
     "name": "이스핀",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "나야트레이",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "조슈아",
     "types": [
      "강화",
      "변화",
      "방출"
     ],
     "startLv": 1
    },
    {
     "name": "클로에",
     "types": [
      "화염",
      "빙한",
      "전격"
     ],
     "startLv": 1
    },
    {
     "name": "란지에",
     "types": [
      "물리",
      "마법",
      "보조"
     ],
     "startLv": 1
    },
    {
     "name": "이자크",
     "types": [
      "찌르기",
      "베기",
      "물리복합"
     ],
     "startLv": 1
    },
    {
     "name": "아나이스",
     "types": [
      "마법인형",
      "파괴정령",
      "비호정령"
     ],
     "startLv": 1
    },
    {
     "name": "이솔렛",
     "types": [
      "티엘라",
      "신성찬트"
     ],
     "startLv": 1
    },
    {
     "name": "벤야",
     "types": [
      "영령"
     ],
     "startLv": 1
    },
    {
     "name": "로아미니",
     "types": [
      "주술"
     ],
     "startLv": 200
    }
   ],
   "lv": 123,
   "maxLv": 285,
   "startLv": 120,
   "point": 12,
   "stats": [
    {
     "key": "STAB",
     "value": 137,
     "cost": 7,
     "nextStepAt": 151,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "HACK",
     "value": 50,
     "cost": 3,
     "nextStepAt": 51,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "INT",
     "value": 1,
     "cost": 4,
     "nextStepAt": 26,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "DEF",
     "value": 15,
     "cost": 3,
     "nextStepAt": 26,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "MR",
     "value": 1,
     "cost": 4,
     "nextStepAt": 26,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "DEX",
     "value": 154,
     "cost": 9,
     "nextStepAt": 176,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "AGI",
     "value": 20,
     "cost": 3,
     "nextStepAt": 26,
     "canUp": true,
     "canDash": true,
     "atCap": false
    }
   ],
   "hp": {
    "value": 3589,
    "min": 3574,
    "max": 3604
   },
   "mp": {
    "value": 593,
    "min": 590,
    "max": 596
   },
   "sp": {
    "value": 7170,
    "min": 7164,
    "max": 7176
   },
   "bonus": {
    "rate": 75,
    "achieved": 2,
    "levelUps": 3,
    "effective": "66.6%"
   },
   "xien": {
    "selected": 9,
    "lines": [
     {
      "x": 1,
      "name": "화염계 INT/DEX",
      "selectable": true
     },
     {
      "x": 3,
      "name": "바람계 DEX/INT",
      "selectable": true
     },
     {
      "x": 5,
      "name": "전격계 INT/MR",
      "selectable": true
     },
     {
      "x": 8,
      "name": "공통계 DEX/AGI",
      "selectable": true
     },
     {
      "x": 9,
      "name": "검계 STAB/DEX",
      "selectable": true
     },
     {
      "x": 10,
      "name": "도계 HACK/DEF",
      "selectable": true
     }
    ]
   },
   "canUndo": true,
   "canRedo": false,
   "actions": 9,
   "levelLog": [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "s000",
    "0",
    "5",
    "5"
   ]
  },
  "preview": {
   "lv": 124,
   "point": 6,
   "stats": [
    1,
    0,
    0,
    0,
    0,
    1,
    0
   ],
   "hp": 17,
   "mp": 1,
   "sp": 26,
   "bonus": true
  },
  "log": "Status       : 120, 9, 50, 0, 0, 0, 130, 50, 1, 15, 1, 150, 20, 3500, 580, 7000, 0, 40, 3500, 580, 7000, 0, 3500, 580, 7000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 1\rLV 120       : STAB * 3\rBonus        : 75%\rLV 121       : STAB\rLV 122 - 123 : DEX\r루시안/물리복합 Bonus: 2 / 3 Point: 12\rLV:123 STAB 137 HACK 50 INT 1 DEF 15 MR 1 DEX 154 AGI 20",
  "guide": "■스탯\r[캐릭터] 루시안\r[타입] 물리복합\r[LV] 123\r[STAB] 137\r[HACK] 50\r[INT] 1\r[DEF] 15\r[MR] 1\r[DEX] 154\r[AGI] 20\r[HP] 3589\r[MP] 593\r[SP] 7170\r보너스 66.6%\r\r[투구] \r[무기] \r[갑옷] \r[방패] \r[머리] \r[몸] \r[손] \r[다리] \r[펫] \r[사냥터] \r\r\r■재분배 순서\r시작 스탯 { 120, 9, 50, 0, 0, 0, 130, 50, 1, 15, 1, 150, 20, 3500, 580, 7000, 0, 40, 3500, 580, 7000, 0, 3500, 580, 7000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 1 }\rLv 120부터 보너스 50%, 검계 STAB/DEX 주력\rSTAB 133까지 찍기\rLv 121부터 보너스 75%\rSTAB 135까지 찍기 (Lv 121)\rDEX 154까지 찍기\r\r\r■재분배 로그\rStatus       : 120, 9, 50, 0, 0, 0, 130, 50, 1, 15, 1, 150, 20, 3500, 580, 7000, 0, 40, 3500, 580, 7000, 0, 3500, 580, 7000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 1\rLV 120       : STAB * 3\rBonus        : 75%\rLV 121       : STAB\rLV 122 - 123 : DEX\r루시안/물리복합 Bonus: 2 / 3 Point: 12\rLV:123 STAB 137 HACK 50 INT 1 DEF 15 MR 1 DEX 154 AGI 20",
  "edit": {
   "lv": 123,
   "stats": [
    137,
    50,
    1,
    15,
    1,
    154,
    20
   ],
   "hp": 3589,
   "mp": 593,
   "sp": 7170,
   "point": 12,
   "lines": [
    {
     "x": 1,
     "name": "화염계 INT/DEX",
     "value": 0
    },
    {
     "x": 3,
     "name": "바람계 DEX/INT",
     "value": 0
    },
    {
     "x": 5,
     "name": "전격계 INT/MR",
     "value": 0
    },
    {
     "x": 8,
     "name": "공통계 DEX/AGI",
     "value": 0
    },
    {
     "x": 9,
     "name": "검계 STAB/DEX",
     "value": 2
    },
    {
     "x": 10,
     "name": "도계 HACK/DEF",
     "value": 1
    }
   ],
   "limits": {
    "lv": [
     1,
     285,
     1
    ],
    "stats": [
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ]
    ],
    "hp": [
     1,
     22000,
     1
    ],
    "mp": [
     1,
     7000,
     1
    ],
    "sp": [
     1,
     12000,
     1
    ],
    "point": [
     0,
     9999,
     1
    ]
   }
  },
  "before": {
   "act": "statUp",
   "args": [
    5
   ],
   "view": {
    "char": 0,
    "type": 0,
    "charName": "루시안",
    "typeName": "물리복합",
    "chars": [
     {
      "name": "루시안",
      "types": [
       "물리복합",
       "베기",
       "찌르기"
      ],
      "startLv": 1
     },
     {
      "name": "보리스",
      "types": [
       "물리복합",
       "베기",
       "마검사"
      ],
      "startLv": 1
     },
     {
      "name": "막시민",
      "types": [
       "물리복합",
       "베기",
       "마검사"
      ],
      "startLv": 1
     },
     {
      "name": "시벨린",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "밀라",
      "types": [
       "베기",
       "물리복합",
       "찌르기"
      ],
      "startLv": 1
     },
     {
      "name": "티치엘",
      "types": [
       "공격",
       "보조",
       "전투"
      ],
      "startLv": 1
     },
     {
      "name": "이스핀",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "나야트레이",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "조슈아",
      "types": [
       "강화",
       "변화",
       "방출"
      ],
      "startLv": 1
     },
     {
      "name": "클로에",
      "types": [
       "화염",
       "빙한",
       "전격"
      ],
      "startLv": 1
     },
     {
      "name": "란지에",
      "types": [
       "물리",
       "마법",
       "보조"
      ],
      "startLv": 1
     },
     {
      "name": "이자크",
      "types": [
       "찌르기",
       "베기",
       "물리복합"
      ],
      "startLv": 1
     },
     {
      "name": "아나이스",
      "types": [
       "마법인형",
       "파괴정령",
       "비호정령"
      ],
      "startLv": 1
     },
     {
      "name": "이솔렛",
      "types": [
       "티엘라",
       "신성찬트"
      ],
      "startLv": 1
     },
     {
      "name": "벤야",
      "types": [
       "영령"
      ],
      "startLv": 1
     },
     {
      "name": "로아미니",
      "types": [
       "주술"
      ],
      "startLv": 200
     }
    ],
    "lv": 123,
    "maxLv": 285,
    "startLv": 120,
    "point": 21,
    "stats": [
     {
      "key": "STAB",
      "value": 137,
      "cost": 7,
      "nextStepAt": 151,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "HACK",
      "value": 50,
      "cost": 3,
      "nextStepAt": 51,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "INT",
      "value": 1,
      "cost": 4,
      "nextStepAt": 26,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "DEF",
      "value": 15,
      "cost": 3,
      "nextStepAt": 26,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "MR",
      "value": 1,
      "cost": 4,
      "nextStepAt": 26,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "DEX",
      "value": 153,
      "cost": 9,
      "nextStepAt": 176,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "AGI",
      "value": 20,
      "cost": 3,
      "nextStepAt": 26,
      "canUp": true,
      "canDash": true,
      "atCap": false
     }
    ],
    "hp": {
     "value": 3584,
     "min": 3569,
     "max": 3599
    },
    "mp": {
     "value": 590,
     "min": 587,
     "max": 593
    },
    "sp": {
     "value": 7140,
     "min": 7134,
     "max": 7146
    },
    "bonus": {
     "rate": 75,
     "achieved": 2,
     "levelUps": 3,
     "effective": "66.6%"
    },
    "xien": {
     "selected": 9,
     "lines": [
      {
       "x": 1,
       "name": "화염계 INT/DEX",
       "selectable": true
      },
      {
       "x": 3,
       "name": "바람계 DEX/INT",
       "selectable": true
      },
      {
       "x": 5,
       "name": "전격계 INT/MR",
       "selectable": true
      },
      {
       "x": 8,
       "name": "공통계 DEX/AGI",
       "selectable": true
      },
      {
       "x": 9,
       "name": "검계 STAB/DEX",
       "selectable": true
      },
      {
       "x": 10,
       "name": "도계 HACK/DEF",
       "selectable": true
      }
     ]
    },
    "canUndo": true,
    "canRedo": false,
    "actions": 8,
    "levelLog": [
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "s000",
     "0",
     "5",
     ""
    ]
   }
  }
 },
 "undone": {
  "view": {
   "char": 0,
   "type": 0,
   "charName": "루시안",
   "typeName": "물리복합",
   "chars": [
    {
     "name": "루시안",
     "types": [
      "물리복합",
      "베기",
      "찌르기"
     ],
     "startLv": 1
    },
    {
     "name": "보리스",
     "types": [
      "물리복합",
      "베기",
      "마검사"
     ],
     "startLv": 1
    },
    {
     "name": "막시민",
     "types": [
      "물리복합",
      "베기",
      "마검사"
     ],
     "startLv": 1
    },
    {
     "name": "시벨린",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "밀라",
     "types": [
      "베기",
      "물리복합",
      "찌르기"
     ],
     "startLv": 1
    },
    {
     "name": "티치엘",
     "types": [
      "공격",
      "보조",
      "전투"
     ],
     "startLv": 1
    },
    {
     "name": "이스핀",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "나야트레이",
     "types": [
      "찌르기",
      "물리복합",
      "베기"
     ],
     "startLv": 1
    },
    {
     "name": "조슈아",
     "types": [
      "강화",
      "변화",
      "방출"
     ],
     "startLv": 1
    },
    {
     "name": "클로에",
     "types": [
      "화염",
      "빙한",
      "전격"
     ],
     "startLv": 1
    },
    {
     "name": "란지에",
     "types": [
      "물리",
      "마법",
      "보조"
     ],
     "startLv": 1
    },
    {
     "name": "이자크",
     "types": [
      "찌르기",
      "베기",
      "물리복합"
     ],
     "startLv": 1
    },
    {
     "name": "아나이스",
     "types": [
      "마법인형",
      "파괴정령",
      "비호정령"
     ],
     "startLv": 1
    },
    {
     "name": "이솔렛",
     "types": [
      "티엘라",
      "신성찬트"
     ],
     "startLv": 1
    },
    {
     "name": "벤야",
     "types": [
      "영령"
     ],
     "startLv": 1
    },
    {
     "name": "로아미니",
     "types": [
      "주술"
     ],
     "startLv": 200
    }
   ],
   "lv": 123,
   "maxLv": 285,
   "startLv": 1,
   "point": 5,
   "stats": [
    {
     "key": "STAB",
     "value": 132,
     "cost": 7,
     "nextStepAt": 151,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "HACK",
     "value": 53,
     "cost": 4,
     "nextStepAt": 76,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "INT",
     "value": 1,
     "cost": 4,
     "nextStepAt": 26,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "DEF",
     "value": 17,
     "cost": 3,
     "nextStepAt": 26,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "MR",
     "value": 1,
     "cost": 4,
     "nextStepAt": 26,
     "canUp": true,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "DEX",
     "value": 151,
     "cost": 9,
     "nextStepAt": 176,
     "canUp": false,
     "canDash": true,
     "atCap": false
    },
    {
     "key": "AGI",
     "value": 22,
     "cost": 3,
     "nextStepAt": 26,
     "canUp": true,
     "canDash": true,
     "atCap": false
    }
   ],
   "hp": {
    "value": 3591,
    "min": 2981,
    "max": 4201
   },
   "mp": {
    "value": 591,
    "min": 469,
    "max": 713
   },
   "sp": {
    "value": 7110,
    "min": 6866,
    "max": 7384
   },
   "bonus": {
    "rate": 75,
    "achieved": 83,
    "levelUps": 122,
    "effective": "68%"
   },
   "xien": {
    "selected": 9,
    "lines": [
     {
      "x": 1,
      "name": "화염계 INT/DEX",
      "selectable": true
     },
     {
      "x": 3,
      "name": "바람계 DEX/INT",
      "selectable": true
     },
     {
      "x": 5,
      "name": "전격계 INT/MR",
      "selectable": true
     },
     {
      "x": 8,
      "name": "공통계 DEX/AGI",
      "selectable": true
     },
     {
      "x": 9,
      "name": "검계 STAB/DEX",
      "selectable": true
     },
     {
      "x": 10,
      "name": "도계 HACK/DEF",
      "selectable": true
     }
    ]
   },
   "canUndo": true,
   "canRedo": true,
   "actions": 279,
   "levelLog": [
    "",
    "00",
    "00",
    "00",
    "00",
    "00",
    "000",
    "000",
    "000",
    "0",
    "00",
    "0",
    "00",
    "0",
    "00",
    "0",
    "00",
    "0",
    "00",
    "0",
    "0",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16",
    "16555555555",
    "5",
    "55",
    "55",
    "5",
    "55",
    "5",
    "55",
    "5",
    "5",
    "5",
    "55",
    "5",
    "5",
    "5",
    "55",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "",
    "5",
    "5",
    "5",
    "",
    "5"
   ]
  },
  "preview": {
   "lv": 124,
   "point": 6,
   "stats": [
    1,
    0,
    0,
    0,
    0,
    1,
    0
   ],
   "hp": 17,
   "mp": 1,
   "sp": 26,
   "bonus": true
  },
  "log": "LV   1       :\rBonus        : 50%\rXien         : 도계 HACK/DEF\rLV   2 -  20 : STAB 몰빵 35회\rLV  21       : STAB\rLV  22 -  31 : \rBonus        : 75%\rXien         : 검계 STAB/DEX\rLV  32 -  50 : HACK, AGI\rLV  51       : HACK, AGI, DEX * 9\rLV  52 - 123 : DEX 몰빵 72회\r루시안/물리복합 Bonus: 83 / 122 Point: 5\rLV:123 STAB 132 HACK 53 INT 1 DEF 17 MR 1 DEX 151 AGI 22",
  "guide": "■스탯\r[캐릭터] 루시안\r[타입] 물리복합\r[LV] 123\r[STAB] 132\r[HACK] 53\r[INT] 1\r[DEF] 17\r[MR] 1\r[DEX] 151\r[AGI] 22\r[HP] 3591\r[MP] 591\r[SP] 7110\r보너스 68%\r\r[투구] \r[무기] \r[갑옷] \r[방패] \r[머리] \r[몸] \r[손] \r[다리] \r[펫] \r[사냥터] \r\r\r■재분배 순서\rLv 2부터 보너스 50%, 도계 HACK/DEF 주력\rSTAB 40까지 찍기 (Lv 31)\rLv 32부터 보너스 75%, 검계 STAB/DEX 주력\rHACK 34까지 찍기\rAGI 3까지 찍기 (Lv 32)\rHACK 35까지 찍기\rAGI 4까지 찍기 (Lv 33)\rHACK 36까지 찍기\rAGI 5까지 찍기 (Lv 34)\rHACK 37까지 찍기\rAGI 6까지 찍기 (Lv 35)\rHACK 38까지 찍기\rAGI 7까지 찍기 (Lv 36)\rHACK 39까지 찍기\rAGI 8까지 찍기 (Lv 37)\rHACK 40까지 찍기\rAGI 9까지 찍기 (Lv 38)\rHACK 41까지 찍기\rAGI 10까지 찍기 (Lv 39)\rHACK 42까지 찍기 (필요 포인트 3)\rAGI 11까지 찍기 (Lv 40)\rHACK 43까지 찍기\rAGI 12까지 찍기 (Lv 41)\rHACK 44까지 찍기\rAGI 13까지 찍기 (Lv 42)\rHACK 45까지 찍기\rAGI 14까지 찍기 (Lv 43)\rHACK 46까지 찍기\rAGI 15까지 찍기 (Lv 44)\rHACK 47까지 찍기\rAGI 16까지 찍기 (Lv 45, 필요 포인트 3)\rHACK 48까지 찍기\rAGI 17까지 찍기 (Lv 46)\rHACK 49까지 찍기\rAGI 18까지 찍기 (Lv 47)\rHACK 50까지 찍기\rAGI 19까지 찍기 (Lv 48)\rHACK 51까지 찍기\rAGI 20까지 찍기 (Lv 49)\rHACK 52까지 찍기\rAGI 21까지 찍기 (Lv 50)\rHACK 53까지 찍기\rAGI 22까지 찍기\rDEX 151까지 찍기 (Lv 123, 필요 포인트 9)\r\r\r■재분배 로그\rLV   1       :\rBonus        : 50%\rXien         : 도계 HACK/DEF\rLV   2 -  20 : STAB 몰빵 35회\rLV  21       : STAB\rLV  22 -  31 : \rBonus        : 75%\rXien         : 검계 STAB/DEX\rLV  32 -  50 : HACK, AGI\rLV  51       : HACK, AGI, DEX * 9\rLV  52 - 123 : DEX 몰빵 72회\r루시안/물리복합 Bonus: 83 / 122 Point: 5\rLV:123 STAB 132 HACK 53 INT 1 DEF 17 MR 1 DEX 151 AGI 22",
  "edit": {
   "lv": 123,
   "stats": [
    132,
    53,
    1,
    17,
    1,
    151,
    22
   ],
   "hp": 3591,
   "mp": 591,
   "sp": 7110,
   "point": 5,
   "lines": [
    {
     "x": 1,
     "name": "화염계 INT/DEX",
     "value": 0
    },
    {
     "x": 3,
     "name": "바람계 DEX/INT",
     "value": 0
    },
    {
     "x": 5,
     "name": "전격계 INT/MR",
     "value": 0
    },
    {
     "x": 8,
     "name": "공통계 DEX/AGI",
     "value": 0
    },
    {
     "x": 9,
     "name": "검계 STAB/DEX",
     "value": 2
    },
    {
     "x": 10,
     "name": "도계 HACK/DEF",
     "value": 1
    }
   ],
   "limits": {
    "lv": [
     1,
     285,
     1
    ],
    "stats": [
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ],
     [
      1,
      285,
      1
     ]
    ],
    "hp": [
     1,
     22000,
     1
    ],
    "mp": [
     1,
     7000,
     1
    ],
    "sp": [
     1,
     12000,
     1
    ],
    "point": [
     0,
     9999,
     1
    ]
   }
  },
  "before": {
   "act": "undo",
   "args": [
    false
   ],
   "view": {
    "char": 0,
    "type": 0,
    "charName": "루시안",
    "typeName": "물리복합",
    "chars": [
     {
      "name": "루시안",
      "types": [
       "물리복합",
       "베기",
       "찌르기"
      ],
      "startLv": 1
     },
     {
      "name": "보리스",
      "types": [
       "물리복합",
       "베기",
       "마검사"
      ],
      "startLv": 1
     },
     {
      "name": "막시민",
      "types": [
       "물리복합",
       "베기",
       "마검사"
      ],
      "startLv": 1
     },
     {
      "name": "시벨린",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "밀라",
      "types": [
       "베기",
       "물리복합",
       "찌르기"
      ],
      "startLv": 1
     },
     {
      "name": "티치엘",
      "types": [
       "공격",
       "보조",
       "전투"
      ],
      "startLv": 1
     },
     {
      "name": "이스핀",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "나야트레이",
      "types": [
       "찌르기",
       "물리복합",
       "베기"
      ],
      "startLv": 1
     },
     {
      "name": "조슈아",
      "types": [
       "강화",
       "변화",
       "방출"
      ],
      "startLv": 1
     },
     {
      "name": "클로에",
      "types": [
       "화염",
       "빙한",
       "전격"
      ],
      "startLv": 1
     },
     {
      "name": "란지에",
      "types": [
       "물리",
       "마법",
       "보조"
      ],
      "startLv": 1
     },
     {
      "name": "이자크",
      "types": [
       "찌르기",
       "베기",
       "물리복합"
      ],
      "startLv": 1
     },
     {
      "name": "아나이스",
      "types": [
       "마법인형",
       "파괴정령",
       "비호정령"
      ],
      "startLv": 1
     },
     {
      "name": "이솔렛",
      "types": [
       "티엘라",
       "신성찬트"
      ],
      "startLv": 1
     },
     {
      "name": "벤야",
      "types": [
       "영령"
      ],
      "startLv": 1
     },
     {
      "name": "로아미니",
      "types": [
       "주술"
      ],
      "startLv": 200
     }
    ],
    "lv": 124,
    "maxLv": 285,
    "startLv": 1,
    "point": 11,
    "stats": [
     {
      "key": "STAB",
      "value": 133,
      "cost": 7,
      "nextStepAt": 151,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "HACK",
      "value": 53,
      "cost": 4,
      "nextStepAt": 76,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "INT",
      "value": 1,
      "cost": 4,
      "nextStepAt": 26,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "DEF",
      "value": 17,
      "cost": 3,
      "nextStepAt": 26,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "MR",
      "value": 1,
      "cost": 4,
      "nextStepAt": 26,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "DEX",
      "value": 152,
      "cost": 9,
      "nextStepAt": 176,
      "canUp": true,
      "canDash": true,
      "atCap": false
     },
     {
      "key": "AGI",
      "value": 22,
      "cost": 3,
      "nextStepAt": 26,
      "canUp": true,
      "canDash": true,
      "atCap": false
     }
    ],
    "hp": {
     "value": 3608,
     "min": 2993,
     "max": 4223
    },
    "mp": {
     "value": 592,
     "min": 469,
     "max": 715
    },
    "sp": {
     "value": 7136,
     "min": 6890,
     "max": 7412
    },
    "bonus": {
     "rate": 75,
     "achieved": 84,
     "levelUps": 123,
     "effective": "68.2%"
    },
    "xien": {
     "selected": 9,
     "lines": [
      {
       "x": 1,
       "name": "화염계 INT/DEX",
       "selectable": true
      },
      {
       "x": 3,
       "name": "바람계 DEX/INT",
       "selectable": true
      },
      {
       "x": 5,
       "name": "전격계 INT/MR",
       "selectable": true
      },
      {
       "x": 8,
       "name": "공통계 DEX/AGI",
       "selectable": true
      },
      {
       "x": 9,
       "name": "검계 STAB/DEX",
       "selectable": true
      },
      {
       "x": 10,
       "name": "도계 HACK/DEF",
       "selectable": true
      }
     ]
    },
    "canUndo": true,
    "canRedo": false,
    "actions": 280,
    "levelLog": [
     "",
     "00",
     "00",
     "00",
     "00",
     "00",
     "000",
     "000",
     "000",
     "0",
     "00",
     "0",
     "00",
     "0",
     "00",
     "0",
     "00",
     "0",
     "00",
     "0",
     "0",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16",
     "16555555555",
     "5",
     "55",
     "55",
     "5",
     "55",
     "5",
     "55",
     "5",
     "5",
     "5",
     "55",
     "5",
     "5",
     "5",
     "55",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "",
     "5",
     "5",
     "5",
     "",
     "5",
     ""
    ]
   }
  }
 }
};
