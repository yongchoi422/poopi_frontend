# SOULI 판매 내부 보안 검토

## 2026-10-04 출시 준비 후속 검증

전체 계약/클라이언트151개·실패0, 웹 전체검사/빌드 통과. 표준 OpenZeppelin VestingWallet 시간잠금8검사 및 실제 Base fork52,125,182 LP생성/예치/1년 만기회수/기초자산회수 통과. V1/V2 생성바이트코드 유지 검사도 통과. 공개체인 신규거래0. 홈/백서v2.5/구매 안내를 현재 V2로 갱신해 배포했다. 상태와 증거는 `LAUNCH-GATES.ko.md`. 독립 검토용229파일 번들 준비는 외부 감사 완료가 아니다. LP도 실제로 예치하지 않았다. 아래 이전시점의 v2.1불일치·143검사 설명은 과거 기록이다.

## 실제 배포 및 소액 검증 후 상태 · 2026-10-03 23:43 KST

아래 사전 검증 절의 'V2 미배포/공개 체인0건'은 당시 기록이다. 현재V2는 배포/Sourcify exact source match 완료, 사용자서명으로42입고→휴대폰일반지갑1구매→중지→41회수→ETH수금까지 검증됐다. 영수증 `commercial-v2-{purchase1,pause,recover,collect}-receipt.json`, 최종읽기 `commercial-v2-latest-state.json`: Base52,124,643,paused,stock0,sold1,sale/controllerETH0,A998,allowance0. 내부143검사 및 실제정상흐름 검증이 **외부 독립감사 또는100% 안전을 의미하지 않는다**. 세 운영자 중 하나의 키로 관리자 자산을 회수할 수 있는 설계는 그대로다.

LP1년 잠금/수금·유동성수동운영은 사용자 재확정. 실제LP/잠금 및 외부 독립검토는 아직 완료되지 않았다. 공개백서v2.1과 최신V2/50:50 정책의 차이를 판매개시 전에 해소해야 한다. 신규정식재고는 미입고, 공개commercial manifest는 disabled. 이번 상태문서 갱신은 새보안스캔/추가검증 수행으로 계산하지 않는다.

## 최종 사전 검증 업데이트 · 2026-10-03 21:41 KST 이후

아래는 이번 검토/수정 결과다. 이전 절은 당시 상태의 기록이며, 특히 134개 테스트·미해결 EIP-7702·70만 지갑 한도·15:85 제안은 이 절과 최신 판매 조건으로 대체된다. **외부 독립 감사는 아직 완료되지 않았다.**

| 항목 | 현재 결과 |
|---|---|
| 전체 계약·클라이언트 검사 | 143 통과, 실패 0 — commercial-final-contracts.log |
| 웹 전체 검사 | npm.cmd test 통과: 프런트, 서버23, build, 격리 runtime 패키징 — commercial-final-root-test.log |
| 원본 SOULI 호환 | Base 52,120,901 로컬 fork에서 dot/LV4/LV5, 4.2M 완판, B 회수·재입금, C 재개·수금 통과 — commercial-v2-base-fork.json |
| A의 기존 EIP-7702 배포 | 정확히 검토한 MetaMask 위임 주소/코드 해시에 한해 direct type-2 CREATE 허용. 로컬 fork의 실제 배포 클라이언트로 검증. 공개 지갑 서명은 미실행 |
| 공개 체인 변경 | 이번 준비에서 0건. 새 V2/LP/잠금 계약 미배포 |
| 정식 출시 | 닫힘. 최종 배포·실물 확인·재고·LP 구체 조건·외부 독립 검토가 남음 |

### 수정한 배포 검증 문제

