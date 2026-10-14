# SOULI — 다른 컴퓨터에서 이어가기

## 1.65 · 2026-10-14 · 개발 소스 Git 동기화

- 홈페이지·구매·관리·원본 inscription·백서·서버·계약·배포 설정과 별도 3D 게임 실험을 함께 보존한다. 기본 브랜치는 `master`다.
- 설치·검사 명령을 루트 README에 갱신하고 3D room-v2의 의존성 lockfile을 추가했다. 포함/제외 범위는 `docs/GIT-CHECKPOINT.ko.md`를 따른다.
- 제작 원본 영상/ZIP·운영 로그·계정 캡처·비밀 설정은 로컬에 남긴다. 홈페이지 서비스용 영상·포스터와 개발 소스는 포함한다. 기존 파일은 삭제하지 않는다.
- 이번 작업은 Git 동기화이며 공개 배포·체인 거래를 수행하지 않는다. 아래 배포·재고 기록은 과거 시점이며 최신 잔액으로 해석하지 않는다.

## 1.64 · 2026-10-04 · 캐릭터 중심 게임 티저 / 구매 UX 최종 검토

- 게임 전경을 너무 공개하지 말고 3D 캐릭터는 보이게 하라는 사용자 요청. 기존 원본 `public-souls.json` 첫 캐릭터 + 게임 스레드의 `soul-volume.mjs`/`artwork.mjs`를 읽기 전용으로 사용해 투명 PNG를 렌더했다. `public/media/game/souli-character-teaser-v1.png` 46,670bytes. 홈은 정적 PNG만 읽으며 Three/WebGL 비용 없음. 문구 `Little soul. Big things ahead.`, Game in development, 3D CHARACTER PREVIEW · SAMPLE SOUL. 마을/방/게임은 미출시. provenance `docs/game-teaser-asset.json`, 로컬 재생성기 `tmp/game-teaser/`.
- 이어서 사용자 요청한 구매 최종 UI/UX 검토. 연결주소/Disconnect/연결중 안내 추가, 지갑이 바뀌면 견적·동의 무효화. 대기구매에서 연결 해제·새로고침 시 다시 연결할 버튼이 없던 문제 수정. 재연결은 저장된 영수증을 확인하며 새 결제를 보내지 않는다. 대체 해시 형식 검증, 복구 확인 중 버튼 상태 추가.
- 검토 화면은 subtotal/가스/합계/수령 지갑을 구분, 긴 금액 버튼 대신 Continue to MetaMask와 별도 최종 승인 안내. 개발중/자동환불없음/재판매미보장/50:50 수동 계획/No LP yet 표시. 새소울 기준 레벨·추가구매 시 기존 소울 변화 가능성을 짧게 명시. native-sale/계약/가격/권한 변경 없음. 새 실제 자산 거래·MetaMask 요청 0.
- 실제 컴포넌트와 native-sale/V2를 폐기형 로컬 31337 체인에서 검토: 부족잔액, 거절, 1개 테스트구매, 연결해제·새로고침·재접속으로 원구매복구/새송신0, 오네트워크, 검토중 해제 후 견적무효화 확인. `tmp/checkout-review/`는 로컬 전용이며 공개 번들에 포함하지 않음. 테스트서버는 배포 ZIP 생성 중 watch 오류로 종료됐고, 재실행용 설정에 ZIP 무시를 추가함. 실제폰 신규 구매 검증은 아님.
- native-sale19 + V2/관리클라이언트16 = 35검사 통과. 루트검사/서버23/빌드 통과. 구매320/390/768/1440/2560 가로넘침없음, 게임 티저320/390/2560 캐릭터 이미지/여백 확인. 재고초과/예시변경시수량유지/Lv5제한 확인. 로그 `logs/sale-checks/checkout-final-*`, `game-teaser-*`. 상세 검토 `docs/CHECKOUT-FINAL-REVIEW.ko.md`.
- 공개 Azure SWA Free 최종 `static-7q3id9`,92파일/15,233,751bytes. 티저만 먼저 `static-WqmJxp` 배포했고 최종이 대체. 공개55 HTML/JS/CSS 해시 + 새 PNG 해시 일치. 배포 체인읽기 Base52,155,196 Open/available1,399,999/sold1/remainingToFund2.8M. LP·1년잠금 실제미생성. 외부독립감사 완료로 표현하지 말 것.

## 1.63 · 2026-10-04 · 구매 중심 UX 네 가지 적용 / 공개 배포

- 사용자 네 개선안 전체 승인. 기존 Azure SWA Free 배포 `logs/azure-releases/static-Zhb4AF`,91파일/15,182,223bytes. 신규서버/계약/권한/단가 변경이나 지갑 요청·자산 거래 없음.
- `/buy/`: 제목 하나, 데스크톱 예시+수량/가격 나란히, 모바일 압축.390×844 ConnectMetaMask top754/bottom803(이전1064–1111). 선택화면 가격은 명시한≈반올림 추정치, 검토단계는 정확한ETH/가스/수량/수령지갑/동의 유지. 예시변경은 수량독립. 성공후 View my SOULI 목적지 명확화.
- 검증된 공개재고를 SaleAvailability→BuyPage→BuySouli로 공유. 연결전 초과레벨/직접수량 차단, 지갑잔여한도 결합. 60초초과/읽기실패는 진행차단; visibility복귀/45초공개조회. native quote/send의 최신재검증 유지. 기존pilot/게임모달은 compact/required-public-read 미사용. 새 `test-purchase-availability.mjs`: 정상/부족/0/중지/만료/오류/재입고/지갑한도 검증.
- 홈: 영상→원본예시/구매→현재상품/지불/50:50 사실→Cooking→FAQ4. 샘플6장은 특정외형 판매상품처럼 클릭시키지 않으며 명확한 가격/레벨버튼으로 구매. 기존보유자 MySOULI 별도. 구2Dpreserve링크/중첩FAQ 제거, 상세는 백서앵커. 별도게임채팅의3D대기방은 이번 미통합.
- 320/390/768/1440/2560 두경로 가로넘침없음.390px 홈3720px(이전4831),구매1229px(이전1693).320px는 짧은스크롤필요. 수량초과차단/예시변경수량유지/재고부족Lv5비활성/가이드앵커/게임이미지 확인. 물리폰신규결제/전환율 검증은 아님.
- 루트검사/서버23/빌드 통과. 공개55 HTML/JS/CSS 해시일치,HTTPS/media206/보안헤더/API/비공개파일 통과. `logs/sale-checks/ux-compact-{root,build,deploy,hashes,hosted}.log`, `ux-compact-responsive.json`, `ux-compact-buy-live.png`, `ux-compact-buy-mobile-live.png`.
- 배포읽기 Base52,153,346: Open,available1,399,999/sold1/remainingToFund2.8M. LP/잠금 실제미실행,50:50수동정책. 아래검토만완료/추가개편미구현 표시는과거시점.

## 1.62 · 2026-10-04 · 대기방 제작 위임 / 홈페이지 UX 우선순위 검토

- 사용자가 대기방 기획 후 **`게임 기획 모아 분석하기`에 프롬프트를 보내 진행**하도록 명시했다. `docs/SOULI-WAITING-ROOM-BRIEF.ko.md`를 작성하고 thread `01a0fff5-57f3-7be1-bfef-ee6a9ed35532`에 전달, active/inProgress를 확인했다. 새채팅생성/마케팅채팅메시지는 없음. 아래1.61의 '다른스레드에메시지안보냄'은이전시점이다.
- 게임범위: output/game/waiting-room 독립모듈/프리뷰. LittleDaylight 첫방, RainyWindow/TinyWorkshop후속안. 원본3D/dot/자동생활/사진/저동작/2Dfallback. 웹쪽이지갑원본/구매후통합. 공유src/package/vite/HANDOFF/배포를게임쪽에서수정하지않도록명시. 기존room-v2보존. 게임스레드가완료할때까지이채팅의검토를멈춰둘필요없음.
- 웹사업목표추천: 1현재가치이해와판매완료 2세계관·내소울애착/공유 3정식게임. 화면은영상·캐릭터가치→구매/현재제공→투명한조건→내방/게임Cooking. `docs/SITE-UX-PRIORITIES.ko.md`에실측·우선순위·다음구조기록. 사용자는이번에검토/제안을요청했으며추가개편은아직미구현·미배포.
- 모바일390×844: 홈CTA418–483은첫화면안, 홈높이4831. 구매CTA1064–1111, Get/Meet제목중복. 연결전Level5최소250만선택가능하지만공개현재재고1,399,999라구매전안내불일치. quote/send에는별도최신재고검사있음. 이UX차이를초과판매취약점으로주장하지말것.
- LP는수동/실행일미정. 전량420만완판이강제조건아니며첫140만은공급목표. 추가매출에도50:50. 이번자산이동/새서명0.

## 1.61 · 2026-10-04 · 판매 중심 안내 정리 / 3D 대기방 검토

- 후속 사용자 요청은 여러 스레드의 역할 분리 **제안**. 추천 분담: 현재 `SOULI 개발 환경 이어서 준비`=홈/구매/관리/지갑/블록체인 및 최종웹통합, 기존 `게임 기획 모아 분석하기`=3D모델/개인대기방/게임(기존room-v2 재사용), 기존 `Plan Souli’s growth marketing`=홍보/출시문구. 다른 스레드에 메시지를 보내거나 새 스레드를 만들지는 않았다. 게임쪽이 독립 렌더 모듈을 제공하고 현재쪽이 원본inscription 데이터·구매완료 후 진입을 연결하도록 권장. 공용package/vite/지갑코드/판매설정은 게임제작 중 동시수정하지 않도록 협의 필요.

- 사용자 요청: 관리 지갑 권한 확인, 게임 Cooking 공개, 구매자 중심으로 짧은 구매화면, 다른 게임 스레드의 원본→3D를 활용한 개인 대기방 제안. `/manage/`는 URL/공개정보 조회가 가능하지만 실제 관리 기능은 등록A/B/C의 한 지갑 서명만 가능. UI gate뿐 아니라 배포V2 `onlyOperator`가 검사하며 수금/회수는 실행한 등록지갑으로 돌아온다. 다중승인 아님.
- 홈 주 CTA Get SOULI, 보조 My SOULI. Game · Cooking / A little world. Still cooking. 표시. 과거2D장면 대신 실제 게임 스레드의 하얀마을 스크린샷을 `public/media/game/miniature-development.png`로 복사하여 **EARLY 3D EXPERIMENT · SAMPLE SOULS** 표시. 게임 플레이나 지갑 연동3D가 이미 출시됐다고 하지 않음. 원본게임 실험파일은 수정하지 않음.
- 구매는 재고상태 축약, 레벨/외형/수량/ETH가격/MetaMask 집중. 결제버튼 앞에 Tokens now. Game: Cooking./자동환불없음/재판매미보장. 아래NOW와COOKING 구분. 기술적 입고수치/계약/영수증은 펼쳐보기. 50/50수동/NoLPyet 표시 유지. 실제견적/결제/권한/계약코드 변경 없음, 새지갑요청/거래0.
- 게임 스레드 `게임 기획 모아 분석하기` 읽기만 수행. `output/game/room-v2/{model,preview,soul-volume,miniature-*}` 방/입체화/하얀마을 기반 확인. 현재는 샘플이며 구매자지갑과 미연결. 다음 추천은 **My little room**: 기존inscription 읽기→브라우저입체표현→방에서 자동생활→사진공유. 토큰을 방/새계약으로 맡기지 않으며 새NFT발행도 아님. 무료샘플/원본2D fallback/작은dot/모바일정지·저동작 처리 필요. 이번에는 이 방을 새로 구현하거나 출시하지 않았다.
- 루트검사/서버23/빌드통과. 구매/홈320·390·1440·2560px 넘침없음, 레벨4수량500000/다른외형보기수량유지/직접3개ETH계산/영수증펼치기 확인. `logs/sale-checks/launch-buyer-ui-responsive.json`, `launch-buyer-ui-root.log`.
- 기존 Azure SWA Free 배포 `logs/azure-releases/static-o4AYqF`,92파일/15,181,397bytes. 공개56 HTML/JS/CSS 해시 일치, HTTPS·media·보안헤더·비공개파일/API 검사통과. `launch-buyer-ui-{release,hashes,hosted}.log`, 공개 `launch-home-cooking-live.png`. 웹판매는 이미 열려있고 LP/잠금은 아직 미실행. 홈페이지 게임표시 변경이 실제 게임 출시를 뜻하지 않음.

## 1.60 · 2026-10-04 · 정식 첫 재고 입고 및 판매 개방 완료

- 사용자 MetaMask 서명 완료. A에 추가1,399,001 수령 후 유한승인/입고1,399,999/판매개방 성공. Open sale tx `0xaeb5ea4fdbab5f5f39778e32c6b4cbe02aa274105e466a3244c7ab2d3fc2ba8b`, Base52,151,217, **14:29:41 KST**. 원본V2·가격·cap·운영자 변경 없음.
- 개방 후 재고1,399,999, sold1, 추가입고가능2,800,000, A SOULI0, allowance0, sale/controller ETH0. 이는 시점 기록이며 최신값은 `/buy/`, `/manage/` 또는 `read-commercial-state.mjs`로 확인. 첫 sold1은 과거 테스트 구매다. 새 구매/수금/LP 거래는 이번에 보내지 않았다.
- 공개 `src/site/sale-opening.json`에 승인/입고/개방3영수증. 상세검증 `logs/sale-checks/commercial-v2-first-stock-{approve,deposit,open}-receipt.json`, `first-stock-opening-verification.json`. canonical/from/chain/code/event/실제토큰Transfer 확인. 1 SOULI 읽기 전용 buy call/estimate 성공; 실제 구매 제출 아님.
- 기존 `commercial-proof.json`은 과거 소액검증의 날짜 스냅샷으로 보존. 현재 열린 판매에서 과거 paused/stock0 전용 `prepare-public-sale-proof.mjs`를 실행하지 말 것. 배포는 `prepare-sale-opening.mjs`로 실제3영수증 재검증 → 최신체인읽기 → `checkOpenedLaunch` → build. 유지보수 중지/후속구매/추가입고를 최신상태로 검증한다.
- 백서v2.7/영수증 안내를 기존 Azure SWA Free에 배포: `logs/azure-releases/static-xO11tv`,93파일/14,956,065bytes. 루트테스트/서버23/빌드 통과, 공개HTML/JS/CSS58해시 일치, HTTPS/media/header/private-file 검사 통과. `logs/sale-checks/first-stock-open-{root,release,hashes,hosted}.log`, `first-stock-open-live.png`. API/인프라 변경없음. 기존153계약검사 근거 유지, 계약코드 수정없음.
- **G1–G8 표의 범위 완료. G9 실제LP/잠금 미실행, G10 3D게임 Cooking.** 50:50은 수동정책이며 자동집행/1년잠금완료/외부감사로 표현하지 않는다. LP수령자·일정은 실행 전 결정. 첫matching70만SOULI는 별도. 오늘 추가승인 필요없음; 열린 판매를 임의중지하지 말 것.
- `docs/LAUNCH-GATES.ko.md`가 최신상태표. 아래1.59 이하의 paused/재고없음/서명대기는 과거 기록이다.

## 1.59 · 2026-10-04 · 첫140만 + 추가280만 / 정식 구매·관리 준비 배포

- 사용자 승인: 첫누적140만(기존sold1 포함), 판매 중 추가280만까지입고. 기존420만 cap/고정ETH/검증V2 동일. 처음은 신규1,399,999입고. 첫LP 별도70만/전체LP예시210만, 모든매출50:50 유지. LP실행일미정/수령자잠금배포전결정.
- 사용자 준비후 A에 직접 옮기겠다고 답변. 확인A998, 초기입고목표까지 추가1,399,001 필요(현재잔액유지시). 새체인거래/지갑요청0.
- LIVE_SALE/MAINNET_ADMIN은 같은검증V2로 enabled=true. 이는준비UI활성화이고 체인은여전히paused/재고0/ETH0/sold1. `/buy/`연결전실시간상태, `/manage/`3등록지갑만행동. 첫물량/내잔액/남은전체 버튼, 입고가능량, 유한approve→deposit, 판매중재입고. 실제개방은사용자서명.
- 백서v2.6/홈/공통영수증 안내갱신. 140만은공급목표이며별도온체인cap아님. USD는기존reference; LP는수동계획이며아직없음. 외부감사필수표현제거/미감사공개유지. 과거11.03%를검증된팀보유로꾸미지않음.
- 153계약/클라이언트,루트테스트/빌드통과. 판매중재입고/고갈후재입고/낡은검토초과차단추가검증. 실제V2배포bytecode수정없음. `logs/sale-checks/staged-launch-*`.
- AzureSWA Free 기존앱배포 `logs/azure-releases/static-jE24ed`,93파일,14,953,776bytes. 공개검사통과,HTML/JS/CSS58개해시일치. 관리/구매/백서반응형검증. API/인프라변경없음.
- 배포직전읽기Base52,150,356,A998. 신규배포준비스크립트는15분이내읽기/검증manifest/paused재고0를강제. 다음상태변경후릴리스는이전스냅샷을재사용하지말것.
- `docs/LAUNCH-GATES.ko.md`:G1–G7준비완료,G8재고/서명대기,G9LP잠금미실행,G10Cooking. `FIRST-TRANCHE-100K.ko.md` 최신절차. 아래이전기록의disabled/미확정조건은이버전이대체.


## 1.58 · 2026-10-04 · G6 내부검토 결정 / 첫100K 판매 안

- 사용자는 외부독립감사를 요구하지 않고 내부검토로 진행하라고 명시했다. G6는 기존151검사/코드일치/실제거래/fork 근거의 내부검토 완료로 변경. 외부감사 미실시를 계속 공개하며, 새 독립감사/새 전체스캔 완료로 표시하지 말 것. 외부감사를 다시 필수규칙으로 요청하지 말 것.
- 사용자는21,000개가 작다고 보고 첫$100,000 규모를 제안. 참고가격에서누적1,400,000개=기존4.2M판매의33.33%,전체공급0.6667%. 테스트sold1포함 신규입고1,399,999개. 실제판매고정ETH합계37.3324473099172이며 USD고정cap아님. 기존contractcap4.2M불변. 단순140만입고는hardcap변경이 아님.
- 첫LP$50,000 의미를 질문했고 사용자는 SOULI도$50,000 넣느냐고 물음. ETH$50,000+별도SOULI700,000개(참고$50,000)=LP합계$100,000; 나머지ETH$50,000은운영. ETH/SOULI합계$50,000이면잔여LP예산은운영전환없이보관. 아직실제입고/정식판매조건변경서명없음.
- LP시점고민중. 수령자는잠금배포전확정하면되며만기1년뒤처음지정하는구조가아님.30일기한은제안이었고승인되지않음. `docs/FIRST-TRANCHE-100K.ko.md`에상세계산.
- 이번변경은운영문서/주석정리. 기존공개백서v2.5/계약/판매paused/disabled상태그대로. 다음공개안내갱신때외부감사필수표현은수정하되외부감사미실시표시유지.


## 1.57 · 2026-10-04 · V2 공개 안내 / LP 시간잠금 검증 / 출시 단계표

- 사용자 승인으로 홈·백서v2.5·구매 안내를 실제V2 조건/영수증에 맞춰 AzureSWA Free `souli-web`에 배포. 릴리스 `logs/azure-releases/static-5wGuVE`. 공통 `SaleProof.vue` + `commercial-proof.json`, 날짜/블록 표기 스냅샷이며 실시간으로 가장하지 않음.
- 판매0x9B3b…0B68,controller0xc177…69dA는 변경 없음. paused/재고0/계약ETH0, 누적sold1. 신규입고가능4,199,999개. 정식LIVE_SALE/MAINNET_ADMIN disabled; 이번 신규메인넷거래0.
- 표준 OZ5.6.1 VestingWallet duration0 잠금 후보 구현. 단위8검사 + 실제 Base fork52,125,182에서 V2 LP 예치/조기해제불가/만기회수/기초자산회수 통과. 전체계약151통과, 루트웹검사/빌드통과. LP 메인넷배포/실제예치는 미실행.
- 독립검토입력229파일 ZIP `output/review/souli-v2-mQ7Xn3.zip` 로컬 보관. 외부발송/유료의뢰 없음. 독립감사 완료라고 말하지 않음.
- 최신완료/잔여는 `docs/LAUNCH-GATES.ko.md` G1~G10. G6외부검토,G7재고/LP일정/수령지갑/예산,G8판매개방,G9실제LP잠금은 남음. `LAUNCH-DECISIONS.ko.md` 추천예산/일정을 승인조건으로 오인하지 말 것.
- 개인지갑별칭은 공개자료에 없음. 자동LP/Safe 폐기방향 유지. 게임은 별도3D작업/Cooking. 사용자서명 없이 실제송금/판매재개하지 않음.


## 1.56 · V2 실제 메인넷 소액 사이클 완료 (2026-10-03 23:32 KST)

휴대폰 일반 지갑 `0x1375b43B72676067079fb66969cb85F33EC1768B`의 구매 성공을 직접 검증했다. buy1 tx `0x233e7dec959f238a6a983e311d49f8b3a95adfbccae019dffa505ec5e967b3e1`, Base52,124,010. 1 SOULI/26666033792798wei, direct sale buy 호출/성공 정규영수증/고정코드/Purchased/원본토큰 Transfer/잔액1→2 일치. 원본 renderer에서 Dynamic seed2, UI레벨1의24×24 SVG 정상 조회. 구매 때 별도 두 번째 캐릭터가 생성됐다고 표현하지 않는다. 기록 `commercial-v2-purchase1-receipt.json`.

