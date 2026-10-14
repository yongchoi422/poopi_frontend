# SOULI 비공개 베타 — 구현 현황과 출시 절차

**1.4 최신 상태는 [출시 후보 문서](RELEASE-CANDIDATE.ko.md)와 [저비용 실행 구조](LOW-COST-RUNTIME.ko.md)를 먼저 읽는다.** 아래는 1.1~1.2 구현 기록이다. 상시 순회를 제거하고 5분 체크포인트와 Firestore 저장 옵션을 추가했다. `npm test` 프런트 8개/서버 23개/build/격리 패키지, 실제 PostgreSQL 13개+재시작, 공식 Firestore 에뮬레이터 14개 검증을 통과했다. 기본 Dockerfile도 Node 24 production 서버로 교체했고 Node 16 원본은 `legacy/Dockerfile.node16`에 보관했다. Docker 실제 기동·MetaMask HTTPS E2E·운영 백업 복구·배포·실제 판매는 남아 있다. 아래의 상시 프로세스/스케줄러 필수 설명은 과거 구조다.

기준: 2026-09-30. 이 문서는 실제 구현 범위를 기록한다. 전체 제품 기획은 [게임 상세 기획](SOULI-GAME-DESIGN.ko.md)을 따른다. **현재는 로컬에서 검증한 베타 기반이며, 운영 배포·실제 구매가 완료된 상태가 아니다.**

## 1. 이번에 연결한 흐름

1.2에서 자동 채집·건설, 실제 ETH-USD 날씨, 자동 협동 위기와 누적 등불을 추가했다. [자동 세계 구현 규칙](AUTOMATIC-WORLD.ko.md)을 먼저 읽는다. build/프런트 6개/서버 16개 테스트 통과. `weather_state`, `village_defense`, `home_watch`를 멱등 생성하며 기존 테이블/저장을 지우지 않는다. 아래의 시장 미연결·수동 생활 내용은 이전 버전 기록이다.

운영 추가 조건: `api.exchange.coinbase.com`으로 HTTPS outbound가 필요하다. 타이머 중단 시 이전 이벤트는 재접속 때 정산하지만 관측하지 못한 과거 새 이벤트를 만들지 않는다. 항상 실행되는 프로세스 또는 별도 스케줄러와 다중 인스턴스 부하/DB 복구를 검증해야 한다. 현재는 비공개 베타 규모의 동네 순회와 전역 트랜잭션 직렬화다. Azure 이전/운영 배포는 보류 중이다.

- 누구나 지갑 없이 기존 로컬 세계를 체험한다. 작업을 시작하지 않아도 원본이 천천히 움직이고 구름·물·주변 공개 샘플이 움직인다. 움직임 정지와 OS의 reduced-motion 설정을 지원한다.
- 작은 첫 형태도 실제 SVG의 전경 픽셀을 유지한다. 작고 밀집된 원본의 viewBox를 좁혀 보이게 하고 짙은 초록 배경으로 대비를 확보한다. 새 얼굴·눈·팔다리를 추가하지 않는다.
- `?soul=dot`의 Little dot은 배포된 렌더러를 seed 1 / extra 0으로 읽은 예시다. 특정 지갑 소유 원본이 아니다. 블록 51982158, 계약 메타데이터 level 0. 사용자가 말하는 첫 점 형태를 테스트하기 위한 샘플이다.
- `Connect MetaMask`는 주소·잔액 조회이며, 별도 `Home & neighbors`의 로그인 버튼에서만 SIWE 메시지 서명을 요청한다. 결제·가스·토큰 승인과 분리한다.
- API는 서명을 검증하고 매 요청 시 Base 보유 상태를 읽는다. 지갑 주소당 개인 집 하나를 서버에 저장하고, 최대 32개 집을 하나의 동네에 배정한다. 재접속은 같은 저장 집을 읽는다.
- 개인 재료는 별도다. 공동 정원에 기여한 재료와 완료 상태만 동네에 공유한다. 완료하면 Little town에 꽃밭이 나타난다. 32는 현재 접속자 수가 아니라 정착한 집 수다.
- 보상은 기존처럼 1분당 memories 3 / supplies 8 / glowstones 4. 활성 작업은 최대 2시간 복귀 계산한다. 공동 정원 목표는 supplies 320 / glowstones 160, 한 번에 8 / 4 기여한다. 이는 게임 내부 재료이며 SOULI 지급·소각·스테이킹이 아니다.
- 첫 개인 챕터는 가로등(8/4) → 숲 속 쉼터(32/16) → 갤러리 복원(80/40)이다. 비용은 supplies/glowstones이며 확정 경제 수치가 아닌 체험용 조정값이다. 화면에는 다음 목표 하나만 표시하고, 건설하면 해당 장소의 배경과 일지가 바뀐다. 로컬과 서버 모두 순서·중복 차감·비용을 검증하고 옛 가로등 저장도 유지한다. 세 단계 후에는 공동 정원 안내로 이어진다.

