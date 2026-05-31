/**
 * companion.js — Canvas 2D holographic glow creatures, per-step colour themes.
 *
 * Creatures:
 *   rabbit (default) — survey pages, sits with long floppy ears
 *   cat              — memory/letter page, sits with pointed ears + curled tail
 *
 * Public API:
 *   window.MOTS.initCompanion(targetId, opts)   opts.creature = 'rabbit'|'cat'
 *   window.MOTS.setCompanionStep(step)           called from survey.js
 */
(function () {
  'use strict';
  window.MOTS = window.MOTS || {};

  // Per-step colour themes.  Each key is an RGB triplet [0..1].
  //   r = body/head   g = outer glow   f = feet/lower   p = paw/blush   e = ear
  var THEMES = {
    1: { r:[0.72,0.86,1.00], g:[0.28,0.65,1.00], f:[1.00,0.62,0.36], p:[1.00,0.50,0.60], e:[0.38,0.55,0.90] },
    2: { r:[0.88,0.92,1.00], g:[0.68,0.75,1.00], f:[0.70,0.58,1.00], p:[0.78,0.82,1.00], e:[0.58,0.62,0.92] },
    3: { r:[0.42,0.94,0.90], g:[0.18,0.86,0.82], f:[0.22,0.80,0.96], p:[0.28,0.98,0.88], e:[0.18,0.68,0.78] },
    4: { r:[1.00,0.86,0.50], g:[1.00,0.68,0.18], f:[1.00,0.50,0.14], p:[1.00,0.80,0.32], e:[0.88,0.58,0.16] },
    5: { r:[0.90,0.68,1.00], g:[0.76,0.28,0.92], f:[0.86,0.36,0.80], p:[1.00,0.52,0.86], e:[0.62,0.22,0.80] },
  };

  // Fixed theme for the memory/cat page — soft lavender-white
  var CAT_THEME = { r:[0.82,0.76,1.00], g:[0.55,0.35,0.95], f:[0.95,0.68,0.88], p:[1.00,0.55,0.80], e:[0.50,0.28,0.88] };

  function lerp3(a, b, t) {
    return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
  }
  function rgba(rgb, a) {
    return 'rgba('+Math.round(rgb[0]*255)+','+Math.round(rgb[1]*255)+','+Math.round(rgb[2]*255)+','+(a!==undefined?a:1)+')';
  }

  window.MOTS.initCompanion = function (targetId, opts) {
    var el = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
    if (!el) return;

    var size     = (opts && opts.size)     || 280;
    var creature = (opts && opts.creature) || 'rabbit';
    el.width  = size;
    el.height = size;
    var ctx = el.getContext('2d');
    var s   = size / 280;

    var isCat = (creature === 'cat');

    // Live-lerped theme colours
    var base = isCat ? CAT_THEME : THEMES[1];
    var cur = { r:base.r.slice(), g:base.g.slice(), f:base.f.slice(), p:base.p.slice(), e:base.e.slice() };
    var tgt = { r:base.r.slice(), g:base.g.slice(), f:base.f.slice(), p:base.p.slice(), e:base.e.slice() };

    window.MOTS.setCompanionStep = function (step) {
      if (isCat) return; // cat always uses memory theme
      var th = THEMES[step] || THEMES[1];
      tgt.r=th.r.slice(); tgt.g=th.g.slice(); tgt.f=th.f.slice(); tgt.p=th.p.slice(); tgt.e=th.e.slice();
    };

    var mx = 0, my = 0;
    window.addEventListener('mousemove', function (e) {
      mx = (e.clientX / innerWidth  - 0.5) * 10;
      my = (e.clientY / innerHeight - 0.5) *  7;
    });

    /**
     * Draw one glowing body part as a soft radial-gradient ellipse.
     * cx, cy, rx, ry in base-280 coords.
     */
    function part(cx, cy, rx, ry, rot, fill, glow, blur, tf) {
      tf = tf || 0.08;
      ctx.save();
      ctx.translate((cx + mx*tf)*s, (cy + my*tf)*s);
      if (rot) ctx.rotate(rot);

      // outer glow
      ctx.shadowBlur  = blur * s * 1.5;
      ctx.shadowColor = rgba(glow, 0.7);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx*s*1.08, ry*s*1.08, 0, 0, Math.PI*2);
      ctx.fillStyle = rgba(glow, 0.08);
      ctx.fill();

      // main body
      ctx.shadowBlur  = blur * s;
      ctx.shadowColor = rgba(glow, 0.85);
      var maxR = Math.max(rx,ry)*s;
      var grd  = ctx.createRadialGradient(-rx*s*0.22,-ry*s*0.26,0, rx*s*0.08,ry*s*0.08, maxR*1.08);
      grd.addColorStop(0.00, 'rgba(255,255,255,0.96)');
      grd.addColorStop(0.15, rgba(fill, 0.93));
      grd.addColorStop(0.55, rgba([fill[0]*0.80,fill[1]*0.82,fill[2]*0.84], 0.80));
      grd.addColorStop(0.82, rgba([fill[0]*0.55,fill[1]*0.60,fill[2]*0.65], 0.38));
      grd.addColorStop(1.00, rgba(fill, 0.04));
      ctx.beginPath();
      ctx.ellipse(0, 0, rx*s, ry*s, 0, 0, Math.PI*2);
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.restore();
    }

    function blush(bx, by) {
      var bg = ctx.createRadialGradient((bx+mx*0.08)*s,(by+my*0.08)*s,0, (bx+mx*0.08)*s,(by+my*0.08)*s,13*s);
      bg.addColorStop(0,'rgba(255,118,148,0.80)');
      bg.addColorStop(1,'rgba(255,118,148,0.00)');
      ctx.beginPath();
      ctx.ellipse((bx+mx*0.08)*s,(by+my*0.08)*s,13*s,9*s,0,0,Math.PI*2);
      ctx.fillStyle=bg; ctx.fill();
    }

    function drawRabbit(t, cr, cg, cf, cp, ce, oy, br) {
      // ears
      part(120,58+oy,14,38,-0.24,ce,cg,16,0.04);
      part(170,50+oy,14,38, 0.13,ce,cg,16,0.04);
      // legs
      part(113,226+oy,21,44,-0.04,cf,cf,20,0.10);
      part(163,229+oy,20,42, 0.08,cf,cf,20,0.10);
      // body
      part(140,170+oy,52,57*(1+br),0,cr,cg,26,0.08);
      // arms
      part( 96,157+oy,18,33, 0.22,cr,cg,14,0.07);
      part(184,149+oy,17,31,-0.26,cr,cg,14,0.07);
      // head
      part(140,103+oy,40,38*(1+br),0,cr,cg,26,0.08);
      // paw
      part(157,141+oy,13,12,0,cp,cp,13,0.09);
      // cheeks
      ctx.save(); ctx.shadowBlur=0; ctx.globalAlpha=0.55;
      blush(116,111+oy); blush(165,111+oy);
      ctx.restore();
      // eyes
      ctx.save(); ctx.shadowBlur=0;
      [[127,97],[154,97]].forEach(function(pt){
        var ex=(pt[0]+mx*0.08)*s, ey=(pt[1]+oy+my*0.08)*s;
        ctx.fillStyle='rgba(12,6,24,0.90)';
        ctx.beginPath(); ctx.arc(ex,ey,3.5*s,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.70)';
        ctx.beginPath(); ctx.arc(ex-1.2*s,ey-1.2*s,1.4*s,0,Math.PI*2); ctx.fill();
      });
      ctx.restore();
    }

    function drawCat(t, cr, cg, cf, cp, ce, oy, br) {
      // tail — thin curved bezier path with glow
      ctx.save();
      ctx.shadowBlur  = 18*s;
      ctx.shadowColor = rgba(cf, 0.85);
      var tailGrd = ctx.createLinearGradient(178*s,(175+oy)*s, 148*s,(248+oy)*s);
      tailGrd.addColorStop(0, rgba(cr, 0.80));
      tailGrd.addColorStop(1, rgba(cf, 0.70));
      ctx.beginPath();
      ctx.moveTo((178+mx*0.10)*s, (175+oy+my*0.10)*s);
      ctx.bezierCurveTo(
        (210+mx*0.10)*s, (195+oy+my*0.10)*s,
        (208+mx*0.10)*s, (245+oy+my*0.10)*s,
        (148+mx*0.10)*s, (248+oy+my*0.10)*s
      );
      ctx.bezierCurveTo(
        (168+mx*0.10)*s, (246+oy+my*0.10)*s,
        (172+mx*0.10)*s, (200+oy+my*0.10)*s,
        (166+mx*0.10)*s, (185+oy+my*0.10)*s
      );
      ctx.closePath();
      ctx.fillStyle = tailGrd;
      ctx.fill();
      ctx.restore();

      // back legs
      part(112,224+oy,20,40,-0.04,cf,cf,18,0.09);
      part(160,227+oy,19,39, 0.06,cf,cf,18,0.09);
      // body
      part(138,172+oy,48,54*(1+br),0,cr,cg,24,0.08);
      // left ear (pointed)
      part(112,80+oy,10,20,-0.28,ce,cg,14,0.04);
      // right ear (pointed)
      part(168,80+oy,10,20, 0.28,ce,cg,14,0.04);
      // inner ear (pink)
      part(112,82+oy,5,12,-0.28,cp,cp,8,0.04);
      part(168,82+oy,5,12, 0.28,cp,cp,8,0.04);
      // front paws (side by side at bottom of body)
      part(118,220+oy,17,14, 0,cr,cg,12,0.09);
      part(162,220+oy,17,14, 0,cr,cg,12,0.09);
      // head
      part(140,107+oy,38,36*(1+br),0,cr,cg,24,0.08);
      // cheeks
      ctx.save(); ctx.shadowBlur=0; ctx.globalAlpha=0.50;
      blush(114,114+oy); blush(166,114+oy);
      ctx.restore();
      // nose (small pink diamond)
      ctx.save(); ctx.shadowBlur=8*s; ctx.shadowColor=rgba(cp,0.8);
      ctx.fillStyle=rgba(cp,0.85);
      ctx.beginPath();
      ctx.ellipse((140+mx*0.08)*s,(120+oy+my*0.08)*s,4*s,3*s,0,0,Math.PI*2);
      ctx.fill(); ctx.restore();
      // cat eyes (slightly almond-shaped)
      ctx.save(); ctx.shadowBlur=0;
      [[126,104],[154,104]].forEach(function(pt){
        var ex=(pt[0]+mx*0.08)*s, ey=(pt[1]+oy+my*0.08)*s;
        ctx.fillStyle='rgba(8,4,20,0.92)';
        ctx.beginPath(); ctx.ellipse(ex,ey,4*s,3.2*s,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.75)';
        ctx.beginPath(); ctx.arc(ex-1.4*s,ey-1.1*s,1.5*s,0,Math.PI*2); ctx.fill();
        // whiskers
        ctx.strokeStyle=rgba(cr,0.35);
        ctx.lineWidth=0.8*s;
        if(pt[0]<140){ // left side
          ctx.shadowBlur=4*s; ctx.shadowColor=rgba(cg,0.4);
          [[85,108,122,111],[85,113,122,114],[85,118,122,117]].forEach(function(w){
            ctx.beginPath(); ctx.moveTo((w[0]+mx*0.04)*s,(w[1]+oy+my*0.04)*s);
            ctx.lineTo((w[2]+mx*0.04)*s,(w[3]+oy+my*0.04)*s); ctx.stroke();
          });
        } else { // right side
          [[158,111,195,108],[158,114,195,113],[158,117,195,118]].forEach(function(w){
            ctx.beginPath(); ctx.moveTo((w[0]+mx*0.04)*s,(w[1]+oy+my*0.04)*s);
            ctx.lineTo((w[2]+mx*0.04)*s,(w[3]+oy+my*0.04)*s); ctx.stroke();
          });
        }
      });
      ctx.restore();
    }

    function draw(t) {
      ctx.clearRect(0, 0, size, size);
      var L = 0.025;
      ['r','g','f','p','e'].forEach(function(k){ cur[k]=lerp3(cur[k],tgt[k],L); });
      var br = Math.sin(t*0.80)*0.013;
      var fl = Math.sin(t*0.55)*3.5;
      var oy = fl;
      if (isCat) {
        drawCat(t, cur.r, cur.g, cur.f, cur.p, cur.e, oy, br);
      } else {
        drawRabbit(t, cur.r, cur.g, cur.f, cur.p, cur.e, oy, br);
      }
    }

    var t0 = performance.now();
    function animate() { requestAnimationFrame(animate); draw((performance.now()-t0)/1000); }
    animate();
  };
}());
