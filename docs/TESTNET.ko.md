# SOULI Base Sepolia 테스트넷

2026-10-02. 공식 페이지: https://souli.net/testnet/ . 메인넷 판매는 계속 비활성이다.

## 현재 공개 체인 상태

- 네트워크: **Base Sepolia, chain ID 84532**. Ethereum Sepolia나 Base 메인넷이 아니다.
- 사용자 테스트 지갑: `0x4a4AA86208EcFdBACBaD551dF7baf5D3C84425BB`.
- 테스트 토큰: [`0xD643520BfEb76e59250d56Df8B196F9c751Bc252`](https://sepolia.basescan.org/address/0xD643520BfEb76e59250d56Df8B196F9c751Bc252).
- [토큰 배포 거래](https://sepolia.basescan.org/tx/0x5f2da77517551aeeabcc76e6e6e9c767653349f39aac590ef4bec3b3bc240ce9): 블록 **47,569,412**, 성공 확인.
- `SOULI Sepolia Test - No Value`, `tSOULI`, 소수점 9자리, 최초 10,000,000개를 배포 지갑에 발행했다. **인스크립션이 없는 일반 ERC-20 테스트 대역**이다. 실제 SOULI ERC-20i 복제·가격·보상·메인넷 교환 기능이 아니다.
- 판매 계약: [`0x1B9a694c267D22b83E8dA829c1663603fb37D4D6`](https://sepolia.basescan.org/address/0x1B9a694c267D22b83E8dA829c1663603fb37D4D6). [배포 거래](https://sepolia.basescan.org/tx/0xc02d3324f5aa9ef079445e49d0b3eb926f76132660060a1d7231e98c9b3c577e), 블록 **47,573,821**, 성공. 런타임 코드와 고정 조건을 검증했다.
- 테스트 재고 5,000,000개 승인 및 [입금](https://sepolia.basescan.org/tx/0x37232c13e590df39e91d10e5828a6cae179bac3267584e12cab52a189c406572) → 판매 시작 → [210개 구매](https://sepolia.basescan.org/tx/0xe05ce377b0ecfaa4181065d09d5f56dc796fde6f808973be8d2a6642fca46ef7) → 일시중지 → [미판매 4,999,790개 회수](https://sepolia.basescan.org/tx/0xdafc9ce8712540752b0687a20a66cad38d4f8e743b7e64a90581f0a7a84a6bdc) → 필요한 수량만 재승인 → [4,999,790개 재입금](https://sepolia.basescan.org/tx/0xa6867038d74332f61fcd0f0060616994fa96601736a8602944a22f2d08163f5b) → 판매 재개까지 공개 체인에서 완료했다. 구매자·관리자·treasury는 이번 실행에서 같은 사용자 지갑이었다.
- 마지막 [대금 인출 거래](https://sepolia.basescan.org/tx/0x947f42aae3179c049398c58366d98233ed9d21c7830b84d3a4061402a606459d)도 성공했다(블록 **47,575,301**). `ProceedsWithdrawn`의 수령인은 위 사용자 지갑, 금액은 **0.000000021 test ETH**다.
- 2026-10-02 최종 조회 블록 **47,575,319**: 판매 열림, 재고/판매 가능량 **4,999,790개**, 누적 판매 **210개**, 누적 매출 **0.000000021 test ETH**, 계약 ETH **0**. 재고 승인·입금·구매·중지·미판매 회수·재입금·재개·판매대금 인출의 기본 한 바퀴를 완료했다. 현재 대기 중인 거래는 없다.

실제 조회 증거는 Git 제외 `logs/sale-checks/sepolia-sale-deployment.json`과 `sepolia-sale-0x1b9a694c267d22b83e8da829c1663603fb37d4d6.json`. 다음 작업 때 체인을 다시 확인한다. 조회 명령은 `node scripts/check-testnet-sale.mjs 0x1B9a694c267D22b83E8dA829c1663603fb37D4D6 47573821`이다. 이 명령은 공개 조회만 수행하며 코드·조건·이벤트와 누적 판매량/매출을 대조한다(현재 검사 창은 배포 후 20,000블록 이내). 공유 주소를 `src/testnet/public-sale.json`에 기록하고 공식 `/testnet/`에 배포했다. 지갑 연결 없이 확인할 수 있다. 더 오래된 `sepolia-deployment-status.json`은 판매 배포 전의 역사적 기록이다.

실제 MetaMask에서 발견한 호환 문제를 수정했다. `eth_getTransactionCount`의 숫자 응답을 canonical hex 문자열로 정규화한다. 스마트 계정의 중계 거래는 외부 `from`이 지갑과 다를 수 있으므로, 지갑이 반환한 원래 해시·정확한 계약·계정·수량 이벤트로 성공을 검증한다. 구매는 판매 이벤트와 토큰 전달 이벤트가 모두 일치해야 한다. 임의로 붙여 넣은 다른 중계 해시나 이벤트 발행 주소를 바꾼 영수증은 성공 처리하지 않는다. 공개 조회는 동시 4개 제한의 읽기 전용 RPC로 분리하고, 계정 선택과 거래 전송은 MetaMask에 남긴다. 테스트넷 견적은 승인 시간을 10분 제공하며 메인넷 기본 2분은 그대로다. 첫 구매 시도는 견적 만료로 중계 전 거부되어 체인 거래·지급이 없었고, 새 견적의 구매만 위 성공 기록에 포함한다.

## 화면과 거래 구조

지갑 연결 없이 공유 판매 계약의 재고, 판매 가능량, 판매 수량, 1개 가격, 누적 판매대금, 현재 ETH 잔액을 볼 수 있도록 구현했다. 검증된 공유 주소를 설정하면 공개 RPC로 읽는다. 숫자는 같은 블록 기준이며 블록 번호·갱신 시각·Basescan 링크가 함께 표시된다. 기본 갱신은 30초, 숨긴 탭은 조회를 멈춘다. 실패 시 마지막 숫자가 오래됐을 수 있음을 알린다.

| 항목 | 의미 |
|---|---|
| Tokens in the contract | 계약이 현재 보유한 실제 tSOULI 잔액 |
| Available to buy | 판매 한도와 재고 안에서 구매 가능한 수량 |
| Already sold | 구매자에게 전달된 누적 수량 |
| Price for 1 tSOULI | 고정된 1개 가격, **0.0000000001 test ETH** |
| Total sales earned | 구매로 누적된 ETH. 인출해도 감소하지 않음 |
| ETH still in the contract | 실제 현재 잔액. 대금 인출 시 감소 |

테스트 판매 한도는 5,000,000개, 지갑별 한도도 5,000,000개, 기간은 배포 준비 시점부터 14일이다. 테스트 전용 조건이며 실제 판매 조건이 아니다. owner와 treasury는 배포하는 테스트 지갑으로 설정된다. treasury는 수령 지갑 주소이며 별도 treasury 계약을 배포하지 않는다. 판매 계약이 재고/ETH를 보관하고 구매 시 즉시 토큰을 전달한다. 자동 LP·환불·가격 상승 곡선은 없다.

## 이어서 확인할 순서

1. 공식 `https://souli.net/testnet/`에서 별도 구매자 MetaMask로 구매와 비관리자 제한을 추가 검증한다. 로컬 독립 구매자 자동 테스트는 통과했으나 실제 공개 체인의 두 번째 지갑 흐름은 아직 실행하지 않았다.
2. 메인넷은 별도 출시 단계다. 실제 SOULI ERC-20i의 재고/전송/인스크립션 규칙, 최종 판매 조건, 관리자/treasury, 독립 보안 검토와 사용자 인수 확인을 완료한 뒤 결정한다. 이번 tSOULI 테스트 통과만으로 열지 않는다.

## 관리자와 수령 지갑이 정해지는 방식

`src/testnet/lab.mjs`가 판매 배포 인자 `owner`와 `treasury`에 당시 연결한 사용자 주소를 넣었다. 이 값을 사용자가 MetaMask에서 승인해 Base Sepolia 계약에 기록했다. MetaMask에 출금 규칙을 저장하거나 사이트에 개인키를 전달한 것이 아니다.

- **owner**: 필요한 수량 `approve` 후 `deposit`으로 재고 입금, 판매 중지/재개, 중지 상태에서 미판매 재고 회수. 회수 대상은 owner 자신이다. 다른 사람 지갑에 이미 지급한 구매 토큰은 회수하지 못한다. 소유권 변경은 계약의 2단계 이전 절차다.
- **treasury**: `withdrawProceeds`를 호출해 계약 ETH 전액을 자신에게 받는다. 이 판매 계약에서는 배포 후 바꿀 수 없는 고정 주소다. 이번에는 owner와 같은 사용자 주소지만 실제 판매 설계에서 별도로 지정할 수 있다.
- 구매자가 `buy`로 보낸 ETH가 계약에 쌓이고 tSOULI는 즉시 구매자에게 전달된다. ETH를 일반 송금으로 다시 넣는 경로는 차단했다. 인출 후 다음 구매가 발생하면 새 판매대금이 쌓인다. LP 예치/자동 재투자나 수익 보장 기능은 없다.

현재 브라우저 도구는 일반 Chrome 페이지를 제어하지만 **MetaMask 확장 프로그램 승인 팝업에는 접근하지 못한다**. 이번 실제 거래는 사용자가 각각 승인했다. 개인키/복구 문구를 받거나 승인 요구를 우회하지 않는다. 사용자 부재 중 거래를 완료했다고 보고하지 않는다. localhost와 souli.net은 저장소가 별개이며 공식 페이지는 검증된 공유 주소를 자동으로 불러온다.

## 검증과 안전 경계

- `SepoliaTestSouli`와 `SepoliaTestSale` 생성자는 chain ID 84532만 허용한다. 실제 판매 계약 `SouliEthSale`을 상속한 테스트 래퍼이며 메인넷 배포를 거부한다.
- 프런트는 매 요청의 계정/체인을 확인하고 런타임 바이트코드·불변 조건·terms hash를 검증한다. 메인넷 `LIVE_SALE.enabled=false`와 API `sales:false`는 유지한다.
- 무제한 승인을 쓰지 않는다. 인출은 owner/treasury 역할에 따라 계약에서 제한한다. 미판매 재고 인출 전 판매를 중지한다.
- 거래 요청 전에 의도를 저장하고 탭 간 잠금을 건다. 지갑 거절과 전송 결과 불명을 구분한다. 새로고침 복구는 실제 거래 내용·영수증·블록을 확인한다. 2블록 확인은 L1 최종성을 뜻하지 않는다.
- 계약/클라이언트 자동 테스트 **41개**가 통과했다. 로컬 Base Sepolia 체인 ID 환경에서 독립 구매자 구매, 무권한 거부, 출고/회수/재입고, 누적 매출과 잔액 분리, 분실 배포 해시 복구, 지갑 거절/결과 불명, 중계 영수증의 정확한 수령/이벤트 검증, 10분 견적, RPC 읽기/서명 분리 등을 검증한다. 추가 보안 테스트는 관리자 이전 후 treasury 분리, 정확한 allowance 소비, 수령 계약의 재진입을 다룬다. 공개 체인 완료 범위는 위 기록과 별개이며 **독립 보안 감사가 아니다.** [실판매 보안 검토와 지갑 제안](ETH-SALE.ko.md)을 함께 읽는다.
- 프런트 검증 스크립트 10개, 서버 테스트 23개, production build/runtime 검사가 통과했다. 공식 HTTPS 홈/게임/테스트넷 경로·자산·보안 헤더·메인넷 판매 비활성도 검사했다.

실행: 루트에서 `npm.cmd test`, `npm.cmd run test:sale`. 계약 소스 수정 시 `npm.cmd run compile --prefix contracts` 후 `node scripts/export-testnet-artifacts.mjs`로 공개 ABI/바이트코드를 갱신한다. `scripts/test-testnet.mjs`가 산출물의 소스 해시를 대조한다. 테스트 산출물에 개인키는 포함되지 않는다.

## 배포와 디자인

`testnet/index.html`은 별도 Vite production 입력이다. 기존 Azure Static Web Apps Free에 함께 배포하며 추가 API/DB/서버를 만들지 않는다. `/testnet`, `/testnet/`, `/testnet/index.html`은 같은 화면, `noindex, nofollow`와 `no-store`를 적용한다. Azure는 끝 슬래시를 정규화하므로 `/testnet`과 `/testnet/`을 중복 route로 등록하지 않는다.

`src/styles/souli-palette.css`가 코발트/골드/맑은 파스텔을 정의하고 `souli-brand.css`가 메인·게임·구매 컨트롤의 눌림/그림자/색상을 맞춘다. 공통 CSS가 production에서 entry CSS보다 먼저 로드되어도 적용되도록 마운트 요소로 선택자를 한정한다. 원본 인스크립션 픽셀은 변경하지 않았고 배경과 컨트롤만 정리했다. 동작 줄이기 설정과 작은 dot의 대비 배경을 유지한다.

공식 사이트는 https://souli.net 이다. 과거 Container App 기본 주소는 정적 배포 결과를 보여주는 주소가 아니다. 인프라/배포 절차는 [AZURE-STATIC.ko.md](AZURE-STATIC.ko.md)를 따른다.
