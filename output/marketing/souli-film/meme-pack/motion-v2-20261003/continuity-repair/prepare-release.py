from pathlib import Path
import json,subprocess,hashlib
ROOT=Path(__file__).resolve().parent
FF=r'C:\Users\yongc\Documents\GitHub\souli\tmp\souli-video-tools\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
out=ROOT/'release';out.mkdir(exist_ok=True)
rows=json.loads((ROOT/'review-results.json').read_text(encoding='utf-8'))['selected']
checks=[]
for row in rows:
 ep=row['id'];src=ROOT/row['master'];dst=out/f'episode-{ep}.mp4'
 if not dst.exists():
  subprocess.run([FF,'-hide_banner','-loglevel','error','-y','-i',str(src),'-map','0:v:0','-c:v','copy','-an','-movflags','+faststart',str(dst)],check=True)
  subprocess.run([FF,'-hide_banner','-loglevel','error','-y','-i',str(dst),'-frames:v','1',str(out/f'episode-{ep}-poster.jpg')],check=True)
 p=subprocess.run([FF,'-hide_banner','-i',str(dst),'-f','null','-'],capture_output=True,text=True,encoding='utf-8',errors='replace')
 assert p.returncode==0 and 'Audio:' not in p.stderr and '1280x720' in p.stderr and '24 fps' in p.stderr and 'Duration: 00:00:08.00' in p.stderr,(ep,p.stderr)
 checks.append({'id':ep,'bytes':dst.stat().st_size,'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'full_decode':'passed','audio':False,'format':'H264 1280x720 24fps 8s'})
(ROOT/'release-validation.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
print(json.dumps({'ready':len(checks),'bytes':sum(e['bytes'] for e in checks)}))