수정 전 `matchesCompiledRuntime`은 immutable의 각 사용 위치를 따로 가리고 코드만 비교했다. getter가 검토 값과 일치해도 다른 사용 위치의 값이 같은지 확인하지 못했다. 독립 판매 CLI에서 운영자가 외부 제공 주소를 채택하는 상황에는 잘못된 후보 manifest/재고 계획을 받아들일 수 있는 검증 공백이다. 세 지갑 경로의 정확한 CREATE 주소·calldata·영수증 검증은 별도의 방어이며, 이 발견이 기존 pilot 자금 유출을 뜻하지 않는다.

이제 동일 immutable의 모든 사용 위치가 같은 값인지 먼저 확인하고, getter와 검토 조건의 일치 확인을 유지한다. V1/V2 정상 runtime은 통과하고 각 immutable 사용 위치를 개별 변경한 경우는 거부하는 회귀 검사를 추가했다. 공개 체인 공격 거래나 자금 탈취 재현은 하지 않았다. Solidity 생성 코드는 바뀌지 않았다.

### 배포 기록과 콜백 검증

- 완료된 이전 회차의 기록을 검증 가능한 별도 키로 보관한 뒤 새 회차를 준비한다. 다른 회차가 미완료이거나 보관 쓰기가 실패하면 새 서명을 요청하지 않는다. `contracts/test/deploy-client.test.mjs`의 새 두 사례가 통과했다.
- 권한 있는 운영자라도 토큰 콜백 중 재고·대금 작업에 재진입할 수 없는지 `stock-callback.test.mjs`로 확인했다. 예외 상황의 잔액·유한 allowance 검사를 포함한다.

### Slither 결과 해석

Slither 0.11.5, 검증한 공식 Windows solc 0.8.37로 V2 controller와 imports를 검사했다. 13계약/101detector, **32항목: High2·Medium4·Low4·Info22**. 원본 결과는 `logs/sale-checks/slither-v2.json` 및 `.log`, compiler 출처/해시는 `audit-solc-source.json`에 보존했다.

| 분류 | 수 | 검토 맥락 |
|---|---:|---|
| reentrancy-balance | 2 | controller의 입고/회수. nonReentrant, 정확한 전후 잔액 검사 및 추가 토큰 콜백 회귀 검사 확인 |
| incorrect-equality | 4 | unsigned 값의 0 여부 가드. 외부 잔액이 특정 목표값과 같아야만 진행되는 조건과 구분 |
| missing-zero-check | 1 | OpenZeppelin Ownable2Step의 pending owner 취소 맥락. controller가 임의 owner 교체를 전달하는 구조가 아님 |
| timestamp | 3 | 판매 시작/기한 및 견적 만료의 의도된 사용. 난수 용도가 아님 |
| assembly | 12 | OpenZeppelin SafeERC20/StorageSlot 코드. 이 검사로 의존성을 독립 감사했다고 주장하지 않음 |
| pragma / solc-version | 4 | 인터페이스의 넓은 범위와 실제 고정 컴파일러를 구분 |
| dead-code | 2 | OpenZeppelin Context 경로 |
| low-level-calls | 2 | 고정 treasury/호출 운영자 ETH 지급, 가드와 실패 rollback 확인 |
| unindexed-event | 2 | OpenZeppelin Pausable 이벤트 |

검토한 맥락에서 새 무권한 인출의 재현 증거는 확인하지 못했다. 이는 32항목 삭제/독립 감사 통과/알려지지 않은 문제 부재를 뜻하지 않는다.

### 남은 출시 판단

사용자는 지갑별 한도 4.2M과 LP 원금 1년 잠금 방향을 승인했다. 그러나 세 지갑 중 **하나만으로 전권 행사**, on-chain으로 강제하지 않는 50:50, 원본 아트 관리자 권한은 여전히 공개해야 할 구조다. 새 계약의 소량 메인넷 확인과 외부 독립 검토, 실제 판매 재고, LP 실행 시점·잠금 구현·수령자·수수료 권한·운영 예산을 완료한 뒤 판매를 연다. 잠금 검토안은 `LP-ONE-YEAR-PLAN.ko.md`, 실행 순서는 `COMMERCIAL-LAUNCH-RUNBOOK.ko.md`에 있다.