사용자 MetaMask 최종 승인으로 다음 모두 완료:
- pause `0x748e12bce1a2103e8aacd80222b1688c998494ca0eedea4e91487810d0175409`, Base52,124,143.
- recover41 `0x26ff3a58868c80a3b99e0885e0b719a18589a892b3304cbc1c7693cd124dae11`, Base52,124,229. A957→998, 재고0.
- collect `0xf48d79c3e059312b476870145069cf8fc9cc4d04979b5fee2f4a41f104be9d20`, Base52,124,289. A로26666033792798wei 지급. 실제 A잔액 변화=수금-L2가스-L1데이터비 검증 통과.

최종 Base52,124,303: paused=true,available0,inventory0,controllerheld0,sold1,proceeds26666033792798wei(누적기록),saleETH0,controllerETH0,A998,allowance0. 각 코드/조건/운영자/정확한 효과 이벤트/정규영수증 확인. `contracts/scripts/verify-commercial-{purchase,admin-action}.mjs`와 `read-commercial-state.mjs`, `logs/sale-checks/commercial-v2-{pause,recover,collect}-receipt.json`에 증거. 지갑 대기 요청 없음. 입고→구매→중지→재고회수→ETH수금의 실제V2 기본 동작 검증 완료이며 외부 독립감사/완전안전 보장이 아니다.

정식 홈페이지 판매는 여전히 닫힘. `/pilot-v2/`의 고정설정은 유지하지만 체인 중지/재고0으로 구매불가. 웹 추가배포는 안 함. 이번1개도420만 누적한도를 사용했으므로 새로 입고 가능한 최대는 **4,199,999 SOULI**. 전체누적 최대매출111.9973419297516ETH와 이미수금한1개매출을 구분한다. ETH를 A로 회수했을 뿐 LP/분배/잠금은 실행하지 않았다. 각13333016896399wei의50:50은 수동 예산이고 실제 집행 증거 아님. 다음은 공급 지갑/재고와 기존 약속 확인, 외부독립검토, LP시점·잠금구현·권한 확정, 정확한 공개조건/UI/manifest 출시준비. 사용자서명 없이 새입고/재개/LP거래를 하지 않는다.

## 1.55 · 휴대폰용 V2 구매 경로 공개 (2026-10-03)

일반 구매 지갑이 휴대폰에 있어 https://souli.net/pilot-v2/ 를 Azure SWA Free에 배포했다. 고정 `src/pilot-v2/sale.json`은 검증된 새 sale 0x9B3b5BFbc22821416e390E10e0a30C1AC1960B68이며 URL/저장소/DEV override를 받지 않는다. 기본1개,26666033792798wei,기존 MetaMask 모바일 relay/복구 재사용. 실제 Base ETH/원본 SOULI이며 테스트넷 아님. 42는 초기 입고량, 계약한도는420만. 50:50수동LP/운영비 및 1년잠금은 계획이며 강제되지 않음을 표시.

배포 `logs/azure-releases/static-v2-i2xnYR` (99파일). static-7NLqd2의87파일을 바이트 보존, 새경로/자산11개 및 no-store/noindex 경로설정만 추가. 홈/buy/manage/whitepaper/pilot/soul/보안헤더 유지, 일반checkout disabled. 프로필·지갑 연결/세션/provider검사 및 production build 통과. 320/390px 가로넘침없음, 공개경로/동적SDK자산 포함19개 hash/헤더검사 통과. `hosted-verification.json`, `commercial-v2-mobile-live.png` 보존. Chrome MetaMask 확장 자체 listener경고는 있으나 앱오류는 관측되지 않음. 휴대폰실기기 거래는 아직 사용자확인 대기.

Base52,123,833 (14:16:55Z) 읽기검증: open,stock42,sold0,proceeds0,A957,allowance0,코드/조건/운영자/회계 일치. 재검증 `node contracts/scripts/read-commercial-state.mjs`, 기록 `commercial-v2-latest-state.json`. 휴대폰에서 Connect MetaMask→Base→수량1→Review purchase→내용확인/체크→Confirm→지갑최종승인 안내. 다음 구매영수증/지급/inscription 확인→PC A로pause→남은41회수→ETH회수. PC에서는 새 구매요청을 보내지 않았다. 로컬 관리자 탭 핸들이 사라졌다면 `/tmp/commercial-v2/manage.html` 재개. 서명 대기중 소스수정/HMR/새로고침 금지. 외부감사/LP생성/잠금/정식전체판매 완료로 표현하지 않는다.

## 1.54 · V2 재고42 / 판매열림 / 일반 구매 지갑 선택 대기 (2026-10-03)

deposit42 성공 tx0x66fced6d1bf09632639833264ab5fd422415d05288ddab0f386a2e8c8c82c3f9, Base52,123,021. startSale 성공 tx0x4ecd497dd2430caa561016aec7f1935b3098d084610e07ba8a969065ea6323eb, Base52,123,073. 둘 모두 MetaMask 스마트거래 envelope이므로 outer to는0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3이다. 직접controller호출이라고 가정한 별도검사는맞지않았고, 기존 production검증과동일한 wallet반환hash/원래A/chain/nonce10·11/정규영수증/pinnedcontroller코드/정확한StockFunded(A,42)·Unpaused(controller)를확인해기록했다. contracts코드/권한은변경없음.

Base52,123,190 상태: paused=false,available42,sold0,proceeds0,controllerheld0,ETH0,A957SOULI,allowance0. logs/sale-checks/commercial-v2-{deposit42-receipt,start-receipt,stock-open-state}.json. 홈페이지의정식checkout은닫혀있지만 **계약은현재온체인구매가능**하며 재고42이다. 소액확인후pause/recover/collect해야한다.

Chrome http://127.0.0.1:5173/tmp/commercial-v2/buy.html 열림,수량1,0.000026666033792798ETH+gas,Review purchase활성. 아직A0x4a4A…25BB연결. 사용자에게 A/B/C가아닌 이전일반구매용MetaMask계정으로선택변경 요청중. 현재구매서명요청은없음. 다음은연결주소확인→1개견적/최종승인→receipt/inscription확인→관리A복귀→pause→recover41→collect. 관리탭도보존; 소스/HTML편집으로지갑대기페이지를reload하지않는다. 화면 commercial-v2-buyer-ready.png.

## 1.53 · 42 SOULI 사용 승인 확인 / 입고 요청 대기 (2026-10-03)

사용자가 승인했다고 확인. approve42 tx0x2afb5e2a995d38b6ed3242af1950b8f90ca4371f10251bf19bc7ab31324de161, Base52,122,861. 원본token의Approval(A,새controller,42000000000) 및 현재allowance42개 확인. 브라우저의 저장된 hash없는요청에 이hash를입력해 Verify receipt 성공; 중복승인 전송하지않음. logs/sale-checks/commercial-v2-approve42-lookup.json 보존.

같은 Chrome commercial-v2/manage.html에서 수량42,depositStock 대상새controller0xc177…69dA,예상가스0.000003272679190033ETH를검토하고 MetaMask에입고요청을보냈다. **입고 최종 사용자서명/해시/성공은아직미확인**. 승인확인 후 재고42/A957/잔여allowance0/paused유지를검증하고 판매재개요청으로이어간다. 아직판매재개/구매/회수/수금요청없음. 요청대기중에는 Vite의HTML/화면소스를수정하거나탭을새로고침하지말것(지갑요청의응답을유지). 상태화면 commercial-v2-deposit42-request.png.

## 1.52 · V2 메인넷 배포·코드 검증 완료 / 42개 승인 대기 (2026-10-03)

새 V2 배포 성공: tx0xcd98087074ee7438cdd836a3c5b705be0b46bacd5e8cf8f5a7d74dca6d8f2407, Base52,122,407. controller0xc177F10Da4c62FBbef8182e82EE09F7Db79769dA, sale0x9B3b5BFbc22821416e390E10e0a30C1AC1960B68. 55확인 시점 정규 영수증/정확한CREATE/type2/calldata/nonce/코드/단가/세운영자 검증 통과. paused=true,재고0,sold0,ETH0. 단가는26666033792798wei,round/wallet4.2M,무기한,50:50이다. commercial-v2-deployment-receipt.json 보존.

Sourcify의두계약 creation/runtime exact_match 완료. 로그 commercial-v2-sourcify-{submission,results}.json, verification-input.json. BaseScan/Etherscan·Blockscout 자동전달은 외부rate limit오류로 완료확인안됨; Sourcify검증과 구분한다. 계약소스일치는 독립감사가 아니다.

Chrome http://127.0.0.1:5173/tmp/commercial-v2/manage.html 에서 A연결,42개 사용승인 요청을 보냈다. **아직 이 approval거래의 사용자최종서명/해시 미확인**. 대상 원본token0xb43e…39aFF,spender새controller0xc177…69dA,수량42,예상가스0.0000003457305959ETH. 중복 요청하지 않는다. 승인확인→deposit42→start→별도지갑buy1→pause→recover41→collect순서가 남음. 아직입고/개방/구매는하지않았다.

조회timeout복구는 production createAdminReader의 기존읽기전용fallback을 배포UI/검증CLI에서도 재사용했다. 계약/서명내용 변경없음. 로컬관리화면의 구매링크를 V2 buy.html로맞추고 개발기본입고수량을min(42,cap)로제한했다. 웹build통과,공개웹배포/판매manifest변경없음. 증거 commercial-v2-approve42-request.png, commercial-deployment-ui-build.log.

## 1.51 · V2 메인넷 배포 요청 대기 (2026-10-03)

사용자가 새 계약 배포 및 소량 메인넷 검증을 지시했다. 최신 Coinbase ETH/USD2678.635(22:19:46 KST)에서 1 SOULI=26666033792798wei=0.000026666033792798ETH로 후보를 만들고, tmp/commercial-v2/deployment-review.json 및 deployment-context.json에 고정했다. 4.2M round/wallet cap, endsAt0, 기존 A/B/C,50:50 유지. A999SOULI 확인. 배포 뒤 계획은42개 유한 승인/입고→일반지갑1개구매→중지→41개회수→ETH수금이다. 아직 입고/판매/구매 요청은 하지 않았다.

Chrome의 http://127.0.0.1:5173/tmp/commercial-v2/deploy.html 에서 A 연결, nonce8/원본코드/위임/예측주소/잔액/가스 preflight 통과. 예상 수수료0.000016466298262299ETH. **MetaMask 배포 최종 승인 요청을 보냈으며 아직 거래 해시/승인/배포 성공 미확인**. 중복 요청 금지; 같은 Chrome 탭과 localStorage 기록을 먼저 복구한다. 예상 controller0xc177F10Da4c62FBbef8182e82EE09F7Db79769dA / sale0x9B3b5BFbc22821416e390E10e0a30C1AC1960B68이며 확인 전 자산전송 금지. 화면 증거 commercial-v2-deployment-request.png.

검증 도구 contracts/scripts/check-commercial-deployment.mjs <HASH>는 정확한 CREATE거래/type2/nonce/chain/from/calldata/정규2확인/runtime/조건을 검사하고 commercial-v2-deployment-receipt.json 및 로컬 verified-{admin,sale}.json을 만든다. 그 뒤 tmp/commercial-v2/manage.html에서 수량을42로 맞춘다(기존 AdminApp 기본은전체cap). buy.html은 같은 로컬V2구매화면이다. 최신후보생성 스크립트는 고정review가 있으면 덮어쓰기를 거부한다. 새 후보를 임의로 만들어 현재 MetaMask요청을 바꾸지 않는다. 공개 웹과 계약판매는 아직 변경하지 않았다.

## 1.50 · 상업 판매 사전 검증 / 143개 테스트 통과 (2026-10-03)

이 절이 아래 과거 기록보다 우선한다. 사용자 확정: 첫 판매 4,200,000 SOULI, 지갑 누적 한도도 4,200,000(별도 개인 제한 없음), 달력 마감 없음, 실제 구매 ETH 50% 수동 LP+별도 SOULI / 50% 운영, 첫 LP 생성 후 원금 1년 잠금 방향. 실제 LP/잠금 계약은 아직 없고 잠금 구현·수령자·실행 시점은 미확정이다. 판매+LP 준비량은 최대 6.3M; A의 이번 읽기 잔액 999개는 소액 확인용이다.

V1/V2 Solidity 생성 코드는 보존. 배포 도구는 현재 A의 정확한 MetaMask EIP-7702 위임 주소·코드 해시가 검토와 일치할 때만 direct type-2 CREATE를 허용한다. 새 위임/권한 요청은 하지 않는다. 일반 EOA 검증은 유지한다. runtime 검증은 동일 immutable의 여러 사용 위치가 같은 값인지 확인한 후 비교하도록 보완. 브라우저는 완료된 이전 회차 배포 기록을 보관하고 다음 회차를 준비하며, 미완료 회차나 보관 실패는 새 서명 요청을 막는다.

검증: 계약·클라이언트 143 PASS/0 FAIL, 전체 npm.cmd test(프런트·서버23·build·격리 패키징) 통과. Base 52,120,901의 원본 SOULI와 A의 기존 위임 상태를 복제한 로컬31337에서 실제 배포 클라이언트, dot/LV4/LV5, 한 지갑 4.2M 완판, B 재고 회수/재입금, C 재개/수금, 초과판매 거부를 확인. 공개 체인으로 보낸 거래 0건이다. 로그 commercial-final-{contracts,root-test}.log, commercial-v2-base-fork.json. 모든 실기기/새 V2 메인넷 거래 또는 외부 독립 감사 완료를 뜻하지 않는다.

Slither 0.11.5는 13계약/101detector에서 32항목(High2/Medium4/Low4/Info22)을 냈다. 결과 0건으로 표현하지 않는다. 코드 맥락과 추가 콜백 테스트를 정리한 docs/SALE-SECURITY-REVIEW.ko.md 참조. 사용자 지시로 Daybreak는 추가 호출하지 않는다. Codex Security 일반 소스 검토와 기존 결과 저장은 Daybreak가 아니며, 앱의 자동 추가 검사 알림을 해제할 수 있다고 약속하지 않는다.

읽기 전용 후보 생성: scripts/prepare-commercial-candidate.mjs → tmp/commercial-v2/{review,context}.json. 2026-10-03 21:41 KST 후보는 preflight 통과했지만 배포되지 않았으며 서명 전 가격/nonce/시작시각을 새로 검토해야 한다. 예측 주소에 자산을 보내지 않는다. 로컬 확인 화면 http://127.0.0.1:5173/tmp/commercial-v2/ (1280/390px 확인). 백서 v2.4 및 잠금 방향 안내는 로컬 변경이며 공개 배포하지 않았다. 공개 판매/관리 manifest 비활성 유지, 새 지갑 서명 대기 없음.

다음 순서: docs/COMMERCIAL-LAUNCH-RUNBOOK.ko.md. 새 중지 상태 V2 배포의 실제 사용자 서명 → 코드/소스/조건 일치 → 제한된 원본 토큰 소액 사이클 → 잔여 출시 조건·재고 준비 → 별도 판매 개방. 새 배포 자체와 공개 판매 시작을 구분한다. 다른 스레드의 output/game/room-v2는 변경하지 않았다.

## 1.49 · 50:50 확정 / 완판 기준 V2 구현 (2026-10-03)

최종 UI검증: 전체 npm.cmd test 통과(프런트,서버23,build,격리패키징), release artifact버전혼합 방지보완 후 build 재통과. 1280px 홈자금안내,390px 백서/구매상세 가로넘침없음·구매닫힘·콘솔오류0 확인. 브라우저viewport검사이며 실기기V2거래검증 아님. 증거 commercial-5050-desktop.png, commercial-5050-whitepaper-mobile.png. 로컬미리보기 http://127.0.0.1:4173/#receipts. 공개배포 없음.

사용자가 50:50을 승인했다. 첫 판매420만 SOULI(공급2%), 달력 마감 없음, 실제 구매 ETH50% 수동LP+별도SOULI/50%운영으로 진행한다. FDV15M/공급210M 참조에서 완판매출약300kUSD → LP ETH150k+별도210만SOULI명목150k=LP양쪽300k, 운영150k비용전. 판매+LP재고630만(3%). 과거90일/15:85/양쪽LP50–100k 목표는 현재 기준에서 대체됨. 지갑한도700k는 제안, 단가/ETH환율기준/시작시각/nonce/LP실행시점·소유·잠금/예산은 미정. 완판을 LP의 필수조건으로 추가하지 않는다. LP전에 고정가 판매중지/가격·재고 검토.

V1 source/creationbytecode 및 기존 공개testnet artifact를 그대로 보존하고 별도 SouliEthSaleV2 / SouliThreeWalletControllerV2 생성. VERSION2, endsAt0=no deadline, 시작시각/짧은견적TTL/고정판매한도/누적지갑한도 유지. 50:50 policy를 termsHash에 포함(집행강제 아님), manifest/실제version/runtime검증, release도구는version별artifact를선택. V1 zeroend거부 및기존review직렬화유지. draft는version2/cap4200000/end0, 나머지null이라 배포불가. policy/calculator/doc갱신.

검증: V2추가9 + 기존125 = 계약134 PASS.10년후구매/견적만료/유한기한호환/완판100년후재개불가/불완전결제·토큰실패·무권한·재진입·거부수신자/원본ERC20i420만stock/실제관리client입출금 검증. 공개Base RPC/서명/신규거래를사용하지않은 로컬검사다. logs/sale-checks/commercial-v2-{test,full-contracts}.log 및evidence.json. 보안추가범위는 docs/SALE-SECURITY-REVIEW.ko.md. 독립감사 미완료.

로컬 홈/구매상세/백서v2.3에 승인50:50과630만재고계산 반영. 무기한을1970날짜로표시하지않음. V2관리자는 누적매출기준50:50예산을표시하되 실제잔액/LP증거아님을설명. V1pilot에는 이정책을소급표시하지않음. 새배포/실판매개시 없음. 공개는 static-7NLqd2/v2.1, /buy/와MAINNET_ADMIN 비활성. 마지막확인pilot상태중지/빈계약. 추가서명요청없음.

A의EIP7702와기존EOA배포경로호환성은아직미해결; preflight안전장치그대로. 조건·배포경로/독립검토→새중지V2배포와실물소액사이클→소스검증·공개조건/manifest일치→판매개방 필요. 해당시점수량/가스/주소를최종검토하고서명받는다. 다른3D게임스레드파일은수정하지않음.


## 1.48 · 완판 기준 선택 / 50:50 자금 배분 비교 (2026-10-03)

사용자가 “420만개 판매인거지? 90일.. 완판으로하자 … 반 LP반 운영할까?”라고 했다. **90일 제안은 취소하고 달력상 마감 없이 완판을 목표로 하는 방향을 기록**했다. 기존 계약의 mandatory endsAt/클라이언트는 아직 수정하지 않았다. 금액·비율을 비교하는 단계이며 공개 배포·지갑 요청 없음. 앞선 async의 90일/15:85 일괄 승인 질문을 최신안으로 재사용하지 말 것.

추천은 운영예산이 맞는다는 전제로 실제 구매ETH 50%를LP에+별도맞은편SOULI,50%운영. **비율은 아직 질문/제안이지 최종 승인 아님**. 판매420만(공급2%)과 LP210만(1%)을 분리, 완판 준비합계630만(3%). 기준$300k매출이면 LP ETH$150k+SOULI$150k=총$300k,운영$150k비용전. 앞선 양쪽LP$50k–100k보다 큰 계획이므로 동일한 안으로 설명하지 말 것. FDV15M/ETH고정가의 환율변동 주의 유지. LP 개설은 완판과 별도 결정; 개설 시 고정가판매 먼저 중지/이후조건 재검토. 자동LP/무조건완판까지LP대기/영구잠금으로 확정하지 않는다.

`docs/COMMERCIAL-SALE-PLAN.ko.md`와 계산 스크립트/JSON에 최신50:50 추천 및15:85 비교를 반영했다. `scripts/test-commercial-plan.mjs` 통과, 정수wei보존/비율입력검증/배포필드null 및미구현마감정책 구분. production Solidity, 공개웹/로컬UI, sale/admin manifest는 변경하지 않았다. 백서v2.2 로컬초안에는 이전LP범위가 남아 있으므로 최종비율확정 후 발행 전에 일치시켜야 한다. 독립감사/7702배포경로/LP소유·잠금/운영예산/70만지갑한도/최종가격시각은 여전히 미확정.

## 1.47 · 상업 판매 조건 재계산 / 내부 보안 검토 / Cooking 로컬 초안 (2026-10-03)

사용자는 게임 완성 전 기존 토큰 판매를 원하며 게임은 Cooking, 새 게임은 다른 스레드 `게임 기획 모아 분석하기`에서 3D로 개발 중이다. 이 작업은 해당 스레드의 `output/game/room-v2`를 변경하거나 메시지를 보내지 않았다. 매출 희망 범위 $200,000–$300,000, FDV 기준 $15M/공급210M. **최신 답변: LP $50,000–$100,000은 ETH+SOULI 양쪽 합계**. 이전 ETH 쪽만 $50k, 700k판매, 100% LP 안을 확정 조건으로 재사용하지 말 것.

제안 문서 `docs/COMMERCIAL-SALE-PLAN.ko.md`, 계산 `scripts/plan-commercial-round.mjs` → `docs/commercial-round-proposal.json`, 검사 `scripts/test-commercial-plan.mjs`. 추천: 판매 최대4.2M/지갑700k/최소1, 90일 또는 완판, 실제 구매ETH 15%+별도SOULI로 LP, 85%운영재원. $200/250/300k에서 LP 양쪽$60/75/90k, 별도SOULI420/525/630k. 토큰 팀15%와 ETH사용15%는 다름. **아직 승인 안 된 제안**. async질문으로 위 조건 선택 요청 중; 답변 전 승인된 것으로 바꾸지 말 것. LP시점·소유/잠금·운영예산 및 실제 ETH/USD/wei/기간/nonce도 미확정. 현 계약은 immutable endsAt이 필수이므로 무기한 판매 불가; 명시적으로 변경 설계/검토가 필요하다.

