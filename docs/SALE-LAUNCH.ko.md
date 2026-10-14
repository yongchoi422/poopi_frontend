# SOULI 실판매 준비 · 게임 완성 전 출시안

## 1.49 · 50:50 확정 / 완판 기준 V2 구현 (2026-10-03)

사용자가 50:50을 승인했다. 첫 판매420만 SOULI(공급2%), 달력 마감 없음, 실제 구매 ETH50% 수동LP+별도SOULI/50%운영으로 진행한다. FDV15M/공급210M 참조에서 완판매출약300kUSD → LP ETH150k+별도210만SOULI명목150k=LP양쪽300k, 운영150k비용전. 판매+LP재고630만(3%). 과거90일/15:85/양쪽LP50–100k 목표는 현재 기준에서 대체됨. 지갑한도700k는 제안, 단가/ETH환율기준/시작시각/nonce/LP실행시점·소유·잠금/예산은 미정. 완판을 LP의 필수조건으로 추가하지 않는다. LP전에 고정가 판매중지/가격·재고 검토.

V1 source/creationbytecode 및 기존 공개testnet artifact를 그대로 보존하고 별도 SouliEthSaleV2 / SouliThreeWalletControllerV2 생성. VERSION2, endsAt0=no deadline, 시작시각/짧은견적TTL/고정판매한도/누적지갑한도 유지. 50:50 policy를 termsHash에 포함(집행강제 아님), manifest/실제version/runtime검증, release도구는version별artifact를선택. V1 zeroend거부 및기존review직렬화유지. draft는version2/cap4200000/end0, 나머지null이라 배포불가. policy/calculator/doc갱신.

검증: V2추가9 + 기존125 = 계약134 PASS.10년후구매/견적만료/유한기한호환/완판100년후재개불가/불완전결제·토큰실패·무권한·재진입·거부수신자/원본ERC20i420만stock/실제관리client입출금 검증. 공개Base RPC/서명/신규거래를사용하지않은 로컬검사다. logs/sale-checks/commercial-v2-{test,full-contracts}.log 및evidence.json. 보안추가범위는 docs/SALE-SECURITY-REVIEW.ko.md. 독립감사 미완료.

로컬 홈/구매상세/백서v2.3에 승인50:50과630만재고계산 반영. 무기한을1970날짜로표시하지않음. V2관리자는 누적매출기준50:50예산을표시하되 실제잔액/LP증거아님을설명. V1pilot에는 이정책을소급표시하지않음. 새배포/실판매개시 없음. 공개는 static-7NLqd2/v2.1, /buy/와MAINNET_ADMIN 비활성. 마지막확인pilot상태중지/빈계약. 추가서명요청없음.

A의EIP7702와기존EOA배포경로호환성은아직미해결; preflight안전장치그대로. 조건·배포경로/독립검토→새중지V2배포와실물소액사이클→소스검증·공개조건/manifest일치→판매개방 필요. 해당시점수량/가스/주소를최종검토하고서명받는다. 다른3D게임스레드파일은수정하지않음.


## 2026-10-03 후속 선택 — HANDOFF 1.48 우선

90일 대신 완판 기준(달력 마감 없음)을 선택했다. 현 계약의 무기한 지원은 미구현이며 배포 전 별도 수정/검토가 필요하다. 판매420만 개와 별도LP재고를 구분한다. 자금은50:50추천을 비교 중이고 아직 승인 전이다. 이 안의$300k매출은 LP양쪽$300k/운영$150k이며, 이전양쪽LP$50k–100k목표보다큰계획이다. 최신계산은 `COMMERCIAL-SALE-PLAN.ko.md`/`commercial-round-proposal.json`. 계약·웹 설정·공개 배포 변경 없음. 아래90일/15:85는 이전 제안 기록이다.

## 2026-10-03 최신 조건 변경 — HANDOFF 1.47 우선

