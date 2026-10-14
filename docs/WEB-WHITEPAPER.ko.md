# 웹 백서 v2.0

2026-10-02 · 정적 문서 · `/whitepaper/`

사용자는 새 PDF/GitBook 대신 홈페이지와 같은 디자인의 웹 백서를 요청했다. `src/whitepaper/Whitepaper.vue`, `whitepaper.css`, `whitepaper/index.html`에 구현했다. 기존 원본 PDF는 역사적 출처로 보존한다. GitBook 관리 계정과 DNS는 변경하지 않는다.

내용: FREE/DOT 접근성, ERC-20i seed/extra 및 on-chain SVG/레이어 원리, Dynamic/Stable의 한계, ETH 시장 날씨와 자동 협동 세계, 현재/미연결 상태, 15M FDV·50k ETH-side 기준 계산, 확인한 잔여 R에 대한 제안 배분, 잠금/운영비 미확정 사항, 수동 LP와 1-of-3 관리 권한, 체인/브라우저/API 역할, 출처/변경 기록.

FUNGI와 Todd Stool / ToddStool.eth에 ERC-20i 원류 크레딧을 본문과 출처에 명시한다. 공식 저장소 `https://github.com/ToddStool/fungi`, `https://github.com/ToddStool/fungi-interface` 확인. SOULI가 최초 발명했다고 주장하거나 공식 파트너십/보안 보증을 암시하지 않는다. 기존 PDF는 Todd Stool 크레딧을 유지하며 원본 내용 전체를 새 문서의 현행 규칙으로 복사하지 않았다. 기존 PDF 6단계 문구 대신 실제 렌더러의 display 1–5 스냅샷을 사용했다.

UI: 데스크톱 고정 목차/읽는 절 표시, 모바일 접이식 목차, 원본 아트 level 선택, 간단한 자금 흐름 도표, R 기준 배분 막대/표, 거래 상태와 제안 구분. 색은 기존 SOULI 코발트/골드; 원본 픽셀은 수정하지 않는다. 줄 길이/가로 넘침/모바일 390px/레벨 선택/콘솔 오류 검증. 메인 내비게이션·푸터와 테스트넷 푸터 연결.

이 페이지는 배분 승인·온체인 잠금·실판매 개시·감사 완료를 뜻하지 않는다. 대규모 운영자 보유분, 투자자 장부 및 계약/렌더러 권한 대조가 아직 필요하다. 최초 운영자별 개인 별칭/관계나 과거 개인 투자자의 정보는 공개하지 않는다.

## 공개 배포 확인

2026-10-02 Azure Static Web Apps production 배포 성공. 공개 URL https://souli.net/whitepaper/ 와 https://souli.net/testnet/ . 릴리스 `logs/azure-releases/static-RvKQ02` (44파일, 2,913,946 bytes). HTTPS/슬래시 유무 route/연결 JS·CSS/보안 헤더/API readiness/메인넷 판매 비활성 검사 통과. 테스트넷 noindex·no-store 유지. 신규 서버나 유료 플랜 추가 없음.

로컬 전체 계약/클라이언트 90개 통과(기존 77 + controller 10 + 새 클라이언트 3), 기존 프런트 검사 10개·서버 23개·production build·런타임 패키지 검사 통과. 스크린샷은 `logs/sale-checks/whitepaper-desktop.jpg`, `whitepaper-mobile.jpg`, `whitepaper-live.jpg`. 콘솔 에러 없음, 모바일 390px 가로 넘침 없음.

2026-10-02 추가 배포 `static-zkCXHw` (44파일, 2,916,065 bytes): 실제 Sepolia controller 공개 주소/읽기, MetaMask smart transaction 확인 복구, 백서 배포 상태 최신화. 배포/유한 승인 체인 영수증 확인, 관련 클라이언트 5개 테스트 통과 및 hosted smoke 재통과. 전체 기본 90개는 앞선 실행 결과이며 변경된 클라이언트 3개 재검증 + 2개 추가 테스트로 총 테스트 정의는 92개다. 신규 controller의 공개 입금·구매·휴대폰 회수는 별도 진행 중이다.

최종 소규모 UI 수정 릴리스 `static-Jo7dOw` (44파일, 2,916,170 bytes): 비연결 상태에서 새 계약을 읽고 새로고침할 수 있으며, 구매 폼 전환은 지갑 연결 뒤에만 활성화한다. Chrome의 입금 요청은 계속 유지했고 대기 중 페이지를 새로고침하지 않았다.
