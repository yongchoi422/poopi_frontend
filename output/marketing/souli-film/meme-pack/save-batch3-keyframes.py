from pathlib import Path
import json,shutil
p=Path(__file__).resolve().parent
plan={e['id']:e for e in json.loads((p/'batch3-production-prompts.json').read_text(encoding='utf-8'))}
for e in json.loads((p/'batch3-image-sources.json').read_text(encoding='utf-8')):
 n=e['id'];dst=p/f'episode-{n}-keyframe.png'
 if not dst.exists():shutil.copy2(e['path'],dst)
 (p/f'episode-{n}-image.prompt.txt').write_text(plan[n]['imagePrompt'],encoding='utf-8')
print('Saved',len(plan),'prompts for available keyframes.')
