/* ════════════════════════════════════════════════════════════════════
   ES-04 · 3D REALISTA (as mesmas ferramentas do 3D do Pavimento Intertravado) — só desenho, nenhum cálculo muda.
   Céu com nuvens e reflexos, Sol (Manhã/Meio-dia/Tarde/Fim de tarde), Qualidade (Baixa…Ultra), texturas com relevo,
   rua com asfalto e faixa, meio-fio e calçada, terreno com grama, LOTES da planta (os mesmos das ligações) com muros,
   portões e casas, árvores e coqueiros, grama 3D com vento, horizonte com morros, árvores e postes locados pelo usuário,
   🚶 andar na rua, vista “nível da rua”, imagem PNG e satélite no chão (com o projeto georreferenciado).
   O kit (rlCeu*, rlTex2, rlShader, rlMat11, rlBuild, rlMerge, rlModelos, rlHorizonte, rlTick) é cópia do PI-11 do
   intertravado/index.html com os nomes trocados (pl → rl, _pl → RL) e as preferências em tc_esg_3d_qual / tc_esg_3d_hora.
   ════════════════════════════════════════════════════════════════════ */
const RL = {on: (() => { try { return localStorage.getItem('tc_esg_3d_real') !== '0'; } catch (e) { return true; } })(), t3: null, modo: null, sel: null, pan: false, andar: null,
  vis: Object.assign({calcada: 1, terreno: 1, casas: 1, muros: 1, arvc: 1, grama: 1, horiz: 1, objArv: 1, objPoste: 1, sat: 0, faixa: 1},
    (() => { try { return JSON.parse(localStorage.getItem('tc_esg_3d_vis') || '{}'); } catch (e) { return {}; } })())};
function rlSalvaVis() { try { localStorage.setItem('tc_esg_3d_vis', JSON.stringify(RL.vis)); } catch (e) {} }
const RL_QUAL={baixa:{n:'Baixa',pr:1,sh:0,grama:0,tex:512,env:64,casas:1,arvq:0.4},media:{n:'Média',pr:1.25,sh:1024,grama:9000,tex:1024,env:128,casas:1,arvq:0.7},
  alta:{n:'Alta',pr:1.75,sh:2048,grama:26000,tex:1024,env:256,casas:1,arvq:1},ultra:{n:'Ultra',pr:2.5,sh:4096,grama:60000,tex:2048,env:256,casas:1,arvq:1.3}};
const RL_HORAS={manha:{n:'Manhã',el:24,az:80,sol:'#ffe3bf',si:2.0,zen:'#3b74c2',hor:'#d3e2ee',nuv:'#f4f1ec',exp:0.78},
  dia:{n:'Meio-dia',el:66,az:15,sol:'#fff7ea',si:2.3,zen:'#2c6bc6',hor:'#c6ddf1',nuv:'#ffffff',exp:0.72},
  tarde:{n:'Tarde',el:34,az:290,sol:'#fff0d9',si:2.15,zen:'#3570c0',hor:'#d0e0ee',nuv:'#fbf6ef',exp:0.76},
  por:{n:'Fim de tarde',el:8,az:285,sol:'#ffb36e',si:1.75,zen:'#5d86bf',hor:'#f3cfa4',nuv:'#ffe0bf',exp:0.9}};
