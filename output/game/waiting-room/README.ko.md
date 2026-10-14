# My little room · Little Daylight

2026-10-04. `docs/SOULI-WAITING-ROOM-BRIEF.ko.md`에 따른 **개인 대기방의 독립 로컬 구현**이다. 큰 미니어처 마을과 다섯 주민은 기존 `output/game/room-v2/miniature.html`에 그대로 있다. 이 방은 원본 inscription 하나를 선택해서 쉬는 모습을 보는 별도 화면이다. 실제 지갑 연결·구매 완료 화면·공개 사이트에는 아직 통합하지 않았다.

## 열기

이 폴더에서 실행한다. 루트 package/lockfile은 변경하지 않는다.

```powershell
npm.cmd ci
npm.cmd start
```

- 기본 프리뷰: <http://127.0.0.1:4320/>
- WebGL 없는 경우와 같은 2D 표시: <http://127.0.0.1:4320/?render=2d>
- 기존 큰 마을: <http://127.0.0.1:4318/miniature.html> (기존 서버가 별도로 필요)

로컬 서버는 `127.0.0.1`에만 바인딩한다. 포트 변경은 `WAITING_ROOM_PORT`. CDN·생성 API·지갑 RPC를 호출하지 않는다. `Preview controls`는 샘플과 화면 상태를 검토하는 개발 도구이며 실제 제품 모듈에는 들어 있지 않다.

## 구현

- 밝은 미니어처 방, 큰 창, 커튼, 낮은 나무 탁자와 머그, 파란 쿠션, 금색 스탠드. 절차적 메시와 바닥 텍스처로 구성.
- 클릭 없이 쉬기 → 창가 방문 → 쿠션에 기대기. 90초 주기, 약 26/50/78초에 행동 변화. 탭이 숨겨지거나 `pause()`하면 생활 시간도 멈추며 복귀 때 부재 시간을 누적 계산하지 않는다.
- `Closer`, `View original`, `Still`, `Take a photo`. 원본 보기는 배경을 포함한 SVG 전체를 이미지로 표시한다. `Still` 또는 OS reduced-motion이면 정지 자세를 보여 준다.
- 고정 각도의 직교 카메라. 모바일은 방 전체를 축소하는 대신 주요 부분을 보여 주고 이동하는 소울을 수평으로 완만하게 따라간다. 가까이 보기에서는 소울 중심으로 확대한다.
- 원본 SVG 그리기 순서를 해석한 앞면 도트와 색을 유지한다. 원본 렌더러의 알려진 배경만 분리하고 연결된 픽셀 윤곽에 두께를 준다. 뒷면은 연결 영역의 주색이며 얼굴·팔다리를 새로 만들지 않는다.
- 안전한 벡터 SVG처럼 입체화 대상이 아닌 그림, 모델 생성 실패는 원본 2D 평면으로 표시. WebGL 사용 불가나 context loss는 단순한 2D 방으로 전환하며 원본과 사진 저장을 유지한다.
- 사진은 PNG Blob / 다운로드. 작은 SOULI 브랜딩 및 Sample/Fixture 표시를 포함하며 주소·잔액은 입력 상태에서부터 제외한다. SNS 자동 게시, Web Share, 온라인 앨범은 없다.

## 홈페이지 통합 API

`waiting-room.mjs`와 `waiting-room.css`를 제품 번들에 가져온다. 상대 모듈 `engine.mjs`, `daylight.mjs`, `artwork.mjs`, `behavior.mjs`, `soul-volume.mjs`도 필요하다. Three.js **0.186.1** 및 `three/addons/geometries/RoundedBoxGeometry.js` 의존성을 웹 담당이 번들에서 해결한다. 현재 HTML import map과 `node_modules` 정적 서빙은 로컬 프리뷰용이다. `output` URL을 production src로 연결하지 않는다.

```js
import {createWaitingRoom} from './waiting-room.mjs';
import './waiting-room.css';

const room = createWaitingRoom(container, {
  initialState: {status: 'disconnected'},
  onChange: screenState => { /* 주소 없는 렌더 상태 */ },
  onError: error => { /* 필요하면 개발 로깅 */ },
});
await room.ready;

// 샘플을 선택하는 것은 외부 화면의 명시적 결정이다.
await room.setSoul({svg: publicSVG, level: 1, source: 'sample'});

// 지갑 주소/네트워크가 바뀌면 먼저 이전 그림을 지운다.
await room.setState({status: 'loading'});
// readOwnedSouls는 홈페이지 담당이 호출한다.
await room.setState({
  status: 'owned', souls: result.souls,
  selectedIndex: 0, total: result.total,
});

await room.selectSoul(1);
const photo = await room.capture(); // PNG Blob, 기본 1440×1000
const original = room.getOriginalBlob(); // 검증된 원본 SVG Blob
room.pause();
room.resume();
room.setStill(true);
room.setClose(true);
await room.clear(); // disconnected, 즉시 이전 모델/원본 폐기
room.dispose(); // 화면을 제거할 때 반드시 호출. 중복 호출 가능.
```

