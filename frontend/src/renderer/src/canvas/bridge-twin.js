(function(){
if(customElements.get('bridge-twin'))return;
const SRC='three'; /* E1 offline fix: vendored from npm three@0.160.0 (was jsdelivr CDN). The dynamic import below uses the literal 'three' so Vite bundles it into the app. */
let T=null;
const cl=t=>t<0?0:t>1?1:t,eio=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const eob=t=>{const c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)};
const bnc=t=>{const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d){t-=1.5/d;return n*t*t+.75}if(t<2.5/d){t-=2.25/d;return n*t*t+.9375}t-=2.625/d;return n*t*t+.984375};
const SEV=['#4fae7f','#d9b443','#e6893c','#e0442f'];
const ACC=0x2fb3cc;
const TH={
light:{bg:0xe4e6e7,ground:0xeef0f1,grid:0xc3c8cb,conc:0xd8d5ce,deck:0xcdc9c2,asph:0x4a4c4f,bar:0xe2dfd9,sub:0xcbc8c1,emb:0xd6d4ce,water:0xbfc8cc,edge:0x4f555a,edgeO:.2,ring:0x1b1d1f,hemi:[0xffffff,0xb3afa7,1.15],key:1.8,ink:'#16181a',mut:'#5d6368',card:'rgba(255,255,255,.8)',cardB:'rgba(22,24,26,.09)',line:'rgba(22,24,26,.45)',acc:'#127f94',bgA:'rgba(228,230,231,.85)'},
dark:{bg:0x0a0b0c,ground:0x0f1113,grid:0x272b2e,conc:0x7d7f80,deck:0x6d6f70,asph:0x1d1e20,bar:0x8a8c8d,sub:0x5d5f61,emb:0x34373a,water:0x0b171c,edge:0xdfe6ea,edgeO:.3,ring:0xe9edf0,hemi:[0xa5b6c2,0x141619,.6],key:1.6,ink:'#eef1f3',mut:'#9aa3a9',card:'rgba(18,20,22,.74)',cardB:'rgba(255,255,255,.1)',line:'rgba(238,241,243,.5)',acc:'#3fc1d9',bgA:'rgba(10,11,12,.8)'}
};
const ST={
dashboard:{pos:[40,24,46],tgt:[0,6,0],auto:.06,traffic:2,tAmp:.12},
config:{pos:[30,15,36],tgt:[0,6.5,0],ex:1,blue:1},
analysis:{pos:[-30,12,30],tgt:[0,7,0],traffic:1,tAmp:.9,heat:'stress'},
prestress:{pos:[13,9.5,17],tgt:[-2,7,0],xray:1,camber:1},
baseline:{pos:[0,8,46],tgt:[0,7,0],modes:1,scan:1},
inspection:{pos:[19,3.4,21],tgt:[0,6.6,0],traffic:2,tAmp:.08},
ndt:{pos:[-17,4.6,19],tgt:[0,7,0],heat:'upv'},
monitoring:{pos:[5,2.4,24],tgt:[0,7,0],traffic:2,tAmp:.14,sensors:1},
synthetic:{pos:[13,6,19],tgt:[2,7,0],sag:1,damage:1,heat:'cond'},
features:{pos:[-34,20,34],tgt:[0,6,0],auto:.04,sensors:1,traffic:2,tAmp:.12},
ml:{pos:[24,11,24],tgt:[0,7,0],heat:'cond',damage:1,sag:.5},
maintenance:{pos:[30,18,32],tgt:[0,6,0],heat:'cond',auto:.03},
report:{pos:[0,7.2,64],tgt:[0,6.5,0]}
};
const CSS=`:host{display:block;position:relative;overflow:hidden;width:100%;height:100%;--mono:'Geist Mono',ui-monospace,Menlo,monospace}
canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;outline:none}
svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.ln{stroke:var(--line);stroke-width:1;opacity:0;transition:opacity .6s ease}.ln.on{opacity:1}
.L{position:absolute;inset:0;pointer-events:none}
.it{position:absolute;left:0;top:0;opacity:0;transition:opacity .6s ease;will-change:transform}.it.on{opacity:1}
.card{position:absolute;background:var(--card);-webkit-backdrop-filter:blur(12px) saturate(1.2);backdrop-filter:blur(12px) saturate(1.2);border:1px solid var(--cardB);border-radius:10px;padding:7px 10px 8px;white-space:nowrap;color:var(--ink);box-shadow:0 8px 24px rgba(0,0,0,.08)}
.k{font-size:11px;line-height:14px;color:var(--mut);display:flex;align-items:center;gap:6px}
.k i{width:7px;height:7px;border-radius:50%;flex:none}
.v{font-family:var(--mono);font-size:16px;line-height:20px;margin-top:2px;font-variant-numeric:tabular-nums;display:flex;align-items:baseline;gap:5px}
.v b{font-weight:500}.v span{font-size:11px;color:var(--mut)}
.pin .k,.pin .v{justify-content:center}
.dot{position:absolute;left:-6px;top:-6px;width:12px;height:12px;border-radius:50%;border:1.5px solid var(--ink);background:var(--card);box-sizing:border-box}
.dot::after{content:"";position:absolute;inset:-7px;border-radius:50%;border:1px solid var(--ink);animation:pl 1.8s ease-out infinite}
@keyframes pl{from{transform:scale(.4);opacity:.8}to{transform:scale(1.5);opacity:0}}
.dim{position:absolute;transform:translate(-50%,-50%);font-family:var(--mono);font-size:11px;letter-spacing:.06em;color:var(--acc);white-space:nowrap;background:var(--bgA);padding:2px 6px;border-radius:4px}`;