`docs/SALE-SECURITY-REVIEW.ko.md`: 기존 계약 suite120/추가실패상황5 통과, root/contract npm audit 경고0. root sass 경로의 watcher2.4.1→2.6.0으로 braces 취약 의존성 경로 제거. production Solidity는 변경하지 않았다. 새 adversary는 `contracts/test/fixtures/CommercialAdversary.sol`에 분리하고 public testnet fixture ThreeWalletLab.sol은 기존 SHA256 5cc17a47…c02e로 정확히 복원했다. testnet export 재생성 후 전체 root npm test(프런트,서버23,build,격리패키징) 및 추가5개 재통과. 기존 공개 testnet 계약 metadata를 실수로 변경하지 말 것. 로그 `logs/sale-checks/commercial-*`.

공개 read-only Base52,114,159에서 pilot paused/sold1/available0/ETH0, 누적proceeds26684264049332wei 유지. 원본maxBuy210M. production creation bytecode는 기존 pilot 검토와 동일. 원본owner/pool A159…49c8의 아트 setter 권한 남음. **A 지갑은 현재 EIP-7702 위임 코드가 있어 기존 EOA-only 배포 preflight가 거부한다.** 새 상업 배포 경로 검증 전 안전장치를 삭제하거나 nonce 주소예측을 재사용하지 말 것. 기존 pilot회수는 성공했고 새 거래는 요청하지 않았다. 세 지갑 중 하나만 탈취돼도 전액노출, operator교체불가, LP비율미강제는 의도된 구조의 위험으로 문서화. 외부 독립 감사 미의뢰/미완료.

로컬 홈은 My SOULI / Meet my SOULI→`/soul/`, 게임은 Cooking/3D개발중, 기존2D는 초기prototype 링크. 구매·내SOULI·백서 CTA도 일치. 백서v2.2는 새 매출 및 LP양쪽총액 범위/운영비부분 미확정을 반영하고 기존pilot영수증 보존. 320/390/1280/2560 화면 가로넘침없음, contain영상 및CTA/모바일목차/소유화면 연결 확인. 브라우저뷰포트 검증이며 모든실기기 테스트 아님. 증거 commercial-{home-mobile,cooking-desktop}.png. **로컬 변경만, 새 공개 배포 없음**. 공개는 계속 static-7NLqd2/v2.1, /buy/와 MAINNET_ADMIN disabled, pilot paused/empty. 다음은 조건답변→위 검토미해결점/독립검토→새중지계약 배포서명→코드/조건/소액검증→공개판매 순서다.

## 1.46 · 메인넷 소량 검증 완료 / Manrope 공개 적용 (2026-10-03)

사용자가 재고 회수와 ETH 수금의 MetaMask 최종 서명을 완료했다. recoverInventory(41): tx 0x0e70c838a1a137b329e5b50fca8dccf5c2f04008e46e56f08ab4c7f5537e2563, Base52,113,148. 정규 status1/41확인/과거 controller 코드/정확한 StockRecovered(A,41000000000)를 확인. 원본 Transfer는 sale→controller→A 두 단계 각각41개이며, 직접 sale→A 한 단계로 오인하지 말 것. logs/sale-checks/mainnet-pilot-recover41-receipt.json.

collectProceeds: tx 0x2f955eb0cb8f6d9d17d823f635ae93275f9a63a9b1edbd4c4e88b99a9fd69316, Base52,113,223. 정규 status1/17확인/과거 코드/정확한 EtherCollected(A,26684264049332)와 최신 상태 확인. A 0x4a4AA86208EcFdBACBaD551dF7baf5D3C84425BB로 0.000026684264049332ETH 수금 완료, LP투입 아님. sale/controller ETH0 및 토큰0, A999SOULI, 일반 구매자1SOULI, allowance0, sold1, 누적판매대금26684264049332wei, paused=true. 수금은 누적매출을 초기화하지 않는다. logs/sale-checks/mainnet-pilot-collect-receipt.json, mainnet-pilot-cycle-complete.png. 기본 메인넷 입금→일반구매→중지→미판매회수→수금 완료이며 전 보안상황 검증/독립감사/정식상업출시 완료를 뜻하지 않는다. 추가 서명 대기 없음; 판매를 임의 재개하지 말 것.

사용자가 현대적 산세리프 + 작은 게임 픽셀 포인트를 승인했다. src/styles/souli-typography.css와 self-hosted Manrope variable Latin WOFF2(24,836bytes,400–800,SIL OFL1.1)를 추가하고 8개 활성 진입점에 적용했다. 홈/구매/내SOULI/게임/백서/testnet/관리 UI의 기존 폰트 선언을 공통 변수로 정리, 제목·버튼·반응형 크기 조절. 게임 san-kind는 픽셀, 원본24x24아트/로고/색/영상 구도 유지. 관리자 긴 ETH값을 끊지 않게2열+모바일금액전폭 배치. tmp/mainnet-pilot/manage.js에도 로컬 폰트 적용(서명 없음). 외부 Google font요청/유료서비스 추가 없음. 라이선스 public/fonts/manrope/OFL.txt 및 source.json 동봉.

백서 v2.1은 이전 testnet-only 문구를 수정하고 실제 메인넷 pilot 구매/재고/대금회수 영수증을 공개했다. 정식판매닫힘/pilot중지, LP미투입, 독립감사미완료를 구분한다. 배분/판매조건/계약코드 변경 없음.

기존 Azure SWA Free에 최종 static-7NLqd2(88파일,14,925,571bytes) 배포. 중간 static-Tw4PaJ 및 이전 static-zp2N2e 보존. 전체 npm test(프런트·서버23·빌드·격리패키징) 통과, 최종 문구/금액배치 build 통과. 320/390/1280/2560 홈 및390px 주요페이지 가로넘침없음, 2560화면 video1920x1080 contain/무음자동재생, 원래24x24 표시, 관리자320px 긴금액한줄 확인. 공개 hosted경로·미디어·보안·API검사 통과; HTML/JS/CSS/폰트/라이선스55개 SHA256 일치, font/woff2정상. logs/sale-checks/typography-* 및 logs/azure-releases/static-7NLqd2/typography-hosted-verification.json. 브라우저 에뮬레이션이며 실제 모든 휴대폰 기기 검증으로 표현하지 않는다.

현재 공개 https://souli.net/ 및 /soul/ 최신. /buy/와 MAINNET_ADMIN disabled 그대로, /pilot/ 계약은 paused/empty. Chrome 로컬관리탭은 HMR 후 미연결(읽기상태정상); 다시 관리할 때 명시적 MetaMask 연결 필요. 폰트변경 후 거래 요청을 보내지 않았다. 남은 작업은 정식판매 조건·소유/약속물량 정리·독립보안검토와 출시준비, 게임고도화. 지갑별 역할/다른 기기 추가 검증은 별도로 남는다.

## 1.45 · 일시중지 성공 / 41개 회수 서명 대기 (2026-10-03)

사용자 Confirm 이후 pauseSale 성공: tx 0x0dfdb4f65d538f43a644afd40618b5707d365d26e7ee4e554396d1867b11de60, Base52,112,465. status1/정규블록/30확인/과거controller코드/판매계약 Paused(controller) 이벤트 및 최신 paused=true 확인. UI 자동복구 Transaction confirmed. 증거 logs/sale-checks/mainnet-pilot-pause-receipt.json. 상태 재고41/sold1/판매대금26684264049332wei/A958/allowance0 그대로.

로컬manager에서 회수량41, receiving A 0x4a4AA86208EcFdBACBaD551dF7baf5D3C84425BB, Base controller D643…c252를 검토하고 recoverInventory(41) 요청을 MetaMask로 전송. 예상가스0.00000313547359187ETH/value0. **아직 회수 성공이 아니라 사용자 최종 서명 대기.** async질문 전송, Chrome tab1343519035 유지. logs/sale-checks/mainnet-pilot-recover41-review.png. pending 유지/HMR·리로드·중복전송 금지. 승인후 StockRecovered(A,41000000000), 원본Transfer, sale0/A999/구매자1 확인하고 collectProceeds를 별도 사용자서명으로 진행. ETH는 아직 sale에 있다.

추가 사용자 질문: 픽셀 폰트 유지 vs Doodles식 현대적 글꼴 비교. 메인/구매/본문은 현대적인 산세리프, 픽셀은 게임의 짧은 레벨표시 등 포인트만 남기는 혼합을 권장하는 방향. 아직 폰트 변경/배포 승인이나 적용은 하지 않았다. Doodles 현재 DOM은 Gilroy를 UI에 사용함을 확인.

## 1.44 · MetaMask 전용 확정 / 원본·공유 공개 / 회수 서명 대기 (2026-10-03)

사용자가 첫 출시는 MetaMask만 유지하고 다음 검증을 진행하기로 확정했다. 다중 지갑 제안은 보류. Connect MetaMask 문구로 구매/게임/연결 화면을 통일하고 EIP6963에서 타 브랜드를 임의 선택하던 fallback을 제거했다. MetaMask 공식 rdns 우선, legacy는 MetaMask 식별과 request 함수가 있고 알려진 타 브랜드 플래그/announcement가 없는 제공자만 허용. 이 식별을 진위 인증으로 설명하지 않는다. SDK·유료서비스 추가 없음.

기존 Azure SWA Free에 static-zp2N2e(84파일,14,888,245bytes)를 배포했다. 이제 https://souli.net/soul/ 및 원본 seed 공유 링크가 공개로 동작한다. 구매 후 원본24x24 reveal·PNG/SVG 저장·이미지복사·링크·X초안·지원 기기 native share를 포함한다. /pilot/ 상단 My SOULI 추가. 공개 구매/게임은 MetaMask 전용 버튼, 정식 /buy/와MAINNET_ADMIN disabled 유지. 이전 static-gpw3FA 보존. 새 서버/계약/가격변경 없음.

검증: 전체 npm test(서버23/프런트/빌드/격리패키징), 계약구매/관리/read-RPC34회귀 통과. 공개 /soul 포함 경로·미디어·보안·API·비공개파일 검사 통과, 주요HTML/JS/CSS35개 SHA256 일치. 공개390px 원본/이미지복사/링크복사/콘솔오류0 확인, Chrome 공개pilot Connect MetaMask 확인. logs/sale-checks/metamask-release-tests.log, metamask-sale-regression.log, metamask-hosted-release.log, inscription-public-mobile.png; logs/azure-releases/static-zp2N2e/inscription-hosted-verification.json. 실제 Android/iOS 파일 저장 및 공유대상 앱 전달은 아직 미확인. X 자동 이미지첨부/게시는 아님.

Base52,112,245 재확인: sold1/재고41SOULI/판매대금26684264049332wei/controllerETH0/A958/allowance0/Open, 계약코드·권한·조건 일치. 관리 ETH회수 리뷰에 당시 인출 가능 ETH와 수신 지갑 표시를 추가하고 회귀검사했다. 기존 A지갑은 Chrome 로컬manager에 연결됨.

현재 **pauseSale 서명 요청을 MetaMask로 보냈으며 사용자 최종 Confirm 대기**다. 아직 pause성공·재고/대금회수 완료로 쓰지 말 것. 예상 네트워크 비용0.000000392378390451ETH, value0, Base controller D643…c252, 판매83bc…fB01. 사용자에게 async 요청했고 아직 응답 없음. Chrome tab1343519035 http://127.0.0.1:5173/tmp/mainnet-pilot/manage.html 유지. screenshot logs/sale-checks/mainnet-pilot-pause-review.png. 중복전송/HMR/리로드 금지. 기존 pending키와 request 상태 유지.

다음: pause 성공receipt/Paused 확인 → quantity를 최신 미판매 재고(현재41)로 맞춰 Return unsold stock 사전검토·사용자서명 → StockRecovered·원본Transfer·sale/A잔액 확인 → Collect ETH 사전검토·사용자서명 → EtherCollected·계약ETH0 확인. 회수는 요청한 등록A지갑으로만 간다. 팔린1개는 구매자에게 유지되고 LP추가는 별도다. 필요 시 재입금은 별도 사용자서명. 정식판매 개시와 독립 보안 검토는 별도이며 이pilot을 완료 전 완료로 보고하지 않는다.

## 1.43 · 원본 24×24 전용 / 지갑 서비스 무료 우선 (2026-10-03)

사용자는 장식된 showcase 없이 원본 24×24 이미지를 잘 보이게, 지갑 서비스는 유료 구독 없이 운영하기를 요청했다. SoulCard의 무대/전경 확대/원본 토글을 제거하고 전체 원본과 바깥 레벨·상태 배지로 단순화했다. 원본 24×24를 먼저 rasterize하고 정확히 50배 확대해 1200×1200 PNG로 공유한다. 화면도 생성된 PNG를 사용해 분수 배율 SVG 경계선이 보이지 않게 하며 원본 SVG 저장을 추가했다. clipboard/native-share의 늦은 결과가 다른 캐릭터 선택에 덮어쓰이지 않도록 방어했다. 1.42의 showcase 설명은 이 변경으로 대체된다.

검증: 전체 npm test(프런트/서버23/build/격리패키징) 및 최종 build 통과. 레벨1 실제 구매자의 모습과 레벨5 예시 PNG 각각 1,440,000픽셀 전부가 원본 SVG의 정확한 50배 확대와 일치. 320/390/1280 반응형·정사각형 전체 표시, 실제 영수증 읽기, 이미지복사·링크복사 성공. logs/sale-checks/soul-original-tests.log, soul-original-final-build.log, soul-original-pixels.txt, my-souli-original-*.png. 실제 Android/iOS 앱 공유 전송과 OS 파일 저장 완료는 미검증; X 글+URL 외 자동 이미지 첨부/게시는 제공하지 않는다.

현재 MetaMask 연결은 유지. EIP6963 범용 설치형 선택을 먼저 제안하고 WalletConnect/Reown은 다양한 모바일 지갑이 필요할 때 무료 한도 내 선택안으로 검토한다. Connect wallet 일반 버튼과 WalletConnect 제품은 다름. Reown 무료는 무제한 영구 보장이 아니며 유료 서비스·새 SDK·프로젝트 가입 없음. docs/WALLET-COMPATIBILITY.ko.md 갱신. 이번 변경 로컬만; 공개 static-gpw3FA 및 판매 조건 그대로. /soul/은 아직 공개되지 않아 로컬 공유 링크를 외부 서비스용으로 안내하지 말 것.
## 1.42 · 일반 구매 성공 확인 / My SOULI와 공유 화면 로컬 구현 (2026-10-03)

사용자의 일반 지갑 `0x1375b43B72676067079fb66969cb85F33EC1768B`(A/B/C 아님)이 실제 원본 SOULI 1개를 구매했다. tx `0xa5c53410b5af2935dcab5e2bb6f9ebc5b59b6cfbc26083953821f01ce85234d5`, Base블록52,110,072. 정규 receipt/status1/108확인, 정확한 Purchased(1,26684264049332wei), 원본 token Transfer와 구매자 잔액1개 확인. 확인 당시 sale Open/재고41/sold1/대금0.000026684264049332ETH/controllerETH0/A958/allowance0. `logs/sale-checks/mainnet-pilot-buyer-receipts.json`. 단일 일반 구매 성공이며 메인넷 pause/재고회수/대금회수는 아직 남아 있다.

`src/soul/` 추가: `inscription.mjs`는 원본 코드해시/8453/최신블록/정규블록을 확인하고 Dynamic+Stable을 페이지당 최대6개씩 읽는다. SVG는 원본의 rect-only 형식만 허용. 주소 변경·unmount 시 요청 중단/이전 결과 폐기. 구매 영수증의 blockNumber 이전 상태는 표시하지 않는다. `PurchaseReveal.vue`를 공용 BuySouli 성공 상태에 연결해 체크 표시 대신 **1 SOULI received. + 실제 구매자 지갑의 현재 inscription**을 표시한다. 추가 구매를 항상 새 캐릭터 민팅으로 설명하지 않는다. Sepolia 테스트 토큰은 원본 artwork로 가장하지 않는다.

`/soul/` 페이지는 연결된 지갑의 My SOULI, 홈 Find my SOULI/구매 화면 링크를 제공한다. `/soul/#v=1&seed=…&extra=…` 공유 링크는 누구나 원본 렌더러로 보되 current ownership 증명이 아니다. 원본 전체/foreground showcase 전환, dot 확대, reduced-motion 존중. 1200px PNG 생성·저장·이미지복사·X 초안·공유링크·지원 기기 파일 공유. 이미지 생성은 로컬 canvas이고 외부 업로드/게시 없음. X에는 글/URL만 사전 입력하고 이미지는 붙여넣기/첨부 안내. 해시 공유는 개별 X OG 이미지를 만들지 않으며 원본 renderer 향후변경까지 막지 않는다.

전체 npm test(서버23+프런트 검사+Vitebuild+격리패키징), 구매/읽기 회귀25개 통과. 원본 bytecode fixture 및 순수 입력/SVG 보안·페이지 이동/컬렉션 축소/empty/stable/잘못된 체인·코드·stale·reorg 검사를 추가했다. 사용자 구매자의 실제 on-chain 읽기로 레벨1 확인. 320/390/1280 화면, 실제 receipt 기반 local QA, Level5 예시 PNG, 계정 빠른전환 후 empty, 오류 안내, 원본 전환, 공유링크 검사. QA `/tmp/soul-review/`는 실제 확인된 영수증을 재표시하는 읽기전용 화면으로 빌드 입력에 없고 배포되지 않는다. `logs/sale-checks/soul-release-tests.log`, `soul-payment-regression.log`, `buyer-soul.json`, `my-souli-*.png`.

**이번 UI 변경은 로컬만.** 현재 공개사이트는 계속 static-gpw3FA. `/soul/` 신규페이지는 아직 공개되어 있지 않으므로 현재 공개 공유링크가 동작한다고 안내하지 말 것. 사용자 구매 중 공개 checkout 교체를 피하기로 안내했고 신규자산거래/배포는 수행하지 않았다. 데스크톱 PNG 생성과 브라우저 이미지복사 성공 응답은 확인했다. 도구의 download 이벤트 완료 확인은 timeout, Chrome downloads URL은 보안 정책으로 차단되어 실제 OS 다운로드 완료와 휴대폰 share-sheet 전송은 확인하지 못했다. X 자동 게시/첨부를 검증 완료로 적지 않는다.

다른 지갑은 **조사/권장안까지, 현재 MetaMask 연결 유지**. `docs/WALLET-COMPATIBILITY.ko.md`에 EIP6963 설치형 선택 + Reown AppKit Vue/ethers·WalletConnect 모바일 확장, Uniswap Wallet 연결 공식근거, 가격/라이선스/기기별 검증 계획. Free는 조건부이며 무제한 영구 무료가 아니다. project ID/도메인/약관·한도 확인이 선행되어야 하고 유료서비스나 새SDK는 추가하지 않았다.

## 1.41 · 휴대폰용 실제 소량 구매 페이지 공개 (2026-10-03)

사용자가 다른기기에서도 구매할 수 있게 배포를 요청했다. 기존 Azure SWA Free에 **https://souli.net/pilot/** 공개 완료. 릴리스 **static-gpw3FA**,80파일/14,858,369bytes. 관리계약·판매조건·재고를 새로 배포하거나 바꾸지 않았다. 신규서버/유료리소스 없음. 기존 static-0t78LU 릴리스는 복구용 보존. 공개 소량pilot은 실제 Base ETH/원본SOULI이며 Sepolia가 아니다. cap42/wallet10/가격26684264049332wei 그대로. 정식 `/buy/`와 MAINNET_ADMIN은 disabled 유지하고 홈페이지에pilot판매홍보링크를 추가하지 않았다. noindex/no-store는 비공개 접근제어가 아니다.

`src/pilot/{PilotPage.vue,main.js,sale.json}`, `pilot/index.html` 추가. 고정 build-time profile만 선택하는 `src/lighthouse/sale-profile.mjs`로 기존BuySouli를 재사용한다. arbitrary DEV manifest는production에서무시하며 query/storage/API로판매주소를 주입하지 않는다. `/buy/?purchaseProfile=pilot`도 Purchases open soon으로차단함을 공개브라우저에서확인했다. `/pilot/`에실제자산/42개·지갑10개/1개시작/소스검증과감사구분/환불·자동LP없음을표시했다. 관리자 공개페이지는 여전히 비활성이다.

휴대폰지갑relay에 조회를 몰지 않도록 구매client에도 별도read-only transport를 주입했다. wallet chain/accounts/send는지갑에만가며 공용RPC는 읽기·시뮬레이션만수행한다. wallet과reader의chain둘다검증. 조회실패시pending보존/재전송차단. 신규2개포함native-sale19+read-rpc6=25검사 통과. 프로필차단검사와전체npm test(서버23/프런트/빌드/격리패키징)통과. 소스계약변경없음. read-only실제계약견적1개도성공했으며실거래요청은보내지않았다. `logs/sale-checks/pilot-public-readiness.json`.

production빌드320/390/1280px가로넘침없음, 수량2→예시변경시수량/가격유지→1복원, 공개390px정확한가격/영문안내확인. 공개앱오류0(IAB); Chrome MetaMask contentscript listener/orphaned-stream 경고는관찰했으며앱오류와분리한다. hosted전체경로/영상/보안/API/readiness/비공개파일검사통과. pilot/buy/manage HTML및연결자산18개SHA256일치. `logs/azure-releases/static-gpw3FA/pilot-hosted-verification.json`; `logs/sale-checks/pilot-public-desktop.png`, `pilot-public-mobile.png`.

