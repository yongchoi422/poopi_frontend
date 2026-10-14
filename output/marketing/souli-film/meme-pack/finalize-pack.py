"""Select reviewed revisions, retain earlier cuts, and produce a local review kit."""
from pathlib import Path
import json, shutil, subprocess, sys, csv, html, zipfile
from PIL import Image, ImageDraw, ImageFont
out=Path(__file__).resolve().parent
repo=out.parents[3]
def load(p): return json.loads(p.read_text(encoding='utf-8'))
def save(p,v): p.write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8')
revisions=load(out/'revision-downloads.json')
archive=(out/'revisions/v1').resolve()
assert archive.is_relative_to(out.resolve())
archive.mkdir(parents=True,exist_ok=True)
log=load(out/'download-log.json')
for r in revisions:
    n=r['id']
    for suffix in ['-master-720p.mp4','.mp4','-poster.jpg','-review.jpg']:
        old=(out/f'episode-{n}{suffix}').resolve()
        dest=archive/old.name
        assert old.is_relative_to(out.resolve()) and dest.resolve().is_relative_to(out.resolve())
        if old.exists() and not dest.exists(): shutil.move(str(old),str(dest))
    for item in log:
        if item['id']==n: item['path']=r['path'];item['selected_revision']=2
save(out/'download-log.json',log)
notes={
'01':('표현 변형 검토','커피 방울 뒤에 진동하고 거품 장식으로 멈춘다.','커피 과충전은 읽힌다. 얼굴과 팔다리가 원본보다 만화적으로 변한다.'),
'02':('표현 변형 검토','필사적으로 뛰지만 제자리인 러닝머신 장면.','횡보 캡션과 맞는다. 팔·다리와 새 표정이 추가되며 후반 뒤로 밀리는 반전은 약하다.'),
'03':('우선 후보','풀잎이 휴대전화를 쓰러뜨리고 소울은 웃는 채 남는다.','v2에서 얼굴과 실루엣이 유지되고 풀의 개입이 명확해졌다.'),
'04':('보조 후보','짧게 펼쳐진 레드카펫을 금방 벗어나 멈춘다.','반전은 읽힌다. 걷는 동작에 팔다리와 새 표정이 생긴다.'),
'05':('보조 후보','냉장고 속 상승 계단 모양 야채를 본 뒤 문을 닫는다.','야채 차트 농담은 캡션과 함께 읽힌다. 첫 화면에서 야채가 일부 보이고 얼굴이 변한다.'),
'06':('우선 후보','토스트와 함께 놀라 점프하고 뒤늦게 내려온다.','점프 타이밍이 명확하다. 표정은 원본의 영화적 변형이다.'),
'07':('보조 후보','길쭉한 아이스크림이 무너지는 동안 소울은 옆에서 지켜본다.','과장된 녹음이 읽힌다. 일부 얼굴 변형이 있다.'),
'08':('우선 후보','좌우로 피하는 금빛 소울 위로 작은 먹구름이 따라온다.','v2에서 긴 토끼 귀로 바뀌던 문제가 개선되어 원래 금빛 실루엣과 얼굴이 유지된다.'),
'09':('우선 후보','카메라가 올라가며 커다란 카트 안 완두콩 한 알을 보여준다.','v2에서 소울이 별도 머리·몸을 가진 사람 형태로 변하던 문제를 해결했다. 동작은 카메라 중심이다.'),
'10':('보조 후보','소울이 회의실을 나가고 빈 의자만 돈다.','퇴장 농담이 읽힌다. 움직일 때 얼굴이 달라진다.'),
'11':('반전 보강 후보','나초가 살사에 기울고 소울이 곁에서 함께 기울어진다.','v2에서 원래 픽셀 얼굴은 유지된다. 소스에 끌려가는 계획된 핵심 반전은 충분히 구현되지 않았다.'),
'12':('우선 후보','작은 선풍기는 서버 대신 소울 머리의 종이만 날려버린다.','v2에서 원래 얼굴 유지와 종이 낙하 반전이 모두 읽힌다.'),
'13':('보조 후보','우주를 바라보다 떠다니는 감자칩을 따라 회전한다.','관심이 작은 과자로 옮겨가는 반전이 읽힌다. 표정은 일부 변한다.'),
'14':('보조 후보','엘리베이터 앞에서 조급하게 떨다가 뒤늦게 들어간다.','캐릭터가 비교적 유지된다. 기다림에 관한 일상 반응용이다.'),
'15':('반전 보강 후보','스카프가 날아와 눈 위 이마에 감긴다.','얼굴·모양은 유지되지만 스카프가 눈을 완전히 가리는 반전은 구현되지 않았다.'),
'16':('우선 후보','쿠션에 기대었다가 천천히 파묻혀 눈과 머리만 남는다.','캐릭터 유지와 쿠션에 잠기는 반전이 잘 읽힌다.'),
'17':('보조 후보','거대한 풍선에 작은 소울이 들렸다가 돌아온다.','환영용으로 적합하다. 강한 웃음보다 귀여움에 가깝고 표정이 변한다.'),
'18':('보조 후보','욕조 속 작은 배가 흔들리고 고무오리가 지나간다.','영웅적인 태도와 소소한 파도의 대비. 첫 화면부터 욕실이 보여 장소 공개 반전은 약하다.'),
'19':('우선 후보','은색 뚜껑 아래 감자튀김 한 가닥을 진지하게 살핀다.','큰 뚜껑과 작은 음식의 대비가 명확하다. 후반 얼굴과 지지대 형태는 변한다.'),
'20':('우선 후보','명상하던 소울이 휴대전화 쪽으로 움직여 정돈된 모래에 자국을 낸다.','원래 픽셀 그래픽과 조형이 잘 유지된다. 알림에 무너지는 집중을 표현한다.')}
plan=load(out/'episodes.json')
plan['version']=2;plan['status']='20_video_drafts_reviewed_not_published'
plan['delivery_summary']={'clips':20,'seconds_each':8,'dimensions':[1280,720],'fps':24,'selected_v2':['03','08','09','11','12'],'priority_shortlist':['06','16','19','20'],'needs_payoff_improvement':['11','15'],'needs_character_style_review':['01','02'],'publishing_enabled':False}
plan['brand_constants'][0]='Original SOULI stepped pixel silhouette is the art reference; preserve face pixels in future production. Current cinematic drafts have the per-episode variations documented below.'
plan['release_proposal']='After publishing resumes: 4 original posts per week total, initially 2 comedy clips, 1 real development clip, and 1 community/Base or product post. At 2 comedy clips per week, this is up to 10 weeks of draft inventory before editorial selection. Never release all 20 at once.'
for e in plan['episodes']:
    n=e['id'];label,observed,note=notes[n]
    e.update(status='video_draft_reviewed_not_published',review_label=label,observed_result=observed,editor_note=note,selected_revision=2 if n in ['03','08','09','11','12'] else 1,video_file=f'episode-{n}.mp4')
    if n=='19': e['title_ko']='고급 식당의 감자튀김 한 가닥'
