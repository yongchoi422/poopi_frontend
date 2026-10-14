# MetaMask 연결 검토·검증 기록

2026-10-02. 지갑 연결과 결제 복구의 경계를 검토했다. 독립 보안 감사나 메인넷 출시 승인이 아니다.

## 사용 방법

`https://souli.net/testnet/#test-wallet` → Connect MetaMask → 지갑 승인 → 원래 브라우저로 복귀. 컴퓨터는 확장 또는 공식 QR, 휴대폰 외부 브라우저는 앱 릴레이를 사용한다. 계정을 바꾸려면 Disconnect → MetaMask에서 원하는 계정 선택 → Connect MetaMask 순서다.

연결 자체는 공개 주소 접근이다. 결제/토큰 사용 승인/로그인 서명은 각각 별도 요청한다. 테스트 페이지는 Base Sepolia 전환이 필요하면 지갑 요청을 표시하고, 게임의 읽기 전용 연결은 네트워크를 자동 전환하지 않는다. Disconnect는 이전 ERC-20 allowance 취소나 이미 전송한 거래 취소가 아니다. 개인키/복구 문구를 사이트가 받는 단계는 없다.

## 구현과 보완

| 항목 | 처리 |
| --- | --- |
| 공식 연결 | `@metamask/connect-evm@2.1.1` 고정. EIP-6963의 MetaMask/injected 우선, 없으면 SDK. 선택한 provider를 세션 동안 유지. |
| 최초 방문 | 앱/연결 요청 없음. 이전 권한만 eth_accounts로 조용히 확인. 저장된 릴레이만 복원. |
| 연결 해제 | 주소·잔액·견적을 즉시 제거하고 SDK disconnect / injected wallet_revokePermissions 호출. 저장소가 막혀도 메모리에서 종료 상태 유지. |
| 재선택 | SDK forceRequest, injected wallet_requestPermissions. SDK에 권한 요청을 중복 전송하지 않음. |
| 종료 시간 초과 | 8초 후 로컬 종료 안내. 늦은 revoke가 새 연결을 끊지 않도록 새로고침 전 재연결 차단. 자동 재시도 안 함. |
| 상태 경쟁 | 늦은 연결·잔액·견적·관리 조회가 새 계정이나 종료한 화면을 덮어쓰지 않도록 세션/작업 번호 확인. |
| 이벤트 | accountsChanged/chainChanged/disconnect 처리. 같은 origin의 다른 탭에서 종료하면 무효화. 휴대폰 앱 복귀 때 읽기로 계정/체인 재확인. |
| 중복 요청 | 연결·서명·전환 중 새 대화형 요청 차단. 버튼 비활성. 구매/관리의 Web Locks와 pending intent 유지. |
| 오류 | SDK code 53/rpcCode 4001 취소 정규화. 통신 시간 초과를 결제 취소로 간주하지 않음. 사용자 취소/이미 열린 요청/통신 장애를 구분. |
| 복구 | 전송 해시는 연결 종료 후에도 원래 클라이언트의 복구 저장소로 전달. 자동 재전송 없음. 종료 시 영수증/미확정 기록 보존. |
| 공급망·CSP | 버전/lockfile 고정. 공식 relay WebSocket만 추가 허용. SDK analytics 비활성. unsafe-eval 없음. |

핵심 코드: `src/lighthouse/wallet-connect.mjs`, `wallet-errors.mjs`, `wallet-session.mjs`, `WalletAccess.vue`, `SanctuaryApp.vue`, `src/testnet/TestnetApp.vue`, `ThreeWalletLab.vue`. 계약과 실판매 설정은 이번 연결 보완으로 바꾸지 않았다.

## 확인한 범위

