/**
 * orb.js — Round cloud-spirit creature  (Three.js 0.160)
 *
 * Inspired by the reference: soft, lumpy, blue-white organic blob
 * with a large dark face opening and round expressive eyes.
 *
 * Key technique: applyBumps() applies multi-frequency sinusoidal
 * vertex displacement to every sphere, giving the characteristic
 * soft-bumpy / cloud-dough texture without custom shaders.
 *
 * Shape:
 *   · Large round body  (bumpy sphere)
 *   · Upper head lump   (bumpy sphere, merges into body)
 *   · Two rounded top knobs (no long ears — blob creature)
 *   · Dark concave face opening (ellipsoidal dark mesh)
 *   · Two large round eyes above the opening
 *   · Dense particle aura drifting outward
 *   · Mouse look-at + drag + click bloom
 */
(function () {
  if (typeof THREE === 'undefined') return;
  const wrap = document.getElementById('orb-wrap');
  if (!wrap) return;

  function getSize() {
    return Math.min(wrap.clientWidth, window.innerWidth < 430 ? 220 : 280);
  }
  let S = getSize();

  /* ── Renderer ─────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(S, S);
  renderer.setClearColor(0x000000, 0);
  wrap.appendChild(renderer.domElement);

  /* ── Scene / Camera ──────────────────────────────────────── */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 60);
  camera.position.z = 5.5;

  /* ── Lights — dramatic to emphasise bump shadows ─────────── */
  scene.add(new THREE.AmbientLight(0x08101e, 4));

  const keyLight = new THREE.PointLight(0xb0d8f8, 18, 22);
  keyLight.position.set(3, 3.5, 4);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x1a2a60, 4, 14);
  fillLight.position.set(-3, -2, -3);
  scene.add(fillLight);

  // Strong rim from below-right — makes bumps pop
  const rimLight = new THREE.PointLight(0xc8eeff, 8, 16);
  rimLight.position.set(2, -4, 2);
  scene.add(rimLight);

  // Cool back light — silhouette glow
  const backLight = new THREE.PointLight(0x6ab0d8, 5, 14);
  backLight.position.set(0, 4, -3);
  scene.add(backLight);

  /* ── Vertex bump displacement ─────────────────────────────
   * Applies multi-frequency sinusoidal noise to sphere vertices,
   * creating the organic "cloud dough" bumpy surface.           */
  function applyBumps(geo, amp, freq) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const r = Math.sqrt(x*x + y*y + z*z) || 0.001;
      // Three overlapping frequencies give irregular organic bumps
      const n = amp * (
        0.45 * Math.sin(x * freq * 2.1  + y * freq * 1.6) +
        0.35 * Math.cos(y * freq * 2.8  + z * freq * 1.2) +
        0.20 * Math.sin(z * freq * 1.85 + x * freq * 2.4)
      );
      const s = 1 + n / r;
      pos.setXYZ(i, x * s, y * s, z * s);
    }
    geo.computeVertexNormals();
  }

  /* ── Ice/cloud material ──────────────────────────────────── */
  function iceMat(opacity, shininess) {
    return new THREE.MeshPhongMaterial({
      color:       0xa4ccde,        // pale ice-blue
      emissive:    new THREE.Color(0x1a3a55),
      transparent: true,
      opacity:     opacity  ?? 0.82,
      shininess:   shininess ?? 32,
      specular:    new THREE.Color(0xeef8ff),
    });
  }

  /* ── Group ───────────────────────────────────────────────── */
  const group = new THREE.Group();
  group.position.y = -0.15;
  scene.add(group);

  /* ── Body — large bumpy sphere ───────────────────────────── */
  const bodyGeo = new THREE.SphereGeometry(1.05, 96, 96);
  applyBumps(bodyGeo, 0.110, 3.2);
  const body = new THREE.Mesh(bodyGeo, iceMat(0.80));
  body.position.set(0, -0.22, 0);
  group.add(body);

  /* ── Head lump — sits on top of body ────────────────────── */
  const headGeo = new THREE.SphereGeometry(0.76, 80, 80);
  applyBumps(headGeo, 0.090, 3.8);
  const head = new THREE.Mesh(headGeo, iceMat(0.84));
  head.position.set(0, 0.68, 0.09);
  group.add(head);

  /* ── Two rounded top knobs (no long ears — blob creature) ── */
  const lKnobGeo = new THREE.SphereGeometry(0.38, 52, 52);
  applyBumps(lKnobGeo, 0.072, 4.2);
  const lKnob = new THREE.Mesh(lKnobGeo, iceMat(0.78));
  lKnob.position.set(-0.44, 1.26, -0.02);
  group.add(lKnob);

  const rKnobGeo = new THREE.SphereGeometry(0.38, 52, 52);
  applyBumps(rKnobGeo, 0.072, 4.2);
  const rKnob = new THREE.Mesh(rKnobGeo, iceMat(0.78));
  rKnob.position.set(0.44, 1.26, -0.02);
  group.add(rKnob);

  /* ── Dark face opening — large ellipsoidal concavity ────── */
  const faceMat = new THREE.MeshBasicMaterial({
    color: 0x030508,
    transparent: true,
    opacity: 0.96,
  });
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.50, 36, 36), faceMat);
  face.position.set(0, 0.34, 0.66);
  face.scale.set(1.10, 0.88, 0.62);   // flatten to oval
  group.add(face);

  /* Subtle inner highlight rim around the opening */
  const faceRimMat = new THREE.MeshBasicMaterial({
    color: 0x4480a0, transparent: true, opacity: 0.35,
  });
  const faceRim = new THREE.Mesh(new THREE.SphereGeometry(0.53, 36, 36), faceRimMat);
  faceRim.position.copy(face.position);
  faceRim.scale.set(1.12, 0.92, 0.60);
  faceRim.renderOrder = -1;
  group.add(faceRim);

  /* ── Eyes — large round white + dark pupil ───────────────── */
  const eyeWhiteMat = new THREE.MeshPhongMaterial({
    color: 0xeef8ff, emissive: new THREE.Color(0x162840),
    transparent: true, opacity: 0.92, shininess: 60,
    specular: new THREE.Color(0xffffff),
  });
  const eyeDarkMat  = new THREE.MeshBasicMaterial({ color: 0x040810 });
  const eyeHiMat    = new THREE.MeshBasicMaterial({ color: 0xfcffff, transparent: true, opacity: 0.95 });
  const eyeHi2Mat   = new THREE.MeshBasicMaterial({ color: 0xc0e8ff, transparent: true, opacity: 0.70 });

  [-1, 1].forEach(sign => {
    const EX = sign * 0.265, EY = 0.62, EZ = 0.70;

    // White of eye
    const ew = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 16), eyeWhiteMat.clone());
    ew.position.set(EX, EY, EZ);
    group.add(ew);

    // Pupil
    const ep = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 14), eyeDarkMat.clone());
    ep.position.set(EX, EY, EZ + 0.040);
    group.add(ep);

    // Main bright highlight
    const eh1 = new THREE.Mesh(new THREE.SphereGeometry(0.030, 8, 8), eyeHiMat.clone());
    eh1.position.set(EX - sign*0.016, EY + 0.028, EZ + 0.075);
    group.add(eh1);

    // Secondary softer highlight
    const eh2 = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), eyeHi2Mat.clone());
    eh2.position.set(EX + sign*0.030, EY - 0.018, EZ + 0.070);
    group.add(eh2);
  });

  /* ── Tiny nose dot ───────────────────────────────────────── */
  const noseMat = new THREE.MeshPhongMaterial({
    color: 0x8ac4da, emissive: new THREE.Color(0x0c2438),
    transparent: true, opacity: 0.88, shininess: 55,
  });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 10), noseMat);
  nose.position.set(0, 0.28, 0.74);
  group.add(nose);

  /* ── Particle aura ────────────────────────────────────────── */
  const PARTS = [
    { cx:0,     cy:-0.22, cz:0,    rx:1.05, ry:1.05, rz:1.05, spread:0.55, w:0.38 },
    { cx:0,     cy:0.68,  cz:0.09, rx:0.76, ry:0.76, rz:0.76, spread:0.45, w:0.30 },
    { cx:-0.44, cy:1.26,  cz:-0.02,rx:0.38, ry:0.38, rz:0.38, spread:0.30, w:0.16 },
    { cx:0.44,  cy:1.26,  cz:-0.02,rx:0.38, ry:0.38, rz:0.38, spread:0.30, w:0.16 },
  ];

  const TOTAL  = 2000;
  const pPos   = new Float32Array(TOTAL * 3);
  const pVel   = new Float32Array(TOTAL * 3);
  const pLife  = new Float32Array(TOTAL);
  const pMaxL  = new Float32Array(TOTAL);
  const pCol   = new Float32Array(TOTAL * 3);

  function randDir() {
    let x,y,z,l;
    do{x=Math.random()*2-1;y=Math.random()*2-1;z=Math.random()*2-1;l=Math.sqrt(x*x+y*y+z*z);}while(l<1e-4);
    return [x/l,y/l,z/l];
  }

  function spawnP(i) {
    const rv=Math.random(); let acc=0, p=PARTS[0];
    for(const pt of PARTS){acc+=pt.w;if(rv<acc){p=pt;break;}}
    const[dx,dy,dz]=randDir();
    const off=(Math.random()-0.12)*p.spread;
    pPos[i*3]  =p.cx+dx*(p.rx+off);
    pPos[i*3+1]=p.cy+dy*(p.ry+off);
    pPos[i*3+2]=p.cz+dz*(p.rz+off);
    const[vx,vy,vz]=randDir();
    const spd=0.0016+Math.random()*0.0080;
    pVel[i*3]=vx*spd; pVel[i*3+1]=vy*spd*0.5+0.0009; pVel[i*3+2]=vz*spd;
    pLife[i]=Math.random()*0.30; pMaxL[i]=0.38+Math.random()*0.58;
  }
  for(let i=0;i<TOTAL;i++) spawnP(i);

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color',    new THREE.BufferAttribute(pCol, 3));

  group.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
    vertexColors: true, size: 0.055,
    transparent: true, opacity: 0.75,
    sizeAttenuation: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
  })));

  /* ── Mouse look-at + drag ─────────────────────────────────── */
  let mouseX=0, mouseY=0, lookX=0, lookY=0, tLX=0, tLY=0;
  let drag=false, px=0, py=0, dVX=0, dVY=0, mX=0, mY=0;

  window.addEventListener('mousemove', e => {
    mouseX=(e.clientX/innerWidth -0.5)*2;
    mouseY=-(e.clientY/innerHeight-0.5)*2;
    tLY=mouseX*0.52; tLX=-mouseY*0.30;
  });

  const cvs = renderer.domElement;
  cvs.addEventListener('pointerdown', e=>{drag=true;px=e.clientX;py=e.clientY;dVX=dVY=0;cvs.setPointerCapture(e.pointerId);});
  cvs.addEventListener('pointermove', e=>{
    if(!drag)return;
    dVX=(e.clientX-px)*0.009;dVY=(e.clientY-py)*0.009;
    mY+=dVX;mX+=dVY;mX=Math.max(-1.2,Math.min(1.2,mX));
    px=e.clientX;py=e.clientY;
  });
  cvs.addEventListener('pointerup',    ()=>drag=false);
  cvs.addEventListener('pointerleave', ()=>drag=false);

  const clock = new THREE.Clock();
  let pulseT = -99;
  cvs.addEventListener('click', ()=>{pulseT=clock.getElapsedTime();});

  /* ── Render loop ─────────────────────────────────────────── */
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    lookX+=(tLX-lookX)*0.042; lookY+=(tLY-lookY)*0.042;
    if(!drag){mY+=dVX;mX+=dVY;dVX*=0.90;dVY*=0.90;}

    group.rotation.x = lookX + mX + Math.sin(t*0.24)*0.020;
    group.rotation.y = lookY + mY + Math.cos(t*0.20)*0.016;

    const breathe = 1 + Math.sin(t*0.62)*0.018;
    const pe = t - pulseT;
    const boom = pe < 1.6 ? 1 + pe*0.18*Math.exp(-pe*3.0) : 1.0;
    group.scale.setScalar(breathe * boom);

    /* Particles */
    const pos=pGeo.attributes.position.array;
    const col=pGeo.attributes.color.array;
    for(let i=0;i<TOTAL;i++){
      pLife[i]+=0.0030+Math.random()*0.0022;
      if(pLife[i]>=pMaxL[i]){spawnP(i);continue;}
      pos[i*3]  +=pVel[i*3];
      pos[i*3+1]+=pVel[i*3+1];
      pos[i*3+2]+=pVel[i*3+2];
      const b=Math.max(0,Math.sin(pLife[i]/pMaxL[i]*Math.PI));
      col[i*3]=0.68+b*0.32; col[i*3+1]=0.85+b*0.15; col[i*3+2]=1.0;
    }
    pGeo.attributes.position.needsUpdate=true;
    pGeo.attributes.color.needsUpdate=true;

    keyLight.position.x=Math.sin(t*0.32)*3+mouseX*1.5;
    keyLight.position.y=Math.cos(t*0.26)*3+mouseY*1.5;

    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize',()=>{S=getSize();renderer.setSize(S,S);});
  cvs.style.cursor='grab';
  cvs.addEventListener('pointerdown',()=>cvs.style.cursor='grabbing');
  cvs.addEventListener('pointerup',  ()=>cvs.style.cursor='grab');
})();
