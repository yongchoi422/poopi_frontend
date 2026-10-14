from pathlib import Path
import json,shutil,hashlib,re,csv,html,zipfile
ROOT=Path(__file__).resolve().parent
BASE=ROOT.parent
PACK=BASE.parent
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf-8')
review=read(ROOT/'review-results.json')
selected={e['id']:e for e in review['selected']}
assert len(selected)==20
uploaded={e['episode_id']:e for e in read(ROOT/'drive-map.json')}
checks={e['id']:e for e in read(ROOT/'release-validation.json')}
verified={x['value']['id']:x['value']['data']['structuredContent'] for x in read(ROOT/'drive-verified.json') if x['status']=='fulfilled' and not x['value']['data'].get('isError')}
assert set(selected)==set(uploaded)==set(verified)==set(checks)
for ep in selected:
 assert int(verified[ep]['size'])==checks[ep]['bytes']
 assert review['drive_folder']['id'] in verified[ep]['parent_ids']
archive=ROOT/'prior-selected';archive.mkdir(exist_ok=True)
for name in ['delivery-manifest.json','gallery.html','selection.json','validation.json','captions.csv','website-handoff.txt','index.html']:
 src=BASE/name
 if src.exists() and not (archive/name).exists():shutil.copy2(src,archive/name)
manifest=read(archive/'delivery-manifest.json')
old_selection=read(archive/'selection.json')
old_validation=read(archive/'validation.json')
prompt1={e['id']:e['prompt'] for e in read(ROOT/'production-plan.json')['episodes']}
prompt2={e['id']:e['prompt'] for e in read(ROOT/'plan-r2.json')['episodes']}
for e in manifest['episodes']:
 ep=e['id']
 if ep not in selected:continue
 s=selected[ep]
 for suffix in ['.mp4','-poster.jpg']:
  name=f'episode-{ep}{suffix}'
  if not (archive/name).exists():shutil.copy2(BASE/'final'/name,archive/name)
  shutil.copy2(ROOT/'release'/name,BASE/'final'/name)
 assert hashlib.sha256((BASE/'final'/f'episode-{ep}.mp4').read_bytes()).hexdigest()==checks[ep]['sha256']
 e['previous_selection']={k:e.get(k) for k in ['selected_master','sha256','bytes','drive_url','observed_result','actual_generation_prompt','continuity_status']}
 e.update(selected_master='continuity-repair/'+s['master'],observed_result=s['note'],bytes=checks[ep]['bytes'],sha256=checks[ep]['sha256'],drive_url=uploaded[ep]['url'],continuity_status='repaired_clear_sampled',publication_hold=False)
 e['actual_generation_prompt']=prompt1[ep] if s['attempt']==1 else prompt2[ep] if s['attempt']==2 else read(ROOT/s['master'].replace('-master.mp4','-source.json'))['actual_prompt']
 e['continuity_repair']={'attempt_selected':s['attempt'],'review':'continuity-repair/index.html#episode-'+ep,'samples':32,'source_changed':False}
 e['status']='reviewed_not_published'
 if ep=='74':e.update(title_ko='기차 출발 대기',caption_draft='any minute now, fren.',trigger='기다림 / 느린 하루')
 if ep=='36':e.update(title_ko='모래성 경계 근무',caption_draft='built it. now watching the tide.',trigger='만든 뒤의 긴장')
 if ep=='77':e.update(title_ko='케첩 앞에서 고민',caption_draft='overthinking the dip.',trigger='사소한 고민')
 for item in old_selection:
  if item['id']==ep:item.update(source=e['selected_master'],observed=e['observed_result'],status='accepted',continuity_status=e['continuity_status'])
 old_validation[ep]={**checks[ep],'continuity_repair':True}
