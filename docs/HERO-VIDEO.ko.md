# SOULI 메인 영상 제작 제안

2026-10-02 · 기획안 · 영상 생성/업로드/크레딧 사용/배포는 아직 하지 않음

사용자는 브라우저에 열린 Google Flow의 Omni 1.1로 원본 SOULI 캐릭터와 세계를 소개하는 영상을 검토해 달라고 요청했다. 현재 공식 문서상 모델명은 **Gemini Omni Flash 1.1**이며 4/6/8/10초, 가로/세로, 시작·끝 프레임과 참조 이미지 입력을 지원한다. 360p 초안/720p 작업 흐름을 사용할 수 있다. 계정의 실제 모델·지역·크레딧과 제작 조건은 생성 직전에 확인한다. [Google 공식 기능표](https://support.google.com/flow/answer/16352836?hl=en), [Omni 1.1 제작 안내](https://blog.google/innovation-and-ai/models-and-research/google-labs/new-creative-controls-google-flow/)

## 권장 첫 결과물

홈 첫 화면 오른쪽 세계 영역에 들어갈 **10초 무음 루프 1개**부터 만든다. 목적은 “토큰 원본이 조용히 살아가는 세계”를 빠르게 이해시키는 것이다. 경제 설명/복잡한 계약 구조/높은 FDV를 영상에 모두 넣지 않는다. 현재 게임의 실제 원본·배경 구성을 참고하고 미구현 전투/실시간 멀티플레이를 이미 가능한 플레이처럼 촬영하지 않는다. 게임 화면과 다른 시네마틱이면 분명히 소개용 연출로 구분한다.

| 시간 | 장면 | 전달할 느낌 |
|---|---|---|
| 0–2초 | 원본 dot와 작은 주민이 숲 위에서 살짝 떠 있음 | 처음부터 함께할 수 있는 작은 존재 |
| 2–5초 | 코발트 하늘에 부드러운 비, 수정 동굴에서 금빛이 비침 | ETH 시장 날씨를 닮은 살아 있는 세계 |
| 5–8초 | 원본 주민들이 동굴/작은 마을 주변에서 빛을 모으고 등대/가로등이 밝아짐 | 자동 생활과 마을의 변화 |
| 8–10초 | 비가 잦아들고 처음 구도로 부드럽게 돌아감 | 편안한 반복, 다시 방문하고 싶은 공간 |

주민들의 이동은 공개 원본을 이용한 소개 연출이며 현재 접속 중인 실제 타인이라고 표시하지 않는다. 화면 카피는 영상에 굽지 않고 HTML로 올린다. 후보는 `A little soul. A living world.` / `Your tokens. Your little world.`다. 가격 상승, 감사 완료, LP 잠금 완료 배지나 실현되지 않은 수익 숫자는 넣지 않는다. LP 신뢰는 별도 실제 계약/거래 영수증 영역이 담당한다.

## 원본을 지키는 제작 방식

권장 방식은 **Flow 배경/날씨 + 실제 SOULI 원본 전경 합성**이다. 원본 24×24 픽셀·눈·색·형태는 다시 그리지 않는다. dot도 확대와 약한 주변 빛으로 시인성을 확보한다. Flow에 캐릭터까지 통째로 생성시키는 버전은 모델이 프레임마다 픽셀/표정을 바꿀 수 있어 원본 재현으로 단정하지 않는다.

- 원본 참조는 저장소의 실제 on-chain 샘플과 기존 금색/파랑 브랜드 자산에서 만든다. 예시 캐릭터이며 특정 구매 결과라는 인상을 주지 않는다.
- 배경은 하늘·지상·뿌리·수정·심연을 한꺼번에 과밀하게 보여주지 않고 첫 루프에서는 숲/수정/마을의 연결에 집중한다.
- 전경은 동일 원본을 위치·상하 부유·가벼운 기울기만 애니메이션한다. 효과 레이어를 분리할 때 원본 픽셀을 가리거나 변경하지 않는다.
- 영상 시작/끝 구도를 맞추고 최종 합성에서 루프 이음새를 확인한다. 차후 15~30초 소개 영상은 여러 클립을 편집해 만들며 첫 화면 필수 다운로드로 넣지 않는다.

## Flow 배경용 영어 프롬프트 초안

```text
Create a 10-second seamless-loop background for SOULI, a quiet 2D pixel-art world.
Landscape 16:9, locked side-view camera, crisp deliberate pixel shapes.
Use the supplied SOULI world reference for composition and palette: clear cobalt
blue sky, warm golden lanterns, lavender crystal light and calm mint greenery.
Show a small grove, a crystal cave entrance and a cozy village lighthouse in
one readable scene. Gentle rain drifts in, crystal light softly pulses, and warm
village lamps glow. Return smoothly to the opening composition.
Keep the center foreground uncluttered for separately composited original
24-by-24 SOULI inscriptions. Do not generate characters, change the reference
artwork, add words, logos, token prices, UI, photorealism or rapid camera motion.
No flashing, no dramatic combat, no voiceover, no soundtrack.
```

실제 생성 결과가 아닌 제작 지시 초안이다. 생성 결과의 원본 일치·루프·화면 밀도는 눈으로 확인한다.

## 배포와 확인

- 데스크톱은 720p부터 시작하고 WebM/MP4와 정지 poster를 준비한다. 10초에 2–3MB 정도를 목표로 실측 후 조정하며, 홈 첫 화면에서 4K를 내려받지 않게 한다.
- 제목/버튼/원본 설명은 영상 없이도 읽히는 HTML로 둔다. poster를 먼저 표시하고 영상 다운로드가 페이지를 막지 않도록 한다.
- `muted`/`playsinline`을 사용하고 정지 버튼을 제공한다. `prefers-reduced-motion`, 데이터 절약, 자동 재생 불가 환경에서는 정지 이미지로 내용을 전달한다.
- 화면 밖이나 숨겨진 탭에서는 재생을 멈춘다. 모바일에서는 별도의 가벼운 영상 또는 poster를 우선한다.
- 정적 파일이므로 영상 재생을 위한 상시 서버는 필요 없다. 다만 3MB × 10만 회는 단순 계산으로 약 300GB 전송량이다. 캐시·로딩 조건·실제 Azure 요금제 한도를 확인한다.
- 원본 픽셀·눈·색 일치, dot 시인성, 루프 경계, 끊김, 카피 가독성, 모바일 표시, 정지 조작, 파일 크기와 페이지 표시 속도를 검증한다.

제작 순서는 360p 구도 후보 최대 2개 → 1개 선택 → 720p 생성 → 원본 합성 → 압축/사이트 확인이다. 유료 요금제 신규 가입이나 대량 생성은 이 제안에 포함하지 않는다.
