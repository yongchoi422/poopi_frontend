# SOULI Azure 이전 — 실행 기록

기준일: 2026-10-02 KST. 사용자가 Google → Azure 이전과 이전 후 SOULI 전용 Google 자원 정리를 승인했다. **10월 1일 20:24 KST Azure로 전환했고 10월 2일 09:31 KST 구 Google 웹 자원/이미지/source 객체 삭제를 완료했다. Google DNS도 사용자 즉시 삭제 요청으로 제거하고 부재/사이트 정상 동작을 검증했다.** 후이즈 등록기관은 유지하고 Porkbun 이전은 두 도메인 모두 보류한다. Yongsancats는 사용자 본인이 갱신했다고 알려주었으며 이번 작업에서 변경하지 않았다.

## 현재 배포와 전환 결과 — 1.11

- 홈페이지/게임: **https://souli.net** → Static Web Apps **Free** `souli-web`, 전역 정적 배포. 메타데이터 지역 East Asia. `www.souli.net`과 자동 생성 SWA 주소는 apex로 301 이동한다. path/query 보존 검사 통과. 초대 베타와 미개시 판매를 화면에 명시한다.
- API: **https://api.souli.net** → Korea Central `souli-beta`. 기존 DB와 같은 지역, 최소 복제 0/최대 2, 0.25 CPU/0.5 GiB. 별도 DB 서버/Front Door/NAT/로그 수집 서버를 추가하지 않았다. [저비용 구조와 배포](AZURE-STATIC.ko.md).
- API active revision `souli-beta--0000001`, image `pickitlab.azurecr.io/souli/world@sha256:8a509c1cda5d5bc7e265fb9dad1cca4552f2b4330324ff143577a47393a60c8a`. PUBLIC_ORIGIN=https://souli.net. api.souli.net은 관리형 인증서 `mc-souli-env-api-souli-net-0393`로 SniEnabled. API의 정확한 origin CORS/쿠키 보안을 유지한다.
- Azure DNS zone `souli.net`을 만들고 후이즈 사용자 본인 인증 후 NS 변경 완료. NS는 `ns1-08.azure-dns.com`, `ns2-08.azure-dns.net`, `ns3-08.azure-dns.org`, `ns4-08.azure-dns.info`. 공개 resolver에서 새 NS 확인. 후이즈 성공 화면 `logs/azure-releases/whois-azure-nameservers.png`.
- Azure apex A는 SWA 리소스 ALIAS, TTL 300. Google DNS는 과도기용 Azure regional IP `20.239.34.78`로 갱신했다. api CNAME/asuid.api TXT/www CNAME/기존 root TXT/docs CNAME은 Azure에 보존했다. 과도기 Google 복제 기록과 zone은 10월 2일 최종 삭제했다. DNS 기록은 `dns-before-cutover.json`, `dns-cutover.json`에 있다.
- apex/www/API 인증서 정상. `logs/azure-releases/cutover-check.json`: 홈/게임/자산·CSP/HSTS·readiness·개발 파일 404·미로그인 401·판매 비활성·redirect 통과. PC의 ISP DNS는 아직 구 Google IP를 반환해 CLI apex 검사만 Azure IP를 명시했고 **정상 호스트 TLS 검증은 유지했다**. Codex 브라우저 일반 URL https://souli.net에서는 새 홈→게임→Coinbase ETH 표시가 실제로 동작하고 오류가 없었다.
- `hosted-auth-check.json`: 새 도메인에서 무자산 테스트 지갑 SIWE·보안 쿠키·다른 브라우저/서명 재사용/다른 origin 차단·실제 Base 비보유자 403·revision 재시작 뒤 세션 복원·로그아웃 통과. 실제 MetaMask/보유자 저장은 별도 미완료. allowlist는 무자산 테스트 지갑 한 개이며 실판매/LP/실거래 없음.
- 정적 보안 설정 `deploy/azure/staticwebapp.config.json`, 패키징 `scripts/prepare-static-release.mjs`, 호스트 분리 smoke `scripts/check-hosted-release.mjs`. 프런트/서버 전체 테스트와 production build가 통과했다. API/DB 백업과 방화벽 범위는 아래 기록을 보존한다.
- 기존 Google 이미지는 Azure ACR 작업 **dq4**로 실제 기동해 원본 운영 HTML SHA256 일치를 확인했다. 이전 dq3는 테스트 명령 quoting/실행 경로 오류로 실패했으며 고친 dq4가 성공했다. `legacy-restore-run.json`과 ACR task log 참조.
- **10월 2일 Google 웹 자원 삭제 완료:** SOULI Run, forwarding/proxy/URL map/backend/NEG, 구 IP, 인증서/SSL policy, 전용 Cloud Armor, Artifact Registry와 source 3개. 일반 DNS 경로 HTTPS 검사 및 사용자 접속 확인 후 원래 A TTL 5시간이 지난 상태에서 진행했다. 이후 사용자 즉시 삭제 요청에 따라 **Google DNS zone까지 삭제 완료**했고 일반 DNS의 사이트/API 재검증도 통과했다. 이전 10월 3일 대기 계획은 더 이상 적용하지 않는다. [정리 대상/검증 조건](GOOGLE-CLEANUP.ko.md)을 따른다. 자동 예약 없음. 공유 자원/프로젝트/IAM은 보존했으며 이미 발생한 비용과 공유 버킷의 7일 soft delete 비용은 별도다. 증거는 `google-cleanup-journal.json`, `google-cleanup-verification.json`이다.

