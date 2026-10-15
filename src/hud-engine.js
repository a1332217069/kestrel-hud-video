/* KESTREL — one continuous optical acquisition. All state is a function of time. */
(() => {
'use strict';
const {THREE:T,EffectComposer,RenderPass,UnrealBloomPass,OutputPass}=HUD3D;
const {clamp,lerp,sstep,tween,ease}=OM;
const W=1920,H=1080,CX=954,CY=551,DUR=20;
const C={cyan:'#45dce9',bright:'#b9f8fa',dim:'#2c7784',muted:'#628c96',amber:'#ffb465',red:'#ef6a59'};
const canvas=document.getElementById('film'),ctx=canvas.getContext('2d',{alpha:false});
const glCanvas=document.createElement('canvas');
const renderer=new T.WebGLRenderer({canvas:glCanvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
renderer.setSize(1920,1080);renderer.setPixelRatio(1);renderer.setClearColor(0x000000,1);
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new T.Scene();
const camera=new T.OrthographicCamera(-960,960,540,-540,1,4000);camera.position.z=2000;
const earth=new T.Group();earth.position.set(CX-960,540-CY,0);scene.add(earth);
const globe=new T.Group();earth.add(globe);
const R=304,rad=Math.PI/180;
const vec=(lon,lat,r=R)=>new T.Vector3(r*Math.cos(lat*rad)*Math.sin(lon*rad),r*Math.sin(lat*rad),r*Math.cos(lat*rad)*Math.cos(lon*rad));
function lineMat(color,alpha){return new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{color:{value:new T.Color(color)},opacity:{value:alpha},reveal:{value:0}},vertexShader:`varying float front;varying float vY;void main(){vec4 p=modelViewMatrix*vec4(position,1.);front=(modelMatrix*vec4(position,0.)).z/304.;vY=position.y/304.;gl_Position=projectionMatrix*p;}`,fragmentShader:`uniform vec3 color;uniform float opacity;uniform float reveal;varying float front;varying float vY;void main(){float facing=mix(.055,1.,smoothstep(-.04,.35,front));float scan=smoothstep(vY-.08,vY+.08,reveal*2.4-1.2);gl_FragColor=vec4(color,opacity*facing*scan);}`});}
function lines(points,mat){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));const o=new T.LineSegments(g,mat);globe.add(o);return o;}
const shoreMat=lineMat('#36becd',.46),gridMat=lineMat('#195966',.5),detailMat=lineMat('#1b6775',.4);
let coords=[];
for(const path of COAST){for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];if(Math.abs(a[0]-b[0])>180)continue;coords.push(...vec(...a).toArray(),...vec(...b).toArray());}}
const coastSegments=coords.length/6;lines(coords,shoreMat);
coords=[];
for(let lat=-80;lat<=80;lat+=10)for(let lon=-180;lon<180;lon+=2)coords.push(...vec(lon,lat,R*.998).toArray(),...vec(lon+2,lat,R*.998).toArray());
for(let lon=-180;lon<180;lon+=10)for(let lat=-90;lat<90;lat+=2)coords.push(...vec(lon,lat,R*.998).toArray(),...vec(lon,lat+2,R*.998).toArray());
lines(coords,gridMat);
coords=[];for(let lat=-75;lat<=75;lat+=5)for(let lon=-180;lon<180;lon+=5){let p=vec(lon,lat,R*1.003);coords.push(p.x-.7,p.y,p.z,p.x+.7,p.y,p.z);}
lines(coords,detailMat);
const haze=new T.Mesh(new T.SphereGeometry(R*1.005,64,40),new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.FrontSide,blending:T.AdditiveBlending,uniforms:{opacity:{value:0}},vertexShader:`varying vec3 norm;void main(){norm=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float opacity;varying vec3 norm;void main(){float rim=pow(1.-max(norm.z,0.),3.);gl_FragColor=vec4(.03,.4,.47,opacity*(.025+rim*.5));}`}));earth.add(haze);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new T.Vector2(1920,1080),.36,.48,.26);composer.addPass(bloom);composer.addPass(new OutputPass());
const target=vec(116.4074,39.9042,R*1.008),projected=new T.Vector3();
const bg=document.createElement('canvas');bg.width=W;bg.height=H;const bc=bg.getContext('2d');
bc.fillStyle='#02090c';bc.fillRect(0,0,W,H);
let grd=bc.createRadialGradient(CX,CY,80,CX,CY,900);grd.addColorStop(0,'#072029');grd.addColorStop(.54,'#04141b');grd.addColorStop(1,'#02080b');bc.fillStyle=grd;bc.fillRect(0,0,W,H);
bc.lineWidth=.65;bc.strokeStyle='#11343c';bc.globalAlpha=.27;
for(let y=97;y<1030;y+=29)for(let x=0;x<W;x+=50){const xx=x+(Math.round(y/29)%2)*25;bc.beginPath();for(let k=0;k<7;k++){let a=k*Math.PI/3;bc.lineTo(xx+17*Math.cos(a),y+17*Math.sin(a));}bc.stroke();}
bc.globalAlpha=1;
// Static sensor grain, not frame-to-frame noise, keeps temporal sampling stable.
let seed=9127;for(let i=0;i<27000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%W;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=seed%H;bc.fillStyle=i%2?'#92c8ce05':'#00000012';bc.fillRect(x,y,1,1);}
for(let y=0;y<H;y+=4){bc.fillStyle='#00000013';bc.fillRect(0,y,W,1);}
function text(s,x,y,size=14,color=C.cyan,alpha=1,align='left',family='mono',weight=400){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.textAlign=align;ctx.font=`${weight} ${size}px ${family==='display'?'Bahnschrift,Arial,sans-serif':family==='cn'?'"Microsoft YaHei",sans-serif':'Consolas,"Courier New",monospace'}`;ctx.fillText(s,x,y);ctx.restore();}
function line(x1,y1,x2,y2,color=C.cyan,a=.5,w=1){ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();}
function path(points,color=C.cyan,a=.6,w=1){ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();ctx.restore();}
function arc(x,y,r,start=0,end=Math.PI*2,a=.6,w=1,color=C.cyan,glow=0){ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=color;ctx.lineWidth=w;ctx.shadowColor=color;ctx.shadowBlur=glow;ctx.beginPath();ctx.arc(x,y,r,start,end);ctx.stroke();ctx.restore();}
function bracket(x,y,w,h,col=C.cyan,a=.6,len=14,lw=1){for(const [xx,yy,sx,sy]of [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]])path([[xx,yy+len*sy],[xx,yy],[xx+len*sx,yy]],col,a,lw);}
function panel(x,y,w,h,no,title,cn){line(x,y,x+w,y,C.dim,.65);text(no+'  '+title,x,y-10,12,C.cyan,.8);text(cn,x+w,y-10,11,C.muted,.65,'right','cn');bracket(x,y+10,w,h-10,C.dim,.5,8);}
function bar(x,y,w,v,a=1){line(x,y,x+w,y,C.dim,.3,3);line(x,y,x+w*clamp(v),y,C.cyan,a,3);}
function chart(x,y,w,h,t,kind=0){for(let i=0;i<4;i++)line(x,y+i*h/3,x+w,y+i*h/3,C.dim,.16);let pts=[];for(let i=0;i<=94;i++){const p=i/94;const f=p*8+t*(kind?1.7:1.2);const v=.46+.13*Math.sin(f*2.4)+.065*Math.sin(f*7.7)+.04*Math.sin(f*19.3)+(kind?.06*Math.cos(f*4):.1*Math.exp(-Math.pow((p-.66)*18,2)));pts.push([x+p*w,y+(1-v)*h]);}path(pts,C.cyan,.65,1.4);ctx.save();ctx.globalAlpha=.035;ctx.fillStyle=C.cyan;ctx.beginPath();ctx.moveTo(x,y+h);pts.forEach(p=>ctx.lineTo(...p));ctx.lineTo(x+w,y+h);ctx.fill();ctx.restore();}
function orientation(t){let lon,lat;if(t<3){lon=28;lat=8;}else if(t<9.4){const u=(t-3)/6.4;lon=28+84*ease.sineInOut(u);lat=8+24*ease.sineInOut(u);}else{const u=tween(t,9.4,12.8,ease.cubicInOut);lon=lerp(112,116.4074,u);lat=lerp(32,39.9042,u);}return {lon,lat};}
function globeState(t){let a=orientation(t);globe.rotation.set(a.lat*rad,-a.lon*rad,0,'XYZ');let scale=lerp(.92,1,sstep(1.1,3,t));earth.scale.setScalar(scale);return a;}
function rings(t,boot,locked){ctx.save();ctx.globalAlpha*=boot;let opening=tween(t,.65,2.45,ease.expoOut);arc(CX,CY,416,-Math.PI*.5,-Math.PI*.5+Math.PI*2*opening,.7,1.2,C.cyan,7);arc(CX,CY,407,0,Math.PI*2,.18,.8);arc(CX,CY,390,0,Math.PI*2,.28,.8);arc(CX,CY,335,0,Math.PI*2,.28,1);arc(CX,CY,311,0,Math.PI*2,.24,.9);
for(let i=0;i<180;i++){const a=i*Math.PI/90-Math.PI/2;let inner=i%15===0?393:i%5===0?398:402;line(CX+Math.cos(a)*inner,CY+Math.sin(a)*inner,CX+Math.cos(a)*408,CY+Math.sin(a)*408,C.cyan,i%5===0?.65:.25,i%15===0?1.6:1);}
for(let i=0;i<12;i++){let a=i*Math.PI/6-Math.PI/2;let r=442;text(String(i*30).padStart(3,'0'),CX+Math.cos(a)*r,CY+Math.sin(a)*r+4,12,C.cyan,.62,'center');}
const spin=t<13?t*.13:13*.13;for(let i=0;i<7;i++){let a=i*6.283/7+spin;arc(CX,CY,366,a,a+.19,.75,2.5,C.cyan,8);arc(CX,CY,381,-a-.35,-a-.11,.4,1.5);}
for(let i=0;i<4;i++){let a=i*Math.PI/2+.09;arc(CX,CY,419,a,a+.32,.85,2,C.cyan,8);}
// Scan azimuth carries the search into acquisition, then settles.
let sweep=t<11.5?(t-2.2)*.74:lerp((11.5-2.2)*.74,Math.PI*2.5,tween(t,11.5,13,ease.cubicOut));
if(t>2&&t<13.3){ctx.save();ctx.beginPath();ctx.arc(CX,CY,303,0,6.283);ctx.clip();for(let i=0;i<36;i++){let a=sweep-i*.006;line(CX,CY,CX+310*Math.cos(a),CY+310*Math.sin(a),C.cyan,.12*(1-i/36)*sstep(2,3,t)*(1-sstep(12.4,13.3,t)),1.6);}ctx.restore();}
for(const sy of [-1,1]){line(CX-34,CY+sy*345,CX+34,CY+sy*345,C.cyan,.6);line(CX,CY+sy*337,CX,CY+sy*355,C.cyan,.7);}
line(CX-28,CY,CX-8,CY,C.cyan,.6);line(CX+8,CY,CX+28,CY,C.cyan,.6);line(CX,CY-28,CX,CY-8,C.cyan,.6);line(CX,CY+8,CX,CY+28,C.cyan,.6);arc(CX,CY,3,0,6.283,.85,1.3);
text('AZIMUTH / TRUE NORTH',CX,1011,11,C.dim,.8,'center');ctx.restore();}
function header(t,boot,locked){ctx.save();ctx.globalAlpha*=boot;
bracket(25,25,1870,1030,C.dim,.8,29,1.6);line(56,91,1864,91,C.dim,.65);line(56,1025,1864,1025,C.dim,.55);
path([[61,52],[70,43],[80,43],[80,59],[71,66],[61,66],[61,52],[78,45]],C.cyan,.95,1.7);
text('KESTREL–09',94,65,22,C.cyan,.95,'left','display',600);text('天 隼 · 全 球 光 学 阵 列',276,63,12,C.cyan,.7,'left','cn');
path([[784,43],[1124,43],[1136,59],[1124,75],[784,75],[772,59],[784,43]],C.cyan,.5,1.2);
text(t<2.6?'OPTICAL ARRAY INITIALIZING':locked?'TARGET SOLUTION VERIFIED':'GEOSPATIAL ACQUISITION SYSTEM',954,63,12,C.cyan,.9,'center');
arc(1629,50,3,0,6.283,.95,5,C.red,6);text('REC',1643,55,12,C.cyan,.8);text('CH 09  /  EO–IR',1858,43,11,C.dim,.9,'right');text('UTC 03:14:'+String(38+Math.floor(t)).padStart(2,'0')+'.'+String(Math.floor(t*100)%100).padStart(2,'0'),1858,67,13,C.cyan,.75,'right');
text('OPTICAL TRACKING / EARTH REFERENCE WGS 84',58,1052,11,C.dim,.9);text('SIMULATION  /  非实时演示',1861,1052,11,C.dim,.8,'right','cn');text('K–09  |  SECURE UPLINK  •  9.6 G',954,1052,11,C.cyan,.6,'center');ctx.restore();}
function panels(t,boot,locked,a){ctx.save();ctx.globalAlpha*=boot;const x=58,w=303,rx=1555,rw=307;
panel(x,126,w,244,'01','SYSTEM BOOT','系统自检');
const rows=['OPTIC CORE  v4.2.1','CRYO FPA   4096 × 77K','GYRO ALIGN  00.0003°','ORBIT LEO   512 KM','UPLINK KQ–7  9.6 G','STAR DB     14 220'];
rows.forEach((s,i)=>{let op=tween(t,.18+i*.16,.35+i*.16,ease.expoOut);text('› '+s,x+9,154+i*25,13,C.muted,.95*op);text('[ OK ]',x+w-9,154+i*25,12,C.cyan,.85*op,'right');});
text(t<2.5?'› CALIBRATING OPTICS…':locked?'› TRACK MODE / STABILIZED':'› SEARCH MODE ENGAGED',x+9,318,13,C.cyan,.95);text('› SIGNAL · BRG '+a.lon.toFixed(2)+'°',x+9,342,12,C.dim,.9);
panel(x,411,w,143,'02','SLANT RANGE','斜距');const distance=window.SEQSTATE?.range ?? 1648.3;text(distance.toFixed(1),x-2,491,64,C.bright,.95,'left','display',600);text('KM',x+w-4,490,19,C.cyan,.9,'right','display');line(x,510,x+w,510,C.dim,.4);text('MAG ×'+(window.SEQSTATE?.mag??1).toFixed(1),x,538,12,C.cyan,.8);text('FOV '+(12.4/(window.SEQSTATE?.mag??1)).toFixed(2)+'°',x+w,538,12,C.cyan,.8,'right');
panel(x,594,w,214,'03','NAV TELEMETRY','导航遥测');
const values=[['AZM',a.lon.toFixed(3),'°',.62],['ELV',a.lat.toFixed(3),'°',.48],['ALT','512.08','KM',.83],['VEL','7.613','KM/S',.68],['SNR',(locked?42.8:36.2+3.2*Math.sin(t*.64)).toFixed(1),'DB',.71],['ERR',locked?'0.003':'0.0'+String(19+Math.floor(6*Math.sin(t))).padStart(2,'0'),'°',locked?.06:.36]];
values.forEach((row,i)=>{let y=624+i*29;line(x+8,y+9,x+w-8,y+9,C.dim,.15);text(row[0],x+9,y,12,C.dim,.95);text(row[1],x+142,y,16,C.bright,.8,'right');text(row[2],x+153,y,10,C.dim,.95);bar(x+216,y-4,70,row[3]+(locked?0:.035*Math.sin(t*1.7+i)),.7);});
panel(x,853,w,144,'04','RDR MINIMAP','雷达');let mx=x+80,my=930;
for(const r of [23,43,62])arc(mx,my,r,0,6.283,.22,.8);line(mx-65,my,mx+65,my,C.dim,.4);line(mx,my-65,mx,my+65,C.dim,.4);
let sa=t<13?t*.7:9.1;line(mx,my,mx+62*Math.cos(sa),my+62*Math.sin(sa),C.cyan,.6);for(let i=0;i<4;i++){let px=mx+35*Math.sin(i*2.1),py=my+38*Math.cos(i*1.4);bracket(px-3,py-3,6,6,C.cyan,.6,3);}
text('CONTACTS',x+169,887,11,C.dim,.9);['A–1  118°  .83','B–3  205°  .41','C–2  267°  .78','T–03 116° 1.00'].forEach((s,i)=>text(s,x+169,913+i*20,11,i===3&&locked?C.cyan:C.muted,.8));
panel(rx,126,rw,229,'05','SIGNAL ANALYSIS','信号分析');text('SIG PWR',rx+8,153,11,C.dim,.95);text('-79.0 dBm',rx+rw-8,153,13,C.bright,.8,'right');chart(rx+8,165,rw-16,59,Math.min(t,14));text('COHERENCE',rx+8,258,11,C.dim,.9);text((locked?'99.9':(78+8*Math.sin(t*.3)).toFixed(1))+' %',rx+rw-8,258,13,C.bright,.85,'right');chart(rx+8,270,rw-16,59,Math.min(t,14),1);
panel(rx,409,rw,237,'06','CANDIDATE RESOLUTION','候选目标');
const names=['CND–01  NRT','CND–02  ICN','CND–03  PEK'];
names.forEach((s,i)=>{let y=445+i*62;const chosen=i===2&&t>10.8; if(chosen){ctx.fillStyle='#27bacd0b';ctx.fillRect(rx+3,y-22,rw-6,55);line(rx+3,y+31,rx+rw-3,y+31,C.cyan,.85,1.8);}text(s,rx+8,y,14,chosen?C.bright:C.cyan,.9);text(chosen?(locked?'VERIFIED':'MATCH 99.7%'):'NO MATCH',rx+rw-8,y,12,chosen?C.cyan:C.dim,.9,'right');text(['35°41′ N 139°41′ E','37°34′ N 126°59′ E','39°54′ N 116°24′ E'][i],rx+8,y+20,11,C.muted,.85);});
panel(rx,697,rw,153,'07','RF SPECTRUM','频谱');for(let i=0;i<57;i++){const f=i/57;const v=.12+.5*Math.pow(Math.sin(i*.41+Math.min(t,15)*2),4)*(.3+.7*Math.sin(f*3.14));let hh=78*v;for(let yy=0;yy<hh;yy+=5){ctx.fillStyle=`rgba(44,181,201,${.22+yy/200})`;ctx.fillRect(rx+8+i*5.1,832-yy,2.5,2.5);}}text('▲ 8.412 GHz',rx+rw-8,725,12,C.bright,.8,'right');
panel(rx,899,rw,98,'08','DATA LINK / KQ–7','数据链路');ctx.save();ctx.beginPath();ctx.rect(rx+5,913,rw-10,82);ctx.clip();const scroll=Math.min(t,15)*1.65,base=Math.floor(scroll),dy=(scroll-base)*19;for(let j=0;j<6;j++){let words=[];const row=base+j;for(let i=0;i<9;i++)words.push(((i*17+row*47)%256).toString(16).padStart(2,'0').toUpperCase());text(String(4096+row*16).padStart(4,'0')+'  '+words.join(' '),rx+8,925+j*19-dy,10,C.dim,.85);}ctx.restore();ctx.restore();}
function targetHUD(t,boot){const tracking=sstep(7.9,8.7,t),locked=t>=13.15;projected.copy(target).applyMatrix4(globe.matrixWorld);projected.project(camera);let tx=(projected.x+1)*W/2,ty=(1-projected.y)*H/2;
const arrive=tween(t,8.4,12.8,ease.cubicInOut);let bx=lerp(CX+105,tx,arrive),by=lerp(CY-100,ty,arrive);let size=lerp(260,210,tween(t,10.8,13.15,ease.expoOut));
ctx.save();ctx.globalAlpha*=tracking*boot;
if(!locked){arc(bx,by,90,Math.PI*.18+t*.65,Math.PI*1.2+t*.65,.4,1);line(bx-90,by,bx-66,by,C.cyan,.55);line(bx+66,by,bx+90,by,C.cyan,.55);}
ctx.shadowColor=C.cyan;ctx.shadowBlur=locked?22:9;bracket(bx-size/2,by-size/2,size,size,C.bright,locked?.98:.8,36,locked?4:2.4);ctx.shadowBlur=0;
arc(tx,ty,4,0,6.283,arrive,.8,C.bright);line(tx-12,ty,tx+12,ty,C.bright,arrive*.8);line(tx,ty-12,tx,ty+12,C.bright,arrive*.8);
text('TGT–03',bx-size/2,by-size/2-13,12,C.cyan,.9);text(locked?'LOCK 100%':'ACQUIRING',bx+size/2,by-size/2-13,12,locked?C.bright:C.cyan,.95,'right');text(locked?'TRACK STABLE':'CORRELATING…',bx+size/2,by+size/2+24,12,C.cyan,.85,'right');
if(t>13.15){let u=tween(t,13.15,13.8,ease.expoOut);arc(tx,ty,20+u*76,0,6.283,(1-u)*.7,1.2,C.cyan,8);}
const tag=sstep(12.75,13.6,t);ctx.globalAlpha*=tag;
// Leader stays inside the central instrument instead of crossing the side panels.
path([[tx+size/2+7,ty+12],[tx+148,ty+72],[tx+282,ty+72]],C.cyan,.7,1);text('BEIJING',tx+154,ty+62,26,C.bright,.95,'left','display',600);text('北京市 / 中国',tx+154,ty+96,16,C.cyan,.9,'left','cn');text('39.9042°N  116.4074°E',tx+154,ty+121,11,C.muted,.95);ctx.restore();
return {x:tx,y:ty,locked,bx,by,size};}
function lower(t,boot,locked,a){ctx.save();ctx.globalAlpha*=boot;const lockIn=sstep(13.15,13.8,t);text('MAG × 1.0',523,193,12,C.cyan,.8);text('FOV 12.40°',1383,193,12,C.cyan,.8,'right');text('HDG '+a.lon.toFixed(2)+'°',512,892,13,C.cyan,.9);text('TLT '+a.lat.toFixed(2)+'°',1393,892,13,C.cyan,.9,'right');
const yy=949;line(610,yy,1298,yy,C.dim,.65);for(let i=0;i<=80;i++){const xx=610+i*8.6;line(xx,yy,xx,yy+(i%10===0?15:i%5===0?10:5),C.cyan,i%10===0?.65:.25);if(i%10===0)text(String(76+i),xx,yy+32,10,C.dim,.9,'center');}path([[954,yy-4],[946,yy-16],[962,yy-16],[954,yy-4]],C.cyan,.8,1.1);ctx.fillStyle='#031017e8';ctx.fillRect(CX-95,yy-45,190,27);text('E '+a.lon.toFixed(4)+'°',954,yy-25,15,C.bright,.9,'center');
if(locked){ctx.globalAlpha*=lockIn;line(767,148,1141,148,C.cyan,.5);text('目标已锁定',954,131,19,C.bright,.95,'center','cn');text('TARGET LOCKED  /  PEK–03',954,176,12,C.cyan,.8,'center');}else{text(t<2.6?'INITIALIZING OPTICS':t<8.4?'GLOBAL SEARCH / SCANNING':'TARGET ACQUISITION',954,133,13,C.cyan,.85,'center');}ctx.restore();}

window.KBASE={T,OM,W,H,CX,CY,C,canvas,ctx,bg,earth,globe,scene,camera,composer,renderer,shoreMat,gridMat,detailMat,haze,bloom,R,vec,target,projected,text,line,path,arc,bracket,panel,bar,chart,rings,header,panels};
window.__ready=document.fonts.ready.then(()=>true);
})();
