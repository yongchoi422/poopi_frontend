# SOULI 지갑 연결 확장 검토

검토일: 2026-10-03. 현재 구현과 제안을 구분한다. 이 검토 과정에서 새 SDK 설치, 서비스 가입, 요금제 선택, CSP 확장 또는 지갑 연결 방식 교체는 하지 않았다.

## 확정 결정 · MetaMask만 지원 (2026-10-03)

사용자가 첫 출시에는 MetaMask만 사용하기로 확정했다. 아래 다중 지갑 제안은 보류다. Reown/AppKit/WalletConnect와 범용 지갑 선택창은 추가하지 않는다. 구매·게임·연결 화면은 Connect MetaMask로 표시한다. EIP-6963은 설치된 MetaMask를 찾는 데만 사용하며 다른 브랜드가 발견돼도 자동 선택하지 않는다. 레거시 주입은 MetaMask 식별이 있는 제공자만 허용하고 알려진 타 지갑 호환 플래그를 제외한다. 지갑이 스스로 알리는 이름·플래그를 진위 인증으로 설명하지 않는다. 모바일은 기존 공식 MetaMask Connect 경로를 유지한다. 신규 유료 서비스나 구독은 없다.

## 권장 구조

사용자는 **Connect wallet → 지갑 선택 → Base 확인 → 구매 검토 → 본인 서명 → 실제 inscription 확인**으로 진행한다. 거래 계약은 기존 SOULI 판매 계약을 유지한다. 지갑 연결 SDK를 써도 토큰 발행·보관·판매를 SDK 업체로 옮길 필요는 없다.

1. 현재 정상 동작한 MetaMask Connect는 유지한다.
2. 데스크톱에는 EIP-6963으로 발견한 설치형 지갑 선택을 추가한다. Rabby·Uniswap Extension 등은 실제 발견된 제공자를 선택하고 Base 기능을 확인한다. 모든 지갑을 MetaMask라고 가정하거나 마지막 `window.ethereum`을 자동 선택하지 않는다.
3. **사용자는 유료 구독 없이 운영하기를 원한다(2026-10-03 추가 지시).** 우선 MetaMask 유지 + EIP-6963 설치형 선택을 권한다. 일반 모바일 Chrome/Safari에서 타 브랜드 지갑 앱으로 전환하는 범위를 넓힐 필요가 있을 때만 WalletConnect 무료 플랜을 별도로 검토한다. 자동 도입·유료 전환은 하지 않는다. 이 무료 우선안이 모든 모바일 지갑을 지원한다는 뜻은 아니다. 추후 도입한다면 SOULI의 Vue 3·ethers 6에 Reown AppKit Vue/ethers adapter가 맞으며, 기존 MetaMask 연결과 세션·이벤트 리스너가 충돌하지 않도록 하나의 연결 관리자 아래 통합하고 별도 검증 경로에서 시험한다.
4. 구매 페이지에는 Base만, 테스트 페이지에는 Base Sepolia만 요청한다. 이메일 가입·소셜 로그인·가스 대납·내장 지갑·스왑·온램프를 기본으로 켜지 않는다. 현재 목적은 사용자가 가진 지갑으로 SOULI를 구매하는 것이다.

이는 공식 문서의 연결 패턴을 SOULI에 적용한 제안이지, 특정 신규 코인 사이트들의 SDK 사용 점유율 조사 결과가 아니다.

## 왜 이 방식인가

