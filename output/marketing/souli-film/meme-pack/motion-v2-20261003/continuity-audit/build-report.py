import json,csv,io,html,re,base64,zipfile,hashlib
from pathlib import Path
from collections import Counter
from PIL import Image
ROOT=Path(__file__).resolve().parent
BASE=ROOT.parent
PACK=BASE.parent
decisions=json.loads((ROOT/'audit-decisions.json').read_text(encoding='utf-8'))
manifest=json.loads((BASE/'delivery-manifest.json').read_text(encoding='utf-8-sig'))
revs=json.loads((ROOT/'revisions.json').read_text(encoding='utf-8'))
events=json.loads((ROOT/'event-times.json').read_text(encoding='utf-8-sig'))
lookup={e['id']:e for e in manifest['episodes']}
labels={'remake':'재제작 권고','watch':'추가 확인','clear_sampled':'샘플상 중대 오류 미발견'}
assert len(decisions)==80 and len({x['id'] for x in decisions})==80
assert not any(x['status']=='check' for x in decisions)
rows=[]
for d in decisions:
    e=lookup[d['id']]
    overview=(BASE/revs.get(d['id'],'')/('episode-'+d['id']+'-dense-review.jpg'))
    video=BASE/e['video_file']
    reference=BASE/e['approved_keyframe']
    assert overview.is_file() and video.is_file() and reference.is_file()
    assert hashlib.sha256(video.read_bytes()).hexdigest()==e['sha256']
    row={**d,'title':e['title_ko'],'label':labels[d['status']],
      'publication_hold':d['status']!='clear_sampled',
      'source_video_sha256':e['sha256'],
      'video':'../'+e['video_file'],'poster':'../'+e['poster_file'],
      'reference':'../'+e['approved_keyframe'],
      'overview':'../'+overview.relative_to(BASE).as_posix(),
      'evidence':('episode-'+d['id']+'-event.jpg') if d['id'] in events else None,
      'event_timestamps':events.get(d['id'],[]),
      'drive_url':e['drive_url'],'seek':d.get('seek',0),
      'confidence':d.get('confidence','medium')}
    if row['evidence']: assert (ROOT/row['evidence']).is_file()
    rows.append(row)
counts=dict(Counter(x['status'] for x in rows))
report={
 'audit_version':'prop-continuity-20261003','reviewed_at':'2026-10-03',
 'scope':'All 80 selected final motion-v2 videos; visual continuity of props, character and background.',
 'method':'16 sampled timestamps per selected clip (0,0.5,...,7,7.95); 26 suspect clips compared to approved source images and 15 additional timestamps each, with some overlap. Dense event intervals usually 0.125–0.5 seconds. Source SHA-256 verified for all 80 selected files.',
 'limitation':'Sampled visual review, not every frame and not a zero-defect guarantee. clear_sampled means no material issue found at inspected timestamps. Intentional effects, continuous occlusion and offscreen exits are distinguished from unexplained disappearance.',
 'supersedes':'Earlier character/motion-focused editorial review for prop-continuity decisions.',
 'status':'inspection_complete_regeneration_not_started','publishing_enabled':False,
 'counts':counts,'hold_count':20,'drive_folder':manifest['drive_folder'],'episodes':rows}
