# SOULI — 다른 컴퓨터에서 이어가기

인수인계 기준일: 2026-09-30. 이 문서는 기존 대화를 읽지 않은 개발자/에이전트를 위한 저장소 문서다. 사용자의 이후 지시가 이 문서보다 우선한다.

## 1. 어디서 작업하는가

- 웹: https://github.com/yongchoi422/poopi_frontend — 기본 브랜치 `master`.
- 게임과 새 홈페이지는 [PR #1](https://github.com/yongchoi422/poopi_frontend/pull/1)에서 병합 완료. 구현 기준 커밋: `df91159761c91f296051bc4cf4edf94660c85996`.
- 원본 컨트랙트·SVG 자료: https://github.com/yongchoi422/erc-20i-souli-smart-contract — 아트/계약 조사 시에만 추가 클론하면 된다. 웹 실행에는 필요하지 않다.
- 공식 서비스 목표 주소는 `https://souli.net/`. 별도 Sites 미리보기를 공식 배포 경로로 삼지 않는다.
- 사용자 최종 결정: **자동 배포는 만들지 않는다. Google 쪽에서 배포할 수 있을 때 기존 서비스에 수동 배포한다.** 지금 인수인계의 목적은 새 컴퓨터에서 개발을 재개하는 것이다.
- 2026-09-17 마지막 운영 확인 시 souli.net은 기존 화면을 Google 인프라에서 제공했다. Google 프로젝트·서비스·리전은 미확인이다. Cloud Run이라고 단정하거나 현재 운영 상태를 그날 기록으로 확정하지 않는다. GitHub 반영과 실제 사이트 배포는 별개다.

## 2. 새 컴퓨터 준비와 실행

Git과 Node.js/npm이 필요하다. 인수인계 확인 컴퓨터의 런타임은 Node `v24.16.0`, npm `11.13.0`이다. 오래된 Dockerfile의 Node 16을 새 로컬 개발 환경의 기준으로 삼지 않는다.

원하는 작업 폴더에서:

```sh
git clone https://github.com/yongchoi422/poopi_frontend.git
cd poopi_frontend
npm ci --no-audit --no-fund
npm run dev -- --host 127.0.0.1
```

Windows PowerShell에서 `npm.ps1` 실행 정책 오류가 나면 위의 `npm`을 `npm.cmd`로 바꾼다. 개발 서버 터미널을 켜 둔 채 표시된 주소를 연다. 기본 포트가 비어 있으면:

- 홈: http://127.0.0.1:5173/
- 게임: http://127.0.0.1:5173/lighthouse.html
- 기존 수집 UI: http://127.0.0.1:5173/legacy.html — 개발 전용이며 현재 production 빌드에는 없다.

기본 홈/게임 미리보기 실행에는 `.env`, 개인키, 별도 API 키가 필요하지 않다. 지갑 주소의 SVG를 실시간으로 조회할 때는 인터넷과 공개 Base RPC 응답이 필요하다. 지갑 연결 없이도 공개 SVG로 플레이할 수 있다.

컨트랙트 자료가 필요하면 웹 폴더의 상위 폴더에서:

```sh
git clone https://github.com/yongchoi422/erc-20i-souli-smart-contract.git
```

컨트랙트 저장소 클론은 배포나 토큰 재발행 지시가 아니다.

## 3. 사용자가 원하는 제품

- 실제 SOULI ERC20i 보유 지갑에서 생성되는 **원본 SVG**가 주인공이다. 별도 가상 캐릭터로 대체하지 않는다.
- 배경·메뉴·게임 화면까지 일관된 2D 도트 스타일. 현재 크림색 UI, 숲색 테두리, 금색 버튼과 로컬 픽셀 글꼴을 사용한다.
- 초기에는 워크래프트 타워 디펜스/위에서 보는 마을을 논의했고, 현재는 **옆에서 보는 거대한 다섯 층 세계**로 발전했다. Terraria에서 받은 탐험 감각을 참고하되 그 게임의 에셋을 복제하는 작업이 아니다.
- 하늘 → 지상 집/등대 → 뿌리 → 수정 동굴 → 용암 심연. 실제 SVG 영혼들이 돌아다니고 쉬고 탐험한다.
- 어렵고 복잡한 조작보다 느리고 단순한 방치형. `Start chilling` 한 번으로 흐름이 이어지고, 복잡한 설정은 접힌 메뉴 안으로.
- 화면이 어지럽지 않고 게임 세계가 크게 보이게 한다. 필요 이상의 카드·숫자·조작 버튼을 늘리지 않는다.
- 사이트와 게임 문구는 **영어 전용**. GM, fren, HODL, diamond hands, touch grass 같은 가벼운 코인 문화 유머를 쓴다. 사용자와 대화·인수인계는 한국어여도 된다.
- 장기 목표는 1 SOULI만 가진 사람도 공동 세계에 기여하는 느낌, 여러 사람이 같은 세계를 바라보는 경험이다. 10만 개 캐릭터를 DOM에 모두 그리기보다는 구역·집계·근처 상세 표시를 고려한다.
- 시장 상승은 위쪽 탐험, 하락은 아래쪽 방어/돌봄으로 표현하는 아이디어다. 아직 실제 가격 데이터는 붙어 있지 않다.

## 4. 현재 되는 것과 아직 없는 것

| 기능 | 실제 상태 |
| --- | --- |
| 영어 도트 홈페이지 | 구현됨. SVG 갤러리, 지역 미리보기, 출시 계획, FAQ |
| 다섯 층 옆면 세계 | 구현됨. 이동·확대/축소·전체 보기·날씨 예시 |
| SVG | 원본 on-chain 공개 샘플 6개. Base 주소로 현재 SVG 읽기 가능 |
| 방치 흐름 | 탐험/회복/방어 순환, 게임 기억 점수, 최대 2시간 로컬 복귀 계산 |
| 지갑 연결 | injected browser wallet의 계정 및 잔액 읽기. 기본 접속 시 자동 팝업 없음 |
| 공동 플레이/10만 명 | 시뮬레이션. 공유 서버·계정별 영속 저장·실시간 동기화 없음 |
| 시장 날씨 | 시뮬레이션. 실시간 가격·예측 모델 없음 |
| Buy/Get SOULI | 제안 고정가 견적. 실제 판매 버튼/송금 미연결 |
| 목표 모금 후 LP | 별도 예시 시뮬레이터. escrow·환불·LP vault·keeper 미구현 |
| 서버 인증 | 없음. 공개 주소 조회는 지갑 소유 증명이 아님 |
| 토큰 보상 | 없음. 게임의 memories는 게임 점수 |

현재 게임 연결에는 결제·지출 승인·서명 코드를 추가하지 않았다. 새 판매 계약도 배포하지 않았다. 원래 수집 앱의 지갑 코드와 새 게임의 읽기 전용 연결은 구분해서 본다.

진행은 브라우저 `localStorage`의 `souli-idle-v2`에 저장된다. 새 컴퓨터로 clone해도 진행 기록과 지갑 연결 상태는 이동하지 않는다. `localhost`, `127.0.0.1`, 각 배포 도메인도 저장소가 서로 다르다. 새 컴퓨터에서는 새 로컬 게임으로 시작한다.

## 5. 코드 길잡이

| 경로 | 역할 |
| --- | --- |
| `src/site/SouliHome.vue`, `site.css` | 현재 홈페이지·반응형 스타일 |
| `src/lighthouse/main.js`, `IdleLighthouse.vue` | 게임 진입점·전체 UI·모달·저장 연결 |
| `PixelSoulWorld.vue`, `SoulWorldView.vue`, `world.mjs`, `world.css` | 다섯 층 SVG 세계·카메라·주민 연출 |
| `engine.mjs`, `idle.mjs` | 역할·탐험/방어 결과·방치 순환·복귀 계산 |
| `soul-art.js`, `public-souls.json` | 원본 공개 SVG·무대용 표시 가공 |
| `souli.js` | Base에서 inscription/SVG 읽기 |
| `wallet-session.mjs`, `WalletAccess.vue` | 공유 읽기 전용 지갑 세션 |
| `purchase.mjs`, `BuySouli.vue` | USDC 견적·잔액 조회·판매 미연결 상태 |
| `launch.mjs`, `LaunchPreview.vue` | 목표 모금/개설/환불의 예시 흐름 |
| `community.mjs`, `CommunityLights.vue` | +1 기여·공동 규모 예시 |
| `pixel-ui.css` | 게임·모달의 통일된 도트 UI |
| `PixelVillage.vue`, `IdleVillageView.vue` | 이전 위에서 보는 마을. Explore에서 접근 |
| `src/App.vue`, `src/main.js`, `src/services/` | 원래 수집 앱 소스 |
| `vite.config.js` | production entry는 `index.html`, `lighthouse.html` 두 개 |

`lighthouse.html`은 `?region=sky|home|roots|crystal|abyss`, `?soul=0..5`, `?panel=souls|launch` 진입 링크를 지원한다. 구매 시뮬레이터를 실제 판매 페이지로 오해하게 만들지 않는다.

## 6. 토큰·출시 논의의 결정과 미결정

이 절은 이전 대화와 코드의 제안 값을 인수인계하는 것이며 새로운 판매 조건이나 현재 시장 데이터가 아니다.

- 체인: Base, chain ID `8453` (`0x2105`).
- SOULI: `0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF`, 코드 기준 총공급량 210,000,000 / decimals 9.
- Base USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, decimals 6.
- 현재 읽기 RPC: `https://base-rpc.publicnode.com`.
- 사용자가 선택한 출시 원칙: $15M FDV, 판매 대금 100% LP, 팀 보상은 공개된 장기 보유 토큰, 소규모 출시 뒤 미판매분 장기 잠금.
- UI의 제안 견적은 1 USDC = 14 SOULI. 이는 USD와 USDC를 1:1로 가정한 고정가 예시이며 실시간 시세가 아니다.
- $50k / $100k / $150k는 비교용 모금 목표다. **최종 목표, 판매 기간, 확정 팀 수량, 잠금 조건은 미확정**이다. 이전 추천치를 사용자 승인으로 간주하지 않는다.
- 예를 들어 $50k 목표라면 구매자 700,000 SOULI와 LP용 별도 700,000 SOULI가 필요하다. 판매금을 전부 LP로 쓰면 그 판매금에서 운영비를 꺼내는 구조가 아니다.
- `PURCHASE.saleContract`는 `null`. Uniswap API 연결만으로 escrow·자동 풀 개설·잠금·환불이 완성되지 않는다. 임계액 도달 후 계약의 finalization 호출을 누가 실행할지도 설계해야 한다.
- ERC20i는 일반 ERC20 잔액뿐 아니라 SVG/seed 전송 동작이 있다. 실제 풀·escrow·claim 경로의 호환성은 fork 테스트로 확인해야 한다. 클론한 Solidity와 배포 바이트코드의 일치도 별도 확인 사항이다.
- 이미 배포된 토큰을 유지한 개발이 현재 기준이다. 과거 배분 조사만으로 새 토큰 재발행·기존 자산 이동을 시작하지 않는다.

## 7. 검증과 알려진 제한

```sh
npm run build
node scripts/test-lighthouse.mjs
node scripts/test-idle.mjs
node scripts/test-purchase.mjs
node scripts/test-wallet-session.mjs
```

2026-09-30에 GitHub `master`를 별도 새 폴더로 clone하여 Node `v24.16.0` / npm `11.13.0`에서 `npm ci --no-audit --no-fund`, production build, 위 테스트 4개를 모두 통과했다. 기존 컴퓨터의 `node_modules`나 미추적 파일에 의존하지 않는 것을 확인했다.

빌드 결과는 `dist/`. 브라우저 QA에는 홈→선택 지역/캐릭터 이동, My Souls의 공개 주소 조회, Launch의 미연결 표시, 닫기/키보드, 작은 화면 넘침, 콘솔 오류를 포함한다. 2026-09-17 구현 당시 desktop/390px/360px 및 실제 공개 Base SVG 조회를 확인했다. 실제 거래나 실제 지갑 확장 서명 테스트 기록은 없다.

게임 Web3 번들이 커서 Vite 경고가 남는다. 의존성에 deprecated 경고도 있다. 인수인계 과정에서 `npm audit fix --force`나 전면 버전 업그레이드로 동작을 바꾸지 않는다. 필요하면 별도 작업으로 다룬다.

기존 Dockerfile은 Node 16 + `serve`로 port 8080에서 `dist`를 제공한다. 실제 Google 환경에서 새 빌드를 검증한 것은 아니다. 운영 배포를 다시 요청받으면 기존 서비스 설정·롤백 방법을 확인하고 수동 배포한다. GitHub Actions나 별도 Sites 배포를 자동으로 추가하지 않는다.

## 8. 다음 작업을 시작하는 순서

1. 이 문서와 `SITE-RELEASE.md`, 실제 소스를 읽고 `git status`로 사용자 변경을 확인한다.
2. lockfile로 설치하고 빌드·기존 테스트를 실행한 뒤 로컬 홈/게임을 연다.
3. 화면을 직접 보고 현재 구현/시뮬레이션 경계를 파악한다. 초기 위에서 보는 타워 디펜스로 돌아가 처음부터 다시 만들지 않는다.
4. 후속 기능이 지정되지 않았다면 실행·현황 보고까지 마친 뒤 사용자에게 다음 우선순위를 확인한다. 게임 다듬기, 서버 공동 세계, 판매 계약은 서로 별도 작업이다.
5. 이미 있는 실제 SVG와 단순한 영어 도트 UI를 보존하며 요청받은 기능부터 이어간다.

이 Git 저장소만으로 웹/게임 개발은 재개할 수 있다. 이전 대화 전문, 로컬 금융 조사 문서·개인 지갑 분류·미추적 감사 스크립트, 지갑 연결 권한, Google 로그인, API 자격증명, 브라우저 게임 저장은 Git으로 전달되지 않는다. 금융 조사까지 이어갈 때는 관련 비공개 자료를 별도로 전달받고, 누락된 근거를 추정해서 채우지 않는다.

## 9. 새 대화에 붙여 넣을 프롬프트

```text
SOULI 웹/게임 작업을 다른 컴퓨터에서 이어가려 한다.
원본 저장소는 https://github.com/yongchoi422/poopi_frontend 이고 기본 브랜치는 master다.
아직 없으면 클론하고, 이미 있으면 사용자 변경을 보존하면서 상태부터 확인해줘.
HANDOFF.ko.md와 SITE-RELEASE.md를 먼저 읽고, 실제 소스와 함께 기존 작업을 인수인계해줘.

실제 SOULI ERC20i 원본 SVG가 주민이 되는 2D 도트 방치형 세계다.
현재 영어 도트 홈페이지와 하늘/지상/뿌리/수정/심연으로 이어지는 큰 옆면 세계가 구현되어 있다.
새로 처음부터 만들지 말고 기존 구현을 이어가자. 사이트/게임 UI는 영어, 나와 설명은 한국어로 해줘.
게임은 크게, 조작은 단순하게, 덜 어지럽게 유지해줘.

우선 npm ci로 준비하고 production build와 기존 4개 테스트를 확인한 뒤 로컬 홈과 lighthouse.html을 열어줘.
현재 구현된 기능, 시뮬레이션인 기능, 다음에 할 일을 짧게 설명해줘.
후속 기능을 내가 지정하지 않았다면 새로운 큰 기능을 임의로 만들지 말고 실행 가능한 상태까지 준비해줘.

실제 판매·자동 LP·환불·멀티플레이는 아직 미연결이다. 데모를 라이브라고 표시하지 마.
출시 논의는 $15M FDV, 판매금 100% LP, 팀 장기 보유분 보상, 미판매분 장기 잠금이며 목표액·기간·잠금 조건은 미확정이다.
자동 배포는 필요 없다. 공식 배포는 나중에 기존 Google 호스팅의 souli.net에 수동으로 한다.
별도 Sites 사이트를 새로 만들거나 지금 운영 배포·토큰 재발행·거래를 하지 말아줘.
아트/컨트랙트 조사가 필요하면 https://github.com/yongchoi422/erc-20i-souli-smart-contract 를 추가로 클론해줘.
```