사용자 요청에 따라 Daybreak를 추가 사용하지 않는다. Codex Security 일반 소스 검토, 정적 도구, 자동 테스트를 외부 제3자 감사로 표현하지 않는다. 앱의 자동 추가 검사나 계정 제한은 이 문서/코드가 해제할 수 없다.

일반 Codex Security 검토 보고서 저장 완료: scan `9775771f-27ed-43d4-8ed3-b37e26297dbe`, 원래 검토 snapshot의 중간 심각도 배포 검증 문제 1건과 이후 로컬 수정/회귀 테스트를 함께 기록했다. 62개 초기 목록 중 사람이 읽을 수 있는 57개를 검토했고 vendor 바이너리/의존성 내부 등은 제외해 coverage는 partial이다. 보고서는 수정 전 snapshot을 대상으로 하며 현재 코드 전체의 재감사로 해석하지 않는다. 로컬 앱 보고서: `C:/Users/yongc/.codex/state/plugins/codex-security/scans/souli/c51fa7cd342918d16fe48787be12a3e53d766011_20261003T101819Z_nvx94nrl/report.md`.

## V2 추가 검토 · 2026-10-03 (이후 변경 범위)

50:50 사용자 승인 후 새 V2를 추가했다. 아래 V1 분석/공개체인 증거는 당시 기록이며 V2가 공개 배포되었다는 뜻이 아니다. 외부 독립 검토는 여전히 미완료다.

- V1 원본 소스와 생성 바이트코드 보존, 공개 테스트넷 4개 artifact 바이트코드 일치 검사 통과. 신규 V2 소스/생성해시/컴파일설정은 logs/sale-checks/commercial-v2-evidence.json에 고정.
- V2 계약 diff: 명칭/참조 및 VERSION2, endsAt0 허용, 구매/재개시 endsAt0 예외만 추가. 임의 대상 호출·업그레이드·출금 수신자 변경·LP자동화 추가 없음.
- 클라이언트/배포: V2 no-end 검증과 날짜표시, 유한 quote TTL, VERSION/runtime/termsHash/정확한 review 유지. 50:50 unenforced policy를 termsHash에 기록. policy변조/버전혼합/기한초과/허용범위밖 날짜 거부. no-end를 V1에 적용하면 거부.
- 단독 판매 CLI도 버전별 artifact를 선택하게 보완했다. V2조건에 V1artifact를 전달하는 준비 실수는 unsigned review 생성 단계에서 거부한다. 배포 검증의 실제 VERSION/runtime 일치 요구도 유지한다. 프런트/서버23/빌드/격리패키징 검사 통과.
- 추가9개 포함 계약134개 PASS. 원본소스420만 입고/500000→500001 seed/나머지회수/대금수금, controller호출 재진입/ETH수신거부 rollback/권한/완판재개불가/10년후구매와 만료견적구매거부/정해진기간 경계/기존artifact 보존 검증. 로컬31337 환경이며 실제V2메인넷/휴대폰 거래완료로 해석하지 않는다.
- 관리 UI의 LP/운영 수치는 누적 purchase proceeds를 50:50으로 계산한 예산이다. forcedETH/운영자추가납입 제외, 실제LP증거·현잔액·집행보장이 아니다. 1wei미만 나눗셈 잔여는 운영몫에 포함.
- 남은 항목: A의EIP7702 직접배포 호환경로, finalETH가격/지갑한도/실제재고, V2독립검토 및 새계약공개체인 소액사이클, LP실행·보유·잠금/운영예산/원본art관리권과 재고소유공시. 보안완료 또는 무결점으로 보고하지 않는다.


2026-10-03 · 내부 코드/테스트/공개 체인 검토 · **독립 감사 또는 무결점 보증 아님**