manifest.update(version='motion-v2-continuity-fixed-20261003',status='reviewed_not_published',publishing_enabled=False)
manifest['continuity_audit_history']=manifest.pop('continuity_audit',None)
manifest['continuity_repair']={'date':'2026-10-03','replaced':20,'generation_candidates':29,'unmodified':60,'report':'continuity-repair/index.html','drive_folder':review['drive_folder']['url'],'review_method':review['visual_review_method'],'review_limit':review['limit']}
manifest['review_limit']=review['limit']
manifest['current_download_bundle']='souli-motion-v2-continuity-fixed-80-clips.zip'
write(BASE/'delivery-manifest.json',manifest)
write(BASE/'selection.json',old_selection)
write(BASE/'validation.json',old_validation)
write(ROOT/'selected-final.json',list(selected.values()))
folder=review['drive_folder']['url']
esc=lambda s:html.escape(str(s),quote=True)
gallery=(archive/'gallery.html').read_text(encoding='utf-8')
gallery=re.sub(r'<aside id="continuity-audit-notice".*?</aside>','',gallery,flags=re.S)
notice=f'<aside id="continuity-repair-notice" style="padding:18px 22px;background:#dcefe4;color:#173d2c;border-radius:12px;margin:20px 0"><b>20편 재생성·재검수 완료</b><br>2026-10-03 · 29개 후보에서 교체본 20편 선정. <a style="color:#174c3a;text-decoration:underline" href="continuity-repair/index.html">수정 전후 비교 →</a> · <a style="color:#174c3a" href="{folder}">교체본 Drive</a></aside>'
gallery=gallery.replace('<header>','<header>'+notice,1)
def update_card(m):
 card=m.group(0);mt=re.search(r'data-search="(\d\d) ',card)
 if not mt or mt[1] not in selected:return card
 ep=mt[1];e=next(x for x in manifest['episodes'] if x['id']==ep)
 card=re.sub(r'<div style="padding:9px 14px;.*?</div>','',card,count=1,flags=re.S)
 card=card.replace('<video ',f'<div style="padding:8px 14px;background:#214d40;color:#bdffe1;font-size:12px">연속성 수정본 · {selected[ep]["attempt"]}차 후보 채택</div><video ',1)
 card=re.sub(r'<h2>.*?</h2>',f'<h2>{esc(e["title_ko"])}</h2>',card)
 card=re.sub(r'<p class="caption">.*?</p>',f'<p class="caption">{esc(e["caption_draft"])}</p>',card)
 card=re.sub(r'<details>.*?</details>',f'<details><summary>검수 메모</summary><p>{esc(e["observed_result"])}</p><a href="continuity-repair/index.html#episode-{ep}">수정 전후 보기</a></details>',card,flags=re.S)
 card=re.sub(r'href="https://drive.google.com/file/[^"]+"',f'href="{esc(e["drive_url"])}"',card)
 card=card.replace(f'src="final/episode-{ep}.mp4"',f'src="final/episode-{ep}.mp4?v=continuity-fixed"')
 card=re.sub(r'data-search="[^"]+"',f'data-search="{esc(ep+" "+e["title_ko"]+" "+e["trigger"]+" "+e["caption_draft"])}"',card,count=1)
 return card
gallery=re.sub(r'<article\b.*?</article>',update_card,gallery,flags=re.S)
gallery=re.sub(r'<footer>.*?</footer>',f'<footer>2026-10-03: 기존 80편 중 보류한 20편을 새 영상으로 교체했습니다. 새 후보는 0.25초 간격 32개 시점 비교와 전체 디코딩으로 확인했고, 일부 의심 구간은 24fps 연속 프레임을 추가 확인했습니다. 나머지 60편은 이전 검수본입니다. 캡션은 초안이며 게시·예약하지 않았습니다.</footer>',gallery,flags=re.S)
gallery=gallery.replace('<nav class="links">','<nav class="links"><a href="souli-motion-v2-continuity-fixed-80-clips.zip" download>현재 80편 ZIP</a>',1)
(BASE/'gallery.html').write_text(gallery,encoding='utf-8')
# Historical audit keeps showing the actual old clips that its comments concern.
audit=BASE/'continuity-audit'/'index.html'
text=audit.read_text(encoding='utf-8')
for ep in selected:
 for suffix in ['.mp4','-poster.jpg']:
  text=text.replace(f'../final/episode-{ep}{suffix}',f'../continuity-repair/prior-selected/episode-{ep}{suffix}')
if 'id="resolved-notice"' not in text:
 text=text.replace('<body>','<body><aside id="resolved-notice" style="padding:20px;background:#dcefe4;color:#163c2b"><b>이 페이지는 교체 전 영상의 감사 기록입니다.</b> 20편은 새 영상으로 수정되었습니다. <a href="../continuity-repair/index.html">수정본 보기 →</a></aside>',1)
 if 'id="resolved-notice"' not in text:text=text.replace('<main>','<main><aside id="resolved-notice">이전 영상 감사 기록 · <a href="../continuity-repair/index.html">20편 수정 완료본 보기</a></aside>',1)