아래는 전환 전 구축·백업·검증의 세부 기록이다. 이전 preview image/URL은 복원 참고용이고 현재 공식 주소는 위와 같다.

## Google 백업 및 등록기관 최신 결정

- 공식 Google Cloud SDK 587.0.0 ZIP을 공식 SHA256과 대조하고 `logs/google-tools`에 설치했다. SDK 로그인은 사용자의 직접 본인 인증과 동의로 완료했다. 인증 설정과 내보내기는 Git 제외·접근 제한 `logs/google-private`에 보관한다.
- `backup-20261001/manifest.json`에 Run 서비스/활성 revision/IAM, 프로젝트 서비스 목록, DNS zone/5개 레코드, 전달 규칙/프록시/URL map/backend/NEG/IP/인증서/health check, SOULI Artifact Registry 및 이미지 목록, 두 지역의 빌드 트리거, 버킷 목록을 기록했다. 총 20개 내보내기 실패 0. 이는 설정과 목록 백업이며 버킷 내용 전체를 다운로드했다는 뜻은 아니다.
- 현재 Run `souli-00011-bzr`의 이미지는 `us-central1-docker.pkg.dev/pickit-lab/souli/souli@sha256:036b6c61cba57677d7599a7766f34624785692d3c6c462ee56fff04a270b44c6`다. 별도 `pickitlab.azurecr.io/souli/legacy-backup:google-20261001`로 복사 후 동일 digest를 검증했다. 새 게임 이미지와 분리했다. 증거 `image-backup.json`; 이후 Azure ACR 작업 dq4에서 실제 실행·HTML 일치 검증도 완료했다.
- SOULI DNS 원본: apex A `34.160.139.16`, TTL 18000; Google NS/SOA, 기존 TXT 1개, `docs.souli.net` CNAME `5e07099d89-hosting.gitbook.io.`. 서비스 전환 때 TXT와 GitBook을 보존한다. NS/SOA는 새 DNS 서비스의 기본 레코드를 사용한다.
- 두 도메인 모두 후이즈 프리미엄 보안 잠금 때문에 기관이전 시 서류 심사가 필요하다. 사용자 결정으로 기관이전·잠금 해제·Porkbun 외부 도메인 추가·결제를 제출하지 않았다. 해당 선택과 추가 모달은 취소했다. Yongsancats 서버/기존 DNS는 변경하지 않았다.
- 초기 조회에서 souli.net 만료일은 2027-05-24였다. Yongsancats는 이후 사용자 본인이 갱신했다고 알려주었다. 에이전트는 연장 신청/결제를 하지 않았고 현재 갱신된 만료일을 재확인한 것은 아니다.
- 등록기관 이전 없이도 DNS 호스팅과 웹 서버를 옮길 수 있다. SOULI의 Google DNS까지 정리하려면 별도로 새 권한 DNS를 준비하고 모든 레코드 및 캐시 만료를 확인해야 한다. 이후 네임서버 전환을 완료했으며 Google 삭제는 위 전파 조건 확인 후 진행한다.

## 확인·완료