function rlMovel(){ try{ return (typeof CFG!=='undefined'&&CFG.device&&/android|iphone/i.test(CFG.device))||('ontouchstart' in window&&Math.min(screen.width,screen.height)<760); }catch(e){ return false; } }
function rlQualK(){ let k=null; try{ k=localStorage.getItem('tc_esg_3d_qual'); }catch(e){} return RL_QUAL[k]?k:(rlMovel()?'media':'alta'); }
function rlHoraK(){ let k=null; try{ k=localStorage.getItem('tc_esg_3d_hora'); }catch(e){} return RL_HORAS[k]?k:'manha'; }
function rlSetQual(k){ try{ localStorage.setItem('tc_esg_3d_qual',k); }catch(e){} RL.tex2={}; if(RL.t3){ RL.t3.qualAplicada=null; } rl3D(true); }
function rlSetHora(k){ try{ localStorage.setItem('tc_esg_3d_hora',k); }catch(e){} if(RL.t3){ rlCeuAplicar(RL.t3); } }
function rlLin(c){ return new window.THREE.Color(c).convertSRGBToLinear(); }
function rlSolDir(h){ const T=window.THREE, el=h.el*Math.PI/180, az=h.az*Math.PI/180; return new T.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el)).normalize(); }
/* ── céu (shader): degradê, sol, nuvens animadas; o mesmo céu gera o mapa de reflexos ── */
function rlCeuMat(){
  const T=window.THREE;
  return new T.ShaderMaterial({side:T.BackSide,depthWrite:false,depthTest:true,fog:false,
    uniforms:{uSun:{value:new T.Vector3(0,1,0)},uT:{value:0},uZen:{value:new T.Color()},uHor:{value:new T.Color()},uSol:{value:new T.Color()},uNuv:{value:new T.Color()},uChao:{value:new T.Color()},uDisco:{value:1}},
    vertexShader:'varying vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position=p; gl_Position.z=p.w*0.99999; }',
    fragmentShader:[
      'uniform vec3 uSun,uZen,uHor,uSol,uNuv,uChao; uniform float uT,uDisco; varying vec3 vD;',
      'float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
      'float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y); }',
      'float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<6;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }',
      'void main(){ vec3 d=normalize(vD); float y=d.y; float sd=max(dot(d,uSun),0.0);',
      ' vec3 c=mix(uHor,uZen,pow(clamp(y,0.0,1.0),0.5));',
      ' c+=uSol*(pow(sd,6.0)*0.22+pow(sd,48.0)*0.35);',
      ' c=mix(c,uHor*1.05,exp(-max(y,0.0)*9.0)*0.55);',
      ' if(y>0.0){ vec2 uv=d.xz/(y+0.18)*1.35+vec2(uT*0.006,uT*0.0025); float n=fbm(uv); float cl=smoothstep(0.52,0.80,n)*smoothstep(0.0,0.18,y);',
      '   float sh=fbm(uv+uSun.xz*0.06); vec3 cc=uNuv*mix(0.62,1.05,smoothstep(0.35,0.9,1.0-sh+0.3))+uSol*pow(sd,5.0)*0.25; c=mix(c,cc,cl*0.88); }',
      ' else { c=mix(uHor*0.92,uChao,smoothstep(0.0,0.25,-y)); }',
      ' c+=uSol*smoothstep(0.99955,0.99975,sd)*12.0*uDisco;',
      ' gl_FragColor=vec4(c,1.0);',
      ' #include <tonemapping_fragment>',
      ' #include <encodings_fragment>',
      '}'].join('\n')});
}
function rlCeuInit(t){
  const T=window.THREE;
  t.ceuMat=rlCeuMat(); t.ceu=new T.Mesh(new T.SphereGeometry(10,48,24),t.ceuMat); t.ceu.frustumCulled=false; t.ceu.renderOrder=-10; t.sc.add(t.ceu);
  t.hemi=new T.HemisphereLight(0xdfefff,0x4f6338,0.12); t.sc.add(t.hemi);
  t.uT={value:0}; t.relogio=new T.Clock();
}
function rlCeuAplicar(t){
  const T=window.THREE, h=RL_HORAS[rlHoraK()], q=RL_QUAL[rlQualK()], dir=rlSolDir(h);
  const U=t.ceuMat.uniforms; U.uSun.value.copy(dir); U.uZen.value.copy(rlLin(h.zen)); U.uHor.value.copy(rlLin(h.hor)); U.uSol.value.copy(rlLin(h.sol)); U.uNuv.value.copy(rlLin(h.nuv)); U.uChao.value.copy(rlLin('#6f7a64'));
  t.solDir=dir; t.sun.color.set(h.sol); t.sun.intensity=h.si; t.rd.toneMappingExposure=h.exp;
  t.hemi.color.set(h.hor); t.hemi.groundColor.set('#55683f');
  if(t.sc.fog) t.sc.fog.color.copy(U.uHor.value);
  /* mapa de reflexos (IBL) a partir do mesmo céu */
  try{
    const es=new T.Scene(), m2=t.ceuMat.clone(); m2.uniforms=T.UniformsUtils.clone(t.ceuMat.uniforms); m2.uniforms.uDisco.value=0.35; m2.uniforms.uT.value=0;
    const sm=new T.Mesh(new T.SphereGeometry(10,32,16),m2); es.add(sm);
    const pm=t.pmrem||(t.pmrem=new T.PMREMGenerator(t.rd)); const rt=pm.fromScene(es,0.02,0.1,100);
    if(t.envRT) t.envRT.dispose(); t.envRT=rt; t.sc.environment=rt.texture; sm.geometry.dispose(); m2.dispose();
  }catch(e){ t.sc.environment=null; }
  t.precisaSombra=true;
}
/* ── texturas com relevo (cor + normal + rugosidade), geradas no programa ── */
function rlCanvas(N){ const c=document.createElement('canvas'); c.width=c.height=N; return c; }
function rlRnd(seed){ let s=seed>>>0||1; return ()=>{ s=(s*16807)%2147483647; return s/2147483647; }; }
function rlNormal(hc,forca){
  const N=hc.width, src=hc.getContext('2d').getImageData(0,0,N,N).data, out=rlCanvas(N), go=out.getContext('2d'), im=go.createImageData(N,N), o=im.data;
  const H=(x,y)=>src[((((y%N)+N)%N)*N+(((x%N)+N)%N))*4]/255;
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const dx=(H(x+1,y)-H(x-1,y))*forca, dy=(H(x,y+1)-H(x,y-1))*forca, l=Math.hypot(dx,dy,1), i=(y*N+x)*4;
    o[i]=(-dx/l*0.5+0.5)*255; o[i+1]=(dy/l*0.5+0.5)*255; o[i+2]=(1/l*0.5+0.5)*255; o[i+3]=255; }
  go.putImageData(im,0,0); return out;
}
function rlTexDe(cv,srgb,aniso){ const T=window.THREE, t=new T.CanvasTexture(cv); t.wrapS=t.wrapT=T.RepeatWrapping; if(srgb) t.encoding=T.sRGBEncoding; t.anisotropy=aniso||1; t.needsUpdate=true; return t; }
function rlTex2(nome){
  const cache=RL.tex2||(RL.tex2={}); if(cache[nome]) return cache[nome];
  const q=RL_QUAL[rlQualK()], an=RL.t3?Math.min(16,RL.t3.rd.capabilities.getMaxAnisotropy()):4;
  let N=q.tex, cor, alt, rug=null, fn=4, extra={};
  const R=rlRnd(nome.length*977+13), pon=(g,n,cor1,cor2,smin,smax,W,H,x0,y0)=>{ for(let k=0;k<n;k++){ g.fillStyle=R()<0.5?cor1:cor2; const s=smin+R()*(smax-smin); g.fillRect((x0||0)+R()*(W||N),(y0||0)+R()*(H||N),s,s); } };
  if(nome==='pav'||nome==='pavCal'){ /* blocos 20×10 cm em fiada: textura = 0,80 × 0,80 m (4 × 8 blocos) */
    cor=rlCanvas(N); alt=rlCanvas(N); rug=rlCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d'), gr=rug.getContext('2d'), k=N/1024;
    const rows=8, rh=N/rows, bl=N/4, j=Math.max(2,3*k), ch=Math.max(3,8*k);
    g.fillStyle=nome==='pav'?'#8a7f6c':'#8f8168'; g.fillRect(0,0,N,N); pon(g,N*N/40,'rgba(60,50,35,.35)','rgba(190,175,140,.35)',1,2.2*k);
    ga.fillStyle='#000'; ga.fillRect(0,0,N,N); gr.fillStyle='#fff'; gr.fillRect(0,0,N,N);
    for(let r=0;r<rows;r++){ const off=(r%2)?bl/2:0; for(let c=-1;c<5;c++){ const x=c*bl+off+j, y=r*rh+j, w=bl-2*j, h=rh-2*j;
      const base=nome==='pav'?(108+R()*30):(140+R()*26), wm=R()<0.12?-14:0, tr=Math.round(base+wm), tint=nome==='pav'?[4,2,-3]:[22,8,-12];
      g.fillStyle='rgb('+(tr+tint[0])+','+(tr+tint[1])+','+(tr+tint[2])+')'; g.fillRect(x,y,w,h);
      pon(g,Math.round(w*h/14),'rgba(0,0,0,.10)','rgba(255,255,255,.11)',1,1.8*k,w,h,x,y);
      pon(g,Math.round(w*h/260),'rgba(40,36,30,.28)','rgba(230,225,215,.22)',1.5*k,3.2*k,w,h,x,y);
      const gd=g.createLinearGradient(x,y,x+w,y+h); gd.addColorStop(0,'rgba(255,255,255,.05)'); gd.addColorStop(1,'rgba(0,0,0,.07)'); g.fillStyle=gd; g.fillRect(x,y,w,h);
      for(let s=0;s<ch;s++){ const v=Math.round(90+165*Math.pow((s+1)/ch,0.7)); ga.fillStyle='rgb('+v+','+v+','+v+')'; ga.fillRect(x+s,y+s,w-2*s,h-2*s); }
      pon(ga,Math.round(w*h/30),'rgba(0,0,0,.08)','rgba(255,255,255,.06)',1,2*k,w-2*ch,h-2*ch,x+ch,y+ch);
      const rv=Math.round(170+R()*40); gr.fillStyle='rgb('+rv+','+rv+','+rv+')'; gr.fillRect(x+ch*0.5,y+ch*0.5,w-ch,h-ch);
      g.fillStyle='rgba(0,0,0,.16)'; g.fillRect(x,y+h-1.5*k,w,1.5*k); g.fillRect(x+w-1.5*k,y,1.5*k,h); } }
    fn=6;
  }else if(nome==='concreto'||nome==='sarjeta'||nome==='calcConc'){
    N=Math.min(N,1024); cor=rlCanvas(N); alt=rlCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d');
    const base={concreto:'#bdbab1',sarjeta:'#a3a39d',calcConc:'#c4c0b6'}[nome]; g.fillStyle=base; g.fillRect(0,0,N,N);
    for(let k=0;k<40;k++){ const x=R()*N,y=R()*N,r=N*(0.05+R()*0.18), gd=g.createRadialGradient(x,y,0,x,y,r); gd.addColorStop(0,R()<0.5?'rgba(0,0,0,.06)':'rgba(255,255,255,.06)'); gd.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gd; g.fillRect(x-r,y-r,2*r,2*r); }
    pon(g,N*N/6,'rgba(0,0,0,.07)','rgba(255,255,255,.09)',1,1.6); ga.fillStyle='#808080'; ga.fillRect(0,0,N,N); pon(ga,N*N/5,'rgba(0,0,0,.18)','rgba(255,255,255,.16)',1,2);
    for(let k=0;k<N*N/900;k++){ const x=R()*N,y=R()*N,s=1+R()*2.5; g.fillStyle='rgba(40,40,40,.35)'; g.fillRect(x,y,s,s); ga.fillStyle='#202020'; ga.fillRect(x,y,s,s); }
    if(nome==='sarjeta'){ const gd=g.createLinearGradient(0,0,0,N); gd.addColorStop(0,'rgba(60,55,45,.0)'); gd.addColorStop(0.15,'rgba(60,55,45,.22)'); gd.addColorStop(0.45,'rgba(60,55,45,.05)'); g.fillStyle=gd; g.fillRect(0,0,N,N); }
    g.fillStyle='rgba(30,30,30,.55)'; g.fillRect(0,0,Math.max(2,N/300),N); ga.fillStyle='#000'; ga.fillRect(0,0,Math.max(2,N/300),N); /* junta a cada peça */
    fn=2.5;
  }else if(nome==='grama'){
    N=Math.min(N,1024); cor=rlCanvas(N); alt=rlCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d');
    g.fillStyle='#4c6f2a'; g.fillRect(0,0,N,N); ga.fillStyle='#000'; ga.fillRect(0,0,N,N);
    const cores=['#3d5f22','#56792f','#6a8a38','#7d9a45','#8c9a52','#46682a','#5d7d33','#9aa463'];
    for(let k=0;k<N*N/9;k++){ const x=R()*N,y=R()*N,l=(3+R()*9)*N/1024*2,a=-Math.PI/2+(R()-0.5)*1.2; g.strokeStyle=cores[(R()*cores.length)|0]; g.lineWidth=0.8+R()*1.2; g.beginPath(); g.moveTo(x,y); g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l); g.stroke();
      const v=(80+R()*175)|0; ga.strokeStyle='rgb('+v+','+v+','+v+')'; ga.lineWidth=1; ga.beginPath(); ga.moveTo(x,y); ga.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l); ga.stroke(); }
    fn=3;
  }else if(nome==='terra'){
    N=Math.min(N,1024); cor=rlCanvas(N); alt=rlCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d');
    g.fillStyle='#8a6a48'; g.fillRect(0,0,N,N); ga.fillStyle='#707070'; ga.fillRect(0,0,N,N);
    pon(g,N*N/4,'rgba(60,40,25,.25)','rgba(170,140,105,.22)',1,2.5); pon(ga,N*N/4,'rgba(0,0,0,.2)','rgba(255,255,255,.2)',1,2.5);
    for(let k=0;k<N*N/350;k++){ const x=R()*N,y=R()*N,r=1.5+R()*4.5, v=(110+R()*90)|0; g.fillStyle='rgb('+(v+20)+','+(v+5)+','+(v-15)+')'; g.beginPath(); g.ellipse(x,y,r,r*0.75,R()*3,0,7); g.fill(); ga.fillStyle='#fff'; ga.beginPath(); ga.ellipse(x,y,r,r*0.75,0,0,7); ga.fill(); }
    fn=4;
  }else if(nome==='reboco'){
    N=512; cor=rlCanvas(N); alt=rlCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d');
    g.fillStyle='#f2efe8'; g.fillRect(0,0,N,N); pon(g,N*N/3,'rgba(0,0,0,.05)','rgba(255,255,255,.06)',1,2.2);
    for(let k=0;k<26;k++){ const x=R()*N,y=R()*N,r=N*(0.05+R()*0.2), gd=g.createRadialGradient(x,y,0,x,y,r); gd.addColorStop(0,'rgba(90,80,60,.05)'); gd.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gd; g.fillRect(x-r,y-r,2*r,2*r); }
    const gd=g.createLinearGradient(0,N,0,N*0.82); gd.addColorStop(0,'rgba(70,60,45,.22)'); gd.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gd; g.fillRect(0,N*0.8,N,N*0.2); /* sujeira de respingo embaixo */
    ga.fillStyle='#808080'; ga.fillRect(0,0,N,N); pon(ga,N*N/2.5,'rgba(0,0,0,.2)','rgba(255,255,255,.2)',1,3);
    fn=2.2;
  }else if(nome==='telha'){
    N=512; cor=rlCanvas(N); alt=rlCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d'), rows=12, rh=N/rows, tw=N/8;
    for(let r=0;r<rows;r++) for(let c=0;c<9;c++){ const x=c*tw-(r%2?tw/2:0), y=r*rh, v=0.85+R()*0.3, gd=g.createLinearGradient(x,0,x+tw,0);
      gd.addColorStop(0,'rgb('+(140*v|0)+','+(62*v|0)+','+(38*v|0)+')'); gd.addColorStop(0.5,'rgb('+(196*v|0)+','+(98*v|0)+','+(60*v|0)+')'); gd.addColorStop(1,'rgb('+(120*v|0)+','+(52*v|0)+','+(32*v|0)+')');
      g.fillStyle=gd; g.fillRect(x,y,tw,rh); const ha=ga.createLinearGradient(x,0,x+tw,0); ha.addColorStop(0,'#303030'); ha.addColorStop(0.5,'#ffffff'); ha.addColorStop(1,'#303030'); ga.fillStyle=ha; ga.fillRect(x,y,tw,rh);
      g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(x,y+rh-3,tw,3); ga.fillStyle='#000'; ga.fillRect(x,y+rh-2,tw,2); }
    pon(g,N*N/5,'rgba(0,0,0,.08)','rgba(255,230,200,.08)',1,1.6);
    for(let k=0;k<30;k++){ const x=R()*N,y=R()*N,r=N*(0.04+R()*0.12), gd=g.createRadialGradient(x,y,0,x,y,r); gd.addColorStop(0,'rgba(40,40,30,.18)'); gd.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gd; g.fillRect(x-r,y-r,2*r,2*r); }
    fn=5;
  }else if(nome==='portao'){
    N=256; cor=rlCanvas(N); alt=rlCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d');
    g.fillStyle='#3b3f44'; g.fillRect(0,0,N,N); ga.fillStyle='#000'; ga.fillRect(0,0,N,N);
    for(let x=0;x<N;x+=16){ g.fillStyle='#585e65'; g.fillRect(x+2,0,9,N); g.fillStyle='rgba(255,255,255,.12)'; g.fillRect(x+2,0,2,N); ga.fillStyle='#fff'; ga.fillRect(x+3,0,7,N); }
    fn=3;
  }else if(nome==='casca'){
    N=256; cor=rlCanvas(N); alt=rlCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d');
    g.fillStyle='#5a4532'; g.fillRect(0,0,N,N); ga.fillStyle='#777'; ga.fillRect(0,0,N,N);
    for(let k=0;k<700;k++){ const x=R()*N,y=R()*N,l=10+R()*40,v=(50+R()*70)|0; g.fillStyle='rgb('+(v+25)+','+(v+12)+','+v+')'; g.fillRect(x,y,1.5+R()*2.5,l); ga.fillStyle=R()<0.5?'#222':'#ddd'; ga.fillRect(x,y,2,l); }
    fn=4;
  }else if(nome==='folhas'||nome==='palma'){ /* cachos de folhas com transparência (alphaTest) */
    N=nome==='palma'?512:256; cor=rlCanvas(N); const g=cor.getContext('2d'); g.clearRect(0,0,N,N);
    if(nome==='folhas'){ for(let k=0;k<170;k++){ const a=R()*Math.PI*2, rr=Math.pow(R(),0.6)*N*0.42, x=N/2+Math.cos(a)*rr, y=N/2+Math.sin(a)*rr, s=N*(0.035+R()*0.03), v=R();
        g.save(); g.translate(x,y); g.rotate(R()*7); g.fillStyle=v<0.33?'#2f5a1f':v<0.66?'#3f7128':'#5b8a33'; g.beginPath(); g.ellipse(0,0,s,s*0.45,0,0,7); g.fill(); g.strokeStyle='rgba(20,40,10,.5)'; g.lineWidth=0.8; g.beginPath(); g.moveTo(-s,0); g.lineTo(s,0); g.stroke(); g.restore(); } }
    else { g.strokeStyle='#6b6a2e'; g.lineWidth=N/90; g.beginPath(); g.moveTo(0,N/2); g.quadraticCurveTo(N/2,N/2-N*0.04,N,N/2); g.stroke();
      for(let k=0;k<56;k++){ const t=k/56, x=t*N, y=N/2-N*0.04*4*t*(1-t), l=N*0.42*Math.sin(Math.PI*Math.min(1,t*1.1+0.08)); [1,-1].forEach(sg=>{ g.strokeStyle=(k%3)?'#4d7a2c':'#3c6824'; g.lineWidth=N/110; g.beginPath(); g.moveTo(x,y); g.lineTo(x+N*0.05,y+sg*l); g.stroke(); }); } }
    const t=rlTexDe(cor,true,an); return cache[nome]={map:t};
  }else if(nome==='macro'){
    N=256; cor=rlCanvas(N); const g=cor.getContext('2d'), im=g.createImageData(N,N);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ let s=0,a=0.5,f=4; for(let o=0;o<5;o++){ s+=a*rlRuido((x/N)*f+o*13.1,(y/N)*f+o*7.7)*1; a*=0.5; f*=2; } /* não é periódico de verdade; borda suavizada abaixo */
      const v=Math.round(Math.max(0,Math.min(1,s))*255), i=(y*N+x)*4; im.data[i]=im.data[i+1]=im.data[i+2]=v; im.data[i+3]=255; }
    g.putImageData(im,0,0); const t=rlTexDe(cor,false,1); return cache[nome]={map:t};
  }
  const out={map:rlTexDe(cor,true,an),normalMap:alt?rlTexDe(rlNormal(alt,fn),false,an):null,roughnessMap:rug?rlTexDe(rug,false,an):null};
  return cache[nome]=Object.assign(out,extra);
}
/* shader extra: variação de cor em escala grande (quebra a repetição da textura), mistura terra × grama, vento */
function rlShader(mm,op){
  const T=window.THREE, t=RL.t3; op=op||{};
  mm.onBeforeCompile=sh=>{
    sh.uniforms.uMacro={value:rlTex2('macro').map}; sh.uniforms.uMacS={value:op.macro||40}; sh.uniforms.uMacA={value:op.macA==null?0.35:op.macA}; sh.uniforms.uT=t.uT;
    if(op.terra){ const tt=rlTex2('terra'); sh.uniforms.uTerra={value:tt.map}; sh.uniforms.uTerraN={value:tt.normalMap}; }
    sh.vertexShader='varying vec3 vPlW;\n'+(op.terra?'attribute float aTerra; varying float vTerra;\n':'')+(op.vento?'uniform float uT;\n':'')+sh.vertexShader
      .replace('#include <begin_vertex>','#include <begin_vertex>\n'+(op.vento?
        '{ vec3 bp=vec3(0.0);\n#ifdef USE_INSTANCING\n bp=vec3(instanceMatrix[3][0],0.0,instanceMatrix[3][2]);\n#endif\n float hgt=max(position.y,0.0)/'+(op.vento.h||1).toFixed(2)+'; float w=sin(uT*1.7+bp.x*0.35+bp.z*0.27)*0.6+sin(uT*3.1+bp.x*0.9)*0.25; transformed.x+=w*hgt*hgt*'+(op.vento.a||0.1).toFixed(3)+'; transformed.z+=w*0.6*hgt*hgt*'+(op.vento.a||0.1).toFixed(3)+'; }':''))
      .replace('#include <project_vertex>','#include <project_vertex>\n{ vec4 plw=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\n plw=instanceMatrix*plw;\n#endif\n vPlW=(modelMatrix*plw).xyz; }'+(op.terra?' vTerra=aTerra;':''));
    sh.fragmentShader='varying vec3 vPlW; uniform sampler2D uMacro; uniform float uMacS,uMacA;\n'+(op.terra?'varying float vTerra; uniform sampler2D uTerra; uniform sampler2D uTerraN;\n':'')+sh.fragmentShader
      .replace('#include <map_fragment>','#include <map_fragment>\n'+(op.terra?'{ vec4 tc=mapTexelToLinear(texture2D(uTerra,vUv*1.3)); float m2=smoothstep(0.15,0.85,vTerra+(texture2D(uMacro,vPlW.xz/9.0).r-0.5)*0.5); diffuseColor.rgb=mix(diffuseColor.rgb,tc.rgb,m2); }\n':'')+
        '{ float mc=texture2D(uMacro,vPlW.xz/uMacS).r*0.7+texture2D(uMacro,vPlW.xz/(uMacS*0.23)).r*0.3; diffuseColor.rgb*=1.0+(mc-0.5)*uMacA*2.0; }');
  };
  mm.customProgramCacheKey=()=>'rl11'+JSON.stringify(op);
  return mm;
}
function rlSombraFolha(k){ const T=window.THREE, c=RL.sf11||(RL.sf11={}); if(c[k]) return c[k]; return c[k]=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:rlTex2(k).map,alphaTest:0.42}); }
function rlMat11(k){
  const T=window.THREE, c=RL.mat11||(RL.mat11={}); if(c[k]) return c[k];
  const S=(o)=>{ const m=new T.MeshStandardMaterial(Object.assign({color:0xffffff,roughness:0.9,metalness:0},o)); m.userData.keep=1; return m; };
  let m;
  if(k==='pav'||k==='pavCal'){ const t=rlTex2(k); m=rlShader(S({map:t.map,normalMap:t.normalMap,roughnessMap:t.roughnessMap,roughness:1,envMapIntensity:0.7,normalScale:new T.Vector2(1.1,1.1),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),{macro:22,macA:0.03}); }
  else if(k==='concreto'||k==='sarjeta'||k==='calcConc'){ const t=rlTex2(k); m=rlShader(S({map:t.map,normalMap:t.normalMap,roughness:0.88,envMapIntensity:0.6,normalScale:new T.Vector2(0.6,0.6)}),{macro:18,macA:0.14}); }
  else if(k==='terreno'){ const t=rlTex2('grama'); m=rlShader(S({map:t.map,normalMap:t.normalMap,vertexColors:true,roughness:1,envMapIntensity:0.45,normalScale:new T.Vector2(0.8,0.8)}),{macro:35,macA:0.32,terra:true}); }
  else if(k==='terrenoLonge'){ const t=rlTex2('grama'); m=rlShader(S({map:t.map,roughness:1,envMapIntensity:0.4}),{macro:60,macA:0.35}); }
  else if(k==='parede'){ const t=rlTex2('reboco'); m=S({map:t.map,normalMap:t.normalMap,vertexColors:true,roughness:0.95,side:T.DoubleSide,envMapIntensity:0.5,normalScale:new T.Vector2(0.5,0.5)}); }
  else if(k==='telha'){ const t=rlTex2('telha'); m=rlShader(S({map:t.map,normalMap:t.normalMap,roughness:0.75,side:T.DoubleSide,envMapIntensity:0.6}),{macro:14,macA:0.2}); }
  else if(k==='laje'){ const t=rlTex2('concreto'); m=S({map:t.map,color:0x9a9890,roughness:0.95,side:T.DoubleSide}); }
  else if(k==='vidro') m=S({color:0x23313b,roughness:0.06,metalness:0.1,envMapIntensity:1.8});
  else if(k==='caixilho') m=S({color:0xe9e9e6,roughness:0.5,metalness:0.2});
  else if(k==='porta') m=S({color:0x6b4a32,roughness:0.65});
  else if(k==='portao'){ const t=rlTex2('portao'); m=S({map:t.map,normalMap:t.normalMap,roughness:0.45,metalness:0.55,envMapIntensity:1}); }
  else if(k==='casca'){ const t=rlTex2('casca'); m=S({map:t.map,normalMap:t.normalMap,roughness:0.95}); }
  else if(k==='folhas'||k==='palma'){ const t=rlTex2(k); m=rlShader(S({map:t.map,alphaTest:0.42,side:T.DoubleSide,vertexColors:true,roughness:0.78,envMapIntensity:0.5}),{macro:30,macA:0.12,vento:{h:k==='palma'?9:7,a:k==='palma'?0.35:0.22}}); }
  else if(k==='grama3d') m=rlShader(S({vertexColors:true,side:T.DoubleSide,roughness:0.85,envMapIntensity:0.4}),{macro:30,macA:0.3,vento:{h:0.45,a:0.12}});
  else if(k==='posteConc'){ const t=rlTex2('concreto'); m=S({map:t.map,color:0xbdbdb6,roughness:0.85}); }
  else if(k==='metal') m=S({color:0x5b6168,roughness:0.4,metalness:0.7,envMapIntensity:1.1});
  else if(k==='lente') m=S({color:0xfff6d8,emissive:0xfff0c8,emissiveIntensity:0.35,roughness:0.2});
  else if(k==='canteiro'){ const t=rlTex2('terra'); m=S({map:t.map,normalMap:t.normalMap,color:0x9a8a78,roughness:1}); }
  else if(k==='morro') m=new T.MeshBasicMaterial({vertexColors:true,fog:false});
  else if(k==='sel') m=new T.MeshBasicMaterial({color:0xf59e0b,transparent:true,opacity:0.85,depthTest:false});
  if(m) m.userData.keep=1;
  return c[k]=m;
}
/* ── construtor de malhas (triângulos soltos → normais por face) ── */
function rlBuild(){
  const T=window.THREE, P=[], U=[], C=[], V=new T.Vector3(), V2=new T.Vector3();
  const api={P,U,C,
    tri(a,b,c,ua,ub,uc,col){ [a,b,c].forEach(p=>P.push(p.x,p.y,p.z)); U.push(ua[0],ua[1],ub[0],ub[1],uc[0],uc[1]); for(let i=0;i<3;i++) C.push(col.r,col.g,col.b); },
    /* quad a-b-c-d; out = direção para fora (corrige a ordem); uv em metros/escala */
    quad(a,b,c,d,out,sx,sy,col){ V.subVectors(b,a); V2.subVectors(c,a); const n=V.clone().cross(V2); let A=a,B=b,Cc=c,Dd=d, ua=[0,0],ub=[sx,0],uc=[sx,sy],ud=[0,sy];
      if(out&&n.dot(out)<0){ A=a;B=d;Cc=c;Dd=b; ub=[0,sy]; ud=[sx,0]; }
      api.tri(A,B,Cc,ua,ub,uc,col); api.tri(A,Cc,Dd,ua,uc,ud,col); },
    geo(){ const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('uv',new T.Float32BufferAttribute(U,2)); g.setAttribute('color',new T.Float32BufferAttribute(C,3)); g.computeVertexNormals(); return g; }};
  return api;
}
function rlMerge(lista){
  const T=window.THREE, P=[], N=[], U=[], C=[];
  lista.forEach(it=>{ const g=(it.g.index?it.g.toNonIndexed():it.g.clone()); if(it.m) g.applyMatrix4(it.m); const p=g.attributes.position, n=g.attributes.normal, u=g.attributes.uv, c=it.c||{r:1,g:1,b:1};
    for(let i=0;i<p.count;i++){ P.push(p.getX(i),p.getY(i),p.getZ(i)); if(it.nc){ const q=new T.Vector3(p.getX(i),p.getY(i),p.getZ(i)).sub(it.nc).normalize(); N.push(q.x,q.y,q.z); } else N.push(n?n.getX(i):0,n?n.getY(i):1,n?n.getZ(i):0); U.push(u?u.getX(i):0,u?u.getY(i):0); const f=it.cf?it.cf(p.getY(i)):1; C.push(c.r*f,c.g*f,c.b*f); }
    g.dispose(); });
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('normal',new T.Float32BufferAttribute(N,3)); g.setAttribute('uv',new T.Float32BufferAttribute(U,2)); g.setAttribute('color',new T.Float32BufferAttribute(C,3)); return g;
}
/* ── modelos: árvores (3 tipos), palmeira, poste ── */
function rlModelos(){
  if(RL.mod11) return RL.mod11;
  const T=window.THREE, R=rlRnd(4242), M4=()=>new T.Matrix4(), out={};
  const copa=(cx,cy,cz,rx,ry,n,cores)=>{ const L=[]; for(let k=0;k<n;k++){ const a=R()*Math.PI*2, b=Math.acos(2*R()-1), rr=Math.pow(R(),0.45), x=cx+Math.sin(b)*Math.cos(a)*rx*rr, y=cy+Math.cos(b)*ry*rr, z=cz+Math.sin(b)*Math.sin(a)*rx*rr, s=rx*(0.55+R()*0.35);
      const m=M4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(R()*3,R()*3,R()*3)),new T.Vector3(s,s,s)); const c=new T.Color(cores[(R()*cores.length)|0]);
      L.push({g:new T.PlaneGeometry(1,1),m,c,nc:new T.Vector3(cx,cy-ry*0.3,cz)}); } return L; };
  const tronco=(h,r0,r1,galhos,altG)=>{ const L=[{g:new T.CylinderGeometry(r1,r0,h,9,4),m:M4().makeTranslation(0,h/2,0)}];
    for(let k=0;k<galhos;k++){ const a=k/galhos*Math.PI*2+R(), l=altG*(0.5+R()*0.4), ang=0.7+R()*0.35, g=new T.CylinderGeometry(r1*0.35,r1*0.6,l,6);
      const m=M4().compose(new T.Vector3(Math.cos(a)*Math.sin(ang)*l/2,h*0.82+Math.cos(ang)*l/2,Math.sin(a)*Math.sin(ang)*l/2),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(Math.cos(a)*Math.sin(ang),Math.cos(ang),Math.sin(a)*Math.sin(ang))),new T.Vector3(1,1,1)); L.push({g,m}); }
    return rlMerge(L); };
  const verdes=['#ffffff','#e9f2dc','#cfe0b5','#f4f0d6','#dfead0'];
  /* 0: árvore de calçada (oiti), 6,5 m, copa 5 m */
  out.arv=[{tr:tronco(3.2,0.17,0.12,4,2.6),co:rlMerge(copa(0,4.6,0,2.5,1.8,70,verdes))},
           {tr:tronco(4.0,0.2,0.14,5,3.0),co:rlMerge(copa(0,5.6,0,3.1,2.2,90,verdes))},
           {tr:tronco(2.4,0.12,0.09,3,1.8),co:rlMerge(copa(0,3.4,0,1.8,1.5,45,['#ffffff','#dcebc8','#f5f5e0']))}];
  /* palmeira (coqueiro): tronco curvo + folhas em leque */
  { const L=[], h=8.5; for(let k=0;k<10;k++){ const y0=k/10*h, y1=(k+1)/10*h, x0=Math.pow(k/10,2)*0.9, x1=Math.pow((k+1)/10,2)*0.9, g=new T.CylinderGeometry(0.13-0.004*(k+1),0.15-0.004*k,y1-y0,8);
      const dir=new T.Vector3(x1-x0,y1-y0,0).normalize(); L.push({g,m:M4().compose(new T.Vector3((x0+x1)/2,(y0+y1)/2,0),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir),new T.Vector3(1,1,1))}); }
    const tr=rlMerge(L), F=[];
    for(let k=0;k<14;k++){ const a=k/14*Math.PI*2+R()*0.3, inc=-0.15-R()*0.65, comp=3.6+R()*1.2, g=new T.PlaneGeometry(comp,1.1); g.translate(comp/2,0,0);
      const q=new T.Quaternion().setFromEuler(new T.Euler(R()*0.6-0.3+Math.PI/2*0.2,a,inc,'YXZ')); F.push({g,m:M4().compose(new T.Vector3(0.9,h,0),q,new T.Vector3(1,1,1)),c:new T.Color(['#ffffff','#e8efcf','#d7e4b8'][k%3])}); }
    out.palma={tr,co:rlMerge(F)}; }
  /* poste de concreto 9 m com braço e luminária LED (braço no +x local) */
  { const conc=rlMerge([{g:new T.CylinderGeometry(0.085,0.15,9,10),m:M4().makeTranslation(0,4.5,0)},{g:new T.CylinderGeometry(0.2,0.22,0.35,10),m:M4().makeTranslation(0,0.12,0)}]);
    const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(1,0.18,0).normalize());
    const met=rlMerge([{g:new T.CylinderGeometry(0.035,0.04,2.2,8),m:M4().compose(new T.Vector3(1.05,8.55,0),q,new T.Vector3(1,1,1))},{g:new T.BoxGeometry(0.72,0.11,0.30),m:M4().makeTranslation(2.25,8.78,0)},{g:new T.BoxGeometry(0.1,0.25,0.25),m:M4().makeTranslation(0.05,8.4,0)}]);
    const len=rlMerge([{g:new T.PlaneGeometry(0.6,0.24),m:M4().compose(new T.Vector3(2.25,8.722,0),new T.Quaternion().setFromEuler(new T.Euler(Math.PI/2,0,0)),new T.Vector3(1,1,1))}]);
    out.poste={conc,met,len}; }
  /* grama 3D: tufo de folhas finas (cor da base escura → ponta clara) */
  { const P=[], C=[], N=[]; for(let k=0;k<9;k++){ const a=R()*Math.PI*2, r=R()*0.09, x=Math.cos(a)*r, z=Math.sin(a)*r, h=0.18+R()*0.3, w=0.012+R()*0.012, b=a+Math.PI/2, bx=Math.cos(b)*w, bz=Math.sin(b)*w, inc=(R()-0.5)*0.25, tx=x+Math.cos(a)*inc*h, tz=z+Math.sin(a)*inc*h;
      P.push(x-bx,0,z-bz, x+bx,0,z+bz, tx,h,tz); const c0=new T.Color('#2d4a19'), c1=new T.Color(['#7c9a3e','#94a94f','#6d8d34','#a3ad5c'][k%4]); C.push(c0.r,c0.g,c0.b,c0.r,c0.g,c0.b,c1.r,c1.g,c1.b); N.push(0,1,0,0,1,0,0,1,0); }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('color',new T.Float32BufferAttribute(C,3)); g.setAttribute('normal',new T.Float32BufferAttribute(N,3)); out.grama=g; }
  return RL.mod11=out;
}
/* altura do chão (malha do terreno, bilinear) */
function rlChaoY(t,p){ const m=t.terr; if(!m) return null; const fx=(p[0]-m.x0)/m.cel, fy=(p[1]-m.y0)/m.cel; if(fx<0||fy<0||fx>m.nx||fy>m.ny) return null;
  const ix=Math.min(m.nx-1,Math.floor(fx)), iy=Math.min(m.ny-1,Math.floor(fy)), tx=fx-ix, ty=fy-iy, w=m.nx+1, h=m.h, a=h[iy*w+ix], b=h[iy*w+ix+1], c=h[(iy+1)*w+ix], d=h[(iy+1)*w+ix+1];
  /* PI-12: mesma divisão em triângulos da malha desenhada (a,b,c / b,d,c): o que assenta aqui encosta na malha */
  return (tx+ty<=1)?(a+(b-a)*tx+(c-a)*ty):(d+(c-d)*(1-tx)+(b-d)*(1-ty)); }
