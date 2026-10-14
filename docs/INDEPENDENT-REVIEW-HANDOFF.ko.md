# SOULI V2 독립 검토 전달안

2026-10-04 · 전달 자료 준비. 외부 검토자에게 발송하지 않았고, 독립 감사 완료가 아니다.

## 검토 대상

- Base 8453, 원본 SOULI `0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF`.
- 판매 V2 `0x9B3b5BFbc22821416e390E10e0a30C1AC1960B68`.
- 관리 V2 `0xc177F10Da4c62FBbef8182e82EE09F7Db79769dA`.
- 고정 단가 26,666,033,792,798 wei, 누적 판매/지갑 한도 각각 4,200,000개, endsAt=0.
- `contracts/src/SouliEthSaleV2.sol`, `SouliThreeWalletControllerV2.sol`, 원본 SOULI 호환성, 프런트엔드 지갑/견적/영수증 검증.
- LP 후보: 수정하지 않은 OpenZeppelin 5.6.1 `VestingWallet(beneficiary, unlockTimestamp, 0)`. 판매 계약과 별도이며 미배포. `contracts/src/LpTimelockImports.sol`, `contracts/scripts/lp-timelock-plan.mjs`.
- 폐기된 자동 LP 또는 Safe 실험은 현재 판매 구조가 아니다. 해당 파일/테스트가 저장소에 남아 있어도 현재 배포 대상으로 분류하지 않는다.

## 사실과 제한

V2 원본 토큰 42개 입고, 비관리자 휴대폰 1개 구매, 중지, 41개 회수, 판매 ETH 수금이 실제 메인넷에서 완료됐다. 현재 중지/재고0/계약ETH0이고 누적 sold=1은 초기화되지 않는다. 공개 구매를 아직 열지 않았다. 세 운영자 중 **한 명만으로** 자금 회수가 가능하다. 이는 사용자 선택이며 2-of-3 보안이 아니다. 고정된 운영자 주소를 교체하는 기능도 없다.

50:50은 공개 사용 계획일 뿐 온체인 분배 제한이 아니다. 수금 즉시 LP라는 표시를 하지 않는다. 성공한 구매 후 프로토콜 환불은 없다. 게임은 3D 개발 중이며 토큰 보상은 없다. 공급 210M과 팀 목표15%를 실제 팀/외부 보유량 증명으로 오인하지 않는다. 원본 token의 관리자/renderer 권한은 판매 계약의 불변성과 별개다.

Sourcify에서 생성 및 런타임 exact match를 확인했다. BaseScan 소스 검증은 별도이며 이 자료가 독립 보안 감사를 뜻하지 않는다. 구현자가 수행한 자동 검사·코드 검토·로컬 fork 결과도 독립 감사로 표시하지 않는다.

## 검토 요청과 수용 기준

1. 실제 배포된 런타임/immutable/constructor/termsHash가 소스와 일치하는지 검증한다. 반복된 immutable 참조 전체를 비교한다.
2. 원본 SOULI의 정밀도9, 정상/실패 transfer, 구매자의 Dynamic/Stable inscription 변화, 부분 실패 원자성을 검토한다.
3. 비관리자 출금/재고 회수 불가, 구매 수량/단가/기한/누적 한도, pause 경계, forced ETH 및 회계 대사를 검토한다.
4. MetaMask 모바일/확장, 계정·체인 변경, 세션 복구, 중복 전송 방지, RPC 불일치, 정확한 거래/코드/효과 확인을 검토한다. EIP-7702 외부 거래 대상만으로 성공을 판정하지 않는다.
5. LP 표준 잠금의 만기 전 방출 불가, 수령권 이전, renounce 위험, 후속 예치의 기존 만기, 잘못된 LP/NFT/beneficiary와 실제 V2 pair 확인을 검토한다. 별도 판매 controller로 LP를 보내면 안 된다.
6. 최소한 미해결 Critical/High가 없고, 모든 발견 사항의 재현 범위·영향·수정/수용 이유·검토한 코드 해시가 보고서에 있어야 한다. 결과가 양호해도 손실 가능성을 0이라고 보장하지 않는다.

## 재현

Node 24 이상. 루트와 contracts 각각 `npm.cmd ci` 후 contracts에서 `npm.cmd test`. 선택적으로 `npm.cmd run test:lp-timelock-fork`; 이는 공개 Base 읽기 + 로컬31337 쓰기만 수행하며 개인키를 요구하지 않는다. RPC 상태/새 pool 존재에 따라 fork 테스트는 재검토를 요구하며, 제한 검사를 우회하지 않는다.

번들 `MANIFEST.json`은 각 파일의 SHA-256을 제공한다. `contracts/artifacts/standard-input.json`과 `contracts.json`, 루트/계약 lockfile, 소스·테스트, 공개 receipt snapshot 및 선별된 검사 증거를 포함한다. 웹 미디어와 클라우드 배포 자격증명은 제외한다. 전체 웹 빌드 검사는 작업 저장소에서 수행한 별도 로그이며, 이 계약 검토 번들 자체가 완전한 사이트 배포 패키지는 아니다.

검토자가 코드를 수정해야 한다고 판단하면 새 소스/배포 코드의 영향을 검토하고 필요한 경우 새 판매 계약에서 다시 테스트한다. 이 문서는 현재 계약을 무조건 안전하다고 승인하는 문서가 아니다. 외부 발송·유료 의뢰는 사용자가 대상을 정한 후에 진행한다.
