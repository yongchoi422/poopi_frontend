from pathlib import Path
import json,subprocess,hashlib,sys,html,io
from PIL import Image
p=Path(__file__).resolve().parent
sys.path.insert(0,str(p.parents[4]/'tmp/souli-video-tools'))
import imageio_ffmpeg
ff=imageio_ffmpeg.get_ffmpeg_exe()
selected=json.loads((p/'selection.json').read_text(encoding='utf-8'))
plan={x['id']:x for x in json.loads((p/'production-plan.json').read_text(encoding='utf-8'))['episodes']}
final=p/'final';final.mkdir(exist_ok=True)
valpath=p/'validation.json'
validation=json.loads(valpath.read_text(encoding='utf-8')) if valpath.exists() else {}
for e in selected:
 n=e['id'];src=p/e['source'];digest=hashlib.sha256(src.read_bytes()).hexdigest();dest=final/f'episode-{n}.mp4'
 if validation.get(n,{}).get('master_sha256')!=digest:
  subprocess.run([ff,'-hide_banner','-loglevel','error','-y','-i',str(src),'-map','0:v:0','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(dest)],check=True)
  probe=subprocess.run([ff,'-hide_banner','-i',str(dest),'-f','null','-'],capture_output=True,text=True,encoding='utf-8',errors='replace')
  assert probe.returncode==0
  b=subprocess.run([ff,'-hide_banner','-loglevel','error','-i',str(dest),'-frames:v','1','-f','image2pipe','-c:v','png','-'],capture_output=True,check=True).stdout
  Image.open(io.BytesIO(b)).convert('RGB').save(final/f'episode-{n}-poster.jpg',quality=92)
  validation[n]={'master_sha256':digest,'output_sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'full_decode':'passed','bytes':dest.stat().st_size,'ffmpeg_report':probe.stderr[-1800:]}
  valpath.write_text(json.dumps(validation,ensure_ascii=False,indent=2),encoding='utf-8');print(n,flush=True)
cards=[]
for e in sorted(selected,key=lambda x:x['id']):
 n=e['id'];title=html.escape(plan[n]['title_ko']);note=html.escape(e['observed'])
 cards.append(f'<article><h2>{n} · {title}</h2><div class="pair"><section><h3>움직임 개선본</h3><video controls muted playsinline preload="metadata" poster="final/episode-{n}-poster.jpg" src="final/episode-{n}.mp4"></video></section><section><h3>기존 영상</h3><video controls muted playsinline preload="metadata" poster="../episode-{n}-poster.jpg" src="../episode-{n}.mp4"></video></section></div><p>{note}</p><a href="final/episode-{n}.mp4" download>개선본 저장</a> · <a href="../episode-{n}-keyframe.png">사용한 기존 원화</a></article>')
page='''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SOULI · 움직임 개선 검수</title><style>body{margin:0;background:#10121a;color:#f0f1f7;font:16px/1.7 system-ui,sans-serif}main{max-width:1280px;margin:auto;padding:40px 24px}h1{font-size:42px;line-height:1.2}header p{color:#b3bbd0}article{margin:28px 0;padding:24px;background:#1b1e2c;border:1px solid #303650;border-radius:20px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}h3{font-size:14px;color:#b0bbd3}video{width:100%;border-radius:12px;background:#000}a{color:#97caff}.count{color:#9dedae}@media(max-width:750px){.pair{grid-template-columns:1fr}h1{font-size:30px}}</style><main><header><a href="../index.html">기존 80편 라이브러리</a><h1>같은 소울, 더 살아 있는 움직임.</h1><p>승인된 기존 원화를 사용해 소울의 이동·점프·기울기와 반응을 개선합니다. 생성 중 얼굴이나 몸이 바뀐 결과는 제외합니다.</p>'''+f'<p class="count">현재 검수·파일 확인 통과 {len(selected)} / 80편 · 제작 진행 중</p></header>'+''.join(cards)+'</main></html>'
(p/'index.html').write_text(page,encoding='utf-8')
print('Review library:',len(selected))