class BridgeTwin extends HTMLElement{
constructor(){super();this._p={stage:'dashboard',theme:'light',replay:'0',paused:'false',geom:''}}
static get observedAttributes(){return['stage','theme','replay','paused','geom','data']}
attributeChangedCallback(n,o,v){this._set(n,v)}
get stage(){return this._p.stage}set stage(v){this._set('stage',v)}
get theme(){return this._p.theme}set theme(v){this._set('theme',v)}
get replay(){return this._p.replay}set replay(v){this._set('replay',v)}
get paused(){return this._p.paused}set paused(v){this._set('paused',v)}
get geom(){return this._p.geom}set geom(v){this._set('geom',v)}
_set(n,v){if(v==null)return;v=String(v);if(this._p[n]===v)return;this._p[n]=v;
 if(n==='data'){try{this._data=JSON.parse(v)}catch(e){this._data={}}}
 if(!this.ok)return;
 if(n==='stage')this._enterStage();else if(n==='theme')this._theme();else if(n==='replay')this._intro();else if(n==='geom'){clearTimeout(this._gt);this._gt=setTimeout(()=>this._rebuild(),120)}else if(n==='data')this._refreshLabelValues()}
// Update static callout values in place (no DOM rebuild / re-animation) when the
// real `data` channel changes. Live (fn-driven) labels read this._data per frame.
_refreshLabelValues(){if(!this.lbs)return;const defs=this._labelDefs(this._p.stage);
 for(let i=0;i<this.lbs.length;i++){const o=this.lbs[i],d=defs[i];if(!d||d.t==='dim'||d.live)continue;
  o.d.v=d.v;o.d.u=d.u;const b=o.el.querySelector('.v b');if(b&&b.textContent!==String(d.v))b.textContent=d.v;
  const s=o.el.querySelector('.v span');if(s)s.textContent=d.u||''}}
connectedCallback(){
 if(!this.shadowRoot){const s=this.attachShadow({mode:'open'});s.innerHTML=`<style>${CSS}</style><canvas></canvas><svg></svg><div class="L"></div>`}
 this._alive=true;
 if(this.ok){this._loop();return}
 if(this._loading)return;this._loading=true;
 import('three').then(m=>{T=m;this._setup();this.ok=true;this._theme();this._intro();this._loop()}).catch(e=>console.error('bridge-twin: three.js failed to load',e));
}
disconnectedCallback(){this._alive=false;cancelAnimationFrame(this._raf)}
_loop(){cancelAnimationFrame(this._raf);const f=now=>{if(!this._alive)return;this._raf=requestAnimationFrame(f);this._tick(now)};this._raf=requestAnimationFrame(f)}
_cfg(){return ST[this._p.stage]||ST.dashboard}

_setup(){
 const sr=this.shadowRoot,cv=sr.querySelector('canvas');this.svg=sr.querySelector('svg');this.LD=sr.querySelector('.L');
 const R=this.R=new T.WebGLRenderer({canvas:cv,antialias:true});
 R.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));R.shadowMap.enabled=true;R.shadowMap.type=T.PCFSoftShadowMap;
 const sc=this.sc=new T.Scene();sc.fog=new T.Fog(0xffffff,90,210);
 this.cam=new T.PerspectiveCamera(32,1,.5,700);
 this.hemi=new T.HemisphereLight(0xffffff,0x888888,1);sc.add(this.hemi);
 const k=this.key=new T.DirectionalLight(0xffffff,1.6);k.position.set(34,60,26);k.castShadow=true;k.shadow.mapSize.set(2048,2048);
 Object.assign(k.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:10,far:170});k.shadow.bias=-.0004;k.shadow.normalBias=.03;sc.add(k);
 const f=this.fill=new T.DirectionalLight(0xffffff,.35);f.position.set(-30,20,-30);sc.add(f);
 this.c={ex:0,blue:0,xray:0,heat:0,camber:0,sag:0,modes:0,tAmp:0,sensors:0,damage:0,scan:0};
 this.time=0;this.introT=0;this.stageT=0;this.parts=[];this.defs=[];this.lbs=[];this.tendons=[];this.sparks=[];this._tmp=new T.Vector3();
 this.dAt=()=>0;
 this._build();
 let drag=null;
 cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};this.drag=true;cv.setPointerCapture(e.pointerId);cv.style.cursor='grabbing';this.fly=null;this.userT=performance.now()});
 cv.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY};this.sph.th-=dx*.005;this.sph.ph=Math.max(.12,Math.min(1.62,this.sph.ph-dy*.004));this.userT=performance.now()});
 const up=()=>{drag=null;this.drag=false;cv.style.cursor='grab'};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
 cv.addEventListener('wheel',e=>{e.preventDefault();this.fly=null;this.userT=performance.now();this.sph.r=Math.max(10,Math.min(150,this.sph.r*(1+e.deltaY*.001)))},{passive:false});
 cv.addEventListener('dblclick',()=>this._flyTo(this._cfg(),1.4));
 new ResizeObserver(()=>this._resize()).observe(this);this._resize();
}

