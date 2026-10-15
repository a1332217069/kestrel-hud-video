"""Render the original ten-second animation, then apply the approved glow finish."""
from pathlib import Path
import argparse,shutil,subprocess,sys

ROOT=Path(__file__).resolve().parent

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--glow-only',action='store_true',help='Apply glow to the bundled original MP4; do not rerender the scene')
    parser.add_argument('--workers',type=int,default=4,help='Chromium render workers (default 4)')
    args=parser.parse_args()
    if args.workers<1:parser.error('--workers must be positive')
    for executable in ['ffmpeg','ffprobe']:
        if not shutil.which(executable):parser.error(f'{executable} must be installed and available on PATH; see README.md')
    output=ROOT/'build';output.mkdir(exist_ok=True)
    base=ROOT/'media/kestrel-base.mp4' if args.glow_only else output/'kestrel-base.mp4'
    if not args.glow_only:
        subprocess.run([sys.executable,str(ROOT/'scripts/render.py'),str(ROOT/'src/comp.html'),
                        '--out',str(base),'--fps','60','--workers',str(args.workers),
                        '--shutter','180','--samples-min','3','--samples-max','12','--gap','3',
                        '--sfx',str(ROOT/'src/assets/sound-master-v2.wav'),'--recycle','0'],check=True,cwd=ROOT)
    final=output/'kestrel-glow.mp4'
    subprocess.run([sys.executable,str(ROOT/'scripts/glow.py'),'--input',str(base),'--output',str(final),'--preset','D'],check=True,cwd=ROOT)
    print(f'Finished: {final}')

if __name__=='__main__':main()
