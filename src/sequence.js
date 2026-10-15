/* KESTREL / MOTION CUT 02 — globe → tactical chart → city lattice → acquisition. */
(() => {
'use strict';
const B=KBASE,{T,OM,W,H,CX,CY,C,canvas,ctx,bg,earth,globe,scene,camera,composer,shoreMat,gridMat,detailMat,haze,bloom,R,vec,text,line,path,arc,bracket,panels,header}=B;
const {clamp,lerp,sstep,tween,ease,spring}=OM;
const DURATION=10,BEIJING=[116.4074,39.9042],DEG=Math.PI/180,ASPECT=Math.cos(BEIJING[1]*DEG);
const palette={cyan:new T.Color('#45dce9'),orange:new T.Color('#ff981f')};
let q=0;
const fx=t=>clamp(t)*clamp(t)*(3-2*clamp(t));
const win=(a,b,c,d,t)=>sstep(a,b,t)*(1-sstep(c,d,t));
const rgb=(a,b,k)=>{const x=new T.Color(a).lerp(new T.Color(b),k);return '#'+x.getHexString();};
function sample(t,keys){if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++){if(t<keys[i][0])return lerp(keys[i-1][1],keys[i][1],tween(t,keys[i-1][0],keys[i][0],keys[i][2]??ease.cubicInOut));}return keys.at(-1)[1];}
function stateAt(time){
 const t=clamp(time,0,10)*1.8;
 const morph=tween(t,4.35,5.8,ease.quintInOut),city=sstep(9.05,9.95,t),warm=tween(t,11.8,12.35,ease.expoOut);
 const zoom=Math.exp(sample(t,[[0,Math.log(18)],[8.05,Math.log(18)],[8.6,Math.log(49),ease.expoOut],[9.2,Math.log(115),ease.quintInOut],[10.1,Math.log(1550),ease.expoInOut],[11.1,Math.log(1850),ease.sineInOut],[11.9,Math.log(2300),ease.expoInOut],[12.65,Math.log(1750),ease.expoOut],[14.7,Math.log(1900),ease.cubicInOut],[16.2,Math.log(1450),ease.expoOut],[18,Math.log(1450)]]));
 return {t,morph,city,warm,zoom,cx:sample(t,[[0,954],[1.6,954],[2.85,1082,ease.expoOut],[4.35,954,ease.quintInOut]]),cy:551,
   globeScale:sample(t,[[0,.02],[.45,.28,ease.expoOut],[1.55,.86,ease.expoOut],[2.65,1.19,ease.backOut],[3.65,1.05],[4.35,1],[5.8,1]]),
   lon:sample(t,[[0,-28],[1.5,8],[2.8,62,ease.quintInOut],[4.35,116.4074,ease.quintInOut]]),
   lat:sample(t,[[0,-18],[1.6,8],[2.8,22],[4.35,39.9042]]),
   tilt:sample(t,[[0,0],[9.5,0],[10.4,.68,ease.quintInOut],[11.45,.68],[12.05,.08,ease.expoOut],[13,.18],[16,.18],[18,.18]]),
   rotation:sample(t,[[0,0],[9.4,0],[10.4,-.18],[11.45,.08],[12.1,0,ease.expoOut],[14.3,0],[15.1,-.08],[16.2,0]]),
   frameRect:morph*(1-tween(t,11.8,12.55,ease.quintInOut)),
   side:sample(t,[[0,0],[.8,.3],[1.7,1,ease.expoOut],[4.2,1],[5.8,.28],[8.3,.28],[9.7,.08],[11.9,.08],[12.7,1,ease.expoOut],[18,1]]),
   range:sample(t,[[0,0],[1.7,2386.7],[4.5,1648.3],[8.2,1648.3],[9.1,612.4],[10.6,189.2],[11.9,77.9],[18,77.9]]),
   mag:sample(t,[[0,1],[8.1,1],[9.2,3.2],[10.2,12.5],[11.9,21.2],[18,21.2]])};
}
const coastFlat=new Path2D();
const morphPaths=[];
for(const coast of COAST){let active=false,mp=[];for(let i=0;i<coast.length;i++){const p=coast[i];if(p[0]>75&&p[0]<160&&p[1]>1&&p[1]<77){const x=(p[0]-BEIJING[0])*ASPECT,y=BEIJING[1]-p[1];if(active)coastFlat.lineTo(x,y);else coastFlat.moveTo(x,y);active=true;mp.push({lon:p[0],lat:p[1],x,y});}else{active=false;if(mp.length>1)morphPaths.push(mp);mp=[];}}if(mp.length>1)morphPaths.push(mp);}
let seed=19381;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const blocks=[];for(let iy=-11;iy<=11;iy++)for(let ix=-14;ix<=14;ix++){if(Math.abs(ix)<1||Math.abs(iy)<1||rand()<.13)continue;const step=.028;blocks.push({x:ix*step+(rand()-.5)*.004,y:iy*step+(rand()-.5)*.004,w:step*(.45+rand()*.3),h:step*(.35+rand()*.35),z:.003+rand()*.014,k:rand()});}
function theme(s){C.cyan=rgb('#45dce9','#ff9d2b',s.warm);C.bright=rgb('#b9f8fa','#ffe7a6',s.warm);C.dim=rgb('#2c7784','#8c4a17',s.warm);C.muted=rgb('#628c96','#b47c43',s.warm);}
function shadowLine(points,a=.7,w=1,glow=0,color=C.cyan){ctx.save();ctx.shadowColor=color;ctx.shadowBlur=glow;path(points,color,a,w);ctx.restore();}
function boundary(s,offset=0){ctx.beginPath();for(let i=0;i<=144;i++){const a=i/144*Math.PI*2;let dx=Math.cos(a),dy=Math.sin(a),r=404+offset;const den=Math.max(Math.abs(dx)/(505+offset),Math.abs(dy)/(337+offset));let x=lerp(dx*r,dx/den,s.frameRect),y=lerp(dy*r,dy/den,s.frameRect);if(i===0)ctx.moveTo(s.cx+x,s.cy+y);else ctx.lineTo(s.cx+x,s.cy+y);}ctx.closePath();}
function projectedGeo(lon,lat,s){const p=vec(lon,lat,R);p.applyEuler(new T.Euler(s.lat*DEG,-s.lon*DEG,0,'XYZ'));return {x:s.cx+p.x*s.globeScale,y:s.cy-p.y*s.globeScale,z:p.z};}
function worldXY(x,y,z,s){const ct=Math.cos(s.tilt),st=Math.sin(s.tilt),cr=Math.cos(s.rotation),sr=Math.sin(s.rotation);const xx=x*s.zoom,yy=y*s.zoom*ct-z*s.zoom*st;return[s.cx+xx*cr-yy*sr,s.cy+xx*sr+yy*cr];}
function mapPoint(lon,lat,s){return worldXY((lon-BEIJING[0])*ASPECT,BEIJING[1]-lat,0,s);}
function drawBackdrop(s){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.drawImage(bg,0,0);if(s.warm>.001){ctx.fillStyle=`rgba(74,20,0,${s.warm*.16})`;ctx.fillRect(0,0,W,H);}const a=.09*win(.3,1,14.5,17,s.t);for(let i=0;i<21;i++){const y=134+i*43+(s.t*19)%43;line(400,y,1518,y,C.cyan,a,1);} }
function drawEarth(s){if(s.t>5.65)return;const visible=1-sstep(4.3,5.6,s.t);earth.position.set(s.cx-960,540-s.cy,0);earth.scale.setScalar(s.globeScale);globe.rotation.set(s.lat*DEG,-s.lon*DEG,.045*Math.sin(s.t*1.2)*(1-s.morph),'XYZ');
 const build=sstep(.32,1.45,s.t);for(const m of [shoreMat,gridMat,detailMat])m.uniforms.reveal.value=build;
 shoreMat.uniforms.opacity.value=.46;gridMat.uniforms.opacity.value=.5;haze.material.uniforms.opacity.value=.65*build;
 scene.updateMatrixWorld(true);composer.render(0);ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=visible;ctx.drawImage(B.renderer.domElement,0,0);ctx.restore();
 // Latitude planes visibly stack and then seat into the globe.
 const exploded=win(.35,.75,2.1,2.75,s.t);if(exploded>0){for(let j=-3;j<=3;j++){const rr=Math.sqrt(1-(j/4)**2)*R*s.globeScale,yy=s.cy+j*55*s.globeScale-j*22*exploded;ctx.save();ctx.translate(s.cx,yy);ctx.scale(1,.18+.1*(1-exploded));arc(0,0,rr,0,Math.PI*2,.3*exploded,1.2,C.cyan,7);ctx.restore();}}
}
function drawMap(s){if(s.t<4.35)return;ctx.save();boundary(s,-12);ctx.clip();const visible=sstep(4.35,4.85,s.t);ctx.globalAlpha*=visible;
 const morph=1-sstep(5.35,5.85,s.t);if(morph>0){ctx.save();ctx.globalAlpha*=morph;ctx.strokeStyle=C.cyan;ctx.lineWidth=1;ctx.shadowColor=C.cyan;ctx.shadowBlur=4;ctx.beginPath();for(const pts of morphPaths){let started=false;for(const p of pts){let p0=projectedGeo(p.lon,p.lat,s);if(p0.z<0){started=false;continue;}const p1=mapPoint(p.lon,p.lat,{...s,zoom:18});const x=lerp(p0.x,p1[0],s.morph),y=lerp(p0.y,p1[1],s.morph);if(started)ctx.lineTo(x,y);else ctx.moveTo(x,y);started=true;}}ctx.stroke();ctx.restore();}
 const mapAlpha=sstep(5.25,5.8,s.t)*(1-s.city*.85);if(mapAlpha>.001){ctx.save();ctx.globalAlpha*=mapAlpha;ctx.translate(s.cx,s.cy);ctx.rotate(s.rotation);ctx.scale(s.zoom,s.zoom*Math.cos(s.tilt));ctx.strokeStyle=C.cyan;ctx.lineWidth=1.2/s.zoom;ctx.shadowColor=C.cyan;ctx.shadowBlur=3/s.zoom;ctx.stroke(coastFlat);ctx.restore();}
 // Geographic reference grid becomes the fine city grid as the camera dives.
 const step=s.zoom<90?5:s.zoom<450?1:.05;const span=Math.min(55,780/s.zoom);let p=[];for(let x=-span;x<=span;x+=step){p.push([worldXY(x,-span,0,s),worldXY(x,span,0,s)]);}for(let y=-span;y<=span;y+=step)p.push([worldXY(-span,y,0,s),worldXY(span,y,0,s)]);for(const v of p)path(v,C.cyan,.14,1);
 if(s.city>.001)drawCity(s);
 // Moving acquisition raster: a line with a wider, fading field behind it.
 const yy=s.cy-330+((Math.min(s.t,16.2)-4.35)*185)%660;const g=ctx.createLinearGradient(0,yy-70,0,yy);g.addColorStop(0,'transparent');g.addColorStop(1,s.warm>.5?'#ff9d2b13':'#45dce915');ctx.fillStyle=g;ctx.fillRect(s.cx-540,yy-70,1080,70);line(s.cx-540,yy,s.cx+540,yy,C.cyan,.55,1.3);
 ctx.restore();
}
function drawCity(s){ctx.save();ctx.globalAlpha*=s.city;let scan=(s.t-9.1)*.22;for(const b of blocks){const growth=tween(s.t,9.2+(b.x+.4)*.7,10.15+(b.x+.4)*.7,ease.expoOut),z=b.z*growth;const p=[worldXY(b.x,b.y,z,s),worldXY(b.x+b.w,b.y,z,s),worldXY(b.x+b.w,b.y+b.h,z,s),worldXY(b.x,b.y+b.h,z,s)];ctx.fillStyle=s.warm>.5?'#44270d2e':'#07334040';ctx.beginPath();p.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.fill();path([...p,p[0]],C.cyan,.2+.3*b.k,1);if(s.tilt>.1){for(let j=0;j<4;j++){let x=b.x+(j===1||j===2?b.w:0),y=b.y+(j>=2?b.h:0);path([worldXY(x,y,0,s),p[j]],C.cyan,.22,1);}}
 if(Math.abs(b.x-scan+.52)<.035&&s.t<12)path([...p,p[0]],C.bright,.65,1.4);}
 for(const r of [.14,.25,.36]){let pp=[];for(let i=0;i<=100;i++){let a=i/100*6.283;pp.push(worldXY(Math.cos(a)*r,Math.sin(a)*r*.72,0,s));}path(pp,C.cyan,.44,1.4);}
 for(const axis of [-1,1]){path([worldXY(-.7,axis*.012,0,s),worldXY(.7,axis*.012,0,s)],C.cyan,.7,1.5);path([worldXY(axis*.012,-.7,0,s),worldXY(axis*.012,.7,0,s)],C.cyan,.7,1.5);}
 for(let i=0;i<8;i++){let x=Math.sin(i*6.8)*.3,y=Math.cos(i*3.3)*.22,p=worldXY(x,y,0,s);if(p[0]<s.cx-470||p[0]>s.cx+470||p[1]<s.cy-300||p[1]>s.cy+300)continue;arc(p[0],p[1],3,0,6.283,.85,1.5);text('TRK '+String(i+11),p[0]+9,p[1]-8,10,C.cyan,.8);}
 ctx.restore();}
function drawInstrument(s){ctx.save();const build=tween(s.t,.05,1.2,ease.expoOut);ctx.globalAlpha*=build;ctx.strokeStyle=C.cyan;ctx.lineWidth=1.4;ctx.shadowColor=C.cyan;ctx.shadowBlur=5;boundary(s,0);ctx.stroke();ctx.shadowBlur=0;ctx.globalAlpha*=.35;boundary(s,11);ctx.stroke();ctx.globalAlpha/=.35;
 if(s.frameRect<.8){let shift=sample(s.t,[[0,-1.7],[2.5,.5],[4.4,2.8],[8,5.3],[11.8,7.6],[12.7,8.3],[16.2,9.1],[18,9.12]]);for(let k=0;k<3;k++){const r=361+k*17;for(let j=0;j<6;j++){const a=j*6.283/6+shift*(k%2?-.7:1);arc(s.cx,s.cy,r,a,a+.22,.65*(1-s.frameRect),2,C.cyan,6);}}
 for(let i=0;i<144;i++){const a=i*6.283/144-Math.PI/2+(1-s.frameRect)*shift*.08,r=392;let len=i%12===0?14:i%3===0?8:4;line(s.cx+Math.cos(a)*(r-len),s.cy+Math.sin(a)*(r-len),s.cx+Math.cos(a)*r,s.cy+Math.sin(a)*r,C.cyan,(i%3===0?.7:.28)*(1-s.frameRect),1);}}
 if(s.frameRect>.03){ctx.globalAlpha*=s.frameRect;bracket(s.cx-520,s.cy-352,1040,704,C.cyan,.85,39,2);text('GEO / '+(s.city>.5?'LOCAL GRID':'ASIA PACIFIC'),s.cx-485,s.cy-315,12,C.cyan,.85);text('PROJECTION '+(s.tilt>.3?'OBLIQUE':'TANGENT'),s.cx+485,s.cy-315,12,C.cyan,.85,'right');for(let i=0;i<11;i++){const x=s.cx-450+i*90;line(x,s.cy+337,x,s.cy+327,C.cyan,.6);text((98+i*3).toFixed(0)+'°',x,s.cy+354,10,C.dim,.85,'center');}ctx.globalAlpha/=s.frameRect;}
 for(const dir of [-1,1]){line(s.cx-32,s.cy+dir*358,s.cx+32,s.cy+dir*358,C.cyan,.75);line(s.cx,s.cy+dir*350,s.cx,s.cy+dir*366,C.cyan,.75);}
ctx.restore();}
function sidePanels(s){const qt=Math.round(q*60)/60,boot=tween(s.t,.3,1.6,ease.expoOut),st=stateAt(qt);window.SEQSTATE={range:st.range,mag:st.mag};const slide=(1-s.side)*400;for(const side of [-1,1]){ctx.save();ctx.beginPath();if(side<0)ctx.rect(0,100,422,915);else ctx.rect(1498,100,422,915);ctx.clip();ctx.translate(side*slide,0);ctx.globalAlpha*=sstep(.35,1,s.side);panels(qt*2.4,boot,s.t>=12.05,{lon:st.lon,lat:st.lat});ctx.restore();}}
function drawHeader(s){header(Math.round(q*60)/60,1,s.t>=12.05);const caption=s.t<1.6?'OPTICS / POWER SEQUENCE':s.t<4.35?'GLOBAL SEARCH / SECTOR SWEEP':s.t<8.1?'CANDIDATE DISCRIMINATION':s.t<11.9?'BEIJING / TERMINAL ACQUISITION':s.t<15.6?'TARGET LOCK / VERIFICATION':'SOLUTION CONFIRMED / BEIJING';text(caption,954,116,12,C.cyan,.95,'center');
 const idx=s.t<1.6?1:s.t<4.35?2:s.t<8.1?3:s.t<11.9?4:s.t<15.6?5:6;for(let i=0;i<6;i++)line(816+i*47,1002,849+i*47,1002,i+1<=idx?C.cyan:C.dim,i+1<=idx?.95:.3,2);text('0'+idx+' / 06',954,1030,10,C.muted,.8,'center');}
function bootType(s){if(s.t>2)return;const x=tween(s.t,.2,1.05,ease.expoOut),carry=tween(s.t,1.05,1.75,ease.quintInOut);const size=lerp(116,17,carry),y=lerp(573,171,carry);ctx.save();ctx.globalAlpha*=sstep(.08,.26,s.t);text('SEARCH',lerp(735,954,carry),y,size,C.bright,.96,'center','display',600);ctx.globalAlpha*=1-carry;line(350,615,350+1220*x,615,C.cyan,.8,1.6);text('OPTICAL ARRAY / INITIALIZING',954,654,16,C.cyan,.9,'center');text('09',1518,651,82,C.cyan,.35,'center','display',500);ctx.restore();}
const candidates=[{name:'TOKYO',cn:'东京',loc:[139.6917,35.6895],code:'NRT / 01',a:5.75,b:6.65},{name:'SEOUL',cn:'首尔',loc:[126.978,37.5665],code:'ICN / 02',a:6.65,b:7.4},{name:'BEIJING',cn:'北京市',loc:BEIJING,code:'PEK / 03',a:7.4,b:18}];
function acquirePosition(s){if(s.t<5.75)return {x:s.cx,y:s.cy,size:210,visible:0};let ci=s.t<6.65?0:s.t<7.4?1:2,c=candidates[ci],prev=ci?candidates[ci-1]:c,pa=mapPoint(...prev.loc,s),pb=mapPoint(...c.loc,s),u=tween(s.t,c.a,c.a+.22,ease.expoOut);return{x:lerp(pa[0],pb[0],u),y:lerp(pa[1],pb[1],u),size:sample(s.t,[[5.75,174],[6.3,114,ease.expoOut],[6.65,174],[7.15,114,ease.expoOut],[7.4,174],[8.1,112],[9.1,250],[10,152],[11.5,152],[12.15,120,ease.expoOut],[13.7,120],[15.7,180,ease.expoOut],[18,180]]),visible:sstep(5.65,5.8,s.t),index:ci};}
function targetReticle(s){const r=acquirePosition(s);if(!r.visible)return r;ctx.save();ctx.globalAlpha*=r.visible;const locked=s.t>=12.05;ctx.shadowColor=C.cyan;ctx.shadowBlur=locked?17:7;bracket(r.x-r.size/2,r.y-r.size/2,r.size,r.size,C.bright,.97,Math.min(34,r.size*.2),locked?3.5:2);ctx.shadowBlur=0;line(r.x-24,r.y,r.x-7,r.y,C.cyan,.85);line(r.x+7,r.y,r.x+24,r.y,C.cyan,.85);line(r.x,r.y-24,r.x,r.y-7,C.cyan,.85);line(r.x,r.y+7,r.x,r.y+24,C.cyan,.85);arc(r.x,r.y,3,0,6.283,.9,1.5,C.bright);
 const c=candidates[r.index];if(s.t<8.1){text(c.code,r.x-r.size/2,r.y-r.size/2-13,12,C.cyan,.9);text(c.name,r.x,r.y+r.size/2+35,26,C.bright,.95,'center','display',600);const u=tween(s.t,c.a+.48,c.a+.62,ease.expoOut);if(r.index<2&&u>0){text('NO MATCH',r.x+112,r.y+6,22,C.amber,u,'left','display',600);line(r.x+50,r.y-21,r.x+74,r.y+3,C.amber,u,2);line(r.x+74,r.y-21,r.x+50,r.y+3,C.amber,u,2);}else if(r.index===2){text('MATCH 99.7%',r.x+112,r.y+6,19,C.cyan,sstep(7.6,7.8,s.t),'left','display',500);}}
 if(s.t>8.1&&s.t<11.9){text('PEK–03 / ACQUIRING',r.x-r.size/2,r.y-r.size/2-16,12,C.cyan,.9);text('MAG ×'+stateAt(Math.round(q*60)/60).mag.toFixed(1),r.x+r.size/2,r.y+r.size/2+24,13,C.bright,.9,'right');arc(r.x,r.y,r.size*.71,-s.t*.9,-s.t*.9+4.2,.65,1.4);}
 if(s.t>15.6){text('TGT–03  /  北京市',r.x-r.size/2,r.y-r.size/2-17,13,C.bright,.95,'left','cn');text('LOCK 100%',r.x+r.size/2,r.y+r.size/2+26,13,C.bright,.95,'right');}
ctx.restore();return r;}
function scanLabels(s){if(s.t<2.2||s.t>11.9)return;ctx.save();const a=win(2.1,2.5,4.05,4.4,s.t);ctx.globalAlpha*=a;text('SECTOR',465,310,16,C.cyan,.9);text(String(Math.min(9,Math.floor(q*4))).padStart(2,'0'),460,396,92,C.bright,.95,'left','display',600);text('SEARCH VECTOR',465,435,11,C.cyan,.9);text('39°54′ N / 116°24′ E',465,460,13,C.muted,.85);ctx.restore();
 const mapInfo=win(4.5,5.2,7.9,8.2,s.t);if(mapInfo){ctx.save();ctx.globalAlpha*=mapInfo;text('AREA DISCRIMINATION',954,855,14,C.cyan,.9,'center');for(let i=0;i<3;i++){let x=685+i*180;line(x,890,x+134,890,C.dim,.6,2);if(s.t>candidates[i].a)line(x,890,x+134,890,i<2?C.amber:C.cyan,.95,2);text(candidates[i].code,x+67,916,11,C.muted,.9,'center');}ctx.restore();}
 if(s.t>8.1&&s.t<11.9){text('RANGE COMPRESSION',954,879,12,C.cyan,.8,'center');text(stateAt(Math.round(q*60)/60).range.toFixed(1)+' KM',954,922,35,C.bright,.95,'center','display',500);}
}
function warningBand(s){if(s.t<11.88)return;const enter=tween(s.t,11.88,12.28,ease.expoOut),shrink=tween(s.t,13.7,14.65,ease.quintInOut);const x=954,y=lerp(547,185,shrink),w=lerp(963,530,shrink)*enter,h=lerp(126,54,shrink);ctx.save();
 const recoil=(spring((s.t-12.05)/1.8,.65,22)-1)*8*(1-shrink);ctx.translate(recoil,0);
 ctx.fillStyle='#160c03f0';ctx.fillRect(x-w/2,y-h/2,w,h);ctx.shadowColor=C.cyan;ctx.shadowBlur=12;line(x-w/2,y-h/2,x+w/2,y-h/2,C.cyan,.95,2.2);line(x-w/2,y+h/2,x+w/2,y+h/2,C.cyan,.95,2.2);bracket(x-w/2,y-h/2,w,h,C.bright,.85,22,2.4);ctx.shadowBlur=0;
 ctx.save();ctx.beginPath();ctx.rect(x-w/2,y-h/2,26,h);ctx.rect(x+w/2-26,y-h/2,26,h);ctx.clip();for(let k=-4;k<25;k++)line(x-w/2-12,y-h/2+k*12,x+w/2+18,y-h/2+k*12-(w+30),C.cyan,.75,3);ctx.restore();
 if(enter>.85){const a=sstep(12.0,12.3,s.t);text('目标锁定',lerp(x-224,x-124,shrink),y+lerp(17,9,shrink),lerp(51,23,shrink),C.bright,a,'center','cn',700);text('LOCKED',lerp(x+236,x+132,shrink),y+lerp(18,9,shrink),lerp(59,25,shrink),C.bright,a,'center','display',600);if(shrink<.9){text('警戒 / ALERT 03',x-224,y-36,12,C.cyan,a*(1-shrink),'center','cn');text('T A R G E T',x+236,y-36,12,C.cyan,a*(1-shrink),'center');}}
 const coordA=win(12.15,12.5,13.7,14.2,s.t);if(coordA>0){ctx.globalAlpha*=coordA;const yy=669;ctx.fillStyle='#100b04ef';ctx.fillRect(709,yy-34,490,76);bracket(709,yy-34,490,76,C.cyan,.95,21);text('COORD / 北京市',954,yy-12,11,C.cyan,.9,'center','cn');text('N39°54′  E116°24′',954,yy+21,28,C.bright,.98,'center','display',600);}ctx.restore();
 // A single impact ring, then decay; the centre remains the same target.
const hit=win(12.0,12.05,12.45,12.7,s.t);if(hit>0){const u=tween(s.t,12.0,12.65,ease.expoOut);arc(954,551,80+u*360,0,6.283,(1-u)*.85,2,C.cyan,12);}
}
function verify(s){const op=win(14.6,14.8,15.7,16.0,s.t);if(!op)return;ctx.save();ctx.globalAlpha*=op;const u=tween(s.t,14.65,15.55,ease.expoOut),num=Math.min(100,Math.floor(tween(Math.round(q*60)/60*1.8,14.65,15.55,ease.expoOut)*100));text('VERIFYING SOLUTION',954,404,14,C.cyan,.95,'center');text(String(num).padStart(3,'0')+'%',954,512,90,C.bright,.95,'center','display',600);for(let i=0;i<12;i++){ctx.fillStyle=i/12<u?C.cyan:'#66381255';ctx.fillRect(729+i*39,568,26,5);}text('GEO HASH / SIGNAL / OPTICS / TRACK',954,618,13,C.cyan,.85,'center');ctx.restore();}
function finalLabels(s){const op=sstep(15.75,16.2,s.t);if(!op)return;ctx.save();ctx.globalAlpha*=op;path([[1062,584],[1130,645],[1318,645]],C.cyan,.85,1.2);text('BEIJING',1138,632,38,C.bright,.98,'left','display',600);text('北京市 · 目标已锁定',1138,673,19,C.cyan,.95,'left','cn');text('39.9042°N / 116.4074°E',1138,701,12,C.muted,.9);text('TRACK STABLE / 100%',954,827,15,C.cyan,.95,'center');text('SOLUTION PEK–03',954,854,11,C.muted,.8,'center');ctx.restore();}
function filmSeek(time){q=clamp(time,0,DURATION);const s=stateAt(q);theme(s);drawBackdrop(s);drawEarth(s);drawMap(s);drawInstrument(s);sidePanels(s);drawHeader(s);bootType(s);scanLabels(s);const reticle=targetReticle(s);warningBand(s);verify(s);finalLabels(s);
 if(s.t<.5){const p=tween(s.t,.025,.5,ease.expoOut),hh=H*p;ctx.fillStyle='#02080b';ctx.fillRect(0,0,W,(H-hh)/2);ctx.fillRect(0,(H+hh)/2,W,H);line(0,(H-hh)/2,W,(H-hh)/2,C.cyan,(1-p)*.9,2);}
 window.__state={time:q,stage:s.t<1.6?'boot':s.t<4.35?'orbital':s.t<8.1?'search':s.t<11.9?'city':s.t<14.6?'lock':s.t<15.75?'verify':'confirmed',...s,reticle,beijing:BEIJING};return true;}
window.__seek=filmSeek;
window.__meta={dur:10,fps:60,cuts:[],inFrame:{reticle:[3.3,10,'whole']}};
window.__track=t=>{const s=window.__state,r=s.reticle;return{reticle:{x:r.x-r.size/2,y:r.y-r.size/2,w:r.size,h:r.size,op:r.visible},lens:{x:s.cx-404,y:s.cy-404,w:808,h:808,op:1}};};
window.__motion=(a,b)=>{let x=stateAt(a),y=stateAt(b);return Math.max(Math.abs(x.cx-y.cx),Math.abs(x.globeScale-y.globeScale)*400,Math.abs(x.lon-y.lon)*6*(1-x.morph),Math.abs(Math.log(x.zoom/y.zoom))*650,Math.abs(x.morph-y.morph)*380,Math.abs(x.tilt-y.tilt)*600,Math.abs(tween(x.t,13.7,14.65,ease.quintInOut)-tween(y.t,13.7,14.65,ease.quintInOut))*380,(a<7?Math.abs(b-a)*540:0));};
window.__events=()=>[{t:.03,kind:'power'},{t:.9,kind:'lens'},{t:1.55,kind:'orbit'},{t:2.45,kind:'unfold'},{t:3.25,kind:'reject'},{t:3.72,kind:'reject'},{t:4.22,kind:'match'},{t:5.18,kind:'dive'},{t:6.68,kind:'lock'},{t:8.2,kind:'verify'},{t:9,kind:'confirm'}];
function fit(){document.getElementById('stage').style.transform=`translate(-50%,-50%) scale(${Math.min(innerWidth/W,innerHeight/H)})`;}
addEventListener('resize',fit);fit();const params=new URLSearchParams(location.search);let playing=params.has('play'),start=0,offset=0,raf=0;const scrub=document.getElementById('scrub'),clock=document.getElementById('clock');scrub.max=9.999;
function loop(now){if(!playing)return;const t=Math.min(9.999,offset+(now-start)/1000);filmSeek(t);scrub.value=t;clock.textContent=t.toFixed(2)+' / 10.00';if(t>=9.998){playing=false;document.getElementById('toggle').textContent='播放';return;}raf=requestAnimationFrame(loop);}
function playAt(t=0){cancelAnimationFrame(raf);offset=t;start=performance.now();playing=true;document.getElementById('toggle').textContent='暂停';raf=requestAnimationFrame(loop);}
document.getElementById('toggle').onclick=()=>{if(playing){playing=false;cancelAnimationFrame(raf);document.getElementById('toggle').textContent='播放';}else playAt(+scrub.value);};document.getElementById('restart').onclick=()=>playAt(0);scrub.oninput=()=>{playing=false;cancelAnimationFrame(raf);filmSeek(+scrub.value);clock.textContent=(+scrub.value).toFixed(2)+' / 10.00';document.getElementById('toggle').textContent='播放';};if(params.has('controls'))document.body.classList.add('controls');
window.__ready=window.__ready.then(()=>{filmSeek(params.has('t')?+params.get('t'):0);if(playing)playAt(0);return true;});
})();
