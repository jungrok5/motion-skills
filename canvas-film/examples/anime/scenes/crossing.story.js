/* Replace the brief, shots and performance tracks for the next film.
   Art and shot renderers remain explicit production inputs; this is not a text-to-video API. */
window.FILM_SPEC={
  title:'건널목',duration:32.4,
  brief:{purpose:'말하지 못한 마음과 한여름의 상실을 짧은 애니메이션으로 전달한다.',audience:'일본 애니메이션의 감성적 단편을 좋아하는 관객',theme:'전철이 지나간 뒤, 너는 사라지고 여름 하늘만 남는다.'},
  shots:[
    {id:'A',start:0,end:7,label:'여름 하늘',camera:'tilt-down',action:'비행운, 구름, 빛'},
    {id:'B',start:7,end:13,label:'기다림',camera:'slow-push',action:'체중을 옮기며 건너편을 기다린다'},
    {id:'L',start:13,end:14.6,label:'경고등',camera:'insert',action:'교차 점멸'},
    {id:'C',start:14.6,end:20.6,label:'열차',camera:'push-and-shake',action:'돌풍에 상체가 반응하고 머리카락이 뒤따른다'},
    {id:'G',start:20.6,end:26,label:'돌아봄',camera:'close-push',action:'시선이 먼저, 고개가 뒤따르고 어깨가 늦게 정착한다'},
    {id:'D',start:26,end:32.4,label:'남은 하늘',camera:'tilt-up',action:'노을, 새, 빈 하늘'}
  ],
  // Seconds within close-up. Axis limits: yaw/pitch [-1,1], roll radians, body pixels in 1664×2080 model.
  acting:[
    {t:0,yaw:-.85,pitch:.10,roll:-.085,bodyX:-22,bodyY:8,gazeX:-.8,gazeY:0},
    {t:.7,yaw:.25,pitch:.04,roll:.045,bodyX:10,bodyY:0,gazeX:.4,gazeY:0},
    {t:1.15,yaw:.08,pitch:0,roll:.015,bodyX:3,bodyY:2,gazeX:0,gazeY:0},
    {t:2.0,yaw:.36,pitch:-.07,roll:-.025,bodyX:-8,bodyY:4,gazeX:.55,gazeY:-.1},
    {t:2.8,yaw:-.22,pitch:.24,roll:.075,bodyX:-15,bodyY:10,gazeX:-.25,gazeY:.45},
    {t:3.45,yaw:-.12,pitch:.34,roll:.10,bodyX:-8,bodyY:12,gazeX:-.15,gazeY:.35},
    {t:4.3,yaw:.13,pitch:.06,roll:.035,bodyX:5,bodyY:2,gazeX:0,gazeY:0},
    {t:5.4,yaw:.06,pitch:.12,roll:.045,bodyX:0,bodyY:4,gazeX:0,gazeY:.1}
  ],
  blinks:[{t:1.35,dur:.22},{t:2.94,dur:.34},{t:4.7,dur:.20}],
  smileAt:3.12,
  subtitles:[
    {text:'그해 여름, 하늘은 유난히 높았다.',start:1.8,end:6.5},
    {text:'건널목 너머의 너에게,\n하고 싶은 말이 있었다.',start:7.7,end:12.85},
    {text:'전철이 지나간 자리에는\n여름 하늘만 남아 있었다.',start:26.4,end:31.2}
  ]
};
