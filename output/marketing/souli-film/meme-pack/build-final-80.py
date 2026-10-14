"""Build the reviewed 80-film delivery and proposal without editing the live website."""
from pathlib import Path
import json,csv,html,hashlib,subprocess,sys,shutil,zipfile
from PIL import Image,ImageDraw,ImageFont
out=Path(__file__).resolve().parent
repo=out.parents[3]
sys.path.insert(0,str(repo/'tmp/souli-video-tools'))
import imageio_ffmpeg
ff=imageio_ffmpeg.get_ffmpeg_exe()
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8')
def esc(v):return html.escape(str(v),quote=True)
original=read(out/'episodes.json')
archive=out/'revisions/pre-batch3-final'
archive.mkdir(parents=True,exist_ok=True)
if not (archive/'episodes.json').exists():shutil.copy2(out/'episodes.json',archive/'episodes.json')
if not (archive/'editorial-review.json').exists():shutil.copy2(out/'editorial-review.json',archive/'editorial-review.json')
episodes=[e for e in original['episodes'] if int(e['id'])<=40]
for x in read(out/'batch3-production-prompts.json'):
 episodes.append({'id':str(x['id']),'title_ko':x['titleKo'],'character':'soul-'+str(x['id']),'setting':x['setting'],'look':x['material'],'hook':x['titleKo'],'payoff':x['action'],'caption':x['caption'],'trigger':x['triggerKo'],'video_prompt':x['videoPrompt'],'image_prompt':x['imagePrompt']})
assert len(episodes)==80 and len({e['id'] for e in episodes})==80
selection=read(out/'applied-final-selection.json')
selection.update(read(out/'applied-batch3-selection.json'))
actual_prompts={str(p['id']):p.get('prompt',p.get('videoPrompt')) for p in read(out/'batch3-submitted-prompts.json')}
repair_prompts={str(p['id']):p['prompt'] for p in read(out/'batch3-repair-prompts.json')}
for e in episodes:
 n=e['id']
 if n in actual_prompts:e['video_prompt']=actual_prompts[n]
 if n in repair_prompts and 'batch3-repair' in selection.get(n,{}).get('source',''):e['video_prompt']=repair_prompts[n]
hero=['01','06','16','21','28','37']
market={'04','08','09','32'}
moods={
 'gm':['01','06','21','34'],
 'builder':['10','12','23','27','28','35','36','37','38','40'],
 'frens':['03','13','17','20','24','26','30','31','39'],
 'rough':['02','05','07','11','14','15','16','18','19','22','25','29','33'],
 'market':['04','08','09','32']}