사용자 최신 답변에서 LP $50,000–$100,000은 **ETH와 SOULI 양쪽 합계**다. 첫 판매 희망 매출은 $200,000–$300,000. 아래 과거의 $50,000 ETH-only/700,000판매/첫판매전액LP 시나리오는 더 이상 현재 제안이 아니다. `COMMERCIAL-SALE-PLAN.ko.md`가 최신 조건 검토안이고 `SALE-SECURITY-REVIEW.ko.md`가 이번 내부 보안 검토다. 4.2M판매/700k지갑한도/90일/ETH15%LP+별도SOULI/85%운영은 승인 대기 제안이며 배포 manifest는 비활성이다. 현재 A의 EIP-7702 상태와 기존 EOA배포 도구 호환성을 먼저 검증한다. 독립감사 미완료, 신규 공개 거래·배포 없음. 게임 Cooking/원본보기 CTA 및 백서v2.2는 로컬 초안이다.

## 최신 상태 · 소량 메인넷 흐름 완료 (2026-10-03)

42개입금→일반구매자1개구매→판매중지→미판매41개회수→대금0.000026684264049332ETH A지갑수금까지 성공했다. 계약은중지/재고0/ETH0, A999개/구매자1개/allowance0. 회수 tx0x0e70c838a1a137b329e5b50fca8dccf5c2f04008e46e56f08ab4c7f5537e2563, 수금 tx0x2f955eb0cb8f6d9d17d823f635ae93275f9a63a9b1edbd4c4e88b99a9fd69316. 거래대기없음. 수금은 LP투입이 아니며 누적판매기록은남는다.

정식판매는아직닫힘. 새 Manrope UI와백서v2.1/실제영수증은 Azure SWA Free static-7NLqd2에공개. 독립감사·정식조건/배분조정·기기별추가검증은별도. HANDOFF1.46이 아래 과거대기상태보다우선한다.

## 2026-10-03 후속 공개 및 대기 상태

MetaMask 전용으로 확정. 원본 inscription/공유 화면을 기존 Azure SWA Free static-zp2N2e로 공개했고 https://souli.net/soul/ 에서 사용할 수 있다. 현재 실제 일반구매1개 확인, 재고41개/대금26684264049332wei. pauseSale 요청은 사용자 MetaMask 서명 대기이며 재고·대금회수는 미완료다. HANDOFF1.44가 아래 과거상태보다 우선한다.

## 최신 실행 상태 · 원본 메인넷 pilot (2026-10-03)

**갱신:** 일반 구매자 지갑의 1SOULI 구매 성공을 확인했다. tx `0xa5c53410b5af2935dcab5e2bb6f9ebc5b59b6cfbc26083953821f01ce85234d5`, Base52,110,072. Purchased·원본Transfer·잔액1개·재고41·판매대금26684264049332wei 일치. 아래 sold0/일반구매 대기는 이전 시점 기록이다. 메인넷 재고회수·판매대금수금은 아직 남아 있다. 새 My SOULI/공유 UI는 로컬 구현이며 공개 릴리스 변경 없음. HANDOFF1.42와 `docs/WALLET-COMPATIBILITY.ko.md` 참고.

**휴대폰 구매 URL: https://souli.net/pilot/**. 기존 Azure SWA Free에 static-gpw3FA로 공개했다. 실제 Base 메인넷의42개 한도 pilot이며 일반정식판매 `/buy/`는 계속닫혀있다. 1개0.000026684264049332ETH+가스. 사용자기기에서지갑연결/실제구매와수령을확인한뒤회수검증을이어간다. noindex/no-store로검색노출·캐시를줄이지만접근을비공개로제한한것은아니다. 서버/계약추가배포없음. HANDOFF.ko.md1.41 참조.

아래 제안 이후42개 한도의 별도 Base pilot을 실제 배포했다. controller `0xD643520BfEb76e59250d56Df8B196F9c751Bc252`, sale `0x83bcB8Ba9b7518CDEc32f2eE0e684f1d7b4ffB01`. 배포·권한·코드·고정조건 검증 및 Sourcify creation/runtime exact match 완료. 독립감사 아님. 초기 draft는 변경하지 않고 `contracts/release/base-pilot.review.json`을 실제 실행 조건으로 보존했다. 1개0.000026684264049332ETH, cap42/wallet10, 2026-10-10 14:36:07KST 종료이며 상업판매 조건 확정이 아니다.