실시간 다른 플레이어 아바타, 채팅, 친구 초대, 시장 가격 기반 날씨, 실제 보존 이전은 아직 연결하지 않았다. 배경 주민은 계속 공개 원본 연출이다. 작은 점과 큰 원본의 작업 보상은 동일하다.

## 2. 로컬 실행

Node 24 사용. 저장소 루트에서 실행한다. PowerShell에서는 `npm.cmd`를 사용한다.

```powershell
npm.cmd ci --no-audit --no-fund
npm.cmd ci --prefix server --no-audit --no-fund
```

터미널 A:

```powershell
npm.cmd run dev:api
```

터미널 B:

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

열기: `http://127.0.0.1:5173/`, `http://127.0.0.1:5173/lighthouse.html?soul=dot`. Vite가 `/api`를 8787 포트로 전달한다. 기본 SIWE origin은 정확히 `http://127.0.0.1:5173`이므로 `localhost`로 바꾸려면 `PUBLIC_ORIGIN`도 함께 맞춰야 한다. MetaMask는 확장이 있는 일반 브라우저에서 사용한다. Codex 내장 브라우저에 지갑이 없으면 안내만 표시된다.

선택 설정은 `server/.env.example` 참고. 예를 들어 `server/.env`를 로컬에 만든 후 `node --env-file=server/.env server/index.mjs`로 실행한다. 환경 파일과 DB는 Git에서 제외한다. 개인키·시드 구문은 서버에 필요하지 않다.

- 브라우저 연습 저장: 기존 `souli-sanctuary-v1`. 서버로 가져오지 않는다.
- 로컬 API 저장: `server/data/beta.sqlite`. 다시 시작해도 유지된다. 다른 컴퓨터로 Git만 복사하면 이 DB는 이동하지 않는다.
- 예전 `souli-idle-v2`와 이전 게임 소스는 보존한다.

## 3. 인증·진행의 경계