function rlChaoTerra(t,p){ const m=t.terr; if(!m||!m.c) return 0; const ix=Math.round((p[0]-m.x0)/m.cel), iy=Math.round((p[1]-m.y0)/m.cel); if(ix<0||iy<0||ix>m.nx||iy>m.ny) return 0; return m.c[iy*(m.nx+1)+ix]; }
function rlHorizonte(ctx){
  const T=window.THREE, t=RL.t3, m=t.terr, grp=ctx.grp, R=ctx.R; if(!m) return;
  const w=m.nx+1, borda=[]; for(let ix=0;ix<=m.nx;ix++) borda.push([ix,0]); for(let iy=1;iy<=m.ny;iy++) borda.push([m.nx,iy]); for(let ix=m.nx-1;ix>=0;ix--) borda.push([ix,m.ny]); for(let iy=m.ny-1;iy>0;iy--) borda.push([0,iy]);
  const cx=m.x0+m.nx*m.cel/2, cy=m.y0+m.ny*m.cel/2, hm=borda.reduce((s,b)=>s+m.h[b[1]*w+b[0]],0)/borda.length;
  const anel=[0,0.35,1.2,4,12].map(f=>f*R+0.0), P=[], U=[], C=[], I=[];
  borda.forEach(b=>{ const x=m.x0+b[0]*m.cel, y=m.y0+b[1]*m.cel, dx=x-cx, dy=y-cy, l=Math.hypot(dx,dy)||1, h0=m.h[b[1]*w+b[0]];
    anel.forEach((dd,k)=>{ const px=x+dx/l*dd, py=y+dy/l*dd, f=Math.min(1,k/2), hh=h0+(hm-h0)*f-(k>=3?0.4*k:0); P.push(px,hh,-py); U.push(px/3,py/3); C.push(1,1,1); }); });
  const na=anel.length; for(let i=0;i<borda.length;i++){ const i2=(i+1)%borda.length; for(let k=0;k<na-1;k++){ const a=i*na+k, b=i2*na+k, c=i*na+k+1, d2=i2*na+k+1; I.push(a,c,b,b,c,d2); } }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('uv',new T.Float32BufferAttribute(U,2)); g.setIndex(I); g.computeVertexNormals();
  if(g.attributes.normal){ const n=g.attributes.normal; let ny=0; for(let i=0;i<n.count;i++) ny+=n.getY(i); if(ny<0){ I.reverse(); g.setIndex(I); g.computeVertexNormals(); } }
  const me=new T.Mesh(g,rlMat11('terrenoLonge')); me.receiveShadow=true; grp.add(me); t.chao.push(me);
  /* morros */
  const hz=t.ceuMat.uniforms.uHor.value, base=new T.Color('#3f5a35').convertSRGBToLinear(), seg=96, P2=[], C2=[], I2=[], r0=R*9, rnd=rlRnd(77);
  for(let i=0;i<=seg;i++){ const a=i/seg*Math.PI*2, hh=(rlRuido(i*0.18,3.3)*0.7+rlRuido(i*0.05,9.1)*0.9)*R*0.55+R*0.05, rr=r0*(0.9+rlRuido(i*0.1,5)*0.25);
    P2.push(cx+Math.cos(a)*rr,hm-2,-(cy+Math.sin(a)*rr), cx+Math.cos(a)*rr,hm+hh,-(cy+Math.sin(a)*rr));
    const c1=base.clone().lerp(hz,0.72), c2=base.clone().lerp(hz,0.55); C2.push(c1.r,c1.g,c1.b,c2.r,c2.g,c2.b); }
  for(let i=0;i<seg;i++){ const a=i*2; I2.push(a,a+2,a+1,a+1,a+2,a+3); }
  const g2=new T.BufferGeometry(); g2.setAttribute('position',new T.Float32BufferAttribute(P2,3)); g2.setAttribute('color',new T.Float32BufferAttribute(C2,3)); g2.setIndex(I2); g2.computeVertexNormals();
  const mm=rlMat11('morro'); mm.side=T.DoubleSide; const morro=new T.Mesh(g2,mm); morro.renderOrder=-5; grp.add(morro);
}
function rlTick(t){
  if(!t.ceu) return; const dt=t.relogio.getDelta(); t.uT.value+=Math.min(dt,0.1); t.ceuMat.uniforms.uT.value=t.uT.value;
  t.ceu.position.copy(t.cam.position);
  const tg=t.ctl.target, dist=t.cam.position.distanceTo(tg), S=Math.max(14,Math.min(t.Rcena*0.9||200,dist*0.95));
  if(t.solDir&&(t.precisaSombra||!t.sTg||t.sTg.distanceTo(tg)>S*0.08||Math.abs(S-t.sS)/t.sS>0.12)){
    t.precisaSombra=false; t.sTg=tg.clone(); t.sS=S; const sun=t.sun; sun.position.copy(tg).addScaledVector(t.solDir,S*3); sun.target.position.copy(tg); sun.target.updateMatrixWorld();
    const c=sun.shadow.camera; c.left=-S; c.right=S; c.top=S; c.bottom=-S; c.near=0.5; c.far=S*7; c.updateProjectionMatrix(); }
}
function rlRuido(x,y){ const h=(i,j)=>{ const n=Math.sin(i*127.1+j*311.7)*43758.5453; return n-Math.floor(n); }; const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  const a=h(i,j),b=h(i+1,j),c=h(i,j+1),d=h(i+1,j+1); return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy; }
/* ══ ES-04 · parte própria do Esgoto ══ */
/* textura de asfalto (cor + relevo), no mesmo padrão do rlTex2 */
function rlTexAsf() {
  const c = RL.tex2 || (RL.tex2 = {}); if (c.asf) return c.asf;
  const q = RL_QUAL[rlQualK()], N = Math.min(1024, q.tex), cor = rlCanvas(N), alt = rlCanvas(N), g = cor.getContext('2d'), ga = alt.getContext('2d'), R0 = rlRnd(31337);
  g.fillStyle = '#4b4d50'; g.fillRect(0, 0, N, N); ga.fillStyle = '#707070'; ga.fillRect(0, 0, N, N);
  for (let k = 0; k < N * N / 3; k++) { const x = R0() * N, y = R0() * N, s = 0.8 + R0() * 1.8, v = (40 + R0() * 90) | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 4) + ',.55)'; g.fillRect(x, y, s, s); ga.fillStyle = R0() < 0.5 ? '#3a3a3a' : '#bdbdbd'; ga.fillRect(x, y, s, s); }
  for (let k = 0; k < 30; k++) { const x = R0() * N, y = R0() * N, r = N * (0.05 + R0() * 0.2), gd = g.createRadialGradient(x, y, 0, x, y, r); gd.addColorStop(0, R0() < 0.5 ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.06)'); gd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gd; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  const an = RL.t3 ? Math.min(16, RL.t3.rd.capabilities.getMaxAnisotropy()) : 4;
  return c.asf = {map: rlTexDe(cor, true, an), normalMap: rlTexDe(rlNormal(alt, 3), false, an)};
}
/* materiais próprios (não compartilhados com o kit, para a transparência da “Rua %” não mexer nas casas) */
function rlMatE(k) {
  const T = THREE, c = RL.matE || (RL.matE = {}); if (c[k]) return c[k];
  const S = o => { const m = new T.MeshStandardMaterial(Object.assign({color: 0xffffff, roughness: 0.9, metalness: 0}, o)); return m; };
  let m;
  if (k === 'asf') { const t = rlTexAsf(); m = rlShader(S({map: t.map, normalMap: t.normalMap, roughness: 0.93, envMapIntensity: 0.5, normalScale: new T.Vector2(0.7, 0.7)}), {macro: 30, macA: 0.12}); }
  else if (k === 'bloco') { const t = rlTex2('pav'); m = rlShader(S({map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, envMapIntensity: 0.7}), {macro: 22, macA: 0.03}); }
  else if (k === 'terraRua') { const t = rlTex2('terra'); m = S({map: t.map, normalMap: t.normalMap, roughness: 1}); }
  else if (k === 'calc') { const t = rlTex2('calcConc'); m = rlShader(S({map: t.map, normalMap: t.normalMap, roughness: 0.88, envMapIntensity: 0.6}), {macro: 18, macA: 0.12}); }
  else if (k === 'mf') { const t = rlTex2('concreto'); m = rlShader(S({map: t.map, normalMap: t.normalMap, color: 0xe4e2dc, roughness: 0.85, envMapIntensity: 0.6}), {macro: 18, macA: 0.1}); }
  else if (k === 'terr') { const t = rlTex2('grama'); m = rlShader(S({map: t.map, normalMap: t.normalMap, vertexColors: true, roughness: 1, envMapIntensity: 0.45, normalScale: new T.Vector2(0.8, 0.8)}), {macro: 35, macA: 0.32, terra: true}); }
  else if (k === 'faixa') m = S({color: 0xf1f1ea, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4});
  m.side = THREE.DoubleSide; m.userData.solo = 1; return c[k] = m;
}
/* transparência da rua/calçada/terreno (botão 🛣 Rua %), para enxergar a rede enterrada */
function rlSolo() { const o = T3.solo; Object.values(RL.matE || {}).forEach(m => { if (!m.userData.solo) return; m.transparent = o < 0.999; m.opacity = o; m.depthWrite = o >= 0.999; m.needsUpdate = true; });
  if (RL.terrSat) { const m = RL.terrSat; m.transparent = o < 0.999; m.opacity = o; m.depthWrite = o >= 0.999; m.needsUpdate = true; } }
