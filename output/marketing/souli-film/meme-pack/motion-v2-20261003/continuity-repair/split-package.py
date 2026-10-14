from pathlib import Path
import json,zipfile,re
ROOT=Path(__file__).resolve().parent
BASE=ROOT.parent
manifest=json.loads((BASE/'delivery-manifest.json').read_text(encoding='utf-8'))
gallery=(BASE/'gallery.html').read_text(encoding='utf-8')
folder=manifest['continuity_repair']['drive_folder']
for start,end in [(1,40),(41,80)]:
 name=f'souli-current-{start:02d}-{end:02d}-continuity-fixed-20261003.zip'
 page=re.sub(r'<article\b.*?</article>',lambda m:m.group() if start<=int(re.search(r'data-search="(\d\d) ',m.group())[1])<=end else '',gallery,flags=re.S)
 page=page.replace('id="count">80편','id="count">40편').replace('80편 검수 ·','40편 모음 ·')
 page=re.sub(r'href="(?:continuity-repair/index.html(?:#episode-\d\d)?|souli-motion-v2-continuity-fixed-80-clips.zip|index.html)"',f'href="{folder}"',page)
 with zipfile.ZipFile(ROOT/name,'w',compression=zipfile.ZIP_STORED) as z:
  z.writestr(f'gallery-{start:02d}-{end:02d}.html',page)
  for e in manifest['episodes']:
   if start<=int(e['id'])<=end:
    z.write(BASE/e['video_file'],e['video_file'])
    z.write(BASE/e['poster_file'],e['poster_file'])
  for n in ['delivery-manifest.json','captions.csv','website-handoff.txt']:z.write(BASE/n,n)
  z.writestr('READ-ME.txt','SOULI current videos, 2026-10-03 continuity repair.\nThis ZIP contains episodes '+str(start)+'-'+str(end)+'.\nThe two ZIPs together contain all 80 current clips. Extract both into the same folder to collect the complete final/ directory.\nOpen gallery-'+f'{start:02d}-{end:02d}'+'.html to play this part.\n20 remade clips plus 60 earlier reviewed clips; 8s 1280x720 muted MP4.\nNo posting has been performed.\n')
 with zipfile.ZipFile(ROOT/name) as z:assert z.testzip() is None
 print(json.dumps({'name':name,'bytes':(ROOT/name).stat().st_size}))