_build(){
 let P={};try{P=JSON.parse(this._p.geom||'{}')}catch(e){}
 P=this.P=Object.assign({span:33,depth:1.65,web:.3,tfw:1.1,tft:.18,bfw:.75,bft:.25,slab:.22,nG:5,sp:3.2},P);
 const nG=this.nG=Math.max(3,Math.min(8,Math.round(P.nG))),sp=P.sp,L=this.L=P.span,W=this.W=(nG-1)*sp+3.2,D=this.D=P.depth,Td=P.slab,yB=this.yB=6,y0=this.y0=6.25,yT=this.yT=y0+D+Td;
 const gz=this.gz=[...Array(nG)].map((_,i)=>(i-(nG-1)/2)*sp);
 const sc=this.sc,V=(x,y,z)=>new T.Vector3(x,y,z),M=this.M={};
 const std=(o={})=>new T.MeshStandardMaterial(Object.assign({roughness:.86,metalness:0},o));
 M.conc=std({vertexColors:true});M.deck=std();M.asph=std({roughness:.95});M.bar=std();M.sub=std();M.emb=std();M.cross=std();
 M.edge=new T.LineBasicMaterial({transparent:true,opacity:.2});
 M.ground=std({roughness:1});M.water=std({roughness:.3,metalness:.1});
 M.white=new T.MeshBasicMaterial({color:0xffffff});M.pin=new T.MeshBasicMaterial({color:0x111111});
 M.tyre=std({color:0x1a1b1c,roughness:.9});M.glassV=std({color:0x1d2226,roughness:.2,metalness:.5});
 M.acc=new T.MeshBasicMaterial({color:ACC});
 M.tendon=new T.MeshBasicMaterial({color:ACC,transparent:true,opacity:0});
 M.spark=new T.PointsMaterial({color:0xffffff,size:.34,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});
 this.structMats=[M.conc,M.deck,M.asph,M.bar,M.sub,M.emb,M.cross];this.xrMats=[M.conc,M.deck,M.asph,M.bar,M.cross];
 const part=(o,opt={})=>{sc.add(o);const p={o,base:o.position.clone(),bs:o.scale.clone(),ex:opt.ex?V(...opt.ex):V(0,0,0),it:opt.it||null,h:opt.h||0,def:!!opt.def};this.parts.push(p);return p};
 const edges=m=>{const e=new T.LineSegments(new T.EdgesGeometry(m.geometry,25),M.edge);m.add(e);return e};
 const deformable=g=>{const b=Float32Array.from(g.attributes.position.array);this.defs.push({g,b});return b};
 const mesh=(geo,mat,x,y,z,sh=true)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=sh;m.receiveShadow=true;return m};
 const extX=(shape,steps=48)=>{const g=new T.ExtrudeGeometry(shape,{depth:L,steps,bevelEnabled:false});g.rotateY(Math.PI/2);g.translate(-L/2,0,0);return g};
 const shp=pts=>{const s=new T.Shape();pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));return s};

 const gr=new T.Mesh(new T.CircleGeometry(95,128),M.ground);gr.rotation.x=-Math.PI/2;gr.receiveShadow=true;sc.add(gr);
 const grid=this.grid=new T.GridHelper(190,95,0xffffff,0xffffff);grid.material.transparent=true;grid.material.opacity=.35;grid.position.y=.01;sc.add(grid);
 const wat=mesh(new T.PlaneGeometry(L-.8,190),M.water,0,.03,0,false);wat.rotation.x=-Math.PI/2;sc.add(wat);

 const ringG=new T.Group();M.ring=new T.MeshBasicMaterial({transparent:true,opacity:.5,side:T.DoubleSide});
 const r1=new T.Mesh(new T.RingGeometry(36,36.16,160),M.ring);r1.rotation.x=-Math.PI/2;ringG.add(r1);
 const tk=[];for(let i=0;i<120;i++){const a=i/120*Math.PI*2,r2=i%10?37.4:38.6;tk.push(Math.cos(a)*36.8,0,Math.sin(a)*36.8,Math.cos(a)*r2,0,Math.sin(a)*r2)}
 const tg=new T.BufferGeometry();tg.setAttribute('position',new T.Float32BufferAttribute(tk,3));M.tick=new T.LineBasicMaterial({transparent:true,opacity:.4});ringG.add(new T.LineSegments(tg,M.tick));
 ringG.position.y=.06;this.ring=ringG;part(ringG,{it:{type:'pop',d:0,t:1.2}});

 for(const s of[-1,1]){
  const emb=mesh(new T.BoxGeometry(16,yT,W),[M.emb,M.emb,M.asph,M.emb,M.emb,M.emb],s*(L/2+8.5),yT/2,0);edges(emb);part(emb,{ex:[s*6,0,0],it:{type:'rise',d:.15,t:1},h:yT+.5});
  const ab=mesh(new T.BoxGeometry(2,yB,W+1),M.sub,s*(L/2+.6),yB/2,0);edges(ab);part(ab,{ex:[s*3.2,0,0],it:{type:'rise',d:.45,t:1},h:yB+.5});
  const bw=mesh(new T.BoxGeometry(.4,yT-yB,W),M.sub,s*(L/2+.3),(yB+yT)/2,0);edges(bw);part(bw,{ex:[s*3.2,0,0],it:{type:'rise',d:.55,t:1},h:yT+.5});
  gz.forEach((z,i)=>{const b=mesh(new T.BoxGeometry(.6,.25,.7),M.sub,s*(L/2-.3),yB+.125,z);part(b,{ex:[0,-.8,0],it:{type:'pop',d:1+i*.05,t:.45}})});
 }

 const bf=P.bfw,tb=P.bft,tw=P.web,bt=P.tfw,tt=P.tft;
 const sI=shp([[-bf/2,0],[bf/2,0],[bf/2,tb],[tw/2,tb+.15],[tw/2,D-tt-.12],[bt/2,D-tt],[bt/2,D],[-bt/2,D],[-bt/2,D-tt],[-tw/2,D-tt-.12],[-tw/2,tb+.15],[-bf/2,tb]]);
 this.girders=[];
 const ends=[.27*D,.52*D,.76*D],mids=[.08*D,.08*D,.18*D],zo=[-bf*.27,bf*.27,0];
 gz.forEach((z,i)=>{
  const geo=extX(sI);geo.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*3).fill(1),3));
  const m=mesh(geo,M.conc,0,y0,z);const e=edges(m);m.userData.b=deformable(geo);deformable(e.geometry);
  part(m,{it:{type:'drop',d:1.3+i*.16,t:.9}});this.girders.push(m);
  m.userData.curves=[];
  for(let c=0;c<3;c++){const pts=[];for(let j=0;j<=24;j++){const s=j/24,q=(2*s-1)**2;pts.push(V(-L/2+s*L,mids[c]+(ends[c]-mids[c])*q,zo[c]*(1-q)))}
   const cu=new T.CatmullRomCurve3(pts);m.userData.curves.push(cu);const tube=new T.Mesh(new T.TubeGeometry(cu,72,.05,6),M.tendon);tube.visible=false;m.add(tube);deformable(tube.geometry);this.tendons.push(tube)}
  const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(new Float32Array(72),3));const sp=new T.Points(pg,M.spark);sp.visible=false;sp.frustumCulled=false;m.add(sp);this.sparks.push(sp);
 });

 const dk=mesh(new T.BoxGeometry(L,Td,W,48,1,1),[M.deck,M.deck,M.asph,M.deck,M.deck,M.deck],0,y0+D+Td/2,0);const de=edges(dk);deformable(dk.geometry);deformable(de.geometry);part(dk,{ex:[0,3.2,0],it:{type:'grow',d:2.6,t:1.1}});
 const sb=shp([[0,0],[.5,0],[.47,.08],[.3,.3],[.18,.9],[0,.9]]);
 for(const s of[-1,1]){
  const fp=mesh(new T.BoxGeometry(L,.25,1.5,48,1,1),M.bar,0,yT+.125,s*(W/2-1.25));const fe=edges(fp);deformable(fp.geometry);deformable(fe.geometry);part(fp,{ex:[0,3.6,s*.6],it:{type:'grow',d:3.1,t:.8}});
  const bg=extX(sb);const br=mesh(bg,M.bar,0,yT,s*W/2);if(s<0)br.scale.z=-1;const be=edges(br);deformable(bg);deformable(be.geometry);part(br,{ex:[0,4.6,s*1.4],it:{type:'grow',d:3.3,t:.8}});
 }
 [-L/2+.4,-L/4,0,L/4,L/2-.4].forEach((x,i)=>{const cg=mesh(new T.BoxGeometry(.3,D-.55,gz[gz.length-1]-gz[0]),M.cross,x,y0+.3+(D-.55)/2,0);edges(cg);part(cg,{ex:[0,-2.6,0],it:{type:'growz',d:2.2+i*.06,t:.5},def:true})});
 for(const z of[-2,2])for(let x=-L/2+1.5;x+3<=L/2-1;x+=6){const d=mesh(new T.BoxGeometry(3,.02,.15),M.white,x+1.5,yT+.012,z,false);part(d,{ex:[0,3.2,0],it:{type:'pop',d:3.5+(x+L/2)/50,t:.3},def:true})}

 this.veh=[];const VG=new T.Group();sc.add(VG);
 const box=(w,h,d,mat,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;return m};
 const wg=new T.CylinderGeometry(.42,.42,.3,14);wg.rotateX(Math.PI/2);
 const car=(col,len=4.4)=>{const g=new T.Group();g.add(box(len,.75,1.8,std({color:col,roughness:.35,metalness:.3}),0,.75,0));g.add(box(len*.5,.62,1.62,M.glassV,-len*.05,1.43,0));for(const a of[-1,1])for(const c of[-1,1]){const w=new T.Mesh(wg,M.tyre);w.position.set(a*len*.32,.42,c*.85);g.add(w)}return g};
 const truck=(cab,body,len)=>{const g=new T.Group();g.add(box(2.4,2.4,2.5,std({color:cab,roughness:.5}),len/2-1.2,1.7,0));g.add(box(len-2.6,2.8,2.6,std({color:body,roughness:.7}),-1.3,1.9,0));const n=Math.max(2,Math.round(len/3));for(let i=0;i<=n;i++)for(const c of[-1,1]){const w=new T.Mesh(wg,M.tyre);w.position.set(len/2-1-i*(len-2)/n,.42,c*1.05);g.add(w)}return g};
 const add=(g,z,dir,spd,x,w,heavy)=>{VG.add(g);g.rotation.y=dir>0?0:Math.PI;g.visible=false;this.veh.push({g,z,dir,spd,x,w,heavy,on:false})};
 add(truck(0x2b2d30,0xf2f2f0,15),-4,1,5,-20,1,true);
 add(car(0xcfd3d6),-4,1,12,10,.12);
 add(car(0x2b2d30),0,1,13.5,-30,.12);
 add(truck(0x7a7f84,0xdedcd8,10),0,1,9,5,.5);
 add(car(0xf4f4f2),0,1,13.5,28,.12);
 add(car(0x9aa0a6),4,-1,12.5,0,.12);
 add(car(0x2b2d30),4,-1,12.5,-24,.12);

 this.sens=[];const SG=this.SG=new T.Group();SG.visible=false;sc.add(SG);
 const sg=new T.SphereGeometry(.17,16,12),rg=new T.RingGeometry(.3,.4,40);rg.rotateX(Math.PI/2);
 [1,nG-2].forEach(gi=>[-L/4,0,L/4].forEach(x=>{const m=new T.Mesh(sg,M.acc);m.position.set(x,y0-.12,gz[gi]);SG.add(m);const r=new T.Mesh(rg,new T.MeshBasicMaterial({color:ACC,transparent:true,side:T.DoubleSide,depthWrite:false}));SG.add(r);this.sens.push({m,r,x,z:gz[gi]})}));

 this.dz=new T.Mesh(new T.BoxGeometry(6,.7,.95),new T.MeshBasicMaterial({color:0xe0442f,transparent:true,opacity:0,depthWrite:false}));this.dz.position.set(0,y0+.33,gz[gz.length-1]);this.dz.visible=false;sc.add(this.dz);
 this.dl=new T.PointLight(0xe0442f,0,14,2);this.dl.position.set(0,y0-1,gz[gz.length-1]+1.6);sc.add(this.dl);
 this.scan=new T.Mesh(new T.PlaneGeometry(W+3,5),new T.MeshBasicMaterial({color:ACC,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));this.scan.rotation.y=Math.PI/2;this.scan.position.y=y0+1.2;this.scan.visible=false;sc.add(this.scan);

 const dv=[],seg=(a,b)=>dv.push(...a,...b);
 const zs=W/2+2.2,ys=y0-.4;seg([-L/2,ys,zs],[L/2,ys,zs]);seg([-L/2,ys-.4,zs],[-L/2,ys+.4,zs]);seg([L/2,ys-.4,zs],[L/2,ys+.4,zs]);
 const xd=-L/2-.8,zd=gz[gz.length-1];seg([xd,y0,zd],[xd,y0+D,zd]);seg([xd-.3,y0,zd],[xd+.3,y0,zd]);seg([xd-.3,y0+D,zd],[xd+.3,y0+D,zd]);
 const xs=L/2+.9,yss=y0-1.1;seg([xs,yss,gz[0]],[xs,yss,gz[gz.length-1]]);gz.forEach(z=>seg([xs,yss-.3,z],[xs,yss+.3,z]));
 const dg=new T.BufferGeometry();dg.setAttribute('position',new T.Float32BufferAttribute(dv,3));M.dim=new T.LineBasicMaterial({color:ACC,transparent:true,opacity:0});this.dims=new T.LineSegments(dg,M.dim);sc.add(this.dims);

 this.PG=new T.Group();sc.add(this.PG);
 this.pinG=new T.CylinderGeometry(.035,.035,1,6);this.pinG.translate(0,.5,0);this.topG=new T.SphereGeometry(.15,12,10);this.baseG=new T.RingGeometry(.22,.32,28);this.baseG.rotateX(-Math.PI/2);
 this.RAMP=SEV.map(c=>new T.Color(c));this.WHITE=new T.Color(1,1,1);
}

