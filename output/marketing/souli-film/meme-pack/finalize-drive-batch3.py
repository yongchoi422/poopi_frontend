from pathlib import Path
import json
p=Path(__file__).resolve().parent
read=lambda x:json.loads((p/x).read_text(encoding='utf-8'))
d=read('drive-delivery-manifest.json')
by={x['episode']:x for x in d['videos']}
for x in read('batch3-drive-metadata.json'):
 n=x['episode'];local=p/f'episode-{n}.mp4'
 assert local.stat().st_size==int(x['size']),(n,'size mismatch')
 assert x['mime_type']=='video/mp4' and x['title']==f'souli-{n}.mp4'
 assert '18LXEDEV9V5u_quFkZe_fsFPb2iFGRkCE' in x['parent_ids']
 by[n]={'episode':n,'file_id':x['id'],'name':x['title'],'url':x['url'],'bytes':int(x['size']),'parent_ids':x['parent_ids']}
assert len(by)==80
d['videos']=[by[n] for n in sorted(by)]
d['video_count']=80
(p/'drive-delivery-manifest.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
print('Verified 80 Drive mappings; new 40 byte sizes and parents match')
