from pathlib import Path
import json,sys
p=Path(__file__).resolve().parent
current=json.loads((p/'selection.json').read_text(encoding='utf-8'))
for raw in sys.argv[1:]:
 n,rev,note=raw.split('|',2)
 current=[x for x in current if x['id']!=n]
 current.append({'id':n,'status':'accepted','source':f'{rev+"/" if rev else ""}episode-{n}-master-720p.mp4','observed':note})
(p/'selection.json').write_text(json.dumps(sorted(current,key=lambda x:x['id']),ensure_ascii=False,indent=2),encoding='utf-8')
print('Accepted:',len(current))