moods['gm'] += ['41','50','61','70','77','80']
moods['builder'] += ['43','44','46','54','55','60','62','63','66','67','72','74','78']
moods['frens'] += ['48','53','56','57','58','59','65','69','73','76','79']
moods['rough'] += ['42','45','47','49','51','52','64','68','71','75']
labels={'all':'전체','hero':'메인 추천','gm':'gm','builder':'만드는 중','frens':'frens & weekend','rough':'그런 날','market':'ETH 무드'}
drive=read(out/'drive-delivery-manifest.json') if (out/'drive-delivery-manifest.json').exists() else {}
drive_by={x['episode']:x for x in drive.get('videos',[])}
reports=[]
for e in episodes:
 n=e['id'];video=out/f'episode-{n}.mp4'
 assert video.exists()
 r=imageio_ffmpeg.read_frames(str(video))
 try:m=next(r)
 finally:r.close()
 assert m['size']==(1280,720) and 7.8<m['duration']<8.2
 subprocess.run([ff,'-v','error','-i',str(video),'-f','null','-'],check=True,capture_output=True)
 e['status']='prepared_reviewed_not_published'
 e['video_file']=video.name
 e['poster_file']=f'episode-{n}-poster.jpg'
 e['hero_eligible']=n in hero
 e['mood']=next(k for k,v in moods.items() if n in v)
 if n in selection:
  e['observed_result']=selection[n]['note']
  e['editor_note']='16개 시점의 프레임을 비교해 눈에 띄는 얼굴 교체·인간형 팔다리 추가 여부를 검수했다. 생성 영상의 소품·질감·가려진 부분은 원화와 차이가 있을 수 있다.'
  if n=='19':e['editor_note']+=' 뚜껑 뒤에 가려졌던 받침 부분은 생성 해석이며 얼굴 무늬는 유지된다.'
  e['selected_revision']=selection[n]['source']
 e['review_label']='검수본 · 준비 전용'
 if int(n)>20:
  e['hook']=e['title_ko']
  e['payoff']=e['observed_result']
 if n=='01':e['caption']='gm. fully caffeinated.'
 if n=='04':
  e['hook']='레드카펫까지 깔아둔 아파트 복도'
  e['payoff']='스스로 펼쳐졌다 다시 말리는 레드카펫'
 if n=='10':e['payoff']='회의실을 나가고 싶어서 의자째 퇴장한다'
 e['context_requirement']='게시 직전 ETH 방향·기간을 확인하고 캡션이 맞을 때 사용. 실제 피해나 장애에는 사용하지 않음.' if n in market else '상황에 맞는 일상 코미디. 실제 출시·제휴·서비스 상태를 암시하는 캡션은 별도 사실 확인.'
 report={'id':n,'file':video.name,'master':f'episode-{n}-master-720p.mp4','seconds':m['duration'],'width':1280,'height':720,'fps':m['fps'],'bytes':video.stat().st_size,'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'full_decode_passed':True,'audio':'removed','visual_review':'sampled_frame_review_completed','review_frames':16 if n in selection else 6}
 reports.append(report)
assert len({r['sha256'] for r in reports})==80
original.update(version=4,status='80_videos_prepared_reviewed_not_published',publishing_enabled=False,episodes=episodes)
original['brief']='80 different SOULI miniature comedies: 40 previously reviewed films plus 40 additional characters and scenes.'
original['brand_constants'][0]='Source SVGs guide each cinematic character. Selected clips were inspected for conspicuous mid-clip identity changes; they are artistic interpretations, not pixel-exact SVG renders.'
original['release_proposal']='80 situation-based clips are prepared. A future daily release can use up to 80 slots; choose relevant clips, alternate mood and setting, and mix real game development updates. No publication or schedule has been configured.'
write(out/'episodes.json',original)
write(out/'video-validation.json',reports)
write(out/'editorial-review.json',{'method':'Full-file FFmpeg decode of all 80. 16-frame visual checks for 12 replacements and 60 additions; six-frame checks retained for eight earlier accepted clips. Sampled review does not guarantee frame-perfect SVG identity, seamless looping or audience response.','identity_replaced_ids':sorted(n for n in selection if int(n)<=20),'hero_shortlist':hero,'episodes':[{'id':e['id'],'selected_revision':e.get('selected_revision',1),'observed':e.get('observed_result'),'note':e.get('editor_note'),'hero_eligible':e['hero_eligible']} for e in episodes]})
media={'version':1,'status':'prepared_not_deployed','proposed_gallery_route':'/moments','market_asset':'ETH','chain':'Base','hero_selection':{'ids':hero,'strategy':'one_random_per_session','manual_next':True,'autoplay':'muted playsinline, unless reduced motion or save data','loop_default':False,'on_end':'hold final frame; offer replay','fallback':'../souli-hero-poster.jpg'},'drive_archive':'https://drive.google.com/drive/folders/1PFx3kre_rFMnmxNmTPYDVZhHKVNu3KND','clips':[]}
for e,r in zip(episodes,reports):
 media['clips'].append({'id':e['id'],'title':e['title_ko'],'caption':e['caption'],'mood':e['mood'],'heroEligible':e['hero_eligible'],'contextRequirement':e['context_requirement'],'video':e['video_file'],'poster':e['poster_file'],'duration':r['seconds'],'width':1280,'height':720,'bytes':r['bytes'],'sha256':r['sha256'],'drive':drive_by.get(e['id'])})
write(out/'website-media-manifest.json',media)
with (out/'captions.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['id','title_ko','caption','mood','trigger','hero_eligible','context_requirement','video','observed_result'])
 for e in episodes:w.writerow([e['id'],e['title_ko'],e['caption'],e['mood'],e['trigger'],e['hero_eligible'],e['context_requirement'],e['video_file'],e.get('observed_result','')])
style="""*{box-sizing:border-box}body{margin:0;background:#f4f1ea;color:#142127;font:16px/1.55 system-ui,sans-serif}a{color:inherit}button,.pill{font:inherit;border:1px solid #b6bdb3;border-radius:30px;padding:10px 18px;background:transparent;cursor:pointer;text-decoration:none;display:inline-block}button:hover,.pill:hover{background:#dfff7f}button:focus-visible,a:focus-visible{outline:3px solid #2055ff;outline-offset:4px}header{padding:30px max(24px,5vw) 45px;border-bottom:1px solid #c8cfc3}.top{display:flex;justify-content:space-between;align-items:center;gap:18px}.brand{font-size:27px;font-weight:900;letter-spacing:-1px}.eyebrow{font-size:12px;letter-spacing:2px;font-weight:700}h1{font-size:clamp(40px,6.4vw,94px);font-weight:850;letter-spacing:-.055em;line-height:.98;margin:36px 0 24px;max-width:950px}header p{max-width:810px;color:#53615d}nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:30px}nav button[aria-pressed=true]{background:#172e2a;color:#fff}main{max-width:1600px;margin:auto;padding:32px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:24px}article{background:#fff;border:1px solid #d6ddd5;border-radius:16px;padding:14px;overflow:hidden}article[hidden]{display:none}small{font-size:12px;color:#64716a}video{width:100%;aspect-ratio:16/9;object-fit:contain;border-radius:10px;background:#111;margin-top:10px}h2{font-size:21px;letter-spacing:-.5px;margin:16px 0 8px}article p{font-size:14px;color:#5d6965}blockquote{margin:15px 0;background:#f4f5ed;padding:12px;border-radius:8px;font-weight:650}details{font-size:13px;color:#576963;margin:14px 0}footer{padding:28px 5vw;color:#66736d}.actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.actions a,.actions button{font-size:13px;padding:8px 12px}#feedback{min-height:24px;color:#315d20}.hero-layout{display:grid;grid-template-columns:.85fr 1.15fr;gap:40px;align-items:center;padding:50px 5vw;min-height:72vh}.hero-layout h1{font-size:clamp(42px,5vw,82px);margin:0 0 28px}.hero-layout video{margin:0}.hero-layout p{color:#607069;max-width:480px}.hero-note{font-size:12px;color:#67776d;margin-top:10px}.teasers{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding:10px 5vw 45px}.teasers img{width:100%;border-radius:14px}.teasers a{text-decoration:none}.concept-note{background:#e9eee3;padding:24px 5vw;font-size:14px}@media(max-width:800px){.hero-layout{grid-template-columns:1fr;gap:22px;padding:30px 6vw}.hero-layout h1{max-width:650px}.teasers{grid-template-columns:1fr}.top{align-items:flex-start}.top .pill{font-size:12px}main{padding:18px}}"""
cards=[]
for e in episodes:
 n=e['id']
 badge=' · MAIN PICK' if n in hero else ''
 cards.append(f"""<article id="episode-{n}" data-mood="{e['mood']}" data-hero="{str(n in hero).lower()}"><small>SOUL {n} · {esc(e['setting'])}{badge}</small><video controls muted playsinline preload="none" poster="{e['poster_file']}" data-src="{e['video_file']}" aria-label="{esc(e['title_ko'])}"></video><h2>{esc(e['title_ko'])}</h2><p>{esc(e.get('observed_result',e['payoff']))}</p><blockquote>{esc(e['caption'])}</blockquote><div class="actions"><a class="pill" href="{e['video_file']}" download>MP4 저장</a><button class="copy" data-caption="{esc(e['caption'])}">캡션 복사</button><a href="#episode-{n}">#{n}</a></div><details><summary>사용 상황과 검수 기록</summary><p>{esc(e['context_requirement'])}</p><p>{esc(e.get('editor_note','프레임 검수 완료'))}</p><a href="cast/soul-{n}.png">원본 SVG 캐릭터</a></details></article>""")
buttons=''.join(f'<button data-filter="{k}" aria-pressed="{str(k=="all").lower()}">{v}</button>' for k,v in labels.items())
js="""const videos=[...document.querySelectorAll('video')];const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const v=e.target;if(!v.src)v.src=v.dataset.src;io.unobserve(v)}}),{rootMargin:'150px'});videos.forEach(v=>{io.observe(v);v.addEventListener('play',()=>videos.forEach(o=>{if(o!==v)o.pause()}))});document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelectorAll('article').forEach(a=>{a.hidden=!(b.dataset.filter==='all'||b.dataset.filter==='hero'&&a.dataset.hero==='true'||a.dataset.mood===b.dataset.filter);if(a.hidden)a.querySelector('video').pause()})}));document.querySelectorAll('.copy').forEach(b=>b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(b.dataset.caption);b.textContent='복사됨';document.querySelector('#feedback').textContent='캡션을 복사했어요.'}catch{document.querySelector('#feedback').textContent=b.dataset.caption}}));"""
page=f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SOULI · 80 little moments</title><style>{style}</style></head><body><header><div class="top"><span class="brand">souli.</span><a class="pill" href="homepage-concept.html">메인 배너 시안 ↗</a></div><p class="eyebrow">80 FILMS / 80 SOULS / PREPARED, NOT PUBLISHED</p><h1>Little souls.<br>Very relatable disasters.</h1><p>다른 소울, 다른 장소, 8초의 작은 반전. 기존 검수본 40편과 새로 만든 40편을 한곳에서 골라보세요. 생성된 브랜드 상황극이며 실제 게임 플레이 영상은 아닙니다.</p><div class="actions"><a class="pill" href="https://drive.google.com/drive/folders/1PFx3kre_rFMnmxNmTPYDVZhHKVNu3KND">Google Drive</a><a class="pill" href="captions.csv" download>80개 캡션</a><a class="pill" href="website-handoff.txt">웹 담당 전달안</a></div><nav aria-label="상황별 영상">{buttons}</nav><p id="feedback" aria-live="polite"></p></header><main>{''.join(cards)}</main><footer>SOULI · Built on Base · ETH mood, human moments. 준비용 라이브러리 — 게시·예약하지 않았습니다.</footer><script>{js}</script></body></html>"""
(out/'index.html').write_text(page,encoding='utf-8')
hero_data=[{'id':e['id'],'title':e['title_ko'],'caption':e['caption'],'video':e['video_file'],'poster':e['poster_file']} for e in episodes if e['id'] in hero]
hero_js="""const clips=CLIPS;const v=document.querySelector('#heroVideo');const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||navigator.connection?.saveData;let chosen;try{chosen=sessionStorage.getItem('souli-hero')}catch{}let idx=Math.max(0,clips.findIndex(c=>c.id===chosen));if(!chosen||!clips.some(c=>c.id===chosen))idx=Math.floor(Math.random()*clips.length);function show(){const c=clips[idx];v.pause();v.poster=c.poster;v.src=c.video;v.setAttribute('aria-label',c.title);document.querySelector('#scene').textContent=c.caption;try{sessionStorage.setItem('souli-hero',c.id)}catch{}if(!reduced)v.play().catch(()=>{});}document.querySelector('#next').addEventListener('click',()=>{idx=(idx+1+Math.floor(Math.random()*(clips.length-1)))%clips.length;show()});document.addEventListener('visibilitychange',()=>{if(document.hidden)v.pause()});show();""".replace('CLIPS',json.dumps(hero_data,ensure_ascii=False))
teasers=''.join(f'<a href="index.html#episode-{n}"><img loading="lazy" src="episode-{n}-poster.jpg" alt="{esc(next(e["title_ko"] for e in episodes if e["id"]==n))}"><p>{esc(next(e["caption"] for e in episodes if e["id"]==n))}</p></a>' for n in ['21','28','37'])
concept=f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SOULI · Homepage concept</title><style>{style}</style></head><body><header style="padding-bottom:24px"><div class="top"><span class="brand">souli.</span><a class="pill" href="index.html">All moments ↗</a></div></header><section class="hero-layout"><div><p class="eyebrow">SMALL SOULS. ON BASE.</p><h1>A little soul.<br>A lot of feelings.</h1><p>Some days you conquer the world.<br>Some days the sock wins.</p><div class="actions"><span class="pill" style="background:#172e2a;color:white">Game in development</span><a class="pill" href="index.html">Find your mood</a></div></div><div><video id="heroVideo" controls muted playsinline preload="metadata" poster="../souli-hero-poster.jpg"></video><div class="actions" style="justify-content:space-between;margin-top:12px"><span id="scene" class="hero-note"></span><button id="next">Meet another soul ↻</button></div></div></section><div class="teasers">{teasers}</div><section class="concept-note"><strong>홈페이지 적용 제안 시안</strong><p>추천 6편에서 방문마다 한 편을 고르고, 한 방문 동안 유지합니다. 자동 연속 전환은 하지 않으며 재생이 끝나면 마지막 장면에서 멈춥니다. 사용자가 다른 소울을 고를 수 있습니다. 실제 게임 URL·출시 상태는 웹 담당이 확인해 연결합니다. 본 시안은 공개 사이트에 적용하지 않았습니다.</p></section><script>{hero_js}</script></body></html>"""
(out/'homepage-concept.html').write_text(concept,encoding='utf-8')
handoff="""SOULI 홈페이지 / Moments 갤러리 전달안 — 2026-10-02
현재 상태: 기존 검수본 40편 + 새 40편 = 검수본 80편. 준비만 완료. 실제 홈페이지 변경·배포·게시·예약은 하지 않음.

추천 구성
1. 메인에는 일상 코미디 6편(01 에스프레소, 06 토스터, 16 소파, 21 양말, 28 종이 자동차, 37 로봇청소기)에서 방문마다 하나를 랜덤 선택한다.
2. 한 세션 동안 선택을 유지한다. 제목·게임 진입 버튼 위치는 고정한다. 'Meet another soul'로 직접 다음 영상을 고르게 한다.
3. 기본은 8초 한 번 재생 후 마지막 프레임 유지. 완벽한 루프를 전제로 하지 않는다. 반복 적용 시에는 별도 루프 편집과 확인이 필요하다.
4. 영상은 16:9 비율을 유지해 오른쪽 또는 아래쪽에 배치한다. 무리하게 화면 전체 배경으로 잘라 쓰면 캐릭터와 반전 소품이 사라진다. 모바일에서는 제목 아래에 영상을 놓는다.
5. 사이트 바탕은 웜 화이트(#f4f1ea)와 잉크 그린(#172e2a), 포인트 라임을 제안한다. 영상 자체의 장소·색을 흰색으로 통일할 필요는 없다.
6. ETH 상승/하락 및 당일 Base 소식용 편은 메인 랜덤 목록에서 제외한다. 게시 당일 공식 출처와 실제 상태를 확인해 상황에 맞게 선택한다.
7. 기존 승인된 파란 마당 배너는 캠페인 대표 영상 또는 대체 배너로 유지한다. 1080p 파일은 720p Flow 원본을 로컬 업스케일한 버전이다.

별도 페이지: /moments (메뉴명 Moments, 내부 가칭 SOULI TV)
- 로그인/지갑 없이 감상 가능한 포스터 그리드.
- gm / 만드는 중 / frens & weekend / 그런 날 / ETH 무드 필터.
- 개별 영상에는 짧은 영문 한 줄과 재생·공유 링크를 제공한다.
- 메인의 추천 3편 티저에서 전체 갤러리로 연결한다.
- 생성 애니메이션은 실제 게임 플레이와 구분해 소개한다. 별도 게임 진입 CTA는 출시 상태가 확인된 URL로 연결한다.
- 공개 페이지에는 내부 검수 노트·제작 프롬프트를 노출하지 않는다. 현재 index.html은 준비용 검토 화면이다.

구현 참고
- website-media-manifest.json에 영상·포스터·길이·크기·해시·분류·메인 추천 여부·Drive 파일 매핑을 포함한다.
- muted + playsinline; 자동재생 실패 시 포스터와 재생 버튼. prefers-reduced-motion/saveData는 자동재생 생략.
- 갤러리 전체 80편 동시 다운로드/자동재생 금지. 포스터 지연 로딩, 클릭한 영상만 재생, 다른 영상 일시정지.
- 16:9 영역을 미리 잡아 레이아웃 이동 방지. 키보드 포커스·재생 버튼·설명 텍스트 유지.
- Drive는 원본 보관/전달용이다. 실제 웹 영상 URL은 기존 웹 프로젝트의 정적 파일 또는 미디어 배포 경로에 업로드한 URL로 치환한다.
- 홈페이지 시안 homepage-concept.html은 이 로컬 자료실에서만 작동하는 데모다. 실제 사이트 코드는 수정하지 않았다.
- 기본 전달 영상: 1280×720, 약 8초, 무음 H.264 MP4. 메인에 크게 쓸 경우 영상 전체 구도를 보존한다.
- 1080p 배너: ../souli-hero-1080p.mp4 / 출처 메모: ../hero-1080p-handoff.json.

향후 운영 제안
- 매일 한 편도 가능하며 80편은 최대 80일치 상황 재고다. 뉴스·개발 진척·커뮤니티 상황이 더 중요하면 그날 클립을 미룬다.
- 같은 배경·재질·감정은 연속 배치하지 않는다. 밈 사이에 실제 개발/플레이 소식을 섞는다.
- 첫 2주는 반응을 비교해 이후 빈도를 조정한다. 좋아요뿐 아니라 자발적 공유·맥락 있는 답글·프로필 방문·실제 게임 유입을 본다.
- 캡션은 짧게, fren은 어울릴 때만 사용한다. 매번 구매 CTA를 붙이지 않는다.
- ETH 상승을 SOULI 가격 상승이나 수익 보장으로 연결하지 않는다. Base 발표를 SOULI 제휴로 표현하지 않는다.
"""
(out/'website-handoff.txt').write_text(handoff,encoding='utf-8-sig')
(out/'README.txt').write_text('SOULI — 80 reviewed films\\n'.replace('\\n','\n')+'Open meme-pack/index.html for the review library; homepage-concept.html is the proposed homepage demo.\n80 videos, 8 seconds each, 720p H.264 muted. 40 earlier reviewed clips plus 40 new scenes. Generated brand animation, not gameplay.\nNo publishing, schedule or live-site deployment. Original Flow masters and rejected revisions remain local and are excluded from this final delivery ZIP.\nBanner 1080p is a local upscale from the 720p Flow original; see hero-1080p-handoff.json.\n',encoding='utf-8')
font=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',18)
sheet=Image.new('RGB',(1600,16*216),'#172e2a');d=ImageDraw.Draw(sheet)
for i,e in enumerate(episodes):
 x,y=(i%5)*320,(i//5)*216
 p=Image.open(out/e['poster_file']).convert('RGB').resize((320,180))
 sheet.paste(p,(x,y));d.text((x+10,y+184),e['id']+' '+e['title_ko'][:17],font=font,fill='white')
sheet.save(out/'80-scenes-overview.jpg',quality=92)
libpath=repo/'docs/marketing/video-content-library.json'
lib=read(libpath);lib['version']=4
lib['meme_pack'].update(status='80_videos_prepared_reviewed_not_published',clips=80,hero_shortlist=hero,identity_replaced_ids=sorted(n for n in selection if int(n)<=20),website_manifest='output/marketing/souli-film/meme-pack/website-media-manifest.json',website_handoff='output/marketing/souli-film/meme-pack/website-handoff.txt',drive_folder=media['drive_archive'])
write(libpath,lib)
print(json.dumps({'clips':len(reports),'seconds':sum(r['seconds'] for r in reports),'unique_hashes':len({r['sha256'] for r in reports}),'bytes':sum(r['bytes'] for r in reports),'hero':hero}))

