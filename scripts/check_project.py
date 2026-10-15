"""Check the standalone package, browser timeline, media, and optional render pipeline."""
from pathlib import Path
import argparse,asyncio,hashlib,json,subprocess,sys
from playwright.async_api import async_playwright
from glow import selfcheck
from render import browser_args

ROOT=Path(__file__).resolve().parents[1]

def probe(path):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)]))

async def check_browser():
    errors=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(args=browser_args())
        page=await browser.new_page(viewport={'width':1920,'height':1080})
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto((ROOT/'src/comp.html').as_uri())
        await page.evaluate('window.__ready')
        meta=await page.evaluate('window.__meta')
        assert meta['dur']==10 and meta['fps']==60
        for t in [.65,1.9,3.8,5.6,6.95,9.4]:
            await page.evaluate('(t)=>window.__seek(t)',t)
        final=await page.evaluate('window.__state')
        assert final['stage']=='confirmed' and final['warm']==1
        assert final['reticle']['x']==954 and final['reticle']['y']==551
        one=await page.screenshot()
        await page.evaluate('window.__seek(.8)')
        await page.evaluate('window.__seek(9.4)')
        assert one==await page.screenshot(),'Repeated seek changed the frame'
        await browser.close()
    assert not errors,errors

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--render-smoke',action='store_true',help='Also render and glow a six-frame clip')
    args=ap.parse_args();selfcheck()
    assert 'Required Notice:' in (ROOT/'licenses/ONETAKE-LICENSE.txt').read_text(encoding='utf-8')
    manifest=json.loads((ROOT/'media/manifest.json').read_text(encoding='utf-8'))
    for name,entry in manifest['files'].items():
        media=ROOT/'media'/name
        assert hashlib.sha256(media.read_bytes()).hexdigest()==entry['sha256'],name
        info=probe(media);v=next(s for s in info['streams'] if s['codec_type']=='video')
        assert (v['width'],v['height'],v['r_frame_rate'],v['nb_frames'])==(1920,1080,'60/1','600')
        assert float(info['format']['duration'])==10
    asyncio.run(check_browser())
    if args.render_smoke:
        output=ROOT/'build';output.mkdir(exist_ok=True)
        base=output/'smoke-base.mp4';final=output/'smoke-glow.mp4'
        subprocess.run([sys.executable,str(ROOT/'scripts/render.py'),str(ROOT/'src/comp.html'),'--out',str(base),
                        '--dur','.2','--fps','30','--shutter','0','--workers','1',
                        '--sfx',str(ROOT/'src/assets/sound-master-v2.wav')],check=True,cwd=ROOT)
        subprocess.run([sys.executable,str(ROOT/'scripts/glow.py'),'--input',str(base),'--output',str(final),'--preset','D'],check=True,cwd=ROOT)
        v=next(s for s in probe(final)['streams'] if s['codec_type']=='video')
        assert v['nb_frames']=='6' and v['r_frame_rate']=='30/1'
    print('PASS: bundled media, browser timeline, repeated seek, licenses, glow checks'+(', six-frame render pipeline' if args.render_smoke else ''))

if __name__=='__main__':main()