/* geometria plana: interseção de retas P1 + d1·s e P2 + d2·t → ponto */
function rlInter(P1, d1, P2, d2) { const det = d1[0] * d2[1] - d1[1] * d2[0]; if (Math.abs(det) < 1e-9) return null; const s = ((P2[0] - P1[0]) * d2[1] - (P2[1] - P1[1]) * d2[0]) / det; return [P1[0] + d1[0] * s, P1[1] + d1[1] * s]; }
function rlDentro(p, pl) { let c = false; for (let i = 0, j = pl.length - 1; i < pl.length; j = i++) { const a = pl[i], b = pl[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
/* ruas do 3D: os trechos da rede + ligação curta entre nós colados (cabeceira a poucos metros do cruzamento) */
function rlRuas() {
  const c = R.c, E = ESG.estrelas(P, R), w = E.w, alin = E.alin, nos = E.nos, zNo = id => (R.no[id] ? R.no[id].ct : (+(nos.get(id) || {}).ct || 0));
  E.S.forEach(s => { const r = R.tr[s.id]; s.za = r && !s.virt ? r.ctM : zNo(s.a); s.zb = r && !s.virt ? r.ctJ : zNo(s.b); });
  /* ES-05: raio do meio-fio (crit.raioMF) e raio do muro (raio − largura do passeio) em cada esquina de quadra */
  const cantos = ESG.esquinas(P, R, E), stMax = new Map(); cantos.forEach(cn => stMax.set(cn.no, Math.max(stMax.get(cn.no) || 0, cn.st)));
  return {S: E.S, est: E.est, w, alin, nos, zNo, cantos, stMax};
}
/* canto da esquina entre a rua k e a seguinte (anti-horária) no nó (memoriza) */
function rlCantoK(RU, no, k) { const l = RU.est.get(no), key = no + '|' + k; if (!RU.cm) RU.cm = new Map(); if (!RU.cm.has(key)) { const N = RU.nos.get(no); RU.cm.set(key, ESG.canto([N.x, N.y], l[k], l[(k + 1) % l.length], {w: RU.w, alin: RU.alin, R: +R.c.raioMF}) || null); } return RU.cm.get(key); }
/* cota da rua no ponto (projeção na rua mais próxima) e distância ao eixo; grade de busca */
function rlIndice(RU) {
  const CEL = 30, gr = new Map(), k = (i, j) => i + ',' + j;
  RU.S.forEach(s => { const x0 = Math.min(s.A[0], s.B[0]) - RU.alin, x1 = Math.max(s.A[0], s.B[0]) + RU.alin, y0 = Math.min(s.A[1], s.B[1]) - RU.alin, y1 = Math.max(s.A[1], s.B[1]) + RU.alin;
    for (let i = Math.floor(x0 / CEL); i <= Math.floor(x1 / CEL); i++) for (let j = Math.floor(y0 / CEL); j <= Math.floor(y1 / CEL); j++) { const q = k(i, j); if (!gr.has(q)) gr.set(q, []); gr.get(q).push(s); } });
  return (x, y, raio) => { let best = null; const r = raio || 0; const li = new Set();
    for (let i = Math.floor((x - r) / CEL); i <= Math.floor((x + r) / CEL); i++) for (let j = Math.floor((y - r) / CEL); j <= Math.floor((y + r) / CEL); j++) (gr.get(k(i, j)) || []).forEach(s => li.add(s));
    li.forEach(s => { const ex = s.B[0] - s.A[0], ey = s.B[1] - s.A[1], l2 = ex * ex + ey * ey || 1e-9; let t = ((x - s.A[0]) * ex + (y - s.A[1]) * ey) / l2; t = Math.max(0, Math.min(1, t));
      const px = s.A[0] + t * ex, py = s.A[1] + t * ey, d = Math.hypot(x - px, y - py); if (!best || d < best.d) best = {d, s, t, px, py, z: s.za + (s.zb - s.za) * t}; });
    return best; };
}
/* linha de corte da calçada na ponta de uma rua (nó, direção de saída i, lado 'L' esquerda / 'R' direita) */
function rlCorte(RU, no, i, lado) {
  const l = RU.est.get(no), N = [RU.nos.get(no).x, RU.nos.get(no).y], d = l[i], n = l.length;
  if (n === 1) return {P: N, d: [-d.u[1], d.u[0]]};                       /* ponta morta: corte reto */
  const j = lado === 'L' ? (i + 1) % n : (i - 1 + n) % n, e = l[j];
  let th = lado === 'L' ? e.ang - d.ang : d.ang - e.ang; while (th <= 0) th += 2 * Math.PI;
  if (th < Math.PI * 0.97) {                                               /* esquina: corta no alinhamento da rua vizinha (do lado desta quadra) */
    const cn = rlCantoK(RU, no, lado === 'L' ? i : j);                    /* ES-05: com raio, corta na tangente do meio-fio (perpendicular à rua) */
    if (cn) return {P: [cn.cc[0] + d.u[0] * cn.t, cn.cc[1] + d.u[1] * cn.t], d: [-d.u[1], d.u[0]], esq: true, arco: true};
    const ne = lado === 'L' ? [e.u[1], -e.u[0]] : [-e.u[1], e.u[0]];      /* normal da vizinha apontando para a quadra */
    return {P: [N[0] + ne[0] * RU.alin, N[1] + ne[1] * RU.alin], d: e.u, esq: true};
  }
  /* ES-05b: rua que começa no TL colado ao cruzamento (trecho virtual de poucos metros): o raio da esquina do cruzamento acaba na tangente, que cai
     ALÉM do TL — a calçada e o meio-fio desta rua só começam ali (senão sobra uma barra reta no meio da curva) */
  if (e.s.virt && !d.s.virt) { const M = e.s.a === no ? e.s.b : e.s.a, l2 = RU.est.get(M), n2 = l2 ? l2.length : 0, k2 = n2 ? l2.findIndex(x => x.s === e.s) : -1;
    if (k2 >= 0) { const sd = lado === 'L' ? [-d.u[1], d.u[0]] : [d.u[1], -d.u[0]];
      for (const k of [k2, (k2 - 1 + n2) % n2]) { const cn = rlCantoK(RU, M, k); if (!cn || (cn.cc[0] - N[0]) * sd[0] + (cn.cc[1] - N[1]) * sd[1] <= 0) continue;
        const dir = l2[k2].u, TP = [cn.cc[0] + dir[0] * cn.t, cn.cc[1] + dir[1] * cn.t];
        if ((TP[0] - N[0]) * d.u[0] + (TP[1] - N[1]) * d.u[1] > 0.05) return {P: TP, d: [-d.u[1], d.u[0]], esq: true, arco: true}; } } }
  /* continuação ou canto convexo: corte na bissetriz (as duas calçadas se encontram em meia-esquadria) */
  const a = (lado === 'L' ? d.ang + th / 2 : d.ang - th / 2); return {P: N, d: [Math.cos(a), Math.sin(a)]};
}
/* terreno: grade com cota interpolada (IDW) que encosta no fim da calçada; buracos onde está a rua */
function rlTerreno(RU, idx, ctx) {
  const T = THREE, L = ctx.L, M = ctx.M, cel = Math.max(1.5, Math.min(4, Math.sqrt((L.w + 2 * M) * (L.h + 2 * M) / 40000))), nx = Math.ceil((L.w + 2 * M) / cel), ny = Math.ceil((L.h + 2 * M) / cel), x0 = L.x - M, y0 = L.y - M;
  const pts = P.nos.map(n => ({x: n.x, y: n.y, z: R.no[n.id] ? R.no[n.id].ct : +n.ct || 0})).concat(P.topo.map(q => ({x: q.x, y: q.y, z: +q.z || 0})));
  P.ruas.forEach(r => r.pts.forEach(q => { if (q.z != null && q.z !== '') pts.push({x: q.x, y: q.y, z: +q.z}); }));
  const W = nx + 1, X = new Float32Array((nx + 1) * (ny + 1)), Y = new Float32Array(X.length), H = new Float32Array(X.length), dentro = new Uint8Array(X.length), terra = new Float32Array(X.length);
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const k = j * W + i; let x = x0 + i * cel, y = y0 + j * cel; let z = pts.length ? ESG.idw(pts, x, y) : 0;
    const q = idx(x, y, RU.alin + 12);
    if (q) { if (q.d < RU.alin) { dentro[k] = q.d < RU.alin - 0.05 ? 1 : 0; const f = q.d > 0.01 ? RU.alin / q.d : 0; if (f) { x = q.px + (x - q.px) * f; y = q.py + (y - q.py) * f; } z = q.z + 0.15; }
      else if (q.d < RU.alin + 12) { const f = (q.d - RU.alin) / 12, s = f * f * (3 - 2 * f); z = (q.z + 0.15) * (1 - s) + z * s; } }
    X[k] = x; Y[k] = y; H[k] = z; }
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const k = j * W + i, a = H[j * W + Math.min(nx, i + 1)] - H[j * W + Math.max(0, i - 1)], b = H[Math.min(ny, j + 1) * W + i] - H[Math.max(0, j - 1) * W + i]; terra[k] = Math.max(0, Math.min(1, Math.hypot(a, b) / (2 * cel) * 2.2 - 0.35)); }
  const pos = [], uv = [], col = [], at = [], ind = [];
  for (let k = 0; k < X.length; k++) { const p = P3(X[k], Y[k], H[k]); pos.push(p.x, p.y, p.z); uv.push(X[k] / 3, Y[k] / 3); col.push(1, 1, 1); at.push(terra[k]); }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
    const tri = (p, q, r) => { if (dentro[p] && dentro[q] && dentro[r]) return; const cx = (X[p] + X[q] + X[r]) / 3, cy = (Y[p] + Y[q] + Y[r]) / 3, z = idx(cx, cy, RU.alin); if (z && z.d < RU.alin - 0.06) return; if (rlPontaCanto(RU, cx, cy)) return; ind.push(p, q, r); };
    tri(a, c, b); tri(b, c, d); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('aTerra', new T.Float32BufferAttribute(at, 1)); g.setIndex(ind); g.computeVertexNormals();
  { const nn = g.attributes.normal; let s = 0; for (let i = 0; i < nn.count; i++) s += nn.getY(i); if (s < 0) { for (let i = 0; i < ind.length; i += 3) { const t = ind[i]; ind[i] = ind[i + 1]; ind[i + 1] = t; } g.setIndex(ind); g.computeVertexNormals(); } }
  /* t.terr no formato do kit (para o horizonte): local, cotas − z0 */
  const hl = new Float32Array(H.length); for (let k = 0; k < H.length; k++) hl[k] = H[k] - T3.z0;
  RL.t3.terr = {x0: x0 - T3.cx, y0: y0 - T3.cy, cel, nx, ny, h: hl};
  RL.grade = {x0, y0, cel, nx, ny, H, X, Y};
  return g;
}
/* ES-05: o ponto está na ponta da quadra cortada pelo arco do muro (vira calçada)? */
function rlPontaCanto(RU, x, y) { for (const cn of RU.cantos) { if (!cn.Rm) continue; const dx = x - cn.C[0], dy = y - cn.C[1], d = Math.hypot(dx, dy); if (d < cn.Rm + 0.05 || d > cn.R) continue;
  let rel = Math.atan2(dy, dx) - cn.a1; while (rel > Math.PI) rel -= 2 * Math.PI; while (rel < -Math.PI) rel += 2 * Math.PI; const sg = cn.dA < 0 ? -1 : 1; rel *= sg; if (rel >= -0.02 && rel <= Math.abs(cn.dA) + 0.02) return true; } return false; }
/* ES-05: recorta o muro p0→p1 onde ele entraria na ponta cortada pelo arco (ao longo da linha do alinhamento, só vale depois da tangente) */
function rlMuroRecorta(RU, p0, p1) { let a = p0, b = p1;
  for (const cn of RU.cantos) { if (!cn.Rm) continue;
    for (const r of [cn.a, cn.b]) { const u = r.u, nrm = [-u[1], u[0]], dd = q => Math.abs((q[0] - cn.aa[0]) * nrm[0] + (q[1] - cn.aa[1]) * nrm[1]);
      if (dd(a) > 0.2 || dd(b) > 0.2) continue; const sa = (a[0] - cn.aa[0]) * u[0] + (a[1] - cn.aa[1]) * u[1], sb = (b[0] - cn.aa[0]) * u[0] + (b[1] - cn.aa[1]) * u[1]; if (Math.min(sa, sb) < -0.5) continue;
      if (sa >= cn.tm - 0.01 && sb >= cn.tm - 0.01) continue; if (sa < cn.tm && sb < cn.tm) return null;
      const f = (cn.tm - sa) / (sb - sa); if (sa < cn.tm) a = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; else b = [b[0] + (a[0] - b[0]) * (1 - f), b[1] + (a[1] - b[1]) * (1 - f)]; } }
  return [a, b]; }
/* cota do chão (m) num ponto do projeto, pela grade do terreno */
function rlChao(x, y) { const m = RL.grade; if (!m) return null; const fx = (x - m.x0) / m.cel, fy = (y - m.y0) / m.cel; if (fx < 0 || fy < 0 || fx > m.nx || fy > m.ny) return null;
  const ix = Math.min(m.nx - 1, Math.floor(fx)), iy = Math.min(m.ny - 1, Math.floor(fy)), tx = fx - ix, ty = fy - iy, w = m.nx + 1, h = m.H, a = h[iy * w + ix], b = h[iy * w + ix + 1], c = h[(iy + 1) * w + ix], d = h[(iy + 1) * w + ix + 1];
  return (tx + ty <= 1) ? (a + (b - a) * tx + (c - a) * ty) : (d + (c - d) * (1 - tx) + (b - d) * (1 - ty)); }
/* rua (pista, nós), calçada, meio-fio e faixa central */
function rlRua(RU, grp) {
  const T = THREE, w = RU.w, al = RU.alin, mf = 0.15, bmf = 0.13, B = {pis: rlBuild(), cal: rlBuild(), mf: rlBuild(), fx: rlBuild()}, br = new T.Color(1, 1, 1), up = new T.Vector3(0, 1, 0);
  const W = (p, z) => P3(p[0], p[1], z), pav = R.c.pav === 'intertravado' || R.c.pav === 'paralelo' ? 'bloco' : R.c.pav === 'terra' ? 'terraRua' : 'asf';
  const uvq = (a, b, c, d, out, bld) => { /* quad com UV no mundo (as texturas casam entre peças vizinhas) */
    const V = [a, b, c, d], U = V.map(v => [(v.x + T3.cx) / 4, (-v.z + T3.cy) / 4]); const n = new T.Vector3().subVectors(b, a).cross(new T.Vector3().subVectors(c, a));
    if (n.dot(out) < 0) { bld.tri(a, d, c, U[0], U[3], U[2], br); bld.tri(a, c, b, U[0], U[2], U[1], br); } else { bld.tri(a, b, c, U[0], U[1], U[2], br); bld.tri(a, c, d, U[0], U[2], U[3], br); } };
  const lin = (P0, d, o, n) => [P0[0] + n[0] * o, P0[1] + n[1] * o];   /* ponto da reta deslocada */
  RU.S.forEach(s => {
    const zA = s.za, zB = s.zb, z = p => { const t = Math.max(0, Math.min(1, ((p[0] - s.A[0]) * s.u[0] + (p[1] - s.A[1]) * s.u[1]) / s.l)); return zA + (zB - zA) * t; };
    /* pista inteira de nó a nó (no cruzamento as pistas se sobrepõem com a mesma textura no mundo) */
    const a1 = lin(s.A, 0, w, s.n), a2 = lin(s.A, 0, -w, s.n), b1 = lin(s.B, 0, w, s.n), b2 = lin(s.B, 0, -w, s.n);
    uvq(W(a2, zA), W(b2, zB), W(b1, zB), W(a1, zA), up, B.pis);
    /* faixa central tracejada (3 m pintados, 3 m sem), longe dos cruzamentos */
    if (RL.vis.faixa && !s.virt && R.c.pav !== 'terra') { const ea = RU.est.get(s.a).length > 2 ? Math.max(al + 1, (RU.stMax.get(s.a) || 0) + 0.8) : 1, eb = RU.est.get(s.b).length > 2 ? Math.max(al + 1, (RU.stMax.get(s.b) || 0) + 0.8) : 1;
      for (let x = ea; x + 3 <= s.l - eb; x += 6) { const p0 = [s.A[0] + s.u[0] * x, s.A[1] + s.u[1] * x], p1 = [p0[0] + s.u[0] * 3, p0[1] + s.u[1] * 3], o = 0.06;
        uvq(W(lin(p0, 0, -o, s.n), z(p0) + 0.004), W(lin(p1, 0, -o, s.n), z(p1) + 0.004), W(lin(p1, 0, o, s.n), z(p1) + 0.004), W(lin(p0, 0, o, s.n), z(p0) + 0.004), up, B.fx); } }
    if (!RL.vis.calcada) return;
    /* calçada e meio-fio dos dois lados, cortados nas pontas */
    const iA = RU.est.get(s.a).findIndex(e => e.s === s && e.p === 'a'), iB = RU.est.get(s.b).findIndex(e => e.s === s && e.p === 'b');
    [['L', 1], ['R', -1]].forEach(([lado, sg]) => {
      const cA = rlCorte(RU, s.a, iA, lado), cB = rlCorte(RU, s.b, iB, lado === 'L' ? 'R' : 'L'), nn = [s.n[0] * sg, s.n[1] * sg];
      const pt = (o, c) => rlInter(lin(s.A, 0, o, nn), s.u, c.P, c.d) || lin(c.P, 0, o, nn);
      const i0 = pt(w, cA), i1 = pt(w, cB), m0 = pt(w + bmf, cA), m1 = pt(w + bmf, cB), o0 = pt(al, cA), o1 = pt(al, cB);
      if (((i1[0] - i0[0]) * s.u[0] + (i1[1] - i0[1]) * s.u[1]) < 0.05) return;
      const out3 = new T.Vector3(-nn[0], 0, nn[1]);   /* face do meio-fio olha para a pista */
      uvq(W(i0, z(i0)), W(i1, z(i1)), W(i1, z(i1) + mf), W(i0, z(i0) + mf), out3, B.mf);                  /* espelho do meio-fio */
      uvq(W(i0, z(i0) + mf), W(i1, z(i1) + mf), W(m1, z(m1) + mf), W(m0, z(m0) + mf), up, B.mf);          /* topo do meio-fio */
      uvq(W(m0, z(m0) + mf), W(m1, z(m1) + mf), W(o1, z(o1) + mf), W(o0, z(o0) + mf), up, B.cal);         /* calçada */
      uvq(W(o0, z(o0) + mf), W(o1, z(o1) + mf), W(o1, z(o1) - 0.35), W(o0, z(o0) - 0.35), out3.clone().negate(), B.cal);   /* saia (esconde frestas) */
    });
  });
  /* nós: pista no cruzamento (polígono dos cantos do meio-fio) e calçada do canto */
  RU.est.forEach((l, no) => { const N = [RU.nos.get(no).x, RU.nos.get(no).y], zN = RU.zNo(no), n = l.length; if (n < 2) return;
    const cant = [];
    for (let i = 0; i < n; i++) { const d = l[i], e = l[(i + 1) % n]; let th = e.ang - d.ang; while (th <= 0) th += 2 * Math.PI;
      const nd = [-d.u[1], d.u[0]], ne = [e.u[1], -e.u[0]];
      const k = Math.abs(th - Math.PI) < 0.09 ? lin(N, 0, w, nd) : rlInter(lin(N, 0, w, nd), d.u, lin(N, 0, w, ne), e.u); if (k) cant.push(k);
      const cn = th < Math.PI * 0.97 ? rlCantoK(RU, no, i) : null;
      if (cn) {   /* ES-05: esquina com raio — meio-fio em arco de raio R e muro/alinhamento em arco de raio R − passeio (mesmo centro) */
        cn.n = Math.max(cn.n, 6); const Pc = ESG.arco(cn, cn.R), Pt = ESG.arco(cn, Math.max(0.05, cn.R - bmf)), Pa = cn.Rm ? ESG.arco(cn, cn.Rm) : Pt.map(() => cn.aa);
        if (k) cant.pop(); Pc.forEach(q => cant.push(q));
        if (RL.vis.calcada) for (let k = 0; k < Pc.length - 1; k++) {
          const g = cn.a1 + cn.dA * (k + 0.5) / (Pc.length - 1), rad = new T.Vector3(Math.cos(g), 0, -Math.sin(g)), zb = zN + mf;
          uvq(W(Pc[k], zN), W(Pc[k + 1], zN), W(Pc[k + 1], zb), W(Pc[k], zb), rad, B.mf);                       /* espelho do meio-fio */
          uvq(W(Pc[k], zb), W(Pc[k + 1], zb), W(Pt[k + 1], zb), W(Pt[k], zb), up, B.mf);                         /* topo */
          uvq(W(Pt[k], zb), W(Pt[k + 1], zb), W(Pa[k + 1], zb), W(Pa[k], zb), up, B.cal);                        /* calçada */
          if (cn.Rm) uvq(W(Pa[k], zb), W(Pa[k + 1], zb), W(Pa[k + 1], zN - 0.35), W(Pa[k], zN - 0.35), rad.clone().negate(), B.cal); }   /* saia */
      } else
      if (th < Math.PI * 0.97 && RL.vis.calcada) {   /* canto de quadra: calçada entre os meios-fios e os alinhamentos */
        const cc = rlInter(lin(N, 0, w, nd), d.u, lin(N, 0, w, ne), e.u), c1 = rlInter(lin(N, 0, w, nd), d.u, lin(N, 0, al, ne), e.u), aa = rlInter(lin(N, 0, al, nd), d.u, lin(N, 0, al, ne), e.u), c2 = rlInter(lin(N, 0, al, nd), d.u, lin(N, 0, w, ne), e.u);
        if (cc && c1 && aa && c2 && Math.hypot(aa[0] - N[0], aa[1] - N[1]) < al * 6) {
          const m1 = rlInter(lin(N, 0, w + bmf, nd), d.u, lin(N, 0, w + bmf, ne), e.u), q1 = rlInter(lin(N, 0, w + bmf, nd), d.u, lin(N, 0, al, ne), e.u), q2 = rlInter(lin(N, 0, al, nd), d.u, lin(N, 0, w + bmf, ne), e.u);
          uvq(W(m1, zN + mf), W(q1, zN + mf), W(aa, zN + mf), W(q2, zN + mf), up, B.cal);
          uvq(W(cc, zN + mf), W(c1, zN + mf), W(q1, zN + mf), W(m1, zN + mf), up, B.mf); uvq(W(cc, zN + mf), W(m1, zN + mf), W(q2, zN + mf), W(c2, zN + mf), up, B.mf);
          const o1 = new T.Vector3(-nd[0], 0, nd[1]), o2 = new T.Vector3(-ne[0], 0, ne[1]);
          uvq(W(c1, zN), W(cc, zN), W(cc, zN + mf), W(c1, zN + mf), o1, B.mf); uvq(W(cc, zN), W(c2, zN), W(c2, zN + mf), W(cc, zN + mf), o2, B.mf); } } }
    if (cant.length > 2) for (let i = 0; i < cant.length; i++) { const a = cant[i], b = cant[(i + 1) % cant.length]; const pa = W(N, zN - 0.003), pb = W(a, zN - 0.003), pc = W(b, zN - 0.003);
      const U = [pa, pb, pc].map(v => [(v.x + T3.cx) / 4, (-v.z + T3.cy) / 4]); const nrm = new T.Vector3().subVectors(pb, pa).cross(new T.Vector3().subVectors(pc, pa));
      if (nrm.y > 0) B.pis.tri(pa, pb, pc, U[0], U[1], U[2], br); else B.pis.tri(pa, pc, pb, U[0], U[2], U[1], br); } });
  const mk = (b, k, sombra) => { if (!b.P.length) return; const me = new T.Mesh(b.geo(), rlMatE(k)); me.receiveShadow = true; me.castShadow = !!sombra; grp.add(me); RL.t3.chao.push(me); return me; };
  mk(B.pis, pav); mk(B.cal, 'calc', true); mk(B.mf, 'mf', true); mk(B.fx, 'faixa');
}
/* lotes da planta (os mesmos das ligações prediais): muros com portão, casas, quintais com árvores */
function rlLotes(RU, idx, grp) {
  const T = THREE, q = RL_QUAL[rlQualK()], rnd = rlRnd(9173), B = {par: rlBuild(), mur: rlBuild(), tel: rlBuild(), laj: rlBuild(), vid: rlBuild(), cx: rlBuild(), por: rlBuild(), pto: rlBuild()};
  const br = new T.Color(1, 1, 1), up = new T.Vector3(0, 1, 0), v3 = (x, y) => new T.Vector3(x, 0, -y), W = (p, z) => P3(p[0], p[1], z);
  const CORES = ['#f1ece2', '#e9dcc2', '#f3e4b8', '#e8c9a8', '#dfe6e1', '#f0d9c9', '#d9e1ea', '#efe8d0', '#e4d4b4', '#c9d6c2', '#f5f1ea', '#e6c8b0'].map(c => new T.Color(c).convertSRGBToLinear());
  const CMURO = ['#e6e1d6', '#d8cfbf', '#cfc6b4', '#e9e4da', '#c7c0b2', '#ddd2bd'].map(c => new T.Color(c).convertSRGBToLinear());
  const chao = (x, y) => { const z = rlChao(x, y); if (z != null) return z; const r = idx(x, y, 60); return r ? r.z + 0.15 : null; };
  /* muros: cada divisa só uma vez (pedaços de ~2 m; pedaço já feito a menos de 0,5 m é pulado) */
  const feitos = new Map(), CEL = 4, kk = (x, y) => Math.floor(x / CEL) + ',' + Math.floor(y / CEL);
  const jaTem = (m, dir) => { const cx = Math.floor(m[0] / CEL), cy = Math.floor(m[1] / CEL); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const o of (feitos.get((cx + i) + ',' + (cy + j)) || [])) if (Math.hypot(o[0] - m[0], o[1] - m[1]) < 0.5 && Math.abs(o[2] * dir[0] + o[3] * dir[1]) > 0.9) return true; return false; };
  const marca = (m, dir) => { const k = kk(m[0], m[1]); if (!feitos.has(k)) feitos.set(k, []); feitos.get(k).push([m[0], m[1], dir[0], dir[1]]); };
  const muro = (q0, q1, h, cor, portao, sr) => { const rc = sr ? [q0, q1] : rlMuroRecorta(RU, q0, q1); if (!rc) return; const p0 = rc[0], p1 = rc[1], L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); if (L < 0.2) return; const d = [(p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L], n = [-d[1], d[0]], e = 0.075, nS = Math.max(1, Math.round(L / 2));
    for (let k = 0; k < nS; k++) { const a = [p0[0] + d[0] * L * k / nS, p0[1] + d[1] * L * k / nS], b = [p0[0] + d[0] * L * (k + 1) / nS, p0[1] + d[1] * L * (k + 1) / nS], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (!portao && jaTem(m, d)) continue; marca(m, d); const za = chao(a[0], a[1]), zb = chao(b[0], b[1]); if (za == null || zb == null) continue;
      const A = s => [a[0] + n[0] * e * s, a[1] + n[1] * e * s], Bp = s => [b[0] + n[0] * e * s, b[1] + n[1] * e * s], on = v3(n[0], n[1]), ln = (L / nS) / 2;
      const gate = portao && portao(m);
      if (gate) { B.pto.quad(W(A(-1.05), za + 0.02), W(Bp(-1.05), zb + 0.02), W(Bp(-1.05), zb + h - 0.1), W(A(-1.05), za + h - 0.1), on.clone().negate(), ln / 0.6, (h - 0.1) / 1.2, br);
        B.mur.quad(W(A(-1), za + h - 0.1), W(Bp(-1), zb + h - 0.1), W(Bp(1), zb + h), W(A(1), za + h), up, ln, 0.1, cor); continue; }
      B.mur.quad(W(A(1), za - 0.3), W(Bp(1), zb - 0.3), W(Bp(1), zb + h), W(A(1), za + h), on, ln, (h + 0.3) / 2, cor);
      B.mur.quad(W(A(-1), za - 0.3), W(Bp(-1), zb - 0.3), W(Bp(-1), zb + h), W(A(-1), za + h), on.clone().negate(), ln, (h + 0.3) / 2, cor);
      B.mur.quad(W(A(-1), za + h), W(Bp(-1), zb + h), W(Bp(1), zb + h), W(A(1), za + h), up, ln, 0.1, cor);
      if (k === 0) B.mur.quad(W(A(-1), za - 0.3), W(A(1), za - 0.3), W(A(1), za + h), W(A(-1), za + h), v3(-d[0], -d[1]), 0.1, 1, cor);
      if (k === nS - 1) B.mur.quad(W(Bp(-1), zb - 0.3), W(Bp(1), zb - 0.3), W(Bp(1), zb + h), W(Bp(-1), zb + h), v3(d[0], d[1]), 0.1, 1, cor); } };
  const arvPos = [], palPos = [], casas = [];
  const lotes = (R.ok ? ESG.ligacoes(P, R) : []).slice(0, 4000);
  if (RL.vis.muros) RU.cantos.forEach(cn => { if (!cn.Rm) return; const arc = ESG.arco(cn, cn.Rm, Math.max(6, cn.n)); for (let k = 0; k < arc.length - 1; k++) muro(arc[k], arc[k + 1], 2.0, CMURO[0], null, 1); });   /* ES-05: muro curvo na esquina */
  lotes.forEach(o => { const l = o.lote, n = [o.nx, o.ny], e = [o.ex, o.ey], w = Math.hypot(l[1][0] - l[0][0], l[1][1] - l[0][1]), D = o.D;
    /* n vai de l[0] para l[1] */ const nn = [(l[1][0] - l[0][0]) / (w || 1), (l[1][1] - l[0][1]) / (w || 1)];
    const F = (a, u) => [l[0][0] + nn[0] * a + e[0] * u, l[0][1] + nn[1] * a + e[1] * u];
    const cm = CMURO[(rnd() * CMURO.length) | 0], hm = 1.9 + rnd() * 0.4;
    if (RL.vis.muros) {
      const g0 = w * (rnd() < 0.5 ? 0.12 : 0.62), g1 = g0 + Math.min(3.2, w * 0.28);
      muro(F(0, 0.08), F(w, 0.08), hm, cm, m => { const a = (m[0] - l[0][0]) * nn[0] + (m[1] - l[0][1]) * nn[1]; return a > g0 && a < g1; });
      muro(F(w, 0), F(w, D), 2.0, cm); muro(F(0, 0), F(0, D), 2.0, cm); muro(F(0, D), F(w, D), 2.0, cm);
    }
    /* casa */
    let casa = null;
    if (RL.vis.casas && w >= 6.5 && D >= 11 && rnd() < 0.9) {
      const larg = Math.min(w - 2.6, 7 + rnd() * 3), aA = (w - larg) / 2 + (rnd() - 0.5) * 0.8, aB = aA + larg, u0 = 3 + rnd() * 2.5, pr = Math.min(8 + rnd() * 4, D - u0 - 2), u1 = u0 + pr;
      if (pr >= 5.5) { const amos = [0, 0.5, 1].flatMap(fa => [0, 0.5, 1].map(fb => { const p = F(aA + (aB - aA) * fa, u0 + (u1 - u0) * fb); return chao(p[0], p[1]); }));
        if (amos.every(z => z != null)) {
          const V = (a, u, z) => W(F(a, u), z), zb = Math.max(...amos) + 0.12, zf = Math.min(...amos) - 0.4, and = rnd() < 0.25 ? 2 : 1, hp = 2.9, zt = zb + hp * and, cor = CORES[(rnd() * CORES.length) | 0], tipo = rnd(), ov = 0.55;
          const pfr = v3(-e[0], -e[1]), pfu = v3(e[0], e[1]), pa = v3(-nn[0], -nn[1]), pb = v3(nn[0], nn[1]);
          const parede = zTop => { B.par.quad(V(aA, u0, zf), V(aB, u0, zf), V(aB, u0, zTop), V(aA, u0, zTop), pfr, larg / 2, (zTop - zf) / 2, cor); B.par.quad(V(aA, u1, zf), V(aB, u1, zf), V(aB, u1, zTop), V(aA, u1, zTop), pfu, larg / 2, (zTop - zf) / 2, cor);
            B.par.quad(V(aA, u0, zf), V(aA, u1, zf), V(aA, u1, zTop), V(aA, u0, zTop), pa, pr / 2, (zTop - zf) / 2, cor); B.par.quad(V(aB, u0, zf), V(aB, u1, zf), V(aB, u1, zTop), V(aB, u0, zTop), pb, pr / 2, (zTop - zf) / 2, cor); };
          if (tipo < 0.28) { parede(zt + 0.8); B.laj.quad(V(aA, u0, zt + 0.55), V(aB, u0, zt + 0.55), V(aB, u1, zt + 0.55), V(aA, u1, zt + 0.55), up, larg / 2, pr / 2, br);
            B.par.quad(V(aA, u0, zt + 0.8), V(aB, u0, zt + 0.8), V(aB, u0 + 0.15, zt + 0.8), V(aA, u0 + 0.15, zt + 0.8), up, 1, 0.1, cor); B.par.quad(V(aA, u1 - 0.15, zt + 0.8), V(aB, u1 - 0.15, zt + 0.8), V(aB, u1, zt + 0.8), V(aA, u1, zt + 0.8), up, 1, 0.1, cor); }
          else { parede(zt); const p0 = [aA - ov, u0 - ov], p1 = [aB + ov, u1 + ov], zE = zt - 0.05, pit = 0.32 + rnd() * 0.12, um = (u0 + u1) / 2;
            if (tipo < 0.62) { const zR = zE + (um - p0[1]) * pit;
              B.tel.quad(V(p0[0], p0[1], zE), V(p1[0], p0[1], zE), V(p1[0], um, zR), V(p0[0], um, zR), pfr.clone().add(up), (p1[0] - p0[0]) / 2, (um - p0[1]) / 2, br);
              B.tel.quad(V(p0[0], um, zR), V(p1[0], um, zR), V(p1[0], p1[1], zE), V(p0[0], p1[1], zE), pfu.clone().add(up), (p1[0] - p0[0]) / 2, (p1[1] - um) / 2, br);
              [aA, aB].forEach(a => B.par.tri(V(a, u0, zt), V(a, u1, zt), V(a, um, zt + (um - u0) * pit), [0, 0], [1, 0], [0.5, 0.5], cor)); }
            else { const hw = (p1[1] - p0[1]) / 2, zR = zE + hw * pit, ea2 = Math.min((p0[0] + p1[0]) / 2, p0[0] + hw), eb2 = Math.max((p0[0] + p1[0]) / 2, p1[0] - hw);
              B.tel.quad(V(p0[0], p0[1], zE), V(p1[0], p0[1], zE), V(eb2, um, zR), V(ea2, um, zR), pfr.clone().add(up), (p1[0] - p0[0]) / 2, hw / 2, br);
              B.tel.quad(V(ea2, um, zR), V(eb2, um, zR), V(p1[0], p1[1], zE), V(p0[0], p1[1], zE), pfu.clone().add(up), (p1[0] - p0[0]) / 2, hw / 2, br);
              const tA = [V(p0[0], p0[1], zE), V(ea2, um, zR), V(p0[0], p1[1], zE)], tB = [V(p1[0], p1[1], zE), V(eb2, um, zR), V(p1[0], p0[1], zE)];
              const tri = (x, y, z, o) => { const nr = new T.Vector3().subVectors(y, x).cross(new T.Vector3().subVectors(z, x)); if (nr.dot(o) < 0) B.tel.tri(x, z, y, [0, 0], [hw, 0], [hw / 2, hw / 2], br); else B.tel.tri(x, y, z, [0, 0], [hw / 2, hw / 2], [hw, 0], br); };
              tri(tA[0], tA[1], tA[2], pa.clone().add(up)); tri(tB[0], tB[1], tB[2], pb.clone().add(up)); }
            B.laj.quad(V(p0[0], p0[1], zE - 0.02), V(p1[0], p0[1], zE - 0.02), V(p1[0], p1[1], zE - 0.02), V(p0[0], p1[1], zE - 0.02), new T.Vector3(0, -1, 0), 1, 1, br); }
          /* janelas e porta (fachada voltada para a rua) e janelas nas laterais */
          const jan = (a0, a1, za, zb2, uu, o) => { B.cx.quad(V(a0 - 0.07, uu - 0.012, za - 0.07), V(a1 + 0.07, uu - 0.012, za - 0.07), V(a1 + 0.07, uu - 0.012, zb2 + 0.07), V(a0 - 0.07, uu - 0.012, zb2 + 0.07), o, 1, 1, br);
            B.vid.quad(V(a0, uu - 0.03, za), V(a1, uu - 0.03, za), V(a1, uu - 0.03, zb2), V(a0, uu - 0.03, zb2), o, 1, 1, br); };
          for (let f = 0; f < and; f++) { const zz = zb + f * hp, nj = larg > 8.5 ? 3 : 2; for (let k = 0; k < nj; k++) { const c = aA + larg * (k + 0.5) / nj, ww = 1.3;
              if (f === 0 && k === nj - 1) { B.por.quad(V(c - 0.45, u0 - 0.03, zb), V(c + 0.45, u0 - 0.03, zb), V(c + 0.45, u0 - 0.03, zb + 2.1), V(c - 0.45, u0 - 0.03, zb + 2.1), pfr, 1, 1, br); continue; }
              jan(c - ww / 2, c + ww / 2, zz + 0.95, zz + 2.15, u0, pfr); }
            [[aA, pa, -1], [aB, pb, 1]].forEach(([a, o, sg]) => { for (let k = 0; k < 2; k++) { const uc = u0 + pr * (k + 0.5) / 2, a1 = a + sg * 0.012, a2 = a + sg * 0.03;
              B.cx.quad(V(a1, uc - 0.6, zz + 1.0), V(a1, uc + 0.6, zz + 1.0), V(a1, uc + 0.6, zz + 2.1), V(a1, uc - 0.6, zz + 2.1), o, 1, 1, br);
              B.vid.quad(V(a2, uc - 0.53, zz + 1.07), V(a2, uc + 0.53, zz + 1.07), V(a2, uc + 0.53, zz + 2.03), V(a2, uc - 0.53, zz + 2.03), o, 1, 1, br); } }); }
          casa = [F(aA - ov, u0 - ov), F(aB + ov, u0 - ov), F(aB + ov, u1 + ov), F(aA - ov, u1 + ov)]; casas.push(casa);
        } } }
    /* árvores e coqueiros do quintal */
    if (RL.vis.arvc) { const na = rnd() < 0.7 ? (1 + (rnd() < 0.4 ? 1 : 0)) : 0;
      for (let k = 0; k < na; k++) { const p = F(1.5 + rnd() * Math.max(0.5, w - 3), rnd() < 0.4 ? 1.2 + rnd() * 1.4 : D - 4 + rnd() * 2.5), z = chao(p[0], p[1]); if (z == null || (casa && rlDentro(p, casa))) continue; (rnd() < 0.22 ? palPos : arvPos).push([p, z, rnd()]); } }
  });
  const mk = (b, k, cast) => { if (!b.P.length) return; const me = new T.Mesh(b.geo(), rlMat11(k)); me.castShadow = cast !== false; me.receiveShadow = true; grp.add(me); };
  mk(B.par, 'parede'); mk(B.tel, 'telha'); mk(B.laj, 'laje'); mk(B.vid, 'vidro', false); mk(B.cx, 'caixilho', false); mk(B.por, 'porta', false); mk(B.mur, 'parede'); mk(B.pto, 'portao');
  RL.casas = casas; RL.lotes = lotes;
  return {arvPos, palPos, casas, lotes};
}
/* árvores soltas no campo (fora dos lotes e das ruas) e grama 3D com vento perto das ruas */
function rlVegetacao(RU, idx, grp, V) {
  const T = THREE, q = RL_QUAL[rlQualK()], rnd = rlRnd(424242), MOD = rlModelos(), g = RL.grade; if (!g) return;
  const dentroLote = p => V.lotes.some(o => rlDentro(p, o.lote)), naCasa = p => V.casas.some(c => rlDentro(p, c));
  const W = (p, z) => P3(p[0], p[1], z);
  if (RL.vis.arvc) { const nCampo = Math.round(90 * q.arvq); let tent = 0;
    while (V.arvPos.length + V.palPos.length < nCampo + V.lotes.length * 1.1 && tent++ < nCampo * 12) { const p = [g.x0 + rnd() * g.nx * g.cel, g.y0 + rnd() * g.ny * g.cel], r = idx(p[0], p[1], RU.alin + 6);
      if (r && r.d < RU.alin + 4) continue; if (dentroLote(p)) continue; const z = rlChao(p[0], p[1]); if (z == null) continue; (rnd() < 0.15 ? V.palPos : V.arvPos).push([p, z, rnd()]); } }
  const inst = (geo, mat, lista, esc) => { if (!lista.length) return; const im = new T.InstancedMesh(geo, mat, lista.length), m = new T.Matrix4(), qq = new T.Quaternion();
    lista.forEach((x, i) => { const s = esc(x[2]); qq.setFromEuler(new T.Euler(0, x[2] * Math.PI * 14, 0)); m.compose(W(x[0], x[1] - 0.05), qq, new T.Vector3(s, s * (0.9 + ((x[2] * 13) % 0.2)), s)); im.setMatrixAt(i, m); });
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; if (mat.alphaTest > 0) im.customDepthMaterial = rlSombraFolha(mat === rlMat11('palma') ? 'palma' : 'folhas'); grp.add(im); };
  if (RL.vis.arvc) { [0, 1, 2].forEach(v => { const L = V.arvPos.filter(x => ((x[2] * 3) | 0) === v); inst(MOD.arv[v].tr, rlMat11('casca'), L, r => 0.8 + r * 0.5); inst(MOD.arv[v].co, rlMat11('folhas'), L, r => 0.8 + r * 0.5); });
    inst(MOD.palma.tr, rlMat11('casca'), V.palPos, r => 0.85 + r * 0.3); inst(MOD.palma.co, rlMat11('palma'), V.palPos, r => 0.85 + r * 0.3); }
  if (RL.vis.grama && q.grama > 0) { const pos = []; let tent = 0;
    while (pos.length < q.grama && tent++ < q.grama * 5) { const s = RU.S[(rnd() * RU.S.length) | 0], t = rnd(), sg = rnd() < 0.5 ? 1 : -1, u = RU.alin + 0.1 + Math.pow(rnd(), 1.6) * 30;
      const p = [s.A[0] + (s.B[0] - s.A[0]) * t + s.n[0] * sg * u, s.A[1] + (s.B[1] - s.A[1]) * t + s.n[1] * sg * u], r = idx(p[0], p[1], RU.alin + 1);
      if (r && r.d < RU.alin + 0.08) continue; if (naCasa(p)) continue; const z = rlChao(p[0], p[1]); if (z == null) continue; pos.push([p, z, rnd()]); }
    if (pos.length) { const im = new T.InstancedMesh(MOD.grama, rlMat11('grama3d'), pos.length), m = new T.Matrix4(), qq = new T.Quaternion();
      pos.forEach((x, i) => { const s = 0.7 + x[2] * 0.9; qq.setFromEuler(new T.Euler(0, x[2] * 40, 0)); m.compose(W(x[0], x[1] - 0.01), qq, new T.Vector3(s, s, s)); im.setMatrixAt(i, m); });
      im.receiveShadow = true; im.frustumCulled = false; grp.add(im); } }
}
/* ── montagem: chamada no fim do t3Montar ── */
function rlIniciar() {
  const T = THREE; RL.t3 = null; if (!RL.on || !T3.ren) return;
  if (!RL.soloIni) { RL.soloIni = 1; T3.solo = 1; }   /* realista começa com a rua opaca; 🛣 Rua % deixa transparente para ver a rede */
  const ren = T3.ren, cena = T3.cena;
  ren.outputEncoding = T.sRGBEncoding; ren.toneMapping = T.ACESFilmicToneMapping; ren.toneMappingExposure = 0.92; ren.shadowMap.enabled = RL_QUAL[rlQualK()].sh > 0; ren.shadowMap.type = T.PCFSoftShadowMap;
  cena.children.filter(o => o.isLight).forEach(o => cena.remove(o)); cena.background = null;
  const sun = new T.DirectionalLight(0xfff1d8, 1.05); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); cena.add(sun); cena.add(sun.target);
  const t = RL.t3 = {rd: ren, sc: cena, cam: T3.cam, ctl: T3.ctl, sun, chao: [], terr: null};
  rlCeuInit(t); rlCeuAplicar(t); rlQualAplicar(t);
}
function rlQualAplicar(t) {
  const q = RL_QUAL[rlQualK()], k = rlQualK(); if (t.qualAplicada === k) return; t.qualAplicada = k;
  t.rd.setPixelRatio(q.pr > 2 ? Math.min(2.5, (window.devicePixelRatio || 1) * 1.5) : Math.min(q.pr, window.devicePixelRatio || 1));
  const sz = q.sh || 512; if (t.sun.shadow.mapSize.x !== sz) { t.sun.shadow.mapSize.set(sz, sz); if (t.sun.shadow.map) { t.sun.shadow.map.dispose(); t.sun.shadow.map = null; } }
  t.sun.shadow.radius = q.sh >= 2048 ? 2 : 1.5; t.sun.shadow.bias = -0.00025; t.sun.shadow.normalBias = 0.03; t.rd.shadowMap.enabled = q.sh > 0;
  RL.mat11 = null; RL.sf11 = null; RL.matE = null; RL.tex2 = {};
  const cv = t.rd.domElement; t.rd.setSize(cv.clientWidth || 800, cv.clientHeight || 500, false);
}
function rlCena() {
  const T = THREE, t = RL.t3; if (!t || !T3.raiz) return; const G = T3.G;
  rlQualAplicar(t); t.chao = []; t.terr = null; RL.grade = null;
  const grp = G.real = new T.Group(), cen = G.cen = new T.Group(); T3.raiz.add(grp); grp.add(cen);
  G.solo.visible = false; G.terr.visible = false;              /* a rua e o terreno do modo técnico dão lugar aos realistas */
  const L = limites(), c = R.c, RU = rlRuas(), idx = rlIndice(RU), M = Math.max(45, (c.fundoLote || 25) + RU.alin + 25), ctx = {L, M};
  const Rc = Math.max(L.w, L.h) / 2 + M; t.Rcena = Rc;
  t.sc.fog = new T.Fog(t.ceuMat.uniforms.uHor.value.getHex(), Rc * 2.2, Rc * 11);
  let terr = null;
  try { const g = rlTerreno(RU, idx, ctx); terr = new T.Mesh(g, rlMatE('terr')); terr.receiveShadow = true; terr.visible = !!(RL.vis.terreno && T3.terr); grp.add(terr); t.chao.push(terr); G.rlTerr = terr; } catch (e) { console.warn('terreno 3D', e); }
  rlRua(RU, grp);
  const semCenario = T3.ev > 1;   /* com exagero vertical as casas e árvores ficariam esticadas: só a rua e a rede */
  if (!semCenario) { const V = rlLotes(RU, idx, cen); rlVegetacao(RU, idx, cen, V); }
  if (RL.vis.horiz && t.terr) { try { rlHorizonte({grp, R: Rc}); } catch (e) { console.warn('horizonte', e); } }
  rlObj(); rlSolo(); if (RL.vis.sat && window.geoSatChao && terr) geoSatChao(terr);
  rlCeuAplicar(t); t.precisaSombra = true;
}
function rlParar() { const t = RL.t3; if (t) { if (t.envRT) t.envRT.dispose(); if (t.pmrem) t.pmrem.dispose(); } RL.t3 = null; RL.andar = null; RL.grade = null; }
/* ── árvores e postes locados pelo usuário (P.obj3d = [{id, t:'arv'|'poste', x, y}]) ── */
function rlObj() {
  const T = THREE, t = RL.t3; if (!t || !T3.G || !T3.G.real) return; const MOD = rlModelos(), G = T3.G;
  if (G.obj) { G.real.remove(G.obj); G.obj.traverse(o => { if (o.geometry && o.userData.proprio) o.geometry.dispose(); }); }
  const g0 = G.obj = new T.Group(); G.real.add(g0); const RU = rlRuas(), idx = rlIndice(RU);
  (P.obj3d || []).forEach(o => { if (o.t === 'arv' ? !RL.vis.objArv : !RL.vis.objPoste) return; const z = rlChao(o.x, o.y) != null ? rlChao(o.x, o.y) : (idx(o.x, o.y, 80) || {z: 0}).z + 0.15, w = P3(o.x, o.y, z);
    const g = new T.Group(); g.position.copy(w); g.userData.obj = o.id;
    if (o.t === 'arv') { const m = MOD.arv[0], a = new T.Mesh(m.tr, rlMat11('casca')), b = new T.Mesh(m.co, rlMat11('folhas')); [a, b].forEach(q => { q.castShadow = true; q.receiveShadow = true; q.userData.obj = o.id; g.add(q); }); b.customDepthMaterial = rlSombraFolha('folhas'); g.rotation.y = (o.id.charCodeAt(o.id.length - 1) || 0) * 0.7;
      const cant = new T.Mesh(new T.BoxGeometry(1.0, 0.06, 1.0), rlMat11('canteiro')); cant.position.y = -0.025; cant.receiveShadow = true; cant.userData.proprio = 1; cant.userData.obj = o.id; g.add(cant); }
    else { [['conc', 'posteConc'], ['met', 'metal'], ['len', 'lente']].forEach(k => { const q = new T.Mesh(MOD.poste[k[0]], rlMat11(k[1])); q.castShadow = k[0] !== 'len'; q.receiveShadow = true; q.userData.obj = o.id; g.add(q); });
      const r = idx(o.x, o.y, 60); if (r) g.rotation.y = Math.atan2(r.py - o.y, r.px - o.x);   /* braço (eixo +x local) virado para a rua */ }
    if (RL.sel === o.id) { const r = new T.Mesh(new T.RingGeometry(o.t === 'arv' ? 1.1 : 0.45, o.t === 'arv' ? 1.35 : 0.6, 40), rlMat11('sel')); r.rotation.x = -Math.PI / 2; r.position.y = 0.06; r.renderOrder = 20; r.userData.proprio = 1; g.add(r); }
    g0.add(g); });
  t.precisaSombra = true;
}
function rlObjNovo(tipo, x, y) { if (!P.obj3d) P.obj3d = []; const id = 'o' + Date.now().toString(36) + Math.floor(Math.random() * 99); P.obj3d.push({id, t: tipo, x: +x.toFixed(2), y: +y.toFixed(2)}); RL.sel = id; salvar(); rlObj(); rlPainel(); }
function rlObjExcluir() { if (!RL.sel || !P.obj3d) return; P.obj3d = P.obj3d.filter(o => o.id !== RL.sel); RL.sel = null; salvar(); rlObj(); rlPainel(); }
/* clique / arrastar no 3D: locar, selecionar e mover */
function rlEventos() {
  const cv = $('t3-c'); if (!cv || cv.dataset.rl) return; cv.dataset.rl = '1';
  const T = THREE, rc = new T.Raycaster(), mv = new T.Vector2();
  const ray = (e, lista) => { const r = cv.getBoundingClientRect(); mv.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); rc.setFromCamera(mv, T3.cam); return rc.intersectObjects(lista, true); };
  const objDe = h => { for (const x of h) { let o = x.object; while (o) { if (o.userData && o.userData.obj) return o.userData.obj; o = o.parent; } } return null; };
  const plano = p => [p.x + T3.cx, -p.z + T3.cy];
  let arr = null;
  cv.addEventListener('pointerdown', e => { const t = RL.t3; if (!t || RL.andar) return; if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (RL.modo) { const h = ray(e, t.chao); if (h.length) { const p = plano(h[0].point); rlObjNovo(RL.modo, p[0], p[1]); RL.modo = null; rlPainel(); } e.stopPropagation(); e.preventDefault(); return; }
    if (!T3.G.obj) return; const id = objDe(ray(e, [T3.G.obj])); if (!id) return;
    RL.sel = id; rlObj(); rlPainel(); arr = {id, x: e.clientX, y: e.clientY, mov: false, g: T3.G.obj.children.find(g => g.userData.obj === id)}; T3.ctl.enabled = false; e.stopPropagation(); e.preventDefault(); }, true);
  window.addEventListener('pointermove', e => { if (!arr || !RL.t3) return; if (!arr.mov && Math.hypot(e.clientX - arr.x, e.clientY - arr.y) < 4) return; arr.mov = true; const h = ray(e, RL.t3.chao); if (h.length && arr.g) { arr.g.position.copy(h[0].point); arr.p = plano(h[0].point); } });
  window.addEventListener('pointerup', () => { if (!arr) return; const a = arr; arr = null; if (T3.ctl && !RL.andar) T3.ctl.enabled = true; if (a.mov && a.p) { const o = (P.obj3d || []).find(q => q.id === a.id); if (o) { o.x = +a.p[0].toFixed(2); o.y = +a.p[1].toFixed(2); salvar(); rlObj(); } } });
}
/* ── 🚶 andar na rua: olhos a 1,70 m; W/S ou ↑/↓ anda, A/D de lado, ←/→ ou Q/E gira, arrastar olha, Shift corre, Esc sai ── */
function rlAndar(liga) {
  const bt = document.querySelector('[data-t3="andar"]');
  if (!liga) { RL.andar = null; if (T3.ctl) T3.ctl.enabled = true; if (bt) bt.classList.remove('on'); const p = $('rl-andar'); if (p) p.remove(); return; }
  if (!RL.t3) return toast('O modo 🚶 Andar precisa do 3D 🏙 Realista ligado.');
  if (T3.voo) t3Voo(false);
  const RU = rlRuas(); if (!RU.S.length) return; const s = RU.S.slice().sort((a, b) => b.l - a.l)[0], p = [s.A[0] + s.u[0] * Math.min(8, s.l / 3), s.A[1] + s.u[1] * Math.min(8, s.l / 3)];
  RL.andar = {x: p[0], y: p[1], yaw: Math.atan2(s.u[1], s.u[0]), pitch: -0.05, keys: {}, vel: 1.4};
  T3.ctl.enabled = false; if (bt) bt.classList.add('on');
  const box = $('t3'); if (box && !$('rl-andar')) { const d = document.createElement('div'); d.id = 'rl-andar'; d.className = 'rl-andar';
    d.innerHTML = '<b>🚶 Andando na rua</b> · W/S ou ↑/↓ anda · A/D de lado · ←/→ gira · arraste para olhar · Shift corre · Esc sai<div class="rl-and-bt"><button class="bt peq" data-rlk="f">⬆</button><button class="bt peq" data-rlk="l">⟲</button><button class="bt peq" data-rlk="r">⟳</button><button class="bt peq" data-rlk="b">⬇</button><button class="bt peq pri" data-t3="andar">⏹ Sair</button></div>';
    box.appendChild(d);
    d.querySelectorAll('[data-rlk]').forEach(b => { const k = {f: 'w', b: 's', l: 'arrowleft', r: 'arrowright'}[b.dataset.rlk]; b.addEventListener('pointerdown', () => { if (RL.andar) RL.andar.keys[k] = 1; }); ['pointerup', 'pointerleave'].forEach(ev => b.addEventListener(ev, () => { if (RL.andar) RL.andar.keys[k] = 0; })); }); }
  toast('Andando na rua (olhos a 1,70 m). Esc ou ⏹ Sair para voltar.', 5000);
}
function rlAndarTick(dt) {
  const a = RL.andar; if (!a || !RL.t3) return; const k = a.keys, run = k.shift ? 3 : 1, v = a.vel * run * dt * 3.2;
  if (k.arrowleft || k.q) a.yaw += dt * 1.4; if (k.arrowright || k.e) a.yaw -= dt * 1.4;
  const fx = Math.cos(a.yaw), fy = Math.sin(a.yaw); let mx = 0, my = 0;
  if (k.w || k.arrowup) { mx += fx; my += fy; } if (k.s || k.arrowdown) { mx -= fx; my -= fy; } if (k.a) { mx += -fy; my += fx; } if (k.d) { mx -= -fy; my -= fx; }
  a.x += mx * v; a.y += my * v;
  const T = THREE, rc = a.rc || (a.rc = new T.Raycaster()), o = P3(a.x, a.y, 0); rc.set(new T.Vector3(o.x, 1e5, o.z), new T.Vector3(0, -1, 0)); const h = rc.intersectObjects(RL.t3.chao, false);
  const yb = h.length ? h[0].point.y : (rlChao(a.x, a.y) != null ? (rlChao(a.x, a.y) - T3.z0) * T3.ev : 0);
  const eye = new T.Vector3(o.x, yb + 1.7, o.z); a.eyeY = a.eyeY == null ? eye.y : a.eyeY + (eye.y - a.eyeY) * Math.min(1, dt * 8); eye.y = a.eyeY;
  T3.cam.position.copy(eye); const cp = Math.cos(a.pitch); T3.cam.lookAt(eye.x + fx * cp * 10, eye.y + Math.sin(a.pitch) * 10, eye.z - fy * cp * 10); T3.cam.near = 0.1; T3.cam.updateProjectionMatrix();
  T3.ctl.target.set(eye.x + fx * 10, eye.y, eye.z - fy * 10);
}
document.addEventListener('keydown', e => { const a = RL.andar; if (!a) return; if (e.target && /input|textarea|select/i.test(e.target.tagName)) return; const k = e.key.toLowerCase(); if (k === 'escape') { rlAndar(false); e.stopPropagation(); return; } a.keys[k] = 1; if (e.shiftKey) a.keys.shift = 1; if (/^(arrow|w$|a$|s$|d$|q$|e$)/.test(k)) e.preventDefault(); }, true);
document.addEventListener('keyup', e => { const a = RL.andar; if (!a) return; a.keys[e.key.toLowerCase()] = 0; if (!e.shiftKey) a.keys.shift = 0; });
(() => { let arr = null; document.addEventListener('pointerdown', e => { if (RL.andar && e.target && e.target.id === 't3-c') arr = {x: e.clientX, y: e.clientY}; });
  document.addEventListener('pointermove', e => { if (!arr || !RL.andar) return; RL.andar.yaw -= (e.clientX - arr.x) * 0.005; RL.andar.pitch = Math.max(-1.2, Math.min(0.8, RL.andar.pitch - (e.clientY - arr.y) * 0.004)); arr = {x: e.clientX, y: e.clientY}; });
  document.addEventListener('pointerup', () => { arr = null; });
  document.addEventListener('wheel', e => { if (!RL.andar || !e.target || e.target.id !== 't3-c') return; const a = RL.andar, d = -Math.sign(e.deltaY) * 1.5; a.x += Math.cos(a.yaw) * d; a.y += Math.sin(a.yaw) * d; e.preventDefault(); }, {passive: false}); })();