_rebuild(){if(!this.ok)return;const keep=new Set([this.hemi,this.key,this.fill]);[...this.sc.children].forEach(o=>{if(keep.has(o))return;this.sc.remove(o);o.traverse(n=>{n.geometry&&n.geometry.dispose()})});
 this.parts=[];this.defs=[];this.tendons=[];this.sparks=[];this._tab=null;this._wd=true;this._build();this._theme();this._heatCols();this._buildLabels(false);this.stageT=Math.max(this.stageT,5)}
_ramp(h){h=cl(h)*3;const i=Math.min(2,Math.floor(h)),f=h-i;return this.RAMP[i].clone().lerp(this.RAMP[i+1],f)}
_heatCols(){const k=this.hk,o=this.nG-1;if(!k)return;const L=this.L,D=this.D;
 this.hcol=this.girders.map((m,gi)=>{const p=m.userData.b,n=p.length/3,out=new Float32Array(n*3);
  for(let i=0;i<n;i++){const x=p[i*3],y=p[i*3+1],s=(x+L/2)/L;let h;
   if(k==='stress')h=4*s*(1-s)*(.2+.8*(1-y/D));
   else if(k==='upv')h=.08+.05*Math.sin(s*23+gi*2)+(gi===o?.82*Math.exp(-(((s-.55)/.08)**2)):0)+(gi===o-1?.38*Math.exp(-(((s-.22)/.07)**2)):0);
   else h=.05+(gi===o?.92:gi===o-1?.42:gi===o-2?.12:0)*Math.exp(-(((s-.5)/.13)**2));
   const c=this._ramp(h);out[i*3]=c.r;out[i*3+1]=c.g;out[i*3+2]=c.b}return out});this._lh=-1}