| 방식 | 적합성 | 비용과 현재 상태 |
|---|---|---|
| 기존 MetaMask Connect | MetaMask 확장·모바일 연결 유지 | 이미 구현. 타 브랜드 전체 지원을 의미하지 않음 |
| EIP-6963 지갑 선택 | 여러 설치형 EVM 지갑 충돌 방지 | 발견 기능 자체에 외부 중계·가입 불필요. 아직 범용 선택 UI 미구현 |
| Reown AppKit Vue + ethers | 다양한 모바일 지갑, QR·딥링크, 연결 UI | 무료 플랜 존재. project ID·도메인 설정·서비스 및 라이선스 조건 확인 필요. 아직 통합하지 않음 |
| RainbowKit | React 사이트에서 유용 | SOULI는 Vue이므로 이를 위해 React로 바꾸지 않음 |
| 자체 QR 중계 서버 | 직접 운용 가능성을 별도로 검토할 수 있음 | 운영·보안·모바일 호환 책임이 늘어나므로 현재 최소 서버 목표에는 권하지 않음 |

[EIP-6963 공식 표준](https://eips.ethereum.org/EIPS/eip-6963)은 다중 설치형 제공자 발견을 정의한다. 지갑의 이름·rdns는 스스로 알리는 값이며 신뢰 인증서가 아니다. 아이콘 SVG를 HTML로 삽입하지 않는다. [MetaMask Connect](https://docs.metamask.io/metamask-connect/)는 현재 사용 중인 MetaMask 연결 계층이다. [Reown Vue 설치 문서](https://docs.reown.com/appkit/vue/core/installation)는 ethers adapter와 project ID 설정을 제공한다. [RainbowKit 설치 문서](https://rainbowkit.com/en-US/docs/installation)는 React 기반이다.

Uniswap 거래소를 사용하는 사람도 MetaMask나 다른 지갑을 사용할 수 있다. **Uniswap Wallet** 앱을 쓰는 사람은 WalletConnect를 통해 연결할 수 있다. [Uniswap 공식 연결 안내](https://support.uniswap.org/hc/en-us/articles/11306127816845-How-to-connect-my-wallet-to-a-site-dapp-using-WalletConnect)는 QR 스캔→주소 선택→사이트 확인→연결 과정을 설명한다. 지갑 연결 지원과 SOULI/ETH 풀 상장은 별개다. 이 기능을 넣는다고 유니스왑에 SOULI 유동성이 자동 생성되지는 않는다.

## 무료 조건을 정확히 표현하기

사이트의 일반적인 **Connect wallet** 버튼과 **WalletConnect** 제품/프로토콜은 다르다. WalletConnect는 사이트와 지갑 앱의 연결을 중계하는 방식이고, **Reown AppKit**은 지갑 선택창·QR·연결 상태 등을 통합하는 개발 도구다. 필수 판매 계약도, 자산을 맡기는 금고도 아니다. 현재 SOULI에는 AppKit/WalletConnect SDK나 유료 계정이 추가되지 않았다. 설치형 EIP-6963 직접 연결에는 해당 중계 서비스 가입이 필요 없지만, 휴대폰 일반 브라우저의 모든 외부 지갑 연결을 대체하지 않는다.

[Reown 가격표](https://reown.com/pricing)의 현재 Free는 월 $0, RPC 월 250만 회, self-custodial MAU는 acceptable limits 내, 인증(SIWX/SIWE)·embedded wallet MAU는 월 500, 한도 초과 시 중단, 팀 1명·프로젝트 1개로 표시된다. 단순 지갑 연결 인원과 서명 로그인·내장 지갑 인원은 가격표에서 구분된다. Pro의 14일 체험을 Free로 착각하지 않는다.

그러나 [AppKit Community License](https://github.com/reown-com/appkit/blob/main/LICENSE.md)는 네트워크 사용 조건과 RPC/MAU 상업 이용 기준을 따로 두고 있다. 가격표의 단순 연결 표현과 라이선스의 MAU 정의가 같다고 임의 해석해 무제한 무료라고 약속하면 안 된다. 출시 시 적용 버전·계정 약관에서 SOULI의 연결 전용 사용 범위를 확인한다. [WalletConnect 현행 저장소](https://github.com/WalletConnect/walletconnect-monorepo/blob/v2.0/LICENSE.md)도 현재 Community License이므로 과거 Apache/MIT 설명을 그대로 적용하지 않는다.

무료 한도 안에서 시작할 수 있지만 영구 무료·무제한·무장애는 아니다. 본인 지갑의 Base 가스비는 SDK 이용료와 별개다. 비용 통제를 위해 유료 전환을 자동 선택하지 않고 한도 사용량을 운영 화면에서 점검한다. 사용자 지갑의 개인키·복구 문구는 수집하지 않는다.

## 실제 구현 전 준비 및 검증

- 무료 프로젝트 ID와 souli.net 허용 도메인, 테스트 origin을 설정한다. project ID는 프런트에 보이는 식별자이므로 도메인 제한이 필요하다. 비밀 관리 키는 브라우저에 넣지 않는다.
- 검증된 버전을 고정하고 필요한 출처만 CSP에 허용한다. 의존성·라이선스 고지와 개인정보 설명을 갱신한다. analytics 등 불필요한 전송은 기본 해제한다.
- 기존 읽기 RPC, 고정 계약 주소/코드/판매 조건 검사, 구매 한도, 저장된 pending 거래, 중복 제출 방지, receipt 검증은 유지한다. 연결 SDK는 서명 요청 전달만 담당한다.
- MetaMask(확장/Android/iOS), Uniswap Wallet(모바일), Rabby(확장), 다른 WalletConnect 지갑 한 종을 최소 검증 대상으로 삼는다. QR, 같은 폰의 앱 전환, 원래 브라우저 복귀, 재접속, 해제, 계정/체인 변경, 거절, 지연/교체 거래, relay 장애를 테스트한다.
- 스마트 계정은 `eth_sendTransaction`의 실제 반환값과 Purchased·Transfer를 검증한다. 사용자 작업 ID를 거래 hash처럼 취급하지 않는다. 성공 미확인 상태에서 재구매를 권하지 않는다.
- Sepolia에서 각 지원 지갑의 구매·수령을 확인한 후, 사용자 서명으로 필요한 소량 메인넷 검증을 한다. 기기별 실제 검증 없이 “모든 지갑 지원 완료”로 표시하지 않는다.

## 이번 변경: My SOULI / 구매 reveal / 공유

`src/soul/`은 기존 MetaMask 연결 후 원본 Base 계약에서 현재 Dynamic·Stable inscription을 읽는다. 별도 로그인 서명이나 NFT 민팅이 필요 없다. 구매 성공 이벤트 검증 뒤에는 수령 수량과 구매자 지갑의 현재 inscription을 표시한다. 추가 구매가 반드시 별도 캐릭터를 만든다고 설명하지 않는다.

사용자 요청에 따라 장식된 showcase·foreground 확대·원본 전환 스위치를 제거했다. 전체 24×24 원본(배경 포함)만 보여주고, 레벨/상태 배지는 이미지 밖에 둔다. 공유 PNG는 원본을 24×24로 그린 후 각 픽셀을 50배 확대한 1200×1200이며 자르기·색 변경·장식이 없다. 원본 SVG 저장도 제공한다. 저장·이미지 복사·공유 링크·X 글쓰기 화면을 지원한다. X 링크는 글과 URL을 담을 뿐 이미지를 자동 첨부하거나 게시하지 않는다. 모바일 파일 공유는 브라우저 지원 여부에 따라 노출한다. 관련 제한은 [Clipboard.write](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write), [Navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)에 따른다.

`/soul/#v=1&seed=…&extra=…` 링크는 원본 렌더러로 이 모습을 재현한다. 주소나 잔액을 링크/PNG에 넣지 않지만 seed는 공개 데이터이므로 익명성 보장은 아니다. 공유된 모습은 현재 소유 증명이 아니며, 원본 컨트랙트의 향후 artwork 설정 변경까지 막는 영구 이미지 보관도 아니다. PNG 파일은 저장 시점의 픽셀을 보존한다. 정적 호스팅의 X 미리보기는 공통 브랜드 이미지이며, 각 캐릭터별 자동 OG 이미지는 구현하지 않았다.
