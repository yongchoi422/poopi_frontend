from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image,ImageDraw,ImageFont
p=Path(__file__).resolve().parent/'cast'
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
for start in range(81,121,10):
 sheet=Image.new('RGB',(1920,816),'#182143')
 for n in range(start,start+10):
  svg=p/f'soul-{n}.svg';im=Image.new('RGBA',(24,24));d=ImageDraw.Draw(im)
  for r in ET.fromstring(svg.read_text(encoding='utf-8')):
   if r.tag.endswith('rect'):
    x,y,w,h=[int(r.attrib.get(k,0)) for k in ['x','y','width','height']]
    d.rectangle((x,y,x+w-1,y+h-1),fill=r.attrib['fill'])
  im.resize((768,768),Image.Resampling.NEAREST).save(svg.with_suffix('.png'))
  i=n-start;x,y=(i%5)*384,(i//5)*408
  sheet.paste(im.resize((360,360),Image.Resampling.NEAREST).convert('RGB'),(x+12,y+36))
  ImageDraw.Draw(sheet).text((x+12,y+8),f'SOULI {n}',fill='white',font=font)
 sheet.save(p/f'cast-batch4-{start}.jpg',quality=95)
print('Rendered 40 original SVG characters.')
