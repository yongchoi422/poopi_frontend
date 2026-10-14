from pathlib import Path
import json,subprocess,hashlib,io,concurrent.futures,re
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent
PACK=ROOT.parent.parent.parent
FF=Path(r'C:\Users\yongc\Documents\GitHub\souli\tmp\souli-video-tools\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe')
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',23)
def run(path):
 n=path.name.split('-')[1]
 proof=ROOT/f'episode-{n}-review-b.jpg'
 if proof.exists():return n+' cached'
 probe=subprocess.run([str(FF),'-hide_banner','-i',str(path),'-f','null','-'],capture_output=True,text=True,encoding='utf-8',errors='replace')
 if probe.returncode:raise RuntimeError(n+probe.stderr)
 frame=ROOT/f'frames-{n}';frame.mkdir(exist_ok=True)
 # Native Omni outputs are 24 fps; select exact six-frame intervals.
 fps=re.search(r'(\d+(?:\.\d+)?) fps',probe.stderr)
 assert fps and abs(float(fps.group(1))-24)<.01,(n,probe.stderr)
 subprocess.run([str(FF),'-hide_banner','-loglevel','error','-y','-i',str(path),'-vf',r"select=not(mod(n\,6)),scale=640:360",'-vsync','0',str(frame/'frame-%03d.jpg')],check=True)
 pics=sorted(frame.glob('frame-*.jpg'));assert len(pics)>=32
 last=subprocess.run([str(FF),'-hide_banner','-loglevel','error','-ss','7.95','-i',str(path),'-frames:v','1','-vf','scale=640:360','-f','image2pipe','-vcodec','mjpeg','-'],capture_output=True,check=True).stdout
 ref=Image.open(PACK/f'episode-{n}-keyframe.png').convert('RGB');ref.thumbnail((640,360))
 for page,start in [('a',0),('b',16)]:
  sheet=Image.new('RGB',(2560,1936),(239,240,231));d=ImageDraw.Draw(sheet)
  sheet.paste(ref,(0,28));d.text((8,2),n+' | APPROVED REFERENCE',font=font,fill=(20,35,40))
  d.text((675,80),n+' | CONTINUITY REPAIR | '+page.upper(),font=font,fill=(20,35,40))
  d.text((675,125),'Original image above. Generated video samples below.',font=font,fill=(20,35,40))
  for j in range(16):
   i=start+j;x=(j%4)*640;y=388+(j//4)*387
   im=Image.open(io.BytesIO(last)) if i==31 else Image.open(pics[i])
   sheet.paste(im.convert('RGB'),(x,y+27));d.rectangle((x,y,x+640,y+27),fill=(17,31,51))
   t=7.95 if i==31 else i*.25
   d.text((x+7,y),f'{n} | {t:.3f}s',font=font,fill='white')
  sheet.save(ROOT/f'episode-{n}-review-{page}.jpg',quality=91)
 data={'id':n,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'full_decode':'passed','fps':24,'samples':[i*.25 for i in range(31)]+[7.95]}
 (ROOT/f'episode-{n}-validation.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
 return n+' reviewed sheets ready'
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for r in pool.map(run,sorted(ROOT.glob('episode-*-master.mp4'))): print(r,flush=True)


