# 세 지갑 개별 관리 · 최신 결정

## 일반 구매자 거래 확인 / 다른 판매 계약 (2026-10-02)

거래 [0x353c…c1c2aec](https://sepolia.basescan.org/tx/0x353ccec02747b205504de0eba7289117cc5990e702e81bf57f5cbfc2cc1c2aec)는 성공했다. 등록 운영자가 아닌 `0x1375b43B72676067079fb66969cb85F33EC1768B`가 210 tSOULI를 0.000000021 테스트 ETH로 구매했고 토큰 잔액 0→210을 확인했다. 블록 47,588,613 / 검증 시 237 confirmations / canonical block 일치. 중계 거래의 외부 송신자와 구매자는 다르며, 실제 판매 계약 Purchased 및 토큰 Transfer 이벤트와 블록 전후 잔액으로 구매자를 검증했다.

단, 대상은 **구 단일 지갑 판매 `0x1B9a694c267D22b83E8dA829c1663603fb37D4D6`**다. 해당 재고는 4,999,790→4,999,580, 누적 판매210→420, 보관 ETH0→0.000000021. 새 세 지갑 판매 `0x534d…8708`의 일반 구매자 검증은 아직 완료되지 않았다. 블록47,588,849에서 새 판매는 재고790/판매210/현재 ETH0/해당 구매자 구매수량0이다. 동일 토큰을 쓰므로 지갑의 총 tSOULI 잔액만으로 어느 판매에서 구매했는지 판단하지 않는다.

상단 기본 구매 대상과 하단 controller 대상이 별개여서 혼동할 수 있다. 새 판매를 테스트할 때 하단 **Use this sale for the purchase form ↑**를 누르고 상단 판매 주소가 `0x534d…8708`인지 확인한다. 근거 `logs/sale-checks/ordinary-buyer-purchase-verification.json`. 이번에는 읽기 검증만 했고 추가 거래를 보내지 않았다.

## 최신 공개 체인 확인 · A 재고 회수·재입금 사이클 완료 (2026-10-02)

사용자 Chrome MetaMask의 A 지갑으로 판매 중지 → 210 tSOULI 회수 → 정확히 210개 사용 승인 → 210개 재입금 → 판매 재개를 완료했다. 거래마다 성공 receipt, canonical block 및 2회 이상 확인과 해당 이벤트/잔액을 대조했다.

| 동작 | Base Sepolia 거래 |
| --- | --- |
| 중지 | `0xddbef031aafa4da4f77cbcfa1718cd67d0ab5b088e11efd6ebcc058f0ea420b3` |
| 210개 회수 | `0x6c174edae16d9023b6bc4fc30d673d4496d8a0c3c941434bb443cf49aa465275` |
| 210개 사용 승인 | `0x41822daf37721816932cd09a0e8c78f3d02b64b97accef624c7642c384e3ea0d` |
| 210개 재입금 | `0xd926edad57ce514677ec5f19ee3a3eb12e2045ccb76abcb02af3818c5c00a315` |
| 재개 | `0x4b9015d5af8a7ecde495626c54df0b6e3a6f2ba0f127686fffcbdff188d4996e` |

최종 블록 47,588,235: paused=false / 재고 및 구매 가능 수량 790 tSOULI / 누적 판매 210 / 누적 매출 0.000000021 테스트 ETH / sale 및 controller ETH 0. 재고는 790→580→790, A 토큰 잔액은 4,999,420→4,999,630→4,999,420으로 복구됐다. A→controller allowance, controller→sale allowance와 controller 토큰 잔량 모두 0. 최종 재개 거래는 검증 시 31 confirmations였다.

증거 `logs/sale-checks/operator-a-inventory-cycle.json`, 종합 기록 `logs/sale-checks/three-wallet-public.json`. B 독립 판매대금 출금과 A 재고 사이클의 공개 체인 검증은 완료됐다. C 실행, 실제 별도 일반 구매자 검증, 기기별 회귀와 독립 보안 검토는 별도다. 메인넷 판매를 열거나 계약 코드를 변경하지 않았다.

## 최신 공개 체인 확인 · B 판매대금 출금 성공 (2026-10-02)

사용자의 승인 후 Base Sepolia 거래 `0x3aaf9a510eff11b671d6b7031ea43f453cf68cbb8ec214bcc509bb4d0ab528b9`를 검증했다. 블록 47,587,639, 성공 status=1, 검증 시 40 confirmations 및 canonical block 확인. B `0x3cDF38407cE65966055aDDF8bfC5B17eF00397e1`가 검증된 controller의 collectProceeds를 직접 호출했다. 동일 receipt의 sale ProceedsWithdrawn(controller, 21,000,000,000 wei)와 controller EtherCollected(B, 같은 금액)를 대조했다. 판매 → controller → B로 0.000000021 테스트 ETH 지급 완료, 두 계약의 ETH 잔액 모두 0. B 잔액은 가스비 차감으로 0.02 → 0.019999695089099612 테스트 ETH다.

근거: `logs/sale-checks/operator-b-withdrawal-verification.json`, `logs/sale-checks/three-wallet-public.json`. 아래 과거 B 출금 미확인 문구는 이 기록으로 해소된다. C 공개 체인 실행, B의 재고 회수/재입고 및 별도 구매자 검증은 이번 출금 성공과 구분한다. 새 거래를 대신 보내거나 메인넷 설정을 바꾸지 않았다.

2026-10-02. 사용자가 Safe를 보류하고, 제공한 세 지갑이 각각 단독으로 출금할 수 있도록 요청했다. 이 문서는 이전 단일 EOA 및 2-of-3 계획보다 우선한다. **다중 승인이 아니다. 세 지갑 중 하나가 승인하면 된다.** 각 지갑의 개인 별칭은 저장소 밖 메모에만 남긴다.

## 구현

`contracts/src/SouliThreeWalletController.sol`이 기존 `SouliEthSale`을 생성하고 그 판매의 owner와 treasury가 된다. 구매 로직을 바꾸거나 Safe를 사용하지 않는다. 가격·수량 한도·기간·termsHash는 기존처럼 고정된다. 신규 controller는 업그레이드, 임의 호출, 임의 수령 주소, 운영자 교체 기능이 없다. 세 운영자는 공개 getters로 확인할 수 있다.

- `depositStock`: 호출 지갑의 유한 승인 수량을 controller로 가져와 판매에 입고. 전후 잔액 대조, 판매 allowance를 0으로 정리. 다른 운영자의 개인 지갑에서 토큰을 가져올 수 없다.
- `pauseSale` / `startSale`: 등록 운영자 한 명으로 중지/재개.
- `recoverInventory`: 판매 중지 중에만 미판매 재고를 controller 경유 호출 지갑으로 회수. 구매자의 토큰은 건드리지 않는다.
- `collectProceeds`: 판매 ETH를 controller로 인출한 뒤 같은 거래에서 호출 지갑으로 전달. 수령 지갑이 ETH를 거절하면 전 과정 revert. controller에 강제 입금된 ETH도 함께 회수될 수 있으므로 `EtherCollected`를 구매 매출로 집계하지 않는다.
- `recoverHeldTokens`: 실수로 controller에 직접 보낸 해당 토큰만 호출 지갑으로 회수. 일반 직접 ETH 송금과 임의 selector는 거절한다.

한 지갑을 잃어도 다른 등록 지갑으로 **계약 안 자금**은 회수할 수 있다. 이미 분실 지갑으로 출금한 자금은 회수할 수 없다. 어느 하나가 유출되면 전체 관리 자금이 위험하다. 운영자 교체 기능이 없으므로 유출/교체 시 정상 운영자가 중지·회수 후 새 주소 구성의 계약으로 이전해야 한다. 공격자와의 경쟁에서 회수를 보장하지 않는다. 별도 복구 문구·기기 보관을 권장하며, 웹이 분실 복구를 대신한다고 표시하지 않는다.

## 테스트넷과 웹

`SepoliaThreeWalletController`는 chainId 84532 배포만 허용한다. 기존 무가치 tSOULI를 사용하며 새 토큰 발행이나 원본 토큰 이동을 하지 않는다. 생성 시 내부에서 별도 판매 계약도 같이 배포한다. 기존 공개 단일 지갑 판매와 섞지 않는다.

`/testnet/` 아래 Three backup wallets 섹션에서 배포/유한 승인/입고/중지/재고 회수/대금 회수/재개를 준비한다. `?controller=0x...#three-wallet` 링크로 다른 기기의 MetaMask 앱 브라우저에서 접근한다. 로드 시 실제 코드·세 주소·토큰·판매 owner/treasury·가격/기간 termsHash를 검사한다. 별칭은 공개하지 않는다.

판매 계약의 원래 구매 컴포넌트는 그대로 사용한다. 새 판매로 전환 버튼을 명시적으로 눌러야 하며, 화면의 판매 주소와 숫자로 구별한다. 승인 중복 방지, Base Sepolia 강제, 계정 변경 확인, 저장된 요청과 정확한 receipt 대조 후 완료 표시를 적용했다. 배포 버튼이 준비됐다는 사실은 실제 체인 배포/휴대폰 E2E 완료가 아니다.

## 검증 기록

새 계약 10개 로컬 테스트: 세 지갑 각각 단독 출금/중지/재고 회수/재입고, 외부 사용자 거절, 단일 지갑의 판매 직접 호출 거절, 잘못된 구성/네트워크 거절, 수령자의 ETH 거절 시 원금 보존과 다른 운영자 회수, 토큰 수량 오류/부족 승인 시 롤백, 직접 송금/빈 인출 거절, 구매 중지/잘못된 ETH 결제 거절.

실제 프런트 모듈 3개 로컬 통합 테스트: 내부 판매 생성 → 새로고침 후 복구 → 유한 승인/입고/재개 → 기존 구매 클라이언트로 다른 사용자 구매 → B 지갑에서 로드/출금/회수/재입고. 잘못된 운영자 목록·네트워크·계정 변경·지갑 취소·모호한 전송 오류도 확인했다. 모든 세부 공개 체인 결과는 배포 후 추가한다. 독립 감사나 실판매 준비 완료가 아니다.

## 현재 공개 상태

프런트는 https://souli.net/testnet/#three-wallet 에 공개했다. 2026-10-02 Base Sepolia 실제 배포 성공:

- Controller: `0x734417B7CAe7D8A00d15ED886d46463d1a64C087`
- 새 Sale: `0x534d2408dE5BA5c8dB54105C38D3040ec7388708`
- 배포 거래: `0x467e0b9fbea0257c02c7e46911aaf0a33ebf658259914ff07170a0ffebd21314`
- 기존 generic tSOULI: `0xD643520BfEb76e59250d56Df8B196F9c751Bc252`

실제 코드, 세 운영자 주소, 토큰, child 판매의 owner/treasury와 고정 조건을 RPC에서 확인했다. A의 1,000 tSOULI 유한 승인 거래 `0xbbde7ccde5aabbcfcbad5d0eae5090069be16511bf6c4c8e64bbff55a4a18a71`도 성공. 이후 A가 1,000 tSOULI 입금에 성공했다. 재고 1,000개, 매출 0, paused 상태다. 기존 단일 EOA 테스트 판매는 유지한다.

MetaMask smart transaction의 중계인 outer hash 때문에 직접 EOA 비교가 거절된 문제를 수정했다. 지갑이 반환해 저장한 hash만 허용하고 검증된 계약이 발행한 해당 동작·operator·수량 이벤트가 있어야 성공 처리한다. 수동 입력한 다른 중계 거래, 잘못된 승인 지갑/대상/수량, inner action 없는 성공 receipt는 거절하고 재요청을 막는다. 신규 관련 2개 추가, 클라이언트 5개 통과(앞선 전체 90개 중 3개 재검증 + 2개 추가). 계약 바이트코드는 바꾸지 않았다.

근거 `logs/sale-checks/three-wallet-public.json`. `src/testnet/public-controller.json`에 공개 주소를 저장했고 페이지에서 연결 없이도 읽기로 대조한다. 기존 공개 단일 EOA 판매와 새 판매는 명시적으로 구분하며 구매 폼은 선택 버튼으로 바꾼다. 새 판매 입금은 실제 체인에서 완료했다. 구매/출금 및 B/C 휴대폰 E2E는 아직 완료가 아니다. 휴대폰은 MetaMask 앱 브라우저로 접속하며 실행 지갑에는 Base Sepolia 테스트 ETH 가스비가 필요하다.

### 실제 재고 입금 확인

2026-10-02 입금 거래 `0xb022ce4c1b5c65107a860f3c0e3b54001a4332afe29bfd08606b0550960facc8` 성공. `StockFunded(A, 1000)` 이벤트, sale 재고 1,000 tSOULI 및 A→controller allowance 0을 대조했다. 유한 승인 수량이 전부 소비됐으며 남은 무제한 승인은 없다. Start sale 요청은 Chrome MetaMask 승인 대기. 확인한 스냅샷 블록 47,584,768.

### 판매 시작 확인

Start sale 거래 `0x533e94236c8860c9a582b2f0514c135670316db898a49bd51297039fd674cb08` 성공. 블록 47,584,824에서 paused=false / available=1,000 확인. 신규 sale을 구매 폼에 명시적으로 선택하고 210개 구매 검증을 진행한다.

구매 폼이 신규 sale `0x534d2408dE5BA5c8dB54105C38D3040ec7388708`를 가리키는 것을 화면에서 확인하고 210 tSOULI / 0.000000021 테스트 ETH 구매를 요청했다. MetaMask 최종 승인 대기, 견적 유효 기한 2026-10-02 19:56:28 KST. 승인 여부가 불명확하면 기존 저장된 요청/receipt를 확인하며 중복 구매하지 않는다.

### 실제 구매 확인

구매 거래 `0x2b9a7cd229d1b95cddd52cc9bbd965244a2c3254795186045847a37bb8cff37c` 성공. 신규 sale의 Purchased(210)와 A에 대한 210×10^9 token-unit Transfer를 확인했다. 블록 47,584,921: 누적 판매 210, 재고 790 tSOULI, 누적 매출/현재 sale ETH 각각 0.000000021 테스트 ETH. A 잔액은 4,999,210→4,999,420 tSOULI. B 지갑 Base Sepolia ETH 잔액 0.02로 가스비 준비됨. 다음은 B 지갑의 실제 독립 출금으로 controller→B 경로 검증. 아직 B/C 공개 체인 실행 완료는 아님.

### 모바일 Chrome 연결 오류 수정

**후속 확인 (2026-10-02):** 사용자가 휴대폰 Chrome에서 MetaMask 승인 후 원래 Chrome에 지갑 주소가 표시된다고 확인했다. 다음은 B 지갑 `0x3cDF…397e1`에서 `Collect test ETH to my wallet` 실행. 출금 영수증 검증 전이며 새로 Approve/Deposit할 필요 없다.

**아래 내장 브라우저 이동안은 이후 사용자 피드백으로 교체되었다.** 최신 구현은 공식 MetaMask Connect EVM 2.1.1 앱 릴레이다. 휴대폰 Chrome/Safari에서 Connect → MetaMask 승인 → 원래 탭으로 돌아오기. 데스크톱은 확장 또는 QR. 구현 `src/lighthouse/wallet-connect.mjs`, `WalletRelayStatus.vue`; 테스트넷과 게임이 공유한다. 첫 페이지 방문에는 SDK/연결 요청 없음, 이전 연결만 조용히 복원. 서명/송금은 여전히 각 동작을 선택한 후 지갑에서 승인한다. 실제 휴대폰 왕복과 B/C 출금은 미확인이고, 공개 UI QR 경로 및 자동 검사만 통과했다. 배포 `static-w1PbC3`, 자세한 근거 HANDOFF 1.22 참고.

공식 문서: https://docs.metamask.io/metamask-connect/evm/quickstart/javascript/ 및 https://docs.metamask.io/metamask-connect/evm/reference/methods/ (2026-10-02 확인). SOULI 별도 연결 서버는 추가하지 않았지만 MetaMask 릴레이는 외부 서비스다. 원래 브라우저로 자동 복귀할지는 모바일 OS/브라우저 정책에 따라 달라질 수 있어 사용자가 돌아오는 안내를 제공한다.

사용자가 휴대폰 Chrome에서 Connect MetaMask를 눌러 desktop-extension-only 오류를 확인했다. 테스트넷 연결은 injected provider만 사용하므로 외부 모바일 브라우저에 지갑이 없어 발생했다. 테스트넷에 다음을 추가했다:

- 휴대폰/태블릿이며 injected provider가 없으면 명시적인 Open in MetaMask 버튼으로 공식 `https://link.metamask.io/dapp/souli.net/testnet/` 앱 링크를 연다. 앱 내부 provider나 MetaMask UA가 있으면 재진입하지 않는다.
- 앱 열기와 지갑 연결/승인/송금은 별도다. 페이지 로드만으로 앱·연결·송금 요청을 실행하지 않는다. 링크로 들어간 MetaMask에서 사용자가 다시 Connect한다.
- 앱이 열리지 않을 때 Explore → browser → 주소 붙여넣기, 주소 복사 및 복사 실패 시 수동 주소 안내. 일반 오류를 잘못된 Chrome 확장 설치 안내로 표시하지 않는다.
- 공유 대상은 souli.net의 /testnet/이며 검증된 공개 controller query와 알려진 section hash만 남긴다. 기타 URL query를 MetaMask 링크로 전달하지 않는다.
- 세 지갑 영역에 별도 Connect 버튼을 추가해 휴대폰에서 맨 위까지 스크롤하지 않아도 된다.

`src/testnet/mobile-wallet.mjs` 및 `scripts/test-mobile-wallet.mjs`; 모바일/태블릿/Windows 터치 기기 구별, 앱 UA, 링크 대상/개인 query 제거 검사 통과. 기존 wallet-provider/testnet 검사 및 production build 통과. IAB의 390px 레이아웃 가로 넘침 없음, 앱 링크 href와 수동 안내/복사 동작 확인. 실제 휴대폰 OS→MetaMask 앱 열기와 B 지갑 출금은 사용자 기기에서 아직 확인 필요. 외부 SDK/relay/server/유료 요금제 추가 없음.

공식 근거: https://support.metamask.io/configure/wallet/how-to-use-the-metamask-mobile-browser/ 및 https://github.com/MetaMask/metamask-mobile/blob/main/app/core/DeeplinkManager/handlers/intent/handleDappUrl.ts (2026-10-02 확인).

모바일 수정 production 배포 성공: `logs/azure-releases/static-m60bU3` (44파일, 2,920,495 bytes). 공개 /testnet/#three-wallet 에서 provider 없는 연결 버튼 → 앱 링크·수동 안내 표시 확인. 앱 링크는 `https://link.metamask.io/dapp/souli.net/testnet/#three-wallet`; 사용자 휴대폰 실행은 미확인. 스크린샷 `logs/sale-checks/mobile-wallet-help-live.jpg`.