위 `result`가 빈 배열이면 `empty`, 조회 실패는 `error`, 지갑 연결 해제는 `disconnected`를 주입한다. 모듈은 실패 때 임의의 샘플로 바꾸지 않는다. **RPC 결과의 지갑/네트워크 일치와 요청 순서 검사는 홈페이지 담당의 책임**이다. 렌더러의 generation 검사는 내부 이미지 decode/capture가 늦게 끝나 이전 그림을 복원하는 것을 막는다. 외부에서 오래된 RPC 결과를 새 요청으로 주입하면 그 데이터의 소유권까지 판별할 수는 없다.

| API / 입력 | 동작 |
|---|---|
| `setState({status:'sample', soul})` | Sample soul 표시. 사진에도 SAMPLE SOUL |
| `setState({status:'owned', souls, selectedIndex?, total?, isFixture?})` | 1–8개 입력, 현재 1개 표시. 2개 이상이면 선택 메뉴 |
| `setState({status:'disconnected'\|'loading'\|'empty'\|'error'})` | 모델·원본·선택 목록 즉시 제거, 사진 비활성화 |
| `setSoul(soul, {status?, isFixture?})` | 단일 입력 편의 API. 기본은 안전하게 `sample`; 실제 보유 원본은 `status:'owned'` 명시 |
| soul | `{svg, level?, seed?, extra?, dynamic?, source?, name?}`. reader의 `owner, balance, block`은 화면 상태에 복사하지 않음 |
| `selectSoul(index)` | 현재 입력 목록에서 선택. 전체 소유 목록 조회/페이지 이동은 외부가 담당 |
| `capture({width?, height?})` | 각 변 320–2048 정수, PNG Blob. 선택 변경/dispose 중이면 AbortError |
| `getState()` | status, source label, selectedIndex/count/total, fixture 여부, render mode, motion 상태. SVG/주소 없음 |
| `getDiagnostics()` | 추가로 activeSeconds/behavior, 화면 크기, 원본 frontPixels, 리소스 수, draw calls. 개발 검증용 |
| `dispose()` | RAF/이벤트/ResizeObserver/다운로드 URL 정리, 모델·재질·텍스처 해제, WebGL 컨텍스트 종료, DOM 제거 |

`setState`/`setSoul`는 Promise다. 잘못된 그림/상태는 `{status:'error'}`로 정리하고 `onError`에 원인을 전달한다. 다른 전환으로 밀려난 decode는 `{superseded:true}`를 반환한다. dispose 뒤 신규 state 주입은 오류다. `capture` 실패는 reject한다. OS reduced-motion은 `setStill(false)`로 우회하지 않는다.

프리뷰 fixture는 실제 reader와 같은 `{svg,seed,extra,level,block,dynamic,owner,source:'wallet'}` 구조이지만 공개 샘플이다. `isFixture:true`를 반드시 함께 주입하며 화면·사진에 `Wallet fixture · Preview only`가 표시된다. 구매마다 별도 소울이 생긴다고 가정하지 않는다. 실제 Dynamic/Stable 목록을 받아 선택한다.

SVG는 256KiB, 최대 4096개 자식 요소. DOMParser로 허용된 태그·속성·색·숫자와 viewBox를 검사한다. script, 이벤트 속성, 외부 이미지/참조, 스타일, DTD 등을 거부한다. 안전하지만 입체화할 수 없는 허용 도형은 원본 2D를 쓴다. 허용 형식 밖의 임의 SVG를 무조건 표시하지 않는다. 사용자 SVG를 innerHTML에 넣지 않으며 디코드용 Blob URL도 즉시 해제한다.

## 검증과 성능

```powershell
npm.cmd test
node verify.cjs
node verify-life.cjs
```

브라우저 검증에는 Playwright와 Chrome이 필요하다. 현재 검증 스크립트는 Codex 번들 Playwright 경로를 기본으로 쓰며 다른 설치는 `PLAYWRIGHT_MODULE` 환경변수로 절대 모듈 경로를 지정한다. 로컬 서버 실행 후 검증한다.

