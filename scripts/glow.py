"""Spatial glow only. No geometry, timing, colour-grade, or audio changes."""
from pathlib import Path
import argparse,json,subprocess,time
import cv2
import numpy as np

U=np.arange(256,dtype=np.float32)/255
TO_LINEAR=np.where(U<=.04045,U/12.92,((U+.055)/1.055)**2.4).astype(np.float32)
V=np.arange(65536,dtype=np.float32)/65535
TO_SRGB=np.clip(np.rint(255*np.where(V<=.0031308,V*12.92,1.055*V**(1/2.4)-.055)),0,255).astype(np.uint8)

PRESETS={
 'A':{'strength':1.0,'tight_sigma':1.6,'halo_sigma':8.0,'wide_sigma':26.0},
 'B':{'strength':1.65,'tight_sigma':1.8,'halo_sigma':9.5,'wide_sigma':29.0},
 'C':{'strength':2.25,'tight_sigma':2.0,'halo_sigma':11.0,'wide_sigma':32.0},
 'D':{'strength':1.85,'tight_sigma':1.8,'halo_sigma':9.5,'wide_sigma':29.0,'saturation_floor':.12,'saturation_power':.85,'edge_gain':.68,'core_gain':.20,'tight_gain':1.30,'halo_gain':1.65,'wide_gain':.30},
}

def smooth(a,b,x):
 t=np.clip((x-a)/(b-a),0,1)
 return t*t*(3-2*t)

def blur_down(x,sigma,div):
 h,w=x.shape[:2]
 small=cv2.resize(x,(w//div,h//div),interpolation=cv2.INTER_AREA)
 small=cv2.GaussianBlur(small,(0,0),sigmaX=sigma/div,sigmaY=sigma/div,borderType=cv2.BORDER_REFLECT)
 return cv2.resize(small,(w,h),interpolation=cv2.INTER_LINEAR)

def apply_glow(rgb,settings):
 if settings['strength']==0:return rgb.copy()
 linear=TO_LINEAR[rgb]
 high=rgb.max(axis=2).astype(np.float32)/255
 low=rgb.min(axis=2).astype(np.float32)/255
 saturation=(high-low)/(high+1e-5)
 # The soft threshold favours emissive marks, leaving the dim supporting grid quiet.
 sat_floor=settings.get('saturation_floor',.35)
 sat_power=settings.get('saturation_power',.5)
 mask=smooth(.20,.68,high)*(sat_floor+(1-sat_floor)*saturation**sat_power)
 if 'edge_gain' in settings:
  x=np.linspace(0,1,rgb.shape[1],dtype=np.float32)
  centre=smooth(.17,.28,x)*(1-smooth(.72,.84,x))
  mask*=settings['edge_gain']+(1-settings['edge_gain'])*centre[None,:]
 emission=linear*mask[:,:,None]
 tight=cv2.GaussianBlur(emission,(0,0),sigmaX=settings['tight_sigma'],borderType=cv2.BORDER_REFLECT)
 halo=blur_down(emission,settings['halo_sigma'],2)
 wide=blur_down(emission,settings['wide_sigma'],4)
 light=(emission*settings.get('core_gain',.14)+tight*settings.get('tight_gain',1.45)+halo*settings.get('halo_gain',1.65)+wide*settings.get('wide_gain',.42))*settings['strength']
 # Screen-composite in linear light, retaining the sharp source and a gentle shoulder.
 result=linear+(1-linear)*(-np.expm1(-light))
 idx=np.clip(np.rint(result*65535),0,65535).astype(np.uint16)
 return TO_SRGB[idx]

def selfcheck():
 x=np.random.default_rng(74).integers(0,256,(96,128,3),dtype=np.uint8)
 assert np.array_equal(x,apply_glow(x,{**PRESETS['B'],'strength':0}))
 black=np.zeros((96,128,3),np.uint8)
 assert np.array_equal(black,apply_glow(black,PRESETS['B']))
 dot=black.copy();dot[48,64]=[255,155,35]
 out=apply_glow(dot,PRESETS['B'])
 assert out[48,67].max()>0 and out.shape==dot.shape
 assert np.array_equal(out,apply_glow(dot,PRESETS['B']))
 assert out[48,64,0]==255

def read_exact(pipe,n):
 buf=bytearray()
 while len(buf)<n:
  b=pipe.read(n-len(buf))
  if not b:
   if not buf:return None
   raise RuntimeError('Truncated decoded frame')
  buf.extend(b)
 return buf

def render(src,dst,preset):
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(src)]))
 v=next(s for s in info['streams'] if s['codec_type']=='video')
 w,h=v['width'],v['height'];fps=v['r_frame_rate'];N=int(v['nb_frames'])
 decoder=subprocess.Popen(['ffmpeg','-v','error','-i',str(src),'-map','0:v:0','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],stdout=subprocess.PIPE)
 encoder=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{w}x{h}','-framerate',fps,'-i','pipe:0','-i',str(src),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','15','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',str(dst)],stdin=subprocess.PIPE)
 start=time.time();count=0
 try:
  while True:
   b=read_exact(decoder.stdout,w*h*3)
   if b is None:break
   rgb=np.frombuffer(b,np.uint8).reshape(h,w,3)
   encoder.stdin.write(apply_glow(rgb,PRESETS[preset]).tobytes())
   count+=1
   if count%60==0:print(f'{count}/{N} glow frames, {time.time()-start:.1f}s',flush=True)
 finally:
  decoder.stdout.close();encoder.stdin.close()
 assert decoder.wait()==0 and encoder.wait()==0
 assert count==N
 print(json.dumps({'frames':count,'fps':fps,'seconds':round(time.time()-start,2),'preset':preset,'settings':PRESETS[preset]}),flush=True)

if __name__=='__main__':
 ap=argparse.ArgumentParser(description=__doc__)
 ap.add_argument('--input',type=Path);ap.add_argument('--output',type=Path)
 ap.add_argument('--preset',choices=PRESETS,default='D');ap.add_argument('--selfcheck',action='store_true')
 args=ap.parse_args();cv2.setNumThreads(4);selfcheck()
 if args.input and args.output:
  if args.input.resolve()==args.output.resolve():raise ValueError('Use a new output path to retain the original.')
  render(args.input,args.output,args.preset)
 else:print('Glow self-checks passed.')