정확히42개 사용승인 및 입금 성공. Base블록52,109,407에서 원본42개 이동과 StockFunded, 블록52,109,539에서 판매 시작을 확인했다. 현재 A958개/재고42개/잔여승인0개/소량판매Open/sold0이다. 일반구매용지갑 선택 대기이며 아직 실제 구매·재고회수·수익금 회수를 메인넷에서 완료하지 않았다. public 상업구매/관리 manifest는 disabled, 사이트는 기존 릴리스 유지. 무료RPC의 과거블록 조회 제한은 대체 읽기 경로로 보완했고, 이미 성공한 승인거래는 재전송하지 않았다. 전체 진행/tx/증거는 HANDOFF.ko.md1.38~1.40. 아래 ‘공개거래0’·‘pilot 배포불가’ 문장은 당시 로컬 검증 시점의 기록이다.

## 수량·모습 안내와 ETH 가격/검증 실행안 (2026-10-03)

**검증 완료:** 원본 Base블록52,106,731의 로컬31337 복제 환경에서 레벨4의500000→500001→500000 모습 변경, 정확한seed 이전으로 Stable 보존, 이후추가구매가 Stable을 유지하고 새Dynamic 생성, 동일수량 다른구매자의 다른모습, 재고회수/대금수금/ETH보존을 확인했다. 마지막재고 전체구매는 기존판매자 모습을 그대로 보존할 수 있어 ‘매 구매 무조건 새 추첨’이라는 설명은 부정확하다. `contracts/scripts/check-inscriptions-fork.mjs`, 결과 `logs/sale-checks/inscriptions-base-fork.json`. 모든 거래는 로컬이며 공개거래0건, 독립감사와 실제메인넷 검증은 별도다. 읽기RPC의 과거블록403은 계약실패가 아니며 공식RPC 읽기전용 중계로 최종검사를 완료했다.

구매자는 수량을 선택하고, 새 Dynamic inscription의 seed 수량 구간에 따라 레벨이 정해진다. 같은 레벨의 모습은 seed와extra에 따라 다를 수 있다. 추가·감소가 Dynamic 상태를 바꿀 수 있으며, 정확한 개별 seed 수량 전송은 조건을 충족할 때 모습을 Stable로 보존한다. 모든 구매가 무조건 신규 캐릭터를 따로 만들거나 다시 추첨하는 것은 아니다. /buy/에 같은 레벨의 원본 예시4개와 수량을 바꾸지 않는 예시 순환 버튼을 추가했다. 5레벨20개 예시는 Base블록52,106,364의 실제 getSoul/getSvg 읽기다. 동일 입력의 결정론적 렌더링이며 확률·희귀도·유일성 보장은 하지 않는다.

**가격 기준:** 사용자 선택 FDV15,000,000USD / 공급210,000,000 = 1SOULI당1/14USD(약0.07142857USD). 배포 직전 합의한 ETH/USD값 E에 대해 단가는 ceil(10^18 / (14×E))wei/정수SOULI로 정한다. 정수 소수점 변환으로 반올림을1wei 미만 오차로 제한하는 scripts/plan-launch-pricing.mjs와 검사를 추가했다. 도구는 실제 판매 설정을 바꾸거나 거래를 보내지 않는다.

| ETH/USD 가정(현재 시세 아님) | 1SOULI의 ETH | 700,000개 총결제ETH |
|---|---:|---:|
| 2,500 | 0.000028571428571429 | 20.0000000000003 |
| 3,000 | 0.000023809523809524 | 16.6666666666668 |
| 4,000 | 0.000017857142857143 | 12.5000000000001 |

고정ETH 회차를 추천한다. 기준 시각과 출처를 공개하고, 이후 ETH/USD 변동에 따라 USD환산FDV도 바뀐다고 설명한다. 50,000USD는 기준 시점의 목표이며 실시간 달러 보장은 아니다. 첫 판매700,000개와 별도LP700,000개를 분리한다. docs/launch-price-scenarios.json은 예시일 뿐 live견적이 아니다. 실제 unitPriceWei/가격 기준 시각·출처/판매한도/지갑한도/기간/nonce는 아직 확정하지 않았다.