결론: 소액 Base 메인넷의 입금→일반 구매→중지→미판매 회수→ETH 수금은 완료했다. 이번에 재검토한 범위에서 무권한 자금 인출의 새 재현 사례를 찾지는 못했다. 그러나 최종 판매 조건, 배포 경로, 운영 권한 위험 및 독립 검토가 남으므로 20만–30만 USD 정식 판매 준비가 끝났다고 판단하지 않는다. 외부 감사자에게 연락하거나 비용을 발생시키지 않았다.

## 범위와 고정 증거

- production: `contracts/src/SouliEthSale.sol`, `contracts/src/SouliThreeWalletController.sol`, original ERC20i 전송/seed 및 Generator의 owner 권한.
- 연동: 검토 manifest/코드 해시/chain/account/nonce 검증, 견적/거래 영수증 복구, 공개 자금 설명 및 `npm audit`.
- 이번에 production Solidity는 수정하지 않았다. 테스트 fixture와 별도 실패상황 테스트만 추가했다.
- compiler `0.8.37+commit.f401782d`, optimizer 200, viaIR, EVM cancun. 새 컴파일의 production creation bytecode 해시는 기존 mainnet pilot 검토 파일과 동일하다.
- SouliEthSale SHA256 `67aa39564594b578b075ec7c46e7597915bf5a042e93d9519f447738ab0016b1`, creation hash `0xd1bcf207b6876bed79947e4f283a391a4b099cc11956859fd28a60124bdc5cb4`.
- SouliThreeWalletController SHA256 `024d089810c647ca5463710c5b80ca5ed751b850b7abdf32acc91b1f6c84003f`, creation hash `0xb0341f4e719592105fe49161e052a2bd8d96b12b97e4fb38c178f01ab96eee82`.
- 공개 read-only 증거: `logs/sale-checks/commercial-security-evidence.json`, Base 52,114,159, 2026-10-03 08:54:27 UTC. 새 공개 거래 0건.

## 검증 결과

| 검증 | 결과와 한계 |
|---|---|
| 기존 계약/클라이언트 전체 suite | 120 통과, 실패 0. 과거 자동 LP/Safe 연구 테스트도 포함하며 현재 출시 기능이라는 뜻 아님 |
| 신규 악성/경계상황 | 5 통과, 실패 0. 아래 상세 참고 |
| root npm audit | 빌드 의존성 수정 후 0 alerts. 알려진 DB 항목이 0이지 보안 보증 아님 |
| contracts npm audit | 0 alerts |
| 웹 릴리스 검사 | 프런트 검사, 서버 23개, production build, 격리 runtime 패키징 통과. Docker 실실행/모든 실제 기기 검증과는 다름 |
| pilot 최신 읽기 | paused=true, sold=1, available=0, sale/controller ETH=0. 누적 대금 26684264049332wei 유지 |
| 원본 maxBuy | 210000000000000000 최소단위 = 210M SOULI. 이미 성숙한 원본에서 초기 일시적 제한이 상업 재고 4.2M을 막는 상태는 아님 |
| production bytecode | 원본 pilot 검토의 creation hash와 동일. 새 commercial 계약은 미배포 |

기존 suite: `logs/sale-checks/commercial-preflight-contract-tests.log`. 신규: `contracts/test/commercial-security.test.mjs`, `logs/sale-checks/commercial-security-adversarial.log`. 웹: `logs/sale-checks/commercial-web-release-checks.log`. 취약점 JSON은 같은 디렉터리의 `commercial-{web,contract}-dependency-audit*.json`.

신규 5개는 다음을 검증한다.