(ROOT/'continuity-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
with (ROOT/'continuity-audit.csv').open('w',encoding='utf-8-sig',newline='') as f:
    fields=['id','title','label','publication_hold','priority','confidence','times','note','repair','drive_url','source_video_sha256']
    w=csv.DictWriter(f,fieldnames=fields,extrasaction='ignore');w.writeheader();w.writerows(rows)
held=sorted([r for r in rows if r['publication_hold']],key=lambda r:(r['status']!='remake',r.get('priority','P3'),r['id']))
common="""재제작 공통 기준
- 승인된 기존 이미지를 그대로 사용한다.
- 시작 전에 주요 소품의 수·색·형태·연결 구조를 목록으로 고정한다.
- 한 장면에서 주요 사건은 하나, 소울의 반응은 짧은 이동·기울기·홉으로 표현한다.
- 화면 밖 이동·가림 없이 물체가 사라지거나 새로 생기지 않게 한다.
- 떨어진 물체와 잔여물은 이후 프레임에도 남긴다.
- 실제 원인→이동→접촉→결과를 한 화면에서 이어 보여준다.
- 소울 모양, 표면 무늬, 소품의 부품 수, 배경 배치 유지. 새 얼굴·팔다리·손 금지.
- 조용히 끝내기. 마지막 프레임을 처음과 억지로 같게 만들기 위한 순간 리셋 금지.
- 재생성 후 원본과 시작·중간·끝 및 사건 전후를 비교한다. 의심 구간은 프레임 단위로 재검토한다.
- 고정 카메라에서도 해결되지 않으면 이동 거리와 소품 상호작용부터 줄인다. 프롬프트만으로 완전한 일관성을 보장할 수는 없다.
"""
brief="SOULI / 소품·배경 연속성 재검수 / 2026-10-03\n\n80편: 재제작 권고 17 / 추가 확인 3 / 샘플상 중대 오류 미발견 60\n재제작·추가 확인 20편은 게시 보류 권고. 영상 파일은 수정하지 않았으며 재생성은 아직 시작하지 않았음.\n\n"+common
for r in held:
    brief+=f"\n#{r['id']} {r['title']} | {r['label']} | {r.get('priority','')} | {r['times']}초\n관찰: {r['note']}\n수정: {r['repair']}\n영상: {r['drive_url']}\n"
brief+="\n검수 범위와 한계\n"+report['method']+"\n"+report['limitation']+"\n"
(ROOT/'repair-brief.txt').write_text(brief,encoding='utf-8')
esc=html.escape
CSS="""*{box-sizing:border-box}body{margin:0;background:#f4f3ee;color:#1e2928;font:15px/1.6 system-ui,sans-serif}main{max-width:1380px;margin:auto;padding:40px 28px}a{color:#215b89}h1{font-size:clamp(30px,4vw,52px);line-height:1.15;margin:12px 0 20px;letter-spacing:-.035em}.eyebrow{font-size:12px;font-weight:800;letter-spacing:.16em;color:#56716b}.lede{max-width:860px;color:#5a6661}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:28px 0}.stat{padding:20px 24px;background:white;border:1px solid #dcded5;border-radius:14px}.stat b{font-size:36px;display:block;line-height:1.2}.stat span{font-size:13px}.remake{--accent:#a53328;--tint:#fbeae5}.watch{--accent:#89630e;--tint:#fcf3cf}.clear_sampled{--accent:#1c6c52;--tint:#e5f4e8}.stat b,.badge{color:var(--accent)}.toolbar{position:sticky;top:0;z-index:3;background:#f4f3eef5;padding:12px 0;display:flex;align-items:center;flex-wrap:wrap;gap:8px;border-bottom:1px solid #d4d9cd;margin:28px 0}button,input{font:inherit}button,.linkbtn{border:1px solid #c7cec3;padding:9px 13px;background:white;border-radius:8px;cursor:pointer;color:#253f35;text-decoration:none}button[aria-pressed=true]{background:#253f35;color:white;border-color:#253f35}input{padding:10px 14px;border:1px solid #c7cec3;border-radius:8px;background:white;min-width:210px;flex:1}#resultcount{font-size:13px;color:#5d6b63}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}article{border-radius:14px;background:white;border:1px solid #d7ddd3;overflow:hidden;box-shadow:0 5px 12px #293e2906}article>img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}.cardbody{padding:19px}.badge{font-size:12px;background:var(--tint);padding:5px 9px;border-radius:5px;font-weight:700}h2{font-size:19px;line-height:1.4;margin:14px 0 8px}.time{font-size:12px;color:#68766d}article p{font-size:14px;line-height:1.7;margin:12px 0}.repair{border-left:2px solid #ccd7c8;padding-left:10px;color:#536452}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:17px}.actions button,.actions a{font-size:12px}details{margin:18px 0;font-size:13px;color:#5d6d64}summary{cursor:pointer}nav{display:flex;flex-wrap:wrap;gap:20px;font-size:13px}footer{margin-top:36px;border-top:1px solid #d4d9cd;padding-top:20px;color:#60716a;font-size:13px}dialog{width:min(1200px,96vw);max-height:95vh;border:0;border-radius:14px;padding:24px;background:#f7f7f2;color:#22342a}dialog::backdrop{background:#09221bc9}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pair img,.pair video{width:100%;aspect-ratio:16/9;object-fit:contain;background:#e9ece2}.pair small{display:block;margin-bottom:5px}#close{float:right}#modalTitle{margin-top:0;padding-right:65px}#modalNote{margin-top:16px}#timeline{display:flex;gap:8px;flex-wrap:wrap;margin:15px 0}[hidden]{display:none!important}@media(max-width:1000px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){main{padding:25px 15px}.grid,.pair{grid-template-columns:1fr}.stat{padding:14px}.stat b{font-size:30px}.stat span{font-size:11px}.stats{gap:7px}.toolbar{position:static}}"""
def poster_uri(r):
    im=Image.open(BASE/lookup[r['id']]['poster_file']).convert('RGB')
    im.thumbnail((480,270));b=io.BytesIO();im.save(b,format='JPEG',quality=70)
    return 'data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode()
def make_html(cloud=False):
    cards=[]
    for r in sorted(rows,key=lambda r:({'remake':0,'watch':1,'clear_sampled':2}[r['status']],r.get('priority') or 'P3',r['id'])):
        actions=(f'<a class="linkbtn" target="_blank" rel="noopener" href="{esc(r["drive_url"])}">Drive 영상 열기</a>' if cloud else f'<button data-play="{r["id"]}">영상 · {r["seek"]:g}초부터</button>')
        if r['evidence']:actions+=f'<a class="linkbtn" target="_blank" href="{r["evidence"]}">원본 + 문제 구간</a>'
        elif not cloud:actions+=f'<a class="linkbtn" target="_blank" href="{r["overview"]}">전체 샘플</a>'
        repair=f'<p class="repair">수정 방향 · {esc(r["repair"])}</p>' if r.get('repair') else ''
        cards.append(f'''<article id="episode-{r['id']}" class="{r['status']}" data-status="{r['status']}" data-search="{esc(r['id']+' '+r['title']+' '+r['note'])}">
<img loading="lazy" src="{poster_uri(r) if cloud else esc(r['poster'])}" alt="{esc(r['title'])}">
<div class="cardbody"><span class="badge">{r['label']}</span><h2>{r['id']} · {esc(r['title'])}</h2>
<div class="time">{esc(r['times'])}초 · {'게시 보류 권고' if r['publication_hold'] else '확인한 시점 기준'}</div>
<p>{esc(r['note'])}</p>{repair}<div class="actions">{actions}</div></div></article>''')
    method="80편 모두 시작·중간·끝을 포함한 16시점을 확인했습니다. 의심된 26편은 원본 이미지와 추가 15시점씩을 대조했습니다. 모든 프레임을 확인한 무결함 보증은 아니며, 화면 밖 이동·가림·의도한 효과는 별도로 구분했습니다."
    head=f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SOULI · 소품 연속성 검수 80편</title><style>{CSS}</style></head><body><main>
<header><div class="eyebrow">SOULI / CONTINUITY REVIEW / 2026.10.03</div><h1>움직여도, 같은 세계.</h1><p class="lede">캐릭터와 함께 소품의 개수·형태·이동 경로, 배경의 연결을 다시 확인했습니다. <b>20편은 게시 보류 권고</b>입니다. 아래 판정은 이전 캐릭터 중심 검수를 보완하며, 영상 재생성은 아직 진행하지 않았습니다.</p>
<div class="stats"><div class="stat remake"><b>17</b><span>재제작 권고</span></div><div class="stat watch"><b>3</b><span>추가 확인</span></div><div class="stat clear_sampled"><b>60</b><span>샘플상 중대 오류 미발견</span></div></div>
<nav><a href="continuity-audit.csv" download>80편 검수표 CSV</a><a href="repair-brief.txt">수정 지시서</a><a target="_blank" rel="noopener" href="{manifest['drive_folder']}">기존 영상 Drive</a>{'' if cloud else '<a href="../gallery.html">전체 영상 갤러리</a>'}</nav>
<details><summary>검수 방법과 판정 기준</summary><p>{method}</p><p>재제작 권고: 확인한 형태 교체·복제·소실·원인/결과 단절 또는 불필요한 외부 물체. 추가 확인: 의도한 연출과 오류의 경계가 모호한 장면. 샘플상 중대 오류 미발견: 검사한 시점에서는 큰 연속성 오류가 보이지 않음.</p><p>원본 영상 80개의 SHA-256을 대조했습니다. Drive에 이미 저장된 영상은 동일한 파일이며 이 보고서로 교체되거나 수정되지 않았습니다.</p></details></header>
<div class="toolbar" role="group" aria-label="검수 필터"><button data-filter="held" aria-pressed="true">보류 20</button><button data-filter="remake" aria-pressed="false">재제작 17</button><button data-filter="watch" aria-pressed="false">추가 확인 3</button><button data-filter="clear_sampled" aria-pressed="false">중대 오류 미발견 60</button><button data-filter="all" aria-pressed="false">전체 80</button><input id="search" aria-label="번호 제목 오류 검색" placeholder="번호 · 제목 · 오류 검색"><span id="resultcount"></span></div>
<div class="grid">{''.join(cards)}</div><footer>{method}<br>현재 상태: 검수 완료 · 재생성 전 · 게시/예약 안 함. 승인된 원본 이미지는 유지합니다.</footer></main>'''
    modal='''<dialog id="player"><button id="close" aria-label="닫기">닫기</button><h2 id="modalTitle"></h2><div class="pair"><div><small>승인된 원본 이미지</small><img id="reference" alt="승인된 원본 이미지"></div><div><small>현재 선택된 영상 · 소리 없음</small><video id="video" controls muted playsinline preload="metadata"></video></div></div><div id="timeline"></div><p id="modalNote"></p><p id="modalRepair"></p><a id="modalEvidence" target="_blank">검수 이미지</a> · <a id="modalDrive" target="_blank" rel="noopener">Drive 영상</a></dialog>'''
    data=json.dumps(rows,ensure_ascii=False).replace('<','\\u003c')
    js="""const rows=DATA;let filter='held';const cards=[...document.querySelectorAll('article')];function apply(){const q=document.querySelector('#search').value.toLowerCase().trim();let n=0;for(const c of cards){const ok=(filter==='all'||(filter==='held'?c.dataset.status!=='clear_sampled':c.dataset.status===filter))&&c.dataset.search.toLowerCase().includes(q);c.hidden=!ok;if(ok)n++}document.querySelector('#resultcount').textContent=n+'편'}document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));apply()});document.querySelector('#search').oninput=apply;apply();
const dialog=document.querySelector('#player');if(dialog){const video=document.querySelector('#video');document.querySelector('#close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>video.pause());document.querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>{const r=rows.find(r=>r.id===b.dataset.play);document.querySelector('#modalTitle').textContent=r.id+' · '+r.title;document.querySelector('#reference').src=r.reference;video.src=r.video;video.poster=r.poster;video.onloadedmetadata=()=>{video.currentTime=r.seek;video.play().catch(()=>{})};document.querySelector('#modalNote').textContent=r.note;document.querySelector('#modalRepair').textContent=r.repair?'수정 방향 · '+r.repair:'';document.querySelector('#modalEvidence').href=r.evidence||r.overview;document.querySelector('#modalDrive').href=r.drive_url;const timeline=document.querySelector('#timeline');timeline.replaceChildren();for(const [label,t] of [['처음부터',0],['문제 구간',r.seek],['끝 장면',7]]){const btn=document.createElement('button');btn.textContent=label+' '+t+'s';btn.onclick=()=>{video.currentTime=t;video.play().catch(()=>{})};timeline.append(btn)}const slow=document.createElement('button');slow.textContent='0.5×';slow.onclick=()=>{video.playbackRate=video.playbackRate===.5?1:.5;slow.textContent=video.playbackRate+'×'};timeline.append(slow);video.playbackRate=1;dialog.showModal()})}"""
    return head+('' if cloud else modal)+'<script>'+js.replace('DATA',data)+'</script></body></html>'
(ROOT/'index.html').write_text(make_html(),encoding='utf-8')
(ROOT/'drive-review.html').write_text(make_html(True),encoding='utf-8')
# Add notices and per-card hold badges to the current gallery. Preserve original files.
gallery=BASE/'gallery.html'
backup=ROOT/'gallery-before-continuity-audit.html'
if not backup.exists():backup.write_bytes(gallery.read_bytes())
g=backup.read_text(encoding='utf-8-sig')
notice='<aside id="continuity-audit-notice" style="padding:18px 22px;background:#fff1d9;color:#58320d;border-radius:12px;margin:20px 0"><b>소품 연속성 재검수: 17편 재제작 · 3편 추가 확인 · 20편 게시 보류 권고</b><br>2026-10-03 기준. 기존 파일은 재생성 전입니다. <a style="color:#6e3905;text-decoration:underline" href="continuity-audit/index.html">문제 시점·원본 비교·전체 80편 판정 보기 →</a></aside>'
g=g.replace('<header>','<header>'+notice,1)
for r in rows:
    if r['publication_hold']:
        pattern=r'(<article data-search="'+re.escape(r['id'])+r' [^"]*">)'
        badge='<div style="padding:9px 14px;background:#653321;color:#ffe9ca;font-size:12px">'+r['label']+' · 게시 보류 권고</div>'
        g,n=re.subn(pattern,lambda m:m.group(1)+badge,g,count=1)
        assert n==1,r['id']
g=g.replace('생성 영상 특성상 소품·질감·가려졌던 부분의 작은 차이가 남을 수 있습니다.','소품 연속성은 상단의 2026-10-03 재검수 보고서가 우선합니다.')
gallery.write_text(g,encoding='utf-8')
old=PACK/'index.html'
oldbackup=ROOT/'library-before-continuity-audit.html'
if old.exists():
    if not oldbackup.exists():oldbackup.write_bytes(old.read_bytes())
    oldtext=oldbackup.read_text(encoding='utf-8-sig')
    oldnotice=notice.replace('continuity-audit/index.html','motion-v2-20261003/continuity-audit/index.html')
    if '<body>' in oldtext:oldtext=oldtext.replace('<body>','<body>'+oldnotice,1)
    else:oldtext=oldtext.replace('<main>','<main>'+oldnotice,1)
    old.write_text(oldtext,encoding='utf-8')
# Add explicit, additive hold fields to the current delivery manifest.
mb=ROOT/'delivery-manifest-before-continuity-audit.json'
if not mb.exists():mb.write_bytes((BASE/'delivery-manifest.json').read_bytes())
manifest['continuity_audit']={'report':'continuity-audit/continuity-audit.json','counts':counts,'supersedes_prior_prop_review':True,'regenerated':False}
for e in manifest['episodes']:
    r=next(r for r in rows if r['id']==e['id'])
    e['continuity_status']=r['status'];e['publication_hold']=r['publication_hold']
(BASE/'delivery-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
# Portable evidence pack: HTML thumbnails embedded, clips link to their Drive file.
readme="""SOULI continuity audit / 2026-10-03
Open drive-review.html after extracting this archive. The HTML includes all 80 decisions and opens existing videos on Drive.
The 26 episode-XX-event.jpg files compare approved references with dense event samples.
17 remake recommendations + 3 watch items = 20 publication holds.
No video has been regenerated or replaced by this audit.
The old video ZIP and existing Drive video files remain unchanged. Use the new CSV/JSON hold fields before choosing videos to publish.
"""
(ROOT/'READ-ME.txt').write_text(readme,encoding='utf-8')
with zipfile.ZipFile(ROOT/'souli-continuity-audit-20261003.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name in ['drive-review.html','continuity-audit.json','continuity-audit.csv','repair-brief.txt','READ-ME.txt']:
        z.write(ROOT/name,name)
    for p in sorted(ROOT.glob('episode-*-event.jpg')):z.write(p,p.name)
summary={'counts':counts,'hold_ids':[r['id'] for r in rows if r['publication_hold']],
 'all_source_hashes_match':True,'event_sheets':len(events),'report_html':str(ROOT/'index.html'),
 'evidence_zip_bytes':(ROOT/'souli-continuity-audit-20261003.zip').stat().st_size}
(ROOT/'build-validation.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=True))