제품 측면에서 이 단가의 신규 레벨2는1,500USD, 레벨3는약10,714.29USD, 레벨4는약35,714.29USD, 레벨5는약178,571.43USD이다. 레벨5 최소250만 개는70만 개 첫 판매 전체 한도를 초과한다. 높은 inscription 레벨을 게임 이용/성장의 필수 조건으로 쓰지 않으며 작은dot부터 플레이를 제공한다. 실제 한도를 넘는 레벨 구매 프리셋은 판매 활성화 때 비활성 표시한다.

**권장 검증 순서:** 이미 배포한 일반tSOULI의 Sepolia 입출금·구매 증거 → 실제 원본SOULI를 복제한 로컬 Base포크의 level4/Stable/판매·회수 통합검사 → 원본SOULI 소량의 Base 메인넷 pilot → 최종 상업 판매. 일반 코인을 메인넷에 새로 만들어 성공해도 ERC20i 전송을 검증한 것이 아니다. 현재 production계약과 릴리스 도구는 원본SOULI 주소/코드를 제한하므로 그 검사를 우회해서 임의 토큰을 받도록 바꾸지 않는다.

pilot 제안은 contracts/release/base-pilot.draft.json에 재고/한도42SOULI, 지갑한도10SOULI로 분리해 준비했다. 실판매 재고와 분리한 제안이며, 가격·기간·nonce는 null이라 배포 불가다. 참조가격에서42개 전체는3USD 상당이고 가스는 별도다. 실제 메인넷에는 테스트 ETH가 없으며 지갑의 실제ETH로 승인해야 한다. 최종가스와 호출데이터를 확인하고 사용자 서명 후에만 배포/입금/일반지갑1개+추가1개구매/2확인/중지/남은재고회수/대금회수를 실행한다. 독립검토와 explorer소스 공개는 별도이며, 소액pilot 성공도 보안감사를 대체하지 않는다.

