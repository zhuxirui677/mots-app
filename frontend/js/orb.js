/**
 * orb.js — TouchDesigner ice-blue particle rabbit  (Three.js 0.160)
 *
 * Two particle layers:
 *   1. Dense small particles  → ice-blue / violet silhouette
 *   2. Large floating accents → blue + violet + warm-gold drifting upward
 */
(function () {
  if (typeof THREE === 'undefined') return;
  var wrap = document.getElementById('orb-wrap');
  if (!wrap) return;

  var S = Math.max(
    Math.min(wrap.clientWidth || 340, window.innerWidth < 430 ? 260 : 340), 160
  );

  var renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(S, S);
  renderer.setClearColor(0x000000, 0);
  wrap.appendChild(renderer.domElement);

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.9, 7.0);
  camera.lookAt(0, 0.9, 0);

  /* ── ice-blue glow sprite ─────────────────────────────────── */
  var spriteTex = (function () {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var ctx = c.getContext('2d');
    var g = ctx.createRadialGradient(32,32,0, 32,32,32);
    g.addColorStop(0,    'rgba(255,255,255,1.0)');
    g.addColorStop(0.18, 'rgba(200,230,255,0.96)');
    g.addColorStop(0.50, 'rgba(80,140,255,0.40)');
    g.addColorStop(0.80, 'rgba(40,80,200,0.10)');
    g.addColorStop(1.0,  'rgba(10,30,100,0.0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,64,64);
    return new THREE.CanvasTexture(c);
  }());

  /* ── zone table — ice-blue palette ──────────────────────────
     [ cx,  cy,  cz,   rx,   ry,   rz,  count,  R,    G,    B  ] */
  var ZONES = [
    /* body    */ [  0,    0,     0,    1.05,1.05,1.05, 2400, 0.28, 0.62, 0.90],
    /* head    */ [  0,    1.36,  0.08, 0.77,0.77,0.77, 1500, 0.32, 0.65, 0.92],
    /* L ear   */ [ -0.35, 2.14,  0.00, 0.28,0.48,0.22,  520, 0.52, 0.48, 0.96],
    /* R ear   */ [  0.35, 2.14,  0.00, 0.28,0.48,0.22,  520, 0.52, 0.48, 0.96],
    /* L inner */ [ -0.35, 2.20,  0.12, 0.16,0.28,0.11,  150, 0.62, 0.58, 0.96],
    /* R inner */ [  0.35, 2.20,  0.12, 0.16,0.28,0.11,  150, 0.62, 0.58, 0.96],
    /* L eye   */ [ -0.26, 1.28,  0.63, 0.12,0.12,0.10,  130, 0.92, 0.96, 1.00],
    /* R eye   */ [  0.26, 1.28,  0.63, 0.12,0.12,0.10,  130, 0.92, 0.96, 1.00],
    /* nose    */ [  0,    0.98,  0.72, 0.07,0.06,0.06,   70, 0.72, 0.48, 0.90],
    /* L arm   */ [ -0.72, 0.20,  0.34, 0.22,0.34,0.17,  280, 0.25, 0.58, 0.88],
    /* R arm   */ [  0.72, 0.20,  0.34, 0.22,0.34,0.17,  280, 0.25, 0.58, 0.88],
    /* L paw   */ [ -0.48,-0.18,  0.56, 0.25,0.16,0.16,  200, 0.22, 0.54, 0.86],
    /* R paw   */ [  0.48,-0.18,  0.56, 0.25,0.16,0.16,  200, 0.22, 0.54, 0.86],
  ];

  var SURF_N = 0;
  for (var zi = 0; zi < ZONES.length; zi++) SURF_N += ZONES[zi][6];
  var LARGE_N = 360, TOTAL = SURF_N + LARGE_N;

  var pPos=new Float32Array(TOTAL*3), pSeed=new Float32Array(SURF_N*3);
  var pVel=new Float32Array(TOTAL*3), pBase=new Float32Array(TOTAL*3);
  var pCol=new Float32Array(TOTAL*3), pLife=new Float32Array(TOTAL);
  var pMaxL=new Float32Array(TOTAL), pPhase=new Float32Array(TOTAL);
  var pType=new Uint8Array(TOTAL);

  var _d=new Float32Array(3);
  function randDir(){
    var th=Math.random()*6.2832, ph=Math.acos(2*Math.random()-1);
    _d[0]=Math.sin(ph)*Math.cos(th); _d[1]=Math.sin(ph)*Math.sin(th); _d[2]=Math.cos(ph);
  }

  var idx=0;
  for(var zi=0;zi<ZONES.length;zi++){
    var z=ZONES[zi], br=z[7], bg=z[8], bb=z[9];
    for(var j=0;j<z[6];j++){
      randDir();
      var off=0.92+Math.random()*0.16;
      var sx=z[0]+_d[0]*z[3]*off, sy=z[1]+_d[1]*z[4]*off, sz=z[2]+_d[2]*z[5]*off;
      pPos[idx*3]  =pSeed[idx*3]  =sx+(Math.random()-0.5)*0.06;
      pPos[idx*3+1]=pSeed[idx*3+1]=sy+(Math.random()-0.5)*0.06;
      pPos[idx*3+2]=pSeed[idx*3+2]=sz+(Math.random()-0.5)*0.06;
      var spd=0.0002+Math.random()*0.0006;
      pVel[idx*3]=(Math.random()-0.5)*spd;
      pVel[idx*3+1]=(Math.random()-0.5)*spd;
      pVel[idx*3+2]=(Math.random()-0.5)*spd;
      pPhase[idx]=Math.random()*6.2832; pType[idx]=0;
      var shade=0.55+_d[1]*0.25+_d[2]*0.18, noise=(Math.random()-0.5)*0.10;
      /* 8% warm-gold accent, rest ice-blue */
      if(Math.random()<0.08){
        pBase[idx*3]=0.90; pBase[idx*3+1]=0.72; pBase[idx*3+2]=0.28;
      } else {
        pBase[idx*3]  =Math.min(1,Math.max(0,br*shade+noise));
        pBase[idx*3+1]=Math.min(1,Math.max(0,bg*shade+noise*0.6));
        pBase[idx*3+2]=Math.min(1,Math.max(0,bb*shade));
      }
      pCol[idx*3]=pBase[idx*3]; pCol[idx*3+1]=pBase[idx*3+1]; pCol[idx*3+2]=pBase[idx*3+2];
      pLife[idx]=Math.random(); pMaxL[idx]=0.9+Math.random()*1.6;
      idx++;
    }
  }

  function spawnLarge(i){
    var angle=Math.random()*6.2832, radius=0.2+Math.random()*2.0;
    var height=(Math.random()-0.12)*2.8;
    pPos[i*3]  =Math.cos(angle)*radius*0.70;
    pPos[i*3+1]=height+0.60;
    pPos[i*3+2]=Math.sin(angle)*radius*0.40;
    var spd=0.004+Math.random()*0.012;
    pVel[i*3]  =(Math.random()-0.5)*spd*0.55;
    pVel[i*3+1]=spd*(0.45+Math.random()*1.10);
    pVel[i*3+2]=(Math.random()-0.5)*spd*0.30;
    pLife[i]=Math.random()*0.35; pMaxL[i]=0.50+Math.random()*0.90;
    pPhase[i]=Math.random()*6.2832; pType[i]=1;
    /* 50% ice-blue · 30% violet · 20% warm-gold */
    var rnd=Math.random();
    if(rnd<0.50){      pBase[i*3]=0.28; pBase[i*3+1]=0.62; pBase[i*3+2]=0.95; }
    else if(rnd<0.80){ pBase[i*3]=0.52; pBase[i*3+1]=0.48; pBase[i*3+2]=0.96; }
    else{              pBase[i*3]=0.90; pBase[i*3+1]=0.72; pBase[i*3+2]=0.28; }
    pCol[i*3]=pBase[i*3]; pCol[i*3+1]=pBase[i*3+1]; pCol[i*3+2]=pBase[i*3+2];
  }
  for(var ai=SURF_N;ai<TOTAL;ai++) spawnLarge(ai);

  /* ── two Points layers ───────────────────────────────────── */
  var posSm=pPos.subarray(0,SURF_N*3), colSm=pCol.subarray(0,SURF_N*3);
  var geoSm=new THREE.BufferGeometry();
  geoSm.setAttribute('position',new THREE.BufferAttribute(posSm,3));
  geoSm.setAttribute('color',   new THREE.BufferAttribute(colSm,3));
  var matSm=new THREE.PointsMaterial({
    map:spriteTex, alphaTest:0.004, vertexColors:true,
    size:0.095, transparent:true, opacity:0.88,
    sizeAttenuation:true, depthWrite:false, blending:THREE.AdditiveBlending
  });

  var posLg=pPos.subarray(SURF_N*3,TOTAL*3), colLg=pCol.subarray(SURF_N*3,TOTAL*3);
  var geoLg=new THREE.BufferGeometry();
  geoLg.setAttribute('position',new THREE.BufferAttribute(posLg,3));
  geoLg.setAttribute('color',   new THREE.BufferAttribute(colLg,3));
  var matLg=new THREE.PointsMaterial({
    map:spriteTex, alphaTest:0.003, vertexColors:true,
    size:0.34, transparent:true, opacity:0.82,
    sizeAttenuation:true, depthWrite:false, blending:THREE.AdditiveBlending
  });

  var grp=new THREE.Group();
  grp.add(new THREE.Points(geoSm,matSm));
  grp.add(new THREE.Points(geoLg,matLg));
  grp.position.y=-0.30;
  scene.add(grp);

  /* ── interaction ─────────────────────────────────────────── */
  var tRotY=0,tRotX=0,cRotY=0,cRotX=0,spinY=0,spinX=0,dragging=false;
  var cvs=renderer.domElement;
  cvs.addEventListener('mousemove',function(e){
    var r=cvs.getBoundingClientRect();
    var mx=((e.clientX-r.left)/r.width-0.5)*2, my=((e.clientY-r.top)/r.height-0.5)*2;
    if(dragging){spinY+=(e.movementX||0)*0.010; spinX-=(e.movementY||0)*0.007;}
    else{tRotY=mx*0.50; tRotX=-my*0.24;}
  });
  cvs.addEventListener('mousedown',function(){dragging=true;});
  window.addEventListener('mouseup',function(){dragging=false;});
  cvs.addEventListener('touchmove',function(e){
    e.preventDefault();
    var r=cvs.getBoundingClientRect(),t=e.touches[0];
    tRotY=((t.clientX-r.left)/r.width-0.5)*2*0.50;
    tRotX=-((t.clientY-r.top)/r.height-0.5)*2*0.24;
  },{passive:false});
  cvs.addEventListener('click',function(){
    for(var bi=0;bi<60;bi++){var ti=SURF_N+Math.floor(Math.random()*LARGE_N); pLife[ti]=pMaxL[ti];}
  });

  /* ── animate ─────────────────────────────────────────────── */
  var clock=new THREE.Clock(), ksp=0.052;
  function animate(){
    requestAnimationFrame(animate);
    var t=clock.getElapsedTime();
    spinY*=0.90; spinX*=0.90;
    cRotY+=(tRotY-cRotY)*0.04+spinY;
    cRotX+=(tRotX-cRotX)*0.04+spinX;
    grp.rotation.y=cRotY+Math.sin(t*0.18)*0.06;
    grp.rotation.x=cRotX+Math.cos(t*0.14)*0.03;
    grp.position.y=-0.30+Math.sin(t*0.55)*0.06;
    var pos=pPos;
    for(var i=0;i<SURF_N;i++){
      var i3=i*3;
      pVel[i3]  =pVel[i3]  *0.93+(pSeed[i3]  -pos[i3]  )*ksp+(Math.random()-0.5)*0.0005;
      pVel[i3+1]=pVel[i3+1]*0.93+(pSeed[i3+1]-pos[i3+1])*ksp+(Math.random()-0.5)*0.0005;
      pVel[i3+2]=pVel[i3+2]*0.93+(pSeed[i3+2]-pos[i3+2])*ksp+(Math.random()-0.5)*0.0005;
      pos[i3]+=pVel[i3]; pos[i3+1]+=pVel[i3+1]; pos[i3+2]+=pVel[i3+2];
      var tw=0.72+0.28*Math.sin(t*3.0+pPhase[i]);
      pCol[i3]=pBase[i3]*tw; pCol[i3+1]=pBase[i3+1]*tw; pCol[i3+2]=pBase[i3+2]*tw;
    }
    for(var i=SURF_N;i<TOTAL;i++){
      var i3=i*3;
      pLife[i]+=0.007+Math.random()*0.003;
      if(pLife[i]>=pMaxL[i]){spawnLarge(i);continue;}
      pos[i3]+=pVel[i3]; pos[i3+1]+=pVel[i3+1]; pos[i3+2]+=pVel[i3+2];
      var alpha=Math.sin(pLife[i]/pMaxL[i]*Math.PI);
      var tw=alpha*(0.80+0.20*Math.sin(t*2.5+pPhase[i]));
      pCol[i3]=pBase[i3]*tw; pCol[i3+1]=pBase[i3+1]*tw; pCol[i3+2]=pBase[i3+2]*tw;
    }
    geoSm.attributes.position.array.set(posSm); geoSm.attributes.color.array.set(colSm);
    geoSm.attributes.position.needsUpdate=true; geoSm.attributes.color.needsUpdate=true;
    geoLg.attributes.position.array.set(posLg); geoLg.attributes.color.array.set(colLg);
    geoLg.attributes.position.needsUpdate=true; geoLg.attributes.color.needsUpdate=true;
    renderer.render(scene,camera);
  }
  animate();
}());
