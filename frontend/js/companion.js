/**
 * companion.js — Cloud-spirit companion (survey + letter pages)
 * Same bumpy creature design as orb.js but lighter-weight.
 *
 * Usage:
 *   window.MOTS.initCompanion('canvas-id')
 *   window.MOTS.initCompanion('canvas-id', { size: 120, compact: true })
 */
(function () {
  window.MOTS = window.MOTS || {};

  window.MOTS.initCompanion = function (targetId, opts) {
    if (typeof THREE === 'undefined') return;
    const cvs = typeof targetId === 'string'
      ? document.getElementById(targetId) : targetId;
    if (!cvs) return;

    const { size = 280, compact = false } = opts || {};

    const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(compact ? 40 : 46, 1, 0.1, 30);
    camera.position.z = compact ? 2.8 : 3.8;

    /* Lights */
    scene.add(new THREE.AmbientLight(0x08101e, 4));
    const keyL = new THREE.PointLight(0xb0d8f8, 16, 18);
    keyL.position.set(2.5, 2.5, 3.5);
    scene.add(keyL);
    const rimL = new THREE.PointLight(0xc8eeff, 7, 12);
    rimL.position.set(2, -3.5, 1.5);
    scene.add(rimL);
    const backL = new THREE.PointLight(0x6ab0d8, 4, 12);
    backL.position.set(0, 4, -3);
    scene.add(backL);

    /* Vertex bump */
    function applyBumps(geo, amp, freq) {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x=pos.getX(i), y=pos.getY(i), z=pos.getZ(i);
        const r=Math.sqrt(x*x+y*y+z*z)||0.001;
        const n=amp*(
          0.45*Math.sin(x*freq*2.1+y*freq*1.6)+
          0.35*Math.cos(y*freq*2.8+z*freq*1.2)+
          0.20*Math.sin(z*freq*1.85+x*freq*2.4)
        );
        const s=1+n/r;
        pos.setXYZ(i,x*s,y*s,z*s);
      }
      geo.computeVertexNormals();
    }

    function ice(op) {
      return new THREE.MeshPhongMaterial({
        color: 0xa4ccde, emissive: new THREE.Color(0x1a3a55),
        transparent: true, opacity: op??0.84,
        shininess: 32, specular: new THREE.Color(0xeef8ff),
      });
    }

    const group = new THREE.Group();
    scene.add(group);

    const HR = compact ? 0.68 : 0.82;  // head/body radius scale

    /* Body */
    const bGeo = new THREE.SphereGeometry(HR*1.10, compact?56:72, compact?56:72);
    applyBumps(bGeo, HR*0.105, 3.4);
    const bMesh = new THREE.Mesh(bGeo, ice(0.78));
    bMesh.position.set(0, -HR*0.26, 0);
    group.add(bMesh);

    /* Head */
    const hGeo = new THREE.SphereGeometry(HR, compact?48:64, compact?48:64);
    applyBumps(hGeo, HR*0.090, 3.9);
    const hMesh = new THREE.Mesh(hGeo, ice(0.84));
    hMesh.position.set(0, HR*0.80, HR*0.10);
    group.add(hMesh);

    /* Top knobs */
    [[-1,1],[1,1]].forEach(([sign]) => {
      const kGeo = new THREE.SphereGeometry(HR*0.46, compact?32:44, compact?32:44);
      applyBumps(kGeo, HR*0.068, 4.3);
      const k = new THREE.Mesh(kGeo, ice(0.76));
      k.position.set(sign*HR*0.53, HR*1.50, -HR*0.04);
      group.add(k);
    });

    /* Dark face opening */
    const faceMat = new THREE.MeshBasicMaterial({ color:0x030508, transparent:true, opacity:0.96 });
    const fMesh = new THREE.Mesh(new THREE.SphereGeometry(HR*0.58, 28, 28), faceMat);
    fMesh.position.set(0, HR*0.40, HR*0.82);
    fMesh.scale.set(1.08, 0.86, 0.60);
    group.add(fMesh);

    /* Eyes */
    const ewMat  = new THREE.MeshPhongMaterial({ color:0xeef8ff, emissive:new THREE.Color(0x162840), transparent:true, opacity:0.92, shininess:60 });
    const epMat  = new THREE.MeshBasicMaterial({ color:0x040810 });
    const ehMat  = new THREE.MeshBasicMaterial({ color:0xfcffff, transparent:true, opacity:0.95 });
    [-1,1].forEach(sign=>{
      const ex=sign*HR*0.32, ey=HR*0.74, ez=HR*0.86;
      const ew=new THREE.Mesh(new THREE.SphereGeometry(HR*0.135,14,14),ewMat.clone());
      ew.position.set(ex,ey,ez); group.add(ew);
      const ep=new THREE.Mesh(new THREE.SphereGeometry(HR*0.090,12,12),epMat.clone());
      ep.position.set(ex,ey,ez+HR*0.048); group.add(ep);
      const eh=new THREE.Mesh(new THREE.SphereGeometry(HR*0.034,8,8),ehMat.clone());
      eh.position.set(ex-sign*HR*0.018,ey+HR*0.030,ez+HR*0.090); group.add(eh);
    });

    /* Nose */
    const nMat = new THREE.MeshPhongMaterial({color:0x8ac4da,emissive:new THREE.Color(0x0c2438),transparent:true,opacity:0.88,shininess:55});
    const nMesh = new THREE.Mesh(new THREE.SphereGeometry(HR*0.065,10,10),nMat);
    nMesh.position.set(0,HR*0.33,HR*0.92); group.add(nMesh);

    /* Particles */
    const P = compact ? 200 : 380;
    const pPos=new Float32Array(P*3), pVel=new Float32Array(P*3);
    const pLife=new Float32Array(P), pMaxL=new Float32Array(P);
    const pCol=new Float32Array(P*3);

    const CPARTS=[
      {cx:0,cy:-HR*0.26,cz:0,r:HR*1.10,spread:HR*0.55,w:0.42},
      {cx:0,cy:HR*0.80,cz:HR*0.10,r:HR,spread:HR*0.48,w:0.35},
      {cx:-HR*0.53,cy:HR*1.50,cz:-HR*0.04,r:HR*0.46,spread:HR*0.32,w:0.115},
      {cx:HR*0.53, cy:HR*1.50,cz:-HR*0.04,r:HR*0.46,spread:HR*0.32,w:0.115},
    ];

    function randDir(){let x,y,z,l;do{x=Math.random()*2-1;y=Math.random()*2-1;z=Math.random()*2-1;l=Math.sqrt(x*x+y*y+z*z);}while(l<1e-4);return[x/l,y/l,z/l];}

    function spawnP(i){
      const rv=Math.random();let acc=0,p=CPARTS[0];
      for(const cp of CPARTS){acc+=cp.w;if(rv<acc){p=cp;break;}}
      const[dx,dy,dz]=randDir();
      const off=(Math.random()-0.12)*(p.spread||0.4);
      const r=p.r||0.5;
      pPos[i*3]=p.cx+dx*(r+off); pPos[i*3+1]=p.cy+dy*(r+off); pPos[i*3+2]=p.cz+dz*(r+off);
      const[vx,vy,vz]=randDir();const spd=0.0014+Math.random()*0.007;
      pVel[i*3]=vx*spd;pVel[i*3+1]=vy*spd*0.5+0.0007;pVel[i*3+2]=vz*spd;
      pLife[i]=Math.random()*0.28;pMaxL[i]=0.36+Math.random()*0.56;
    }
    for(let i=0;i<P;i++) spawnP(i);

    const pGeo=new THREE.BufferGeometry();
    pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
    pGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3));
    group.add(new THREE.Points(pGeo,new THREE.PointsMaterial({
      vertexColors:true,size:compact?0.048:0.054,
      transparent:true,opacity:0.76,sizeAttenuation:true,
      depthWrite:false,blending:THREE.AdditiveBlending,
    })));

    /* Mouse look */
    let mX=0,mY=0,lkX=0,lkY=0,tLkX=0,tLkY=0;
    window.addEventListener('mousemove',e=>{
      mX=(e.clientX/innerWidth-0.5)*2; mY=-(e.clientY/innerHeight-0.5)*2;
      tLkY=mX*0.36; tLkX=-mY*0.20;
    });

    const clock=new THREE.Clock();
    function animate(){
      requestAnimationFrame(animate);
      const t=clock.getElapsedTime();
      lkX+=(tLkX-lkX)*0.045; lkY+=(tLkY-lkY)*0.045;
      group.rotation.x=lkX+Math.sin(t*0.28)*0.018;
      group.rotation.y=lkY+Math.cos(t*0.22)*0.014;
      group.position.y=Math.sin(t*0.70)*0.050;
      group.scale.setScalar(1+Math.sin(t*0.65)*0.016);

      const pos=pGeo.attributes.position.array;
      const col=pGeo.attributes.color.array;
      for(let i=0;i<P;i++){
        pLife[i]+=0.004+Math.random()*0.002;
        if(pLife[i]>=pMaxL[i]){spawnP(i);continue;}
        pos[i*3]+=pVel[i*3];pos[i*3+1]+=pVel[i*3+1];pos[i*3+2]+=pVel[i*3+2];
        const b=Math.max(0,Math.sin(pLife[i]/pMaxL[i]*Math.PI));
        col[i*3]=0.68+b*0.32;col[i*3+1]=0.85+b*0.15;col[i*3+2]=1.0;
      }
      pGeo.attributes.position.needsUpdate=true;
      pGeo.attributes.color.needsUpdate=true;

      keyL.position.x=Math.sin(t*0.30)*2.5+mX*1.2;
      keyL.position.y=Math.cos(t*0.24)*2.5+mY*1.2;
      renderer.render(scene,camera);
    }
    animate();
  };
})();
