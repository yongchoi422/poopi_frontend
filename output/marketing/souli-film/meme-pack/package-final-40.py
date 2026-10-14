from pathlib import Path
import json,zipfile
p=Path(__file__).resolve().parent
d=json.loads((p/'drive-delivery-manifest.json').read_text(encoding='utf-8'))
m=json.loads((p/'website-media-manifest.json').read_text(encoding='utf-8'))
by={x['episode']:x for x in d['videos']}
for x in m['clips']:x['drive']=by[x['id']]
(p/'website-media-manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8')
files=[]
for i in range(1,41):
 n=f'{i:02}'
 files.extend([p/f'episode-{n}.mp4',p/f'episode-{n}-poster.jpg',p/f'cast/soul-{n}.png'])
files.extend(p/x for x in ['index.html','homepage-concept.html','captions.csv','README.txt','website-handoff.txt','website-media-manifest.json','drive-delivery-manifest.json','video-validation.json','editorial-review.json','40-scenes-overview.jpg'])
files.extend(p.parent/x for x in ['souli-hero-1080p.mp4','souli-hero-web.mp4','souli-hero-poster.jpg','hero-1080p-handoff.json'])
dest=p.parent/'souli-40-final-delivery.zip'
with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=3) as z:
 for f in files:
  assert f.exists(),f
  z.write(f,f.relative_to(p.parent).as_posix())
with zipfile.ZipFile(dest) as z:
 assert z.testzip() is None
 assert len([n for n in z.namelist() if n.endswith('.mp4')])==42
print(json.dumps({'zip':str(dest),'bytes':dest.stat().st_size,'files':len(files),'videos':42}))

