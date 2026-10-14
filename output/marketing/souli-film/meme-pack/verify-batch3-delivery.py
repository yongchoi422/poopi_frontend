from pathlib import Path
from html.parser import HTMLParser
import json,csv,zipfile
p=Path(__file__).resolve().parent
read=lambda name:json.loads((p/name).read_text(encoding='utf-8'))
v=read('video-validation.json');assert len(v)==80 and all(x['full_decode_passed'] and x['seconds']==8 and x['fps']==24 for x in v)
m=read('website-media-manifest.json');assert len(m['clips'])==80 and all(x['drive'] for x in m['clips'])
assert len({x['sha256'] for x in v})==80
qa=read('batch3-editorial-working.json');assert len(qa)==40 and all(x['status']=='accepted' for x in qa)
for n in range(41,81):
 for name in [f'episode-{n}.mp4',f'episode-{n}-keyframe.png',f'episode-{n}-poster.jpg',f'episode-{n}-review.jpg',f'episode-{n}-image.prompt.txt']:
  assert (p/name).is_file(),name
class Links(HTMLParser):
 def handle_starttag(self,tag,attrs):
  for k,val in attrs:
   if k in ['href','src','poster','data-src'] and val and not val.startswith(('http:','https:','#','data:')):
    assert (p/val.split('#')[0]).exists(),val
for name in ['index.html','homepage-concept.html']:Links().feed((p/name).read_text(encoding='utf-8'))
with (p/'captions.csv').open(encoding='utf-8-sig',newline='') as f:assert len(list(csv.DictReader(f)))==80
for x in read('support-80-metadata.json'):
 assert Path(x['local_file']).stat().st_size==int(x['metadata']['size'])
 assert '1dUEn05Rf_GVU5NFRSENEw_6xvIsH7ClW' in x['metadata']['parent_ids']
with zipfile.ZipFile(p.parent/'souli-80-final-delivery.zip') as z:
 assert z.testzip() is None
 assert sum(n.endswith('.mp4') for n in z.namelist())==82
print('PASS: 80 unique decoded 8s/24fps videos; 40 new accepted reviews; 80 captions; all local catalog links; support metadata; 82 MP4 ZIP CRC')
