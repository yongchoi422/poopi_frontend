"""Package approved Flow clips locally; never uploads or publishes assets."""
from pathlib import Path
import sys, subprocess, json, io, hashlib
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageStat

out = Path(__file__).resolve().parent
root = out.parents[2]
sys.path.insert(0, str(root / 'tmp/souli-video-tools'))
import imageio_ffmpeg
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

def run(args):
    return subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', *args], check=True, capture_output=True).stdout

def metadata(file):
    reader = imageio_ffmpeg.read_frames(str(file))
    try:
        return next(reader)
    finally:
        reader.close()

def frame(file, time, width=384):
    raw = run(['-ss', str(time), '-i', str(file), '-frames:v', '1', '-vf', f'scale={width}:-2', '-f', 'image2pipe', '-c:v', 'png', '-'])
    return Image.open(io.BytesIO(raw)).convert('RGB')

font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)
reports = []
for source in sorted(out.glob('*-master-720p.mp4')):
    name = source.name.replace('-master-720p.mp4', '')
    video = out / (name + ('-web.mp4' if name == 'souli-hero' else '.mp4'))
    if not video.exists():
        run(['-i', str(source), '-map', '0:v:0', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(video)])
    meta = metadata(video)
    duration, fps = meta['duration'], meta['fps']
    times = [0, duration*.2, duration*.4, duration*.6, duration*.8, duration-1/fps]
    pictures = [frame(video, t) for t in times]
    w, h = pictures[0].size
    sheet = Image.new('RGB', (w*3, (h+30)*2), '#172450')
    draw = ImageDraw.Draw(sheet)
    for i, (t, picture) in enumerate(zip(times, pictures)):
        x, y = (i%3)*w, (i//3)*(h+30)
        draw.text((x+10, y+6), f'{t:.2f}s', fill='white', font=font)
        sheet.paste(picture, (x,y+30))
    sheet.save(out / (name + '-review.jpg'), quality=91)
    frame(video, 0, 1280).save(out / (name + '-poster.jpg'), quality=94)
    run(['-i', str(video), '-f', 'null', '-'])
    mae = lambda a,b: round(sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3, 3)
    reports.append({'file':video.name, 'source':source.name, 'metadata':meta, 'bytes':video.stat().st_size, 'sha256':hashlib.sha256(video.read_bytes()).hexdigest(), 'full_decode_passed':True, 'sampled_first_last_mae_0_255':mae(pictures[0],pictures[-1]), 'sampled_first_mid_mae_0_255':mae(pictures[0],pictures[2]), 'loop_note':'Endpoint metric is a diagnostic; visual motion and seam inspection are required.'})

gm = out / 'promo-gm.mp4'
hero = out / 'souli-hero-web.mp4'
if hero.exists() and not gm.exists():
    run(['-i', str(hero), '-t', '4', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(gm)])
if gm.exists():
    run(['-i',str(gm),'-f','null','-'])
    reports.append({'file':gm.name,'metadata':metadata(gm),'bytes':gm.stat().st_size,'full_decode_passed':True,'note':'Four-second GM cut from the approved hero; not separately generated or advertised as a seamless loop.'})
(out / 'delivery-validation.json').write_text(json.dumps(reports,indent=2), encoding='utf-8')
print(json.dumps(reports,indent=2))
