"""Package downloaded Flow clips; keep source files and never publish anything."""
from pathlib import Path
import sys, json, shutil, subprocess, io, hashlib, html
from PIL import Image, ImageDraw, ImageFont
out=Path(__file__).resolve().parent
repo=out.parents[3]
sys.path.insert(0,str(repo/'tmp/souli-video-tools'))
import imageio_ffmpeg
ff=imageio_ffmpeg.get_ffmpeg_exe()
def run(args):
    return subprocess.run([ff,'-hide_banner','-loglevel','error',*args],capture_output=True,check=True).stdout
def meta(file):
    r=imageio_ffmpeg.read_frames(str(file))
    try:return next(r)
    finally:r.close()
def frame(file,t,w=384):
    b=run(['-ss',str(t),'-i',str(file),'-frames:v','1','-vf',f'scale={w}:-2','-f','image2pipe','-c:v','png','-'])
    return Image.open(io.BytesIO(b)).convert('RGB')
log=out/'download-log.json'
if log.exists():
    for item in json.loads(log.read_text(encoding='utf-8')):
        target=out/f"episode-{item['id']}-master-720p.mp4"
        if not target.exists():shutil.copy2(item['path'],target)
reports=[]
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
for source in sorted(out.glob('episode-*-master-720p.mp4')):
    stem=source.name.replace('-master-720p.mp4','')
    video=out/(stem+'.mp4')
    if not video.exists():run(['-i',str(source),'-map','0:v:0','-an','-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(video)])
    m=meta(video)
    assert m['size']==(1280,720) and 7.8<m['duration']<8.2, (video.name,m)
    run(['-i',str(video),'-f','null','-'])
    if not (out/(stem+'-review.jpg')).exists():
        times=[0,1.6,3.2,4.8,6.4,7.95]
        pics=[frame(video,t) for t in times]
        sheet=Image.new('RGB',(1152,492),'#172450');d=ImageDraw.Draw(sheet)
        for i,(t,pic) in enumerate(zip(times,pics)):
            x,y=(i%3)*384,(i//3)*246
            d.text((x+10,y+6),f'{t:.2f}s',fill='white',font=font);sheet.paste(pic,(x,y+30))
        sheet.save(out/(stem+'-review.jpg'),quality=91)
        frame(video,0,1280).save(out/(stem+'-poster.jpg'),quality=94)
    reports.append({'id':stem[-2:],'file':video.name,'master':source.name,'seconds':m['duration'],'size':m['size'],'fps':m['fps'],'bytes':video.stat().st_size,'full_decode_passed':True,'audio':'removed','sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'visual_review':'pending; see editorial-review.json'})
(out/'video-validation.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf-8')
plan=json.loads((out/'episodes.json').read_text(encoding='utf-8'))
ready={r['id'] for r in reports}
cards=[]
for e in plan['episodes']:
    n=e['id'];thumb=f'episode-{n}-keyframe.png'
    if n in ready:
        media=f'<video controls muted playsinline preload="none" poster="episode-{n}-poster.jpg" src="episode-{n}.mp4"></video>'
        links=f'<a href="episode-{n}.mp4" download>MP4 저장</a> · <a href="episode-{n}-master-720p.mp4" download>Flow 원본</a>'
        state=e.get('review_label','영상 파일 준비 · 편집 검수 별도')
    elif (out/thumb).exists():media=f'<img src="{thumb}" alt="{html.escape(e["title_ko"])} 키프레임">';links='';state='키프레임 준비 · 영상 제작 중'
    else:media=f'<img src="cast/soul-{n}.png" alt="원본 SVG 캐릭터">';links='';state='기획 완료'
    review=html.escape(e.get('editor_note','편집 검수 중'))
    observed=html.escape(e.get('observed_result',e['payoff']))
    cards.append(f'<article id="episode-{n}"><small>{n} · {state}</small>{media}<h2>{html.escape(e["title_ko"])}</h2><p class="setting">{html.escape(e["setting"])} / {html.escape(e["look"])}</p><p>{html.escape(e["hook"])}</p><p><b>화면 속 반전</b> {observed}</p><blockquote>{html.escape(e["caption"])}</blockquote><details><summary>기획·검수 기록</summary><p>기획: {html.escape(e["payoff"])}</p><p>검수: {review}</p><p>용도: {html.escape(e["trigger"])}</p><a href="cast/soul-{n}.png">원본 SVG 캐릭터 보기</a></details><p>{links}</p></article>')
page='''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SOULI · 20 Little Disasters</title><style>*{box-sizing:border-box}body{margin:0;background:#eef0f7;color:#172248;font:16px/1.6 system-ui,sans-serif}header{padding:48px max(24px,5vw);background:#172248;color:white}h1{font-size:clamp(30px,4vw,56px);line-height:1.1;margin:14px 0}header p{max-width:850px;color:#dce3ff}main{max-width:1500px;margin:auto;padding:32px;display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:24px}article{border:1px solid #d7ddeb;background:white;border-radius:18px;overflow:hidden;padding:18px}small{color:#53618e}video,img{width:100%;aspect-ratio:16/9;object-fit:contain;background:#152043;border-radius:10px;margin-top:12px}h2{font-size:21px;margin-bottom:6px}.setting{font-size:13px;color:#68718c}blockquote{margin:20px 0;padding:14px;border-radius:8px;background:#f0f2fa;font-weight:650}a{color:#2455ee}b{color:#2455ee}</style><header><small style="color:#ffc55c">SOULI / CREATIVE LIBRARY / 준비 전용</small><h1>20 little disasters.<br>20 different souls.</h1><p>매번 다른 캐릭터·배경·질감과 한 가지 반전. 설명 없이도 웃긴 장면을 먼저 보여주고, SOULI에 대한 호기심으로 연결합니다. 영상은 생성된 브랜드 상황극이며 실제 게임 플레이가 아닙니다.</p><p>게시·예약하지 않았습니다. 시장 문구는 게시 당일 ETH 상황에 맞춰 선택합니다. 계획된 반전과 실제 생성 결과의 차이는 편집 검수 기록을 확인하세요.</p></header><main>'''+''.join(cards)+'</main></html>'
(out/'index.html').write_text(page,encoding='utf-8')
print(json.dumps({'validated_videos':len(reports),'keyframes':len(list(out.glob('episode-*-keyframe.png'))),'catalog':str(out/'index.html')},ensure_ascii=False))
