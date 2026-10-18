# One-shot prompt per video

Hand over one Markdown file per video, so the person (or another agent) can re-make or vary it without this conversation.
Two parts, always separate:

- **PART 1 — video prompt** (paste into Claude Code): role + goal, the facts sheet ("only these facts; no invented
  numbers"), production method (one HTML page per video, `render(t)`, `?f=p`, Playwright 30 fps → ffmpeg settings,
  portrait re-layout, stills check), design (palette with hex, fonts, logo handling, transition), the scene list with
  exact times and on-screen text, and how to combine the sound (cut the take by silence, cue times, speed limits,
  effect list, ducking −10 dB, −14 LUFS, AAC 192k).
- **PART 2 — ElevenLabs** (done in ElevenLabs or with the connector): voice name + voice_id, model, the one-line script
  with `[long pause]` and emotion tags, cue times, SFX table (purpose · prompt · length), music prompt **and the
  settings actually used** (model, instrumental flag, duration, which variation was picked and why, music level).

Write it in the person's language. Below is the real prompt for `examples/minimal` (Korean).

---

## PART 1. 영상 제작 프롬프트 (Claude Code에 그대로 붙여넣기)

```
너는 모션그래픽 디자이너 겸 개발자야. 아래 회사의 30초 홍보 영상을 가로(1920×1080)와 세로(1080×1920) 두 버전 MP4로 만들어줘. 목표는 "보면 누구나 바로 써보고 싶게" 만드는 것.

[회사 정보 — https://www.fortimoveglobal.com/about 에 있는 사실만 사용]
- 회사: 포티무브글로벌 (Fortimove Global), 해외 구매대행
- 헤드라인: "찾으시는 상품, 해외에서 찾아드려요"
- 사진·링크·브랜드명만 보내면 해외에서 상품을 찾아 가격 비교·견적 → 원하면 주문·검수·배송까지
- 4단계: ① 링크·사진 전송 ② 무료 견적(상품가·수수료·배송비 안내) ③ 견적 동의 후 결제 ④ 실물 검수 후 배송
- 원칙: 숨은 비용 없음, 견적 전 결제 없음, 회원가입 없음, 주말·공휴일도 접수, 가품·위험물·통관금지 품목 취급 안 함, 국내가 더 싸면 국내 구매를 권함
- 관세청 전자상거래업자 등록 / 중국·일본이 가장 익숙, 미국·동남아도 가능
- 연락: fortimoveglobal.com · 카카오톡 채널 · 070-8983-8495
- 실적·고객 수 같은 숫자는 사이트에 없으니 절대 지어내지 말 것. 견적 금액은 "예시" 라벨을 붙인 연출용 숫자만.

[제작 방식]
- 영상 1개 = HTML 1개. window.render(t)가 시간 t(초)를 받아 모든 요소의 상태를 결정적으로 그리게 만들고, ?f=p 이면 세로 레이아웃. 브라우저로 열면 실시간 미리보기.
- Playwright로 30fps 프레임을 캡처해 ffmpeg(libx264, crf 18, yuv420p, faststart)로 MP4 인코딩.
- 세로판은 단순 축소가 아니라 위→아래로 다시 배치. 핵심 정보는 화면 중앙(쇼츠 UI에 안 가리게).
- 주요 시점마다 정지 화면을 뽑아 눈으로 확인하고, 글자 겹침·가림을 고친 뒤 최종 렌더.

[디자인]
- 사이트처럼 흑백 미니멀: 배경 #F4F5F7 / 흰색, 글자 #111114, 포인트 초록 #059669(체크·강조), 카카오톡 표시만 #FEE500
- 폰트 Pretendard(900 굵기 큰 제목, 자간 -0.045em), 단어 단위로 아래에서 올라오는 키네틱 타이포
- 로고: 사이트 favicon(https://www.fortimoveglobal.com/favicon-fg2.png, 세리프 "FG"). 밝은 배경에선 multiply, 어두운 배경에선 invert+screen
- 상품 예시: SVG로 그린 "버섯 모양 조명"(복숭아색 사진 배경). SNS 계정명 등은 가상의 것
- 장면 전환: 다음 장면이 화면 중앙에서 원형으로 퍼지며 열리는 아이리스 전환(0.5초)
- 좌상단에 작은 브랜드 표시(FG + Fortimove Global · 해외 구매대행), 검은 장면에선 숨김

[장면 — 30초]
1) 0–4.2s 공감: SNS 게시물 카드(조명 사진, 좋아요 2,481개)에 댓글 말풍선 5개가 톡톡 튀어나옴("이거 어디서 팔아요? 😍", "정보 좀 부탁드려요 🙏", "판매처 아시는 분?", "저도 궁금해요!!", "링크 주세요 ㅠㅠ"). 제목 "이거 어디서 팔아요?", 작은 글 "사고 싶은데, 판매처를 모를 때."
2) 4.2–8.2s 불편: 제목 "판매처도 모르고, 해외 직구는 복잡하고." 검색창에 "버섯 모양 조명 판매처" 타이핑 → "검색 결과가 없어요" 박스가 흔들림 → 검은 칩 3개 "어느 나라 사이트? 🌏", "외국어 상세페이지?", "해외 결제·배송은?"
3) 8.2–12.6s 해결(검은 배경): 채팅으로 조명 사진 + "이 상품 찾아주세요!" 전송 → "전송됨 ✓" → FG 프로필이 "네! 찾아서 무료로 견적 드릴게요 😊" 답장 → FG 로고와 제목 "찾으시는 상품, 해외에서 찾아드려요", 작은 글 "링크가 없어도 사진·브랜드명만 있으면 OK"
4) 12.6–17s 견적: 상단 4단계 진행바(사진 전송 ✓, 무료 견적 ✓ …). 제목 "결제 전에, 총액부터 확인하세요"(총액부터에 초록 형광펜). 견적서 카드(라벨 "예시"): 상품가 ₩38,000 / 구매대행 수수료 ₩5,000 / 국제 배송비 ₩9,000 / 합계 ₩52,000 숫자가 차례로 올라감 → 초록 원형 도장 "숨은 비용 없음 · 견적은 무료"가 카드 오른쪽 위에 쾅
5) 17–21.6s 결제·검수·배송: 진행바 3·4단계 체크. 제목 "동의하면 결제, 검수하고 배송". 카드 3장: ①"견적 동의 후 결제" 버튼 눌림+체크 ②카메라 뷰파인더 속 조명 사진에 셔터 플래시 → "검수 완료 ✓" ③🌏 → 🏠 점선 곡선 위로 📦가 통통 이동
6) 21.6–25.8s 신뢰(흰 배경): 큰 제목 "국내가 더 저렴하면, 국내 구매를 권해드려요"(국내 구매에 형광펜) + 체크 칩 5개 "무료 견적 · 회원가입 없음 · 주말·공휴일도 접수 · 가품·통관금지 품목 취급 안 함 · 관세청 전자상거래업자 등록"
7) 25.8–30s 행동 유도(검은 배경): FG 로고 팝 → "Fortimove Global" → "해외 구매대행, 사진 한 장이면 충분해요" → 흰 버튼 "상품 찾기 요청 →"을 손가락으로 탭(초록 물결) → "fortimoveglobal.com / 카카오톡 채널 상담 · 070-8983-8495" → 칩 "중국 · 일본 · 미국 · 동남아"

[사운드 합치기]
- 아래 PART 2의 내레이션 파일을 받으면: 무음 구간 기준으로 문장을 자르고(문장 안 쉼은 0.18초로 줄임) 각 장면 시작에 배치. 필요하면 1.05~1.15배 속도(atempo)로 장면 안에 맞추고, 문장끼리 겹치지 않게.
- 효과음: 댓글 팝, 검색 타이핑, 오류음(낮은 삑삑), 장면 전환 휙, 견적 숫자 틱, 도장 쾅, 결제 클릭, 카메라 셔터, 배송 휙, 칩 팝, 버튼 탭 + 알림음
- 배경음악은 말이 나올 때 -10dB 자동으로 줄이고(덕킹), 최종 -14 LUFS / 피크 -1.5dB로 맞춰 MP4에 AAC 192k로 넣기.
```

