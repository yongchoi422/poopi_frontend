# SOULI Google 정리 — 완료

사용자가 SOULI의 Google → Azure 이전과 이전 후 전용 자원 삭제를 승인했고, 2026-10-02 실제 Azure 접속 확인 후 삭제 진행을 다시 요청했다. **10월 2일 09:31 KST 웹 자원/이미지 저장소/source 객체 정리를 완료했다. 남아 있던 Google DNS도 사용자 즉시 삭제 요청에 따라 제거했다.** `pickit-lab` 전체 삭제·결제 중단·공유 IAM/버킷 정리는 승인 범위가 아니다. Yongsancats/Porkbun 작업은 보류다.

## 최종 완료 — 2026. 10. 02. 09:59 KST

사용자가 방문자가 거의 없으므로 남은 DNS를 지금 삭제하라고 명시했다. **이전 48시간 대기 계획은 철회되었고 DNS 삭제도 완료했다.** 최종 Google zone/레코드를 접근 제한 백업에 저장하고 Azure ALIAS/CNAME/TXT 대응 기록을 전부 확인한 뒤 비권한 레코드 6개 및 zone을 삭제했다. Google zone 목록에서 부재 확인, 삭제 후 일반 DNS 경로의 souli.net 홈·게임·API HTTPS 검사 통과. Azure의 docs/TXT도 보존했다.

증거: `logs/azure-releases/google-dns-cleanup.json`, 갱신된 `google-cleanup-verification.json`, 보호된 `logs/google-private/cleanup-20261002/dns-final-before.json`. SOULI 전용 Google 웹 자원/이미지/DNS 정리는 완료됐으며 추가 DNS 삭제나 예약은 없다. 이미 발생한 요금과 source 객체의 기존 7일 soft delete 보관은 별도다. 공유 자원이나 프로젝트 전체를 추가 삭제하지 않는다.

이하 09:31 당시 단계별 기록과 대기 비용 추정은 과거 기록이다. 남은 DNS 또는 10월 3일 대기 문구를 현재 실행 지시로 사용하지 않는다.

## 10월 2일 실행 결과

- 정상 DNS의 `node scripts/check-hosted-release.mjs https://souli.net https://api.souli.net` 통과. Cloudflare NS 응답 TTL 172800초, Google/Quad9 A 응답은 Azure, GitBook CNAME 유지 확인. 서버의 원래 18000초 A TTL은 이미 만료했으므로 **서버 경로 삭제를 먼저 진행하고, 구 Google 네임서버 캐시를 위한 DNS zone만 남겼다.**
- 원본 구성 20개와 source 3개 SHA256 확인, Azure legacy 이미지 digest/성공한 실제 복원 작업 dq4 재확인. 현재 의존성 전체를 `logs/google-private/cleanup-20261002/`에 다시 저장했다. SOULI 전용 Cloud Armor `default-security-policy-for-backend-service-souli`도 발견해 백업/삭제에 포함했다. SSL policy `souli`와 `soulierc20i`도 모두 SOULI 범위였으며 외부 proxy 참조가 없었다.
- 삭제 실행 **17단계 모두 성공**. 한 단계에 인증서 2개 또는 SSL policy 2개가 있으므로 17은 개별 리소스 수가 아니다. 아래 표의 1–10 및 추가 Cloud Armor policy를 삭제했고 11(DNS)은 유지했다. `logs/azure-releases/google-cleanup-journal.json`에 각 명령·시각·결과가 있다.
- source 3개는 삭제 직전 원격 MD5와 백업 바이트를 대조한 뒤 generation 조건으로 삭제했다. 공유 버킷 자체를 삭제하거나 보존 정책을 변경하지 않았다. 이 파일들의 soft delete 보관 7일은 별도로 남는다.
- 최종 Google 목록/공유 자원 ID/객체 부재/Azure HTTPS 검사 결과는 `logs/azure-releases/google-cleanup-verification.json`을 따른다. 이 파일이 없거나 실패면 완료를 추정하지 말고 `logs/azure-tools/verify-google-cleanup.mjs`로 이어서 검증한다.
- 남은 삭제 대상은 **Cloud DNS zone `pickitlab-uscentral1-souli` 한 개**다. 10월 3일 21:00 KST 이후 아래 DNS 절차로 재확인 후 삭제한다. 자동 예약은 생성하지 않았다.

