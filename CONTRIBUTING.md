# 스킬 추가하기 · 다른 레포에서 흡수하기

이 레포는 모션그래픽 스킬 모음입니다. 스킬은 대개 다른 프로젝트 레포에서 실제 작품을 만들며 다듬어진 뒤 여기로 흡수됩니다
(`canvas-film/` ← one-scroll-bible의 `motion/`, `tech-motion-explainer/` ← mmo-server-explained(옛 이름 motion-graphics)의 `.claude/skills/`).
새 스킬도 같은 모양으로 들어오도록 순서를 정리합니다. 에이전트가 이 일을 할 때도 이 문서를 그대로 따릅니다.

순서 요약:
1. [스킬 폴더](#1-스킬-폴더) 만들기 (구조와 이름 맞추기)
2. [다른 레포에서 흡수](#2-다른-레포에서-흡수하기)할 때 지킬 것 (일반화 · 출처 · 교훈 · 검증)
3. [샘플 페이지](#3-샘플-페이지) 만들기 (`docs/<skill>/`, `docs/skills.json`, README 표)
4. [확인하고 커밋](#4-확인과-커밋)

---

## 1. 스킬 폴더

레포 루트 바로 아래에 스킬마다 폴더를 한 개 둡니다. 이름은 kebab-case 영어로, 만드는 것을 말하는 이름으로 짓습니다
(`canvas-film`, `tech-motion-explainer`). 폴더 이름 = `SKILL.md`의 `name` = `docs/skills.json`의 `id` = 샘플 페이지 경로.

```
<skill>/
  SKILL.md          에이전트가 따르는 본문 (필수)
  README.md         사람이 읽는 소개 + 빠른 시작 (필수)
  scripts/          렌더 · 검증 · 빌드 스크립트
  references/       길어서 SKILL.md에서 뺀 내용. 파일명은 대문자 .md (STYLES.md, LESSONS.md, …)
  starter/ 또는 examples/<name>/   바로 돌려 볼 수 있는 최소 프로젝트 (필수)
  (template.html, harness/, player/ … 스킬에 필요한 나머지)
```

### SKILL.md

맨 위 frontmatter:

```yaml
---
name: <skill>
description: 무엇을 만드는지 한두 문장 + 언제 쓰는지. 트리거 단어를 영어와 한국어로 함께
  (예: "motion graphics", "explainer video", "모션그래픽", "설명 영상", "영상으로 만들어줘").
---
```

`description`은 에이전트가 스킬을 고를 때 읽는 유일한 글이므로, 사용자가 실제로 쓸 말을 넣습니다.

본문은 이 순서의 섹션을 갖춥니다 (기존 두 스킬이 예시):

| 섹션 | 내용 |
|---|---|
| 한 문단 소개 | 무엇을 만드는가, 결과물 형식 |
| 출처 한 줄 | `Built for and proven on …` / `Worked example repo: …` — 실제 작품 레포와 라이브 주소 |
| What's in this folder | 폴더의 파일 표 (경로 · 역할) |
| Project layout | 사용자의 프로젝트에 무엇이 생기는가 (트리) |
| Requirements | 한 줄: Node / Playwright / ffmpeg / Python 등 |
| Workflow | 번호 붙은 단계. 검증 단계(스틸 렌더, 자동 점검)를 반드시 포함 |
| Rules | 어기면 결과가 망가지는 규칙 (결정성, 캔버스 크기, 글자 크기, 문구 규칙 …) |
| Contract | 페이지 · 장면이 지키는 계약 (`seek(t)` / `renderAt(t)`, `DURATION`, ready …) |

경로 표기: 스킬 폴더는 `<skill>/…`, 사용자 프로젝트는 상대 경로. 스크립트는 프로젝트 루트에서 실행한다고 적습니다.

### README.md

무엇을 만드는지 3–4줄, 빠른 시작 코드 블록(번들된 starter/examples로 바로 실행되는 명령), Requirements 한 줄,
실제 작품 링크 한 줄. 영어로 씁니다 (기존 두 스킬과 같게).

### starter / examples

- 폴더를 복사한 직후, 네트워크 없이 바로 돌아가야 합니다. 폰트 · 라이브러리는 번들하고 라이선스를 옆에 둡니다
  (`starter/assets/README.md`, `vendor/three/LICENSE`처럼).
- 원본 작품을 통째로 넣지 않습니다. 기준이 되는 1–2개(예: 2D 예제와 다른 방식의 예제)만 넣습니다.
- 큰 바이너리(MP4, 수십 MB 오디오)는 넣지 않습니다.

### 넣지 않는 것

- 특정 프로젝트의 절대 경로(`/home/…`, `C:\…`)와 원본 사이트의 하드코딩 URL. 실제 작품 레포 · 라이브 주소를 **출처로 언급**하는 것만 예외입니다.
- 원본 레포의 비밀값, 개인 정보, 배포 설정.

---

## 2. 다른 레포에서 흡수하기

원본 레포(예: `github.com/jungrok5/<project>`)에서 스킬이나 파이프라인을 가져올 때:

1. **읽기부터.** 원본의 스킬 폴더(있다면), 스크립트, README/DEVELOPMENT 노트, 최근 커밋 메시지를 읽고 무엇이 일반적인 방법이고
   무엇이 그 작품만의 내용인지 나눕니다.
2. **남길 것 / 일반화할 것**

   | 원본에 있는 것 | 여기서는 |
   |---|---|
   | 방법, 규칙, 실패와 해결 | 그대로 남김 (가장 값진 부분) |
   | 원본 경로 (`motion/scenes/…`, `.claude/skills/x/…`) | `<skill>/…` 또는 프로젝트 상대 경로 |
   | 하드코딩된 사이트 URL · 제목 · 언어 목록 | 플래그 · 환경 변수 · 설정 파일 (`--site`, `SITE=`, `film.json`) |
   | 작품 고유 이름 (장면 이름, 주제 이름) | 예시로 남기되 "예시"라고 밝힘, 또는 일반 이름으로 |
   | 원본 전체 작품 | starter/examples엔 최소 1–2개, 나머지는 "실제 작품" 링크로 |

3. **출처 남기기.** 세 곳에 같은 정보를:
   - `SKILL.md` 본문 위쪽 한 줄: 원본 레포 → 경로, 라이브 주소.
   - `docs/skills.json`의 `absorbedFrom` (`{ "repo": "https://github.com/jungrok5/<project>", "path": "<원본 경로>/" }`)과
     `workedExample` (`[{ "title": "…", "url": "…" }]`).
   - 샘플 페이지의 "실제 작품" 섹션.
4. **교훈은 `references/LESSONS.md`로.** 원본에서 겪은 문제와 해결(렌더가 느렸다 → 청크 렌더, 텍스트가 겹쳤다 → 스틸로 확인 등)을
   "문제 → 원인 → 해결" 한두 줄씩. 다음 사람이 같은 실수를 하지 않게 하는 것이 흡수의 목적입니다.
5. **깨끗한 복사본에서 검증.** 스킬 폴더만 빈 디렉터리에 복사해 README의 빠른 시작을 그대로 실행합니다
   (`cp -r <skill> /tmp/try && cd /tmp/try/... && <quick start>`). 원본 레포의 파일을 몰래 읽고 있으면 여기서 드러납니다.
   스틸이나 결과 파일을 직접 열어 봅니다.
6. **원본 레포는 건드리지 않습니다.** 원본의 스크립트, 스킬 폴더, 배포는 요청이 없으면 그대로 둡니다. 원본에서 고칠 점을 찾았다면 보고만 합니다.

---

## 3. 샘플 페이지

사이트(`docs/`, GitHub Pages: https://jungrok5.github.io/motion-skills/)는 허브와 스킬별 샘플 페이지로 되어 있습니다.

```
docs/
  index.html              허브: 머리말 + 스킬 카드 격자 (skills.json에서 그림). 스킬이 늘어도 길어지지 않음
  skills.json             스킬 목록 (레지스트리). 허브 카드의 유일한 원본
  assets/site.css         공통 스타일 (다크/라이트 토큰, 금색 강조, 세리프 제목)
  assets/site.js          공통 동작 (데모 전환, 샘플 필터 칩, 명령 블록 복사 버튼)
  assets/hub.js           카드 렌더 (브라우저 + tools/build-hub.mjs가 같이 씀)
  _template/index.html    스킬 페이지 템플릿
  <skill>/index.html      스킬 페이지
  <skill>/poster.jpg      허브 카드 이미지
  <skill>/demo/           라이브 데모 (starter/examples 사본)
  <skill>/samples/*.jpg   샘플 갤러리 썸네일
```

### 샘플 페이지 만드는 순서

1. `cp -r docs/_template docs/<skill>` 후 `__PLACEHOLDER__`를 모두 채우고, `<meta name="robots" content="noindex">` 줄을 지웁니다.
   섹션 순서와 클래스 이름은 바꾸지 않습니다: 머리말(경로 · 제목 · 한 줄 · 태그) → 작업 흐름 + 라이브 데모 → 샘플 → 실제 작품 → 링크.
2. **라이브 데모**: starter/examples를 `docs/<skill>/demo/`로 복사해 상대 경로로 돌게 하고 `<iframe data-src="demo/…">`로 넣습니다.
   버튼으로 바꿔 보이려면 `button[data-src][data-cap]`. 크기는 `.demo`의 `--ar`, `--h-phone`, `--demo-bg`로.
3. **샘플 갤러리 (모든 스킬에 있어야 함)**: 타일 = 이미지, 제목, 한 줄, 링크. 실제 작품의 페이지로 연결합니다.
   - 12개 정도까지는 `.grid` 한 개. 그보다 많으면 `.group`으로 나누고(제목 + 한 줄), 필터 칩을 붙입니다
     (타일에 `data-tags="key"`, `.chips`의 `data-labels`에 key → 이름). 끝없이 이어지는 페이지는 만들지 않습니다.
   - 썸네일: 640 px 폭 JPEG, 품질 ~80, `docs/<skill>/samples/`. 동영상 페이지라면 영상 중간(예: 길이의 40%) 스틸을 렌더해서 씁니다.
4. **포스터**: `docs/<skill>/poster.jpg`, 약 1200×675, 200 KB 이하. 기존 두 스킬은 대표 장면 4개를 2×2로 붙였습니다.
5. **레지스트리**: `docs/skills.json`에 객체를 추가합니다. 필드는 `id, name, tagline, poster, posterAlt, tags (3–5), stats (2개 정도), page, source, absorbedFrom, workedExample`.
   `posterAlt`는 포스터에 보이는 장면을 그대로 적은 대체 텍스트입니다 (허브에서 첫 화면에 보이는 그림).
   그다음 `node tools/build-hub.mjs`로 허브의 정적 카드(JS 없이도 보이는 부분)를 다시 만듭니다. `--check`는 빠진 필드, 없는 파일, 동기화 여부를 검사합니다.
   허브 `index.html`의 카드 블록은 손으로 고치지 않습니다.
6. **README 표**: 루트 `README.md`의 스킬 표에 한 줄 (폴더 링크 · 만드는 것 · 샘플 페이지 링크).
7. **크기**: `docs/`에 MP4를 넣지 않습니다 (MP4는 원본 레포나 실제 작품 사이트에). 스킬마다 추가하는 이미지는 합쳐서 2 MB 안쪽.
   데모 자산(폰트, 라이브러리)은 데모가 실제로 쓰는 것만.
8. **확인** (다음 절).

### 글

- 샘플 페이지와 허브는 한국어. 코드 · 식별자 · 파일명은 영어 그대로.
- 문장은 합니다체, 목록 · `<dd>` · 타일 캡션은 명사형. 같은 대상은 같은 이름으로 씁니다 (스킬별 페이지 = "샘플 페이지", 갤러리 = "샘플", 브라우저에서 도는 예제 = "라이브 데모").
- 문서는 파일마다 한 언어로 일관되게: `SKILL.md` · `README.md` · `references/`는 영어(기존과 같게), 이 문서처럼 사람에게 안내하는 문서는 한국어도 됩니다.
- 한 줄 소개는 무엇을 만드는지 사실대로. 과장하지 않고, 수치는 실제 작품에서 확인한 것만.

---

## 4. 확인과 커밋

```bash
node tools/build-hub.mjs --check                  # 레지스트리 · 허브 동기화
cd docs && python3 -m http.server 8000            # http://localhost:8000/
```

- 허브와 새 스킬 페이지를 **1280 px과 390 px**, **다크와 라이트**(시스템 설정 또는 `<html data-theme="light">`)에서 봅니다.
  가로 스크롤이 없어야 하고, 콘솔 오류 · 404가 없어야 합니다 (예외: tech-motion-explainer 데모의 폰트 대체 경로 404 두 줄은 의도된 동작).
- 데모가 실제로 재생되는지, 필터 칩과 데모 전환 버튼이 동작하는지 눌러 봅니다.
- 스크린샷을 찍었다면 직접 보고 겹침 · 잘림을 고친 뒤 끝냅니다.

커밋 · PR:
- 브랜치를 만들어 작업합니다 (`add-<skill>`, `site-…`). main에 직접 푸시하지 않습니다 — main에 푸시하면 Pages가 바로 배포됩니다.
- 커밋은 "무엇을 왜"를 한 줄로: `Add <skill> skill (from <project>) with starter, references and samples page`.
- 스킬 폴더 추가와 샘플 페이지는 한 PR에 함께 넣어도 됩니다. PR 설명에 원본 레포, 검증한 명령, 스크린샷을 적습니다.