_theme(){const th=this.th=TH[this._p.theme]||TH.light,M=this.M;
 this.R.setClearColor(th.bg,1);this.sc.fog.color.set(th.bg);
 this.concC=new T.Color(th.conc);M.deck.color.set(th.deck);M.cross.color.set(th.deck);M.bar.color.set(th.bar);M.sub.color.set(th.sub);M.emb.color.set(th.emb);M.asph.color.set(th.asph);
 M.ground.color.set(th.ground);M.water.color.set(th.water);M.edge.color.set(th.edge);this.grid.material.color.set(th.grid);M.ring.color.set(th.ring);M.tick.color.set(th.ring);M.pin.color.set(th.ink);
 M.spark.color.set(this._p.theme==='dark'?0xffffff:ACC);M.spark.blending=this._p.theme==='dark'?T.AdditiveBlending:T.NormalBlending;M.spark.needsUpdate=true;
 this.hemi.color.set(th.hemi[0]);this.hemi.groundColor.set(th.hemi[1]);this.hemi.intensity=th.hemi[2];this.key.intensity=th.key;
 const s=this.style;['ink','mut','card','cardB','line','acc','bgA'].forEach(k=>s.setProperty('--'+k,th[k]));this._lh=-1}

_sph(cfg){const d=new T.Vector3(...cfg.pos).sub(new T.Vector3(...cfg.tgt)),r=d.length();return{th:Math.atan2(d.x,d.z),ph:Math.acos(d.y/r),r,tgt:new T.Vector3(...cfg.tgt)}}
_flyTo(cfg,dur,intro){const to=this._sph(cfg),from={th:this.sph.th,ph:this.sph.ph,r:this.sph.r,tgt:this.tgt.clone()};let d=to.th-from.th;d=((d+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;to.th=from.th+d;this.fly={from,to,t:0,dur,intro}}
_intro(){this.introT=0;this.stageT=0;this.sph={th:-2.4,ph:.55,r:125};this.tgt=new T.Vector3(0,3,0);this.hk=this._cfg().heat||null;this.c.heat=0;this._heatCols();this._flyTo(this._cfg(),5.2,true);this._buildLabels(true)}
_enterStage(){const cfg=this._cfg();this._flyTo(cfg,1.9);this.stageT=0;if(cfg.heat&&cfg.heat!==this.hk){this.c.heat=0;this.hk=cfg.heat;this._heatCols()}this._buildLabels(false)}

defl(x){const L=this.L,u=x+L/2;if(u<=0||u>=L)return 0;const c=this.c,s=u/L;let d=0;
 if(c.tAmp>.0005)for(const v of this.veh){if(!v.on)continue;const a=v.x+L/2;if(a<=0||a>=L)continue;const b=L-a;const f=u<=a?b*u*(L*L-b*b-u*u):a*(L-u)*(L*L-a*a-(L-u)*(L-u));d-=c.tAmp*v.w*f*8/(L*L*L*L)}
 if(c.modes>.0005){const n=this.modeN||1;d+=c.modes*(.8/Math.sqrt(n))*Math.sin(n*Math.PI*s)*Math.sin(this.time*(this.modeW||3))}
 if(c.camber>.0005)d+=c.camber*.3*4*s*(1-s);
 if(c.sag>.0005)d-=c.sag*(.25*4*s*(1-s)+.35*Math.exp(-(((s-.5)/.12)**2)));
 return d}

_labelDefs(st){const{L,W,yT,y0,yB,D,gz}=this,G5=gz[gz.length-1],G4=gz[gz.length-2];
 const P=(k,v,u,x,z,h,sev)=>({t:'pin',a:[x,yT,z],h,k,v,u,sev});
 const C=(k,v,u,a,dx,dy,sev,live)=>({t:'call',a,dx,dy,k,v,u,sev,live});
 const V=(k,f)=>(this._data&&this._data[k]!=null?String(this._data[k]):f); // real value from the data channel, else design default
 const acc=i=>function(){return(.028+.006*i+.02*Math.abs(Math.sin(this.time*5.3+i*1.7))*Math.abs(Math.sin(this.time*1.1+i))).toFixed(3)};
 switch(st){
 case'dashboard':return[P('Baseline f₁',V('f1','3.21'),'Hz',-11,-3,6.5),P('Pₑ per girder',V('peGirder','6,310'),'kN',-3.5,3,4.8),P('Mid-span δ',V('delta','18.4'),'mm',4,-2.5,7.2),P('UPV mean',V('upv','4.31'),'km/s',11.5,3.5,5.4),P('Condition',V('cond','Minor'),V('conf','0.82'),0,6,9,1)];
 case'config':return[{t:'dim',a:[0,y0-.4,W/2+2.2],v:'SPAN '+L.toFixed(3),fix:1},{t:'dim',a:[-L/2-.8,y0+D/2,G5],v:'D '+D.toFixed(3),fix:1},{t:'dim',a:[L/2+.9,y0-1.1,0],v:(gz.length-1)+' × '+this.P.sp.toFixed(3),fix:1},C('I-girder · M45',(this.P.web*1000).toFixed(0),'mm web',[L/2-.5,y0+D*.6,G5+.4],60,-50),C('Deck slab',(this.P.slab*1000).toFixed(0),'mm',[L/2-6,yT+3.2,0],70,-60)];
 case'analysis':return[C('IRC Class 70R','700','kN',()=>{const v=this.veh[0];return this._tmp.set(v.x,yT+this.dAt(v.x)+3.4,v.z)},50,-60),C('Mid-span δ','18.4','mm',[0,y0,G5+.4],60,50,null,function(){return Math.max(0,-this.dAt(0)/Math.max(.01,this.c.tAmp)*18.4).toFixed(1)}),C('M_max',V('M_max','6,840'),'kN·m',[-6,y0+.2,G5+.4],-70,50),{t:'dim',a:[L/2-4,yT+1.8,W/2],v:'δ ×50'}];
 case'prestress':return[C('Cable C1 · 19T13',V('cableF','2,616'),'kN',[-6,y0+.2,G5],-70,60),C('Pₑ / P₀',V('pe_p0','0.804'),'✓',[4,y0+.3,G5],70,60,0),C('Anchorage slip','6','mm',[L/2-.2,y0+.85,G5],60,-60),C('Camber at transfer',V('camber','12'),'mm',[-2,yT,G5],-60,-70)];
 case'baseline':return[C('Healthy fingerprint','Mode 1 · 3.21','Hz',[0,y0,W/2],70,70,0,function(){const n=this.modeN||1;const m=(this._data&&this._data.modes)?String(this._data.modes).split(','):['3.21','5.86','8.41'];return'Mode '+n+' · '+(m[n-1]!=null?m[n-1]:m[0])}),{t:'dim',a:[-L/2+3,yT+2.2,W/2],v:'AMPLITUDE EXAGGERATED'}];
 case'inspection':return[C('G5 · flexural crack','0.3','mm',[2,y0+.35,G5+.4],-80,60,1),C('Bearing B5 · corrosion','Grade 3','',[L/2-.3,yB+.12,G5],70,40,2),C('Deck soffit · leakage','0.6','m²',[-5,y0+D,G4+1.6],-70,-40,1)];
 case'ndt':return[C('UPV · Doubtful','3.28','km/s',[1.6,y0+.9,G5+.16],70,-50,2),C('UPV · Excellent','4.62','km/s',[-10,y0+.9,G5+.16],-70,-60,0),C('Rebound · Intermediate','27','R',[9,y0+.5,G5+.16],70,50,1),C('Rebound · Sound','38','R',[-4,y0+.5,G5+.16],-60,60,0)];
 case'monitoring':return[C('A4 · L/4','0.041','g',[-L/4,y0-.12,G4],-60,50,null,acc(0)),C('A5 · L/2','0.052','g',[0,y0-.12,G4],50,60,null,acc(1)),C('A6 · 3L/4','0.038','g',[L/4,y0-.12,G4],70,40,null,acc(2))];
 case'synthetic':return[C('Scenario · EI',V('ei','−35'),'%',[0,y0+.2,G5+.4],70,60,2),C('Damage extent',V('ext','6.0'),'m',[-3,y0,G5+.4],-80,50,2),C('f₁ scenario',V('f1shift','2.94'),'Hz',[0,yT,G5],-60,-70),{t:'dim',a:[L/2-3,yT+1.6,W/2],v:'SAG ×100'}];
 case'features':return[P('Δf₁','−8.4','%',-10,-2,6),P('a_RMS','0.051','g',-2,3,7.5),P('δ_max','24.9','mm',6,-3,5.5),P('Kurtosis','3.4','',13,2,6.8)];
 case'ml':return[C('Predicted · G5 mid-span',V('pred','Deteriorated'),V('conf','0.81'),[0,y0+.4,G5+.4],70,-60,2),C('Anomaly score',V('anom','0.67'),'IsoForest',[-8,yT,4],-70,-60),C('Top feature',V('topf','Δf₁'),V('topfv','0.31'),[10,yT,-3],60,-60)];
 case'maintenance':return[C('Detailed investigation','G5','mid-span',[0,y0+.4,G5+.4],70,50,2),C('Additional NDT','UPV grid','24 pts',[-6,y0+.9,G5+.4],-80,40,1),C('Preventive · bearing','B5','reseat',[L/2-.3,yB+.2,G5],70,-40,1),C('Routine monitoring','All spans','6 mo',[-10,yT,0],-70,-70,0)];
 case'report':return[{t:'dim',a:[0,y0-1.2,W/2],v:'FIG 1 · ELEVATION · 1:200'}];
 }return[]}

_buildLabels(intro){
 this.LD.innerHTML='';this.svg.innerHTML='';this.PG.clear();this.lbs=[];
 const base=intro?4.6:1.3;
 this._labelDefs(this._p.stage).forEach((d,i)=>{const delay=base+i*.12,el=document.createElement('div');el.className='it '+d.t;let line=null;
  if(d.t==='dim')el.innerHTML=`<div class="dim">${d.v}</div>`;
  else{const sev=d.sev!=null?`<i style="background:${SEV[d.sev]}"></i>`:'';
   const pos=d.t==='pin'?'left:0;top:-10px;transform:translate(-50%,-100%)':`left:${d.dx}px;top:${d.dy}px;transform:translate(${d.dx<0?'-100%':'0'},-50%)`;
   el.innerHTML=(d.t==='call'?'<div class="dot"></div>':'')+`<div class="card" style="${pos}"><div class="k">${sev}${d.k}</div><div class="v"><b>${d.v}</b><span>${d.u||''}</span></div></div>`;
   if(d.t==='call'){line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('class','ln');this.svg.appendChild(line)}}
  this.LD.appendChild(el);el.style.transitionDelay=delay+'s';if(line)line.style.transitionDelay=delay+'s';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{el.classList.add('on');line&&line.classList.add('on')}));
  const o={d,el,line,vb:d.live?el.querySelector('.v b'):null};
  if(d.t==='pin'){const g=new T.Group(),mat=d.sev!=null?new T.MeshBasicMaterial({color:SEV[d.sev]}):this.M.pin;o.stick=new T.Mesh(this.pinG,mat);o.top=new T.Mesh(this.topG,mat);g.add(o.stick,o.top,new T.Mesh(this.baseG,mat));this.PG.add(g);o.pin=g;o.pd=delay-.4}
  this.lbs.push(o)})}

