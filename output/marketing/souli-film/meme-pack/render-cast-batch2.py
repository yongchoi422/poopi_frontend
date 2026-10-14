from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image,ImageDraw,ImageFont
out=Path(__file__).resolve().parent/'cast'
sheet=Image.new('RGB',(1200,1024),'#182143')
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
for i,p in enumerate([p for p in sorted(out.glob('soul-*.svg')) if int(p.stem[-2:])>=21]):
    im=Image.new('RGBA',(24,24))
    draw=ImageDraw.Draw(im)
    for r in ET.fromstring(p.read_text(encoding='utf-8')):
        if r.tag.endswith('rect'):
            x,y,w,h=[int(r.attrib.get(k,0)) for k in ['x','y','width','height']]
            draw.rectangle((x,y,x+w-1,y+h-1),fill=r.attrib['fill'])
    im.resize((768,768),Image.Resampling.NEAREST).save(p.with_suffix('.png'))
    x,y=(i%5)*240,(i//5)*256
    ImageDraw.Draw(sheet).text((x+10,y+7),p.stem,fill='white',font=font)
    sheet.paste(im.resize((216,216),Image.Resampling.NEAREST).convert('RGB'),(x+12,y+32))
sheet.save(out/'cast-contact-sheet-batch2.png')
print('Rendered 20 original SVG examples without changing their source artwork.')

