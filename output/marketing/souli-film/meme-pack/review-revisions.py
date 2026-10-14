from pathlib import Path
import json, sys, io, subprocess, shutil
from PIL import Image, ImageDraw, ImageFont
out=Path(__file__).resolve().parent
sys.path.insert(0,str(out.parents[3]/'tmp/souli-video-tools'))
import imageio_ffmpeg
ff=imageio_ffmpeg.get_ffmpeg_exe()
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
dest=out/'revisions/v2'
dest.mkdir(parents=True,exist_ok=True)
for item in json.loads((out/'revision-downloads.json').read_text(encoding='utf-8')):
    target=dest/f"episode-{item['id']}-master-720p.mp4"
    shutil.copy2(item['path'],target)
    sheet=Image.new('RGB',(1152,492),'#172450');d=ImageDraw.Draw(sheet)
    for i,t in enumerate([0,1.6,3.2,4.8,6.4,7.95]):
        b=subprocess.run([ff,'-hide_banner','-loglevel','error','-ss',str(t),'-i',str(target),'-frames:v','1','-vf','scale=384:-2','-f','image2pipe','-c:v','png','-'],check=True,capture_output=True).stdout
        x,y=(i%3)*384,(i//3)*246
        d.text((x+10,y+6),f'{t:.2f}s',fill='white',font=font)
        sheet.paste(Image.open(io.BytesIO(b)).convert('RGB'),(x,y+30))
    sheet.save(dest/f"episode-{item['id']}-review.jpg",quality=92)
hero=out.parent/'souli-hero-1080p.mp4'
r=imageio_ffmpeg.read_frames(str(hero));m=next(r);r.close()
assert m['size']==(1920,1080) and 7.8<m['duration']<8.2
subprocess.run([ff,'-hide_banner','-loglevel','error','-i',str(hero),'-f','null','-'],check=True,capture_output=True)
handoff=out.parent/'hero-1080p-handoff.json'
h=json.loads(handoff.read_text(encoding='utf-8'));h['validation']={'dimensions':m['size'],'fps':m['fps'],'seconds':m['duration'],'bytes':hero.stat().st_size,'full_decode_passed':True}
handoff.write_text(json.dumps(h,ensure_ascii=False,indent=2),encoding='utf-8')
print('Five revision contact sheets and 1080p banner validation completed.')
