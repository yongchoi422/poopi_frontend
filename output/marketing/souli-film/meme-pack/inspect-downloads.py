"""Make dense temporal contact sheets from observed browser download paths."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import sys,json,subprocess,shutil,io
out=Path(__file__).resolve().parent
sys.path.insert(0,str(out.parents[3]/'tmp/souli-video-tools'))
import imageio_ffmpeg
ff=imageio_ffmpeg.get_ffmpeg_exe()
log=out/sys.argv[1]
dest=(out/sys.argv[2]).resolve()
assert dest.is_relative_to(out.resolve())
dest.mkdir(parents=True,exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
for item in json.loads(log.read_text(encoding='utf-8')):
    n=item['id'];video=dest/f'episode-{n}-master-720p.mp4'
    if not video.exists(): shutil.copy2(item['path'],video)
    review=dest/f'episode-{n}-dense-review.jpg'
    if review.exists():continue
    sheet=Image.new('RGB',(1536,960),'#172450');d=ImageDraw.Draw(sheet)
    for i,t in enumerate([j*.5 for j in range(15)]+[7.95]):
        b=subprocess.run([ff,'-hide_banner','-loglevel','error','-ss',str(t),'-i',str(video),'-frames:v','1','-vf','scale=384:-2','-f','image2pipe','-c:v','png','-'],check=True,capture_output=True).stdout
        x,y=(i%4)*384,(i//4)*240
        d.text((x+10,y+2),f'{n} / {t:.2f}s',font=font,fill='white')
        sheet.paste(Image.open(io.BytesIO(b)).convert('RGB'),(x,y+24))
    sheet.save(review,quality=93)
    print(n,flush=True)
