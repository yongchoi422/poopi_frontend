from pathlib import Path
import json, hashlib, csv, html, zipfile

p=Path(__file__).resolve().parent
pack=p.parent
read=lambda f:json.loads(f.read_text(encoding='utf-8'))
selected=read(p/'selection.json')
ids={f'{n:02}' for n in range(1,81)}
assert {x['id'] for x in selected}==ids and len(selected)==80
validation=read(p/'validation.json')
old={x['id']:x for x in read(pack/'episodes.json')['episodes']}
submitted=read(p/'submitted.json')
drive={}
for f in p.glob('drive-delivery*.json'):
    for row in read(f):
        assert row['status']=='fulfilled', (f,row)
        d=row['value'];drive[d['episode']]=d
assert set(drive)==ids, sorted(ids-set(drive))
folder='1zeTkihPmdrMOS7067d7vDbQzZWuO207F'
episodes=[]
for e in sorted(selected,key=lambda x:x['id']):
    n=e['id'];v=p/'final'/f'episode-{n}.mp4';info=validation[n];d=drive[n]
    assert info['full_decode']=='passed'
    assert '1280x720' in info['ffmpeg_report'] and '00:00:08.00' in info['ffmpeg_report']
    assert info['bytes']==v.stat().st_size==int(d['size'])
    assert hashlib.sha256(v.read_bytes()).hexdigest()==info['output_sha256']
    assert d['mime_type']=='video/mp4' and folder in d['parent_ids']
    assert d['title']==f'souli-motion-v2-{n}.mp4'
    assert hashlib.sha256((pack/f'episode-{n}.mp4').read_bytes()).hexdigest()!=info['output_sha256']
    revision=Path(e['source']).parts[0] if '/' in e['source'] else 'r1'
    attempt=[x for x in submitted if x['id']==n and x.get('revision','r1')==revision][-1]
    assert attempt['keyframe']==f'episode-{n}-keyframe.png'
    episodes.append({'id':n,'title_ko':old[n]['title_ko'],'caption_draft':old[n]['caption'],'trigger':old[n]['trigger'],
        'video_file':f'final/episode-{n}.mp4','poster_file':f'final/episode-{n}-poster.jpg',
        'approved_keyframe':f'../episode-{n}-keyframe.png','approved_keyframe_sha256':hashlib.sha256((pack/f'episode-{n}-keyframe.png').read_bytes()).hexdigest(),
        'selected_master':e['source'],'observed_result':e['observed'],'actual_generation_prompt':attempt['prompt'],
        'bytes':info['bytes'],'sha256':info['output_sha256'],'drive_url':d['url'],'status':'reviewed_not_published'})
manifest={'version':'motion-v2-20261003','count':80,'status':'prepared_reviewed_not_published','publishing_enabled':False,
    'format':'16:9 1280x720 H.264 MP4; 8 seconds; muted; faststart','source':'Google Flow Omni 1.1 Flash image-to-video using the existing approved images',
    'review_method':'Visual comparison at 16 timestamps per candidate; rejected identity changes regenerated; selected files fully decoded with FFmpeg.',
    'review_limit':'This is sampled visual review, not a guarantee of pixel-identical geometry. Minor generated prop, texture, and previously occluded-area differences can remain.',
    'drive_folder':f'https://drive.google.com/drive/folders/{folder}','episodes':episodes}
