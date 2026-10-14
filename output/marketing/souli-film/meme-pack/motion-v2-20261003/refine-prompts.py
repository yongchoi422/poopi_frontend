from pathlib import Path
import json,re
p=Path(__file__).resolve().parent
file=p/'production-plan.json';data=json.loads(file.read_text(encoding='utf-8'))
notes=dict(x.split('|',1) for x in (p/'identity-notes.txt').read_text(encoding='utf-8').splitlines())
for e in data['episodes']:
 motion=e['motion'].replace('SOULI','the sculpture')
 for word in ['earnest','proudly','eagerly','sleepily','suspiciously','annoyed','satisfied','indignant','disappointed','awkwardly','excited','overexcited','sheepish','oddly triumphant','regally','in disbelief','in defeat','exhausted','irritated','hopeful','proud','defeated','joyful','bravely','heroically']:
  motion=re.sub(r'\b'+word+r'\b','',motion,flags=re.I)
 e['prompt']=f'Locked camera, eight seconds. Practical stop-motion of the EXACT single-piece painted sculpture from this photograph: {notes[e["id"]]}. It is an inanimate solid artwork with STATIC painted inlays, not a face to animate. All surface geometry and markings remain rigidly attached and unchanged; only the position and angle of the whole artwork change. ACTION: {motion} Use only whole-object translation and small tilts, keeping the same decorated front toward camera. Each hop has a small clear lift, physical landing and contact shadow. Preserve the same materials, light and setting. Never add new marks, expressive eyes, eyebrows, mouth, letters, limbs, a new body or a transformation. No people or cuts.'
 e['identity_note']=notes[e['id']]
data['prompt_revision']='specific_identity_stopmotion_v3'
file.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print('Refined',len(data['episodes']))
