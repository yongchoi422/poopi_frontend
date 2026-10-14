# souli.net 호스팅 확인 기록

**과거 조사 기록:** 2026-10-01 Azure로 DNS를 전환했고, 10월 2일 SOULI 전용 Google 웹 서버/로드밸런서/IP/저장소를 삭제했다. Google DNS도 사용자 즉시 삭제 요청으로 제거했다. 현재 운영은 [Azure 이전 기록](AZURE-MIGRATION.ko.md), 삭제 상태는 [Google 정리 기록](GOOGLE-CLEANUP.ko.md)을 따른다. 아래 옛 Google URL/IP/서버 이름은 현재 배포 대상으로 사용하지 않는다.

확인일: 2026-09-30. 공개 DNS/HTTP/RDAP와 로그인한 클라우드 콘솔을 읽기 전용으로 대조했다. 배포·DNS 변경·IAM 수정·API 활성화는 수행하지 않았다.

## 확인된 운영 경로

| 항목 | 확인값 |
| --- | --- |
| 도메인 등록기관 | Whois Corp. (후이즈), Verisign RDAP 조회 |
| Google 프로젝트 | Pickit Lab / `pickit-lab` |
| Cloud DNS 영역 | `pickitlab-uscentral1-souli`, DNS 이름 `souli.net.` |
| 루트 A 레코드 | `34.160.139.16`, TTL 18000초 |
| 권한 네임서버 | `ns-cloud-b1` ~ `ns-cloud-b4.googledomains.com` |
| HTTPS 로드밸런서 | `souli`, `34.160.139.16:443` |
| HTTP 리다이렉트 리소스 | 로드밸런서 목록의 `souli-redirect` (세부 규칙 미검토) |
| 백엔드 서비스 | `souli`, Cloud CDN 사용 설정 |
| 서버리스 NEG | `souli`, `us-central1` |
| NEG 대상 | Cloud Run 서비스 `souli`, `us-central1` |
| Cloud Run 기본 URL | `https://souli-296756655338.us-central1.run.app` |
| 현재 트래픽 revision | `souli-00011-bzr`, 최신 버전으로 100%, 2026-04-29 15:01:08 KST 배포 |
| 문서 사이트 DNS | `docs.souli.net` → GitBook CNAME |

공개 souli.net은 HTTP 200, `Server: Google Frontend`, `Via: 1.1 google`로 응답했다. 공개 A/NS와 콘솔의 DNS가 일치하고, 로드밸런서의 같은 IP에서 Cloud Run까지 연결을 확인했다. `www.souli.net`은 조회 당시 DNS 이름이 없었다. `www` 지원을 추가하려면 별도 DNS·인증서·리다이렉트 검토가 필요하다.

## 다시 찾는 방법

- [Cloud DNS 영역](https://console.cloud.google.com/net-services/dns/zones/pickitlab-uscentral1-souli/details?project=pickit-lab)
- [souli 로드밸런서](https://console.cloud.google.com/net-services/loadbalancing/details/httpAdvanced/souli?project=pickit-lab)
- [서버리스 NEG](https://console.cloud.google.com/compute/networkendpointgroups/details/region/us-central1/souli?project=pickit-lab)
- [Cloud Run 서비스](https://console.cloud.google.com/run/detail/us-central1/souli?project=pickit-lab)

Google 콘솔은 `stevechoi@oinng.com` 계정으로 접근했다. `Pickit Lab`과 이름이 비슷한 `pickit`은 다른 프로젝트다. 검색창의 결과 없음은 전체 계정에 리소스가 없다는 의미가 아니었다. 조직 전체 Cloud Asset 검색은 `cloudasset.assets.searchAllResources` 권한 제한이 있었지만, 해당 프로젝트의 DNS·로드밸런서·NEG는 조회할 수 있었다.

`yongchoi422@gmail.com`의 Drive와 Gmail에서 SOULI/poopi 관련 기록을 검색했다. 결정적 단서는 Google Doc **deploy moofy, souli on google (also, other commands)**의 SOULI 항목이었다. 해당 기록은 `pickit-lab`과 `us-central1-docker.pkg.dev/pickit-lab/souli/souli:1.0` 이미지 경로를 명시했다. 이는 2025-01-13 수정된 과거 배포 메모이므로 현재 실행 중인 이미지 버전이라고 단정하지 않는다. 문서의 다른 프로젝트 설정이나 인증정보는 이 기록에 복사하지 않는다.

Azure도 같은 업무 계정의 Default Directory에서 Resource Graph를 조회했다. 조회 가능한 리소스 101개 중 이름에 `souli`가 있거나 속성에 `souli.net`이 포함된 항목은 0개였다. 이 결과는 해당 디렉터리와 접근 권한 범위에 한정된다. Vercel 응답 헤더나 저장소 Vercel 설정은 찾지 못했고, 현재 확인된 실제 운영 경로는 위 Google Cloud 구성이다.

## 수동 배포 전에 남은 확인

1. 위 현재 revision·트래픽 배분을 배포 직전에 다시 확인하고, 아직 읽지 않은 이미지 digest를 확보한다. 콘솔에는 이전 `souli-00010-zxc` 등 0% revision도 남아 있으나 실제 롤백 가능성은 별도 검증한다. 과거 문서의 Docker push 명령을 그대로 실행하지 않는다.
2. 현재 배포 트리거·빌드 설정·컨테이너 포트와 서비스 구성을 확인한다. 이번 조회는 새 자동 배포를 만들거나 기존 트리거를 바꾸는 작업이 아니다.
3. 새 게임 API의 저장 DB·같은 origin 쿠키·HTTPS·허용 지갑·복원 절차를 준비한다. 기존 정적 웹 배포를 찾았다고 새 게임 서버까지 운영 중인 것은 아니다.
4. API를 Azure에 둘지 기존 Google 프로젝트 안에 둘지는 별도 운영 결정이다. 현 Node 컨테이너는 이식 가능하지만 DB와 세션 경로 검증 없이 배포하지 않는다.
5. 테스트 환경에서 홈과 게임, 점 원본, 서버 저장, 실제 MetaMask 로그인까지 확인한 뒤 수동 출시한다. 판매·보존 전송은 별도의 계약 검증과 연결 작업이 필요하다.