서버가 발행한 5분 nonce를 한 번만 사용한다. [EIP-4361](https://eips.ethereum.org/EIPS/eip-4361)의 domain, URI, chain ID, expiration을 검증한다. 현재 지원 범위는 EOA 서명이며 EIP-1271 스마트 계약 지갑은 별도 검증이 필요하다.

세션은 24시간 HttpOnly / SameSite=Strict 쿠키, 운영에서는 Secure 및 `__Host-` 접두사를 사용한다. DB에는 원본 쿠키 대신 SHA-256 해시를 저장한다. 변경 요청은 정확한 Origin과 JSON Content-Type이 필요하다. 클라이언트가 전송하는 재료·시간·다른 지갑 주소를 진행 계산에 사용하지 않는다. 지갑/체인이 바뀌면 기존 화면 세션을 해제하고 다시 로그인하게 한다.

서버 시간과 DB 트랜잭션이 개인 채집·건설·공동 기여의 기준이다. SQLite는 한 프로세스의 직렬 트랜잭션, PostgreSQL은 advisory transaction lock으로 중복 차감을 방지한다. PostgreSQL의 전역 잠금은 작은 비공개 베타를 위한 선택이며 공개 대규모 서비스 성능 검증은 별도다. 표시용 SVG는 브라우저 조회 결과이고, 정착 자격은 서버의 Base 조회 결과다. 원본의 정확한 seed별 입주/보존 전송 검증은 후속 작업이다.

## 4. 검증 기록과 한계

Node v24.21.0 / npm 11.19.0에서 production build, 기존 및 새 프런트엔드 로직 스크립트 6개, 초기 서버 테스트 8개가 통과했다. 세 단계 건설 추가 후 영향을 받는 sanctuary 스크립트·build·서버 테스트 9개를 다시 통과했다. `git diff --check`도 통과했다. 아래 명령으로 다시 확인할 수 있다.

```powershell
npm.cmd run build
node scripts/test-lighthouse.mjs
node scripts/test-idle.mjs
node scripts/test-purchase.mjs
node scripts/test-wallet-session.mjs
node scripts/test-sanctuary.mjs
node scripts/test-soul-framing.mjs
npm.cmd run test:beta
```

서버 테스트는 메모리에서 생성한 테스트 지갑의 실제 암호 서명을 사용한다. 서명 위조·만료·재사용·다른 Origin 거부, 로그아웃, 보유/허용 목록 확인, 서버 시간 계산, 두 지갑의 데이터 분리, 공동 기여의 동시 차감, 완료 후 중복 기여 거부, SQLite 파일 재시작을 검증한다. 보유 상태는 테스트 안에서는 통제 가능한 대체 응답이다.

별도 실제 Base 읽기에서는 공개 주소 `0x612b9350Cb17E84a48C1dbB8CcFC5d356a09e638`의 정착 가능 상태를 블록 51982646에서 확인했다. 이 주소를 테스트 세션으로 가장하거나 서명한 적은 없다.

브라우저에서는 점 원본, 작업 정지 상태의 움직임, 움직임 일시 정지, 데스크톱/390px/360px 배치, 서버 상태 표시, 지갑 미설치 안내, 모달 키보드 닫기를 확인했다. 서버 의존성 audit에서 보고된 취약점은 0개였다. 이것은 전체 앱의 보안 감사가 아니다.

후속 건설 검증에서는 실제 로컬 재료로 쉼터와 갤러리를 완성하고 장소 이동·첫 챕터 완료·새로고침 후 복원을 확인했다. 데스크톱과 390px 모바일 완료 화면을 확인했으며 가로 넘침이 없었다. 서버 테스트에는 세 단계 순서, 임의 비용 무시, 중복 건설 거부, 재로그인 보존과 다른 지갑 데이터 분리가 포함된다.

**아직 확인하지 않은 것:** 실제 MetaMask 확장으로 처음부터 끝까지 로그인, 실제 PostgreSQL 통합, 컨테이너 빌드, Azure 배포, HTTPS 쿠키/프록시 운영 환경, 실제 결제. 기존 프런트엔드의 큰 Web3 번들 및 오래된 의존성 경고도 남는다.

## 5. Azure 수동 배포 경로

기존 공식 사이트는 2026-09-30 콘솔 확인 기준 Google Cloud `pickit-lab`의 Cloud Run `souli` (`us-central1`)에서 운영 중이다. DNS와 로드밸런서까지 연결을 확인했다. 아래 Azure 서버안은 기존 사이트의 실제 호스팅 위치와 구분한다. 사용자의 후속 결정 전에는 기존 서비스를 이전하거나 덮어쓰지 않는다. [호스팅 확인 기록](HOSTING-CHECK.ko.md) 참고.

`Dockerfile.beta`는 프런트엔드와 API를 같은 origin에서 제공하는 Node 24 이미지를 정의한다. 기존 Google 정적 호스팅용 Dockerfile은 건드리지 않았다. 현재 환경에 Docker/Azure CLI/PostgreSQL 서비스가 없어 이미지 빌드나 실제 클라우드 자원 생성은 수행하지 않았다.

제안 구조: Azure Container Apps 한 서비스 + 영속 PostgreSQL. API와 웹을 같은 호스트에서 제공하면 현재 세션 설계를 그대로 쓸 수 있다. 기존 Google에 웹을 계속 둘 경우에는 `/api`의 같은 origin 프록시와 쿠키 전달을 먼저 구성해야 한다. 서로 다른 도메인 API에 주소만 바꾸어 붙이는 구조는 현재 지원하지 않는다.

[Container Apps의 컨테이너 파일 시스템](https://learn.microsoft.com/en-us/azure/container-apps/storage-mounts)은 영속 DB로 사용하지 않는다. 운영 모드는 `DATABASE_URL`이 없으면 시작하지 않는다. HTTPS origin과 비어 있지 않은 지갑 허용 목록도 필수다.

필수 운영 설정:

| 변수 | 의미 |
| --- | --- |
| `NODE_ENV=production` | 운영 검증과 정적 빌드 제공 |
| `PUBLIC_ORIGIN` | 실제 HTTPS 주소, 경로/끝 슬래시 없이 지정 |
| `DATABASE_URL` | 서버에서만 읽는 PostgreSQL 연결 문자열. 검증된 TLS 및 DB 접근 제한 필수 |
| `BETA_ALLOWLIST` | 초대할 EOA 주소를 쉼표로 나열. 빈 값으로 공개 베타 전환하지 않음 |
| `BASE_RPC_URL` | 운영용 Base RPC. 비밀 토큰이 있다면 Azure secret으로 보관 |
| `HOST=0.0.0.0`, `PORT=8080` | 컨테이너 ingress 대상 |

배포 환경이 준비되면 수행할 순서:

1. 사용할 subscription / resource group / Container App과 비공개 베타 주소를 확인한다. 서버 비용과 백업 기간도 여기서 확정한다.
2. PostgreSQL 연결·TLS·백업을 설정하고 격리된 테스트 DB에서 서버 테스트와 재시작 복구를 검증한다. 운영 DB를 회귀 테스트에 사용하지 않는다.
3. 로컬에서 `docker build -f Dockerfile.beta -t souli-beta .`로 빌드하고 대상 환경에 수동 배포한다. 이전 이미지/revision과 DB 백업을 보관한다. 자동 배포를 추가하지 않는다.
4. 최소 허용 지갑으로 HTTPS 로그인→채집→정원 기여→새 브라우저 재로그인→로그아웃→다른 계정 전환을 확인한다. API 장애, RPC 장애, 세션 만료도 확인한다.
5. readiness와 알림, DB 복원, 로그 보존, 서비스 제한을 검증한 뒤 작은 초대 베타를 연다. `/api/status`는 프로세스/기능 상태이며 DB/RPC 정상 여부까지 보장하는 readiness가 아니다.

## 6. 실제 SOULI 구매를 열기 위한 남은 결정

현재 `PURCHASE.saleContract = null`, `/api/status.sales = false`. API에는 구매/출금 엔드포인트가 없다. 게임 로그인 서명은 구매 승인이 아니다.

구매 경로는 아직 확정하지 않았다. 기존 웹 호스팅은 후속 조사에서 Google Cloud Run으로 확인했으며, 새 게임 서버의 운영 설정은 별도로 정해야 한다. 기존 $15M FDV, 1 USDC = 14 SOULI, 판매대금 100% LP, 목표액/잠금은 계약으로 구현한 판매 조건이 아니다. 후속 운영비 논의가 있으므로 과거 예시를 확정 조건으로 고정하지 않는다.

- 이미 존재하는 풀/판매 계약을 쓰려면 **정확한 주소와 경로**를 확인한다. 현재 저장소에서 검증된 구매용 주소가 없다.
- 신규 고정가 판매라면 가격, 판매 수량, 공급 지갑, 대금 사용처, 모금 기간/최소 목표, 환불 및 LP/잠금 조건을 먼저 확정해야 계약을 구현할 수 있다.
- ERC20i는 잔액뿐 아니라 seed/extra 이전 규칙이 있다. 배포 계약과 소스 일치, 실제 구매/claim/LP 경로, 구매자의 원본 변화, allowance, slippage, 실패 및 환불을 Base fork에서 검증한다.
- 그 후 견적→명확한 거래 설명→필요한 한도의 승인→MetaMask 거래→영수증 확인→갱신된 원본/잔액 조회를 연결한다. 실제 거래를 사용자 대신 승인하지 않는다.

베타 우선 권장 순서는 **보유자의 게임 비공개 베타를 검증하면서 판매 계약을 별도 완성한 뒤, 구매를 개방**하는 것이다. 아직 판매가 구현되지 않았다는 사실을 감추거나, 단순 구매가 시장 가격 상승을 보장한다고 표시하지 않는다.