- 순수 규칙 테스트 5개: 자동 행동·연속 이동, 정지, 상태 삭제, 개인정보 제외, 목록 검증, 덮어 그린/분리된 픽셀 입체화.
- `verification.json`: 원본 7종의 앞면 도트 좌표·색, dot/밝은/어두운/큰 원본, 여러 fixture 선택, 모든 비표시 상태 전환, decode 경합, 위험 마크업 거부, 외부 요청 없음, 원본 보기, 실제 PNG 다운로드.
- 320/390/1440px 가로 넘침·버튼·dot 크기, 모바일 세 행동 위치의 화면 내 배치. 데스크톱 브라우저 뷰포트 검사이며 실기기 테스트는 아니다.
- 20번 모델/2D 교체 후 같은 원본의 geometry/texture/program 수 일치. 생성/dispose 3회는 DOM canvas 제거·geometry 0·WebGL 컨텍스트 종료 확인. Three 내부 그림자 캐시의 마지막 texture/program 카운터가 각 1 남을 수 있으나 강제 종료한 컨텍스트는 `isContextLost() === true`이며 폐기한 엔진 참조도 제거한다. 이 카운터를 사용 중인 GPU 자원으로 오해하지 않는다.
- Still, OS reduced-motion, 숨김 이벤트 때 프레임·생활 시간 정지. 숨김 검사는 `document.hidden`을 주입한 이벤트 테스트이며 실제 모바일 백그라운드 정책 검증과는 다르다.
- WebGL 생성 불가/모델 생성 오류를 주입하여 실제 fallback 경로와 PNG를 확인. `life-verification.json`은 자동 행동 세 종류를 실제 경과 시간으로 관찰하고 context loss 복구·오래된 사진 취소를 기록한다.
- 목표 렌더링 상한 30fps, DPR 상한 1.5, 1024px 정적 그림자 한 장. 기본 샘플 정지 장면은 **69 draw calls / 13,389 triangles**. 헤드리스 ANGLE/SwiftShader 검증이므로 실제 휴대폰에서 30fps가 나온다고 주장하지 않는다. 탭 부재·저장·게임 보상 서버는 없다.

주요 스크린샷: `daylight-desktop.png`, `daylight-mobile.png`, `daylight-dot-320.png`, `daylight-white.png`, `daylight-no-webgl.png`, `daylight-sample-photo.png`. 생활 장면은 `daylight-life-rest.png`, `daylight-life-window.png`, `daylight-life-cushion.png`.

## 파일과 재사용

| 파일 | 역할 |
|---|---|
| `waiting-room.mjs` / `.css` | 독립 UI, 상태 전환, 수명 관리, 원본 보기, PNG 저장 |
| `engine.mjs` | 3D/2D 렌더러, 카메라, 원본 입체 모델 교체, fallback |
| `daylight.mjs` | 방과 소품 모델, 작은 환경 움직임, 리소스 정리 |
| `behavior.mjs` | 90초 생활 주기와 상태/출처 라벨 |
| `artwork.mjs` | SVG 검증, 알려진 배경 분리, 이미지 decode |
| `soul-volume.mjs` | room-v2의 결정적 입체 생성기 복사. 생성 실패 때 부분 자원 정리 보강 |
| `soul-samples.json` | 기존 room-v2 공개 샘플 7종. SDK에는 하드코딩하지 않음 |
| `index.html`, `preview.mjs`, `fixtures.mjs`, `serve.mjs` | 독립 개발 프리뷰와 fixture, 로컬 서버 |
| `test-rules.mjs`, `verify.cjs`, `verify-life.cjs` | 순수 로직/브라우저/실시간 생활 검증 |

가구는 기존 `room-v2/model.mjs`의 둥근 상자·회전형 메시 제작 방식을 참고해 새로 구성했다. 기존 room-v2, 공용 지갑·구매·계약·홈페이지·HANDOFF, 루트 의존성은 이 작업에서 변경하지 않았다.

## 후속 테마와 남은 작업

| 테마 | 같은 방에서 바꿀 부분 | 행동 연결 | 현재 |
|---|---|---|---|
| Little Daylight | 크림빛 방, 큰 창, 나무 탁자, 파란 쿠션, 금색 스탠드 | 쉬기·창가·쿠션 | 구현 |
| Rainy Window | 창밖 비 레이어·회청색 하늘·따뜻한 스탠드, 머그 강조 | 창 구경 후 머그 옆 휴식 | 설계 후보, 미구현 |
| Tiny Workshop | 탁자를 작업 책상으로 교체, 작은 돌·종이 추가 | 돌 놓기·관찰·종이에 작은 흔적 | 설계 후보, 미구현 |

후속 변형은 `createDaylight`의 같은 바닥/벽/창과 카메라를 재사용하고 소품 그룹·행동 경유점을 바꾸는 방식으로 확장한다. 원본 소울 처리와 소유권 상태 API는 유지한다. 방 잠금·과금·출석 압박은 도입하지 않았다.

남은 통합: 홈페이지에서 reader 요청 경쟁/네트워크 변경을 검증하고 소유 원본을 주입, 구매 완료/My SOULI에 연결, 번들·CSP·실기기/Web Share 검토, 공개 배포. **방의 로컬 검증 완료와 실제 구매자 연결/공개 출시 완료는 다르다.**
