from pathlib import Path
import json, shutil, subprocess, hashlib, sys, io
from PIL import Image
out=Path(__file__).resolve().parent
sys.path.insert(0,str(out.parents[3]/'tmp/souli-video-tools'))
import imageio_ffmpeg
ff=imageio_ffmpeg.get_ffmpeg_exe()
archive=(out/'revisions/pre-identity-final').resolve()
assert archive.is_relative_to(out.resolve())
archive.mkdir(parents=True,exist_ok=True)
log=out/'applied-final-selection.json'
applied=json.loads(log.read_text(encoding='utf-8')) if log.exists() else {}
for e in json.loads((out/'final-selection.json').read_text(encoding='utf-8')):
 n=e['id'];src=(out/e['source']).resolve()
 assert src.is_relative_to(out.resolve())
 digest=hashlib.sha256(src.read_bytes()).hexdigest()
 if applied.get(n,{}).get('master_sha256')==digest:continue
 for suffix in ['-master-720p.mp4','.mp4','-poster.jpg','-review.jpg']:
  f=(out/f'episode-{n}{suffix}').resolve()
  assert f.is_relative_to(out.resolve())
  if f.exists() and not (archive/f.name).exists():shutil.copy2(f,archive/f.name)
 master=out/f'episode-{n}-master-720p.mp4'
 shutil.copy2(src,master)
 video=out/f'episode-{n}.mp4'
 subprocess.run([ff,'-hide_banner','-loglevel','error','-y','-i',str(master),'-map','0:v:0','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(video)],check=True)
 b=subprocess.run([ff,'-hide_banner','-loglevel','error','-i',str(video),'-frames:v','1','-f','image2pipe','-c:v','png','-'],capture_output=True,check=True).stdout
 Image.open(io.BytesIO(b)).convert('RGB').save(out/f'episode-{n}-poster.jpg',quality=92)
 dense=src.with_name(f'episode-{n}-dense-review.jpg')
 if dense.exists():shutil.copy2(dense,out/f'episode-{n}-review.jpg')
 applied[n]={**e,'master_sha256':digest}
 log.write_text(json.dumps(applied,ensure_ascii=False,indent=2),encoding='utf-8')
 print(n,flush=True)