- Azure 계정: `stevechoi@oinng.com`, Default Directory, 구독 `Azure subscription 1` (`67aeb764-87c2-4e12-979b-36d35db0ec05`). 공식 Azure CLI 2.90.0 ZIP을 Git 제외 `logs/azure-tools/cli`에 설치하고 공식 디바이스 로그인으로 인증했다. Bicep 0.47.16 설치·컴파일 확인.
- 기존 `pickitlab.azurecr.io` Basic 레지스트리를 재사용한다. SOULI 이미지 전용 `souli-beta-pull` 토큰은 `souli/world`의 content/read·metadata/read만 허용한다. 레지스트리 전체 관리자 자격 증명을 앱에 넣지 않는다. 새 토큰의 password1 유효기간은 생성 시점부터 90일이며 만료 전 교체가 필요하다.
- 새 리소스 그룹 `rg-souli-prod-krc`, Korea Central의 `souli-env` 생성. Consumption profile, 새 전용 VM/DB 서버/레지스트리/Log Analytics workspace는 생성하지 않았다. 기본 ingress를 사용하고 유료 premium ingress·NAT gateway·Front Door는 추가하지 않았다.
- 기존 PostgreSQL `pg-yeinai-fd2b58`(Korea Central, B1ms 1 vCore/2 GiB, 32 GiB, 7일 백업)을 조회했다. 포털의 당시 1시간 평균은 CPU 약 9.9%, 메모리 약 59.8%, 스토리지 약 13.2%다. 이 값은 장기 부하 보장이나 무료 용량 보장이 아니다.
- 기존 앱의 Key Vault `database-url` 참조를 필요한 DB 관리자 연결에만 사용했다. 값을 출력하거나 새 앱에 재사용하지 않았다. **새 `souli_beta` 데이터베이스·로그인·`souli` 스키마**를 만들었다. 새 로그인은 superuser/createdb/createrole/replication 권한이 없고 연결 한도 10이다. 다른 앱의 테이블·암호·인증 방식을 변경하지 않았다.
- 새 DB는 `sslmode=verify-full`, 자체 스키마 search_path를 사용한다. Azure 기본 public 스키마에는 쓰기 권한이 없어 첫 검증이 실패했으며, 새 SOULI 스키마로 분리한 뒤 실제 런타임 테이블 초기화와 저장/조회/삭제에 성공했다. 증거: `logs/azure-releases/database-check.json`. 설치용 단일 IP 방화벽 규칙은 검증 후 삭제했다.
- 로컬 `npm.cmd test`: 프런트 9개, 서버 23개, build, 격리 런타임 검사 통과. 실제 Linux 이미지도 Azure ACR 빌드 **dq1**에서 성공했다. 로컬 Docker Desktop은 secrets-engine 소켓 시작 오류로 아직 실행 검증되지 않았다.

## 고정된 이미지와 배포 파일

- `scripts/prepare-azure-release.mjs`: 필요한 소스만 새 빌드 디렉터리로 복사하고 파일별 SHA256을 기록한다. Git의 미커밋 변경도 포함하되 자격 증명·로컬 DB·문서·테스트 지갑·기존 프로젝트 디렉터리는 업로드하지 않는다. 자체 업로드/배포 기능은 없다.
- 130개 파일, 약 2.78 MB. 빌드 문맥: `logs/azure-releases/release-zgRbCs/context`, manifest는 같은 상위 디렉터리.
- 소스 지문: `aac72b58326f500f5841476edc729cd5de577651a8f595778ade63caa58c3883`.
- 이미지: `pickitlab.azurecr.io/souli/world@sha256:44e4d4e171c7b1fa75a6385a3e25f60dc6f366fb7dc6d79c102c04623d3f82bc`.
- `deploy/azure/main.bicep`: HTTPS ingress·0.25 vCPU/0.5 GiB·최소 0/최대 2개·DB를 확인하는 readiness·별도 liveness·비밀 매개 변수·명시적인 베타 지갑 목록. DNS 변경, IAM 역할 부여, DB 생성, Google 삭제를 포함하지 않는다. Provider 사전 검증에서 로그 목적지 문자열 `none`이 거부되어 목적지 필드 생략으로 수정했고 what-if가 통과했다.
- 배포 `souli-preview-20261001` 성공. `souli-beta--17v7k70`이 위 digest로 실행된다. 실제 주소는 **https://souli-beta.niceriver-c5b6b8e5.koreacentral.azurecontainerapps.io** 이며 HTTPS 홈·게임이 동작한다. 아래 검증 범위를 함께 확인한다.
- 로컬 비밀은 Git 제외 `logs/azure-private`에만 있으며 폴더 ACL은 현재 Windows 사용자와 SYSTEM으로 제한했다. 이 폴더는 공유·Git 추가·배포 문맥 복사 대상이 아니다. 최종 앱에 필요한 새 계정 비밀만 Azure Container App secrets에 전달한다.
- 실제 사용자 지갑 주소는 요청 대기다. 임시 allowlist는 잔액 없는 새 테스트 지갑 하나뿐이며 테스트 키에 자산을 보내면 안 된다. 실제 판매·LP·송금은 꺼져 있다.