save(out/'episodes.json',plan)
save(out/'editorial-review.json',{'method':'Full-file FFmpeg decode plus six-frame visual inspection. Five serious character drifts were regenerated and compared. Not a claim of pixel-exact identity, seamless loops, measured audience response or actual gameplay.','priority_shortlist':['06','16','19','20'],'episodes':[{'id':e['id'],'selected_revision':e['selected_revision'],'label':e['review_label'],'observed':e['observed_result'],'note':e['editor_note']} for e in plan['episodes']]})
subprocess.run([sys.executable,str(out/'prepare-pack.py')],check=True)
report=load(out/'video-validation.json')
for r in report: r['visual_review']='six-frame sheet inspected; see editorial-review.json';r['selected_revision']=2 if r['id'] in ['03','08','09','11','12'] else 1
save(out/'video-validation.json',report)
with (out/'captions.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f);w.writerow(['ID','제목','캡션','사용 조건','검수','파일'])
    for e in plan['episodes']:w.writerow([e['id'],e['title_ko'],e['caption'],e['trigger'],e['review_label'],e['video_file']])
font=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',17)
board=Image.new('RGB',(1600,1060),'#eef0f7');d=ImageDraw.Draw(board)
for i,e in enumerate(plan['episodes']):
    pic=Image.open(out/f"episode-{e['id']}-poster.jpg").resize((312,176))
    x,y=(i%5)*320,(i//5)*265
    board.paste(pic,(x+4,y+4));d.text((x+8,y+190),f"{e['id']}  {e['title_ko']}",font=font,fill='#172248')
    d.text((x+8,y+218),e['review_label'],font=font,fill='#596786')
board.save(out/'20-scenes-overview.jpg',quality=93)
page=(out/'index.html').read_text(encoding='utf-8')
intro='<p><b>20편 제작 초안 · 편당 8초 · 720p · 무음</b><br>먼저 볼 편: <a href="#episode-06">06 토스터</a> · <a href="#episode-16">16 쿠션</a> · <a href="#episode-19">19 고급 식사</a> · <a href="#episode-20">20 명상</a></p><p>5편은 캐릭터 변형을 줄여 재제작했습니다. 11·15편은 반전 보강, 01·02편은 원본과 다른 얼굴·팔다리 표현을 검토할 후보입니다. 모든 영상이 게시 확정본이라는 뜻은 아닙니다.</p><p><a href="captions.csv">20개 캡션 CSV</a> · <a href="episodes.json">전체 기획 JSON</a> · <a href="20-scenes-overview.jpg">20장면 한눈에 보기</a></p><img src="20-scenes-overview.jpg" style="max-width:1000px;height:auto;aspect-ratio:auto" alt="서로 다른 소울리 캐릭터와 장소 20개">'
page=page.replace('</header>',intro+'</header>').replace('header p{','header a{color:#ffc55c}header b{color:white}header p{')
(out/'index.html').write_text(page,encoding='utf-8')
libpath=repo/'docs/marketing/video-content-library.json';lib=load(libpath)
lib['version']=2
for a in lib['assets']:
    if a['id']!='hero':a['status']='superseded_by_20_little_disasters_pack_do_not_select'
    else:a['1080p_file']='souli-hero-1080p.mp4';a['1080p_note']='Local Lanczos upscale of the downloaded 720p master; Flow 1080p export did not save successfully.'
lib['meme_pack']={'plan':'output/marketing/souli-film/meme-pack/episodes.json','catalog':'output/marketing/souli-film/meme-pack/index.html','flow_project':'https://flow.google.com/u/1/project/c27fba60-0bce-4be2-910a-ad75cf1acddb','status':plan['status'],'clips':20,'priority_shortlist':['06','16','19','20'],'editorial_review':'output/marketing/souli-film/meme-pack/editorial-review.json'}
lib['future_storyboards_not_generated']=[]
save(libpath,lib)
doc=repo/'docs/SOULI-MARKETING-PLAN.ko.md';txt=doc.read_text(encoding='utf-8')
marker='## 15 제작 완료와 다음 제작 순서'
assert marker in txt
txt=txt.split(marker)[0]+'''## 15 배너와 20편 밈 영상 패키지

메인 배너는 사용자가 선택한 짙은 파란 마을과 라벤더·코럴 캐릭터 구성을 유지한다. [1080p 파일](../output/marketing/souli-film/souli-hero-1080p.mp4)은 다운로드한 720p 원본을 로컬에서 Lanczos로 확대한 1920×1080, 8초, 무음 H.264 파일이다. Flow의 1080p 내보내기는 저장에 실패했으며 이 파일을 Flow 업스케일 출력으로 표현하지 않는다. 원본과 [변환·검증 기록](../output/marketing/souli-film/hero-1080p-handoff.json)을 함께 보존한다. 홈페이지는 변경하지 않았다.

새 홍보 방향은 **20 little disasters: 진지한 소울리에게 생기는 사소한 재난**이다. 매회 원본 SVG·장소·소재·색감·물리적 농담을 바꾼다. 계단형 캐릭터, 실제처럼 보이는 작은 세트, 과하게 진지한 반응이 시리즈를 묶는다. 배너에서 잘라 쓴 옛 GM 및 비슷한 상승·하락 영상은 보관하되 신규 발행 후보에서 제외했다.

[20편 재생·캡션 목록](../output/marketing/souli-film/meme-pack/index.html)과 [전체 기획](../output/marketing/souli-film/meme-pack/episodes.json)에 20개 서로 다른 장면을 저장했다. 모두 8초, 1280×720, 24fps이며 전체 디코딩과 6프레임 검수를 거쳤다. 원본 얼굴이 크게 달라진 5편은 재생성했다. 생성 영상은 실제 게임 플레이가 아니며 SVG와 픽셀 단위로 같다는 의미도 아니다.

**먼저 볼 후보는 06 토스터, 16 쿠션, 19 감자튀김 한 가닥, 20 명상**이다. 11·15편은 반전이 기획보다 약하고, 01·02편은 팔다리·얼굴 변형에 대한 스타일 판단이 필요하다. 나머지도 개별 검수 메모를 보고 선별한다. 20편 전체를 같은 등급의 게시 확정본으로 취급하지 않는다.

재개 후에는 주 4개 전체 게시물 중 코미디 2개, 실제 개발 1개, 커뮤니티·Base 또는 제품 소식 1개를 제안한다. 밈 20편은 선택 전 기준 최대 10주치이며 한 번에 올리지 않는다. 첫 2주에는 기법이 다른 4편을 시험한다. 짧은 본문은 상황의 두 번째 농담을 맡고, 프로필과 고정 게시물은 SOULI가 무엇인지와 실제 게임 동선을 설명한다. 영상마다 매수 요구나 가격 목표를 붙이지 않는다. 좋아요보다 공유·재사용·관련 답글·프로필 방문·실제 체험을 함께 살핀다. 현재 게시·예약·배포는 하지 않았다.
'''
doc.write_text(txt,encoding='utf-8')
readme='''SOULI — 20 Little Disasters / 2026-10-02

index.html을 브라우저로 열면 20편을 재생하고 캡션·검수 기록을 볼 수 있습니다.
모든 영상: 8초 / 1280×720 / 24fps / 무음 / H.264. 게시·예약하지 않은 제작 초안입니다.
추천 시작: 06 토스터, 16 쿠션, 19 고급 식사, 20 명상.
11·15는 반전 보강 후보, 01·02는 얼굴·팔다리 표현 검토 후보입니다.
원본 SVG의 영화적 해석이며 실제 게임 영상 또는 픽셀 단위 동일 재현이 아닙니다.
시장 캡션은 당일 ETH 상황을 확인한 뒤 사용합니다. Base 뉴스와 가격 방향을 혼동하지 않습니다.
모든 장면의 계획/실제 결과 차이는 editorial-review.json과 카드별 검수 기록에 있습니다.
같은 폴더의 -master-720p.mp4 파일과 cast/에 생성 원본 및 사용한 SVG/PNG를 보존했습니다.
'''
(out/'README.txt').write_text(readme,encoding='utf-8')
zip_path=out.parent/'souli-20-memes-review-kit.zip'
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=1) as z:
    for name in ['index.html','README.txt','episodes.json','captions.csv','editorial-review.json','video-validation.json','20-scenes-overview.jpg']:
        z.write(out/name,name)
    for e in plan['episodes']:
        n=e['id']
        for suffix in ['.mp4','-poster.jpg']:
            name=f'episode-{n}{suffix}';z.write(out/name,name)
        # Preserve original-link behavior in the offline catalog.
        name=f'episode-{n}-master-720p.mp4';z.write(out/name,name)
        for suffix in ['.png','.svg']:
            name=f'cast/soul-{n}{suffix}';z.write(out/name,name)
print(json.dumps({'clips':len(report),'zip':str(zip_path),'zip_bytes':zip_path.stat().st_size,'priority':['06','16','19','20']},ensure_ascii=False))
