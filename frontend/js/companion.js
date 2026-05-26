/**
 * companion.js — TouchDesigner-style particle rabbit (survey & letter pages)
 * Pure particle art — no solid meshes, no lighting.
 * Matches orb.js aesthetic: warm orange body + large teal/amber accent dots.
 *
 * Usage:
 *   window.MOTS.initCompanion('canvas-id')
 *   window.MOTS.initCompanion('canvas-id', { size: 96, compact: true })
 */
(function () {
  window.MOTS = window.MOTS || {};

  window.MOTS.initCompanion = function (targetId, opts) {
    if (typeof THREE === 'undefined') return;
    var cvs = typeof targetId === 'string'
      ? document.getElementById(targetId) : targetId;
    if (!cvs) return;

    var size    = (opts && opts.size)    || 280;
    var compact = (opts && opts.compact) || false;

    var renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);

    var scene  = new THREE.Scene();
    var fov    = compact ? 42 : 46;
    var camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 30);
    var camZ   = compact ? 3.2 : 4.2;
    camera.position.set(0, compact ? 0.32 : 0.40, camZ);
    camera.lookAt(0, compact ? 0.32 : 0.40, 0);

    /* ── warm glow sprite ─────────────────────────────────────── */
    var spriteTex = (function () {
      var c = document.createElement('canvas'); c.width = c.height = 48;
      var ctx = c.getContext('2d');
      var g = ctx.createRadialGradient(24,24,0, 24,24,24);
      g.addColorStop(0,    'rgba(255,255,255,1.0)');
      g.addColorStop(0.20, 'rgba(255,215,160,0.94)');
      g.addColorStop(0.55, 'rgba(200,110,40,0.35)');
      g.addColorStop(1.0,  'rgba(40,10,0,0.0)');
      ctx.fillStyle = g; ctx.fillRect(0,0,48,48);
      return new THREE.CanvasTexture(c);
    }());

    /* scale factor so compact (96px) matches full (280px) spatially */
    var sc = compact ? 0.62 : 1.0;

    /* ── zone table ──────────────────────────────────────────────
       [ cx,  cy,  cz,   rx,   ry,   rz,  count, R,    G,    B ]
    ─────────────────────────────────────────────────────────────── */
    var ZONES = [
      /* body  */ [0,   0,    0,    sc*1.05,sc*1.05,sc*1.05, compact?340:900,  0.88,0.54,0.24],
      /* head  */ [0,   sc*1.36,sc*0.08,sc*0.77,sc*0.77,sc*0.77, compact?220:580,  0.90,0.60,0.26],
      /* L ear */ [-sc*0.35,sc*2.14,0, sc*0.28,sc*0.48,sc*0.22, compact?70:190,   0.84,0.44,0.18],
      /* R ear */ [ sc*0.35,sc*2.14,0, sc*0.28,sc*0.48,sc*0.22, compact?70:190,   0.84,0.44,0.18],
      /* L eye */ [-sc*0.26,sc*1.28,sc*0.63,sc*0.12,sc*0.12,sc*0.10, compact?20:55, 0.96,0.90,0.72],
      /* R eye */ [ sc*0.26,sc*1.28,sc*0.63,sc*0.12,sc*0.12,sc*0.10, compact?20:55, 0.96,0.90,0.72],
      /* L arm */ [-sc*0.72,sc*0.20,sc*0.34,sc*0.22,sc*0.34,sc*0.17, compact?40:110, 0.86,0.52,0.22],
      /* R arm */ [ sc*0.72,sc*0.20,sc*0.34,sc*0.22,sc*0.34,sc*0.17, compact?40:110, 0.86,0.52,0.22],
    ];

    /* ── particle counts ─────────────────────────────────────── */
    var SURF_N = 0;
    for (var zi = 0; zi < ZONES.length; zi++) SURF_N += ZONES[zi][6];
    var LARGE_N = compact ? 55 : 150;
    var TOTAL   = SURF_N + LARGE_N;

    /* typed arrays */
    var pPos   = new Float32Array(TOTAL * 3);
    var pSeed  = new Float32Array(SURF_N * 3);
    var pVel   = new Float32Array(TOTAL * 3);
    var pBase  = new Float32Array(TOTAL * 3);
    var pCol   = new Float32Array(TOTAL * 3);
    var pLife  = new Float32Array(TOTAL);
    var pMaxL  = new Float32Array(TOTAL);
    var pPhase = new Float32Array(TOTAL);

    /* ── random direction helper ─────────────────────────────── */
    var _d = new Float32Array(3);
    function randDir() {
      var th = Math.random()*6.2832, ph = Math.acos(2*Math.random()-1);
      _d[0]=Math.sin(ph)*Math.cos(th); _d[1]=Math.sin(ph)*Math.sin(th); _d[2]=Math.cos(ph);
    }

    /* ── seed surface particles ──────────────────────────────── */
    var idx = 0;
    for (var zi = 0; zi < ZONES.length; zi++) {
      var z = ZONES[zi];
      var br=z[7], bg=z[8], bb=z[9];
      for (var j = 0; j < z[6]; j++) {
        randDir();
        var off = 0.88 + Math.random()*0.20;
        var sx=z[0]+_d[0]*z[3]*off, sy=z[1]+_d[1]*z[4]*off, sz=z[2]+_d[2]*z[5]*off;
        pPos[idx*3]  =pSeed[idx*3]  =sx+(Math.random()-0.5)*0.05;
        pPos[idx*3+1]=pSeed[idx*3+1]=sy+(Math.random()-0.5)*0.05;
        pPos[idx*3+2]=pSeed[idx*3+2]=sz+(Math.random()-0.5)*0.05;
        var spd=(0.0002+Math.random()*0.0005);
        pVel[idx*3]=(Math.random()-0.5)*spd;
        pVel[idx*3+1]=(Math.random()-0.5)*spd;
        pVel[idx*3+2]=(Math.random()-0.5)*spd;
        pPhase[idx]=Math.random()*6.2832;
        pLife[idx]=Math.random(); pMaxL[idx]=0.9+Math.random()*1.4;
        var shade = 0.55+_d[1]*0.25+_d[2]*0.18;
        if (Math.random()<0.10) {
          pBase[idx*3]=0.26; pBase[idx*3+1]=0.84; pBase[idx*3+2]=0.78; /* teal */
        } else {
          pBase[idx*3]=Math.min(1,br*shade); pBase[idx*3+1]=Math.min(1,bg*shade); pBase[idx*3+2]=Math.min(1,bb*shade);
        }
        pCol[idx*3]=pBase[idx*3]; pCol[idx*3+1]=pBase[idx*3+1]; pCol[idx*3+2]=pBase[idx*3+2];
        idx++;
      }
    }

    /* ── large accent dot spawn ──────────────────────────────── */
    function spawnLarge(i) {
      var angle=Math.random()*6.2832, radius=0.1+Math.random()*sc*2.0;
      var height=(Math.random()-0.12)*sc*2.6;
      pPos[i*3]  =Math.cos(angle)*radius*0.65;
      pPos[i*3+1]=height+sc*0.55;
      pPos[i*3+2]=Math.sin(angle)*radius*0.35;
      var spd=0.004+Math.random()*0.012;
      pVel[i*3]  =(Math.random()-0.5)*spd*0.55;
      pVel[i*3+1]=spd*(0.40+Math.random()*1.10);
      pVel[i*3+2]=(Math.random()-0.5)*spd*0.30;
      pLife[i]=Math.random()*0.35; pMaxL[i]=0.5+Math.random()*0.9;
      pPhase[i]=Math.random()*6.2832;
      var rnd=Math.random();
      if (rnd<0.40)      { pBase[i*3]=0.92;pBase[i*3+1]=0.60;pBase[i*3+2]=0.24; }
      else if (rnd<0.65) { pBase[i*3]=0.96;pBase[i*3+1]=0.82;pBase[i*3+2]=0.38; }
      else               { pBase[i*3]=0.26;pBase[i*3+1]=0.86;pBase[i*3+2]=0.80; }
      pCol[i*3]=pBase[i*3]; pCol[i*3+1]=pBase[i*3+1]; pCol[i*3+2]=pBase[i*3+2];
    }
    for (var ai = SURF_N; ai < TOTAL; ai++) spawnLarge(ai);

    /* ── Geometry + Points (small surface) ──────────────────── */
    var posSm = pPos.subarray(0, SURF_N*3);
    var colSm = pCol.subarray(0, SURF_N*3);
    var geoSm = new THREE.BufferGeometry();
    geoSm.setAttribute('position', new THREE.BufferAttribute(posSm, 3));
    geoSm.setAttribute('color',    new THREE.BufferAttribute(colSm, 3));
    var matSm = new THREE.PointsMaterial({
      map: spriteTex, alphaTest: 0.004, vertexColors: true,
      size: compact ? 0.075 : 0.090, transparent: true, opacity: 0.86,
      sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending
    });

    /* ── Geometry + Points (large accents) ───────────────────── */
    var posLg = pPos.subarray(SURF_N*3, TOTAL*3);
    var colLg = pCol.subarray(SURF_N*3, TOTAL*3);
    var geoLg = new THREE.BufferGeometry();
    geoLg.setAttribute('position', new THREE.BufferAttribute(posLg, 3));
    geoLg.setAttribute('color',    new THREE.BufferAttribute(colLg, 3));
    var matLg = new THREE.PointsMaterial({
      map: spriteTex, alphaTest: 0.003, vertexColors: true,
      size: compact ? 0.24 : 0.32, transparent: true, opacity: 0.80,
      sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending
    });

    var grp = new THREE.Group();
    grp.add(new THREE.Points(geoSm, matSm));
    grp.add(new THREE.Points(geoLg, matLg));
    grp.position.y = sc * -0.28;
    scene.add(grp);

    /* ── mouse look ──────────────────────────────────────────── */
    var tRotY=0, tRotX=0, cRotY=0, cRotX=0;
    window.addEventListener('mousemove', function (e) {
      tRotY = (e.clientX/innerWidth  - 0.5)*2 * 0.36;
      tRotX = -(e.clientY/innerHeight - 0.5)*2 * 0.20;
    });

    /* ── animation ───────────────────────────────────────────── */
    var clock = new THREE.Clock();
    var ksp   = 0.055;

    function animate() {
      requestAnimationFrame(animate);
      var t = clock.getElapsedTime();

      cRotY += (tRotY - cRotY) * 0.04;
      cRotX += (tRotX - cRotX) * 0.04;
      grp.rotation.y = cRotY + Math.sin(t*0.20)*0.05;
      grp.rotation.x = cRotX + Math.cos(t*0.16)*0.03;
      grp.position.y = sc*-0.28 + Math.sin(t*0.68)*0.04*sc;

      /* surface spring */
      for (var i = 0; i < SURF_N; i++) {
        var i3=i*3;
        pVel[i3]  =pVel[i3]  *0.93+(pSeed[i3]  -pPos[i3]  )*ksp+(Math.random()-0.5)*0.0004;
        pVel[i3+1]=pVel[i3+1]*0.93+(pSeed[i3+1]-pPos[i3+1])*ksp+(Math.random()-0.5)*0.0004;
        pVel[i3+2]=pVel[i3+2]*0.93+(pSeed[i3+2]-pPos[i3+2])*ksp+(Math.random()-0.5)*0.0004;
        pPos[i3]  +=pVel[i3];  pPos[i3+1]+=pVel[i3+1];  pPos[i3+2]+=pVel[i3+2];
        var tw=0.72+0.28*Math.sin(t*3.0+pPhase[i]);
        pCol[i3]=pBase[i3]*tw; pCol[i3+1]=pBase[i3+1]*tw; pCol[i3+2]=pBase[i3+2]*tw;
      }

      /* large dot drift */
      for (var i = SURF_N; i < TOTAL; i++) {
        var i3=i*3;
        pLife[i]+=0.007+Math.random()*0.003;
        if (pLife[i]>=pMaxL[i]) { spawnLarge(i); continue; }
        pPos[i3]+=pVel[i3]; pPos[i3+1]+=pVel[i3+1]; pPos[i3+2]+=pVel[i3+2];
        var alpha=Math.sin(pLife[i]/pMaxL[i]*Math.PI);
        var tw=alpha*(0.80+0.20*Math.sin(t*2.5+pPhase[i]));
        pCol[i3]=pBase[i3]*tw; pCol[i3+1]=pBase[i3+1]*tw; pCol[i3+2]=pBase[i3+2]*tw;
      }

      geoSm.attributes.position.array.set(posSm);
      geoSm.attributes.color.array.set(colSm);
      geoSm.attributes.position.needsUpdate=true;
      geoSm.attributes.color.needsUpdate=true;

      geoLg.attributes.position.array.set(posLg);
      geoLg.attributes.color.array.set(colLg);
      geoLg.attributes.position.needsUpdate=true;
      geoLg.attributes.color.needsUpdate=true;

      renderer.render(scene, camera);
    }
    animate();
  };
}());
