# Base Sepolia 2-of-3 Safe 검증

## 보류 — 2026-10-02 사용자 결정

Safe 생성은 중단했다. 공개 Safe를 배포하거나 유료 구독을 신청하지 않았다. 아래는 보존하는 2-of-3 연구 기록이다. 현재 선택은 [세 지갑 개별 관리](THREE-WALLET.ko.md).


2026-10-02 · 공개 배포 전 준비 · 메인넷 자금 사용 없음

최신 결정은 수동 LP와 **2-of-3 Safe**다. A/B/C 공개 주소는 사용자에게 받았다. 개인 별칭은 저장소/공개 서비스에 넣지 않고 저장소 밖 비공개 메모에만 보관한다. 현재 공개 Safe는 아직 배포하지 않았다. Chrome 공식 `app.safe.global`에서 기존 A MetaMask 연결 승인을 기다리고 있다.

## 먼저 확인한 사실

- Base Sepolia 체인 ID는 84532다. 같은 지갑 주소라도 Base 메인넷의 토큰/잔액과 분리된다.
- 블록 47,582,594에서 A 약 0.004989685 test ETH, B 0.02 test ETH, C 0 test ETH를 확인했다. 개인 서명 승인과 온체인 실행은 별개라 서명만 하는 C가 항상 가스를 내야 하는 것은 아니다. 최종 실행 계정에는 테스트 ETH가 필요하다.
- Safe 공식 배포 레지스트리 `@safe-global/safe-deployments@1.37.63`의 Base Sepolia SafeL2 1.4.1 및 ProxyFactory 주소/실제 코드 해시가 일치했다. 근거 `logs/sale-checks/safe-readiness.json`. 특정 사용자의 Safe 생성 완료를 뜻하지 않는다.
- A/B는 EIP-7702 위임 형태 코드가 관측됐다. 코드가 있다는 이유만으로 잘못된 주소라고 거절하지 않았고 실제 MetaMask 서명 경로는 공개 테스트에서 확인한다.

읽기 전용 재현: `node contracts/scripts/check-safe-readiness.mjs <A 공개주소> <B 공개주소> <C 공개주소>`. 개인키/복구 문구를 인자로 넣지 않는다. 이 스크립트는 서명/전송/배포를 하지 않는다.

## 로컬 통합 검증

`contracts/test/safe-sale.test.mjs`는 모의 승인 함수를 만들지 않고 공식 `@safe-global/safe-contracts@1.4.1`의 SafeL2와 ProxyFactory 배포 바이트코드를 실행한다. npm tarball 무결성을 대조하고 ABI/바이트코드를 `contracts/vendor/safe-1.4.1/`에 보존했다. 출처/해시는 `provenance.json`, 라이선스는 동봉 파일을 따른다. 외부 패키지 설치 스크립트는 실행하지 않았다. 구형 ethers 개발 의존성과의 충돌을 피하기 위해 계약 테스트용 출력만 사용한다.

독립 로컬 계정/체인 31337에서 실제 Safe 프록시를 만들고 owner/treasury 모두 Safe로 지정했다. 다음 9개가 통과했다.

1. 소유자 세 명, threshold 2, 추가 모듈 없음, Safe 재고 입고/유한 승인 소진, 다른 구매자의 정확한 토큰 지급.
2. 서명 하나, 같은 서명자 중복, 권한 없는 서명자를 섞으면 거절. nonce/잔액 보존.
3. A+B 대금 인출.
4. A+C 대금 인출.
5. B+C 대금 인출. 실행 가스 지불자는 다른 계정이어도 서명 기준은 유지.
6. 개별 소유자의 판매 계약 직접 출금/일시중지 호출 거절.
7. 두 승인으로 중지·미판매 재고 회수·재입고·재개. 구매자의 기존 토큰은 유지.
8. 실행된 서명의 재사용 및 목적지 변경 거절.
9. 잘못된 재고 회수 호출의 실패와 올바른 중지 후 재시도.

전체 계약/클라이언트 **77개**(기존 68 + Safe 9), 프런트 10개 스크립트·서버 23개·빌드·격리된 런타임 패키지 검사가 통과했다. 로컬 서명은 테스트 계정이며 사용자의 휴대폰/공개 Safe E2E 검증은 아직 아니다. 독립 감사도 아니다.

## 공개 테스트 진행 순서

1. 공식 Safe 화면에서 Base Sepolia를 선택하고 소유자 A/B/C, threshold **2**, 표시 이름은 비개인적 `SOULI Test Treasury`로 준비한다. 키를 가져오거나 기존 EOA 잔액을 Safe로 자동 이전하는 과정은 아니다.
2. 사용자가 MetaMask에서 연결/배포 요청의 네트워크와 내용을 확인한다. 생성 후 온체인 소유자·threshold·singleton·modules·guard·fallback handler를 읽어 실제 화면과 대조한다. 테스트넷을 지원하는 공식 UI 경로가 없으면 표준 Safe 배포 경로를 별도로 검토하며 메인넷으로 대체하지 않는다.
3. 기존 Sepolia 판매의 treasury는 변경 불가이므로 **Safe를 owner와 treasury로 지정한 새 테스트 판매 계약**을 만든다. 기존 공개 테스트 상점은 그대로 남기고 새 테스트 주소/조건을 별도로 공개한다.
4. 원본 SOULI가 아닌 무가치 tSOULI만 Safe로 넣는다. Safe에서 정확한 판매 재고만 승인·입고하고 판매를 연다. 서명은 Safe의 공식 화면에서 모으며 개인 EOA용 관리 버튼으로 가장하지 않는다.
5. 별도 구매자가 테스트 ETH로 구매한다. 구매자 토큰 증가/판매 재고 감소/판매 ETH 증가를 확인한다.
6. 휴대폰 MetaMask/지원 지갑으로 동일 Safe의 대기 거래를 확인한다. 한 서명으로 실행 불가, 두 번째 서명 후 실행 가능을 검증한다. 서명자는 내용을 보고 승인하고 실행자는 테스트 가스비를 낸다.
7. 판매대금은 Safe 자신의 호출로 Safe에 인출한다. Safe에서 임의 목적지로 자동 나가는 구조가 아니다. 중지·재고 회수·재입고도 반복한다.
8. 수동 LP는 선택한 DEX 버전의 해당 테스트넷 실제 배포 주소/코드를 먼저 확인한 뒤 진행한다. 공식 Base Sepolia DEX 배포가 없으면 같은 버전의 로컬 Base 포크/명시한 테스트 복제 계약으로 별도 시험한다. 복제 풀을 '공식 Uniswap 상장'으로 표시하지 않는다.
9. 모든 거래 해시/블록/금액/서명 조합과 실패 결과를 기록한 뒤에만 통과 표시한다. 메인넷 출시와 독립 보안 검토는 별도다.

휴대폰에서 localhost URL은 이 PC를 뜻하지 않는다. 실제 Base Sepolia Safe는 체인에 존재하므로 공식 Safe 웹 인터페이스에서 접근할 수 있다. 커스텀 `/testnet/`의 새 주소 대시보드를 휴대폰에서도 보려면 HTTPS 공개 테스트 페이지에 새 주소를 명시적으로 반영해야 한다. 기존 공개 테스트 상점 수치를 새 Safe 결과로 재표시하지 않는다.

공식 근거: [Safe 승인 기준/실행 구조](https://docs.safe.global/advanced/smart-account-concepts), [Base Sepolia Transaction Service](https://docs.safe.global/core-api/transaction-service-reference/base-sepolia), [공식 배포 레지스트리](https://github.com/safe-global/safe-deployments).