## 실제 Azure HTTPS 검증

- `node scripts/check-hosted-release.mjs https://souli-beta.niceriver-c5b6b8e5.koreacentral.azurecontainerapps.io` 통과: 홈/게임/연결 자산, CSP·HSTS, DB readiness, private-beta·chain 8453·판매 비활성·allowlist 필수. 구매 lab·환경 파일·서버 소스는 404, 미인증 world는 401이다.
- 별도 무자산 테스트 지갑으로 실제 HTTPS SIWE challenge/signature/verify/session/logout을 검사했다. Secure·HttpOnly·SameSite=Strict·`__Host-` 쿠키, 요청 브라우저 바인딩, 서명 재사용·다른 origin 차단을 확인했다. **실제 Base를 조회해 비보유자 world 접근이 403인 것도 확인했다.** 모의 보유자 응답을 배포하지 않았다.
- 앱 revision 재시작 후 같은 세션이 DB에서 복원되고, 로그아웃 후 다시 401이 되는 것을 확인했다. 이것은 **실제 MetaMask 확장이나 보유자의 게임 저장 검증은 아니다.** 증거: `logs/azure-releases/hosted-auth-check.json`, `azure-preview-state.json`.
- 브라우저에서 홈→게임, 자동 생활/등불·집 건설, 실제 Coinbase ETH 날씨, 390×844 가로 넘침 없음, 첫 점 캐릭터를 확인했다. 공개 보유 주소 `0x612b9350Cb17E84a48C1dbB8CcFC5d356a09e638`의 Dynamic 원본 1개/L4를 읽기 전용으로 조회했다. 이 주소의 소유자로 로그인하거나 서명하지 않았다. 검사 시 브라우저 오류는 없었다.
- 증거 화면: `logs/azure-releases/azure-preview-home.jpg`, `azure-preview-game.jpg`, `azure-preview-mobile.jpg`, `azure-preview-dot-mobile.jpg`.

## DB 네트워크와 백업 범위

- 앱이 보고한 송신 IPv4 **161개**를 겹치지 않는 **118개 범위**로 정리했다. 연속된 관측 주소만 합쳤으며 추가 IP는 0개다. 입력과 계획: `outbound-ips.json`, `network-parameters.json`, `network-whatif.json`(`logs/azure-releases/`). `scripts/prepare-azure-network.mjs`는 파일만 만들며 클라우드를 변경하지 않는다.
- `deploy/azure/database-network.bicep` what-if에서 Create 118개와 기존 자원 Ignore만 확인했다. ARM 배포의 긴 순차 대기 때문에 두 네트워크 배포의 대기를 취소하고 같은 이름/속성을 공식 ARM REST API로 맞추었다. 취소는 이미 만들어진 규칙을 지우지 않는다. 비동기 반영으로 첫 전체 재조회가 제한 시간을 넘겼으며, 남은 1개를 재요청한 뒤 **118개 규칙·161개 주소·추가 주소 0·기존 6개 보존·임시 규칙 0**을 최종 재조회로 확인했다. 증거: `logs/azure-releases/network-check.json`.
- **이 IP는 Azure의 공유 송신 주소이며 SOULI 전용 고정 주소가 아니다. PostgreSQL 방화벽은 서버 전체에 적용된다.** 앱 전용 계정·강한 비밀번호·TLS 인증을 함께 적용한다. 기존 6개 규칙은 보존하고 `0.0.0.0` 전체 Azure 규칙·전체 인터넷 허용은 추가하지 않는다. 배포 때 송신 주소를 다시 대조하며, 더 강한 격리/고정 송신은 별도 VNet·Private Endpoint/NAT 비용과 함께 검토한다.
- 기존 DB 서버의 7일 자동 백업 설정을 확인했다. 새 SOULI DB 10개 테이블을 읽기 전용 일관 스냅샷으로 내보내 별도 localhost PostgreSQL 18에 복원하고 재시작 후 모든 행을 대조했다. 당시 실제 데이터는 ETH weather_state 1행이며 사용자 게임 저장은 아직 없다. Azure 원본에는 복원하지 않았다.
- 스냅샷은 `logs/azure-private/restore-ukFDDf/souli-backup.json`(Git 제외·접근 제한), 검증 결과는 `logs/azure-releases/backup-restore-check.json`이다. 단일 IP 임시 방화벽은 삭제했다. 첫 CLI 경로는 타임아웃으로 실패했고 공식 ARM API 경로로 재검증했다.
- **Azure 자체 시점 복원(PITR) 리허설과 별도 장치/지역 백업 자동화는 미완료**다. 로컬 스냅샷만으로 재해 복구 완료라고 하지 않는다. 공개 베타 데이터가 쌓이기 전에 복원 목표·보관 위치·권한·실제 복원 절차를 확정한다.