(p/'delivery-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
with (p/'captions.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=['id','title_ko','caption_draft','trigger','video_file','drive_url','observed_result']);w.writeheader()
    for e in episodes:w.writerow({k:e[k] for k in w.fieldnames})
handoff=f'''SOULI MOTION V2 — 80 reviewed clips / 2026-10-03

Final videos: {p / 'final'}
Library: {p / 'gallery.html'}
Before / after comparison: {p / 'index.html'}
Manifest: {p / 'delivery-manifest.json'}
Drive: https://drive.google.com/drive/folders/{folder}

Use only final/episode-NN.mp4 for the new version. Source masters and rejected generations are kept separately for traceability. Existing approved keyframes and the old videos remain in their original locations.
Files are native 720p from Flow, 16:9, 8 seconds, H.264, muted, faststart. They are not native 1080p exports.

Website integration: copy chosen MP4 and matching poster into the website's static asset storage or CDN; use those deployed asset URLs, not the local Windows paths or Google Drive viewer URLs. Use video muted playsinline autoplay loop for a hero, a poster fallback, and respect prefers-reduced-motion. Show one clip at a time; do not autoplay the entire 80-video library. A mobile hero may need contain or a separately reviewed crop. This delivery does not change or deploy the website.

Marketing: captions.csv contains the previous English caption drafts and situation tags, alongside the actual observed action of each new clip. These remain drafts; no posts have been published or scheduled.

Review: each candidate was compared at 16 timestamps (0, 0.5, ... 7, 7.95 seconds). Clear face replacements, humanoid transformations, and duplicate characters were rejected and regenerated. All final files passed a full decode. Minor prop, texture, or previously hidden-area differences can remain.
'''
(p/'website-handoff.txt').write_text(handoff,encoding='utf-8')
cards=[]
for e in episodes:
    n=e['id'];title=html.escape(e['title_ko']);caption=html.escape(e['caption_draft']);note=html.escape(e['observed_result'])
    cards.append(f'<article data-search="{html.escape(n+" "+e["title_ko"]+" "+e["trigger"]+" "+e["caption_draft"],quote=True)}"><video controls muted playsinline preload="none" poster="{e["poster_file"]}" src="{e["video_file"]}"></video><div class="body"><span class="tag">{n} · {html.escape(e["trigger"])}</span><h2>{title}</h2><p class="caption">{caption}</p><details><summary>검수 메모</summary><p>{note}</p></details><nav><a download href="{e["video_file"]}">MP4 저장</a><a href="{e["drive_url"]}" target="_blank" rel="noopener">Drive</a></nav></div></article>')
    
page='''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SOULI · 80 Moving Moments</title><style>*{box-sizing:border-box}body{margin:0;background:#10131c;color:#f4f5fb;font:15px/1.65 system-ui,sans-serif}main{max-width:1440px;margin:auto;padding:44px 28px}header{margin-bottom:34px}.eyebrow{color:#9cd0ff;letter-spacing:.15em;font-size:12px}h1{font-size:clamp(36px,5vw,62px);line-height:1.12;margin:15px 0}header p{color:#bbc3d5;max-width:780px}a{color:#9dceff;text-decoration:none}a:hover{text-decoration:underline}.links{display:flex;gap:20px;flex-wrap:wrap;margin:20px 0}.stats{color:#a8ecc2}.filter{display:flex;gap:20px;align-items:center;margin:24px 0}input{width:min(580px,100%);border:1px solid #45516c;border-radius:10px;padding:13px 16px;background:#1c2334;color:white;font:inherit}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}article{background:#1a2030;border:1px solid #303a50;border-radius:15px;overflow:hidden}video{display:block;width:100%;aspect-ratio:16/9;background:#000}.body{padding:18px}.tag{font-size:11px;color:#98a9c5}h2{font-size:18px;line-height:1.4;margin:6px 0}.caption{color:#c4d1e8;min-height:25px}details{color:#9caecb;font-size:13px}nav{display:flex;gap:20px;margin-top:16px;font-size:13px}[hidden]{display:none}footer{margin-top:36px;color:#97a4bb;font-size:12px}@media(max-width:1000px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){main{padding:28px 16px}.grid{grid-template-columns:1fr}}</style><main><header><div class="eyebrow">SOULI · MOTION V2 · OCT 2026</div><h1>같은 소울,<br>더 살아 있는 움직임.</h1><p>기존 원화 80장을 그대로 사용한 움직임 개선본. 소울이 직접 다가가고, 점프하고, 기울어지며 상황에 반응합니다.</p><div class="stats">80편 검수 · 16:9 · 8초 · 720p · 게시 전 준비본</div><nav class="links"><a href="index.html">이전 영상과 비교</a><a href="https://drive.google.com/drive/folders/'''+folder+'''" target="_blank" rel="noopener">Google Drive 완성 폴더</a><a href="captions.csv" download>캡션 CSV</a><a href="website-handoff.txt">웹 개발 전달 메모</a></nav></header><label class="filter"><input id="search" type="search" placeholder="번호 · 제목 · gm · trigger 검색" aria-label="영상 검색"><span id="count">80편</span></label><div class="grid">'''+''.join(cards)+'''</div><footer>검수는 각 후보의 16개 시점 비교 및 완성 파일 전체 디코딩으로 진행했습니다. 생성 영상 특성상 소품·질감·가려졌던 부분의 작은 차이가 남을 수 있습니다. 캡션은 초안이며 게시·예약하지 않았습니다.</footer></main><script>const s=document.querySelector('#search');const cards=[...document.querySelectorAll('article')];s.addEventListener('input',()=>{const q=s.value.toLowerCase().trim();let n=0;cards.forEach(c=>{c.hidden=!c.dataset.search.toLowerCase().includes(q);if(!c.hidden)n++;else c.querySelector('video').pause()});document.querySelector('#count').textContent=n+'편'});document.addEventListener('play',e=>{if(e.target.tagName==='VIDEO')document.querySelectorAll('video').forEach(v=>{if(v!==e.target)v.pause()})},true);</script></html>'''
(p/'gallery.html').write_text(page,encoding='utf-8')
comparison=(p/'index.html').read_text(encoding='utf-8').replace('현재 검수·파일 확인 통과 80 / 80편 · 제작 진행 중','검수·파일 확인 완료 80 / 80편 · 게시 전 준비본')
if 'href="gallery.html"' not in comparison:
    comparison=comparison.replace('<header>','<header><a href="gallery.html">새 영상 80편 모아보기</a> · ',1)
(p/'index.html').write_text(comparison,encoding='utf-8')
old_index=pack/'index.html'
old_html=old_index.read_text(encoding='utf-8')
if 'motion-v2-20261003/gallery.html' not in old_html:
    (p/'original-library-index.html').write_text(old_html,encoding='utf-8')
    notice='<aside style="background:#142d25;color:#e8ffd8;padding:16px 5vw;font:600 16px/1.5 system-ui"><a style="color:inherit" href="motion-v2-20261003/gallery.html">새 움직임 개선본 80편이 완성됐어요 → 검수본 보기</a></aside>'
    old_index.write_text(old_html.replace('<body>','<body>'+notice,1),encoding='utf-8')
rejected=read(p/'rejected-candidates.json')
(p/'editorial-review.json').write_text(json.dumps({'method':manifest['review_method'],'limit':manifest['review_limit'],'selected':selected,'rejected':rejected},ensure_ascii=False,indent=2),encoding='utf-8')
plan=read(p/'production-plan.json')
plan['status']='completed_reviewed_not_published'
for row in plan['episodes']:
    chosen=next(e for e in episodes if e['id']==row['id'])
    row['status']='reviewed_not_published'
    row['selected_master']=chosen['selected_master']
    row['actual_generation_prompt']=chosen['actual_generation_prompt']
(p/'production-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2),encoding='utf-8')
zip_path=p/'souli-motion-v2-80-clips.zip'
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_STORED) as z:
    for f in (p/'final').glob('*'):z.write(f,f.relative_to(p))
    z.writestr('gallery.html',page.replace('<a href="index.html">이전 영상과 비교</a>',''))
    for name in ['captions.csv','website-handoff.txt','delivery-manifest.json']:
        z.write(p/name,name)
report={'status':'completed','approved_images_reused':80,'new_selected_videos':80,'drive_files_verified':80,'all_selected_files_fully_decoded':True,
    'total_video_bytes':sum(e['bytes'] for e in episodes),'bundle':str(zip_path),'bundle_bytes':zip_path.stat().st_size,
    'review_method':manifest['review_method'],'review_limit':manifest['review_limit'],'drive_folder':manifest['drive_folder'],'published':False}
(p/'completion-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=True))