audit.write_text(text,encoding='utf-8')
for target,prefix in [(BASE/'index.html',''),(PACK/'index.html','motion-v2-20261003/')]:
 if target.exists():
  content=target.read_text(encoding='utf-8')
  content=re.sub(r'<aside id="continuity-audit-notice".*?</aside>','',content,flags=re.S)
  if 'id="continuity-repair-banner"' not in content:
   banner=f'<aside id="continuity-repair-banner" style="padding:18px;background:#dcefe4;color:#173d2c">20편 연속성 수정 완료 · <a href="{prefix}continuity-repair/index.html">교체본 확인</a> · <a href="{prefix}gallery.html">현재 80편 갤러리</a></aside>'
   content=content.replace('<main>','<main>'+banner,1) if '<main>' in content else content.replace('<body>','<body>'+banner,1)
  target.write_text(content,encoding='utf-8')
# Captions refer to the current cut and current Drive URLs.
with (BASE/'captions.csv').open('w',newline='',encoding='utf-8-sig') as f:
 writer=csv.DictWriter(f,fieldnames=['id','title_ko','trigger','caption_draft','video_file','drive_url','continuity_status'])
 writer.writeheader()
 for e in manifest['episodes']:writer.writerow({k:e.get(k,'') for k in writer.fieldnames})
handoff=BASE/'website-handoff.txt'
handoff.write_text('SOULI 영상 현재 전달본 — 2026-10-03 연속성 수정\n\n현재 파일: final/episode-NN.mp4, final/episode-NN-poster.jpg\n80편 중 20편을 교체했습니다. 경로는 동일하므로 배포 시 CDN/브라우저 캐시를 갱신하세요.\n권장 영상 URL: /marketing/episode-NN.mp4?v=continuity-fixed-20261003\nH.264 MP4, 1280×720, 24fps, 8초, 오디오 제거, faststart.\n웹 개발 소스는 이 작업에서 수정하지 않았습니다. 파일을 웹 저장소 public 경로로 복사해서 사용하세요.\n메인 배너: autoplay muted loop playsInline, object-fit:cover, poster 지정. 한 번에 영상 하나만 로드하고 prefers-reduced-motion에서는 poster만 표시하세요.\n전체 ZIP: souli-motion-v2-continuity-fixed-80-clips.zip\n원본 이미지와 이전 영상은 보존했습니다. 이번 20편은 기존 원화 그대로 재생성했습니다.\nGoogle Drive 교체본: '+folder+'\n현재 80편의 개별 Drive 링크는 delivery-manifest.json 및 captions.csv에 있습니다.\n검수: '+review['visual_review_method']+'\n한계: '+review['limit']+'\n게시·예약은 하지 않았습니다.\n',encoding='utf-8')
# Review page: current videos first, expandable previous clips and contact sheets.
css='*{box-sizing:border-box}body{margin:0;background:#101521;color:#eef3ff;font:15px/1.65 system-ui,sans-serif}main{max-width:1360px;margin:auto;padding:38px 24px}h1{font-size:clamp(30px,5vw,54px);line-height:1.15;margin:12px 0}a{color:#99d7ff}header p{color:#b9c9dc}.stats{display:flex;gap:12px;flex-wrap:wrap}.stats span{background:#203d36;color:#c9ffe0;padding:7px 13px;border-radius:25px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin-top:30px}article{background:#1b2536;border:1px solid #33465a;border-radius:16px;overflow:hidden}video,img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#000}.body{padding:18px}h2{margin:0;font-size:20px}.tag{color:#98e2bf;font-size:12px}.note{color:#cfdbeb}details{margin-top:14px}summary{cursor:pointer;color:#9fd5ff}.proof{display:flex;gap:15px;flex-wrap:wrap;margin:15px 0}input{width:min(540px,100%);padding:12px;font:inherit;background:#152034;color:white;border:1px solid #50627b;border-radius:9px}nav{display:flex;gap:18px;flex-wrap:wrap;margin:20px 0}.small{color:#aabbd0;font-size:12px}[hidden]{display:none}@media(max-width:800px){.grid{grid-template-columns:1fr}main{padding:25px 14px}}'
cards=[]
order=['79','74','80','05','77']+[x for x in selected if x not in ['79','74','80','05','77']]
for ep in order:
 e=next(x for x in manifest['episodes'] if x['id']==ep);s=selected[ep]
 proof=Path(s['master']).parent.as_posix()
 proof='' if proof=='.' else proof+'/'
 cards.append(f'<article id="episode-{ep}" data-search="{esc(ep+" "+e["title_ko"])}"><video aria-label="{ep} 수정본" controls muted playsinline preload="none" poster="release/episode-{ep}-poster.jpg" src="release/episode-{ep}.mp4"></video><div class="body"><span class="tag">{ep} · 수정 완료 · {s["attempt"]}차 후보</span><h2>{esc(e["title_ko"])}</h2><p class="note">{esc(s["note"])}</p><p>{esc(e["caption_draft"])}</p><div class="proof"><a href="release/episode-{ep}.mp4" download>수정 MP4 저장</a><a href="{esc(e["drive_url"])}" target="_blank" rel="noopener">Drive</a></div><details><summary>수정 전 영상·원본 이미지·검수 장면</summary><p class="small">이전 영상 — 교체 전 기록</p><video controls muted playsinline preload="none" poster="prior-selected/episode-{ep}-poster.jpg" src="prior-selected/episode-{ep}.mp4"></video><p class="small">승인한 원본 이미지</p><img loading="lazy" src="../../episode-{ep}-keyframe.png" alt="{ep} 승인 원화"><nav><a href="{proof}episode-{ep}-review-a.jpg">0~3.75초</a><a href="{proof}episode-{ep}-review-b.jpg">4~7.95초</a></nav></details></div></article>')