Google DNS의 첫 25개 구간 zone 기본료는 시간당 USD 0.000273973(월 약 USD 0.20)이고 쿼리는 별도다. 10월 2일 오전부터 약 36시간 유지하는 기본료는 약 USD 0.01이며 실제 계정 요율/통화/쿼리/세금은 별도다. 소액이라도 무료라고 표현하지 않는다. [공식 DNS 가격](https://cloud.google.com/dns/pricing). 삭제한 파일의 보관료와 이미 발생한 사용료는 후행 청구될 수 있다. [Soft delete](https://cloud.google.com/storage/docs/soft-delete).

## 시점과 먼저 확인할 조건

- 후이즈 NS 변경 2026-10-01 약 20:15 KST, apex 전환 **20:24 KST**. Google 원래 A TTL은 18,000초(5시간), NS 변경 안내는 최장 48시간이다. 보수적인 재확인 시점은 **2026-10-03 21:00 KST**다. 시각 도달만으로 삭제하지 않는다.
- Azure/Google 양쪽 권한 DNS는 새 Azure 목적지와 api/www/docs/TXT를 유지한다. 여러 공개 resolver 및 권한 NS, apex/www/게임/API TLS를 재검증한다. 오래된 NS/A가 보이면 연장한다. 전환 직후 이 PC의 일반 DNS는 실제로 Google IP를 반환했다.
- 일반 DNS 경로의 hosted release check와 브라우저 홈/게임/시세가 정상인지 확인한다. 당일 검사 증거는 `logs/azure-releases/cutover-check.json`, `hosted-auth-check.json`, `souli-live-*.png`.
- 백업 폴더 `logs/google-private/backup-20261001`의 20개 설정/목록 export와 추가 ssl-policy/build-bucket/source manifest를 확인한다. 공개 공유/Git 추가 금지.
- 활성 이미지 SHA256 `036b6c61cba57677d7599a7766f34624785692d3c6c462ee56fff04a270b44c6`는 Azure ACR `souli/legacy-backup:google-20261001`에 복사했고 작업 **dq4**로 실제 실행해 원본 운영 HTML SHA256 `86956fefbfd7ea0994982851b2023a44b7fa77a98fd32055b0d09dcd89b80ee4` 일치를 검증했다. 다른 10개 과거 이미지의 실행/복원을 검증했다는 뜻은 아니다.

## 구체적인 삭제 대상과 의존 순서

모든 대상의 프로젝트는 `pickit-lab`이다. 공식 gcloud/API로 현재 연결을 다시 조회하고 SOULI 외 참조가 있으면 중단한다. 실제 삭제 전 이 목록을 사용자에게 짧게 알린다. 자원 이름만으로 범위를 넓히지 않는다.

| 순서 | 대상 | 범위/현재 근거 |
|---|---|---|
| 1 | forwarding-rules `souli`, `souli-forwarding-rule` | global, 구 Google IP 34.160.139.16의 HTTPS/HTTP |
| 2 | target-https-proxies / target-http-proxies `souli-target-proxy` | global, SOULI 두 URL map |
| 3 | url-maps `souli`, `souli-redirect` | global, SOULI backend/HTTPS redirect |
| 4 | backend-services `souli` | global, 아래 SOULI NEG만 연결 |
| 5 | network-endpoint-groups `souli` | us-central1, Cloud Run souli |
| 6 | Cloud Run `souli` | us-central1, old active revision souli-00011-bzr |
| 7 | address `souli` | global 34.160.139.16, 연결 해제 확인 후 IP 반환 |
| 8 | ssl-certificates `souli`, `soulierc20i`; ssl-policies `souli`, `soulierc20i`; Cloud Armor `default-security-policy-for-backend-service-souli` | global, 다른 proxy/backend가 사용하지 않음을 재조회 |
| 9 | Artifact Registry repository `souli` | us-central1, 이미지 목록 11개; 현재 활성 이미지 Azure 백업 확인 |
| 10 | 아래 Cloud Build source 객체 3개 | 공유 버킷은 유지, 정확한 객체만 삭제 |
| 11 | Cloud DNS zone `pickitlab-uscentral1-souli` | 모든 NS 캐시 전파 확인 후 레코드와 zone 삭제 |

공유 버킷 `gs://pickit-lab_cloudbuild`의 백업 완료한 SOULI 소스:

```text
source/1777442262.314608-cfed89ad751b42399cf0402ce25d01a1.tgz
source/1777442296.650281-5b12430a932946e895a5e60920eecce2.tgz
source/1777442331.032583-7fefdc7cdfab479c9b7720710c8331f0.tgz
```

각 1,166,703 bytes, 모두 SOULI index/source임을 확인했다. 파일 SHA256은 source-manifest에 있다. 이 버킷의 soft delete 보관은 **7일**이다. 객체 삭제 후에도 그 기간 저장 비용이 남을 수 있으며, 공유 버킷의 보호 정책을 비용 때문에 임의 변경하지 않는다.

**보존 대상**: NEG `pickitlab`, global address `pickitlab`(34.49.57.39), `photocards/`가 있는 bucket `pickitlab`, shared build bucket 자체, 다른 프로젝트와 서비스 계정/IAM. 프로젝트 billing disable이나 전체 프로젝트 삭제를 하지 않는다.

## 삭제 후 검증 및 복구

현재 Run/LB/IP 삭제가 끝났으므로 아래 “삭제 전 문제” 경로는 더 이상 가능하지 않다. Google IP 34.160.139.16은 반환했고 다시 지정하면 안 된다. 다음 작업자는 DNS를 그 주소로 되돌리지 않는다.

각 단계 결과/시각을 Git 제외 실행 기록에 남기고 Google 목록을 다시 조회한다. 같은 이름의 다른 region이나 shared 자원은 삭제하지 않는다. SOULI build trigger는 조사한 global/us-central1에서 없었지만 재조회한다. 자원 부재와 별도로 후행 청구/저장 보관료/다른 프로젝트 비용을 구분한다. 삭제 성공만으로 Google 전체 청구가 즉시 0원이라고 보고하지 않는다.

삭제 전 문제 발생 시 Azure 설정을 보존한 채 양쪽 apex A를 원래 IP로 되돌릴 수 있다. 원래 IP를 반환한 뒤에는 같은 IP 복구를 보장할 수 없다. 그 이후의 복구는 보관한 이미지/config로 Azure 또는 새 Google 자원을 만든 뒤 DNS를 다시 연결하는 절차다. 백업은 현재 PC와 Azure ACR에 있으며 별도 장치/지역 재해 복구 구성은 아직 아니다.

## 완료한 DNS 삭제 절차 — 과거 참고, 재실행하지 않음

1. **2026-10-03 21:00 KST 이후** 새 Azure NS/ALIAS·apex/www/API·docs/TXT 보존 및 일반 DNS 경로의 hosted release 검사를 다시 확인한다. 새 문제나 이전 NS를 가리키는 resolver가 보이면 유지한다.
2. Google zone 레코드를 마지막으로 내보내 Azure 레코드와 대조한다. 사용자가 그 사이 추가한 레코드가 있다면 먼저 Azure에서 보존한다. 이 zone은 `souli.net.`이어야 하며 다른 zone을 삭제하지 않는다.
3. Google zone에서 NS/SOA를 제외한 레코드 각각을 `gcloud dns record-sets delete <정확한 이름> --type=<타입> --zone=pickitlab-uscentral1-souli --project=pickit-lab --quiet`로 제거한다. 이어서 `gcloud dns managed-zones delete pickitlab-uscentral1-souli --project=pickit-lab --quiet`를 실행한다. 와일드카드나 프로젝트 삭제는 사용하지 않는다.
4. zone 부재와 souli.net/docs/API 접속을 재검증해 이 문서·HANDOFF·SITE-RELEASE의 남은 상태를 갱신한다. shared build bucket의 이미 soft-delete된 source는 7일 정책이 자동 처리하며, 공유 정책을 해제하거나 감사 로그를 지우지 않는다.