현재 Chrome 공개pilot 구매화면은미연결/수량1, 사용자구매대기. 휴대폰Chrome에서Connect wallet→MetaMask연결→브라우저복귀→Review purchase→금액·가스확인후사용자서명. 관리자A/B/C외의일반지갑이좋으며 Base ETH가필요하다. **아직일반구매성공/실제폰mainnet연결을확인한것은아니다.** 사용자가구매했다고하면controller/sale최신상태·Purchased·원본Transfer·구매자잔액·재고·ETH대금을대조한다. 그후필요한추가1개구매/중지/미판매재고회수/대금회수. 구매자 서명/자동환불/LP추가를agent가대신하지 않는다.

## 1.40 · 소량 메인넷 판매 시작 완료 / 일반 구매 지갑 선택 대기 (2026-10-03)

startSale 사용자 서명 성공. tx `0xa37b83394fea856cbaac5a094949f1fec871ca28ad7eb0f6932c293787cffcfd`, Base블록52,109,539, A의 wallet-returned 묶음거래 hash(outer0xdb9B…7dB3, nonce4). exact Unpaused(controller) 이벤트, controller 과거코드, 정규블록/2확인 이상, 고정조건/권한 확인. `logs/sale-checks/mainnet-pilot-start-receipt.json`. 최신상태 **Open / 재고42 / sold0 / proceeds0 / A958 / allowance0**. UI도 Transaction confirmed/Open42 확인. 공개 상업manifest는 disabled이고 웹사이트 새배포 없음. 소량pilot은 온체인에서 열렸으므로 로컬UI만 제공한다고 온체인 접근까지 제한되는 것은 아니다.

Chrome `http://127.0.0.1:5173/tmp/mainnet-pilot/buy.html`을 새탭으로 열었다. 수량1, 가격0.000026684264049332ETH+가스, 상위레벨 프리셋은 cap초과로 비활성, 현재 지갑 미연결. `mainnet-pilot-open.png`, `mainnet-pilot-buy1-ready.png`. A/B/C가 아닌 ETH가있는 구매용지갑을 MetaMask에서 선택해달라고 사용자에게 요청한 상태다. 서명/구매 요청은 아직 보내지 않았다. 사용자가 선택하면 Connect wallet→실제연결주소가관리자아닌지확인→잔액/견적1개 검토→최종 MetaMask서명 handoff→실제원본토큰 수령/구매이벤트/ETH증가/재고감소 확인. 사용자가 A로먼저진행하길선택하면 A구매검증과 일반구매자검증을 구분한다.

Chrome 관리탭과 구매탭을 유지. 새 구매요청이 생기면 HMR/새로고침/중복요청 금지. 실제구매 후 추가1개/중지/미판매재고회수/대금회수를 진행한다. 사용자의 구매용지갑 선택/서명이 남아 있어 pilot완료나 정식출시가능이라고 보고하지 않는다.

## 1.39 · 원본42개 입금 완료 (2026-10-03)

사용자 MetaMask 서명 후 원본42개 입금 성공. tx `0x196545acf783680a6dfa5751098216aef2aa9fc583240d48a1d9ebd93addd03d`, Base블록52,109,407. 정규블록/2확인 이상, controller의 정확한 StockFunded(A,42), 원본token의 A→controller→sale 42개 이체, 해당블록 controller코드 확인. 최신상태 **A958개 / sale재고42개 / controller보유0 / 남은allowance0 / sold0 / ETH대금0 / paused**. `logs/sale-checks/mainnet-pilot-deposit42-receipt.json`.

MetaMask가 반환한 hash는 직접controller호출이 아닌 묶음거래(outer target0xdb9B…7dB3, A nonce2)였다. 단순tx.to/data 비교 진단은 불일치를 감지했으나 기존클라이언트의 wallet-returned hash + 정확한이벤트/과거코드 검증으로 복구 성공했다. 소스검사를 약화하거나 재전송하지 않았고 UI Transaction confirmed/stock42를 확인했다. A가계속EOA일것이라 가정해 새CREATE를 준비하지말고 코드/nonce를 재확인한다.

로컬manager에서 startSale 요청을 MetaMask에 보냈고 사용자 최종서명 대기다. 검토화면 예상가스0.000000321622153485ETH, value0. `logs/sale-checks/mainnet-pilot-start-review.png`. 기존 관리자 pending 저장key와 Chrome 관리탭을 유지하며 재전송/HMR/새로고침하지 않는다. 아직 start성공/구매/회수 완료로 쓰지 않는다. 다음은 receipt/Unpaused 확인 후 별도 일반지갑으로 로컬pilot 구매페이지에서1개 구매 검증. 공개사이트 실판매 manifest는 disabled 유지, 새웹배포 없음.

## 1.38 · Base pilot 배포·소스 검증·42개 승인 완료 / 재고 입금 서명 대기 (2026-10-03)

원본 SOULI Base 메인넷 소량 pilot을 실제 배포했다. 배포 tx `0xf52e9a42f193252aa771ba8fef07b78b841f23a698b633a690543029750da0cb`, 블록52,108,762. controller `0xD643520BfEb76e59250d56Df8B196F9c751Bc252`, sale `0x83bcB8Ba9b7518CDEc32f2eE0e684f1d7b4ffB01`. exact CREATE calldata/nonce/송신자/정규블록/2확인, 두 runtime, 원본token, A/B/C 권한과 고정가격·한도·기간을 대조했다. 증거 `logs/sale-checks/mainnet-pilot-deployment-receipt.json`, `mainnet-pilot-deployment-verified.json`. 아래1.37의 ‘배포 미확인’은 당시 기록이다. 기존 review/context는 최초 검토 증거로 보존하며 재생성하지 않는다.

Sourcify에서 두 계약 모두 creation/runtime **exact_match** 소스 공개 검증 완료. `contracts/scripts/verify-pilot-source.mjs`, `logs/sale-checks/mainnet-pilot-sourcify-results.json`. 공개 소스는 `https://repo.sourcify.dev/8453/0xD643520BfEb76e59250d56Df8B196F9c751Bc252` 및 `https://repo.sourcify.dev/8453/0x83bcB8Ba9b7518CDEc32f2eE0e684f1d7b4ffB01`. Etherscan 전달은 일일 한도, Blockscout은429로 실패했으므로 BaseScan 검증 완료라고 쓰지 않는다. 소스 일치는 독립 보안 감사가 아니다.

A가 정확히42개 사용 승인을 완료했다. tx `0xdea422250e6e9f5a1dda80b3be873645fa43181007cab37943943d8ef8edbbb9`, 블록52,109,015. 원본 token의 approve(controller,42000000000), Approval 이벤트와 allowance42개, A잔액1000개, 해당 블록 controller코드까지 확인. `logs/sale-checks/mainnet-pilot-approve42-receipt.json`. 무료publicnode가 과거블록 getCode에403을 반환하여 화면확인이 잠시 막혔지만 승인거래는 성공했다. 재전송하지 않고 저장된hash를 복구했고 관리UI `Transaction confirmed`/Approved42를 확인했다.

`src/sale-admin/read-rpc.mjs`는 공식 Base RPC 우선+publicnode 읽기 fallback, 요청별10초 제한/동시4개, 각endpoint 체인확인, 정확한blocktag 유지, 서명·전송method차단을 적용한다. chain불일치/contractrevert는 fallback으로 무시하지 않는다. 모든조회실패 시 pending을 유지한다. 관리화면/CSP에 통합, 신규6+관리client9=15검사 통과. npm test(서버23/프런트/빌드/패키징 포함) 통과. 새 서버·유료서비스·공개사이트 배포 없음.

로컬 전용 `tmp/mainnet-pilot/manage.html`은 검증된 manifest로 기존 AdminApp을 연결하고 `buy.html`은 기존 BuySouli에 같은 pilot을 연결한다. DEV props만 허용, 정식 빌드 manifest와 구분한다. public LIVE_SALE/MAINNET_ADMIN은 계속 disabled. pilot cap42/wallet10, 1개당0.000026684264049332ETH, 10월10일14:36:07KST 종료. 세 지갑 중 하나가 단독 관리한다.

현재 Chrome 관리탭에서 **depositStock(42)** 요청을 MetaMask로 보냈고 사용자 최종 서명 대기. 화면 예상가스0.000003395752351256ETH, ETH이체값0. 토큰은 controller를 거쳐 sale로 들어가며 성공 후 A958/재고42/allowance0 예상. 판매는 계속paused다. **아직 입금성공으로 기록하지 말 것.** screenshot `logs/sale-checks/mainnet-pilot-deposit42-review.png`. 서명대기 중 HMR/리로드/중복요청 금지. 저장key `souli-admin-v1:8453:0xd643520bfeb76e59250d56df8b196f9c751bc252:0x4a4aa86208ecfdbacbad551df7baf5d3c84425bb`.

다음: 입금 receipt/StockFunded/잔액/allowance 확인 → pilot start 별도서명 → 별도 일반지갑 소량구매 → 중지/미판매재고 회수/실제ETH 회수. 실제메인넷 구매와 회수는 아직 안 했다. 정식판매 조건 확정·독립검토·잔여기기검수·상업manifest 공개는 별도다.

## 1.37 · 입금 확인 / 원본42개 pilot 배포 서명 요청 (2026-10-03)

사용자가 원본1000개와ETH를 입금했다고 알려줬다. Base블록52,107,994(14:28:57 KST 조회)에서 A에 **1000SOULI / 0.002481581759840395ETH**, nonce/pendingNonce0, EOA코드0x, Dynamic seed1000, 원본token codehash 일치 확인. `logs/sale-checks/mainnet-pilot-funded.json`. 재고는42개만 사용할 예정이며1000개 전부 승인하지 않는다.

`contracts/scripts/prepare-pilot-review.mjs`로1회용 미서명검토를 만들었다. `contracts/release/base-pilot.review.json`, `base-pilot.context.json` 및 `tmp/mainnet-pilot/{review,context,artifacts}.json`이 정확히 같은 계획이다. 원본token b43e…9aFF, cap42/walletCap10, 가격26,684,264,049,332wei, 2026-10-03 14:36:07~10-10 14:36:07 KST, 초기pause. 가격출처 Coinbase ETH/USD2676.805, 조회14:36:10KST, FDV15m/210m 기준의 pilot 전용이며 상업판매 확정이 아니다. 공급/토큰/계약소스 변경 없음. public LIVE_SALE/MAINNET_ADMIN은 disabled 유지.

A nonce0 직접CREATE의 예상 **Base controller 0xD643520BfEb76e59250d56Df8B196F9c751Bc252**, sale **0x83bcB8Ba9b7518CDEc32f2eE0e684f1d7b4ffB01**. controller의 주소문자열이 기존Sepolia 테스트토큰과 같지만 **네트워크와 역할이 다르다**. Base에서 코드가비어있음을preflight확인했다. 주소만 보고 네트워크/토큰을 혼동하지 말 것. 공개배포가 확인될 때까지 이 주소로 직접보내라고 안내하지 않는다.

Chrome `http://127.0.0.1:5173/tmp/mainnet-pilot/`는 로컬전용 배포 검토화면. `src/sale-admin/deploy-client.mjs`가 검토일치/EOA/nonce/chain/원본코드/수수료/유한상태저장/교차탭잠금/정확한2확인receipt/런타임검증을 사용한다. 주소·조건을URL로받지않는다. 저장실패전서명차단/전송후hash보존/모호한실패재요청금지 검사를포함한 신규7+기존release3=10검사통과. runtime비교함수를Buffer대신Uint8Array로바꿔브라우저에서도검증가능. 컴파일입력31소스가현재파일과일치. `logs/sale-checks/mainnet-pilot-source-review.json`.

Chrome A연결성공. 최초네트워크전환후늦은wallet변경이벤트로재연결1회필요했다. 검토단계 예상네트워크수수료 **0.000016399923510768ETH**(L1상한추정포함,최종지갑견적별도). 배포요청버튼을눌러MetaMask서명요청을전달했고 사용자직접Confirm을요청했다. **이절작성시체인성공미확인/토큰승인·입금미실행**. screenshot `logs/sale-checks/mainnet-pilot-deployment-review.png`. Chrome탭 handoff유지. 서명대기중 소스/HMR/리뷰재생성으로요청을중복하지말것. client저장key는 `souli-deployment-v1:8453:0x4a4aa86208ecfdbacbad551df7baf5d3c84425bb`. hash가없으면먼저MetaMask Activity를확인하고같은요청을다시보내지않는다.

다음: 사용자서명→화면/체인에서2확인과controller/child 코드·권한·조건검증→`three-wallet-release.mjs verify`로증거/후보manifest저장→검증된로컬관리화면연결→정확한42개approval/deposit 별도승인→일반지갑구매와회수. 독립감사미실시,정식공개판매미개방. 예전Sepolia계약으로mainnet토큰을보내지않는다.

## 1.36 · 원본 소량 메인넷 준비 잔액 조회 (2026-10-03)

사용자가 원본SOULI를 조금 보내 실제 테스트하고 보유한 Base ETH를 사용하자는 데 동의했다. 블록52,107,714 읽기: 배포자A(0x4a4A…25BB)는ETH0/SOULI0/nonce0/일반EOA. 다른 등록지갑에 원본SOULI와 Base ETH가 있다. B/C에는 코드가 있으므로 현재 EOA CREATE 배포 계획을 그 지갑으로 임의 전환하지 않는다. 개인 지갑 별칭은 공개하지 않는다. `logs/sale-checks/mainnet-pilot-funding-readiness.json` 참고.

A에 원본42SOULI와 Base 메인넷 ETH0.001을 준비하는 안을 안내했다.0.001ETH는 지갑에 두는 여유분이며 확정 수수료·전액 소비 승인 아님. 블록52,107,768의 읽기 전용 잔액override 시뮬레이션에서 계약배포 gas2,269,781, 현재gasprice6,000,000wei, L2실행부분0.000013618686ETH. L1데이터/추가거래 비용 제외이므로 최종 지갑 견적을 별도로 확인한다. `logs/sale-checks/mainnet-pilot-gas-planning.json`. 가격/기간은 시뮬레이션용 값이며 기존pilot draft의null은 유지했다. 공개거래0, 실제송금/배포/판매개방 없음. A로의 자금 준비 후 원본잔액·nonce 재확인→확정 pilot 조건/가스/서명 데이터 검토→사용자 MetaMask서명→배포코드 대조→정확한42개 승인/입금→별도 일반지갑 구매→중지/재고·ETH회수로 진행한다. 소량 송금도 출발지갑 Dynamic 모습을 바꿀 수 있음을 안내한다.

## 1.35 · 같은 레벨의 여러 모습 / 가격 계산 / 원본 전송 검증 (2026-10-03)

최종 Azure SWA Free 릴리스 **static-0t78LU**, 77파일/14,850,393bytes. `/buy/`에 같은 레벨의 원본 inscription 4개를 함께 보여주고 `Show another example` 버튼을 넣었다. 5레벨×4개는 실제 Base 블록52,106,364의 getSoul/getSvg 읽기이며 예시 변경은 구매량을 바꾸지 않는다. 수량→새 Dynamic의 레벨, 계약→모습, 추가/감소→변경 가능, 정확한 개별 seed 이전→조건부 Stable 보존을 구매 상세와 웹 백서에 반영했다. 고유성/균등 확률/매 구매 무조건 새 캐릭터는 보장하지 않는다. 메인넷 구매/관리 enabled:false 유지, 공개 체인 거래0건.

프런트 새 예시/가격 검사와 기존 npm test(서버23·빌드·런타임 패키징 포함), 공개 hosted smoke, 15파일 미디어 해시/타입/range 검사 통과. 320/390/1280px 넘침 없음, 같은 레벨 예시 변경 시500000 및 직접 입력500123 수량 유지, 공개 콘솔 오류0 확인. 실제 휴대폰 OS 거래 검수와 구분한다. 증거 `logs/sale-checks/inscription-examples-ui-2026-10-03.json`, `inscription-examples-production-desktop.png`, `inscription-examples-production-mobile.png`.

**원본 Base 블록52,106,731 로컬31337 복제 검사 통과**: 같은 수량의 서로 다른 구매자 모습, 레벨4에서500000→500001→500000 Dynamic 데이터/모습 변경, 정확한500000 이전으로 Stable 데이터/모습 보존, 이후1개 구매 시 기존 Stable 보존 및 별도Dynamic 생성, 재고 회수·B의 ETH 수금·금액 보존, 마지막 재고 통째 구매 시 판매자의 기존 모습 보존. `contracts/scripts/check-inscriptions-fork.mjs`, 결과 `logs/sale-checks/inscriptions-base-fork.json`. 가짜 로컬 ETH만 사용, 공개 거래0, 독립 감사 아님. publicnode 과거블록403 때문에 공식RPC를 Node 읽기 전용 로컬 중계로 조회했다. 중계는 송금/서명 RPC를 거부하며 별도 검사1개 통과. 프로덕션 서버 추가가 아닌 테스트 전용 도구다. 앞서104개 계약/클라이언트 검사는 이전1.34 결과이며 이번에 전체를 재실행한 것은 아니다.

사용자 FDV15m/공급210m에 따라1SOULI=1/14USD. BigInt 기반 가상 ETH2500/3000/4000 시나리오 도구/검사와 `docs/launch-price-scenarios.json` 준비. 실제 시세/판매 설정 아님. 고정ETH 회차는 가격 기준 시각·출처를 정하고 ETH변동에 따른 달러환산 변경을 공개해야 한다. 레벨2 약1500USD, 레벨4 약35714USD이므로 높은 아트레벨을 게임 필수조건으로 쓰지 않는다. 레벨5 최소2.5m은 제안된첫판매700k 전체보다 크다.

일반 코인 메인넷 신규 발행보다 원본SOULI 소액pilot을 권고. `contracts/release/base-pilot.draft.json`은 별도42개/지갑10개 제안, 가격·기간·nonce 미정으로 배포 불가. 최종 상업판매조건, 독립 검토, 남은 새 상점 일반구매자/C 실기기, 메인넷 원본 소량검증·소스공개는 남는다. 실제 ETH 지출/최종 서명 전 호출데이터와 비용을 검토한다. 자세한 내용 `docs/SALE-LAUNCH.ko.md`.

## 1.34 · 단독 구매/관리 UI 공개, 팀15% 기준 변경 (2026-10-03)

최종 Azure SWA Free 릴리스 **static-6AUUTk**,77파일/14,809,189bytes. /buy/는 독립 구매 페이지(레벨 샘플·수량·Choose/Review/Receive·상세 접기); 메인 Get SOULI 링크를 연결했다. /manage/는 메인넷 준비 화면, /manage/?network=testnet은 기존0x7344…C087 controller와0x534d…8708 판매에 연결된 관리자 화면이다. 기존 /testnet/도 유지한다. **메인넷 구매와 관리 manifest는 모두 enabled:false**이며 가격/한도/일정/nonce 미확정 그대로다. 실제 공개 지갑 거래는0건이다.

세 지갑 A/B/C는 각각 단독 승인한다. 등록된 지갑만 관리 버튼을 표시하며 최종 권한은 계약이 강제한다. URL·공개 통계는 비밀 영역이 아니고 서버 로그인 방식이 아니다. 사용자의 개인 지갑 별칭은 공개하지 않았다. 유한 승인·재고 입금·중지/재개·재고/ETH 회수·승인 해제·잘못 보낸 controller 토큰 회수, 서명 전 호출 계약/수신자/네트워크/수량 검토, 정확한 코드·권한·조건 확인, 탭 간 중복 차단, 저장 후 서명·hash 복구·정규 블록2확인을 구현했다. 15초 잔액 갱신 중에는 수량 입력 포커스를 빼앗지 않는다. 모호한 전송 결과는 재전송하지 않는다. src/sale-admin/client.mjs, AdminApp.vue, config.mjs, src/lighthouse/use-wallet.mjs 참조. 배포 verify 도구는 candidateAdminManifest도 생성한다.

전체 계약/클라이언트104개(기존 연구 포함), 프런트/서버23/빌드/런타임 패키징 통과. 새 관리자9개 검사는 실제 로컬 계약 입출금/타인 차단/저장 실패/중복/복구를 검증했다. UI는320/390/1280/1920px 구매,390px 관리, 레벨 선택/0입력 오류/닫힌 상태 Enter 차단/비관리자 버튼 미노출/서명 전 리뷰를 확인했다. 가짜 provider는 tmp 로컬 UI 검사용으로 모든 서명/전송을 거부하며 배포 제외. 공개HTTPS 경로·보안 헤더·비공개 파일404·기존15파일 해시와MP4 range 통과, 공개구매/관리 브라우저 오류0. 실제폰/C/별도 일반 구매자의 새 상점 거래 검수는 여전히 남는다. 증거 logs/sale-checks/purchase-manager-ui-checks-2026-10-03.json, buy-production-desktop.png, buy-production-mobile.png, manage-production-mobile.png.

팀 목표는 사용자 결정대로 **전체 공급의15%=31,500,000 SOULI**. 기존 R기준15% 제안을 대체한다. 다른85% 세부 용도는 미확정. owner 밖23,165,014개(11.031%)는 소유 구분을 사용자가 기억하지 못한다고 답했으므로 이미 팀에 지급된 물량으로 공표하지 않는다. 웹 백서/계산 모델/기획서를 이 기준으로 변경했다. 목표·실제 지급·잠금은 구분하고 실제 이체/잠금 없음.

