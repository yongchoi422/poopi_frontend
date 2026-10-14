# SOULI 1.4 — 필요한 순간만 계산하는 서버

**2026-10-01 운영 업데이트:** 실제 souli.net은 [Azure Free 정적 사이트 + 최소 API](AZURE-STATIC.ko.md)로 전환했다. 아래는 9월 30일 구현 기록이며 운영 미배포 설명은 당시 상태다. 10월 2일 Google 웹 자원·이미지·DNS 정리까지 완료했다. 기존 사용료와 source 파일의 soft delete 보관은 별도다.

2026-09-30. 사용자 승인에 따라 구현한 로컬 출시 후보다. 운영 배포·클라우드 자원 생성·DNS 변경·실제 거래는 하지 않았다. 현재 개발 서버는 기존 SQLite 저장을 계속 사용한다.

## 선택한 구조

| 영역 | 처리 위치 | 비용 원칙 |
|---|---|---|
| 원본 SVG, 떠다니기, 풍경, 로컬 무료 체험 | 브라우저 | 게임 진행마다 API/블록체인 거래를 보내지 않음 |
| SOULI 소유·원본·진화·전송 | Base 계약 | 조회는 RPC; 실제 자산 거래만 가스비 발생 |
| 로그인, 검증된 집 저장, 동네 협동 | 요청 시 실행하는 API | 플레이어 방문 때 경과 시간 정산 |
| 영속 저장 | Firestore 선택 가능, 기존 SQL도 지원 | 상시 PostgreSQL을 새로 운영할 필요 없음 |
| ETH 날씨 | 공유 캐시를 통한 공개 시세 조회 | 최대 5분 주기, 서버 간 중복 조회 억제 |

