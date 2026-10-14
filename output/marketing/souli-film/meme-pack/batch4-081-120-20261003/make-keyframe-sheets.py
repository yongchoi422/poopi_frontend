from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).parent
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)
for start in range(81,121,8):
 out=Image.new('RGB',(1920,2268),'#f4f1e9');d=ImageDraw.Draw(out)
 for k,n in enumerate(range(start,min(start+8,121))):
  im=Image.open(R/f'episode-{n}-keyframe.png').convert('RGB');im.thumbnail((960,540))
  x=k%2*960;y=k//2*567
  out.paste(im,(x,y+27));d.text((x+8,y),str(n),fill='black',font=font)
 out.save(R/f'keyframes-{start}.jpg',quality=92)