다음: 확정 판매 조건을 draft에 반영→독립 검토/남은 공개기기 검수→Base 실제 계약 배포·소스 공개·소량 원본 ERC20i 지급/회수 검증→검토된 구매/관리 manifest 활성화. UI 배포가 실판매 개방이나 보안 감사 완료를 뜻하지 않는다. docs/SALE-LAUNCH.ko.md 참고. 신규 유료 서버나 리소스 없음.


## 1.33 · 메인넷 잔액 / 팀 15% 기준 재확인 (2026-10-03)

사용자가 판매·구매·대금 관리 마무리를 다음 우선순위로 제안하고 메인 주소 밖 물량이15% 미만인지 계산을 요청했다. 블록52,104,779(12:41:45 KST) 원본 holder registry/owner/pool/token 주소의 잔액 합계를210,000,000개와 대조했으며 별도 RPC에서도 공급·owner·잔액 일치. owner `0xA159…49c8`은186,834,986개(88.9690%), 그 주소 밖은23,165,014개(11.0310%). 이는 누적 이체량·외부 투자자 물량·유통량과 다르다. 이전 스냅샷 대비 잔액 변화0.

백서의 팀15%는 전체 공급이 아니라 기존 보유자/약정/판매·LP를 제외한 자유 준비금 R 기준의 제안이다. 메인 주소만 포함하고 추가 약정이 없다는 가정에서700k판매+700kLP를 빼면 R185,434,986개, 팀27,815,247.9개. 배분/잠금 확정 아님. 상위 미분류 세 주소(10m/5,001,001/1,680,000)의 사용자 보관 여부를 질문했으며 답변 대기. 자료는 [토크노믹스](docs/SOULI-TOKENOMICS.ko.md)와 `logs/sale-checks/mainnet-distribution-review-2026-10-03.json`, `token-distribution-block-52104779.json`. 읽기와 내부 문서 갱신만 했고 실판매 개방/거래/배포 없음. 판매 남은 절차는1.31 및 SALE-LAUNCH.ko.md 참조.

## 1.32 · 초광폭 영상 배너 반응형 수정 / 공개 배포 (2026-10-03)

사용자가 넓은 화면에서 영상이 잘려 보이는 문제를 우선 수정하도록 요청했다. 기존 100svh 높이 제한과 전체 폭 포스터 배경 때문에 움직이는 영상과 정지된 양옆의 경계가 드러났다. `HeroFilm.vue`의 실제 영상 무대를 16:9로 유지하고 초광폭의 남는 양옆은 브랜드 블루로 정리했다. 헤더·제목·버튼도 같은 무대 안에 정렬한다. 모바일과 높이520px 이하에서는 제목·조작부를 영상 아래로 배치한다. 원본 영상·6편 자동 순환·판매 상태는 유지했다.

320×568~3440×1440의14가지 브라우저 뷰포트에서 가로 넘침·제목/버튼 겹침 없음,16:9 전체 구도 확인. 일반 자동 순환, 직접 교체, 새로고침 선택 복원, 차단 후 직접 재생, 모션 줄이기/Save-Data 영상 요청0개 확인. `npm.cmd test` 프런트/서버23/빌드/런타임 패키지 통과. 최종 figure/figcaption 구조 정리 후 영상 검사와 배포 빌드 재통과. 실제 휴대폰 OS 검수와는 구분한다.

**Azure SWA Free `static-SALDDs` 수동 배포 성공**(64파일/14,759,959bytes). 공개390px/2560px 재생·전체 프레임·헤더 정렬·오류 로그0, hosted smoke 및15파일 해시/미디어 타입/206 range 검사 통과. 증거: `logs/hero-film/responsive-layout-2026-10-03.json`, `responsive-cycle.json`, `responsive-production-ultrawide.png`, `responsive-production-mobile.png`; 배포 검증 `logs/azure-releases/static-SALDDs/hero-hosted-verification.json`. 이전 공개 릴리스 `static-pdmHhr` 보존. 이번에는 디자인만 수정했으며1.31의 실판매 준비/남은 검증 상태는 그대로다.

## 1.31 · 실판매 사전 준비 / 현재 테스트 상점 정리 (2026-10-02)

사용자는 일반 구매 성공을 재확인하고 게임 완성 전 판매를 준비하도록 요청했다. 공개 일반 구매는 **구 sale** 성공이 맞으며 새 sale의 별도 일반 구매 실기기 검증과는 구분한다. 재조회 블록47,591,549, 새 sale790재고/210판매/ETH0/해당 일반 구매자 purchased0. C의 공개 기기 테스트는 앞서 사용자 요청대로 후속으로 남긴다.

`public-sale.json` 기본을 새0x534d…8708로 전환하고 Current/Earlier shop 주소를 명시했다. 기존 지갑의 구 상점/영수증은 유지하며 명시적으로 전환한다. pending 구매/다른 탭의 변경이 있으면 전환 차단. 구매창/백서에 게임 개발 중·베타 초대 미보장·수동 LP·독립 운영자 권한을 반영했다. **Azure SWA Free static-pdmHhr 수동 배포 성공**(64파일/14,759,630bytes), hosted/미디어 해시·range 검사 통과. 공개1280px/390px 기본 새 상점790/210/ETH0·가로 넘침 없음·브라우저 오류0 확인. 화면 `logs/sale-checks/current-shop-production.png`/`current-shop-mobile.png`. 메인넷 판매 계속 비활성, 새 공개 지갑 거래 없음.

새 `contracts/scripts/three-wallet-release*.mjs`는 직접 EOA 배포 nonce 기반 controller/child 주소 예측, immutable 조건/코드/세 지갑 검사, unsigned 재고 승인/입금/판매 개시 후보를 만든다. `base-sale.draft.json`의 가격/한도/기간/nonce는 미확정 null이므로 실행 준비를 거부한다. 실제 전송/키 사용/LIVE_SALE 수정 없음. 전체 계약95개와 프런트/서버23/빌드/패키지 통과.

`check-three-wallet-fork.mjs`로 실제 Base 블록52,081,355 원본 SOULI를 로컬31337에 복제해 새 구조 일반 구매210→220 dynamic seed/SVG, C 회수·재입금, B 재개·수금, 마지막780 stable inscription 및 자산 보존 통과. `logs/sale-checks/three-wallet-base-fork.json`, publicTransactionsSent0. 초기 publicnode429·과거블록제한 후 공식mainnet.base.org 읽기로 성공. 독립 감사는 아님.

[실판매 준비안](docs/SALE-LAUNCH.ko.md): 게임 개발과 판매 준비 병행. $15M FDV·ETH측$50k 참고안은700k판매+700k별도LP 계산안이며 확정 가격이 아니다. ETH단가/지갑한도/판매기간/재고/판매조건·국가별 검토, 독립 보안 검토, 새 공개 판매의 별도 구매자/C 실기기, 메인넷 관리자 UI와 실제 소량 검증·소스 공개가 남는다. 테스트넷 관리 화면은 메인넷용이 아니다. 다음 단계는 이 조건표를 사용자와 확정하고 검토된 실제 배포를 진행하는 것. 게임 완성을 실판매의 일괄 필수 조건으로 주장하지 않는다.


## 1.30 · 새 홈페이지 souli.net 수동 배포 완료 (2026-10-02)

사용자가 1.29 전체 폭 영상 배너와 간결한 홈페이지의 공개 배포를 승인했다. 기존 Azure Static Web Apps Free `souli-web`에 **`static-IiDaDv`** 수동 배포 성공:64파일/14,756,132bytes. 메인넷 판매는 계속 닫힘. 신규 서버·DB·유료 플랜·지갑 거래 없음.

첫 업로드 `static-jt27s1` 검수에서 MP4가 application/octet-stream으로 제공되는 것을 발견, `staticwebapp.config.json`에 명시적 MIME 매핑을 추가하고 최종 릴리스로 재배포했다. 버전 미디어에는1년 immutable 캐시. 이후12미디어와 메인 HTML/JS/CSS의 공개 해시·타입·캐시 및MP4의206 byte-range 검사 통과. 기존 hosted smoke에도 미디어 검사를 추가했다. HTTPS 홈/게임/백서/testnet, 보안 헤더, API readiness, 판매 비활성, 비공개 파일 차단 모두 통과. 브라우저에서 실제1280×720 무음 재생/자동 다음 영상, Get SOULI 비활성 구매 안내→게임 복귀, ETH 날씨, 오류 로그0 확인. 화면 `logs/hero-film/production-desktop.png`, 무결성 기록 `logs/azure-releases/static-IiDaDv/hero-hosted-verification.json`.

다음 추천은 구매 검증 마무리→작은 게임 베타→실판매 개시다. 새 판매 `0x534d…8708`로 일반 지갑 구매를 확인하고 구/신 판매 선택 혼동부터 해소한다. C 관리자/모바일 취소·복귀·중복 방지, 원본 ERC20i 통합, 확정 판매 조건·독립 계약 검토는 남아 있다. 이 홈페이지 배포가 그 검증 또는 메인넷 출시 완료를 뜻하지 않는다.

## 1.29 · 화면 전체 폭 영상 배너 · 미배포 (2026-10-02)

사용자가 Doodles처럼 큰 첫 화면을 승인해 배너를 전체 폭으로 바꿨다. PC는 영상 위 고정 제목/Play free/Get SOULI와 투명 헤더, 900px 이하는 원본16:9 영상 아래 제목/버튼을 둔다. 카드 테두리·긴 캡션·첫 화면 부가 설명 제거, 캡션은 영상의 접근성 설명으로 보존. 아주 넓거나 낮은 화면도 contain으로 원본을 자르지 않고 남는 공간은 선택된 포스터의 흐린 배경으로 채운다. 코인 로고·파랑·골드·눌리는 버튼과 아래 섹션 유지. 여섯 편 재생 로직과 판매 미개시 상태는 그대로다.

320/390/1024/1280/2560px 검수, 가로 넘침 없음. 교체 전후 제목 문서 좌표 동일, 새로고침 선택 복원, 차단 후 직접 재생, reduced-motion에서 MP4 요청0개 확인. production build 및 영상 검사 통과,4173 빌드에서도 재생 확인. 최신 스크린샷 `logs/hero-film/immersive-desktop.png`, `immersive-mobile.png`. 로컬5173만 미리보기; 공개 배포·거래 없음.

## 1.28 · 홈페이지 문구 압축과 시각 안내 · 미배포 (2026-10-02)

사용자가 짧고 직관적인 메인과 클릭해서 보는 상세 설명을 요청했다. `SouliHome.vue`의 첫 화면을 **Play free / Get SOULI** 두 행동과 짧은 소개로 정리했다. Get SOULI에는 판매 미개시를 표시하고 기존 비활성 구매/레벨 안내로 연결한다. 원본 캐릭터 카드, 코인→캐릭터 그림, 실제 `SanctuaryScene` 게임 미리보기로 내용을 전달한다. 긴 inscription·LP·권한·위험 설명은 닫힌 details와 기존 웹 백서에서 읽는다. 공개 FAQ 4개와 추가 답변으로 기존 10개 답변을 보존했다. 코발트·골드 브랜드와 원본 영상 전체 구도 유지.

6편 연속 재생은 두 바퀴 이상 브라우저에서 확인했다(`logs/hero-film/continuous-cycle.json`). 새 홈페이지 320/390/1200/1920px 검수, 상세 설명 열기, 실제 구매 안내와 게임 복귀, 빌드 버전 백서 연결 확인. 가로 넘침 없음. `npm.cmd test` 프런트/서버23개/빌드/패키지 검사 통과. 최신 화면 `logs/hero-film/continuous-desktop.png`, `simple-mobile.png`. [전체 구현 기록](docs/HERO-FILM.ko.md). **공개 배포·지갑 거래 없음.**

## 1.27 · 메인 캐릭터 영상 6편 통합 · 미배포 (2026-10-02)

**최신 사용자 변경:** 1회 정지 대신6편을 순서대로 계속 순환, Pause/Replay 제거. 무작위/세션 복원으로 시작하고 이후01→06→16→21→28→37 반복한다. 모션/데이터 절약·차단 시 직접 재생 대체, 탭 숨김 중지/복귀 자동 이어보기. 1920/2560px 와이드 검수 및320px 헤더·출시 카드 넘침 수정. 이전 아래1회 재생 설명보다 이 결정이 우선한다. 여전히 로컬만 적용.

후속 요청으로 영상 비중을 넓힌 약1:2 메인 레이아웃, 상단 창 장식 제거, 하단 컨트롤 통합, 모바일16px 여백을 적용했다. 850px 헤더 넘침도 수정. 원본16:9/브랜드/게임 CTA 유지, 추가 빌드와 반응형 검수 완료. 공개 배포 없음.

사용자는 추가 세 지갑 테스트를 나중으로 미루고 오늘 공개 배포하지 않도록 했다. 준비된 meme-pack 01/06/16/21/28/37을 홈페이지 메인에 적용했다. `HeroFilm.vue`와 `hero-films.mjs`, 정적 미디어 `public/media/souli-moments/v1/` 사용. sessionStorage 무작위 선택 유지, 중복 없는 다음 영상, 무음/inline1회 재생·마지막 프레임, 포스터 대체와 모션/절약 정책. 기존 제목/게임 CTA 및 브랜드 유지. [구현·검수 상세](docs/HERO-FILM.ko.md). 로컬1200px/390px, 차단·절약 설정 모사, 전체 프런트/서버23개/빌드/런타임 검사 통과. 최종 미리보기5173. **Azure 공개 배포 및 새 거래 없음.**

## 1.26 · 일반 구매자 확인 / 구 판매 계약 선택 주의 (2026-10-02)

사용자의 별도 지갑 구매를 실제 체인에서 확인했다. 구매자 `0x1375b43B72676067079fb66969cb85F33EC1768B`는 A/B/C가 아니며 210 tSOULI를 0.000000021 테스트 ETH로 구매했다. 거래 `0x353ccec02747b205504de0eba7289117cc5990e702e81bf57f5cbfc2cc1c2aec`, 블록 47,588,613, 성공/237회 확인 및 canonical block, Purchased·Transfer 이벤트, 전후 잔액/매출 대조 완료. **이번 대상은 구 단일 지갑 sale `0x1B9a…D4D6`다. 새 controller sale의 일반 구매자 검증으로 처리하지 않는다.** 구 판매 재고 4,999,790→4,999,580, 구매자 0→210, 현재 ETH 0.000000021. 새 판매 `0x534d…8708`은 여전히 재고790/판매210/현재 ETH0이다.

근거 `logs/sale-checks/ordinary-buyer-purchase-verification.json`, 재현 `node logs/sale-checks/verify-ordinary-buyer.mjs`. 테스트 페이지 상단은 구 공개 판매를 기본으로 로드하며 `?controller=`만으로 상단 구매 대상은 전환되지 않는다. 새 판매 구매에는 하단 **Use this sale for the purchase form ↑**를 누르고 주소를 확인해야 한다. 사용자에게 중복 구매를 자동 요청하지 않았다. UI 혼동 가능성과 새 판매의 별도 구매자 검증은 남아 있고 메인넷은 계속 닫혀 있다.

## 1.25 · A 재고 회수·재입금·재개 완료 (2026-10-02)

사용자 Chrome A 지갑으로 중지→210 tSOULI 회수→210개 유한 승인→재입금→재개를 실제 Base Sepolia에서 완료했다. 최종 재개 `0x4b9015d5af8a7ecde495626c54df0b6e3a6f2ba0f127686fffcbdff188d4996e` 성공/31회 확인. 블록 47,588,235 기준 판매 OPEN, 재고790/누적판매210, sale 및 controller ETH0, A 토큰 잔량 원상복구, A→controller/controller→sale 사용 승인 잔량0. [전체 거래 근거](docs/THREE-WALLET.ko.md), 기계 기록 `logs/sale-checks/operator-a-inventory-cycle.json`. B 대금 출금도 앞서 완료. 이번 A 사이클에 추가 승인은 필요 없고, 별도 구매자/C/기기별 검증과 독립 검토는 여전히 별도다. 메인넷 판매 계속 비활성.

## 1.24 · B 지갑 실제 대금 출금 확인 (2026-10-02)

사용자가 재접속/출금을 승인한 뒤 Base Sepolia `0x3aaf9a510eff11b671d6b7031ea43f453cf68cbb8ec214bcc509bb4d0ab528b9` 성공 확인. B 직접 호출, sale→controller→B의 0.000000021 테스트 ETH 지급 이벤트와 두 계약 ETH 잔액 0 확인. 블록 47,587,639 / 검증 시 40 confirmations. [세부 근거](docs/THREE-WALLET.ko.md). B 단독 대금 출금은 완료됐고 C 실행/다른 재고 동작까지 확인됐다는 뜻은 아니다. 메인넷 판매는 계속 닫힘.

## 1.23 · 지갑 연결 수명주기 보완 (2026-10-02)

수동 Azure 배포 `static-l2wkPf` 완료(52파일). hosted 검사 통과. 실제 Chrome 확장 A 연결 복원/Disconnect/새로고침 후 종료 유지 확인. 사용자 Chrome 탭은 현재 연결 해제 상태이며 거래를 새로 보내지 않았다. 재연결은 Connect MetaMask에서 한다.

사용자가 로그아웃/다른 계정 재접속과 production 수준 검토를 요청했다. 공식 MetaMask 문서를 대조해 공용 connector에 권한 해제/재선택, 중첩 취소 오류 정규화, 중복 요청 차단, 저장소 불가 시 로컬 종료, 다른 탭 종료 반영, 늦은 승인 무시/전송 해시 보존을 추가했다. 테스트넷/게임에 Disconnect, 오래된 조회 무시와 앱 복귀 재확인을 적용했다. [검토·테스트·남은 기기 확인](docs/WALLET-CONNECTION.ko.md)을 따른다. 메인넷 판매는 계속 닫혀 있다. 휴대폰 최초 연결은 사용자 확인 완료이며, 새 로그아웃/재선택과 B/C 출금은 별도 실제 기기 확인 대상이다. 아래 예전 ‘휴대폰 왕복 미확인’ 문구는 후속 확인으로 해소되었다.

## 1.22 · 외부 브라우저 MetaMask 앱 연결 (2026-10-02)

사용자는 MetaMask 내장 브라우저로 사이트를 옮기는 흐름을 거절하고, 휴대폰 Chrome/Safari에서 앱 승인 후 원래 탭의 연결을 유지하도록 요청했다. 기존 `/dapp/` 이동 UI를 공식 `@metamask/connect-evm@2.1.1` 릴레이 연결로 교체했다. 공용 `src/lighthouse/wallet-connect.mjs`를 테스트넷/게임에서 사용한다. 기존 injected 지갑은 그대로 우선하며, 처음 방문한 페이지에서는 SDK/앱/승인을 실행하지 않는다. 사용자가 연결한 릴레이만 다음 방문에 조용히 복원한다.

수동 Azure 배포 `static-w1PbC3` 성공(52파일). 운영 CSP는 공식 MetaMask WebSocket 호스트 하나를 추가 허용한다. SDK analytics 비활성, 추가 SOULI 서버/유료 RPC 계정 없음. SDK 통신은 제3자 MetaMask 릴레이 가용성에 의존한다. Vite에서 SDK의 동적 CommonJS 로딩 문제가 확인되어 공식 배포 ESM 선택 및 개발 prebundle 설정을 추가했다. `@metamask/utils`의 uuid는 호환되는 11.1.1로 고정하여 npm audit 0건 확인(독립 보안 감사 아님).

**후속 사용자 확인:** 휴대폰에서 앱 연결 승인 후 “원래 Chrome에 지갑 주소가 보여”라고 확인했다. 모바일 왕복 연결은 사용자 기기 확인 완료. 다음 안내는 B 주소 확인 → 세 지갑 영역의 Collect test ETH to my wallet → Base Sepolia 승인이다. 연결 성공은 출금 성공을 의미하지 않으며, B 출금 영수증은 별도로 확인해야 한다.

공용 지갑/릴레이 검사, 기존 프런트 검사, 서버 23개, production build/패키지 검사와 hosted smoke 통과. 로컬 개발 및 production 빌드, 공개 souli.net에서 공식 QR 연결 창을 확인했다. **실제 휴대폰 앱 승인→원래 Chrome 주소 표시, 릴레이 거래, B/C 독립 출금은 아직 사용자 기기에서 확인 대기.** 세 지갑 신규 sale은 재고 790 tSOULI / 누적판매 210 / 보유 ETH 0.000000021 테스트 ETH. 계약 변경/새 거래 없이 연결 UI만 배포했다. 메인넷 판매 계속 비활성. 이번 지시는 아래 1.21의 내장 브라우저 이동 안내보다 우선한다.


## 1.21 · 웹 백서 / 세 지갑 개별 출금 (2026-10-02)

최신 사용자 결정: Safe 보류. 세 제공 지갑이 각각 단독 승인으로 관리·출금하는 구조. 이전 2-of-3 및 단일 지갑 제안보다 우선한다. 구현/권한/테스트: [THREE-WALLET](docs/THREE-WALLET.ko.md). 새 웹 백서 `/whitepaper/`에 FUNGI/Todd Stool 크레딧, 게임, R 기준 제안 배분, 수동 LP 및 권한을 반영했다. [웹 백서 기록](docs/WEB-WHITEPAPER.ko.md). 메인넷 판매는 비활성. Base Sepolia controller `0x734417B7CAe7D8A00d15ED886d46463d1a64C087`와 새 sale `0x534d2408dE5BA5c8dB54105C38D3040ec7388708` 실제 배포 및 1,000 tSOULI 유한 승인 성공. MetaMask 중계 거래 확인 수정. 새 판매 1,000 tSOULI 입금 및 남은 allowance 0 확인 완료. Start sale 및 210 tSOULI 실제 구매 체인 확인 완료(재고 790, 매출/보관 ETH 0.000000021). 휴대폰 Chrome 연결 오류를 발견해 앱 열기 링크·Explore/browser 수동 안내를 추가. B 지갑 실제 독립 출금은 아직 검증 중이며 상세 영수증은 THREE-WALLET 문서와 logs/sale-checks/three-wallet-public.json 참고.