/* vista “nível da rua”: em pé no meio da rua mais longa, olhando ao longo dela */
function rlVistaRua() { const RU = rlRuas(); if (!RU.S.length) return; const s = RU.S.slice().sort((a, b) => b.l - a.l)[0], p = [s.A[0] + s.u[0] * s.l * 0.15, s.A[1] + s.u[1] * s.l * 0.15], z = s.za + (s.zb - s.za) * 0.15;
  const e = P3(p[0], p[1], z), q = P3(p[0] + s.u[0] * 30, p[1] + s.u[1] * 30, z); e.y = e.y * T3.ev + 1.7; q.y = q.y * T3.ev + 1.2; T3.cam.position.copy(e); T3.ctl.target.copy(q); T3.cam.near = 0.1; T3.cam.updateProjectionMatrix(); T3.ctl.update(); }
/* ⬇ imagem PNG do que está na tela */
function rlPng() { if (!T3.ren) return; T3.ren.render(T3.cena, T3.cam); T3.ren.domElement.toBlob(b => { if (!b) return toast('Não foi possível gerar a imagem.'); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = ((P.nome || 'esgoto').replace(/[^\w\-]+/g, '_')) + '-3D.png'; document.body.appendChild(a); a.click(); a.remove(); toast('Imagem 3D (PNG) baixada.'); }, 'image/png'); }
/* ── painel “🏘 Cenário” e ações da barra ── */
const RL_NIV = [['calcada', 'Calçada e meio-fio'], ['faixa', 'Faixa central da rua'], ['terreno', 'Terreno (entorno com grama)'], ['casas', 'Casas'], ['muros', 'Muros e portões'], ['arvc', 'Árvores e coqueiros do cenário'],
  ['grama', 'Grama 3D (com vento)'], ['horiz', 'Horizonte e morros'], ['objArv', 'Árvores que você locou'], ['objPoste', 'Postes que você locou'], ['sat', '🛰 Imagem de satélite no chão']];
