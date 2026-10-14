# SOULI 정적 사이트와 최소 API — 수동 배포

최신2026-10-03: **static-gpw3FA**,80파일/14,858,369bytes. `/pilot/`은 실제Base ETH로원본SOULI42개한도/지갑10개 소량구매를검증하는별도공개페이지다. `/buy/`상업판매와메인넷관리설정은비활성유지. read-only조회에공식Base RPC를허용했으며추가API서버/유료리소스없음. 상세는HANDOFF.ko.md1.41과SITE-RELEASE.md1.41. 아래과거의‘메인넷판매전부비활성’설명은pilot공개전시점의기록이다.

2026-10-01 적용. 현재 사이트는 https://souli.net, 게임은 https://souli.net/lighthouse.html, API는 https://api.souli.net 이다. 판매는 비활성, 공유 저장은 초대 지갑만 허용한다.

최신 배포2026-10-02: `static-IiDaDv`,64파일/14,756,132bytes. 아래 초기2.8MB 크기는 이전 기록이다. 캐릭터 영상6편/포스터6개를 기존 Free 사이트에 포함했고 신규 서버·유료 플랜은 만들지 않았다. `/media/souli-moments/v1/*`에1년 immutable 캐시, MP4/JPEG 명시적 MIME 매핑을 적용했다. 첫 업로드에서 영상이 일반 파일 타입으로 반환된 것을 검수로 발견해 수정·재배포했다. 앞으로 내용이 바뀌면 같은 immutable URL을 덮어쓰지 않고 새 버전 경로를 사용한다. [공식 MIME 설정](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration#example-configuration-file). 공개12파일 해시와 영상206 byte-range 검사 통과. `check-hosted-release.mjs`는 이제 여섯 쌍의 MIME/캐시/범위 재생도 확인한다.

2026-10-02: https://souli.net/testnet/ 을 같은 Free 정적 배포에 추가했다. 새로운 서버/DB는 없다. `/testnet`·`/testnet/`·`/testnet/index.html` 응답과 연결 자산, `noindex`/`no-store`를 배포 검사에 포함한다. Azure route는 끝 슬래시를 정규화하므로 `/testnet` rewrite 하나와 `/testnet/*` 헤더만 정의한다. CSP에는 공개 조회용 `https://sepolia.base.org`를 허용한다. 메인넷 판매는 계속 비활성이다. [테스트넷 상태](TESTNET.ko.md).

| 구성 | 현재 위치/설정 | 비용 원칙 |
|---|---|---|
| HTML·JS·CSS·인스크립션 예시 | `souli-web`, Static Web Apps **Free**, 전역 정적 배포 | 방문마다 게임 서버를 기동하지 않음 |
| 원본/토큰 자산 | Base, 지갑 + RPC | 애니메이션·게임 틱마다 체인 거래를 보내지 않음 |
| SIWE·저장·동네·ETH 캐시 | `souli-beta`, Korea Central Consumption, 0.25 CPU/0.5 GiB, 최소 0/최대 2 | 방문 요청 때 계산, 숨긴 탭은 정기 조회 중단 |
| 저장 | 기존 Korea Central PostgreSQL의 별도 `souli_beta` DB/로그인 | 새 DB 서버를 추가하지 않음; 기존 DB 자체는 유료 |
| DNS | Azure DNS `souli.net`, 후이즈 등록기관 유지 | 작은 DNS zone/query 비용; 별도 Front Door/NAT 미생성 |

SWA 리소스 메타데이터 지역은 East Asia지만 정적 콘텐츠는 전역 배포다. Apex는 Azure 리소스를 대상으로 하는 ALIAS이므로 고정 regional A만 사용하는 최종 설계가 아니다. 미국·인도·한국·동남아에 별도 서버를 만들지 않는다. API는 현재 DB 옆에 두어 지역 간 DB 왕복과 전송을 피한다. 이용 분포가 확인되면 API와 DB를 함께 Singapore로 옮기는 비용/지연을 비교한다.

Free는 SLA가 없으며 공식 quota 기준 구독의 포함 대역폭 월 100 GB, 사이트 환경당 250 MB, custom domain 2개다. 현재 배포 약 2.8 MB/36파일, 도메인은 apex/www 두 개다. API 도메인은 별도 Container App 인증서를 사용한다. Free 초과 대역폭은 유료 종량제로 자동 늘어나는 구조가 아니므로 사용량에 맞춰 계획을 검토해야 한다. 무료 정적 호스팅이 전체 서비스 0원이나 무제한 트래픽을 뜻하지 않는다. ACR 이미지/빌드·API 사용·기존 DB·DNS 비용이 남는다.

## 프런트 수동 배포

1. `npm.cmd ci`, 필요한 변경 검증 후 `npm.cmd test`.
2. `node scripts/prepare-static-release.mjs https://api.souli.net`. Vite production build와 CSP를 확인하고 새로운 `logs/azure-releases/static-*/content` 및 SHA256 manifest를 만든다. **이 명령은 업로드하지 않는다.** 과거 디렉터리에 덮어쓰지 않아 사라진 자산이 다음 배포에 섞이지 않는다.
3. Microsoft 공식 SWA CLI로 그 `content`만 production 배포한다. `--swa-config-location`에도 같은 `content` 경로를 명시해 다른 과거 설정이 자동 선택되지 않게 한다. 배포 토큰은 로그인한 Azure CLI의 `staticwebapp secrets list` 응답에서 메모리로 가져와 `SWA_CLI_DEPLOYMENT_TOKEN` 환경변수로 전달하고 사용 후 제거한다. 토큰을 명령 인수/로그/소스/Git에 적지 않는다. 현재 PC의 완료된 실행 보조는 Git 제외 `logs/azure-tools/deploy-static.mjs`이며 그 안의 `logs/swa-tools` CLI 2.0.10을 쓴다. 새 PC에서는 공식 CLI 설치와 정당한 Azure 로그인이 필요하다.
4. `node scripts/check-hosted-release.mjs https://souli.net https://api.souli.net`으로 홈·게임·연결 자산·보안 헤더·DB readiness·판매 비활성·개발 파일 차단을 검사한다. 실제 브라우저의 ETH 출처/에러도 확인한다.
5. 실제 MetaMask 서명·보유자 저장은 별도 검사다. 현재 테스트 키를 사용자 지갑으로 쓰거나 자산을 보내지 않는다.

SWA Free에서 외부 Container App을 `/api` 프록시로 연결하는 유료 기능을 사용하지 않는다. `VITE_API_ORIGIN`이 API의 HTTPS origin을 빌드에 넣고, 서버 `PUBLIC_ORIGIN=https://souli.net`과 정확히 일치하는 요청만 credentialed CORS를 허용한다. 임의 subdomain·cross-site 요청은 거부한다. 쿠키는 API host-only `__Host-`, Secure/HttpOnly/SameSite=Strict이며 두 주소는 같은 HTTPS 사이트에 속한다. www/기본 SWA 주소는 apex로 301 이동한다.

## API 변경 시

기존 `scripts/prepare-azure-release.mjs`로 허용한 파일만 패키징하고 ACR에서 빌드한 digest를 Container App에 배포한다. 새 프런트만 변경할 때 컨테이너를 다시 빌드할 필요는 없다. 현재 API digest와 확인 결과는 [이전 기록](AZURE-MIGRATION.ko.md)을 따른다.

전체 Bicep을 다시 적용할 때 `customDomains`는 **필수 매개변수**다. 현재 `az containerapp hostname list`의 `api.souli.net` bindingType/certificateId를 그대로 넣어 도메인이 사라지지 않게 한다. PUBLIC_ORIGIN, 현재 allowlist, DB/registry secret 참조와 이미지도 보존한다. 초기 부트스트랩용 과거 parameters.json/prepare-parameters.mjs를 재사용하지 않는다. 현재 송신 IP와 DB 방화벽 대조도 필요하다. 단순 이미지 갱신은 기존 설정을 보존하는 `az containerapp update --image <digest>`로 하고 검사한다.

Azure 기본 preview 주소는 과거 단일 서버 배포 경로다. 공식 사이트 검증/로그인은 souli.net에서 한다. 홈페이지·게임과 API 모두에 자동 배포는 만들지 않았다.

공식 자료: [Free/Standard](https://learn.microsoft.com/en-us/azure/static-web-apps/plans), [할당량](https://learn.microsoft.com/en-us/azure/static-web-apps/quotas), [Azure DNS ALIAS](https://learn.microsoft.com/en-us/azure/static-web-apps/apex-domain-azure-dns), [SWA CLI 배포](https://learn.microsoft.com/en-us/azure/static-web-apps/static-web-apps-cli-deploy).

2026-10-02 웹 백서와 세 지갑 테스트 관리 UI를 수동 production 배포했다. `/whitepaper`·`/whitepaper/`·`/whitepaper/index.html` 및 연결 자산도 hosted smoke 검사에 추가했다. 기록 [WEB-WHITEPAPER.ko.md](WEB-WHITEPAPER.ko.md). 체인 계약 신규 배포는 웹 배포와 별개다.