인수인계 기준일: 2026-10-01. 이 문서는 기존 대화를 읽지 않은 개발자/에이전트를 위한 저장소 문서다. 사용자의 이후 지시가 이 문서보다 우선한다.

## 최신 방향 변경

### 1.20 — 수동 LP와 2-of-3 Safe로 방향 확정

2026-10-02 사용자가 자동 LP/인출 불가 준비금 대신 **SOULI 즉시 지급 → treasury 인출 → 운영자 수동 Uniswap LP 공급**을 선택했다. 1-of-3도 검토했으나 위험 설명 후 **A/B/C 중 두 지갑 승인인 2-of-3으로 최종 결정**했다. 세 공개 주소를 받아 Sepolia 잔액/공식 Safe 1.4.1 코드 해시를 읽기로 확인했으며 실제 Safe 배포/보안 설정 변경은 하지 않았다. 사용자는 휴대폰을 포함한 실제 공개 테스트넷 검증과 Web3 토큰 배분 공개 사례 조사를 요청했다. 개인 별칭은 저장소 밖 비공개 메모에만 있고 공개 파일에 옮기지 않는다.

[수동 LP 운영 문서](docs/MANUAL-LP.ko.md)가 아래 1.17~1.19의 자동화·LP 용도 강제보다 우선한다. 기존 `SouliEthSale` treasury 경로를 이어 사용하고 LP 전용 후보/테스트는 연구 기록으로 보존한다. 첫 판매대금의 LP 사용은 운영 의도이며 계약상 인출 제한이 아니다. 이번 결정으로 운영비 전용을 허용한 것은 아니다. FDV 15M/ETH 쪽 $50k 기준은 아직 실제 판매 조건으로 확정하지 않았다.

홈페이지 Receipts/FAQ는 누적 매출·현재 sale/treasury 잔액·실제 LP 투입·잠금 증거를 구분하는 **로컬 미배포 변경**이다. 실판매 주소가 없어 집계는 미연결/미확인으로 표시한다. 기존 Sepolia 계약/자금/게임과 `LIVE_SALE.enabled=false`는 그대로다. 다음은 실제 Safe와 별도 구매자로 기존 판매/수동 LP 전체 경로 검증, 최종 조건·원본 권한 대조·독립 검토다.

공식 Safe 바이트코드 로컬 통합 검증 9개를 추가해 계약/클라이언트 **77개**, 프런트 10개·서버 23개·빌드/런타임 검사 통과. 한 명/중복 서명 거절, 세 개의 두 서명 조합, 인출·재고 회수·재입고·재사용 거절을 검사했다. 데스크톱/390px iframe의 새 Receipts 접기/펼치기와 가로 넘침 검사 통과. [Safe 진행 상태](docs/SAFE-TESTNET.ko.md), [공식 사이트 공개 사례/배분 제안](docs/TOKEN-DISCLOSURE-RESEARCH.ko.md)을 따른다. Chrome 공식 Safe는 A MetaMask **연결 승인 대기**이며 배포/송금 요청을 보낸 상태가 아니다.

### 1.19 — LP 전용 판매·영구 잠금 후보 구현과 실패 검증

2026-10-02 사용자가 새 계약 실패 상황 검증을 요청했다. `contracts/src/SouliLpSale.sol`/`SouliPermanentLpLock.sol`을 추가했다. 즉시 지급·별도 LP 지원·정확한 목표 종료·회수 가능한 구매 재고와 회수 불가능한 LP 준비금 분리·누구나 호출 가능한 finalize·LP 직접 영구 잠금이 후보 코드에 구현됐다. **공개 배포·실자금 입고·기존 Sepolia 교체는 하지 않았다.** 실제 Safe/새 구매 UI/자동 실행기는 미연결이고 메인넷 판매는 계속 비활성이다.

빈 페어에 먼지를 넣고 sync하는 초기화 방해를 발견·수정했다. 아직 LP가 없는 첫 mint는 고정 결과 가격 범위를 확인한 뒤 직접 WETH 포장/입고/mint하며, 기존 풀은 공식 라우터로 목표 ETH 전액을 공급한다. 시험용 가격 오차 0.5%는 별도 LP용 SOULI 준비분을 요구한다. 기본 구매 700k + LP 700k 기준 준비분 3,500개, 총 사전 입고 예시는 1,403,500개다. **미사용 준비분은 인출 불가, 영구 잠금/오차 범위는 메인넷 확정 조건 아님**이다. LP 준비분은 입고 직후부터 회수할 수 없고 이번 계약에는 취소/긴급 인출/업그레이드가 없다.

새 LP 27개 포함 계약/클라이언트 **68개**, 실제 SOULI·공식 Uniswap v2를 사용한 Base **52,067,385** 로컬 포크 **9개 경로**, 프런트 10개 스크립트·서버 23개·빌드·패키지 검사 통과. `npm.cmd run test:sale`, `npm.cmd run test:sale:lp-fork`(먼저 컴파일), `npm.cmd test`. 근거 `logs/sale-checks/lp-contract-tests.xml`, `lp-sale-fork.json`; 원본 체인 거래 0건. 독립 감사 아님.

[검증 기록과 남은 위험](docs/LP-SALE-VALIDATION.ko.md)을 먼저 읽는다. LP 발행/수령지/수량·라우터 실패·부분 ETH 반환·재진입·목표 경쟁·관리자 재고 회수·가격 조작·먼지·재시도·원본 매도 호환을 검사했다. **기존 풀 가격이 계속 범위 밖이면 LP 개설은 지연될 수 있으며 환불/관리자 회수로 해소되지 않는다.** 큰 가격 왜곡을 무시해 자동 입금하는 코드로 바꾸지 말 것. 다음은 출시 정책/조건 고정, 별도 공개 테스트넷과 실제 2-of-3 Safe, 새 UI/모니터링·자동 실행기, 원본 권한 대조와 독립 검토다. 아래 과거 LP 미구현 문구는 후보 로컬 구현에 한해 갱신된다.

### 1.18 — 15M FDV 토크노믹스 제안, 공개 분포 조사, DEX 포크와 LP 증거 UI

2026-10-02 사용자는 시작 FDV **15M USD**, LP 목표 **ETH 쪽 50,000 USD 상당 + 맞은편 SOULI**를 선택했다. 실제 ETH/wei 가격·기간·잠금은 미정이다. 총공급 210M 기준 단가 약 $0.07142857, 전액 구매 시 700,000개 즉시 지급 + 별도 LP용 700,000개다. 첫 LP 회차 종료 후 초과분을 운영비로 돌리지 않고 별도 운영자금/게임 상품 매출을 쓰는 안을 제안했다. [토크노믹스 제안](docs/SOULI-TOKENOMICS.ko.md), 계산 `scripts/model-tokenomics.mjs` / `docs/tokenomics-model.json`이 과거 배분표보다 우선한다. 남은 자유 창업자 물량 R의 60/15/15/5/5 배분 및 작은 첫 팀 귀속분은 **미승인 제안이며 실제 잠금/이전 없음**이다. 15M 기준 원본 2단계 최소 비용 $1,500이므로 dot의 완전한 게임 참여와 게임 성장/원본 단계 분리를 권장한다.

사용자는 당시 약 10M FDV에서 총 $70k, 한 사람 최대 **$40–50k USD**를 투자받았다고 기억한다. 같은 가격이면 총 1.47M개, 큰 개인 840k–1.05M개지만 투자 조건/신원은 아직 확인되지 않았다. Base 블록 **52,067,784**의 원본 registry와 owner/pool/토큰 주소 잔액 합이 총공급 210M과 일치했다. `logs/sale-checks/token-distribution.json`, 재현 `node scripts/snapshot-token-distribution.mjs`. `0x3cdf…397e1`은 owner로부터 최초 1M개를 받고 7건 이체 후 924,997개다. 옛 기준으로 약 $47,619.05에 해당하나 엔젤 신원은 확인 대기다. `0xabf5…89798`은 4,851,000개 수령 후 4,365,900개를 되돌려 485,100개다. 두 주소 역사만 탐색기/공개 RPC 영수증과 대조했고 전체 투자자 장부는 확정하지 않았다. `logs/sale-checks/investor-transfer-candidates.json`에 범위/근거를 보존했다.

실제 Base **52,067,385** 로컬 포크에서 공식 Uniswap v2 신규 페어 생성·정확한 공급·매수·분할 매도·원본 SVG·LP 회수 검증을 모두 통과했다. 원본 pool 주소는 변경하지 않았다. `npm.cmd run test:sale:dex-fork`; 당시 환경 `BASE_READ_RPC=https://mainnet.base.org`, `BASE_FORK_BLOCK=52067385`. 근거 `logs/sale-checks/base-dex-fork.json`. **공개 거래 0건, 새 LP 전용/잠금 계약 검증이나 독립 감사가 아님**이다.

로컬 랜딩에 `src/site/LiquidityReceipts.vue`를 추가하고 LP 준비/공급/잠금 증거와 미배포 상태를 분리했다. 메인 FAQ도 계획임을 명시한다. `npm.cmd test`의 프런트 10개 스크립트·서버 23개 테스트·빌드·런타임 패키지 검사 통과. 데스크톱 및 390×844 iframe(스크롤바 제외 문서 폭 375px)에서 가로 넘침 없음, 펼치기 동작/브라우저 오류 확인. 스크린샷 `logs/sale-checks/lp-receipts-{desktop,mobile}.jpg`. **이번 변경은 배포하지 않았고 실판매 비활성을 유지**한다.

사용자가 Google Flow Omni 1.1 메인 영상을 제안했다. [영상 기획](docs/HERO-VIDEO.ko.md)은 10초 무음 루프·배경/날씨 생성·실제 원본 전경 합성·dot 시인성·정지/모바일/전송량 규칙과 영어 프롬프트를 포함한다. 영상 생성·업로드·크레딧 사용은 하지 않았다. 다음은 투자자/창업자 지갑 장부 대조, 회차 조건/LP 잠금 확정, 새 LP 계약 실패 방어와 공개 테스트넷 전체 경로다. 아래 1.17 이전 목표 미확정/DEX 미검증 내용은 이 기록으로 갱신된다.

### 1.17 — 즉시 SOULI 지급, 환불 없는 LP 전용 적립과 자동 연결 기획

2026-10-02 사용자는 **구매 즉시 SOULI 수령/게임 이용**, **성공 구매의 프로토콜 환불 없음**, **새 초기 판매대금 100% LP 전용**을 선택했다. LP 개설 뒤 토큰을 청구하는 예약 판매를 원하지 않는다. 부족분은 창업자/참여자의 지원 입금으로 채울 수 있게 하되, 토큰을 받는 구매와 지분/인출권 없는 지원을 별도 집계한다. 구매자에게 토큰을 지급하지 못하면 결제도 같은 거래에서 되돌려야 한다. 목표 미달 시 ETH는 LP 용도로 남고 구매자는 토큰을 보유한다. LP 개설·유동성·가격을 보장하지 않는다.

독립 A/B/C 중 2개 승인 Safe 방향에 동의했으나 **실제 Safe는 미구성**이다. LP 전용 ETH/준비 SOULI/잠긴 LP는 이 quorum도 임의 인출할 수 없도록 설계한다. 구매 재고와 목표에 필요한 LP용 토큰은 별도로 사전 확보한다. 고정 ETH 목표/USD 참고 환산, 목표 달성 후 구매 종료, 누구나 고정 조건으로 호출 가능한 finalize와 최소 비용 자동 실행기는 권장 설계다. 가격·목표·DEX 버전·잠금 방식/기간·수수료 권리는 미정이며 50,000 USD 예시는 확정 금액이 아니다.

사용자는 Pump.fun처럼 목표 달성 후 Uniswap 연결과 쉬운 차트를 요청했다. Pump.fun 본딩 커브를 복제하거나 자동 가격 상승을 약속하는 결정은 아니다. UI는 LP 전 누적 적립 진행률, 실제 공급/잠금 이후 확인된 페어의 시세/차트로 구분하고 원본·파랑/금색·눌리는 버튼을 유지한다. 실제 LP 거래 전에는 “투입 완료”로 표시하지 않는다.

[ETH 판매 후속 결정](docs/ETH-SALE.ko.md)과 [기획서 1.3의 23절](docs/SOULI-GAME-DESIGN.ko.md)을 갱신했다. **문서 변경만 수행했으며 새 LP 계약·자동 실행·차트는 미구현, 배포/실자금 이전 없음**이다. 아래 1.16 이전의 treasury 자유 인출은 기존 검증 계약에 해당한다. 기존 41개 테스트 성공을 새 LP 보안 검증이라고 설명하지 않는다. 실제 토큰 DEX 포크·공개 테스트넷 전체 새 경로·독립 검토를 거쳐야 하고 메인넷 판매는 계속 비활성이다.

### 1.16 — 실판매 전 보안 검토와 자금 분리 제안

2026-10-02 사용자 요청으로 [ETH 판매 운영 문서의 보안 검토](docs/ETH-SALE.ko.md)를 확장했다. 계약/클라이언트 테스트 **41개**, root/server/contracts의 알려진 의존성 취약점 **0개**, 실제 Base 블록 52,064,984의 로컬 포크 검증을 통과했다. 새 테스트는 관리자 변경과 treasury 분리, 정확한 재고 승인 소비, 수령 계약의 재진입 거부를 검증한다. 배포 계약 바이트코드는 바꾸지 않았다. 공개 테스트넷 화면은 매출 인출 후 0 잔액, 소수점 판매율, 방문자/관리자 설명을 정확히 표시하도록 수동 배포했다.

주요 발견: 실제 토큰 `owner()`와 `pool()`은 모두 `0xA159D241eC79b989cBD69D2917e5951E5F3A49c8`, 코드 없는 주소다(52,064,941 기준). 실제 토큰 포크에서 이 주소의 `launch(새 풀)` 재호출은 거절됐다. LP 생성/매매/제거 및 원본 인스크립션 호환 검증을 별도 출시 조건으로 둔다. 현재 테스트 지갑의 Base 메인넷 잔액은 ETH/SOULI 모두 0이었다. 테스트 주소의 키 보안 또는 원본 관리자 권한 전체 검증을 뜻하지 않는다.

제안: 판매 재고만 분할 이동, 독립 하드웨어 키 기반 판매 운영 Safe(owner)와 수령 Safe(treasury) 분리, LP 예산/포지션의 통제권 공개. **미구성 제안이며 승인·키 생성·메인넷 송금·LP 거래는 하지 않았다.** 별도 구매자 MetaMask, 실제 Safe 운영/수령, 실배포 원본 소스/권한, DEX 포크와 독립 계약 검토가 남는다. 메인넷 판매는 비활성이다. 이번 검토를 완전 무결/감사 인증/가격 상승 보장으로 설명하지 않는다.

### 1.15 — 실제 MetaMask 구매·재고 회수/재입고 검증

2026-10-02 Base Sepolia 판매 계약 `0x1B9a694c267D22b83E8dA829c1663603fb37D4D6`를 배포하고 검증된 공유 주소를 공식 `/testnet/`에 연결했다. 사용자 MetaMask로 재고 5,000,000개 입금 → 판매 시작 → **210 tSOULI 구매(0.000000021 test ETH)** → 중지 → 미판매 4,999,790개 회수 → 재승인/재입금 → 판매 재개 → **판매대금 전액 인출**까지 완료했다. 최종 블록 47,575,319에서 재고 4,999,790개/판매 210개/누적 매출 0.000000021/계약 ETH 0을 확인했다. 대기 중인 거래는 없다. [정확한 체인 상태와 증거](docs/TESTNET.ko.md)를 따른다. 아래 1.14의 판매 배포 대기/null 주소 설명은 과거 기록이다.

MetaMask 숫자 nonce, 스마트 계정 중계 영수증, 공개 조회 rate limit 호환을 수정했다. 성공은 원래 거래 해시와 정확한 계약의 지급 이벤트로 확인한다. 테스트넷만 승인 유효시간을 10분으로 늘렸다. 계약/클라이언트 38개 테스트와 공식 HTTPS 배포 검사가 통과했다. 이번 공개 체인 구매자/관리자/treasury는 같은 지갑이었다. 별도 구매자 MetaMask, 실제 SOULI ERC-20i의 메인넷 판매 인수, 독립 감사는 남아 있으며 메인넷 판매는 비활성이다. Vite는 Azure 배포 임시 ZIP을 감시하지 않아 배포 중 Windows 파일 잠금으로 개발 서버가 종료되는 문제를 피한다.

### 1.14 — 공식 테스트넷 페이지, 공개 토큰 배포, 코발트·골드 디자인

2026-10-02 `/testnet/`을 기존 Azure Static Web Apps Free에 수동 배포했다. 메인·게임·구매 버튼에 선명한 파랑/골드와 눌림 효과를 적용하며 원본 인스크립션 픽셀은 보존했다. [테스트넷 진행 상태와 다음 순서](docs/TESTNET.ko.md)를 먼저 읽는다. 추가 서버·DB는 생성하지 않았다.

사용자 MetaMask의 Base Sepolia 테스트 지갑에서 tSOULI `0xD643520BfEb76e59250d56Df8B196F9c751Bc252` 배포 성공(블록 47,569,412). **인스크립션 없는 일반 ERC-20 대역**이다. 판매 계약 배포는 MetaMask 승인 대기이며 아직 공개 체인 구매/재고 입출금/대금 인출은 미완료다. `src/testnet/public-sale.json` 공유 주소는 null이며 배포 확인 전 가짜 수치를 넣지 않는다. Chrome localhost 탭의 저장된 요청부터 복구하고, MetaMask 팝업은 현재 도구가 제어하지 못해 사용자 클릭이 필요하다. 개인키를 요청하지 않는다.

지갑 없이 읽는 판매 현황판, 재고/판매 가능량/판매량/가격/누적 매출/현재 ETH 구분, 배포·구매·중지·회수·재입고·인출 UI를 구현했다. 계약 테스트 33개(신규 테스트넷 4개 포함), 프런트 스크립트 10개, 서버 테스트 23개, build/runtime 및 공식 HTTPS 검사가 통과했다. 로컬 자동 테스트와 공개 체인 실거래를 구분한다. 메인넷 실판매는 계속 꺼져 있고 독립 감사 완료를 의미하지 않는다.

### 1.13 — Google SOULI DNS까지 삭제 완료

2026-10-02 사용자가 방문자가 거의 없으므로 NS 전파 대기 없이 지금 삭제하라고 명시했다. 이 지시가 이전 10월 3일 대기 계획보다 우선한다. 최종 Google DNS 기록을 백업하고 Azure의 apex ALIAS·api/www/docs CNAME·TXT와 대조한 뒤, `pickit-lab`의 `pickitlab-uscentral1-souli` zone과 비권한 레코드 6개를 삭제했다. Google zone 목록에서 부재를 확인했고, 삭제 후 일반 DNS 경로의 공식 홈/게임/API HTTPS 검사도 통과했다. 증거: `logs/azure-releases/google-dns-cleanup.json`, 갱신한 `google-cleanup-verification.json`.

**SOULI 전용 Google 웹 호스팅·이미지·DNS 정리는 완료다.** 후이즈 등록기관은 유지하고 Azure에서 서비스한다. 이미 발생한 사용료와 source 3개의 기존 7일 soft-delete 보관은 별도이며, 다른 프로젝트/공유 자원은 삭제하지 않는다. 자동 정리 예약은 생성하지 않았고 남은 DNS 예약도 없다. 아래 1.12 이하의 DNS 대기 설명은 당시 기록이다.

### 1.12 — SOULI의 Google 웹 자원 삭제, DNS만 전파 대기

2026-10-02 사용자가 Azure souli.net 접속을 확인하고 Google 삭제를 다시 요청했다. 일반 DNS 경로의 HTTPS 홈/게임/API 검사와 여러 공개 resolver가 Azure를 가리키는지 확인하고, 백업 20개·소스 3개의 해시와 Azure 원본 이미지/복원 증거를 대조했다. 기존 A 캐시 5시간이 지난 상태이므로 서버 경로는 지금 제거하고, 48시간 NS 캐시용 **Google DNS zone 하나만 10월 3일 21:00 KST까지 보존**하는 방식으로 일정을 나눴다.

09:31 KST까지 Google `pickit-lab`의 SOULI Run, HTTP/HTTPS forwarding/proxy, URL map 2개, backend/NEG, 고정 IP, 인증서/SSL policy 각 2개, 전용 Cloud Armor policy, Artifact Registry `souli`와 백업된 source 객체 3개 삭제 완료. 공유 `pickitlab` NEG/IP·버킷과 `pickit-lab_cloudbuild` 버킷 자체, 프로젝트/IAM은 보존했다. 실행 기록 `logs/azure-releases/google-cleanup-journal.json`, 최종 재조회는 `google-cleanup-verification.json`을 따른다. source 객체는 공유 버킷의 7일 soft delete에 남을 수 있다. Google 전체 청구 즉시 0원 또는 DNS 삭제 완료라고 보고하지 않는다. [정리 기록](docs/GOOGLE-CLEANUP.ko.md).

구글 고정 IP는 반환했다. 이제 복구는 보존된 Azure ACR 이미지/config로 새 자원을 만들어 DNS를 연결하는 경로이며, 옛 IP를 재할당받을 수 있다고 가정하지 않는다. 이후 게임/판매 개발은 기존 Azure에서 계속한다. 아래 1.11의 “Google 삭제 없음”은 10월 1일 당시 기록이다.

