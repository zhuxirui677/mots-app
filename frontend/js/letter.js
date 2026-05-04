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