function rlPainel() {
  const box = $('t3'); if (!box) return; let p = $('rl-pan');
  if (!RL.pan || !RL.on) { if (p) p.remove(); return; }
  if (!p) { p = document.createElement('div'); p.id = 'rl-pan'; p.className = 'rl-pan'; box.appendChild(p); }
  const qk = rlQualK(), hk = rlHoraK(), nObj = (P.obj3d || []).length, sel = (P.obj3d || []).find(o => o.id === RL.sel), geoOk = window.geoPronto && geoPronto();
  p.innerHTML = `<div class="rl-h"><b>🏘 Cenário 3D</b><button class="bt peq" data-t3="cen" title="Fechar">✕</button></div>
    <div class="rl-g"><label>Qualidade <select data-rlsel="qual">${Object.keys(RL_QUAL).map(k => `<option value="${k}"${k === qk ? ' selected' : ''}>${RL_QUAL[k].n}</option>`).join('')}</select></label>
      <label>Sol <select data-rlsel="hora">${Object.keys(RL_HORAS).map(k => `<option value="${k}"${k === hk ? ' selected' : ''}>${RL_HORAS[k].n}</option>`).join('')}</select></label></div>
    <div class="rl-t">Níveis do cenário (só desenho)</div>
    ${RL_NIV.map(([k, t]) => `<label class="rl-c"><input type="checkbox" data-rlniv="${k}"${RL.vis[k] ? ' checked' : ''}${k === 'sat' && !geoOk ? ' disabled' : ''}/> ${t}${k === 'sat' && !geoOk ? ' <small>(georreferencie antes)</small>' : ''}</label>`).join('')}
    <div class="rl-g"><button class="bt peq" data-rlact="todos">Mostrar tudo</button><button class="bt peq" data-rlact="nada">Ocultar o cenário</button></div>
    <div class="rl-t">Locar no 3D (clique no chão; arraste para mover)</div>
    <div class="rl-g"><button class="bt peq${RL.modo === 'arv' ? ' on' : ''}" data-rlact="arv">🌳 + Árvore</button><button class="bt peq${RL.modo === 'poste' ? ' on' : ''}" data-rlact="poste">💡 + Poste</button>
      <button class="bt peq" data-rlact="del"${sel ? '' : ' disabled'}>🗑 Excluir ${sel ? (sel.t === 'arv' ? 'árvore' : 'poste') : 'selecionado'}</button></div>
    <div class="rl-s">${nObj} objeto(s) locado(s). ${RL.modo ? '<b>Clique no chão do 3D para locar.</b>' : ''}</div>`;
}
function rlAcao(a) {
  if (a === 'real') { RL.on = !RL.on; try { localStorage.setItem('tc_esg_3d_real', RL.on ? '1' : '0'); } catch (e) {} if (!RL.on) { RL.pan = false; rlAndar(false); } vT3($('main') || document.querySelector('#t3').parentElement); return true; }
  if (a === 'cen') { if (!RL.on) { RL.on = true; try { localStorage.setItem('tc_esg_3d_real', '1'); } catch (e) {} RL.pan = true; vT3(document.querySelector('#t3').parentElement); return true; } RL.pan = !RL.pan; rlPainel(); const b = document.querySelector('[data-t3="cen"]'); if (b) b.classList.toggle('on', RL.pan); return true; }
  if (a === 'andar') { rlAndar(!RL.andar); return true; }
  if (a === 'rua') { if (RL.andar) rlAndar(false); rlVistaRua(); return true; }
  if (a === 'png') { rlPng(); return true; }
  if (a === 'geo') { if (window.geoAbrir) geoAbrir(); return true; }
  return false;
}
function rlReconstroi() { if (!T3.on) return; const cam = T3.cam.position.clone(), alvo = T3.ctl.target.clone(); t3Montar(); T3.cam.position.copy(cam); T3.ctl.target.copy(alvo); T3.ctl.update(); }
function rl3D() { rlReconstroi(); }
document.addEventListener('change', e => { const el = e.target; if (!el || !el.dataset) return;
  if (el.dataset.rlniv) { const k = el.dataset.rlniv; RL.vis[k] = el.checked ? 1 : 0; rlSalvaVis();
    if (k === 'terreno') { if (T3.G && T3.G.rlTerr) T3.G.rlTerr.visible = !!(RL.vis.terreno && T3.terr); return; }
    if (k === 'objArv' || k === 'objPoste') return rlObj();
    rlReconstroi(); return; }
  if (el.dataset.rlsel === 'qual') { try { localStorage.setItem('tc_esg_3d_qual', el.value); } catch (er) {} if (RL.t3) RL.t3.qualAplicada = null; rlReconstroi(); return; }
  if (el.dataset.rlsel === 'hora') { try { localStorage.setItem('tc_esg_3d_hora', el.value); } catch (er) {} if (RL.t3) { rlCeuAplicar(RL.t3); if (RL.t3.sc.fog) RL.t3.sc.fog.color.copy(RL.t3.ceuMat.uniforms.uHor.value); } return; }
});
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-rlact]'); if (!b) return; const a = b.dataset.rlact;
  if (a === 'todos' || a === 'nada') { RL_NIV.forEach(([k]) => { if (k !== 'sat') RL.vis[k] = a === 'todos' ? 1 : 0; }); if (a === 'nada') { RL.vis.calcada = 1; RL.vis.terreno = 1; } rlSalvaVis(); rlReconstroi(); rlPainel(); return; }
  if (a === 'arv' || a === 'poste') { RL.modo = RL.modo === a ? null : a; if (a === 'arv') RL.vis.objArv = 1; else RL.vis.objPoste = 1; rlPainel(); if (RL.modo) toast('Clique no chão do 3D onde quer ' + (a === 'arv' ? 'a árvore' : 'o poste') + '.'); return; }
  if (a === 'del') return rlObjExcluir(); });
/* computador lento: se os primeiros quadros passam de ~0,15 s e a qualidade não foi escolhida pelo usuário, cai para Baixa (uma vez) */
function rlMede(dt) { const m = RL.med || (RL.med = {n: 0, s: 0}); if (m.feito) return; m.n++; if (m.n < 10) return; m.s += dt; if (m.n < 50) return; m.feito = 1;
  let escolhida = null; try { escolhida = localStorage.getItem('tc_esg_3d_qual'); } catch (e) {}
  if (!escolhida && m.s / 40 > 0.15 && rlQualK() !== 'baixa') { try { localStorage.setItem('tc_esg_3d_qual', 'baixa'); } catch (e) {} if (RL.t3) RL.t3.qualAplicada = null; rlReconstroi(); toast('3D lento neste computador: Qualidade passou para Baixa (🏘 Cenário › Qualidade para mudar).', 7000); } }