## 현재 상태와 후속 운영

1. SOULI Google 웹 자원·이미지·DNS 정리는 완료했다. 마지막 zone 부재와 사이트 검증은 `google-dns-cleanup.json`에 있다. 다른 프로젝트/공유 자원을 추가 삭제하지 않는다. 기존 과금과 7일 source 보관료는 별도 확인한다.
2. 사용자의 실제 공개 베타 지갑 주소를 정하고 allowlist에 등록한 뒤 본인 MetaMask로 보유자 저장·이웃을 검사한다. 이것이 끝나기 전 공개 보유자 베타가 열렸다고 하지 않는다.
3. 공개 데이터가 쌓이기 전에 Azure PITR 리허설과 별도 장치/지역 백업 계획을 마무리한다. 현재 완료한 것은 일관된 SOULI DB 논리 스냅샷의 로컬 복원이다.
4. 배포 때 현재 송신 IP/방화벽 규칙과 DB 사용량, SWA Free 대역폭을 확인한다. 전체 Bicep 재배포 시 현재 customDomains/certificateId/PUBLIC_ORIGIN/allowlist를 보존한다. 과거 초기 parameters.json을 재적용하지 않는다.
5. 소액 사용량에도 API·DNS·ACR·기존 DB는 비용이 생길 수 있다. Google 후행 청구 및 soft delete 보관료를 확인한다. 0원/무제한 운영을 보장하지 않는다.

## 다음 운영자가 이어갈 때

1. `az account show`로 위 구독을 확인한다. CLI가 없다면 이 PC의 `logs/azure-tools/cli/python.exe -IBm azure.cli`를 사용할 수 있다. 인증 토큰이나 비밀 파일 내용을 로그에 출력하지 않는다.
2. `az containerapp show -g rg-souli-prod-krc -n souli-beta`의 latest ready revision/image를 위 digest와 대조하고 읽기 전용 smoke를 실행한다. 별도 자동 배포 트리거는 만들지 않았다.
3. 비밀은 앱의 secret reference와 보호된 로컬 파일로 전달했다. 새 PC에서는 정당한 계정/관리 경로로 재설정하며 Git·메일·일반 문서로 옮기지 않는다. `souli-beta-pull`의 90일 만료 전에 새 암호를 발급·앱 secret 교체·새 pull 확인 후 이전 암호를 폐기한다.
4. Google SDK 인증 완료. 이 PC에서는 `CLOUDSDK_CONFIG`를 `logs/google-private/gcloud-config`의 절대 경로로 지정해 공식 SDK를 호출한다. 복원 자료는 위 백업 경로와 manifest를 확인한다. [기존 호스팅 기록](HOSTING-CHECK.ko.md)의 SOULI 자원만 정리 대상으로 검토하며, 실제 복원 경로와 전환 검증 전에 원본을 삭제하지 않는다.

참고: [Container Apps 과금](https://learn.microsoft.com/en-us/azure/container-apps/billing), [송신 네트워크](https://learn.microsoft.com/en-us/azure/container-apps/networking), [PostgreSQL 서버 방화벽 범위](https://learn.microsoft.com/en-us/azure/postgresql/security/security-firewall-rules). 기존 App Service plan은 당시 7일 메모리 peak 약 93%여서 추가로 공유하지 않았다. 이미 사용 중인 DB 서버도 부하가 늘면 비용·용량 재평가가 필요하다.
