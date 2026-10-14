from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import subprocess,io,concurrent.futures
ROOT=Path(__file__).resolve().parent/'r2'
FF=r'C:\Users\yongc\Documents\GitHub\souli\tmp\souli-video-tools\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
events=[(91,4.9),(101,4.9),(103,5.2),(107,2.0),(114,.6),(114,6.1)]
def run(ev):
 ep,start=ev
 sheet=Image.new('RGB',(1920,1760),'#142133');draw=ImageDraw.Draw(sheet)
 for i in range(24):
  t=start+i/24
  b=subprocess.run([FF,'-hide_banner','-loglevel','error','-ss',str(t),'-i',str(ROOT/f'episode-{ep}-master.mp4'),'-frames:v','1','-vf','scale=480:270','-f','image2pipe','-vcodec','mjpeg','-'],capture_output=True,check=True).stdout
  x=(i%4)*480;y=(i//4)*293
  sheet.paste(Image.open(io.BytesIO(b)),(x,y+23));draw.text((x+5,y),f'{ep} | {t:.3f}s',font=font,fill='white')
 out=ROOT/f'episode-{ep}-dense-{start}.jpg';sheet.save(out,quality=94)
 return str(out)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for s in pool.map(run,events):print(s,flush=True)