1. 운영자 수신 콜백이 대금 수금을 재진입해 두 번 가져갈 수 없는지와 연속 구매 수금의 총량 보존.
2. 강제 ETH가 있더라도 회수는 가능하고 고객 매출로 잘못 세지 않는지. 로컬 체인 잔액 주입으로 모델링했으며 공개 체인 자금을 조작한 테스트가 아니다.
3. 완판 이후 재고를 더 넣어도 판매 누적 한도가 초기화되지 않는지, 초과 재고 회수가 가능한지.
4. 기한이 지나면 구매는 막히지만 중지/재고 회수/대금 수금은 가능한지.
5. 원본 ERC20i 소스에서 4.2M 입고, LV5 크기인 2,500,001개 구매, 남은 재고 회수와 유한 allowance/대금 보존. 갓 생성한 원본의 일시적 maxBuy 제한은 먼저 실패를 확인하고 로컬 시간만 1일 이동해 성숙한 토큰을 검증했다. 실제 mainnet 원본을 새로 발행한 테스트가 아니다.

## 발견 사항과 출시 판단

### S-01 · 세 지갑 각각 전권 — 수용 여부가 필요한 운영 위험

사용자가 요청한 1-of-3 모델이다. 임의 사용자 호출은 차단하지만 A/B/C 중 하나가 유출되면 공격자는 판매를 중지하고 재고/대금을 자신의 그 등록 지갑으로 회수할 수 있다. 수신 주소 제한이 이 위협을 막지는 않는다. operator 교체/회전이나 업그레이드 경로도 없다. 손상 시 남은 지갑으로 중지/회수하는 응급 조치는 공격자와 경쟁할 수 있어 안전을 보장하지 않는다.

지갑마다 독립 보관, 불필요한 dapp 승인 금지, 의도한 재고만 입고, 주기적인 매출 대사, 노출액 최소화가 필요하다. 수금을 A로 옮긴 뒤에는 B/C의 controller 권한이 A의 개인 잔액을 보호하거나 복구하지 않는다. 2-of-3 변경은 사용자가 보류한 선택이므로 몰래 바꾸지 않는다. 이 위험을 공개하고 사용자 확인을 받은 뒤 출시한다.

### S-02 · LP/운영 비율은 계약 강제가 아님 — 공개 조건 확정 필요

계약에는 목적별 금고, LP 강제 실행, LP 지분 잠금 또는 구매 후 환불 기능이 없다. `termsHash`도 공개 설명 전체가 법적/기술적으로 실행되게 만드는 장치가 아니다. 판매 수금은 등록 운영자에게 가능하며 15% LP/85% 운영은 아직 제안이다. 인출액을 LP로 표시하거나 운영 재원을 LP로 재사용해 계산하면 안 된다. LP 소유권/잠금/수수료 수령자/예치 기한은 판매 전 공개해야 한다.

### S-03 · 현 A는 EIP-7702 계정 — 기존 배포 도구와 불일치

공개 코드 `0xef010063c0c19a282a1b52b07dd5a65b58948a07dae32b`는 EIP-7702 위임 형태다. 기존 `preflightController`는 일반 EOA CREATE만 허용하고 nonempty code를 거부한다. 이는 현재 pilot 회수 실패의 증거가 아니라 **새 배포 준비 경로의 호환성 문제**다. 위임 자체를 악성으로 단정하지 않는다.

