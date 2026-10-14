from pathlib import Path
import subprocess,sys
out=Path(__file__).resolve().parent
sys.path.insert(0,str(out.parents[3]/'tmp/souli-video-tools'))
import imageio_ffmpeg
ff=imageio_ffmpeg.get_ffmpeg_exe()
src=out/'revisions/batch3-first/episode-49-master-720p.mp4'
dst=out/'revisions/batch3-timing/episode-49-master-720p.mp4'
still=dst.parent/'episode-49-hold.png'
subprocess.run([ff,'-y','-hide_banner','-loglevel','error','-ss','6.70','-i',str(src),'-frames:v','1',str(still)],check=True)
subprocess.run([ff,'-y','-hide_banner','-loglevel','error','-i',str(src),'-loop','1','-framerate','24','-i',str(still),'-filter_complex','[0:v]trim=duration=6.75,setpts=PTS-STARTPTS,fps=24[a];[1:v]trim=duration=1.25,setpts=PTS-STARTPTS,fps=24[b];[a][b]concat=n=2:v=1:a=0[v]','-map','[v]','-an','-frames:v','192','-c:v','libx264','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(dst)],check=True)
print('Saved 192-frame timing edit')
