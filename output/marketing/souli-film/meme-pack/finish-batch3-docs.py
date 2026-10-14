from pathlib import Path
import json,re
from PIL import Image,ImageDraw,ImageFont
p=Path(__file__).resolve().parent;repo=p.parents[3]
plan=repo/'docs/SOULI-MARKETING-PLAN.ko.md'
s=plan.read_text(encoding='utf-8')
s=s.replace('## 15 배너와 40편 밈 영상 패키지','## 15 배너와 80편 밈 영상 패키지')
s=s.replace('[40편 재생·캡션 목록]','[80편 재생·캡션 목록]')
s=s.replace('에 기존 20편과 추가 20편을 저장했다.','에 기존 40편과 새 40편을 저장했다. 새 추가분은 41–80번으로, 영화관·탁구장·사탕 가게·달·미니어처 기차역 등 다른 SVG와 장소를 사용한다.')
s=s.replace('40개 MP4는 모두','80개 MP4는 모두').replace('교체 12편과 추가 20편은 각 16개','교체 12편과 추가 60편은 각 16개')
s=s.replace('검수 MP4 40개','검수 MP4 80개').replace('최대 40일치','최대 80일치').replace('갤러리는 40편 전체','갤러리는 80편 전체')
s+='\n\n## 17 추가 40편 제작 기록 (41–80)\n\n새 원화 40개는 Codex 내장 이미지 생성기로 원본 SVG를 참조해 만들었고, Flow Omni 1.1 Flash에서 가로 720p·8초로 영상화했다. 새 40편 전부 16개 시점의 프레임을 검수했다. 41·46·47·58·70·73·74·77·80은 눈·얼굴·몸체 변형이 있는 생성본을 제외하고 재생성본으로 교체했으며, 74는 세 번째 버전을 채택했다. 49는 마지막 정상 장면을 1.25초 유지하는 편집으로 끝의 변형을 제외했다. 원본과 제외본은 로컬 revisions에 남겨두었다.\n\n최종 전체 80개는 길이 8초·1280×720·24fps·무음 H.264로 확인했고 파일 전체 디코딩 및 서로 다른 SHA256 해시를 확인했다. Drive 신규 40개는 이름·MIME·부모 폴더·바이트 수를 재확인했다. 모든 프레임이 SVG와 완전히 일치한다는 뜻은 아니며, 47의 마지막 외부 손 소품과 68의 작은 패치 색 변화는 검수 기록에 명시했다.\n\n41–80의 실제 프롬프트와 채택 영상 정보는 [전체 기획](../output/marketing/souli-film/meme-pack/episodes.json), [이번 검수 기록](../output/marketing/souli-film/meme-pack/batch3-editorial-working.json)에 있다. X 게시·예약이나 라이브 웹사이트 배포는 하지 않았다.\n'
plan.write_text(s,encoding='utf-8')
readme=p/'README.txt'
readme.write_text(readme.read_text(encoding='utf-8')+'\nNew episode IDs: 41-80. Original keyframes were generated with the built-in Codex image generator; motion generated in Google Flow Omni 1.1 Flash. Actual prompts are in episodes.json, batch3-submitted-prompts.json and batch3-repair-prompts.json. Local keyframes: episode-41-keyframe.png through episode-80-keyframe.png. Final episode 49 holds a clean frame for its last 1.25 seconds.\n',encoding='utf-8')
# A new-batch filter makes the extra films immediately accessible.
idx=p/'index.html';s=idx.read_text(encoding='utf-8')
s=s.replace('<button data-filter="hero"','<button data-filter="new" aria-pressed="false">새 40편</button><button data-filter="hero"')
s=s.replace("b.dataset.filter==='all'||", "b.dataset.filter==='all'||b.dataset.filter==='new'&&Number(a.id.replace('episode-',''))>=41||")
idx.write_text(s,encoding='utf-8')
episodes=json.loads((p/'episodes.json').read_text(encoding='utf-8'))['episodes'][40:]
sheet=Image.new('RGB',(1600,8*216),'#172e2a');d=ImageDraw.Draw(sheet);font=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',18)
for i,e in enumerate(episodes):
 x,y=(i%5)*320,(i//5)*216
 sheet.paste(Image.open(p/e['poster_file']).convert('RGB').resize((320,180)),(x,y))
 d.text((x+10,y+184),e['id']+' '+e['title_ko'][:17],font=font,fill='white')
sheet.save(p/'new-40-scenes-overview.jpg',quality=92)
print('Updated marketing handoff and new-40 catalog filter')