_resize(){if(!this.R)return;const r=this.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);this._w=w;this._h=h;this.R.setSize(w,h,false);this.cam.aspect=w/h;this.cam.updateProjectionMatrix()}

_tick(now){
 const dt=Math.min(.05,this._last?(now-this._last)/1000:.016);this._last=now;
 const run=this._p.paused!=='true';if(run)this.time+=dt;this.introT+=dt;this.stageT+=dt;
 const t=this.time,cfg=this._cfg(),c=this.c,M=this.M,L=this.L,iT=this.introT,intro=iT<4.6,k=1-Math.exp(-dt*2.6);
 const tg={ex:cfg.ex||0,blue:cfg.blue||0,xray:cfg.xray||0,heat:cfg.heat?1:0,camber:cfg.camber||0,sag:cfg.sag||0,modes:cfg.modes||0,tAmp:cfg.tAmp||0,sensors:cfg.sensors||0,damage:cfg.damage||0,scan:cfg.scan||0};
 if(iT<3.8)for(const key in tg)tg[key]=0;
 for(const key in tg)c[key]+=(tg[key]-c[key])*k;
 if(cfg.modes){const n=1+Math.floor(this.stageT/4.5)%3;this.modeN=n;this.modeW=[3.4,5.6,7.6][n-1]}
 const N=96,tab=this._tab||(this._tab=new Float32Array(N+1));for(let i=0;i<=N;i++)tab[i]=this.defl(-L/2+i*L/N);
 const dAt=this.dAt=x=>{const f=(x+L/2)/L*N;if(f<=0||f>=N)return 0;const i=f|0,r=f-i;return tab[i]+(tab[i+1]-tab[i])*r};
 for(const p of this.parts){const o=p.o;o.position.copy(p.base).addScaledVector(p.ex,c.ex);o.scale.copy(p.bs);let vis=true;
  if(p.it){const e=cl((iT-p.it.d)/p.it.t);vis=e>0;const ty=p.it.type;
   if(ty==='rise')o.position.y-=(1-eio(e))*p.h;else if(ty==='drop')o.position.y+=(1-bnc(e))*16;
   else if(ty==='grow')o.scale.x=p.bs.x*Math.max(.001,eio(e));else if(ty==='growz')o.scale.z=p.bs.z*Math.max(.001,eio(e));
   else if(ty==='pop')o.scale.multiplyScalar(Math.max(.001,eob(e)))}
  if(p.def)o.position.y+=dAt(o.position.x);o.visible=vis}
 const act=c.tAmp+c.modes+c.camber+c.sag>.0005;
 if(act||this._wd){this._wd=act;for(const d of this.defs){const a=d.g.attributes.position.array,b=d.b;for(let i=0;i<a.length;i+=3)a[i+1]=b[i+1]+dAt(b[i]);d.g.attributes.position.needsUpdate=true}}
 if(this.hcol&&Math.abs(c.heat-this._lh)>.001){this._lh=c.heat;const h=c.heat;this.girders.forEach((m,gi)=>{const a=m.geometry.attributes.color.array,s=this.hcol[gi];for(let i=0;i<a.length;i++)a[i]=1+(s[i]-1)*h;m.geometry.attributes.color.needsUpdate=true});M.conc.color.copy(this.concC).lerp(this.WHITE,h)}
 else if(!this.hcol)M.conc.color.copy(this.concC);
 const op=1-c.blue*.9,ox=1-c.xray*.84;
 for(const m of this.structMats){const o=this.xrMats.includes(m)?Math.min(op,ox):op,tr=o<.995;m.opacity=o;if(m.transparent!==tr){m.transparent=tr;m.needsUpdate=true}m.depthWrite=o>.6}
 const th=this.th;M.edge.opacity=th.edgeO+(.9-th.edgeO)*Math.max(c.blue,c.xray*.6);M.dim.opacity=c.blue;
 const xv=c.xray>.02;M.tendon.opacity=c.xray;M.spark.opacity=c.xray;this.tendons.forEach(m=>m.visible=xv);
 this.sparks.forEach((sp,gi)=>{sp.visible=xv;if(!xv)return;const cu=this.girders[gi].userData.curves,arr=sp.geometry.attributes.position.array;let j=0;for(let ci=0;ci<3;ci++)for(let q=0;q<8;q++){const p=cu[ci].getPointAt((t*.12+q/8+ci*.04)%1);arr[j++]=p.x;arr[j++]=p.y+dAt(p.x);arr[j++]=p.z}sp.geometry.attributes.position.needsUpdate=true});
 const mode=iT<4?0:(cfg.traffic||0),X0=L/2+16;
 for(const v of this.veh){const on=mode===2||(mode===1&&v.heavy);v.on=on;v.g.visible=on;if(!on)continue;
  if(run)v.x+=v.dir*(mode===1?3.2:v.spd)*dt;if(v.x>X0)v.x-=2*X0;if(v.x<-X0)v.x+=2*X0;
  v.g.position.set(v.x,this.yT+dAt(v.x),v.z);v.g.rotation.z=(dAt(v.x+1)-dAt(v.x-1))/2*v.dir;v.g.scale.setScalar(Math.max(.001,cl((X0-Math.abs(v.x))/3)))}
 this.SG.visible=c.sensors>.02;if(this.SG.visible)this.sens.forEach((s,i)=>{const y=this.y0-.12+dAt(s.x);s.m.position.y=y;s.m.scale.setScalar(c.sensors);s.r.position.set(s.x,y-.02,s.z);const f=(t*.9+i*.17)%1;s.r.scale.setScalar(.4+f*3.2);s.r.material.opacity=(1-f)*.85*c.sensors});
 const pul=.5+.5*Math.sin(t*4);this.dz.visible=c.damage>.02;this.dz.material.opacity=c.damage*(.25+.3*pul);this.dz.position.y=this.y0+.33+dAt(0);this.dl.intensity=c.damage*(18+14*pul);
 this.scan.visible=c.scan>.02;this.scan.material.opacity=c.scan*.16;this.scan.position.x=-L/2+L*((this.stageT*.22)%1);
 this.ring.rotation.y=t*.03;
 if(this.fly){const f=this.fly;f.t+=dt;const e=eio(cl(f.t/f.dur)),A=f.from,B=f.to;this.sph.th=A.th+(B.th-A.th)*e;this.sph.ph=A.ph+(B.ph-A.ph)*e;this.sph.r=A.r+(B.r-A.r)*e+(f.intro?0:Math.sin(Math.PI*e)*Math.min(A.r,B.r)*.22);this.tgt.lerpVectors(A.tgt,B.tgt,e);if(f.t>=f.dur)this.fly=null}
 else if(cfg.auto&&run&&!this.drag&&performance.now()-(this.userT||0)>4000)this.sph.th+=cfg.auto*dt;
 const{th:a,ph,r}=this.sph,tg2=this.tgt,cam=this.cam;cam.position.set(tg2.x+r*Math.sin(ph)*Math.sin(a),Math.max(.8,tg2.y+r*Math.cos(ph)),tg2.z+r*Math.sin(ph)*Math.cos(a));cam.lookAt(tg2);
 this.R.render(this.sc,cam);
 const w=this._w,h=this._h,v=this._v||(this._v=new T.Vector3());
 for(const o of this.lbs){const d=o.d;
  if(typeof d.a==='function')v.copy(d.a());else{v.set(d.a[0],d.a[1],d.a[2]);if(!d.fix)v.y+=dAt(v.x)}
  if(o.pin){const s=Math.max(.001,eob(cl((this.stageT-o.pd)/.7)));o.pin.position.copy(v);o.stick.scale.y=d.h*s;o.top.position.y=d.h*s;v.y+=d.h*s}
  v.project(cam);const x=(v.x*.5+.5)*w,y=(-v.y*.5+.5)*h;o.el.style.transform=`translate(${x}px,${y}px)`;o.el.style.visibility=v.z>1?'hidden':'visible';
  if(o.line){o.line.setAttribute('x1',x);o.line.setAttribute('y1',y);o.line.setAttribute('x2',x+d.dx);o.line.setAttribute('y2',y+d.dy)}
  if(o.vb){const s=d.live.call(this);if(s!==o.ls){o.vb.textContent=s;o.ls=s}}}
}
}
customElements.define('bridge-twin',BridgeTwin);
})();
