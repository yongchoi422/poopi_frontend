from pathlib import Path
p=Path(__file__).resolve().parent
s=(p/'build-final-40.py').read_text(encoding='utf-8')
s=s.replace('Build the reviewed 40-film delivery','Build the reviewed 80-film delivery')
s=s.replace("archive=out/'revisions/pre-identity-final'","archive=out/'revisions/pre-batch3-final'\narchive.mkdir(parents=True,exist_ok=True)")
old="episodes=[e for e in original['episodes'] if int(e['id'])<=20]+read(out/'additional-submitted-prompts.json')['episodes']"
new="""episodes=[e for e in original['episodes'] if int(e['id'])<=40]
for x in read(out/'batch3-production-prompts.json'):
 episodes.append({'id':str(x['id']),'title_ko':x['titleKo'],'character':'soul-'+str(x['id']),'setting':x['setting'],'look':x['material'],'hook':x['titleKo'],'payoff':x['action'],'caption':x['caption'],'trigger':x['triggerKo'],'video_prompt':x['videoPrompt'],'image_prompt':x['imagePrompt']})"""
assert old in s
s=s.replace(old,new)
s=s.replace("assert len(episodes)==40 and len({e['id'] for e in episodes})==40","assert len(episodes)==80 and len({e['id'] for e in episodes})==80")
s=s.replace("labels={'all':", """moods['gm'] += ['41','50','61','70','77','80']
moods['builder'] += ['43','44','46','54','55','60','62','63','66','67','72','74','78']
moods['frens'] += ['48','53','56','57','58','59','65','69','73','76','79']
moods['rough'] += ['42','45','47','49','51','52','64','68','71','75']
labels={'all':""")
s=s.replace("assert len({r['sha256'] for r in reports})==40","assert len({r['sha256'] for r in reports})==80")
s=s.replace("version=3,status='40_videos_prepared_reviewed_not_published'","version=4,status='80_videos_prepared_reviewed_not_published'")
s=s.replace("40 different SOULI miniature comedies: 20 earlier films with 12 identity-focused replacements, plus 20 new characters and scenes.","80 different SOULI miniature comedies: 40 previously reviewed films plus 40 additional characters and scenes.")
s=s.replace("40 situation-based clips are prepared. A future daily release can use up to 40 slots;","80 situation-based clips are prepared. A future daily release can use up to 80 slots;")
s=s.replace("Full-file FFmpeg decode of all 40. 16-frame visual checks for 12 replacements and 20 additions; six-frame checks retained for eight earlier accepted clips.","Full-file FFmpeg decode of all 80. 16-frame visual checks for 12 replacements and 60 additions; six-frame checks retained for eight earlier accepted clips.")
s=s.replace("SOULI · 40 little moments","SOULI · 80 little moments").replace("40 FILMS / 40 SOULS","80 FILMS / 80 SOULS").replace("40개 캡션","80개 캡션")
s=s.replace("수정한 기존 20편과 새로 만든 20편을 한곳에서 골라보세요.","기존 검수본 40편과 새로 만든 40편을 한곳에서 골라보세요.")
s=s.replace("기존 20편 중 12편 교체 + 새 20편 = 검수본 40편.","기존 검수본 40편 + 새 40편 = 검수본 80편.")
s=s.replace("전체 40편 동시","전체 80편 동시").replace("40편은 최대 40일치","80편은 최대 80일치")
s=s.replace("40 reviewed films","80 reviewed films").replace("40 videos, 8 seconds each","80 videos, 8 seconds each").replace("12 earlier clips replaced, 20 additional scenes created.","40 earlier reviewed clips plus 40 new scenes.")
s=s.replace("(1600,8*216)","(1600,16*216)").replace("'40-scenes-overview.jpg'","'80-scenes-overview.jpg'")
s=s.replace("lib['version']=3","lib['version']=4").replace("status='40_videos_prepared_reviewed_not_published',clips=40","status='80_videos_prepared_reviewed_not_published',clips=80")
(p/'build-final-80.py').write_text(s,encoding='utf-8')
print('Prepared 80-film builder; not run until all clips are reviewed.')

