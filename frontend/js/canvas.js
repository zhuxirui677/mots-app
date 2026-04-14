/**
 * canvas.js — drifting snow / ice-dust particle field
 * Cool white-blue palette, particles drift downward.
 */
(function () {
  const canvas = document.getElementById('canvas-bg');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  const PARTICLE_COUNT = 130;
  const particles = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Each particle is a small snow/ice mote drifting downward.
   * randomY=true  → scatter across full height on init
   * randomY=false → spawn above the top edge
   */
  function createParticle(randomY) {
    // Mostly pure white/light-blue, occasionally a deeper ice blue
    const roll = Math.random();
    let r, g, b;
    if (roll > 0.72) {
      // ice blue
      r = rand(140, 180); g = rand(190, 220); b = 255;
    } else if (roll > 0.40) {
      // near-white with blue tint
      r = rand(200, 230); g = rand(215, 235); b = 255;
    } else {
      // pure near-white
      r = rand(220, 245); g = rand(225, 245); b = rand(240, 255);
    }

    return {
      x:     rand(0, canvas.width),
      y:     randomY ? rand(0, canvas.height) : -rand(2, 40),
      r:     rand(0.2, 1.2),
      alpha: rand(0.04, 0.38),
      speed: rand(0.05, 0.22),   // falling speed
      drift: rand(-0.025, 0.025), // horizontal sway
      color: `${Math.round(r)},${Math.round(g)},${Math.round(b)}`,
    };
  }

  function init() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle(true));
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.fill();

      // drift downward
      p.y += p.speed;
      p.x += p.drift;

      // re-spawn above top when past bottom
      if (p.y > canvas.height + 3) {
        Object.assign(p, createParticle(false));
      }
      // wrap horizontally
      if (p.x < -3)               p.x = canvas.width  + 2;
      if (p.x > canvas.width + 3) p.x = -2;
    }

    requestAnimationFrame(draw);
  }

  resize();
  init();
  draw();

  window.addEventListener('resize', () => { resize(); init(); });
})();
