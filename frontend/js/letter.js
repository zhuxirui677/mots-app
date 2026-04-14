/**
 * letter.js — loading → letter reveal → chat
 *
 * Flow:
 *  1. Read sessionId from URL (?id=...) or sessionStorage
 *  2. Poll backend until status=ready
 *  3. Show "1 NEW MESSAGE" banner
 *  4. On tap/click → fade banner, reveal letter
 *  5. Enable chat input
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
  const chatSection   = document.getElementById('chatSection');
  const chatBar       = document.getElementById('chatBar');
  const messages      = document.getElementById('messages');
  const chatInput     = document.getElementById('chatInput');
  const btnSend       = document.getElementById('btnSend');
  const headerName    = document.getElementById('headerName');
  const errorSection  = document.getElementById('errorSection');

  // ── Session ID ───────────────────────────────────────────────
  const params    = new URLSearchParams(window.location.search);
  const sessionId = params.get('id') || sessionStorage.getItem('mots_session_id');

  if (!sessionId) {
    window.location.href = 'survey.html';
    return;
  }

  // Retrieve name for personalisation
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

  // ── Poll until ready ─────────────────────────────────────────
  async function init() {
    try {
      const session = await window.MotsAPI.waitForLetter(
        sessionId,
        null,
        90_000
      );

      clearInterval(phraseTimer);
      showNewMessage(session);

    } catch (err) {
      clearInterval(phraseTimer);
      showError(err.message);
    }
  }

  // ── "1 NEW MESSAGE" banner ───────────────────────────────────
  function showNewMessage(session) {
    // Fade out loading screen
    loadingScreen.classList.add('fade-out');
    setTimeout(() => { loadingScreen.style.display = 'none'; }, 900);

    // Populate "from" line
    const name = cachedName || 'them';
    newMsgFrom.textContent = `From ${name}`;
    headerName.textContent = name;

    // Show banner
    setTimeout(() => {
      newMsgBanner.classList.add('show');
      newMsgBanner.focus();
    }, 400);

    // On any click/tap — dismiss and reveal letter
    function reveal() {
      newMsgBanner.removeEventListener('click', reveal);
      newMsgBanner.removeEventListener('keydown', revealKey);

      newMsgBanner.classList.remove('show');

      // Populate letter
      const fromLine = cachedName
        ? `A letter from ${cachedName}`
        : 'A letter for you';
      letterFrom.textContent = fromLine;
      letterBody.textContent = session.letter;

      // Reveal sections
      setTimeout(() => {
        letterSection.classList.add('visible');
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

  // ── Chat ─────────────────────────────────────────────────────
  let isSending = false;

  // Auto-grow textarea
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 130) + 'px';
    btnSend.disabled = !chatInput.value.trim();
  });

  // Send on Enter (Shift+Enter = newline)
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

    // Append user bubble
    appendMessage('user', text);

    // Typing indicator
    const typingId = appendTyping();

    try {
      const { reply } = await window.MotsAPI.sendChat(sessionId, text);
      removeTyping(typingId);
      appendMessage('ai', reply);
    } catch (err) {
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

    // Scroll into view
    wrap.scrollIntoView({ behavior: 'smooth', block: 'end' });
    return wrap;
  }

  let typingCounter = 0;

  function appendTyping() {
    const id = `typing-${++typingCounter}`;
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
  function showError(msg) {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => { loadingScreen.style.display = 'none'; }, 900);
    errorSection.style.display = '';
    console.error('MOTS error:', msg);
  }

  // ── Start ────────────────────────────────────────────────────
  init();

})();
