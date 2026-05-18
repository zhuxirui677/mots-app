/**
 * letter.js — loading → letter reveal → chat
 *
 * Flow:
 *  1. Read sessionId from URL (?id=...) or sessionStorage
 *  2. Poll GET /api/sessions/:id/status every 2 s
 *  3. Show "1 NEW MESSAGE" banner when ready
 *  4. On tap/click → fade banner, reveal letter as paragraphs
 *  5. Show "Continue the conversation" button + enable chat input
 */
(function () {

  // ── Elements ────────────────────────────────────────────────
  const loadingScreen = document.getElementById('loading-screen');
  const loadingText   = document.getElementById('loadingText');
  const newMsgBanner  = document.getElementById('new-msg-banner');
  const newMsgFrom    = document.getElementById('newMsgFrom');
  const letterSection = document.getElementById('letterSection');
  const letterFrom    = document.getElementById('letterFrom');
  const letterBody    = document.getElementById('letterBody');
  const letterActions = document.getElementById('letterActions');
  const chatSection   = document.getElementById('chatSection');
  const chatBar       = document.getElementById('chatBar');
  const messages      = document.getElementById('messages');
  const chatInput     = document.getElementById('chatInput');
  const btnSend       = document.getElementById('btnSend');
  const btnReply      = document.getElementById('btnReply');
  const headerName    = document.getElementById('headerName');
  const errorSection  = document.getElementById('errorSection');

  // ── Session ID ───────────────────────────────────────────────
  const params    = new URLSearchParams(window.location.search);
  const sessionId = params.get('id') || sessionStorage.getItem('mots_session_id');

  if (!sessionId) {
    window.location.href = 'survey.html';
    return;
  }

  const cachedName = sessionStorage.getItem('mots_their_name') || '';

  // ── Loading text cycling ─────────────────────────────────────
  const loadingPhrases = [
    'Connecting to their soul',
    'Reading their words',
    'Finding their voice',
    'Writing in their hand',
    'Almost there',
  ];
  let phraseIdx = 0;
  const phraseTimer = setInterval(() => {
    phraseIdx = (phraseIdx + 1) % loadingPhrases.length;
    loadingText.textContent = loadingPhrases[phraseIdx];
  }, 2800);

  // ── Poll GET /api/sessions/:id/status every 2 s ──────────────
  function init() {
    let pollTimer;
    let attempts  = 0;
    const MAX     = 45; // 90 s at 2 s intervals

    function stopPolling() {
      clearInterval(phraseTimer);
      clearInterval(pollTimer);
    }

    async function tick() {
      attempts++;
      try {
        const { status, letter } = await window.MotsAPI.pollStatus(sessionId);

        if (status === 'ready') {
          stopPolling();
          showNewMessage(letter);
        } else if (status === 'error') {
          stopPolling();
          showError();
        } else if (attempts >= MAX) {
          stopPolling();
          showError();
        }
      } catch (_err) {
        stopPolling();
        showError();
      }
    }

    tick();
    pollTimer = setInterval(tick, 2000);
  }

  // ── "1 NEW MESSAGE" banner ───────────────────────────────────
  function showNewMessage(letterText) {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => { loadingScreen.style.display = 'none'; }, 900);

    const name = cachedName || 'them';
    newMsgFrom.textContent  = `From ${name}`;
    headerName.textContent  = name;

    setTimeout(() => {
      newMsgBanner.classList.add('show');
      newMsgBanner.focus();
    }, 400);

    function reveal() {
      newMsgBanner.removeEventListener('click', reveal);
      newMsgBanner.removeEventListener('keydown', revealKey);
      newMsgBanner.classList.remove('show');

      // Render letter as paragraphs (Gemini separates them with \n\n)
      letterFrom.textContent = cachedName
        ? `A letter from ${cachedName}`
        : 'A letter for you';

      letterBody.innerHTML = '';
      (letterText || '').split(/\n\n+/).forEach(para => {
        if (!para.trim()) return;
        const p = document.createElement('p');
        p.textContent = para.trim();
        letterBody.appendChild(p);
      });

      // Reveal letter + action row + chat
      setTimeout(() => {
        letterSection.classList.add('visible');
        letterActions.style.display = '';
        chatSection.classList.add('visible');
        chatBar.style.display = '';
      }, 600);
    }

    function revealKey(e) {
      if (e.key === 'Enter' || e.key === ' ') reveal();
    }

    newMsgBanner.addEventListener('click', reveal);
    newMsgBanner.addEventListener('keydown', revealKey);
  }

  // ── "Continue the conversation" button ───────────────────────
  if (btnReply) {
    btnReply.addEventListener('click', () => {
      chatInput.focus();
      chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // ── Toast notification helper ────────────────────────────────
  function showToast(message) {
    const existing = document.getElementById('mots-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'mots-toast';
    toast.textContent = message;
    toast.style.cssText = [
      'position:fixed',
      'bottom:calc(env(safe-area-inset-bottom, 0px) + 6rem)',
      'left:50%',
      'transform:translateX(-50%)',
      'background:rgba(30,40,60,.92)',
      'backdrop-filter:blur(16px)',
      '-webkit-backdrop-filter:blur(16px)',
      'border:1px solid rgba(180,210,255,.2)',
      'color:rgba(220,235,255,.9)',
      'font-size:.72rem',
      'letter-spacing:.08em',
      'padding:.5rem 1.2rem',
      'border-radius:100px',
      'z-index:300',
      'pointer-events:none',
      'white-space:nowrap',
      'opacity:0',
      'transition:opacity .25s',
    ].join(';');

    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // ── "Save to memories" button ────────────────────────────────
  const btnSaveMemory = document.getElementById('btnSaveMemory');
  if (btnSaveMemory) {
    btnSaveMemory.addEventListener('click', () => {
      const paragraphs = Array.from(letterBody.querySelectorAll('p'));
      const text = paragraphs.map(p => p.textContent.trim()).join('\n\n');
      if (!text) return;

      const memories = JSON.parse(localStorage.getItem('mots_memories') || '[]');
      memories.unshift({
        savedAt: new Date().toISOString(),
        name: cachedName || 'Unknown',
        letter: text,
      });
      localStorage.setItem('mots_memories', JSON.stringify(memories));

      btnSaveMemory.textContent = '✓ saved';
      btnSaveMemory.disabled = true;
      showToast('Letter saved to memories');
    });
  }

  // ── Mic / voice-input button ─────────────────────────────────
  const btnMic = document.getElementById('btnMic');
  if (btnMic) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      btnMic.title = 'Voice input not supported in this browser';
      btnMic.style.opacity = '.3';
      btnMic.style.cursor = 'not-allowed';
    } else {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let isRecording = false;

      btnMic.addEventListener('click', () => {
        if (isRecording) {
          recognition.stop();
          return;
        }
        try {
          recognition.start();
        } catch (_e) {
          // recognition already started (can happen on rapid clicks)
        }
      });

      recognition.addEventListener('start', () => {
        isRecording = true;
        btnMic.classList.add('recording');
        btnMic.setAttribute('aria-label', 'Stop recording');
        showToast('Listening…');
      });

      recognition.addEventListener('result', (e) => {
        const transcript = e.results[0][0].transcript;
        chatInput.value = (chatInput.value + ' ' + transcript).trimStart();
        chatInput.dispatchEvent(new Event('input'));
      });

      recognition.addEventListener('end', () => {
        isRecording = false;
        btnMic.classList.remove('recording');
        btnMic.setAttribute('aria-label', 'Voice input');
      });

      recognition.addEventListener('error', (e) => {
        isRecording = false;
        btnMic.classList.remove('recording');
        btnMic.setAttribute('aria-label', 'Voice input');
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          showToast('Microphone error — please try again');
        }
      });
    }
  }

  // ── Chat ─────────────────────────────────────────────────────
  let isSending = false;

  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 130) + 'px';
    btnSend.disabled = !chatInput.value.trim();
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!btnSend.disabled) sendMessage();
    }
  });

  btnSend.addEventListener('click', sendMessage);

  async function sendMessage() {
    if (isSending) return;
    const text = chatInput.value.trim();
    if (!text) return;

    isSending = true;
    btnSend.disabled = true;
    chatInput.value = '';
    chatInput.style.height = 'auto';

    appendMessage('user', text);
    const typingId = appendTyping();

    try {
      const { reply } = await window.MotsAPI.sendChat(sessionId, text);
      removeTyping(typingId);
      appendMessage('ai', reply);
    } catch (_err) {
      removeTyping(typingId);
      appendMessage('ai', 'Something went quiet for a moment. Try again?');
    }

    isSending = false;
    btnSend.disabled = !chatInput.value.trim();
    chatInput.focus();
  }

  function appendMessage(role, text) {
    const wrap = document.createElement('div');
    wrap.className = `msg msg--${role}`;

    const roleLabel = document.createElement('span');
    roleLabel.className = 'msg__role';
    roleLabel.textContent = role === 'ai' ? (cachedName || 'Them') : 'You';

    const bubble = document.createElement('div');
    bubble.className = 'msg__bubble';
    bubble.textContent = text;

    wrap.append(roleLabel, bubble);
    messages.appendChild(wrap);
    wrap.scrollIntoView({ behavior: 'smooth', block: 'end' });
    return wrap;
  }

  let typingCounter = 0;

  function appendTyping() {
    const id   = `typing-${++typingCounter}`;
    const wrap = document.createElement('div');
    wrap.className = 'msg msg--ai msg--typing';
    wrap.id = id;

    const roleLabel = document.createElement('span');
    roleLabel.className = 'msg__role';
    roleLabel.textContent = cachedName || 'Them';

    const bubble = document.createElement('div');
    bubble.className = 'msg__bubble';
    bubble.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;

    wrap.append(roleLabel, bubble);
    messages.appendChild(wrap);
    wrap.scrollIntoView({ behavior: 'smooth', block: 'end' });
    return id;
  }

  function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  // ── Error ────────────────────────────────────────────────────
  function showError() {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => { loadingScreen.style.display = 'none'; }, 900);
    errorSection.style.display = '';
  }

  // ── Start ────────────────────────────────────────────────────
  init();

})();