---

## PART 2. ElevenLabs (따로 생성)

### 내레이션
- 목소리: **Dahye – Clear Korean Explainer** (voice_id `zXNMXSB7uul4lbmpaVAn`)
- 모델: **Eleven v4** (대괄호 감정 태그 지원)
- 대본 (그대로 붙여넣기):

```
[curious] 이거 어디서 팔아요? [long pause] 판매처도 모르고, 해외 직구는 복잡하고. [long pause] [warmly] 이제 사진 한 장만 보내세요. 찾으시는 상품, 해외에서 찾아드려요. [long pause] 상품가, 수수료, 배송비까지. 무료 견적으로 먼저 확인하고, [long pause] 동의하신 뒤에 결제, 실물 검수 후 배송해 드려요. [long pause] 국내가 더 저렴하면, 솔직하게 국내 구매를 권해드려요. [long pause] 해외 구매대행, 포티무브 글로벌.
```

- 배치 시점(초): 0.35 / 4.4 / 8.5 / 13.15 / 17.6 / 21.9 / 26.4
- 팁: 여러 버전 중 가장 짧은 것을 고르세요. 문장 사이 [long pause]는 편집 때 잘라 쓰는 용도입니다.

### 효과음 (Sound Effects, 실제 소리가 필요한 것만)
| 용도 | 프롬프트 | 길이 |
|---|---|---|
| 도장 | One firm rubber stamp thump pressed onto paper on a wooden desk. Single hit, punchy, close-up, dry. | 2초 |
| 타이핑 | Soft smartphone touchscreen keyboard typing, light quick taps with subtle haptic clicks, about two seconds, close-up, quiet room. | 2초 |

(팝·휙·틱·셔터·알림음은 코드로 합성했습니다)

### 배경음악
- 직접 작곡: `examples/minimal/sound.py`의 `song()` (120bpm F장조, 장면 전환마다 임팩트)
- ElevenLabs Music으로 만들 때: 모델 `eleven_music_v2_5`, **instrumental 켜기**, 길이 32초(영상+2초) → 4개 중 장면 전환과 가장 맞는 것을 `pick-music.py`로 골라 0.2초 늦춰 배치
```
Bright, modern commercial pop instrumental for a friendly app ad, around 120 BPM in F major, clean crisp production, no vocals. Opens with a playful, curious plucked marimba motif over light shakers, dips into a short muted, slightly tense moment with a rising swell, then at about 8 seconds bursts into a bright groove with warm electric piano chords, sparkly plucks, punchy four-on-the-floor kick and claps. Around 21 seconds it breaks down to soft, sincere piano only, then lifts again for a confident final chorus that stays full until 30 seconds and resolves on a sparkling bell chord.
```
