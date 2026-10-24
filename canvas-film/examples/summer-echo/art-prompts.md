# 새 원화 제작 기록

도구: 내장 `image_gen` (CLI/API fallback 사용 안 함). 두 이미지 모두 입력 참조 이미지 없이 생성. 기존 Claude 작업과 이전 Codex 작업의 이미지는 참조하거나 재사용하지 않았다. PNG 수정 없이 런타임 UV 샘플링으로 부품을 배치한다.

## character-atlas.png

Transparent background: true.

Use case: illustration-story. Create a professionally painted Japanese theatrical 2D anime character RIG PARTS ATLAS, square 1536x1536, transparent background. Four separate parts, each centered within its own EXACT 768x768 quadrant with generous empty margin; nothing overlaps between quadrants. NO labels, grid lines, text, full composite figure, scenery or shadows on background. A young adult Japanese woman, about 23, refined cinematic anime character design, dark warm brown hair, pale peach skin, ivory sleeveless collared blouse with navy-blue bow at collar and high-waisted muted indigo skirt. Fine hand-inked dark brown contours, beautiful crisp cel shading and subtle warm reflected light. The parts must all belong to the same character and match in scale within their own quadrant, front-facing symmetrical neutral pose, not chibi, elegant adult proportions.

TOP LEFT quadrant: isolated bald head and two ears ONLY, face facing exactly front. Smooth oval skull, narrow graceful jaw and small chin. NO neck, NO hair, NO eyebrows, NO eyes, NO nose, NO mouth; entirely blank smooth face with subtle soft warm peach cheek blush, single cel shadow on side. Head fits about x180..590 y100..650 within quadrant. Blank face is essential, facial features will be animated in code.

TOP RIGHT quadrant: isolated front hair/crown/bangs ONLY, no face, no skin, no neck. Deep chestnut brown hair cap with asymmetrical parted bangs and long delicate side locks reaching jaw, elegant pointed strands. The silhouette corresponds perfectly to the head in top-left, cap top at quadrant y80, hair sides to y650, face area transparent. Beautiful thin amber highlights, cel shaded.

BOTTOM LEFT quadrant: isolated woman's upper BODY from neck through hips, NO HEAD, NO HAIR, NO ARMS. Neck at top, shoulder stubs cut clean at sleeveless shoulder openings so articulated arms can be added. Sleeveless ivory collared blouse with dark navy bow, graceful natural slim torso, subtle cloth folds, waist gathered into indigo skirt, hip hem cut straight at bottom. Front-facing, body from local x170..600 y60..740. No hands or skin below shoulder sockets. No detached loose objects.

BOTTOM RIGHT quadrant: isolated BACK HAIR mass ONLY, NO head/face/body. Shoulder-length slightly wavy chestnut hair, crown rounded and opaque, lower ends separated tapered tips, lovely warm highlights. Front view of back hair behind head, roughly local x140..630 y80..720. Hair covers behind skull, below chin and shoulders, will be composited BEHIND head and body. Keep transparent background throughout all other areas. These are reusable 2D animation puppet parts, clean anti-aliased edges, polished production art.

실제 반환 크기: 1254×1254. 요청 좌표와 실제 결과가 달라, 실제 원화에 맞춰 `rig.js`의 소스 사각형을 별도로 지정했다.

## crossing-background.png

Transparent background: false.

Use case illustration-story. Original hand-painted background for a wistful Japanese theatrical anime short film. Wide landscape 16:9, 2048x1152. A small sunlit rural Japanese railway crossing near the sea in midsummer, viewed straight across the track at street level, low horizon at 60% image height. Long silver railway tracks cross horizontally through the lower third, weathered asphalt foreground with sunlit white stop line, tangled small grasses along track edge. On the opposite side, a quiet narrow lane leads towards a distant brilliant turquoise sea, pastel low-rise houses with tiled roofs, lush green trees, utility poles and fine power cables. Magnificent huge luminous white cumulus clouds rising in deep cerulean blue sky occupying upper 60%, pale cyan at horizon. Strong afternoon light, hot sun, cool navy violet shadows, little glints of sea, exquisite atmospheric perspective, painterly watercolor-gouache brushwork with fine naturalistic detail. Compose the central and right foreground as clear space for an animated character and animated train to be added. Empty scene: NO people, NO trains, NO cars, NO animals, NO text, NO logos, NO traffic lights, NO crossing signal poles or crossing gate arms (those will be drawn and animated separately). Do not include large dark objects on the edges. Distinct distant mountains on left. Rich beautiful cinema background painting with delicate irregular handmade textures; absolutely not 3D or photographic.

실제 반환 크기: 1672×941.

## 글꼴 출처

- https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400&display=swap
- https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400&display=swap
- https://github.com/google/fonts/tree/main/ofl/notosanskr
- https://github.com/google/fonts/tree/main/ofl/notoserifkr

글꼴은 외부 네트워크 호출 없이 실행되도록 HTML에 내장한다.