Base 거래 수수료는 L2 실행비와 L1 데이터 비용으로 구성되고 변한다. 특정 금액이나 무료 거래를 보장하지 않는다. 자동 생활·지갑 조회·SIWE 로그인 서명에는 블록체인 트랜잭션을 보내지 않는다. 지갑 구매 버튼의 실제 견적·허용 한도·수수료 확인은 판매 계약 구현 단계에 연결한다. 현재 판매는 계속 비활성이다. [Base 수수료 공식 설명](https://docs.base.org/specifications/transactions/network-fees).

## 실제 변경

- 서버 시작 시 시세 조회와 30초 전 마을 순회를 제거했다. 접속자가 없을 때 게임 계산용 cron/상시 CPU가 필요 없다.
- `/api/market`은 집/동네를 읽거나 쓰지 않는다. 시세와 관측한 사건만 저장한다. 시세 요청 중 15초 임대 잠금, 완료 후 5분 공유 캐시로 콜드 스타트·다중 인스턴스의 중복 외부 조회를 줄인다.
- `/api/world`는 요청한 집과 동네만 정산한다. 최대 32명의 참여 시간을 한 동네 문서에서 읽는다. 다른 집을 전부 업데이트하지 않는다.
- 이미 관측한 위기는 `weather_events`에 보관한다. 동네가 오래 비어도 마지막 방문 후 2시간 이내 참여분에 해당하는 기록만 제한된 범위로 읽는다. 협동 일지는 동네에 수령 기록을 두고 각 집이 돌아올 때 한 번만 옮긴다.
- 관측하지 않은 과거 ETH 하락을 만들어 내지 않는다. 모두 떠나 있는 동안 새 시세 요청이 없으면 새 위기도 시작하지 않는다. 이미 시작한 위기의 결과는 다음 방문에서 정산한다.
- 화면의 저장 확인을 15초 → 5분으로 변경했다. 계속 열린 창 기준 정기 `/world` 요청은 시간당 240회 → 12회, **95% 감소**다. 초기 로그인·직접 액션·오류는 별도이며 실제 청구액 95% 감소라는 뜻은 아니다.
- Solo 시세 조회는 60초 → 5분이다. Shared town은 `/world` 응답에 시세를 포함해 별도 정기 조회를 생략한다. 숨긴 탭은 정기 조회하지 않는다.
- 화면은 서버가 확인한 마지막 상태와 최대 2시간 참여 종료 시각 사이를 브라우저에서 계산해 계속 움직인다. 이 계산값을 서버에 저장/업로드하지 않는다. 실제 재료 차감·건설·협동 결과는 서버가 다시 계산한다. 다른 집의 기여와 승패는 화면에서 임의로 늘리지 않는다.
- SQLite/PG 저장 형식과 기존 테이블을 유지하며 새 테이블만 추가한다. 기존 브라우저 저장 키도 유지했다.
- Docker healthcheck는 DB 쓰기/시세 조회가 없는 liveness를 사용한다. 별도 readiness API는 DB 연결을 확인한다.
- Windows에서 에뮬레이터 파일 잠금이 Vite를 중단시키지 않도록 `logs/`와 `server/data/`를 파일 감시·정적 파일 제공에서 제외했다.

## Firestore 준비

서버 전용 `@google-cloud/firestore` 9.3.0을 사용한다. 브라우저에 Firebase 관리 키를 넣지 않고 배포 서비스 계정의 Application Default Credentials를 사용한다. 게임 거래는 동일한 트랜잭션 안에서 읽고 정산하고 기록한다. Firestore 재시도에 대비해 외부 RPC/시세 요청은 트랜잭션 밖에 있고 쓰기는 모든 읽기 후 반영한다. [공식 서버 인증](https://cloud.google.com/firestore/docs/samples/firestore-setup-client-create), [트랜잭션 규칙](https://firebase.google.com/docs/firestore/manage-data/transactions).

필요한 운영 환경 변수 예시(아직 적용하지 않음):

```dotenv
NODE_ENV=production
PUBLIC_ORIGIN=https://souli.net
BETA_ALLOWLIST=<초대 지갑 주소 목록>
STORE_BACKEND=firestore
FIRESTORE_PROJECT_ID=<실제로 준비한 프로젝트>
FIRESTORE_NAMESPACE=beta
FIRESTORE_DATABASE_ID=(default)
BASE_RPC_URL=<운영용 Base RPC>
HOST=0.0.0.0
PORT=8080
```

데이터 경로는 `souli/{namespace}/{table}/{id}`다. 운영/테스트 namespace를 분리한다. production SQLite와 에뮬레이터 사용은 시작 전에 거부한다. Firestore 설정 오류를 빈 로컬 DB로 조용히 대체하지 않는다. 저장소 종류나 namespace 변경만으로 데이터가 복사되지는 않는다. 기존 가입자 데이터가 있는 서비스는 내보내기·변환·대조·복원 검증 후 전환해야 한다. 이번에는 기존 SQLite 파일을 전환하지 않았다.

수동 배포 전 할 일:

1. 서비스와 가까운 리전의 Firestore Native DB와 제한된 런타임 IAM을 준비한다. 브라우저 직접 접근은 Security Rules에서 거부한다. 서버 SDK는 Rules 대신 IAM을 사용한다.
2. 단일 필드 `villages.members`, `homes.village`, `challenges.expires`, `sessions.expires`, `weather_events.start_at` 색인을 유지한다. JSON 문자열 `state`·서명문 `message`의 색인은 제외해 저장/쓰기 부담을 줄이는 것을 권한다.
3. 만료 세션/챌린지는 요청 시 최대 8개씩 정리한다. `expiresAt` Timestamp도 기록하므로 TTL을 추가할 수 있으나 자동으로 활성화하지 않았다. TTL·백업·PITR에는 별도 비용이 생길 수 있다.
4. Cloud Run은 요청 기반 과금, 최소 인스턴스 0, 초기 최대 인스턴스 2 같은 작은 상한으로 시작한다. 콜드 스타트와 Firestore 왕복 지연을 실제 HTTPS에서 확인한다. API는 같은 origin을 유지하고 프록시가 인증 쿠키를 보존해야 한다. 현재 쿠키 이름을 검토하지 않고 Firebase Hosting rewrite로 바꾸지 않는다.
5. 현재 소켓 IP 기반 요청 제한은 프록시 뒤 이용자에게 공유될 수 있다. 초대 베타 부하 검증과 운영 경로의 신뢰할 수 있는 IP/분산 제한 설계가 공개 출시 전 필요하다.
6. 현재 souli.net의 로드밸런서·DNS는 그대로다. 서버가 0으로 축소돼도 LB·저장·RPC·트래픽·빌드·로그 비용까지 0이라는 뜻은 아니다. 실제 청구서를 검토한 뒤 라우팅 변경 여부를 정한다.

[Cloud Run 자동 축소](https://docs.cloud.google.com/run/docs/about-instance-autoscaling), [요청 기반 과금](https://docs.cloud.google.com/run/docs/configuring/billing-settings), [Firestore 요금·무료 할당량](https://firebase.google.com/docs/firestore/pricing), [로드밸런서 요금](https://cloud.google.com/load-balancing/pricing).

월 예산은 청구서 확인 전 확정하지 않는다. 접속자 수보다 실제 열린 시간과 저장 읽기/쓰기 횟수가 중요하다. 예를 들어 100명이 각 30분 접속하면 정기 저장 요청은 하루 약 600회다. 여기에 여러 문서 읽기·쓰기, 로그인·RPC·시세·네트워크·기존 고정비가 붙는다. 무료 할당량은 계정/프로젝트 조건에 따라 공유될 수 있으므로 영구 무료 운영으로 설명하지 않는다.

## 검증 결과

- `npm.cmd test`: 프런트 로직 스크립트 **8개**, 서버/규칙/HTTP **23개**, build, 격리 런타임 import 통과.
- `npm.cmd run test:postgres`: 기존 API 회귀 **13개**와 PostgreSQL 실제 중지/재시작 저장 보존 통과.
- `npm.cmd run test:firestore`: Google 공식 Firestore 에뮬레이터 1.22.0에서 **14개** 통과. 동시 재료 차감, nonce 재사용 차단, 두 지갑 격리, 협동 정산, SDK 재연결, 원자적 롤백, 트랜잭션 재시도, 인스턴스 간 시장 캐시 포함. SQL 전용 보존 테스트/공통 설정 테스트도 이 묶음에 포함한다.
- 실제 운영 Firestore IAM·색인·백업 복원·부하·HTTPS MetaMask는 미검증이다. 에뮬레이터는 운영 전체를 대체하지 않는다.
- 루트 전체와 서버 운영 의존성 npm audit **알려진 취약점 0건**. 기존 `legacy/` 프로필은 별도다.
- 실제 ETH 피드, 기존 브라우저 저장, desktop/390px 화면·이미지·콘솔 확인. 체인 송금/계약 배포 없음.

Firestore 검증용 Java 21 JRE와 공식 에뮬레이터 JAR은 SHA256 확인 후 Git 제외 `logs/firestore-runtime/`에만 준비했다. OS 서비스나 시스템 Java를 설치하지 않았다. 검사 스크립트는 `demo-souli-tests`와 loopback 임시 포트만 사용하며 종료 시 에뮬레이터를 중지한다. 다른 컴퓨터에서는 `SOULI_TEST_JAVA`와 `SOULI_TEST_FIRESTORE_JAR`로 실행 파일 경로를 지정할 수 있다.

## Docker 설치 상태와 이어서 할 일

이 PC에 Docker Desktop **4.93.0**을 공식 winget 패키지로 사용자 범위 설치했다. Docker CLI **29.8.1**, Compose **5.5.1** 실행을 확인했다. 설치만으로 클라우드 리소스나 서버 요금이 생기지 않는다.

추가 준비: 기본 `Dockerfile`도 Node 24 production 서버로 교체했다. `Dockerfile.beta`와 동일한 내용이며 격리 패키지 검사에서 일치 여부와 런타임 import를 확인한다. Node 16/정적 serve 방식의 원본은 `legacy/Dockerfile.node16`에 보관했다. `npm run test:docker`는 이제 실제 기본 파일로 빌드하며, 엔진이 준비되지 않으면 15초 내 명확한 안내와 함께 종료한다.

**설치 완료, Windows 재부팅 대기.** 2026-09-30 후속 관리자 승인이 정상 전달되어 Virtual Machine Platform 활성화와 Microsoft 공식 WSL 3.0.1 x64 설치를 완료했다. DISM 종료 코드 3010, MSI 정상 종료 코드 0, `wsl --version` 3.0.1.0/커널 6.18.40.1-1, WslService Running을 확인했다. Windows `Component Based Servicing/RebootPending`이 남아 있고 WSL2 실행은 재부팅 전 아직 불가하다. 강제 재부팅은 하지 않았다. [Docker Windows 설치 요구 사항](https://docs.docker.com/desktop/setup/install/windows-install/).

Microsoft 배포 SHA256과 Microsoft Corporation의 유효한 Authenticode 서명을 확인한 설치 파일은 `logs/docker-setup/wsl-x64.msi`다. 설치 실행 파일은 `logs/docker-setup/setup.cmd`, 결과는 같은 폴더의 `status.txt`, `virtual-machine-platform.log`, `wsl-install.log`에 있다. 이전 UAC 취소 기록은 과거 시도이며 현재는 설치가 완료됐다. 이 컴퓨터에서는 설치 명령을 다시 실행할 필요가 없다. [Microsoft WSL 설치 안내](https://learn.microsoft.com/en-us/windows/wsl/install).

저장 중인 작업을 마친 뒤 Windows를 재부팅한다. Docker Desktop을 시작하고 `docker info`가 정상인 상태에서 `npm.cmd run test:docker`를 실행한다. 이 검사는 고유 이름의 로컬 이미지·네트워크·임시 PostgreSQL/앱 컨테이너를 만들어 production 부팅·정적 파일·보안 헤더·health를 검사한 뒤 자신이 만든 자원만 정리한다. 운영 배포는 하지 않는다. 이 PC에서는 재부팅이 남아 실제 이미지 검증은 아직 실행하지 못했다. 개발 서버 5173/API 8787은 현재 실행 중이나 재부팅 후에는 다시 시작해야 한다.
