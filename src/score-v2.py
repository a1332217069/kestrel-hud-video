"""Original ten-second acquisition sound: air, relay, metal and a shared low room."""
from pathlib import Path
import numpy as np
from scipy import signal
from scipy.io.wavfile import write
SR=48000
N=SR*10
rng=np.random.default_rng(8271)
mix=np.zeros((N,2))
def place(w,t,gain=1,pan=0):
 i=round(t*SR);w=np.asarray(w)*gain;j=min(N,i+len(w));w=w[:j-i]
 mix[i:j,0]+=w*np.sqrt((1-pan)/2);mix[i:j,1]+=w*np.sqrt((1+pan)/2)
def air(dur,low,high,power=1.5):
 n=round(dur*SR);v=signal.sosfilt(signal.butter(2,[low,high],fs=SR,btype='bandpass',output='sos'),rng.normal(size=n));v/=max(abs(v).max(),1e-8)
 return v*np.sin(np.linspace(0,np.pi,n))**power
def tone(freq,dur,decay):
 t=np.arange(round(dur*SR))/SR
 return (np.sin(2*np.pi*freq*t)+.14*np.sin(2*np.pi*freq*2.03*t))*(1-np.exp(-t*160))*np.exp(-t*decay)
def chirp(f1,f2,dur):
 t=np.arange(round(dur*SR))/SR
 return signal.chirp(t,f0=f1,f1=f2,t1=dur,method='logarithmic')*np.sin(np.linspace(0,np.pi,len(t)))**2
t=np.arange(N)/SR
bed=(np.sin(2*np.pi*43*t)+.28*np.sin(2*np.pi*86.1*t))*.008
bed*=np.clip(t*3,0,1)*np.clip((7.7-t)/1.1,0,1)
place(bed,0)
place(air(.4,180,2800),.025,.12,-.25);place(tone(88,.65,7),.04,.16)
place(air(.65,100,1300),.61,.13,.25)
place(air(.8,350,2400),1.35,.09,-.2)
place(air(.44,170,1900),2.31,.15,.3)
place(chirp(470,290,.1),3.23,.035,.3)
place(chirp(470,290,.1),3.72,.035,.1)
place(chirp(510,1060,.18),4.2,.065)
place(air(.95,90,2300,.7),4.78,.16)
place(air(.38,200,3300),6.31,.13)
place(tone(53,1.0,5),6.69,.28);place(tone(1090,.65,7),6.69,.085)
place(tone(1455,.5,8),6.81,.065,.15)
place(air(.24,400,2100),7.77,.055,-.1)
place(tone(780,.35,13),8.45,.025)
dry=mix.copy()
for delay,gain in [(.037,.1),(.079,.07),(.133,.04),(.21,.02)]:
 n=round(delay*SR);mix[n:]+=dry[:-n,::-1]*gain
mix*=min(1,10**(-9/20)/max(abs(mix).max(),1e-9));mix[-SR//3:]*=np.linspace(1,0,SR//3)[:,None]
assert mix.shape==(480000,2) and np.isfinite(mix).all()
write(Path(__file__).with_name('assets')/'sound-v2.wav',SR,(mix*32767).astype(np.int16))
print('10-second original stereo sound written.')
