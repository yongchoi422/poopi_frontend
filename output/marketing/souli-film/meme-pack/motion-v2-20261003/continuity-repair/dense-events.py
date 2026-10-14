from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import subprocess,io
ROOT=Path(__file__).resolve().parent
FF=r'C:\Users\yongc\Documents\GitHub\souli\tmp\souli-video-tools\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
events=[('60',1.75),('66',6.125),('74',3.125),('79',3.375),('80',6.375)]
for ep,start in events:
 sheet=Image.new('RGB',(1920,880),'#142133');draw=ImageDraw.Draw(sheet)
 for i in range(12):
  t=start+i/24
  b=subprocess.run([FF,'-hide_banner','-loglevel','error','-ss',str(t),'-i',str(ROOT/f'episode-{ep}-master.mp4'),'-frames:v','1','-vf','scale=480:270','-f','image2pipe','-vcodec','mjpeg','-'],capture_output=True,check=True).stdout
  x=(i%4)*480;y=(i//4)*293
  sheet.paste(Image.open(io.BytesIO(b)),(x,y+23));draw.text((x+5,y),f'{ep} | {t:.3f}s',font=font,fill='white')
 sheet.save(ROOT/f'episode-{ep}-dense.jpg',quality=94)
 print(ep,flush=True)