report='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SOULI · 20편 연속성 수정 완료</title><style>'+css+'</style><main><header><div class="tag">SOULI · CONTINUITY REPAIR · 2026.10.03</div><h1>같은 소울.<br>끝까지 같은 세상.</h1><p>캐릭터와 소품이 바뀌던 20편을 기존 원화로 다시 만들었습니다.<br>29개 후보를 비교해 20편을 골랐고, 움직임은 살리면서 오류가 잦은 동작을 단순하게 다듬었습니다.</p><div class="stats"><span>20편 교체</span><span>29개 후보 검수</span><span>8초 · 720p · 무음</span><span>Drive 저장 완료</span></div><nav><a href="../gallery.html">현재 80편 갤러리</a><a href="'+folder+'">교체본 Drive 폴더</a><a href="../souli-motion-v2-continuity-fixed-80-clips.zip">현재 80편 ZIP</a><a href="../website-handoff.txt">웹 개발 전달 메모</a></nav><input type="search" aria-label="수정 영상 검색" placeholder="번호 또는 제목 검색"><p class="small">기차는 정차한 상태에서 소울이 기다리는 연출로, 케첩은 병 앞에서 망설이는 연출로 수정했습니다. 각 카드에서 이전 영상과 비교할 수 있습니다.</p></header><div class="grid">'+''.join(cards)+'</div><footer><p class="small">'+esc(review['visual_review_method'])+' '+esc(review['limit'])+' 나머지 60편은 이전 검수본을 유지했습니다. 게시·예약하지 않았습니다.</p></footer></main><script>document.querySelector("input").addEventListener("input",e=>{const q=e.target.value.toLowerCase().trim();document.querySelectorAll("article").forEach(c=>{c.hidden=!c.dataset.search.toLowerCase().includes(q);if(c.hidden)c.querySelectorAll("video").forEach(v=>v.pause())})});document.addEventListener("play",e=>{if(e.target.tagName==="VIDEO")document.querySelectorAll("video").forEach(v=>{if(v!==e.target)v.pause()})},true)</script></html>'
(ROOT/'index.html').write_text(report,encoding='utf-8')
# Export notes without converting to a Google Workspace native document.
shutil.copy2(handoff,ROOT/'README-current-delivery.txt')
shutil.copy2(BASE/'captions.csv',ROOT/'current-80-captions.csv')
shutil.copy2(BASE/'delivery-manifest.json',ROOT/'current-80-manifest.json')
zip_path=BASE/'souli-motion-v2-continuity-fixed-80-clips.zip'
with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_STORED) as z:
 offline=gallery.replace('href="continuity-repair/index.html"','href="'+folder+'"')
 offline=re.sub(r'href="continuity-repair/index.html#episode-\d\d"','href="'+folder+'"',offline)
 offline=offline.replace('href="index.html"','href="'+folder+'"')
 z.writestr('gallery.html',offline)
 for p in sorted((BASE/'final').glob('*')):
  if p.suffix in ['.mp4','.jpg']:z.write(p,p.relative_to(BASE))
 for name in ['delivery-manifest.json','captions.csv','website-handoff.txt','validation.json']:z.write(BASE/name,name)
with zipfile.ZipFile(zip_path) as z:
 assert len([n for n in z.namelist() if n.endswith('.mp4')])==80
 assert z.testzip() is None
summary={'replaced':len(selected),'gallery_count':gallery.count('<article '),'drive_size_verified':len(verified),'zip_bytes':zip_path.stat().st_size,'video_count':len(list((BASE/'final').glob('*.mp4'))),'archive_count':len(list(archive.glob('*.mp4')))}
write(ROOT/'delivery-check.json',summary)
print(json.dumps(summary))

