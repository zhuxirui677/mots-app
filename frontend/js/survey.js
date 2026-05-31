/**
 * survey.js — 5-step intake form logic
 */
(function () {
  const TOTAL = 5;
  let current = 1;

  const progressBar  = document.getElementById('progressBar');
  const stepCounter  = document.getElementById('stepCounter');
  const btnBack      = document.getElementById('btnBack');

  // ── Helpers ──────────────────────────────────────────────────

  function getPanel(n) {
    return document.querySelector(`.step-panel[data-step="${n}"]`);
  }

  function setProgress(n) {
    progressBar.style.width = `${(n / TOTAL) * 100}%`;
    stepCounter.textContent = `${n} / ${TOTAL}`;
    if (n > 1) {
      btnBack.classList.add('visible');
    } else {
      btnBack.classList.remove('visible');
    }
  }

  function goTo(next) {
    const from = getPanel(current);
    const to   = getPanel(next);
    if (!to) return;

    // Exit current
    from.classList.remove('active');
    if (next > current) {
      from.classList.add('exit-up');
    }
    setTimeout(() => from.classList.remove('exit-up'), 500);

    // Enter next
    to.classList.add('active');
    current = next;
    setProgress(current);

    // Update companion particle theme
    if (window.MOTS && window.MOTS.setCompanionStep) {
      window.MOTS.setCompanionStep(current);
    }

    // Focus first input in new step
    const firstInput = to.querySelector('input:not([type=radio]), textarea');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  }

  // ── Step 1 validation ─────────────────────────────────────────

  const nameInput     = document.getElementById('theirName');
  const nicknameInput = document.getElementById('theirNickname');
  const next1Btn      = document.getElementById('next1');

  function validateStep1() {
    next1Btn.disabled = !(nameInput.value.trim() && nicknameInput.value.trim());
  }

  nameInput.addEventListener('input', validateStep1);
  nicknameInput.addEventListener('input', validateStep1);

  next1Btn.addEventListener('click', () => goTo(2));

  // Allow Enter key to advance
  [nameInput, nicknameInput,
   document.getElementById('relationship'),
   document.getElementById('yourPronouns')].forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !next1Btn.disabled) goTo(2);
    });
  });

  // ── Step 2: Core Principle ────────────────────────────────────

  const next2Btn = document.getElementById('next2');

  document.querySelectorAll('[name="coreValue"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.step-panel[data-step="2"] .choice-card')
        .forEach(c => c.classList.remove('selected'));
      radio.closest('.choice-card').classList.add('selected');
      next2Btn.disabled = false;
    });
  });

  // Click on card label also toggles radio
  document.querySelectorAll('.step-panel[data-step="2"] .choice-card').forEach(card => {
    card.addEventListener('click', () => {
      const radio = card.querySelector('input[type=radio]');
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));
    });
    // Keyboard accessibility
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'radio');
    card.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        card.click();
      }
    });
  });

  next2Btn.addEventListener('click', () => goTo(3));

  // ── Step 3: Soul Weather ──────────────────────────────────────

  const next3Btn = document.getElementById('next3');

  document.querySelectorAll('[name="soulWeather"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.step-panel[data-step="3"] .choice-card')
        .forEach(c => c.classList.remove('selected'));
      radio.closest('.choice-card').classList.add('selected');
      next3Btn.disabled = false;
    });
  });

  document.querySelectorAll('.step-panel[data-step="3"] .choice-card').forEach(card => {
    card.addEventListener('click', () => {
      const radio = card.querySelector('input[type=radio]');
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));
    });
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'radio');
    card.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        card.click();
      }
    });
  });

  next3Btn.addEventListener('click', () => goTo(4));

  // ── Step 4: Chat sample (required) ───────────────────────────

  const chatSampleTextarea = document.getElementById('chatSample');
  const next4Btn           = document.getElementById('next4');

  chatSampleTextarea.addEventListener('input', () => {
    next4Btn.disabled = !chatSampleTextarea.value.trim();
  });

  next4Btn.addEventListener('click', () => goTo(5));

  // ── Step 5: Unsaid words + submit ────────────────────────────

  const unsaidTextarea = document.getElementById('thingsNeverSaid');
  const submitBtn      = document.getElementById('btnSubmit');

  unsaidTextarea.addEventListener('input', () => {
    submitBtn.disabled = !unsaidTextarea.value.trim();
  });

  submitBtn.addEventListener('click', async () => {
    if (submitBtn.disabled || submitBtn.classList.contains('loading')) return;

    const surveyData = {
      name:            document.getElementById('theirName').value.trim(),
      pronouns:        document.getElementById('yourPronouns').value.trim(),
      relationship:    document.getElementById('relationship').value.trim(),
      nickname:        document.getElementById('theirNickname').value.trim(),
      coreValue:       document.querySelector('[name="coreValue"]:checked')?.value || '',
      emotionalWeather:document.querySelector('[name="soulWeather"]:checked')?.value || '',
      chatSample:      document.getElementById('chatSample').value.trim(),
      thingsNeverSaid: unsaidTextarea.value.trim(),
    };

    submitBtn.classList.add('loading');
    submitBtn.textContent = 'Connecting…';
    submitBtn.disabled = true;

    // Retry up to 3 times with 8s gaps to handle Render cold-start (502/503)
    let lastErr;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { id } = await window.MotsAPI.createSession(surveyData);
        sessionStorage.setItem('mots_session_id', id);
        sessionStorage.setItem('mots_their_name', surveyData.name);
        window.location.href = `letter.html?id=${id}`;
        return;
      } catch (err) {
        lastErr = err;
        console.warn(`[attempt ${attempt}] createSession failed:`, err.message);
        if (attempt < 3) {
          submitBtn.textContent = `Server waking up… (${attempt}/3)`;
          await new Promise(r => setTimeout(r, 8000));
          submitBtn.textContent = 'Connecting…';
        }
      }
    }

    console.error(lastErr);
    submitBtn.classList.remove('loading');
    submitBtn.textContent = 'Something went wrong — try again';
    submitBtn.disabled = false;
    setTimeout(() => {
      submitBtn.innerHTML = 'Connect to their soul <span class="btn-continue__icon" aria-hidden="true">→</span>';
      submitBtn.disabled = !unsaidTextarea.value.trim();
    }, 3000);
  });

  // ── Back button ───────────────────────────────────────────────

  btnBack.addEventListener('click', () => {
    if (current > 1) goTo(current - 1);
  });

  // ── Init ──────────────────────────────────────────────────────
  setProgress(1);

})();