새 거래를 요청하기 전에 사용 중인 MetaMask의 정확한 배포 경로·from/to/data/nonce를 검증한다. 일반 EOA 전제로 예측한 주소를 그대로 쓰지 않고, 위임 해제나 별도 배포 지갑을 사용할 경우 별도 사용자 서명/주소 검토가 필요하다. 도구의 code 검사를 지워 무조건 통과시키지 않는다. [EIP-7702 명세](https://eips.ethereum.org/EIPS/eip-7702).

### S-04 · 원본 아트 관리자 권한 — 영구 불변 홍보 불가

원본 owner/pool은 확인 블록에서 `0xA159D241eC79b989cBD69D2917e5951E5F3A49c8`이다. Generator의 setEssences/setEffects/setBodies/setEyes/setDots는 onlyOwner로 남아 있다. owner가 아트 데이터를 바꾸면 기존 seed 렌더링도 영향을 받을 수 있다. Stable은 seed 보존과 관련된 상태이지 모든 시각 데이터의 영구 동결을 뜻하지 않는다. 신분이나 실제 키 보관자는 체인 주소만으로 확인되지 않는다.

원본의 pool은 한 번 시작된 상태다. 판매/LP를 새로 만든다고 `launch()`를 다시 호출하거나 원본 pool을 임의로 교체하는 절차가 아니다. DEX 테스트/가격/전송 경로는 실제 선택한 풀에서 별도 검토한다.

### S-05 · sass 파일 감시기의 알려진 취약점 — 수정 완료

root `sass → @parcel/watcher@2.4.1 → micromatch → braces@3.0.3` 경로의 깊은 패턴 중첩에 의한 stack exhaustion 경고를 확인했다. npm의 3개 high 표시는 하나의 원인 의존성 경로를 포함한 것이며 온체인 자금 탈취 3건을 뜻하지 않는다. `@parcel/watcher`를 허용 범위의 2.6.0으로 갱신해 해당 경로를 제거했다. 새로운 직접 의존성은 추가하지 않았고 변경은 root lockfile에 있다.

[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). 고쳐진 것은 빌드 도구 공격 표면이다. chain 계약 소스나 지갑 키를 수정한 것이 아니다.

### S-06 · 공급/기간/현재 안내 — 정리 진행

기존 UI의 완성 게임처럼 보이는 Play free 진입을 My SOULI/Cooking으로 정리했다. 백서 v2.2 로컬 초안은 새 매출/LP 양쪽 합계 범위와 LP/운영 재원 미확정을 명시한다. 홈페이지 영수증의 오래된 testnet-only 문구도 pilot과 commercial로 구분했다. 아직 공개 배포하지 않았다.

최종 가격/기간/수량은 미정이다. 계약 `endsAt`은 수정할 수 없으므로 무기한 판매 문구로 임의 해석하면 안 된다. 외부 보유 11.03%의 소유/약속 물량이 검증되지 않았으므로 이를 전부 확정 팀 물량이라고 외부에 쓰지 않는다.

## 아직 검증하지 않은 범위

외부 독립 보안 감사/형식 검증, 세 지갑 모든 실제 기기의 복구 및 피싱 저항성, production 규모의 Base 실제 입금/구매, EIP-7702 새 배포, 실제 신규 Uniswap LP 생성/지분 잠금, 모든 모바일 OS/MetaMask 버전, Azure/도메인 계정 전체 접근권 감사, 법률/세무 적합성은 완료되지 않았다. npm audit나 소스 explorer 일치는 이 범위를 대신하지 않는다.

독립 검토자에게 위 고정 소스 해시, compiler 설정, 테스트/실패 재현, 원본 토큰 소스와 코드 해시, pilot 영수증, UI 지갑/서명/manifest 흐름, 최종 commercial 조건 및 운영 위협 모델을 함께 전달한다. 현재 조건이 달라지거나 production 코드가 바뀌면 변경 부분을 다시 검토한다. [Ethereum의 스마트 계약 보안 지침](https://ethereum.org/developers/docs/smart-contracts/security/)도 테스트·접근 통제·독립 검토를 서로 대체되는 단계로 다루지 않는다.

## 지금 사용자가 할 일 / 다음 작업

지금은 MetaMask 확인을 누를 요청이 없다. 먼저 판매 수량·기간·매출 사용 비율을 결정하고 LP 소유/잠금·운영비 계획을 정리한다. 다음으로 배포 경로와 독립 검토의 미해결 사항을 닫는다. 이후 새 정식 계약을 처음에는 중지 상태로 배포해 고정 조건·세 운영자·코드 일치를 확인하고 소량 검증한다. 42개 pilot을 그대로 큰 판매용으로 재사용하거나 MAINNET_ADMIN/LIVE_SALE을 먼저 켜지 않는다.