소액pilot 주소와 상업 판매 주소/재고/매출을 혼합하지 않는다. 공개 LIVE_SALE과MAINNET_ADMIN은 검토 전 계속 비활성이다. 실제 배포 후 원본계약/관리자3주소/코드해시/정수가격/한도/기간/treasury를 읽기로 대조한 뒤 승인된 실판매만 공개한다. [Base 네트워크 식별](https://docs.base.org/base-chain/api-reference/ethereum-json-rpc-api/eth_chainId), [Ethereum 테스트넷 설명](https://ethereum.org/developers/docs/networks/), [Solidity 공개상태·난수 주의점](https://docs.soliditylang.org/en/latest/security-considerations.html#private-information-and-randomness).


## 2026-10-03 구현 진행

- /buy/: 레벨 예시 선택 → 정수 수량 → ETH 견적/리뷰 → 지갑 서명 → 2확인/수령 검증. 세부 조건은 펼쳐서 읽고, 메인 구매 링크는 이 페이지로 연결한다. 현재 가격 미정·판매 닫힘.
- /manage/: 고정된 검토 manifest로만 관리 계약을 연결한다. URL/로컬 저장소로 계약 주소나 운영자를 바꾸지 않는다. 연결된 A/B/C에게만 조작 UI를 보여주며, 최종 권한은 계약이 강제한다. 페이지/공개 잔액 자체는 누구나 볼 수 있고 웹 로그인 비밀 영역이 아니다.
- /manage/?network=testnet: 검증된 기존 Base Sepolia controller/sale을 읽는다. 한정 승인·재고 입금·판매 개시/중지·재고 회수·ETH 회수·승인 해제·controller에 잘못 보낸 토큰 회수를 지원한다. 임의 수신 주소 입력은 없으며 요청한 등록 지갑으로 회수된다. 기존 /testnet/도 유지한다.
- 모든 관리자 요청은 사전 리뷰, 지갑/네트워크 재확인, 같은 블록의 코드·operator·owner·treasury·판매 조건 검사 후 요청한다. 브라우저 간 중복 방지, 저장 후 서명, 거래 hash 보존, 정확한 이벤트·정규 블록·2확인 기반 복구를 적용했다. 애매한 실패는 재전송하지 않고 복구하도록 막는다.
- 계약/클라이언트104개 통과(현재 구현 및 과거 연구 테스트 포함). 새로운 공개 거래/메인넷 배포는 보내지 않았다. UI 시험용 가짜 provider는 로컬 tmp에만 있으며 모든 서명/전송을 거부하고 배포 산출물에 포함하지 않는다.
- verify 도구는 candidateAdminManifest도 만든다. 배포 검증 후 src/sale-admin/config.mjs의 MAINNET_ADMIN과 구매 manifest를 따로 검토해야 한다. 지금 둘 다 disabled다. 이 화면 구현은 최종 조건·독립 보안 검토·소량 메인넷 검증을 대신하지 않는다.

이 절이 아래의 ‘메인넷 관리자 UI 구현이 남는다’는 과거 표현보다 우선한다. 실제 계약 연결/운영 검증은 여전히 남는다.


2026-10-02. 개발·운영 제안과 실제 검증을 구분한다. 현재 메인넷 구매는 닫혀 있고 이 문서는 판매 승인 또는 보안 감사가 아니다.

## 출시 순서

게임 전체를 완성해야만 판매 코드를 배포할 수 있는 구조는 아니다. **기존 Base SOULI와 inscription은 지금 전달하고, 게임은 개발 중이라는 사실을 공개하는 판매**로 준비한다. 완성 게임·베타 초대권·수익·상장을 구매 대가로 약속하지 않는다. 기존 판매 준비 → 게임 베타 → 실판매라는 일정은 강제 조건이 아니다.

추천 순서는 구매·관리 검증 마무리 → 최종 판매 조건·공개 설명 검토 → Base 실판매 계약 배포와 소량 검증 → 구매 개방 → 플레이 가능한 작은 게임 베타를 계속 개선하는 것이다. 게임 개발과 판매 준비는 병행한다. 판매 시작 전에는 홈페이지와 결제창의 실제 제공 기능이 일치해야 한다.

## 무엇을 이미 확인했나

| 항목 | 결과 / 범위 |
|---|---|
| 일반 사용자 구매 | 공개 Base Sepolia 성공. A/B/C가 아닌 지갑이 210 tSOULI를 수령. **구 판매** `0x1B9a…D4D6` 거래이며 새 판매의 실기기 증거와 구분 |
| 새 세 지갑 판매 | 공개 Sepolia 배포·재고 입금·A 구매·B 대금 출금·A 중지/회수/재입금/재개 성공 |
| C 독립 실행 | 로컬 계약 테스트 통과. 공개 Sepolia C의 실제 기기 승인은 아직 미확인, 사용자가 후속 테스트로 미룸 |
| 일반 지갑 → 새 공개 판매 | 새 판매 `0x534d…8708`에서 별도 사용자 실기기 구매 기록은 아직 없음 |
| 계약·클라이언트 자동 검사 | 2026-10-02 전체 95개 통과. 보존한 자동 LP/Safe 연구 테스트도 포함하며 현재 출시가 그 구조라는 뜻은 아님 |
| 웹 검사 | 프런트 검사, 서버 23개, production build 및 런타임 패키징 통과 |
| 원본 SOULI + 세 지갑 구조 | 실제 Base 블록52,081,355의 로컬 복제 환경 통과. 일반 지갑210→220 dynamic seed·SVG, C 회수/재입금, B 수금, 마지막780 stable seed 및 잔액 보존 |
| 독립 보안 감사 | 미실시 / 보고서 미공개. 위 검사는 독립 감사나 무결점 보증이 아님 |

일반 구매 재확인: `node logs/sale-checks/verify-ordinary-buyer.mjs`. 거래 `0x353ccec02747b205504de0eba7289117cc5990e702e81bf57f5cbfc2cc1c2aec`, 블록47,588,613. 2026-10-02 블록47,591,549에서 새 판매는790재고/210누적판매/현재ETH0, 일반 구매자의 새 판매 `purchased`는0이었다.

테스트 화면은 새 판매를 기본으로 사용한다. 기존 브라우저에 저장된 구 판매는 자동으로 덮어쓰지 않고 **Earlier shop → Use current test shop**으로 전환한다. 영수증은 유지하고 미확인 구매가 있으면 전환을 차단한다.

원본 토큰/새 관리 계약 통합 검증은 `contracts/scripts/check-three-wallet-fork.mjs`로 재현한다. 공개 Base는 읽기만 하고 모든 배포·가짜 ETH·구매는 로컬31337 체인에서만 실행한다. 성공한 최신 결과는 `logs/sale-checks/three-wallet-base-fork.json`에 기록한다. 공개 Sepolia의 generic tSOULI 테스트와 별개다.

## 제안하는 첫 판매 규모 — 아직 확정 조건 아님

총 공급210,000,000 SOULI와 사용자가 제시한 **$15M FDV 기준**이면 계산상1 SOULI는 약$0.07142857다. 이는 거래 시장 평가액·보장 가격이 아니다.

| 계산안 | 수량/의미 |
|---|---|
| 첫 판매 | 700,000 SOULI → 기준 시점 약$50,000 상당 ETH |
| 별도 LP 재고 | 기준 판매 단가와 같은 비율의 경우700,000 SOULI. 첫 판매 재고와 별도 보관 |
| 필요 SOULI 합계 | 1,400,000, 총 공급의 약0.667%. 매출은$50k이며 두 자산을 합친 초기 LP 명목평가는 약$100k라는 차이를 설명 |
| 판매 후 | 고정가 첫 판매를 닫고 실제 LP 거래·소유권을 공개. 이후 운영비 판매는 별도 조건/회차로 검토 |

위 수치는 **고정 ETH 가격을 결정하는 시점의 환산**이다. ETH/USD가 변하면 USD 매출·FDV 환산은 달라진다. 계약은 실시간 달러 목표를 추적하지 않으므로 ‘항상 정확히$50,000에서 종료’라고 표시하면 안 된다.

700,000개 규모라면 레벨5의2,500,000개 신규 seed는 첫 판매에서 만들 수 없다. 레벨4는500,000개, 레벨3는150,000개, 레벨2는21,000개 최소이므로 지갑 한도를 정할 때 레벨 선택 UI도 함께 검토한다. 가장 작은 dot은1 SOULI부터다. 높은 레벨이 손쉽게/저렴하게 열린다고 홍보하지 않는다.

초기 판매대금의 LP 사용 의도는 유지한다. 이를 운영비로 임의 전용하는 새로운 승인을 받은 것이 아니다. 코드상 인출/다른 용도 사용은 가능하므로 운영 약속과 계약 강제를 구별해 공개한다. 운영비 예산은 별도 수립한다.

## 확정해야 실제 배포 데이터가 나오는 항목

`contracts/release/base-sale.draft.json`에는 미확정 값을 `null`로 남겼다. 도구는 이 상태로 배포 데이터를 만들지 못한다.

- 고정 `unitPriceWei`: 토큰1개당 Base ETH 가격. 기준 ETH/USD 시각과 계산표도 보관.
- `saleCap`, `walletCap`: 정수 SOULI 수량. 지갑 한도는 사람별 한도가 아니며 여러 지갑으로 나눌 수 있다.
- `startsAt`, `endsAt`: UTC Unix 초 문자열. 계약 배포 후 가격/한도/종료일은 변경 불가.
- `nonce`: 배포 직전 A 지갑의 확정·pending nonce가 같은지 확인 후 문자열 입력. 다른 거래를 보내면 주소 예측부터 다시 검토.
- 세 관리 주소의 메인넷 사용 최종 확인, 실제 재고 출처/잔액, LP 계획·권한·보유자 배분 공개 자료.
- 판매 주체/대상 국가/연락 및 분쟁 처리 정보 등 공개 판매 조건 검토. ‘게임용’이라는 문구만으로 규제 적용 여부가 결정되는 것은 아니다.

등록된 세 지갑은 **각각 혼자 출금 가능**하다. 다중 승인·영구 LP 잠금·분실한 개인 지갑의 토큰 복구가 아니다. Safe는 사용하지 않는다. 이 결정은 예전 MANUAL-LP 문서의2-of-3 기록보다 우선한다.

## 서명 없는 배포 준비 절차

`contracts` 폴더에서 실행한다. 확정 입력은 draft를 별도 복사해 작성한다. 아래 도구에는 키/복구 문구 입력 또는 거래 전송 기능이 없다.

```powershell
npm.cmd run compile
node scripts/three-wallet-release.mjs prepare release/base-sale.approved.json ../logs/sale-checks/mainnet-review.json
node scripts/three-wallet-release.mjs preflight ../logs/sale-checks/mainnet-review.json ../logs/sale-checks/mainnet-preflight.json
```

prepare는 A의 일반 CREATE 배포와 nonce로 controller/child sale 주소를 예측한다. 계약 생성 데이터, 세 운영자, termsHash, 컴파일 산출물 해시를 검토 파일에 고정한다. preflight는 네트워크·nonce·코드·원본 토큰·기간·가스 실행 가능성을 읽기로 확인한다. MetaMask의 스마트 계정/중계 경로로 다른 발신자가 배포하는 경우 이 주소 예측을 사용하면 안 된다. nonce 변경·artifact 변경·리뷰 파일 변조는 거부한다.

최종 조건과 거래 내용을 사용자가 확인한 뒤에만 지갑에서 배포를 서명한다. 배포 후:

```powershell
node scripts/three-wallet-release.mjs verify ../logs/sale-checks/mainnet-review.json ../logs/sale-checks/mainnet-verified.json 0x4a4AA86208EcFdBACBaD551dF7baf5D3C84425BB WHOLE_STOCK
```

`WHOLE_STOCK`을 승인한 재고 정수로 바꾼다. 결과의 재고 승인→depositStock→startSale은 **각각 별도 서명할 후보 데이터**다. 생성됐다고 실행된 것이 아니고, startSale은 최종 검수 후 별도로 승인한다. 처음에는 정지 상태이며 전체 공급 대신 판매할 재고만 넣는다. `verify`는 같은 블록에서 controller/child의 코드·operator·owner·treasury·토큰·모든 조건을 대조한다. 후보 manifest를 만들 뿐 `LIVE_SALE`을 수정하지 않는다.

검토된 소량의 원본 SOULI로 실제 지급/inscription·영수증·수금·중지 동작을 확인한 후 공개 구매를 켠다. 이 mainnet 소량 거래도 실제 ETH와 토큰을 쓰는 별도 승인 거래다. 계약 explorer 소스 검증과 배포 주소·조건·관리 권한을 공개하고, 전용 관리자 UI의 mainnet 연결도 확인해야 한다. 현재 `/testnet/` 관리 화면은 Base Sepolia 전용이므로 메인넷 관리 화면으로 쓸 수 없다.

## 홈페이지/마케팅 문구 초안

**Meet your on-chain soul. Explore a world in progress.**

- 구매 전: **SOULI tokens arrive now. The game is still in development.**
- CTA: 실제 판매 개시 후에만 **Get SOULI**를 활성화. 그 전에는 **Play free / Try testnet**.
- 게임: 무료 미리보기, 보유자 마을은 초대 베타. 구매만으로 완성 게임·베타 접근·특정 출시일을 보장하지 않음.
- LP: **Manual LP plan. Check the transactions.** 판매대금 인출을 LP 투입으로 집계하지 않음.
- 수익/상장: 가격 상승·유니스왑 상장·유동성·재판매 가능성 보장 없음.
- 환불: 성공 구매의 자동 계약 환불 없음. 이를 모든 법적 권리의 포기처럼 표현하지 않음.

계약을 배포했다고 감사/안전 보증을 받았다고 홍보하지 않는다. 출시 전 개발 상태와 토큰 권한을 명확히 공개하는 기준으로 [SEC 직원의 암호자산 증권 공시 설명](https://www.sec.gov/newsroom/speeches-statements/cf-crypto-securities-041025-offerings-registrations-securities-crypto-asset-markets)을 참고했다. 이는 SOULI를 증권으로 판정하거나 판매 허가를 확인한 자료가 아니며, 국가별 실제 적용 검토는 별도다.