### 1.11 — souli.net을 Azure Free 정적 사이트 + 최소 API로 전환

2026-10-01 20:24 KST에 공식 도메인의 목적지를 Azure로 변경했다. 후이즈 등록기관은 그대로 두고 네임서버만 Azure DNS로 변경했으며, `docs.souli.net`·기존 TXT를 보존했다. `souli.net`은 **Static Web Apps Free의 ALIAS**, `www`는 공식 주소로 301 이동, `api.souli.net`은 기존 Consumption Container App이다. 홈페이지/게임은 전역 정적 배포, API와 기존 DB는 Korea Central에 함께 둔다. 싱가포르에 별도 DB·서버를 추가하지 않았으며, 국가별 실제 이용 분포와 지연 측정 후 API/DB의 동반 이전을 판단한다. [최신 실행 기록](docs/AZURE-MIGRATION.ko.md)과 [정적 배포 절차](docs/AZURE-STATIC.ko.md)를 따른다.

원본 Google 이미지는 Azure ACR 작업 `dq4`에서 실제 실행해 운영 HTML SHA256 일치를 확인했다. 새 도메인 HTTPS·정적 자산·API CORS·SIWE·재시작 후 세션 복원·비보유자 차단·로그아웃을 검사했다. Codex 브라우저에서 공식 홈→게임과 Coinbase ETH 표시, 오류 없음 확인. 일반 PC DNS는 아직 Google 캐시를 반환할 수 있어 HTTP probe는 검증된 Azure IP를 지정하되 정상 도메인 TLS 검증을 유지했다. 실제 MetaMask 보유자 저장 검증은 미완료이며 allowlist에는 무자산 테스트 지갑만 있다. 메인에 **Invite-only beta**를 명시하고 실판매는 꺼져 있다.

**Google 자원은 아직 삭제하지 않았다.** 네임서버 캐시와 원래 A TTL 5시간을 고려해 **2026-10-03 21:00 KST 이후** 전환 상태를 재검증한 뒤 [정리 대상/절차](docs/GOOGLE-CLEANUP.ko.md)에 따라 진행한다. 이것은 자동 예약 완료를 뜻하지 않는다. Yongsancats는 사용자가 연장했다고 알려주었고 이번 작업에서 변경하지 않았다. 아래 1.10 이하의 DNS 미변경·복원 미완료·preview-only 설명은 당시 기록이다.

### 1.10 — Google 백업 완료, Porkbun 등록기관 이전 보류

2026-10-01 사용자가 `souli.net`·`yongsancats.com`의 후이즈 → Porkbun 이전을 모두 나중으로 미뤘다. **기관이전·프리미엄 보안 해제·EPP 발급·이전 결제를 진행하지 않는다.** 두 도메인 모두 후이즈 프리미엄 보안 잠금이 있고 해제에는 소유자 서류 심사가 필요하다. Yongsancats의 기존 Azure 서버는 그대로 유지한다. 이 결정은 SOULI Google → Azure 호스팅 이전과 별개다. 현재 DNS/네임서버는 변경하지 않았다.

Google SDK 본인 인증 완료. `pickit-lab`의 SOULI Run revision·IAM·DNS·LB/프록시/인증서·NEG/IP·Artifact Registry·빌드 트리거·버킷 목록 등 20개 읽기 전용 내보내기를 접근 제한된 `logs/google-private/backup-20261001`에 저장했다. 실행 중인 `souli-00011-bzr` 이미지도 `pickitlab.azurecr.io/souli/legacy-backup:google-20261001`로 복사했으며 SHA256 `036b6c61cba57677d7599a7766f34624785692d3c6c462ee56fff04a270b44c6`가 원본과 일치한다. 이미지 복사 검증이며 이 이미지의 Azure 재실행/복원 검증은 아직 아니다. Google 자원은 삭제하지 않았다. 이후 단계는 [Azure 이전 실행 기록](docs/AZURE-MIGRATION.ko.md)을 따른다.

### 1.9 — Azure HTTPS preview 배포, Google 전환 대기

사용자가 Google → Azure 이전을 승인했다. [Azure 이전 실행 기록](docs/AZURE-MIGRATION.ko.md)을 먼저 읽는다. `rg-souli-prod-krc`의 Consumption Container App `souli-beta`를 실제 배포했다. 기존 ACR을 재사용하고 기존 PostgreSQL 서버에 별도 SOULI DB/로그인/스키마를 만들었다. HTTPS 홈·게임, 실제 ETH 피드·Base 원본 조회, 무자산 테스트 지갑 SIWE·재시작 세션·비보유자 차단, 현재 DB의 로컬 논리 복원 검증을 통과했다. 최소 복제 0/최대 2이며 실판매는 계속 꺼져 있다.

실제 사용자 지갑 allowlist와 MetaMask 보유자 저장 검사는 아직이다. 네트워크 적용 완료는 위 문서와 `logs/azure-releases/network-check.json`을 확인한다. Google 재인증·전체 DNS/이미지 백업·souli.net 전환·Google 정리는 남아 있다. 도메인과 기존 Google 운영 사이트는 변경하지 않았다. 이전 절의 “배포 없음”은 당시 상태이며, 지금은 **별도 Azure preview만 배포됨**이 정확하다. Windows 재부팅은 완료됐지만 로컬 Docker 엔진 오류는 남았고, 실제 이미지 빌드/실행은 Azure에서 확인했다. 자동 배포는 만들지 않았다.

### 1.8 — 코인 로고, GM 카피, 확인 가능한 Receipts

사용자가 요청한 SOULI 코인 아이콘은 기존 `public/images/fungi/token-logo.png`(금색 코인·보라색 불꽃)이다. 메인 상단/하단·인스크립션 소개·게임 로고와 메인/게임 favicon에 적용했다. 현재 운영 souli.net의 파란 워드마크와는 다른 기존 자산이며 새로 만든 로고가 아니다. 헤더의 **A LITTLE WORLD TO HODL** 문구는 유지했다. 랜딩은 **GM, fren. Meet SOULI.**, smol/frens/touch grass 표현을 사용하고 결제·권한 설명은 명확한 영어로 둔다.

`#receipts`에 전체 Base 토큰 주소·복사·탐색기 링크·플레이/협동/판매 상태와 접힌 공개사항을 추가했다. `scripts/snapshot-project-facts.mjs`는 서명 없이 Base의 동일 블록에서 owner/decimals/supply/code를 읽어 `src/site/project-facts.json`에 저장한다. 2026-10-01 블록 **52,027,541**, 공급량 **210,000,000 SOULI**, owner **0xA159D241eC79b989cBD69D2917e5951E5F3A49c8**를 확인했다. 화면에 날짜·블록과 스냅샷임을 표시하며 방문자 브라우저에서 자동 RPC 조회는 하지 않는다. 갱신은 `node scripts/snapshot-project-facts.mjs` 후 빌드한다.

FAQ는 지갑 읽기/별도 로그인 서명, Dynamic/Stable 한계, 미개시 구매, 감사·LP·관리 권한·팀 물량, 비동기 협동과 게임 포인트를 설명한다. 독립 감사 보고서·LP 잠금 근거·확정 배분/베스팅/판매 조건은 이 사이트에 공개되지 않았다고 명시했다. 공개 소스 저장소 접근이나 배포 코드 일치 검증을 완료하지 않았으므로 검증된 오픈소스·ownerless·영구 불변·안전 보증 배지를 사용하지 않는다.

검증: production build 통과, 데스크톱 로고/Receipts/FAQ 펼침 확인, 390×844 iframe 메인·Receipts·게임에 가로 넘침 없음, 메인 브라우저 오류 없음. 주소 복사 성공 상태를 확인했으나 자동화 세션의 별도 clipboard API로 실제 붙여넣기까지 검증한 것은 아니다. 증거: `logs/sale-checks/landing-gm-logo.jpg`, `landing-receipts.jpg`, `landing-receipts-mobile.jpg`. 기존 게임 규칙·지갑·판매 로직은 변경하지 않았고 실판매는 꺼져 있다. 배포·실거래 없음.

### 1.7 — Native inscriptions 소개와 메인·게임 파스텔 디자인

사용자 요청에 따라 구매 화면의 사용자용 “SVG” 명칭을 “Inscription”으로 바꿨다. Base 렌더러 레벨 5 후보 24개를 비교해 웃는 연보라색 원본(seed **2,500,021**, extra **0**)을 선택했다. 구매 프리셋의 최소 수량은 **2,500,000**으로 유지하며 특정 외형 지급을 약속하지 않는다. `purchase-levels.json` 전체를 Base 블록 **52,026,975**에서 다시 읽었고 임계값은 그대로다. 스냅샷 스크립트는 레벨 5의 예시 seed에만 +21을 적용하고 해당 레벨을 검증한다. 최소 수량과 예시 seed가 다를 수 있다는 점을 테스트에도 반영했다.

메인 `#inscriptions`와 게임 메뉴/캐릭터 선택의 소개는 **“A token with a little soul.”**, **토큰 → 씨앗 → 체인 위 캐릭터**로 설명한다. ERC-20i는 프로젝트의 native inscriptions 확장 형식이며 별도 ERC-721 NFT가 아니라는 설명은 FAQ/펼쳐보기에 둔다. 영구 불변, 무조건 보존 또는 예시 외형 지급을 약속하지 않는다. `?panel=about|preserve` 딥링크를 추가했다.

`src/styles/souli-palette.css`는 공통 종이색·남색 글자·노랑 버튼·민트/라일락/분홍 포인트다. `site.css`, `sanctuary.css`, `SanctuaryScene.vue`에서 메인·모달·게임 배경을 함께 정리했다. 원본 인스크립션의 전경 픽셀과 색, 저장 및 게임 규칙은 유지했다. 메인 카드만 기존 `artForStage`의 배경 분리본으로 표시해 프레임 색과 통일했다. 작은 점 캐릭터의 어두운 받침은 유지한다.

검증: 프런트 9개·서버 23개·빌드/격리 런타임 검사 통과. 데스크톱 메인/게임/소개/레벨 5, 비 날씨 데모, 390×844 iframe 메인·점 캐릭터·구매/소개 패널의 가로 넘침과 링크를 확인했다. 실제 구매·배포는 하지 않았고 실판매 비활성은 유지한다. 디자인 증거는 `logs/sale-checks/inscription-{home,game,guide,mobile,level5}.jpg`에 저장한다.

### 1.6 — 레벨별 구매 선택과 밝은 구매 화면

`BuySouli.vue`에서 5개 원본 SVG 레벨 버튼, 직접 수량 입력, ETH 금액 표시, 별도 결제 확인 단계, 짧은 프로젝트 소개를 구현했다. 실제 Base 렌더러를 블록 **52,022,772**에서 읽어 최소 seed **1 / 21,000 / 150,000 / 500,000 / 2,500,000**을 전후 경계까지 확인했다. 사용자 화면 레벨 1–5는 계약 레벨 0–4다. **vendor 소스의 레벨 임계값은 실제 배포와 다르므로 사용하지 않는다.** `purchase-levels.json`은 원본 SVG·seed/extra·블록·코드 해시를 보관하고 `scripts/snapshot-purchase-levels.mjs`로 재조회한다.