- 연결 회귀 검사: 지연 로드, 최초 무승인, deeplink 허용 목록, 중첩 취소, 중복 요청, 계정 재선택, 저장소 불가, 다른 탭 종료, 종료 지연, 늦은 승인 무시, 전송 해시 보존.
- 세션 검사: 계정/체인 이벤트, 오래된 응답 무시, 앱 복귀 재확인, 권한 취소 중 재접속 차단.
- 결제/세 지갑 클라이언트 22개: 잘못된 체인·코드·견적, 승인 거절, 불명확한 전송 결과 보존, 중복 구매, 저장 실패, 대체 거래, 정확한 내부 이벤트 없는 중계 receipt 거절 등. 로컬 Hardhat 검사이며 공개 체인 신규 거래가 아니다.
- 전체 프런트 검사, 서버 23개, production build/런타임 패키징 통과. production 의존성 audit 알려진 취약점 0건(취약점이 없다는 증명 아님).
- production 빌드와 운영 CSP에서 공식 QR 창, 닫기 후 취소 안내/Connect 버튼 복구 확인. 지갑 없는 페이지의 결제/관리 버튼 비활성 확인.
- 실제 휴대폰 Chrome → 앱 승인 → 원래 Chrome 주소 표시는 사용자 확인 완료(직전 릴레이 배포). 이번 Disconnect 후 다른 계정 연결은 실제 기기 추가 확인이 필요하다.

## 남은 출시 확인

1. 실제 Android Chrome / iOS Safari 각각 최초 연결, 거절, 로그아웃, 다른 계정, 잠긴 지갑, 앱 중단/복귀를 확인한다. 사용자가 확인한 휴대폰 OS를 임의로 추정하지 않는다.
2. B 독립 판매대금 출금은 이후 실제 거래 `0x3aaf9a510eff11b671d6b7031ea43f453cf68cbb8ec214bcc509bb4d0ab528b9`로 확인했다. A Chrome MetaMask의 재고 210개 회수·재입금·판매 재개도 공개 체인에서 완료했다([근거](THREE-WALLET.ko.md)). C 실행과 별도 구매자의 모바일 거래는 추가 검증한다. 연결 성공만으로 다른 거래까지 완료로 표시하지 않는다.
3. 현재 공개 Base/Sepolia RPC는 가용성 보장이 없다. 실판매 전 운영용 RPC(무료 한도부터 검토), 도메인 제한·사용량 알림과 장애 대응을 점검한다. 프런트의 RPC 키는 비밀키가 아니므로 서버 전용 자격증명을 넣지 않는다. 새 유료 계정/서버는 만들지 않았다.
4. MetaMask 릴레이는 외부 서비스다. OS가 원래 브라우저를 자동으로 띄운다고 보장하지 않고 사용자가 돌아오는 안내를 유지한다.
5. 실판매는 비활성이다. 확정 계약/조건/재고/관리 권한, 별도 구매자 검증과 독립 계약 검토가 완료되기 전 ‘판매 준비 완료’로 표현하지 않는다.

## 공식 근거

최종 수동 배포 `logs/azure-releases/static-l2wkPf` (52파일, 3,588,752 bytes). hosted HTTPS/headers/assets/testnet noindex/API 상태 및 메인넷 판매 비활성 검사 통과. 실제 Chrome 확장에서 기존 A 연결 자동 복원 → Disconnect 성공 → 새로고침 후 연결 해제 유지와 구매 비활성 확인. 새 구매/서명 요청은 보내지 않았다. 공개 RPC 읽기는 12초 제한, 이미 배포된 관리 계약이 로딩 중일 때 신규 배포 버튼이 나타나지 않도록 수정했다. 화면 증거: `logs/sale-checks/wallet-disconnect-live.png`.

- [Production readiness](https://docs.metamask.io/metamask-connect/evm/guides/best-practices/production-readiness/): 플랫폼별 검증, RPC 가용성, 이벤트/오류 처리.
- [Manage user accounts](https://docs.metamask.io/metamask-connect/evm/guides/manage-user-accounts/): connect/disconnect, forceRequest, SDK와 권한 API 차이.
- [Troubleshooting](https://docs.metamask.io/metamask-connect/troubleshooting/): 중첩 오류, 중복 요청, CSP.
