# tech-motion-explainer

Technical explainer videos drawn entirely in code — a 60–110 s canvas animation of how a system works (a pipeline, a protocol,
a server loop), played live in the browser with chapters and speed control, plus a written explanation page, a glossary page and an
MP4 from the same file. Also: 9:16 vertical cuts, 3D ways of explaining (three.js), and pieces scroll-scrubbed inside another page.
See **SKILL.md** for the workflow and `references/` for the details. Quick start, from your project root:

```bash
S=.claude/skills/tech-motion-explainer                          # wherever this folder lives
cp -r $S/starter/assets assets && cp $S/starter/index.html index.html
mkdir my-topic && cp $S/template.html my-topic/index.html       # edit HEAD / scenes / notes; add a VIDEOS entry in index.html
node $S/scripts/render.mjs my-topic/index.html /tmp/stills --stills 3,10,20   # look at the PNGs
node $S/scripts/check-player.mjs my-topic/index.html
node $S/scripts/build-articles.mjs                               # → my-topic/article.html + terms.html
node $S/scripts/render.mjs my-topic/index.html out/my-topic.mp4  # or scripts/render-chunked.sh for long / 3D pages
```
Try it on the bundled references first: `cd starter && node ../scripts/render.mjs proto-bot-pipeline/index.html /tmp/s --stills 5,30`
(2D) or `… server-tick-inside-wide/index.html …` (3D), and open `starter/index.html` through any static server.

Requirements: Node + Playwright Chromium, ffmpeg. Full worked example (12 topics, vertical cuts, 3D approaches, MP4s):
github.com/jungrok5/mmo-server-explained · jungrok5.github.io/mmo-server-explained

## One-shot prompt (without the skill)

A request that gets the same kind of result from a plain agent, without installing the skill. Replace `[내용]` with your topic.

````text
아래 기술 내용을 1920×1080, 1~2분짜리 모션그래픽 설명 영상으로 만들어줘.

[내용]
(설명할 기술 내용. 등장 요소, 흐름, 꼭 전달하고 싶은 메시지)

[구성]
- 인트로 5초(제목 단어별 등장 + 흐름을 요약한 점 스트립), 챕터 4~8개(각 10~15초), 아웃트로 5.5초(요약 노드 + 표어).
- 챕터마다 생각 하나와 그림 하나: 코드 패널, 노드 흐름, 시간 레인, 시퀀스 다이어그램, 막대 · 그래프, 버퍼 탱크 등.
- 실제 이름(메시지 · 필드 · 명령 · 지표)을 쓰고, 지어낸 수치는 "예시"로 표시.

[문구]
- 짧은 평서문. 비유 · 대구로 끝나는 표어 · "~의 길" 같은 표현은 쓰지 말고 요점을 그대로 쓴다.
- 같은 수준끼리 비교하고, 조건이 있는 효과는 조건을 함께 쓴다. 효과를 부풀리지 않는다.

[스타일]
- 다크 네이비 배경, 역할별 색 고정(실패 · 대기는 빨강), Pretendard + JetBrains Mono, 좌상단 챕터 헤더, 하단 진행바.

[구현]
- 단일 HTML 캔버스, 모든 프레임은 renderAt(t)의 순수 함수(랜덤은 시드 고정).
- 플레이어: 재생/일시정지, 드래그 탐색바(챕터 눈금), 챕터 버튼, 재생 속도 1× · 0.75× · 0.5×, 전체 화면, 키보드.
- 영상 · 설명(챕터별 글, 장면 바로가기) · 용어집(이 주제의 용어만) 세 페이지를 한 세트로.
- 챕터마다 스틸을 뽑아 겹침 · 잘림을 고치고, 별도 에이전트로 시니어 전문가 검수를 거친 뒤 보여줘.
````