버튼은 새 단일 원본의 시작 수량 예시다. 기존 지갑의 Dynamic/Stable이나 실제 지급 형태를 예측하거나 보유량을 차감한 추가 구매 추천이 아니다. SVG는 수령 보장 이미지가 아니며 레벨·가격 상승을 보장하지 않는다. [Doodles](https://www.doodles.app/)의 흰 여백·노랑 CTA·캐릭터 파스텔 방향을 참고해 구매 UI를 밝게 바꿨고 원본 픽셀·게임 전체 배색은 유지했다. ‘What is SOULI?’에 ERC20i 씨앗·24×24·Base 아트 소개를 넣었으며 IPFS/완전 불변·공개 GitHub를 확인된 현재 사실처럼 홍보하지 않았다. 실제 판매는 계속 비활성이다. 로컬 테스트 계약에만 판매량 1천만·지갑 한도 5백만을 사용해 모든 프리셋을 체험할 수 있게 했다. 이 수치나 테스트 가격은 운영 조건이 아니다.

브라우저 QA: 레벨 선택·직접 입력·잘못된 수량·한도 초과·수량 수정 후 동의 초기화·로컬 21,000 SOULI 구매 완료를 확인했다. 390×844 iframe에서 선택/확인 두 화면의 가로 넘침이 없고 브라우저 오류가 없었다. 스크린샷은 `logs/sale-checks/purchase-levels-{desktop,mobile,success}.jpg`에 저장했다. 실제 MetaMask나 공개 체인 거래 검증을 의미하지 않는다.

### 1.5 — Base ETH 구매와 계약 자동 지급

게임 변경보다 구매/지급을 먼저 진행하라는 사용자 요청에 따라 재고형 native ETH 판매 계약과 구매 UI를 구현했다. **실판매는 아직 꺼져 있고 공개 체인 배포/실자금 이동은 없다.** [ETH 판매 구현·입고 절차](docs/ETH-SALE.ko.md)를 먼저 읽는다. 새 계약/구매 복구/배포 준비 테스트 29개, 기존 프런트 8개·서버 23개·build/import, 실제 Base 블록 52,022,181의 로컬 복제 구매·SVG 조회·추가 Dynamic 성장·마지막 Stable 지급 검증을 통과했다. 실제 MetaMask HTTPS E2E, 독립 보안 검토, 가격/물량/관리자·treasury 결정, 테스트넷·공개 배포·재고 입고·판매 개시는 남았다.

`contracts/`는 웹/서버와 별도 개발 의존성을 쓴다. `npm ci --prefix contracts`, `npm run test:sale`, `npm run test:sale:fork`를 사용한다. `npm run dev:sale`로 로컬 테스트 RPC와 Vite를 열고 `/purchase-lab.html`에서 가치 없는 테스트 구매를 확인할 수 있다. 이 테스트 지갑은 MetaMask가 아니며 production build에는 포함되지 않는다. `LIVE_SALE`은 검토된 빌드 명세만 받으며 URL로 판매를 켤 수 없다. 즉시 지급 방식에는 자동 LP·본딩 커브·환불·자동 가격 인상이 없다. 아래 예전 USDC/LP 제안과 판매 미구현 기록은 그 당시 상태이며, 새 판매의 실제 가격·대금 사용 방침으로 해석하지 않는다. 기존 게임·원본 SVG·로컬 저장은 보존했다.

### 1.4 — 서버 비용 최소화

최신 구조·검증·Docker 설치 상태는 [저비용 실행 구조](docs/LOW-COST-RUNTIME.ko.md)를 먼저 읽는다. 사용자 승인에 따라 상시 30초 순회와 시작 시 조회를 없애고 요청한 동네만 정산한다. Shared town 정기 조회는 15초 → 5분, 화면은 서버 체크포인트를 기반으로 부드럽게 진행한다. Firestore 서버 저장 옵션과 공용 시세 캐시·임대 잠금을 추가했으며 기존 SQLite/PG·브라우저 저장을 보존했다. `npm test` 프런트 8개/서버 23개/build/import, PostgreSQL 13개+재시작, 공식 Firestore 에뮬레이터 14개를 통과했다. 실제 클라우드 저장 전환/배포/거래는 하지 않았다.

Docker Desktop 4.93.0/CLI 29.8.1/Compose 5.5.1 설치 확인. 2026-09-30 후속 Windows 관리자 승인이 정상 전달되어 Virtual Machine Platform 활성화와 공식 WSL 3.0.1 설치까지 완료했다. `wsl --version`과 WslService 실행을 확인했으나 DISM 종료 코드 3010 및 Windows RebootPending 상태로 **재부팅이 남아 있다**. 강제 재부팅은 하지 않았다. 재부팅 후 Docker Desktop을 시작하고 `npm run test:docker`로 실제 기본 이미지 빌드·기동 검사를 이어간다. 현재 Docker 엔진/이미지 실행 검증은 미완료다. 기본 Dockerfile도 Node 24 서버로 교체했으며 이전 Node 16 파일은 `legacy/Dockerfile.node16`에 보관했다. 아래 상시 CPU/스케줄러 필수, PostgreSQL 필수, 전 마을 순회 설명은 이전 버전 기록이다.

### 1.3 — 출시 후보 검증

최신 실행·검증·출시 전 남은 조건은 [출시 후보 1.3](docs/RELEASE-CANDIDATE.ko.md)을 따른다. Vite 7.3.6/Vue 갱신, ethers 지연 로딩, 기존 수집 앱 의존성 격리, 브라우저에 묶인 SIWE와 세션 복원, HTTP 보안·healthcheck, Docker 런타임 누락 수정을 완료했다. `npm ci`와 `npm test`(프런트 7개/서버 19개/build/격리 패키지)가 통과했다. 실제 PostgreSQL 회귀·프로세스 재시작 복구도 통과했다. 실제 MetaMask HTTPS E2E·Docker 이미지 기동·운영 백업 복구·배포·실거래는 남아 있다. 이전 의존성 경고/PG 미검증 기록은 과거 상태다.

사용자는 Vite를 포함한 프로덕션 품질을 요청했으며, 본인 지갑의 SOULI를 나중에 입고하는 방식과 Pump.fun 같은 판매/LP 전환을 질문했다. 아직 판매 조건 승인은 없다. 미확정 가격·100% LP 제안은 운영 화면에서 제외했다. 별도 토큰 입고 없이 기존 보유자 게임이 먼저 동작한다. 추천 판매 경로와 즉시 지급/환불의 차이는 위 문서 마지막 절에 있다. 기존 수집 앱은 `npm ci --prefix legacy --ignore-scripts` 후 `npm run dev:legacy`로 실행한다.

### 1.2 — 자동 생활, ETH 날씨, 간결한 화면

후속 사용자 결정은 BTC가 아닌 **ETH**, 필수 조작 없는 자동 생활과 비동기 협동이다. 큰 설명 카드·재료 수치·시작/건설 버튼을 없애고 마을을 크게 보여준다. 배경은 청록·하늘색으로 정리하고 원본 전경은 유지한 채 별도 빛 효과와 이동을 추가했다.

접속 즉시 자동 채집과 3단계 건설이 진행된다. `souli-sanctuary-v1` 진척은 보존하고 자동 모드로 이어간다. Solo 이벤트는 `souli-weather-v1`에 저장한다. `/api/market`은 Coinbase Exchange ETH-USD 실제 피드를 5분 캐시한다. 준비 5분/보호 15분/회복 10분, 시작 간격 최소 6시간의 위기를 서버에 저장한다. 집당 분당 빛 1이며 성공 시 일지·등불이 남는다. `/api/world/auto`는 인증·보유 확인 후 마지막 검증 방문부터 2시간 자동 생활에 입주한다. 장면 주민은 실제 접속 아바타가 아니다.

새 모듈은 `market-world.mjs`, `local-weather.mjs`, `server/market.mjs`, `server/world-weather.mjs`다. 프런트 로직 6개와 서버 테스트 16개, build 통과. 실제 ETH 피드와 별도의 모의 보유 응답을 쓰는 테스트 지갑 협동을 구분한다. 개발용 `Weather preview`는 `Weather demo` 표시로 장면만 변경하며 실제 저장/이벤트에 영향이 없다.

호스팅 이전과 배포는 사용자가 미뤘다. 아래 수동 시작·수동 날씨·가격 미연결 설명은 이전 기록이며 이 절과 [1.2 구현 규칙](docs/AUTOMATIC-WORLD.ko.md)이 우선한다. 실제 판매·보존 전송·LP·환불·실시간 아바타는 계속 미연결이다.

2026-09-30 상세 기획 1.1에서 사용자는 기존 배경과 임시 게임 초안을 새로 설계하는 뜻이었다고 명확히 했다. 기존 등대·다섯 층 배치·탐험/회복/방어 순환은 고정 조건이 아니다. 실제 원본 SVG와 계약·지갑 조회 등 기술 기반은 활용하고, Dynamic 성장 → Stable 보존 수집 → 주민 정착을 중심으로 새 화면과 게임을 설계한다. Stable은 계약의 저장형 원본이며 모든 출금이나 관리자 아트 변경에 대해 영구 불변을 보장하는 용어가 아니다.

접속·소유 인증·이전·결제는 MetaMask 중심 Web3 경로를 사용한다. 원본·진화·보존·실제 자산 거래는 Base를 권위 원천으로 삼고, 필요한 서버는 **Azure**를 사용한다. 아래 Google 우선 기록은 이전 웹 호스팅 방침이다. Azure 백엔드 결정이 자동 배포·DNS 이전·클라우드 자원 생성까지 실행했다는 뜻은 아니다. 공식 주소 souli.net과 수동 배포 원칙은 유지하며 웹 호스팅 경로는 따로 확인한다.

현재는 기획 1.1의 **로컬 플레이 + 비공개 베타 서버 기반**을 구현한 상태다. 성장 숲·원본 갤러리·작은 마을, 점 형태 확대 표시, 대기 움직임, 1분 채집과 가로등 → 숲 속 쉼터 → 갤러리 복원, 선택적 SIWE 로그인·서버 저장·동네 공동 정원을 연결했다. 서버는 로컬에서 검증했으며 Azure에 배포하지 않았다. 실제 보존 전송·판매·실시간 가격은 미구현이다. 기존 게임 소스와 `souli-idle-v2` 저장은 삭제하지 않았다. 실행·운영 조건과 미검증 범위는 [베타 준비 문서](docs/BETA-READINESS.ko.md)를 먼저 읽는다.

2026-09-30 운영 호스팅을 실제 콘솔에서 확인했다. **Google Cloud `Pickit Lab` (`pickit-lab`) → Cloud Run `souli` (`us-central1`)**이다. Cloud DNS 영역 `pickitlab-uscentral1-souli`의 A 레코드와 외부 HTTPS 로드밸런서 `souli`가 모두 `34.160.139.16`을 사용하며, 서버리스 NEG가 위 Cloud Run 서비스를 가리킨다. `pickit`이라는 다른 프로젝트와 혼동하지 않는다. 도메인 등록기관은 Whois Corp.이며 Azure/Vercel 배포로 확인된 것이 아니다. 이번 확인에서 배포·DNS·IAM 변경은 하지 않았다. 상세 근거와 수동 배포 전 확인사항은 [호스팅 확인 기록](docs/HOSTING-CHECK.ko.md)을 읽는다.

## 후속 상세 기획

2026-09-30에 [SOULI 게임과 사업 상세 기획서](docs/SOULI-GAME-DESIGN.ko.md)를 추가했다. 원본 SVG·시장 날씨·방치 진행·공동 마을·비즈니스 모델·토크노믹스·서버·단계별 인수 기준을 다룬 내부 검토안이다. 무료 체험과 보유자 정착은 사용자 결정이고, 새 경제 수치·상품·서버 구조는 제안이다. 이 문서 추가로 게임 기능이나 실제 결제가 구현된 것은 아니다.

읽고 수정할 수 있는 [개인 Page](https://chatgpt.com/space/page_bdc8a4449fa8819192012a61334ce35c)에도 같은 기획을 보관했다. 두 문서는 자동 동기화되지 않는다. 다른 컴퓨터로 옮길 때는 이 기획 파일도 함께 반영해야 한다.

## 1. 어디서 작업하는가

- 웹: https://github.com/yongchoi422/poopi_frontend — 기본 브랜치 `master`.
- 게임과 새 홈페이지는 [PR #1](https://github.com/yongchoi422/poopi_frontend/pull/1)에서 병합 완료. 구현 기준 커밋: `df91159761c91f296051bc4cf4edf94660c85996`.
- 원본 컨트랙트·SVG 자료: https://github.com/yongchoi422/erc-20i-souli-smart-contract — 아트/계약 조사 시에만 추가 클론하면 된다. 웹 실행에는 필요하지 않다.
- 공식 서비스 목표 주소는 `https://souli.net/`. 별도 Sites 미리보기를 공식 배포 경로로 삼지 않는다.
- 사용자 최종 결정: **자동 배포는 만들지 않는다. Google 쪽에서 배포할 수 있을 때 기존 서비스에 수동 배포한다.** 지금 인수인계의 목적은 새 컴퓨터에서 개발을 재개하는 것이다.
- 2026-09-17 마지막 운영 확인 시 souli.net은 기존 화면을 Google 인프라에서 제공했다. Google 프로젝트·서비스·리전은 미확인이다. Cloud Run이라고 단정하거나 현재 운영 상태를 그날 기록으로 확정하지 않는다. GitHub 반영과 실제 사이트 배포는 별개다.

## 2. 새 컴퓨터 준비와 실행

Git과 Node.js/npm이 필요하다. 인수인계 확인 컴퓨터의 런타임은 Node `v24.16.0`, npm `11.13.0`이다. 오래된 Dockerfile의 Node 16을 새 로컬 개발 환경의 기준으로 삼지 않는다.

원하는 작업 폴더에서:

```sh
git clone https://github.com/yongchoi422/poopi_frontend.git
cd poopi_frontend
npm ci --no-audit --no-fund
npm run dev -- --host 127.0.0.1
```

Windows PowerShell에서 `npm.ps1` 실행 정책 오류가 나면 위의 `npm`을 `npm.cmd`로 바꾼다. 개발 서버 터미널을 켜 둔 채 표시된 주소를 연다. 기본 포트가 비어 있으면:

- 홈: http://127.0.0.1:5173/
- 게임: http://127.0.0.1:5173/lighthouse.html
- 기존 수집 UI: http://127.0.0.1:5173/legacy.html — 개발 전용이며 현재 production 빌드에는 없다.

기본 홈/게임 미리보기 실행에는 `.env`, 개인키, 별도 API 키가 필요하지 않다. 지갑 주소의 SVG를 실시간으로 조회할 때는 인터넷과 공개 Base RPC 응답이 필요하다. 지갑 연결 없이도 공개 SVG로 플레이할 수 있다.

컨트랙트 자료가 필요하면 웹 폴더의 상위 폴더에서:

```sh
git clone https://github.com/yongchoi422/erc-20i-souli-smart-contract.git
```

컨트랙트 저장소 클론은 배포나 토큰 재발행 지시가 아니다.

## 3. 사용자가 원하는 제품

- 실제 SOULI ERC20i 보유 지갑에서 생성되는 **원본 SVG**가 주인공이다. 별도 가상 캐릭터로 대체하지 않는다.
- 배경·메뉴·게임 화면까지 일관된 2D 도트 스타일. 현재 크림색 UI, 숲색 테두리, 금색 버튼과 로컬 픽셀 글꼴을 사용한다.
- 현재 메인은 **Growing grove → Soul gallery → Little town**으로 이어지는 2D 마을이다. 옛 다섯 층 세계는 소스를 남긴 이전 초안이며 새 개발의 고정 조건이 아니다.
- 실제 원본 SVG를 주인공으로 크게 보여 준다. 배경은 낮은 채도의 숲·돌·크림색으로 맞추고 원본의 전경 픽셀은 바꾸지 않는다.
- 어렵고 복잡한 조작보다 느리고 단순한 방치형. `Start a little day` 한 번으로 1분 작업을 반복하고 처음 모은 재료로 가로등을 켠다. 모바일은 시작/정지 버튼을 하단에 고정한다.
- 화면이 어지럽지 않고 게임 세계가 크게 보이게 한다. 필요 이상의 카드·숫자·조작 버튼을 늘리지 않는다.
- 사이트와 게임 문구는 **영어 전용**. GM, fren, HODL, diamond hands, touch grass 같은 가벼운 코인 문화 유머를 쓴다. 사용자와 대화·인수인계는 한국어여도 된다.
- 장기 목표는 1 SOULI만 가진 사람도 공동 세계에 기여하는 느낌, 여러 사람이 같은 세계를 바라보는 경험이다. 10만 개 캐릭터를 DOM에 모두 그리기보다는 구역·집계·근처 상세 표시를 고려한다.
- 시장을 날씨와 짧은 이야기로 표현하는 방향이다. 현재 Sun/Rain/Dusk는 수동 미리보기이며 보상량에 영향을 주지 않는다. 실제 가격 데이터는 붙어 있지 않다.

## 4. 현재 되는 것과 아직 없는 것

| 기능 | 실제 상태 |
| --- | --- |
| 영어 도트 홈페이지 | 구현됨. SVG 갤러리, 지역 미리보기, 출시 계획, FAQ |
| 새 2D 마을 | 성장 숲·갤러리·마을 이동. 선택한 원본이 해당 장소에 표시됨 |
| SVG | 원본 on-chain 공개 샘플 6개 + 배포 렌더러의 첫 점 형태 예시. Base 주소로 현재 SVG 읽기 가능 |
| 방치 흐름 | 1분당 기억 3·재료 8·빛나는 돌 4, 가로등 → 쉼터 → 갤러리의 순차 건설과 배경 변화, 시작/정지, 활성 상태에서 최대 2시간 복귀 계산 |
| Dynamic/Stable | 공개 샘플과 구분. 주소 조회 원본의 계약 `getSoul().lvl` 읽기, 미지원 시 레벨 미표시 |
| 보존 | 설명 화면만 구현. 실제 이전·조건 검증·MetaMask 전송 미연결 |
| 지갑 연결 | injected browser wallet의 계정 및 잔액 읽기. 기본 접속 시 자동 팝업 없음 |
| 공동 플레이 | 로컬 API로 최대 32개 개인 집의 비동기 공동 정원 기여 구현. Azure/라이브 이동/초대 미연결. 주변 주민은 실제 접속자가 아님 |
| 시장 날씨 | 시뮬레이션. 실시간 가격·예측 모델 없음 |
| Buy/Get SOULI | 제안 고정가 견적. 실제 판매 버튼/송금 미연결 |
| 목표 모금 후 LP | 별도 예시 시뮬레이터. escrow·환불·LP vault·keeper 미구현 |
| 서버 인증 | 별도 SIWE 서명 로그인과 Base 보유 확인 구현, 로컬 검증. 공개 주소 조회만으로는 인증하지 않음 |
| 토큰 보상 | 없음. 게임의 memories는 게임 점수 |

기본 지갑 연결은 읽기 전용이다. 별도 Home & neighbors 로그인에서만 `personal_sign`으로 SIWE 서명을 요청한다. 결제·지출 승인·실제 전송 코드는 추가하지 않았고 판매 계약도 배포하지 않았다. 로그인의 실제 MetaMask 확장 테스트와 Azure/PostgreSQL 통합 검증은 아직 필요하다.

새 마을 진행은 브라우저 `localStorage`의 `souli-sanctuary-v1`에 저장된다. 예전 `souli-idle-v2`는 삭제하거나 자동 이관하지 않는다. 재료·가로등·일지·활성 여부를 복원하며 캐릭터 선택·날씨·화면 위치는 새 방문 시 기본값이다. 새 컴퓨터로 clone해도 진행 기록과 지갑 연결 상태는 이동하지 않는다. `localhost`, `127.0.0.1`, 각 배포 도메인도 저장소가 서로 다르다. 로컬 저장은 서버 권위나 부정행위 방지를 제공하지 않는다.

## 5. 코드 길잡이

서버 집은 위 로컬 연습과 별개다. 로컬 API는 `server/data/beta.sqlite`, 운영 설정은 PostgreSQL을 사용한다. 서버 진행은 클라이언트 저장을 가져오지 않는다. 같은 서비스에 서명 로그인하면 같은 주소의 집을 읽으며, 파일 DB는 Git clone만으로 이동하지 않는다.

| 경로 | 역할 |
| --- | --- |
| `src/site/SouliHome.vue`, `site.css` | 현재 홈페이지·반응형 스타일 |
| `src/lighthouse/main.js`, `SanctuaryApp.vue`, `sanctuary.css` | 현재 게임 진입점·전체 UI·모달·저장·반응형 |
| `SanctuaryScene.vue` | 홈과 게임이 공유하는 새 SVG 배경·장소별 카메라·원본 표시 |
| `sanctuary.mjs`, `scripts/test-sanctuary.mjs` | 채집·세 단계 건설·복귀 계산·기존 저장 호환 및 테스트 |
| `soul-framing.mjs`, `tiny-soul.json`, `scripts/test-soul-framing.mjs` | 작은 원본의 표시 영역 계산·실제 첫 형태·검증 |
| `BetaHome.vue`, `beta-api.mjs` | 선택적 SIWE 로그인·개인 집·공동 정원 UI |
| `server/app.mjs`, `chain.mjs`, `store.mjs`, `test/beta.test.mjs` | 서명/쿠키 인증, Base 보유 확인, 서버 진행/트랜잭션, API 테스트 |
| `Dockerfile.beta`, `server/.env.example`, `docs/BETA-READINESS.ko.md` | Node 24 베타 배포 정의·설정 예시·수동 절차. 실제 Azure 배포 전 |
| `IdleLighthouse.vue`, `PixelSoulWorld.vue`, `SoulWorldView.vue`, `world.mjs` | 보존한 이전 다섯 층 게임 초안. 현재 엔트리에서 사용하지 않음 |
| `engine.mjs`, `idle.mjs` | 보존한 이전 역할·방치 엔진과 기존 테스트 대상 |
| `soul-art.js`, `public-souls.json` | 원본 공개 SVG·무대용 표시 가공 |
| `souli.js` | Base에서 inscription/SVG 읽기 |
| `wallet-session.mjs`, `WalletAccess.vue` | 공유 읽기 전용 지갑 세션 |
| `purchase.mjs`, `BuySouli.vue` | USDC 견적·잔액 조회·판매 미연결 상태 |
| `launch.mjs`, `LaunchPreview.vue` | 목표 모금/개설/환불의 예시 흐름 |
| `community.mjs`, `CommunityLights.vue` | +1 기여·공동 규모 예시 |
| `pixel-ui.css` | 게임·모달의 통일된 도트 UI |
| `PixelVillage.vue`, `IdleVillageView.vue` | 보존한 이전 위에서 보는 마을 소스 |
| `src/App.vue`, `src/main.js`, `src/services/` | 원래 수집 앱 소스 |
| `vite.config.js` | production entry는 `index.html`, `lighthouse.html` 두 개 |

`lighthouse.html`은 `?region=grove|gallery|village`, `?soul=0..5|dot`, `?panel=souls|launch` 진입 링크를 지원한다. 이전 지역 링크는 새 마을로 안내한다. 구매 시뮬레이터를 실제 판매 페이지로 오해하게 만들지 않는다.

## 6. 토큰·출시 논의의 결정과 미결정

이 절은 이전 대화와 코드의 제안 값을 인수인계하는 것이며 새로운 판매 조건이나 현재 시장 데이터가 아니다.

- 체인: Base, chain ID `8453` (`0x2105`).
- SOULI: `0xb43eA104c7ec75038Ac8EcA57107Eefc8B039aFF`, 코드 기준 총공급량 210,000,000 / decimals 9.
- Base USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, decimals 6.
- 현재 읽기 RPC: `https://base-rpc.publicnode.com`.
- 과거 출시 논의: $15M FDV, 판매 대금 100% LP, 팀 장기 보유 보상, 미판매분 잠금. 후속 운영비·판매 구조 논의로 현재 재검토 중이며 최종 계약 조건으로 간주하지 않는다.
- UI의 제안 견적은 1 USDC = 14 SOULI. 이는 USD와 USDC를 1:1로 가정한 고정가 예시이며 실시간 시세가 아니다.
- $50k / $100k / $150k는 비교용 모금 목표다. **최종 목표, 판매 기간, 확정 팀 수량, 잠금 조건은 미확정**이다. 이전 추천치를 사용자 승인으로 간주하지 않는다.
- 예를 들어 $50k 목표라면 구매자 700,000 SOULI와 LP용 별도 700,000 SOULI가 필요하다. 판매금을 전부 LP로 쓰면 그 판매금에서 운영비를 꺼내는 구조가 아니다.
- `PURCHASE.saleContract`는 `null`. Uniswap API 연결만으로 escrow·자동 풀 개설·잠금·환불이 완성되지 않는다. 임계액 도달 후 계약의 finalization 호출을 누가 실행할지도 설계해야 한다.
- ERC20i는 일반 ERC20 잔액뿐 아니라 SVG/seed 전송 동작이 있다. 실제 풀·escrow·claim 경로의 호환성은 fork 테스트로 확인해야 한다. 클론한 Solidity와 배포 바이트코드의 일치도 별도 확인 사항이다.
- 이미 배포된 토큰을 유지한 개발이 현재 기준이다. 과거 배분 조사만으로 새 토큰 재발행·기존 자산 이동을 시작하지 않는다.

## 7. 검증과 알려진 제한

```sh
npm run build
node scripts/test-lighthouse.mjs
node scripts/test-idle.mjs
node scripts/test-purchase.mjs
node scripts/test-wallet-session.mjs
node scripts/test-sanctuary.mjs
node scripts/test-soul-framing.mjs
npm run test:beta
```

2026-09-30에 GitHub `master`를 별도 새 폴더로 clone하여 Node `v24.16.0` / npm `11.13.0`에서 `npm ci --no-audit --no-fund`, production build, 위 테스트 4개를 모두 통과했다. 기존 컴퓨터의 `node_modules`나 미추적 파일에 의존하지 않는 것을 확인했다.

빌드 결과는 `dist/`. 브라우저 QA에는 홈→선택 지역/캐릭터 이동, My Souls의 공개 주소 조회, Launch의 미연결 표시, 닫기/키보드, 작은 화면 넘침, 콘솔 오류를 포함한다. 2026-09-17 구현 당시 desktop/390px/360px 및 실제 공개 Base SVG 조회를 확인했다. 실제 거래나 실제 지갑 확장 서명 테스트 기록은 없다.

게임 Web3 번들이 커서 Vite 경고가 남는다. 의존성에 deprecated 경고도 있다. 인수인계 과정에서 `npm audit fix --force`나 전면 버전 업그레이드로 동작을 바꾸지 않는다. 필요하면 별도 작업으로 다룬다.

2026-09-30 새 마을 구현은 Node `v24.21.0` / npm `11.19.0`에서 build와 기존 4개 + 새 1개 테스트를 통과했다. 브라우저에서 데스크톱·390px·360px 배치, 가로등 건설/재접속 저장, 일지, 지역 이동, 공개 샘플 선택, 실제 Base 주소 SVG와 L4 조회, 잘못된 주소 안내, 키보드 닫기, 미연결 결제 표시를 확인했다. 실제 MetaMask 서명·자산 이전 테스트는 하지 않았다.

현재 Dockerfile은 Node 24로 `dist`와 API를 같은 origin에서 제공한다. 이전 Node 16 + `serve` 정의는 `legacy/Dockerfile.node16`에 보관했다. 실제 Google 환경에서 새 빌드를 검증한 것은 아니다. 운영 배포를 다시 요청받으면 기존 서비스 설정·롤백 방법을 확인하고 수동 배포한다. GitHub Actions나 별도 Sites 배포를 자동으로 추가하지 않는다.

## 8. 다음 작업을 시작하는 순서

베타 서버까지 실행하려면 `npm.cmd ci --prefix server` 후 별도 터미널에서 `npm.cmd run dev:api`, 프런트엔드는 `npm.cmd run dev -- --host 127.0.0.1`을 사용한다. 세부 검증 기록과 아직 필요한 실제 지갑·Azure·판매 경로는 `docs/BETA-READINESS.ko.md`를 따른다.

1. 이 문서와 `SITE-RELEASE.md`, 실제 소스를 읽고 `git status`로 사용자 변경을 확인한다.
2. lockfile로 설치하고 빌드·기존 테스트를 실행한 뒤 로컬 홈/게임을 연다.
3. 화면을 직접 보고 현재 구현/시뮬레이션 경계를 파악한다. 초기 위에서 보는 타워 디펜스로 돌아가 처음부터 다시 만들지 않는다.
4. 후속 기능이 지정되지 않았다면 실행·현황 보고까지 마친 뒤 사용자에게 다음 우선순위를 확인한다. 게임 다듬기, 서버 공동 세계, 판매 계약은 서로 별도 작업이다.
5. 이미 있는 실제 SVG와 단순한 영어 도트 UI를 보존하며 요청받은 기능부터 이어간다.

이 Git 저장소만으로 웹/게임 개발은 재개할 수 있다. 이전 대화 전문, 로컬 금융 조사 문서·개인 지갑 분류·미추적 감사 스크립트, 지갑 연결 권한, Google 로그인, API 자격증명, 브라우저 게임 저장은 Git으로 전달되지 않는다. 금융 조사까지 이어갈 때는 관련 비공개 자료를 별도로 전달받고, 누락된 근거를 추정해서 채우지 않는다.

## 9. 새 대화에 붙여 넣을 프롬프트

```text
SOULI 웹/게임 작업을 다른 컴퓨터에서 이어가려 한다.
원본 저장소는 https://github.com/yongchoi422/poopi_frontend 이고 기본 브랜치는 master다.
아직 없으면 클론하고, 이미 있으면 사용자 변경을 보존하면서 상태부터 확인해줘.
HANDOFF.ko.md와 SITE-RELEASE.md를 먼저 읽고, 실제 소스와 함께 기존 작업을 인수인계해줘.

실제 SOULI ERC20i 원본 SVG가 주민이 되는 2D 도트 방치형 세계다.
현재 영어 도트 홈페이지와 성장 숲/원본 갤러리/작은 마을의 로컬 플레이 버전이 구현되어 있다.
기획 docs/SOULI-GAME-DESIGN.ko.md도 읽어줘. Dynamic 성장 → Stable 보존 수집 → 주민 정착을 중심으로 이어가자.
실제 원본 SVG와 기존 계약·지갑 기반을 재사용하고, 배경과 임시 규칙은 수정 가능하다. 사이트/게임 UI는 영어, 설명은 한국어로 해줘.
게임은 크게, 조작은 단순하게, 덜 어지럽게 유지해줘.

우선 루트와 server에서 npm ci로 준비하고 production build, 기존 4개 + test-sanctuary.mjs + test-soul-framing.mjs 및 test:beta를 확인해줘. API와 Vite를 실행하고 로컬 홈과 lighthouse.html을 열어줘.
현재 구현된 기능, 시뮬레이션인 기능, 다음에 할 일을 짧게 설명해줘.
후속 기능을 내가 지정하지 않았다면 새로운 큰 기능을 임의로 만들지 말고 실행 가능한 상태까지 준비해줘.

실제 판매·자동 LP·환불·라이브 플레이어 이동/초대는 미연결이다. 서버 인증·개인 저장·동네 공동 정원은 로컬 구현했지만 운영 배포 전이다. 데모를 라이브라고 표시하지 마.
기존 경제 수치는 재검토 중인 제안이며 docs/BETA-READINESS.ko.md에서 미결정 사항을 확인해줘.
인증·이전·결제는 MetaMask 중심으로, 필요한 서버는 Azure로 설계한다. 현재 읽기 전용 연결과 별도의 SIWE 로그인 코드를 구분해서 봐줘.
자동 배포는 필요 없다. 공식 주소 souli.net의 웹 호스팅 경로는 배포 시 확인하고 수동 배포한다. 기존 서비스는 Google에 있었다.
별도 Sites 사이트를 새로 만들거나 지금 운영 배포·토큰 재발행·거래를 하지 말아줘.
아트/컨트랙트 조사가 필요하면 https://github.com/yongchoi422/erc-20i-souli-smart-contract 를 추가로 클론해줘.
```
